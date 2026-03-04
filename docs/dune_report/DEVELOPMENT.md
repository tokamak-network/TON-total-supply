# Dune 대시보드 자동 리포트 생성 - 개발 문서

## 개요

Tokamak Network 토크노믹스 Dune 대시보드(16개 쿼리)의 데이터를 매주 자동으로 가져와서 분석 리포트를 생성하고, 레포에 커밋하는 자동화 파이프라인.

---

## 아키텍처

```
매주 월요일 09:00 UTC
  → GitHub Actions 트리거 (.github/workflows/dune-report.yml)

  [Step 1] node refreshDuneQueries.js  (DUNE_EXECUTE_API_KEY)
    → 16개 쿼리의 캐시 타임스탬프 확인
    → 24시간 이내 → skip (크레딧 절약)
    → 24시간 초과 → 실행 (크레딧 소모)
    → stale 쿼리만 4개씩 병렬 실행 + 완료 대기
    → 실행 계정은 별도 계정 사용 가능

  [Step 2] node generateDuneReport.js  (DUNE_API_KEY)
    → 캐시된 결과 fetch (크레딧 소모 없음)
    → 통계 계산
    → docs/dune_report/DUNE_REPORT_YYYY-MM-DD.md 생성

  [Step 3] git add & commit & push (자동)
```

**2개의 API 키를 분리한 이유:**
- 쿼리 실행(refresh)은 Dune 크레딧을 소모함
- 캐시된 결과 조회(report)는 크레딧 소모 없음
- 실행용 키와 조회용 키를 다른 Dune 계정으로 분리 가능

---

## 파일 구조

```
TON-total-supply/
├── refreshDuneQueries.js          # Step 1: 쿼리 실행 (크레딧 소모)
├── generateDuneReport.js          # Step 2: 리포트 생성 (캐시 조회)
├── query_ids.json                  # 16개 Dune 쿼리 ID 목록
├── .github/
│   └── workflows/
│       └── dune-report.yml         # GitHub Actions 워크플로우
└── docs/
    └── dune_report/
        ├── DEVELOPMENT.md              # 이 문서
        └── DUNE_REPORT_YYYY-MM-DD.md  # 자동 생성 리포트
```

---

## 파일별 상세 설명

### `refreshDuneQueries.js`

16개 Dune 쿼리의 캐시 상태를 확인하고, 오래된 쿼리만 실행하여 크레딧을 절약하는 스크립트.

**동작:**
1. `query_ids.json`에서 쿼리 ID 로드
2. 각 쿼리의 `execution_ended_at` 타임스탬프 확인 (`GET /api/v1/query/{queryId}/results`)
3. **24시간 이내** → skip (크레딧 소모 없음)
4. **24시간 초과 또는 캐시 없음** → `POST /api/v1/query/{queryId}/execute`로 실행
5. `GET /api/v1/execution/{executionId}/status`로 완료 대기 (3초 간격 폴링)
6. stale 쿼리만 4개씩 병렬 실행으로 소요 시간 단축

**크레딧 절약 로직:**
- 모든 쿼리가 24시간 이내면 실행을 완전히 건너뜀
- 일부만 stale이면 해당 쿼리만 실행
- 불필요한 실행을 방지하여 Dune 크레딧 소모를 최소화

**환경변수:**
- `DUNE_EXECUTE_API_KEY`: 쿼리 실행용 API 키 (크레딧 소모)
- `DUNE_API_KEY`: fallback (DUNE_EXECUTE_API_KEY 없을 때)

**설정값:**

| 상수 | 기본값 | 설명 |
|------|--------|------|
| `STALE_THRESHOLD_MS` | 86400000 | 캐시 만료 기준 (24시간, ms) |
| `POLL_INTERVAL_MS` | 3000 | 상태 확인 간격 (ms) |
| `MAX_POLL_ATTEMPTS` | 200 | 최대 폴링 횟수 (~10분) |
| `CONCURRENCY` | 4 | 동시 실행 쿼리 수 |

### `generateDuneReport.js`

캐시된 쿼리 결과를 조회하여 마크다운 리포트를 생성하는 스크립트.

**주요 함수:**

| 함수 | 역할 |
|------|------|
| `getQueryResult(queryId)` | Dune API에서 캐시된 쿼리 결과 조회 |
| `fetchAllQueries()` | query_ids.json의 16개 쿼리를 순차 fetch |
| `calculateStats(data)` | 가격, 스테이킹, Exit 등 통계 계산 |
| `generateReport(stats, data, date)` | 마크다운 리포트 문자열 생성 |

**환경변수:**
- `DUNE_API_KEY`: 캐시 조회용 API 키 (크레딧 소모 없음)

**API 호출:**
- 엔드포인트: `GET /api/v1/query/{queryId}/results`
- 캐시된 결과를 가져오므로 **Dune 크레딧 소모 없음**

### `query_ids.json`

16개 Dune 쿼리의 메타데이터 목록.

| 필드 | 설명 |
|------|------|
| `id` | Dune 쿼리 ID |
| `name` | 쿼리 이름 (데이터 접근 키로 사용) |
| `type` | `single_value`, `time_series`, `table` |
| `columns` | 쿼리 결과에 포함되는 컬럼 목록 |

**쿼리 목록:**

| # | 쿼리 ID | 이름 | 타입 |
|---|---------|------|------|
| 1 | 3206902 | TON Current Price | single_value |
| 2 | 3221097 | TON Total Supply | single_value |
| 3 | 3298417 | Circulating Supply (excl. staking) | single_value |
| 4 | 3292797 | Circulating Supply (incl. staking) | single_value |
| 5 | 3298426 | Market Cap | single_value |
| 6 | 3298440 | Staking TVL | single_value |
| 7 | 3360297 | Top 10 TON Holders | table |
| 8 | 6285706 | Tokenomics Daily Time Series (with price) | time_series |
| 9 | 6285699 | Tokenomics Daily Time Series (without price) | time_series |
| 10 | 6285921 | Seigniorage & Staking APY | time_series |
| 11 | 6290964 | Upbit Exchange TON Flow | time_series |
| 12 | 6285964 | ASD vs VWASD (Avg Staking Duration) | time_series |
| 13 | 6285976 | Exit VWASD with Price | time_series |
| 14 | 6285988 | Exit VWASD without Price | time_series |
| 15 | 6286264 | Exit Profit/Loss Analysis | table |
| 16 | 6286271 | Individual Exit Details | table |

### `.github/workflows/dune-report.yml`

GitHub Actions 워크플로우 설정.

**트리거:**
- `schedule`: 매주 월요일 09:00 UTC (cron: `0 9 * * 1`)
- `workflow_dispatch`: 수동 실행 가능

**단계:**
1. 레포 checkout
2. Node.js 22 설정
3. `npm install` (의존성 설치)
4. `node refreshDuneQueries.js` 실행 (DUNE_EXECUTE_API_KEY — 쿼리 실행)
5. `node generateDuneReport.js` 실행 (DUNE_API_KEY — 캐시 조회)
6. 변경사항 있으면 자동 커밋 & 푸시

---

## 리포트 내용

자동 생성되는 `DUNE_REPORT_YYYY-MM-DD.md`에 포함되는 섹션:

1. **한눈에 보는 TON 현황** — 가격, 발행량, 유통량, 시총, 스테이킹, TVL, APY
2. **가격 분석** — ATH, ATL, ATH 대비 하락률
3. **스테이킹 현황** — 스테이킹 비율, 변화량, APY, 시뇨리지, ASD/VWASD
4. **Exit 분석** — Exit 건수, 이익/손실 Exit 통계
5. **Upbit 거래소 흐름** — 유입/유출/순유입
6. **Top 10 홀더** — 상위 10 보유자 목록
7. **데이터 수집 요약** — 16개 쿼리별 수집 상태

---

## 실행 가이드

### 사전 준비

```bash
# 1. 프로젝트 루트에 .env 파일 생성
cat > .env << 'EOF'
DUNE_EXECUTE_API_KEY=실행용_api_key_here
DUNE_API_KEY=조회용_api_key_here
EOF

# 같은 키를 쓸 경우 DUNE_API_KEY만 설정하면 됨:
# echo "DUNE_API_KEY=your_api_key_here" > .env

# 2. 의존성 설치
npm install
```

### Step 1: 쿼리 실행 (refreshDuneQueries.js)

Dune 대시보드의 16개 쿼리 캐시를 갱신합니다. **크레딧을 소모**하므로 24시간 이내 실행된 쿼리는 자동으로 건너뜁니다.

```bash
node refreshDuneQueries.js
```

**실행 로그 예시:**
```
=== Dune Dashboard Query Refresher ===
Queries: 16
Concurrency: 4
API Key: ...abc123

Checking cached result freshness...

  ✅ TON Current Price — fresh (3.2h ago), skip
  ✅ TON Total Supply — fresh (3.2h ago), skip
  ⏳ Circulating Supply (excl. staking) — stale (26.1h ago)
  ⏳ Market Cap — stale (no cached result)
  ✅ Staking TVL — fresh (3.2h ago), skip
  ...

Fresh: 12, Stale: 4

Executing 4 stale queries...

  [START] Circulating Supply (excl. staking) (3298417)
  [START] Market Cap (3298426)
  ✅ Market Cap — 8.3s
  ✅ Circulating Supply (excl. staking) — 12.1s

─── Summary ───
✅ Fresh (skipped): 12
✅ Refreshed: 4

All queries are now fresh.
```

> 모든 쿼리가 fresh이면 `No execution needed. Saving credits.`를 출력하고 즉시 종료됩니다.

### Step 2: 리포트 생성 (generateDuneReport.js)

Step 1에서 갱신된 캐시 결과를 조회하여 마크다운 리포트를 생성합니다. **크레딧 소모 없음.**

```bash
node generateDuneReport.js
```

**실행 로그 예시:**
```
=== Tokamak Network Dune Report Generator ===
Report date: 2026-03-04

Fetching 16 queries from Dune...
  [3206902] TON Current Price...
    → 1 rows
  [3221097] TON Total Supply...
    → 1 rows
  ...

Calculating statistics...
Generating report...

✅ Report generated: docs/dune_report/DUNE_REPORT_2026-03-04.md
   85 lines written
```

### 결과 확인

```bash
# 생성된 리포트 목록
ls docs/dune_report/

# 오늘 리포트 확인
cat docs/dune_report/DUNE_REPORT_$(date +%Y-%m-%d).md
```

### 한번에 실행 (Step 1 + 2)

```bash
node refreshDuneQueries.js && node generateDuneReport.js
```

### GitHub Actions 자동 실행

- **자동**: 매주 월요일 09:00 UTC에 Step 1 → Step 2 → 커밋&푸시 자동 실행
- **수동**: GitHub 레포 → Actions → "Weekly Dune Report" → "Run workflow" 클릭

---

## GitHub Secrets 설정

레포 Settings → Secrets and variables → Actions에서 다음 시크릿 추가:

| 시크릿 이름 | 용도 | 설명 |
|-------------|------|------|
| `DUNE_EXECUTE_API_KEY` | 쿼리 실행 (크레딧 소모) | 실행 전용 Dune 계정의 API 키 |
| `DUNE_API_KEY` | 캐시 결과 조회 (무료) | 조회용 Dune 계정의 API 키 |

> 두 키를 같은 계정으로 설정해도 동작합니다. 크레딧 분리가 필요한 경우에만 다른 계정을 사용하세요.

---

## 새 쿼리 추가 방법

1. Dune에서 새 쿼리 생성 및 저장
2. `query_ids.json`에 쿼리 정보 추가:
   ```json
   {
     "id": 1234567,
     "name": "New Query Name",
     "type": "single_value | time_series | table",
     "columns": ["col1", "col2"]
   }
   ```
3. `generateDuneReport.js`의 `calculateStats()`에 해당 데이터 처리 로직 추가
4. `generateReport()`에 리포트 섹션 추가

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `DUNE_EXECUTE_API_KEY is not set` | 실행용 키 미설정 | `.env` 또는 환경변수 확인 |
| `DUNE_API_KEY is not set` | 조회용 키 미설정 | `.env` 또는 환경변수 확인 |
| `Execute failed (402)` | 크레딧 부족 | Dune 크레딧 충전 또는 다른 계정 사용 |
| `Execute failed (429)` | Rate limit 초과 | `CONCURRENCY` 값을 낮추거나 잠시 후 재시도 |
| `Query XXXXX failed (400)` | 쿼리 ID 오류 또는 삭제됨 | Dune에서 쿼리 확인 |
| `Polling timeout exceeded` | 쿼리 실행이 10분 초과 | `MAX_POLL_ATTEMPTS` 증가 또는 쿼리 최적화 |
| 빈 리포트 생성 | 모든 쿼리 실패 | API 키 유효성 및 네트워크 확인 |
| GitHub Actions 실패 | Secrets 미설정 | 레포 Settings에서 두 개 시크릿 모두 추가 |
