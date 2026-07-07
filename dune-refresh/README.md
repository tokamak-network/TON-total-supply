# Dune 대시보드 일일 자동 새로고침

[Tokamak Network Tokenomics 대시보드](https://dune.com/tokamak-network/tokamak-network-tokenomics-dashboard)를
구성하는 Dune 쿼리들을 **매일 자동으로 재실행(refresh)** 하는 도구입니다.

Dune 대시보드는 각 쿼리의 **최신 실행 결과**를 표시합니다. 따라서 매일 쿼리를 실행해두면
대시보드가 사람 손 없이 항상 최신 상태로 유지됩니다.

## 구성

| 파일 | 역할 |
|---|---|
| `refresh.js` | `queries.json` 의 각 쿼리를 Dune execute API 로 재실행 |
| `queries.json` | 새로고침할 쿼리 ID 목록 |
| `../.github/workflows/dune-refresh.yml` | 매일 자동 실행하는 GitHub Actions 워크플로우 |

## 1. 새로고침할 쿼리 등록 (`queries.json`)

대시보드의 **모든 차트가 자동으로 갱신되려면**, 각 차트가 참조하는 쿼리 ID를 모두 넣어야 합니다.
쿼리 ID 찾는 법:

1. 대시보드에서 차트 우측 상단 `···` → **View query** 클릭
2. 열린 URL의 숫자가 쿼리 ID: `dune.com/queries/`**`3360297`**`/...`

```json
{
  "queries": [
    { "id": 3360297, "name": "The Big Players of TON+WTON: Leading 10 Wallets" },
    { "id": 0000000, "name": "여기에 나머지 차트 쿼리 추가" }
  ]
}
```

> `name` 은 로그 가독성용이며 없어도 됩니다.

## 2. API 키

쿼리 실행 권한이 있는 Dune API 키가 필요합니다. 스크립트는
`DUNE_EXECUTE_API_KEY` 를 우선 사용하고, 없으면 `DUNE_API_KEY` 로 폴백합니다.

- **로컬/서버 cron**: 프로젝트 루트 `.env` 에 이미 있는 키를 그대로 사용
- **GitHub Actions**: 저장소 **Settings → Secrets and variables → Actions** 에 `DUNE_EXECUTE_API_KEY`(또는 `DUNE_API_KEY`) 등록

## 3-A. GitHub Actions 로 실행 (추천)

`../.github/workflows/dune-refresh.yml` 이 매일 **22:50 UTC (= 다음날 07:50 KST)** 에 자동 실행합니다.
CoinGecko/Upbit 등 외부 집계처가 오전 9시(KST)경 참조하기 전에 데이터가 갱신돼 있도록 9시 이전으로 잡았습니다.
설정할 것은 위 2번의 Secret 등록뿐입니다.

- 실행 시각 변경: 워크플로우의 `cron` 값 수정 ([crontab.guru](https://crontab.guru) 참고, **UTC 기준**)
- 수동 실행/테스트: 저장소 **Actions 탭 → Dune daily refresh → Run workflow**
- 비용: public repo 무제한 무료 / private repo 도 하루 ~1분이라 무료 범위. 단, 쿼리 실행 자체는 Dune 크레딧을 소모합니다(실행 장소와 무관).

## 3-B. 서버 crontab 으로 실행

```bash
crontab -e
```

```cron
# 매일 07:50 (서버 로컬 타임존이 KST일 때) Dune 대시보드 새로고침
50 7 * * *  cd /path/to/TON-total-supply && /usr/bin/node dune-refresh/refresh.js --wait >> /var/log/dune-refresh.log 2>&1
```

- `cd` 로 프로젝트 루트에 들어가야 `.env` 와 `queries.json` 을 찾습니다.
- `node` 경로는 `which node` 로 확인해 절대경로로 넣으세요.

## 수동 실행 / 동작 확인

```bash
# 실행만 트리거 (빠름, fire-and-forget)
node dune-refresh/refresh.js

# 실행 완료까지 폴링하여 성공/실패를 로그로 확인 (Actions/cron 권장)
node dune-refresh/refresh.js --wait
```

## 환경변수 (선택)

| 변수 | 기본값 | 설명 |
|---|---|---|
| `DUNE_PERFORMANCE` | `medium` | 실행 엔진 티어 (`medium` / `large`). `large` 는 더 빠르지만 크레딧을 더 씁니다. |
| `DUNE_CONCURRENCY` | `3` | 동시에 실행하는 쿼리 수. 항상 최대 이 개수만큼만 진행하고, 하나가 끝나면 다음 쿼리가 빈 슬롯으로 들어갑니다(슬라이딩 풀). **Dune Free 플랜은 동시 쿼리 최대 3개** 제한이라 기본값 3 이 딱 맞습니다. 넘기면 rate limit(429) — 그래도 429 는 자동 재시도합니다. `1` 로 주면 완전 순차 실행. |
| `DUNE_WAIT_TIMEOUT_MS` | `600000` | `--wait` 시 쿼리당 최대 대기 시간(ms) |

## 비용 (Dune 크레딧)

`medium` 엔진 기준 실측(2026-07):

| 항목 | 크레딧 |
|---|---|
| 1회(16개 쿼리) 전체 실행 | 약 **54.3** |
| 매일 1회 × 30일 | 약 **1,630 / 월** |

- **Free 플랜(월 2,500 credits, API 포함)으로 충분합니다.** 현재 사용률 약 65%.
- 가장 비싼 쿼리는 `The Big Players…`(#3360297) 하나로 **~24 credits (일일 비용의 44%)** — 전체 transfer 이력을 스캔하기 때문. 향후 크레딧이 부족해지면 이 쿼리부터 최적화(스캔 범위 제한 등)하면 효과가 큽니다.
- 온체인 이력이 늘수록 쿼리당 크레딧도 서서히 증가하므로 여유분(월 ~870 credits)은 모니터링 권장. 초과분은 $5/100 credits(= $0.05/credit)로 과금됩니다. 지속적으로 부족하면 다음 등급 **Analyst($65/월, 4,000 credits)** 로 업그레이드하면 됩니다.
- 참고: 앞서 겪은 429 는 크레딧 소진이 아니라 **요청 rate limit** 입니다. Free 플랜은 rate limit 이 낮으므로 `DUNE_CONCURRENCY` 를 낮게(기본 3) 유지하는 것이 안전합니다.

## 대안: Dune 유료 플랜의 native 스케줄러

유료 플랜(**Analyst $65/월 이상**, medium/large 엔진 필요)이면 이 스크립트·GitHub Actions 없이
Dune 자체 **Query Scheduler** 로 Dune 이 알아서 쿼리를 주기 실행하게 할 수 있습니다.

### 등록 방법 (쿼리마다 개별 설정, Dune 웹 UI)

1. 대시보드에서 차트 `···` → **View query** 로 쿼리 편집기를 엽니다.
2. 편집기 하단의 **시계(⏰) 아이콘** 클릭 (Run 버튼 왼쪽).
3. 대화창에서 **새로고침 주기**(specific time + frequency)와 **실행 엔진**(medium/large)을 선택합니다.
4. 표시되는 **예상 월 크레딧 소비량 / 쿼터**를 확인합니다.
5. **Save** → 쿼리가 즉시 1회 실행되고, 이후 설정한 주기대로 자동 실행됩니다.
6. 대시보드는 각 쿼리의 최신 실행 결과를 표시하므로, 이렇게 걸어두면 자동으로 최신 상태가 됩니다.

> 이 대시보드는 쿼리가 16개이므로 **각 쿼리마다 위 과정을 반복**해야 합니다.
> (반면 이 스크립트는 `queries.json` 한 곳에서 전부 관리)

### 제약 / 비교

- **파라미터가 있는 쿼리는 스케줄 불가**, 주기는 Dune 제공 프리셋 범위.
- 크레딧 소비량은 API 방식과 **동일**(엔진·스캔량 기준). 차이는 *트리거 주체*뿐:
  Dune 스케줄러 = Dune 이 트리거(운영 부담 0, 유료) / 이 스크립트 = 외부 cron·Actions 가 트리거(무료, 실행 시각 정밀 제어).
- **정리**: `$65/월 + 설정 제로` (native 스케줄러) vs `$0 + 약간의 cron/Actions 설정` (이 스크립트).
  실행 시각을 오전 9시(KST) 이전으로 정밀히 맞추려면 cron 방식이 더 유리합니다.

## 참고

- 대시보드→쿼리 목록은 공개 API 로 자동 수집이 불가능하여(내부 API 인증 필요), `queries.json` 으로 직접 관리합니다.
