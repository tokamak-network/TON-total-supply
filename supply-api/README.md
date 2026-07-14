# TON supply API

A **public, serverless supply API** for TON — the endpoint CoinGecko (and any other
aggregator) polls to read TON's circulating and total supply.

This replaces the supply endpoints of the old `price-api` service (AWS ECS +
DocumentDB), which is being decommissioned. There is **no server and no database
here**: a GitHub Actions job reads the numbers from Dune once a day, writes them
as static JSON, and GitHub Pages serves them. Nothing to keep running, nothing to
page anyone at 3am.

## Endpoints

Base URL: `https://tokamak-network.github.io/TON-total-supply`

| Endpoint | Meaning |
|---|---|
| [`/api/v1/supply/circulating.json`](https://tokamak-network.github.io/TON-total-supply/api/v1/supply/circulating.json) | **The figure CoinGecko reads.** Total supply − staked − locked |
| [`/api/v1/supply/total.json`](https://tokamak-network.github.io/TON-total-supply/api/v1/supply/total.json) | 50,000,000 TON + block seigniorage − burned − unminted seigniorage |
| [`/api/v1/supply/circulating-upbit.json`](https://tokamak-network.github.io/TON-total-supply/api/v1/supply/circulating-upbit.json) | Upbit's convention: staked TON counted as circulating |
| [`/api/v1/supply.json`](https://tokamak-network.github.io/TON-total-supply/api/v1/supply.json) | All of the above plus provenance (Dune query links, execution times) |

```console
$ curl https://tokamak-network.github.io/TON-total-supply/api/v1/supply/circulating.json
{"result":"64053126.526931055"}
```

The value is a **decimal string**, mirroring CoinGecko's own supply endpoint
(`api.coingecko.com/api/v3/supply/eth`). A string rather than a JSON number so no
consumer can lose precision to float parsing, and the fractional part is always
present — CoinGecko requires supply to be reported "with decimals included".

### Why these satisfy CoinGecko's requirements

CoinGecko's [supply API requirements](https://support.coingecko.com/hc/en-us/articles/4499342867609):

| Requirement | How this meets it |
|---|---|
| Simple REST endpoint, decimals included | Static JSON, decimal string |
| Publicly accessible, no authentication | GitHub Pages, no auth, no API key |
| No API key required | The Dune key is used in CI, never at request time |
| Rate limit tolerating a poll every 30 min | Static file on a CDN; a 30-min poll is 48 requests/day |
| Must not be behind CloudFlare WAF | Pages is fronted by Fastly, not CloudFlare — the `X-Requested-With: com.coingecko` / `User-Agent: CoinGecko` headers are never challenged |

## How it works

```
Dune queries  ──(daily 22:50 UTC)──▶  dune-refresh/refresh.js   re-executes the queries
     │
     └─ latest results ─────────────▶  supply-api/build.js       reads results, writes public/
                                              │
                                              └──▶ GitHub Pages  serves public/ at the URLs above
```

Both steps run in [`.github/workflows/dune-refresh.yml`](../.github/workflows/dune-refresh.yml)
as two jobs: `refresh` then `publish`.

`publish` runs **even if `refresh` partially fails**, because reading a Dune query
always returns its last *successful* execution — a broken dashboard query should
not block the supply API from updating.

### Fail-closed

CoinGecko publishes whatever we return, so `build.js` treats every doubt as a build
failure. On any failure it exits non-zero, the deploy step is skipped, and **the
previously published JSON stays live** — a stale-but-correct number beats a wrong one.

It refuses to publish when:

| Check | Why it matters |
|---|---|
| A Dune result is **older than 48h** | The worst failure mode: a query that quietly stopped refreshing still returns a positive, self-consistent number, and we would serve a months-old figure as current. The refresh runs daily, so 48h tolerates one missed run. |
| An endpoint's `queryId` is **not in `dune-refresh/queries.json`** | It would never be re-executed, so the endpoint would serve a frozen value forever. |
| An **invariant** in `endpoints.json` is violated, or names an unknown endpoint | Catches a Dune query silently returning the wrong column or a nonsense figure. Unknown names throw rather than skip — a safety net that quietly disappears is worse than none. |
| A value is missing, non-numeric, or non-positive | — |

### Freshness

The numbers update **once a day**. Seigniorage accrues at 3.92 TON/block, so the
published figure lags reality by at most ~28,000 TON — about **0.03% of total supply**.
CoinGecko polls every 30 minutes and will simply see the same value between rebuilds,
which is fine and normal.

Refreshing more often is possible but not free: the daily dashboard refresh already
consumes ~1,630 of the Dune Free plan's 2,500 monthly credits (~65%), so there isn't
headroom to re-execute the supply queries on a shorter cycle. See
[`../dune-refresh/README.md`](../dune-refresh/README.md#cost-dune-credits) for the
credit budget.

## Adding or changing an endpoint

Edit [`endpoints.json`](endpoints.json). An endpoint:

```json
{
  "path": "circulating",          // → /api/v1/supply/circulating.json  ([a-z0-9-]+ only)
  "queryId": 3298417,             // Dune query that produces the number
  "column": "Circulating_Supply", // column to read from its result row
  "description": "..."            // shown on the landing page and in supply.json
}
```

The query must **also** be listed in [`../dune-refresh/queries.json`](../dune-refresh/queries.json)
so it gets re-executed daily. `build.js` enforces this and fails the build if you
forget — an endpoint pointing at an unrefreshed query would serve a frozen value.

Declare how a new figure relates to the existing ones as an invariant, so a bad
Dune result can't slip through:

```json
"invariants": [
  { "lte": ["circulating", "circulating-upbit"], "because": "..." }
]
```

## Running locally

```bash
node supply-api/build.js
```

Fetches the numbers, validates them, and writes `public/`. Exits non-zero without
writing if anything fails validation — the same behavior CI relies on.

Needs `DUNE_API_KEY` (or `DUNE_EXECUTE_API_KEY`) in the project-root `.env` — the
same key the refresh job uses. Reading results costs ~1 Dune credit per query.

## Redeploying without spending Dune credits

To rebuild and redeploy the site without re-running the 16 dashboard queries (a
landing-page fix, or recovering a bad deploy): **Actions → Dune daily refresh &
supply API publish → Run workflow → check `skip_refresh`**. A full refresh consumes
most of the monthly Dune credit budget, so don't trigger one just to redeploy.

## One-time setup

1. **Enable GitHub Pages**: repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
   Without this the `publish` job fails at the deploy step.
2. **Submit the URL to CoinGecko** via their
   [supply disclosure form](https://support.coingecko.com/hc/en-us/articles/4499342867609),
   pointing `circulating` at `/api/v1/supply/circulating.json` and `total` at
   `/api/v1/supply/total.json`.

> ⚠️ **Before decommissioning `price-api`**, confirm which URL CoinGecko is polling
> today and keep it alive until CoinGecko has switched over to these endpoints.
> Retiring the old host first would leave TON's supply data stale on CoinGecko.
