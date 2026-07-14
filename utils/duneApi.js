/**
 * Shared HTTP client for the Dune API.
 *
 * Used by both dune-refresh (re-executes the dashboard queries) and supply-api
 * (reads their results). Centralizes the API key lookup and the 429 retry /
 * error-parsing behaviour so both callers stay under the Free plan's rate limit.
 */
const path = require("path");

// Load .env for local runs. On GitHub Actions env is injected directly, so
// dotenv being absent is fine.
try {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
} catch (_) {
  /* dotenv not installed (e.g. CI) — ignore */
}

const API_BASE = "https://api.dune.com/api/v1";
const API_KEY = process.env.DUNE_EXECUTE_API_KEY || process.env.DUNE_API_KEY;
const MAX_RETRIES = 5; // retries on HTTP 429
const RETRY_BASE_MS = 2000;

// How many Dune calls to run at once. A property of the plan, not of either
// caller: the Free plan caps concurrent queries at 3, and going higher invites
// 429s. Normalized to an integer >= 1 so a bad env value can't crash mapLimit.
const rawConcurrency = Number(process.env.DUNE_CONCURRENCY);
const CONCURRENCY =
  Number.isFinite(rawConcurrency) && rawConcurrency >= 1 ? Math.floor(rawConcurrency) : 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Exit with a clear message rather than surfacing a fetch/401 deep in a stack trace.
function requireApiKey() {
  if (typeof fetch !== "function") {
    console.error(`❌ This script needs Node 18+ (global fetch). Current: ${process.version}`);
    process.exit(1);
  }
  if (!API_KEY) {
    console.error("❌ DUNE_EXECUTE_API_KEY (or DUNE_API_KEY) is not set.");
    process.exit(1);
  }
}

async function duneFetch(url, options = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      ...options,
      headers: { "X-Dune-API-Key": API_KEY, ...(options.headers || {}) },
    });

    // Rate limit: retry using the Retry-After header (seconds) or exponential backoff.
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoff = retryAfter > 0 ? retryAfter * 1000 : RETRY_BASE_MS * 2 ** attempt;
      await sleep(backoff);
      continue;
    }

    const text = await res.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch (_) {
      body = { raw: text };
    }
    if (!res.ok) {
      // Dune may return `error` as a string or an object ({ message, type }).
      const err = body && body.error;
      const detail = err
        ? typeof err === "object"
          ? err.message || JSON.stringify(err)
          : err
        : text || res.statusText;
      throw new Error(`HTTP ${res.status} ${detail}`);
    }
    return body;
  }
}

// Process items with bounded concurrency, returning results in original order.
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx], idx);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

module.exports = { API_BASE, CONCURRENCY, duneFetch, mapLimit, requireApiKey, sleep };
