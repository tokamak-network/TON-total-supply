# Dune dashboard daily refresh

A small tool that **re-runs (refreshes) the Dune queries** behind the
[Tokamak Network Tokenomics dashboard](https://dune.com/tokamak-network/tokamak-network-tokenomics-dashboard)
once a day.

A Dune dashboard renders each query's **latest execution result**. So re-executing
the queries every day keeps the dashboard up to date with no manual work.

## Layout

| File | Purpose |
|---|---|
| `refresh.js` | Re-executes each query in `queries.json` via the Dune execute API |
| `queries.json` | List of query IDs to refresh |
| `../.github/workflows/dune-refresh.yml` | GitHub Actions workflow that runs it daily |

## 1. Register the queries to refresh (`queries.json`)

For **every chart on the dashboard to update automatically**, add the query ID
that each chart references. How to find a query ID:

1. On the dashboard, click `···` at the top-right of a chart → **View query**
2. The number in the opened URL is the query ID: `dune.com/queries/`**`3360297`**`/...`

```json
{
  "queries": [
    { "id": 3360297, "name": "The Big Players of TON+WTON: Leading 10 Wallets" },
    { "id": 1234567, "name": "add the remaining chart queries here" }
  ]
}
```

> `name` is only for log readability and is optional.

## 2. API key

A Dune API key with query-execution permission is required. The script uses
`DUNE_EXECUTE_API_KEY` first, falling back to `DUNE_API_KEY`.

- **Local / server cron**: uses the key already present in the project-root `.env`
- **GitHub Actions**: register `DUNE_EXECUTE_API_KEY` (or `DUNE_API_KEY`) under the
  repo's **Settings → Secrets and variables → Actions**

### Where to issue a key

- Team workspace: **Dune → workspace → tokamak-network → APIs**
  (<https://dune.com/workspace/t/tokamak-network/apis>)
- Personal account: **Settings → API** (<https://dune.com/settings/api>)
- **Create API key** → name it → the full value is shown **only once** on creation,
  so copy it then. (Free plan can issue API keys too.)

### Swapping to another account's key when the quota runs out

Credits are charged to the **account that issued the key**. When one account's
monthly quota is exhausted, just **replace the key value with one from another
account** — no code change needed, and it keeps running on that account's credits.

Change only the **one environment you actually run in**:

| Run mode | Where to change |
|---|---|
| GitHub Actions | **Settings → Secrets and variables → Actions**, **Update** `DUNE_EXECUTE_API_KEY` (and `DUNE_API_KEY`). Or via CLI: `printf '%s' "NEW_KEY" \| gh secret set DUNE_EXECUTE_API_KEY` |
| Local / server cron | Replace `DUNE_EXECUTE_API_KEY` in the project-root `.env` |

> No need to touch the code or `queries.json` — only the key value changes.

## 3-A. Run via GitHub Actions (recommended)

`../.github/workflows/dune-refresh.yml` runs daily at **22:50 UTC (= 07:50 KST next day)**.
It's scheduled before 09:00 KST so the data is fresh before external aggregators
(CoinGecko/Upbit) read the dashboard around that time. The only setup is registering
the Secret from step 2.

- Change the run time: edit the workflow's `cron` value ([crontab.guru](https://crontab.guru), **UTC**)
- Manual run / test: repo **Actions tab → Dune daily refresh → Run workflow**
- Cost: unlimited free on public repos; even on private repos it's ~1 min/day, within
  the free tier. Note the query executions themselves consume Dune credits (regardless
  of where the job runs).

## 3-B. Run via server crontab

```bash
crontab -e
```

```cron
# Refresh the Dune dashboard daily at 07:50 (when the server's local TZ is KST)
50 7 * * *  /usr/bin/node /path/to/TON-total-supply/dune-refresh/refresh.js --wait >> $HOME/dune-refresh.log 2>&1
```

- The script resolves `.env` and `queries.json` relative to its own location
  (`__dirname`), so the working directory doesn't matter — no `cd` needed.
- Use an absolute `node` path (`which node`) and an absolute path to the script.
- Log to a path your cron user can write (e.g. `$HOME/…`); `/var/log/` usually needs root.

## Run manually / verify

```bash
# Trigger executions only (fast, fire-and-forget)
node dune-refresh/refresh.js

# Poll each execution to completion and report success/failure (recommended for Actions/cron)
node dune-refresh/refresh.js --wait
```

## Environment variables (optional)

| Variable | Default | Description |
|---|---|---|
| `DUNE_PERFORMANCE` | `medium` | Execution engine tier (`medium` / `large`). `large` is faster but costs more credits. |
| `DUNE_CONCURRENCY` | `3` | Number of queries run at once. At most this many run concurrently, and as soon as one finishes the next takes its slot (sliding pool). **Dune's Free plan caps concurrent queries at 3**, so the default of 3 fits exactly. Going higher risks rate limiting (429) — though 429s are retried automatically. Set to `1` for fully sequential runs. |
| `DUNE_WAIT_TIMEOUT_MS` | `600000` | Max wait per query in `--wait` mode (ms) |

## Cost (Dune credits)

Measured on the `medium` engine (2026-07):

| Item | Credits |
|---|---|
| One full run (16 queries) | ~**54.3** |
| Once daily × 30 days | ~**1,630 / month** |

- **The Free plan (2,500 credits/month, API included) is enough.** Currently ~65% used.
- The most expensive query is `The Big Players…` (#3360297) alone at **~24 credits
  (44% of the daily cost)** because it scans the full transfer history. If credits ever
  get tight, optimizing this one query first (e.g. limiting its scan range) has the
  biggest impact.
- Per-query credits grow slowly as on-chain history grows, so monitor the headroom
  (~870 credits/month). Overage is billed at $5/100 credits (= $0.05/credit). If you're
  consistently over, upgrade to the next tier, **Analyst ($65/month, 4,000 credits)**.
- Note: the 429 we hit earlier was a **request rate limit**, not credit exhaustion. The
  Free plan has low rate limits, so keeping `DUNE_CONCURRENCY` low (default 3) is safe.

## Alternative: Dune's native scheduler (paid plans)

On a paid plan (**Analyst $65/month or higher**, medium/large engine required) you can
use Dune's built-in **Query Scheduler** to let Dune run the queries on a schedule —
without this script or GitHub Actions.

### How to set it up (per query, in the Dune web UI)

1. Open the query editor via a chart's `···` → **View query**.
2. Click the **clock (⏰) icon** at the bottom of the editor (left of the Run button).
3. In the dialog, pick a **refresh schedule** (specific time + frequency) and an
   **execution engine** (medium/large).
4. Review the **estimated monthly credit consumption / quota** shown.
5. **Save** → the query runs once immediately, then on your schedule.
6. Since the dashboard shows each query's latest result, this keeps it up to date.

> This dashboard has 16 queries, so you'd **repeat this for each query**.
> (Whereas this script manages them all from one `queries.json`.)

### Constraints / comparison

- **Parameterized queries can't be scheduled**; frequency is limited to Dune's presets.
- Credit consumption is **the same** as the API approach (based on engine + scan size).
  The only difference is *who triggers*: Dune scheduler = Dune triggers (zero ops, paid) /
  this script = external cron/Actions triggers (free, precise timing control).
- **Summary**: `$65/month + zero setup` (native scheduler) vs `$0 + a little cron/Actions
  setup` (this script). For pinning the run to before 09:00 KST, the cron approach gives
  finer control.

## Notes

- The dashboard → query-list mapping can't be collected via a public API (the internal
  API requires auth), so `queries.json` is maintained by hand.
