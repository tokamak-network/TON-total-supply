/**
 * Builds the static supply API served by GitHub Pages.
 *
 * Reads the latest result of each Dune query listed in endpoints.json and writes
 * one JSON file per endpoint into public/. External aggregators (CoinGecko) then
 * poll those files directly — there is no server to run, and no API key is ever
 * exposed, because the Dune call happens here in CI rather than at request time.
 *
 * Response shape matches CoinGecko's own supply endpoint (api.coingecko.com/api/v3/supply/eth):
 *   {"result":"64053126.526931055"}
 * The value is a decimal string so that no precision is lost to a JSON float
 * consumer, and the fractional part ("decimals") is always present.
 *
 * Any failure exits non-zero, which skips the Pages deploy step and leaves the
 * previously published files live. Serving a stale-but-correct number is always
 * better than serving a wrong one — CoinGecko publishes whatever we return.
 *
 * Usage:
 *   node supply-api/build.js
 *
 * Environment variables:
 *   DUNE_API_KEY  (or DUNE_EXECUTE_API_KEY) — API key with result-read permission
 */

const fs = require("fs");
const path = require("path");
const { API_BASE, CONCURRENCY, duneFetch, mapLimit, requireApiKey } = require("../utils/duneApi");

const OUT_ROOT = path.join(__dirname, "..", "public");
const API_DIR = path.join(OUT_ROOT, "api", "v1", "supply");
const DASHBOARD_URL = "https://dune.com/tokamak-network/tokamak-network-tokenomics-dashboard";

// A Dune result that stopped being refreshed still looks perfectly healthy — it is
// a positive number, consistent with its siblings — so nothing else here would
// catch it, and we would publish a months-old figure to CoinGecko as the current
// one. Silent, indefinite staleness is this system's worst failure mode, so treat
// an old execution as a build failure. The refresh runs daily; 48h allows one
// missed run before it trips.
const MAX_RESULT_AGE_MS = 48 * 60 * 60 * 1000;

function loadConfig() {
  const file = path.join(__dirname, "endpoints.json");
  const { endpoints, invariants = [] } = JSON.parse(fs.readFileSync(file, "utf-8"));
  if (!Array.isArray(endpoints) || endpoints.length === 0) {
    throw new Error(`No endpoints defined in ${file}`);
  }

  // A query that isn't in the refresh list is never re-executed, so its endpoint
  // would serve a frozen value forever. Enforce the coupling rather than
  // documenting it.
  const refreshed = new Set(
    require("../dune-refresh/queries.json").queries.map((q) => q.id)
  );

  const seen = new Set();
  for (const e of endpoints) {
    if (
      !e ||
      typeof e.path !== "string" ||
      typeof e.queryId !== "number" ||
      typeof e.column !== "string" ||
      typeof e.description !== "string"
    ) {
      throw new Error(`Invalid endpoint entry: ${JSON.stringify(e)}`);
    }
    // The path becomes a filename; keep it a safe slug so an endpoints.json edit
    // can never write outside public/.
    if (!/^[a-z0-9-]+$/.test(e.path)) {
      throw new Error(`Endpoint path must match [a-z0-9-]+: "${e.path}"`);
    }
    if (seen.has(e.path)) {
      throw new Error(`Duplicate endpoint path "${e.path}" — one would overwrite the other`);
    }
    seen.add(e.path);
    if (!refreshed.has(e.queryId)) {
      throw new Error(
        `Endpoint "${e.path}" uses Dune query #${e.queryId}, which is not in ` +
          `dune-refresh/queries.json. It would never be re-executed, and the endpoint ` +
          `would serve a frozen value. Add it there.`
      );
    }
  }

  // A malformed invariant must not silently pass as a no-op — that is exactly how
  // the safety net disappears without anyone noticing.
  if (!Array.isArray(invariants)) {
    throw new Error(`"invariants" must be an array in ${file}`);
  }
  for (const inv of invariants) {
    const ok =
      inv &&
      Array.isArray(inv.lte) &&
      inv.lte.length === 2 &&
      inv.lte.every((p) => typeof p === "string") &&
      typeof inv.because === "string";
    if (!ok) {
      throw new Error(
        `Invalid invariant entry (need { lte: [string, string], because: string }): ${JSON.stringify(inv)}`
      );
    }
  }

  return { endpoints, invariants };
}

// Dune returns the value as a JSON number (float) or, for decimal columns, a
// string. Normalize to a decimal string without a lossy re-parse.
function toDecimalString(raw, label) {
  if (typeof raw === "string" && /^-?\d+(\.\d+)?$/.test(raw)) return raw;
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  throw new Error(`${label}: expected a finite number, got ${JSON.stringify(raw)}`);
}

// limit=1: these queries each return a single summary row, and result reads are
// billed per datapoint.
async function fetchResult(queryId) {
  const body = await duneFetch(`${API_BASE}/query/${queryId}/results?limit=1`);
  const row = body.result && body.result.rows && body.result.rows[0];
  // Guard the shape rather than trusting it: `column in row` throws a TypeError on
  // a primitive, which would obscure the real problem (Dune returned junk).
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new Error(`#${queryId}: expected a result row object, got ${JSON.stringify(row)}`);
  }
  return { row, executedAt: body.execution_ended_at || null };
}

function readEndpoint(endpoint, { row, executedAt }) {
  const label = `#${endpoint.queryId} ${endpoint.path}`;
  if (!(endpoint.column in row)) {
    throw new Error(
      `${label}: column "${endpoint.column}" not in result (columns: ${Object.keys(row).join(", ")})`
    );
  }
  return {
    ...endpoint,
    value: toDecimalString(row[endpoint.column], label),
    executedAt,
  };
}

// Fetch each distinct query once, even if several endpoints read different columns
// out of the same result row — a result read is billed per call.
async function fetchAll(endpoints) {
  const queryIds = [...new Set(endpoints.map((e) => e.queryId))];
  const fetched = await mapLimit(queryIds, CONCURRENCY, fetchResult);
  const byQueryId = new Map(queryIds.map((id, i) => [id, fetched[i]]));
  return endpoints.map((e) => readEndpoint(e, byQueryId.get(e.queryId)));
}

// CoinGecko publishes whatever we return, so a figure that silently goes wrong is
// worse than a build that fails. Every check here throws.
function validate(results, invariants) {
  const by = new Map(results.map((r) => [r.path, Number(r.value)]));

  for (const r of results) {
    if (!(by.get(r.path) > 0)) {
      throw new Error(`${r.path}: supply must be positive, got ${r.value}`);
    }
    if (!r.executedAt) {
      throw new Error(`${r.path}: Dune result has no execution timestamp`);
    }
    const executedAtMs = Date.parse(r.executedAt);
    if (Number.isNaN(executedAtMs)) {
      throw new Error(`${r.path}: unparseable execution timestamp "${r.executedAt}"`);
    }
    const ageMs = Date.now() - executedAtMs;
    if (!(ageMs < MAX_RESULT_AGE_MS)) {
      const hours = Math.round(ageMs / 3600_000);
      throw new Error(
        `${r.path}: Dune query #${r.queryId} last ran ${hours}h ago (max ${
          MAX_RESULT_AGE_MS / 3600_000
        }h). It has stopped refreshing — publishing would serve a stale figure as current.`
      );
    }
  }

  // Declared in endpoints.json so the invariants live next to the endpoints they
  // constrain, and adding an endpoint can't silently leave them unenforced.
  for (const { lte, because } of invariants) {
    const [lo, hi] = lte;
    // An invariant naming an endpoint that no longer exists is a config error, not
    // a check to skip — skipping is how the safety net quietly disappears.
    for (const p of lte) {
      if (!by.has(p)) throw new Error(`Invariant references unknown endpoint "${p}"`);
    }
    if (by.get(lo) > by.get(hi)) {
      throw new Error(
        `Invariant violated: ${lo} (${by.get(lo)}) exceeds ${hi} (${by.get(hi)}) — ${because}`
      );
    }
  }
}

const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]
  );

function write(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
  console.log(`  wrote ${path.relative(OUT_ROOT, file)}`);
}

function writeSite(results) {
  fs.rmSync(OUT_ROOT, { recursive: true, force: true });

  for (const r of results) {
    // The exact shape CoinGecko expects: one "result" key, decimal string value.
    write(path.join(API_DIR, `${r.path}.json`), JSON.stringify({ result: r.value }));
  }

  // Combined view — for humans, and for internal consumers that want provenance
  // alongside the numbers. CoinGecko reads the single-value files above, not this.
  const updatedAt = new Date().toISOString();
  const index = {
    updated_at: updatedAt,
    source: DASHBOARD_URL,
    supply: Object.fromEntries(
      results.map((r) => [
        r.path,
        {
          result: r.value,
          description: r.description,
          dune_query: `https://dune.com/queries/${r.queryId}`,
          dune_executed_at: r.executedAt,
        },
      ])
    ),
  };
  write(path.join(OUT_ROOT, "api", "v1", "supply.json"), JSON.stringify(index, null, 2));
  write(path.join(OUT_ROOT, "index.html"), renderIndexHtml(results, updatedAt));
}

function renderIndexHtml(results, updatedAt) {
  const rows = results
    .map(
      (r) => `      <tr>
        <td><a href="api/v1/supply/${r.path}.json"><code>/api/v1/supply/${r.path}.json</code></a></td>
        <td class="num">${escapeHtml(r.value)}</td>
        <td>${escapeHtml(r.description)}</td>
        <td><a href="https://dune.com/queries/${r.queryId}">#${r.queryId}</a></td>
      </tr>`
    )
    .join("\n");

  const sample = results.find((r) => r.path === "circulating") || results[0];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TON Supply API</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 60rem; margin: 3rem auto; padding: 0 1rem; line-height: 1.6; }
    table { border-collapse: collapse; width: 100%; margin: 1.5rem 0; }
    th, td { border-bottom: 1px solid #ddd; padding: .6rem .5rem; text-align: left; vertical-align: top; }
    .num { font-variant-numeric: tabular-nums; white-space: nowrap; }
    code { background: #f4f4f4; padding: .1rem .3rem; border-radius: 3px; }
    footer { color: #666; font-size: .9rem; margin-top: 2rem; }
  </style>
</head>
<body>
  <h1>TON Supply API</h1>
  <p>
    Circulating and total supply for
    <a href="https://tokamak.network">Tokamak Network</a> TON
    (<code>0x2be5e8c109e2197D077D13A82dAead6a9b3433C5</code>).
    Public, no authentication, no rate limit.
  </p>
  <p>Each endpoint returns a decimal string, matching CoinGecko's supply format:</p>
  <pre><code>$ curl https://tokamak-network.github.io/TON-total-supply/api/v1/supply/${escapeHtml(sample.path)}.json
{"result":"${escapeHtml(sample.value)}"}</code></pre>
  <table>
    <thead>
      <tr><th>Endpoint</th><th>Value</th><th>Definition</th><th>Query</th></tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
  <p>
    <a href="api/v1/supply.json"><code>/api/v1/supply.json</code></a> returns all
    figures together with their provenance.
  </p>
  <footer>
    Derived from the
    <a href="${DASHBOARD_URL}">Tokamak tokenomics dashboard</a>
    and rebuilt daily. Last updated ${updatedAt}.
  </footer>
</body>
</html>
`;
}

async function main() {
  requireApiKey();

  const { endpoints, invariants } = loadConfig();
  const queryCount = new Set(endpoints.map((e) => e.queryId)).size;
  console.log(`▶ Fetching ${queryCount} Dune results for ${endpoints.length} endpoints`);

  const results = await fetchAll(endpoints);
  for (const r of results) {
    console.log(`✅ ${r.path.padEnd(18)} ${r.value}  (executed ${r.executedAt})`);
  }

  validate(results, invariants);

  console.log(`\n▶ Writing ${path.relative(process.cwd(), OUT_ROOT)}/`);
  writeSite(results);
  console.log("\nDone.");
}

main().catch((err) => {
  // Non-zero exit skips the deploy, keeping the previous Pages deployment live.
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
