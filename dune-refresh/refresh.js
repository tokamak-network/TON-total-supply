/**
 * Dune 대시보드 일일 새로고침 스크립트.
 *
 * queries.json 에 나열된 각 Dune 쿼리를 execute API 로 재실행한다.
 * Dune 대시보드는 각 쿼리의 "최신 실행 결과"를 표시하므로, 매일 이 스크립트를
 * 돌리면(cron / GitHub Actions) 대시보드가 자동으로 최신 상태로 유지된다.
 *
 * 사용법:
 *   node dune-refresh/refresh.js            # 전체 쿼리 실행만 트리거 (fire-and-forget)
 *   node dune-refresh/refresh.js --wait     # 실행 완료까지 폴링하여 성공/실패를 로그로 확인
 *
 * 환경변수:
 *   DUNE_EXECUTE_API_KEY  (없으면 DUNE_API_KEY 로 폴백) — 쿼리 실행 권한이 있는 API 키
 *   DUNE_PERFORMANCE      "medium" | "large" (기본 medium) — 실행 엔진 티어
 *   DUNE_WAIT_TIMEOUT_MS  --wait 시 쿼리당 최대 대기 시간 (기본 600000 = 10분)
 */

const fs = require("fs");
const path = require("path");

// 로컬 실행 시 .env 로드. GitHub Actions 등에서는 env 로 직접 주입되므로 dotenv 가 없어도 무방.
try {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
} catch (_) {
  /* dotenv 미설치 환경(예: CI)에서는 무시 */
}

const API_BASE = "https://api.dune.com/api/v1";
const API_KEY = process.env.DUNE_EXECUTE_API_KEY || process.env.DUNE_API_KEY;
const PERFORMANCE = process.env.DUNE_PERFORMANCE || "medium";
const WAIT = process.argv.includes("--wait");
const WAIT_TIMEOUT_MS = Number(process.env.DUNE_WAIT_TIMEOUT_MS) || 10 * 60 * 1000;
const POLL_INTERVAL_MS = 5000;

const TERMINAL_STATES = new Set([
  "QUERY_STATE_COMPLETED",
  "QUERY_STATE_FAILED",
  "QUERY_STATE_CANCELLED",
  "QUERY_STATE_EXPIRED",
]);
const OK_STATE = "QUERY_STATE_COMPLETED";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadQueries() {
  const file = path.join(__dirname, "queries.json");
  const { queries } = JSON.parse(fs.readFileSync(file, "utf-8"));
  if (!Array.isArray(queries) || queries.length === 0) {
    throw new Error(`queries.json 에 실행할 쿼리가 없습니다: ${file}`);
  }
  return queries;
}

async function duneFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { "X-Dune-API-Key": API_KEY, ...(options.headers || {}) },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch (_) {
    body = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${body.error || text || res.statusText}`);
  }
  return body;
}

async function execute(query) {
  const body = await duneFetch(`${API_BASE}/query/${query.id}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ performance: PERFORMANCE }),
  });
  return body.execution_id;
}

async function waitForCompletion(executionId) {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const status = await duneFetch(`${API_BASE}/execution/${executionId}/status`);
    if (TERMINAL_STATES.has(status.state)) return status.state;
    await sleep(POLL_INTERVAL_MS);
  }
  return "TIMEOUT";
}

// 쿼리 하나를 새로고침하고 { ok, line } 을 반환한다 (로그는 호출부에서 순서대로 출력).
async function refreshQuery(query) {
  const label = `#${query.id}${query.name ? ` (${query.name})` : ""}`;
  try {
    const executionId = await execute(query);
    if (!WAIT) {
      return { ok: true, line: `✅ ${label} → 실행 트리거됨 [${executionId}]` };
    }
    const state = await waitForCompletion(executionId);
    const ok = state === OK_STATE;
    return { ok, line: `${ok ? "✅" : "⚠️"} ${label} → ${state} [${executionId}]` };
  } catch (err) {
    return { ok: false, line: `❌ ${label} → ${err.message}` };
  }
}

async function main() {
  if (!API_KEY) {
    console.error("❌ DUNE_EXECUTE_API_KEY (또는 DUNE_API_KEY) 가 설정되지 않았습니다.");
    process.exit(1);
  }

  const queries = loadQueries();
  console.log(`▶ ${queries.length}개 쿼리 새로고침 시작 (performance=${PERFORMANCE}, wait=${WAIT})`);

  // 쿼리들은 서로 독립적이므로 동시에 실행/폴링한다 (--wait 시 총 대기시간 = 합 → 최댓값).
  const results = await Promise.all(queries.map(refreshQuery));

  let failed = 0;
  for (const { ok, line } of results) {
    console.log(line);
    if (!ok) failed++;
  }

  console.log(`\n완료: 성공 ${results.length - failed} / 실패 ${failed}`);
  if (failed > 0) {
    process.exit(1); // cron/Actions 로그와 알림에서 실패를 감지할 수 있도록 비정상 종료
  }
}

main().catch((err) => {
  console.error("❌ 예기치 못한 오류:", err);
  process.exit(1);
});
