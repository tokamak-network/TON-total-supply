# TON (Tokamak Network) 공급량 분석 프로젝트 문서

## 📋 프로젝트 개요

이 프로젝트는 **TON (Tokamak Network) 토큰의 총 공급량(Total Supply)과 유통량(Circulating Supply)을 정확하게 계산하고 추적**하는 JavaScript 애플리케이션입니다.

### 🎯 목적
- TON 토큰의 정확한 공급량 계산
- 시계열 데이터 수집 및 분석
- Google Spreadsheet를 통한 공급량 추적
- 다양한 공급량 감소 요인들의 정량적 분석

## 🏗️ 프로젝트 구조

### 📁 핵심 파일들
```
TON-total-supply/
├── main.js                    # 메인 실행 파일 (실시간 계산)
├── updateAll.js              # 정기 업데이트 스케줄러
├── updateCSV.js              # CSV 데이터 업데이트 로직
├── updateCSVUpbit.js         # 업비트용 CSV 업데이트
├── utils/
│   └── blockRangeHelper.js   # 블록 범위 제한 해결 헬퍼
└── data/                     # 생성된 CSV 데이터 파일들
```

### 🧮 계산 모듈들
- **`burnedTON.js`** - 0x0000...0001 주소로 소각된 TON 계산
- **`burnedSeignorage.js`** - 언스테이킹으로 인해 소각된 seignorage 계산
- **`reducedSeignorage.js`** - DAO 지시로 PowerTON seignorage 비율 감소 부분 계산
- **`lockedTON.js`** - DAO vault에 락된 TON 계산
- **`stakedTON.js`** - Seigmanager에 스테이킹된 TON 계산

## 🔧 기술 스택

### 주요 의존성
```json
{
  "dependencies": {
    "dotenv": "^16.4.7",        // 환경변수 관리
    "ethers": "^6.13.4",        // 이더리움 상호작용
    "moralis": "^2.27.2"        // 블록체인 API
  },
  "devDependencies": {
    "alchemy-sdk": "^3.5.0"     // 이더리움 데이터 조회
  }
}
```

### API 서비스
- **Alchemy SDK** - 이더리움 블록체인 데이터 조회
- **Moralis API** - Unix timestamp → 블록 번호 변환

## 📊 TON 공급량 계산 로직

### 기본 계산 공식

#### 총 공급량 (Total Supply)
```javascript
// 1. 기본 공급량 계산
totalSupply = 50_000_000 + 3.92 * (lastBlockNumber - 10837698)

// 2. 감소 요인 적용
totalSupply = totalSupply - burnedTONAmount - reducedSeignorageAmount
```

#### 유통량 (Circulating Supply)
```javascript
// 일반 유통량 (스테이킹 제외)
circulatingSupply = totalSupply - stakedTONAmount - lockedTONAmount

// Upbit용 유통량 (스테이킹 포함)
circulatingSupplyUpbit = totalSupply - lockedTONAmount
```

### 🔥 공급량 감소 요인들

#### 1. Burned TON (소각된 TON)
- **대상**: 0x0000000000000000000000000000000000000001 주소로 전송된 TON
- **수집 방법**: Transfer 이벤트 로그 분석
- **컨트랙트**: TON Token Contract (0x2be5e8c109e2197D077D13A82dAead6a9b3433C5)

#### 2. Burned Seignorage (소각된 시뇨리지)
- **발생 원인**: seignorage 업데이트 전 언스테이킹
- **수집 이벤트**: UnstakeLog 이벤트의 totBurnAmount 필드
- **컨트랙트**: SeigManager (구/신 버전 모두 처리)

#### 3. Reduced Seignorage (감소된 시뇨리지)
- **발생 원인**: DAO 지시로 PowerTON seignorage 비율 10% → 5% 감소
- **탐지 조건**: `powertonSeig < unstakedSeig * 8%`인 경우
- **수집 이벤트**: SeigGiven 이벤트

#### 4. Locked TON (락된 TON)
- **위치**: DAO vault (0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303)
- **계산**: 락된 TON - 지출된 TON
- **수집 방법**: DAO vault로의 Transfer 이벤트

#### 5. Staked TON (스테이킹된 TON)
- **위치**: SeigManager의 AutoCoinage 컨트랙트
- **특징**: 취약점 패치로 인한 컨트랙트 변경 고려
- **분기점**: 블록 18417894 (패치된 컨트랙트 배포)

## 🚀 `node updateAll.js` 실행 프로세스

### 📈 실행 단계별 상세 과정

#### 1️⃣ **초기화 및 설정**
```javascript
// Moralis API 초기화
await Moralis.start({ apiKey: process.env.MORALIS_API_KEY });

// 최신 블록 정보 조회
let lastBlock = await alchemy.core.getBlock();
let lastBlockNumber = lastBlock.number;
let lastUnix_timestamp = lastBlock.timestamp;
```

#### 2️⃣ **시간 기준점 로딩**
- **소스**: `data/unixEpochTimeList.csv` (79개 시점)
- **범위**: 2020년 8월 12일 ~ 현재
- **주기**: 대략 월별 + 특별 이벤트 시점
- **처리**: Unix timestamp → 블록 번호 변환 (Moralis API 사용)

#### 3️⃣ **블록 번호 매핑 생성**
```javascript
// 출력: data/blockNumber_column_F.csv
// 형식: Unix Epoch time, Block number
// 예시: 1597211409, 10643261
```

#### 4️⃣ **스테이킹된 TON 집계**
```javascript
// 각 시점별 스테이킹 양 계산
for (let i = 0; i < blockNumberList.length; i++) {
  stakedTONList[i] = await stakedTON.stakedTON(blockNumberList[i]);
}
// 출력: data/stakedTON_column_Y.csv
```

#### 5️⃣ **소각된 TON 집계**
```javascript
// 기간별 소각량 계산 (블록 범위: 이전 시점+1 ~ 현재 시점)
for (let i = 0; i < blockNumberListEvents.length - 1; i++) {
  burnedTONList[i] = await burnedTON.burnedTON(
    blockNumberListEvents[i] + 1,
    blockNumberListEvents[i + 1]
  );
}
// 출력: data/burnedTON_column_J.csv
```

#### 6️⃣ **DAO 락/지출 TON 집계**
```javascript
// 락된 TON과 지출된 TON 동시 계산
[lockedTONList[i], spentTONList[i]] = await lockedTON.lockedTON(
  blockNumberListEvents[i] + 1,
  blockNumberListEvents[i + 1]
);
// 출력: data/lockedTON+spentTON_column_V+W.csv
```

#### 7️⃣ **소각된 Seignorage 집계**
```javascript
// UnstakeLog 이벤트에서 totBurnAmount 수집
burnedSeignorageList[i] = await burnedSeignorage.burnedSeignorage(
  blockNumberListEvents[i] + 1,
  blockNumberListEvents[i + 1]
);
// 출력: data/burnedSeigSWTON.csv
```

#### 8️⃣ **감소된 Seignorage 집계**
```javascript
// PowerTON seignorage 비율 감소분 계산
reducedTONList[i] = await reducedSeignorage.reducedSeignorage(
  blockNumberListEvents[i] + 1,
  blockNumberListEvents[i + 1]
);
// 출력: data/reducedSeigTON_column_H.csv
```

### 📊 생성되는 데이터 파일들

| 파일명 | 내용 | 컬럼 | 용도 |
|--------|------|------|------|
| `blockNumber_column_F.csv` | 시간-블록 매핑 | Unix Epoch time, Block number | 시간 기준 추적 |
| `stakedTON_column_Y.csv` | 스테이킹 양 | Block number, Staked (W)TON | 유통량 계산 |
| `burnedTON_column_J.csv` | 소각된 TON | Block number, Burned TON | 총공급량 계산 |
| `lockedTON+spentTON_column_V+W.csv` | DAO 락/지출 | Block number, Locked TON, Spent TON | 유통량 계산 |
| `burnedSeigSWTON.csv` | 소각된 seignorage | Block number, Burned SWTON seignorage | 총공급량 계산 |
| `reducedSeigTON_column_H.csv` | 감소된 seignorage | Block number, Reduced seignorage | 총공급량 계산 |

## 🔧 기술적 개선사항

### 🚫 eth_getLogs 블록 범위 제한 해결

#### 문제점
- Alchemy API의 eth_getLogs는 500블록 초과 시 에러 발생
- 대량의 과거 데이터 수집 시 제약

#### 해결책: 블록 범위 헬퍼 함수
```javascript
// utils/blockRangeHelper.js
async function getLogsWithRangeLimit(alchemy, startBlock, endBlock, contractAddress, topics) {
  const ranges = splitBlockRange(startBlock, endBlock, 499); // 499블록씩 분할
  const allLogs = [];

  for (let range of ranges) {
    const logs = await alchemy.core.getLogs({
      fromBlock: "0x" + range.fromBlock.toString(16),
      toBlock: "0x" + range.toBlock.toString(16),
      address: contractAddress,
      topics: topics,
    });
    allLogs.push(...logs);

    // Rate limiting 방지
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return allLogs;
}
```

#### 적용된 파일들
- ✅ `burnedTON.js`
- ✅ `lockedTON.js`
- ✅ `burnedSeignorage.js`
- ✅ `reducedSeignorage.js`

## 📈 데이터 활용

### Google Spreadsheet 연동
- **방식**: 수동 복사/붙여넣기
- **대상**: [TON 공급량 스프레드시트](https://docs.google.com/spreadsheets/d/1-4dT3nS4q7RwLgGI6rQ7M1hPx9XHI-Ryw1rkBCvTdcs/edit?usp=sharing)
- **주기**: 필요 시 수동 업데이트

### 실시간 계산 (`main.js`)
```javascript
// 최신 블록 기준 즉시 계산
console.log("Total Supply for TON is :", totalSupply, "TON");
console.log("Circulating Supply:", circulatingSupply, "TON");
console.log("Circulating Supply (Upbit):", circulatingSupplyUpbit, "TON");
```

## 🛠️ 사용법

### 환경 설정
```bash
# 1. 환경 변수 설정
cp .env_example .env
# ALCHEMY_API_KEY와 MORALIS_API_KEY 설정

# 2. 의존성 설치
npm install

# 3. 실시간 계산 실행
node main.js

# 4. 과거 데이터 업데이트 실행
node updateAll.js
```

### 예상 실행 시간
- **`main.js`**: 약 30초 (최신 데이터만)
- **`updateAll.js`**: 약 10-15분 (79개 시점 전체 데이터)

## 📊 출력 예시

### main.js 실행 결과
```
............................................
Current block number: 21234567
Current block time: Wed Jan 15 2025 10:30:00 GMT+0900
............................................
Burned TON is : 123.45
Burned TON Seignorage is : 67.89
Reduced TON Seignorage is : 234.56
Locked TON is : 1000000.00
Staked TON is : 15000000.00
............................................
Total Supply for TON is : 49876543.21 TON
Circulating Supply: 33876543.21 TON ( 68 % of total supply)
Circulating Supply (Upbit): 48876543.21 TON ( 98 % of total supply)
```

## 🔒 보안 고려사항

### 환경변수 보호
- `.env` 파일은 Git 추적 제외
- `.cursorignore`로 AI 인덱싱 제외
- API 키 노출 방지

### 파일 제외 설정
```
# .gitignore & .cursorignore
.env
.env.local
.env.production
.env.development
node_modules/
.DS_Store
```

## 🚀 향후 개선 가능사항

1. **자동화된 Google Sheets API 연동**
2. **실시간 모니터링 대시보드**
3. **알림 시스템 (공급량 급변 시)**
4. **더 세밀한 시간 간격 데이터 수집**
5. **GraphQL API 제공**

---

*이 문서는 TON 공급량 분석 프로젝트의 종합적인 기술 문서입니다. 추가 질문이나 개선 제안이 있으시면 언제든 연락해 주세요.*
