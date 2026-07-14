/**
 * Dune dashboard daily refresh script.
 *
 * Re-executes each Dune query listed in queries.json via the execute API.
 * A Dune dashboard renders each query's "latest execution result", so running
 * this daily (cron / GitHub Actions) keeps the dashboard automatically fresh.
 *
 * Usage:
 *   node dune-refresh/refresh.js            # only trigger executions (fire-and-forget)
 *   node dune-refresh/refresh.js --wait     # poll each execution to completion, log success/failure
 *
 * Environment variables:
 *   DUNE_EXECUTE_API_KEY  (falls back to DUNE_API_KEY) — API key with execute permission
 *   DUNE_PERFORMANCE      "medium" | "large" (default medium) — execution engine tier
 *   DUNE_CONCURRENCY      number of queries run at once (default 3). Higher risks rate limiting
 *   DUNE_WAIT_TIMEOUT_MS  max wait per query in --wait mode (default 600000 = 10 min)
 */

const fs = require("fs");
const path = require("path");
const {
  API_BASE,
  CONCURRENCY,
  duneFetch,
  mapLimit,
  requireApiKey,
  sleep,
} = require("../utils/duneApi");

const PERFORMANCE = process.env.DUNE_PERFORMANCE || "medium";
const WAIT = process.argv.includes("--wait");
const WAIT_TIMEOUT_MS = Number(process.env.DUNE_WAIT_TIMEOUT_MS) || 10 * 60 * 1000;
// Adaptive polling: detect fast queries quickly with a short interval, and grow
// the interval for long-running queries to cut status-poll requests (eases the
// Free plan's rate limit).
const POLL_START_MS = 2000;
const POLL_MAX_MS = 15000;
const POLL_BACKOFF = 1.5;

const TERMINAL_STATES = new Set([
  "QUERY_STATE_COMPLETED",
  "QUERY_STATE_FAILED",
  "QUERY_STATE_CANCELLED",
  "QUERY_STATE_EXPIRED",
]);
const OK_STATE = "QUERY_STATE_COMPLETED";

function loadQueries() {
  const file = path.join(__dirname, "queries.json");
  const { queries } = JSON.parse(fs.readFileSync(file, "utf-8"));
  if (!Array.isArray(queries) || queries.length === 0) {
    throw new Error(`No queries to run in queries.json: ${file}`);
  }
  // Validate and drop duplicate ids (a duplicate would execute twice = double credits).
  const seen = new Set();
  const unique = [];
  for (const q of queries) {
    if (!q || typeof q.id !== "number") {
      throw new Error(`Invalid query entry in queries.json: ${JSON.stringify(q)}`);
    }
    if (!seen.has(q.id)) {
      seen.add(q.id);
      unique.push(q);
    }
  }
  return unique;
}

async function execute(query) {
  const body = await duneFetch(`${API_BASE}/query/${query.id}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ performance: PERFORMANCE }),
  });
  if (!body || !body.execution_id) {
    throw new Error(`execute response missing execution_id (query #${query.id})`);
  }
  return body.execution_id;
}

async function waitForCompletion(executionId) {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  let interval = POLL_START_MS;
  while (Date.now() < deadline) {
    const status = await duneFetch(`${API_BASE}/execution/${executionId}/status`);
    if (!status || !status.state) {
      throw new Error(`status response missing state (execution ${executionId})`);
    }
    if (TERMINAL_STATES.has(status.state)) return status.state;
    await sleep(interval);
    interval = Math.min(interval * POLL_BACKOFF, POLL_MAX_MS);
  }
  return "TIMEOUT";
}

// Refresh one query and return { ok, line } (caller prints lines in order).
async function refreshQuery(query) {
  const label = `#${query.id}${query.name ? ` (${query.name})` : ""}`;
  try {
    const executionId = await execute(query);
    if (!WAIT) {
      return { ok: true, line: `✅ ${label} → execution triggered [${executionId}]` };
    }
    const state = await waitForCompletion(executionId);
    const ok = state === OK_STATE;
    return { ok, line: `${ok ? "✅" : "⚠️"} ${label} → ${state} [${executionId}]` };
  } catch (err) {
    return { ok: false, line: `❌ ${label} → ${err.message}` };
  }
}

async function main() {
  requireApiKey();

  const queries = loadQueries();
  console.log(`▶ Refreshing ${queries.length} queries (performance=${PERFORMANCE}, wait=${WAIT})`);

  // Queries are independent, so run/poll them with bounded concurrency
  // (shrinks total --wait time while staying under the rate limit).
  const results = await mapLimit(queries, CONCURRENCY, refreshQuery);

  let failed = 0;
  for (const { ok, line } of results) {
    console.log(line);
    if (!ok) failed++;
  }

  console.log(`\nDone: ${results.length - failed} succeeded / ${failed} failed`);
  if (failed > 0) {
    process.exit(1); // non-zero exit so cron/Actions logs and alerts catch failures
  }
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});
