/**
 * Tokamak Network - Dune Dashboard Auto Report Generator
 *
 * Fetches cached results from 16 Dune queries and generates
 * a weekly markdown report in docs/YYYY-MM-DD/DUNE_REPORT.md
 *
 * Usage:
 *   DUNE_API_KEY=xxx node generateDuneReport.js
 *   (or set DUNE_API_KEY in .env for local development)
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Configuration ───

const API_KEY = process.env.DUNE_API_KEY;
if (!API_KEY) {
  // Try loading from .env for local development
  try {
    const envPath = join(__dirname, '.env');
    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, 'utf-8');
      for (const line of envContent.split('\n')) {
        const match = line.match(/^DUNE_API_KEY=(.+)$/);
        if (match) {
          process.env.DUNE_API_KEY = match[1].trim();
          break;
        }
      }
    }
  } catch (_) { /* ignore */ }
}

const DUNE_API_KEY = process.env.DUNE_API_KEY;
if (!DUNE_API_KEY) {
  console.error('Error: DUNE_API_KEY is not set. Set it as environment variable or in .env file.');
  process.exit(1);
}

const BASE_URL = 'https://api.dune.com/api/v1';
const headers = {
  'X-Dune-API-Key': DUNE_API_KEY,
};

// ─── Dune API Helper ───

async function getQueryResult(queryId, limit = 1000) {
  const url = `${BASE_URL}/query/${queryId}/results?limit=${limit}`;
  const res = await fetch(url, { headers });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Query ${queryId} failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return {
    result: data.result,
    executionEndedAt: data.execution_ended_at || null,
  };
}

// ─── Formatting Helpers ───

function fmt(n, decimals = 2) {
  if (n == null || isNaN(n)) return 'N/A';
  return Number(n).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtPercent(n) {
  if (n == null || isNaN(n)) return 'N/A';
  return `${Number(n).toFixed(2)}%`;
}

function fmtDate(dateStr) {
  if (!dateStr) return 'N/A';
  return dateStr.slice(0, 10);
}

// ─── Data Fetching ───

async function fetchAllQueries() {
  const queryConfig = JSON.parse(readFileSync(join(__dirname, 'query_ids.json'), 'utf-8'));
  const results = {};

  console.log(`Fetching ${queryConfig.queries.length} queries from Dune...`);

  for (const query of queryConfig.queries) {
    try {
      console.log(`  [${query.id}] ${query.name}...`);
      const { result, executionEndedAt } = await getQueryResult(query.id);
      results[query.name] = {
        ...query,
        rows: result?.rows || [],
        metadata: result?.metadata || {},
        executionEndedAt,
      };
      console.log(`    → ${results[query.name].rows.length} rows (executed: ${executionEndedAt || 'unknown'})`);
    } catch (err) {
      console.error(`    ✗ Error: ${err.message}`);
      results[query.name] = { ...query, rows: [], error: err.message, executionEndedAt: null };
    }
  }

  return results;
}

// ─── Statistics Calculation ───

function calculateStats(data) {
  const stats = {};

  // Current Price
  const priceData = data['TON Current Price'];
  if (priceData?.rows?.[0]) {
    stats.currentPrice = priceData.rows[0].price;
  }

  // Total Supply
  const supplyData = data['TON Total Supply'];
  if (supplyData?.rows?.[0]) {
    stats.totalSupply = supplyData.rows[0].TON_Total_Supply;
  }

  // Circulating Supply
  const circExcl = data['Circulating Supply (excl. staking)'];
  if (circExcl?.rows?.[0]) {
    stats.circulatingExclStaking = circExcl.rows[0].Circulating_Supply;
  }

  const circIncl = data['Circulating Supply (incl. staking)'];
  if (circIncl?.rows?.[0]) {
    stats.circulatingInclStaking = circIncl.rows[0].Circulating_Supply;
  }

  // Market Cap
  const mcap = data['Market Cap'];
  if (mcap?.rows?.[0]) {
    stats.marketCap = mcap.rows[0].market_cap;
  }

  // Staking TVL
  const tvl = data['Staking TVL'];
  if (tvl?.rows?.[0]) {
    stats.stakedTON = tvl.rows[0].current_staked_ton;
    stats.tonPriceUSD = tvl.rows[0].current_ton_price_usd;
    stats.tvlUSD = tvl.rows[0].current_tvl_usd;
  }

  // Price trend from time series
  const timeSeries = data['Tokenomics Daily Time Series (with price)'];
  if (timeSeries?.rows?.length) {
    const rows = [...timeSeries.rows].sort((a, b) =>
      (a.block_date || '').localeCompare(b.block_date || '')
    );

    const latestRow = rows[rows.length - 1];
    const earliestRow = rows[0];
    stats.latestTimeSeries = latestRow;
    stats.earliestTimeSeries = earliestRow;

    const latestDate = new Date(latestRow.block_date);

    // Find rows closest to 7d, 30d, 90d ago
    const findRowNDaysAgo = (days) => {
      const target = new Date(latestDate);
      target.setDate(target.getDate() - days);
      const targetStr = target.toISOString().slice(0, 10);
      let closest = null;
      let minDiff = Infinity;
      for (const row of rows) {
        const diff = Math.abs(new Date(row.block_date) - target);
        if (diff < minDiff) { minDiff = diff; closest = row; }
      }
      return closest;
    };

    const row7d = findRowNDaysAgo(7);
    const row30d = findRowNDaysAgo(30);
    const row90d = findRowNDaysAgo(90);

    const latestPrice = Number(latestRow.token_price);

    const calcChange = (oldRow) => {
      if (!oldRow) return null;
      const oldPrice = Number(oldRow.token_price);
      if (!oldPrice || isNaN(oldPrice)) return null;
      return ((latestPrice - oldPrice) / oldPrice) * 100;
    };

    stats.price7dChange = calcChange(row7d);
    stats.price30dChange = calcChange(row30d);
    stats.price90dChange = calcChange(row90d);
    stats.price7dAgo = row7d ? Number(row7d.token_price) : null;
    stats.price30dAgo = row30d ? Number(row30d.token_price) : null;
    stats.price90dAgo = row90d ? Number(row90d.token_price) : null;

    // 30d high / low
    const last30dRows = rows.filter((r) => {
      const d = new Date(r.block_date);
      return (latestDate - d) <= 30 * 24 * 60 * 60 * 1000;
    });
    if (last30dRows.length) {
      let high = -Infinity, low = Infinity, highDate = '', lowDate = '';
      for (const r of last30dRows) {
        const p = Number(r.token_price);
        if (!isNaN(p) && p > 0) {
          if (p > high) { high = p; highDate = r.block_date; }
          if (p < low) { low = p; lowDate = r.block_date; }
        }
      }
      if (high !== -Infinity) stats.price30dHigh = { price: high, date: highDate };
      if (low !== Infinity) stats.price30dLow = { price: low, date: lowDate };
    }

    // Staking change over period
    if (latestRow && earliestRow) {
      const latestStaked = Number(latestRow.staked_amount);
      const earliestStaked = Number(earliestRow.staked_amount);
      if (!isNaN(latestStaked) && !isNaN(earliestStaked) && earliestStaked > 0) {
        stats.stakingChangePercent = ((latestStaked - earliestStaked) / earliestStaked) * 100;
        stats.stakingChangeAmount = latestStaked - earliestStaked;
      }
    }

    // Staking 7d change
    if (latestRow && row7d) {
      const cur = Number(latestRow.staked_amount);
      const prev = Number(row7d.staked_amount);
      if (!isNaN(cur) && !isNaN(prev) && prev > 0) {
        stats.staking7dChange = ((cur - prev) / prev) * 100;
        stats.staking7dChangeAmount = cur - prev;
      }
    }

    // Latest staking ratio
    if (latestRow) {
      stats.stakingRatio = Number(latestRow.staking_ratio_percent);
    }

    // Inflation rate (supply growth, 30d basis for stability)
    if (latestRow && row30d) {
      const curSupply = Number(latestRow.total_supply);
      const prevSupply = Number(row30d.total_supply);
      if (curSupply && prevSupply && prevSupply > 0) {
        const growth = curSupply - prevSupply;
        stats.supplyGrowth30d = growth;

        const monthlyRate = growth / prevSupply;
        stats.inflationMonthly = monthlyRate * 100;
        stats.inflationAnnualized = ((1 + monthlyRate) ** 12 - 1) * 100;
      }
    }

  }

  // Seigniorage & APY
  const seig = data['Seigniorage & Staking APY'];
  if (seig?.rows?.length) {
    const rows = [...seig.rows].sort((a, b) =>
      (b.evt_block_time || '').localeCompare(a.evt_block_time || '')
    );
    stats.latestAPY = Number(rows[0]?.apy_percent);
    stats.totalSeigniorage = rows.reduce(
      (sum, r) => sum + (Number(r.added_seigniorage) || 0), 0
    );

    // 30d seigniorage (staker portion only) for circulating inflation
    const latestDate = new Date(rows[0]?.evt_block_time);
    const thirtyDaysAgo = new Date(latestDate);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recent30dSeig = rows.filter((r) => new Date(r.evt_block_time) >= thirtyDaysAgo);
    const monthly30dSeig = recent30dSeig.reduce((sum, r) => sum + (Number(r.added_seigniorage) || 0), 0);
    if (monthly30dSeig > 0 && stats.totalSupply) {
      stats.seigMonthly = monthly30dSeig;
      const monthlyRate = monthly30dSeig / stats.totalSupply;
      stats.seigInflationAnnualized = ((1 + monthlyRate) ** 12 - 1) * 100;
    }

    // APY trend
    const find30dAgo = () => {
      const target = new Date(latestDate);
      target.setDate(target.getDate() - 30);
      let closest = null, minDiff = Infinity;
      for (const r of rows) {
        const diff = Math.abs(new Date(r.evt_block_time) - target);
        if (diff < minDiff) { minDiff = diff; closest = r; }
      }
      return closest;
    };
    const apy30dAgo = find30dAgo();
    if (apy30dAgo) {
      stats.apy30dAgo = Number(apy30dAgo.apy_percent);
      stats.apyChange30d = stats.latestAPY - stats.apy30dAgo;
    }
  }

  // ASD / VWASD (latest)
  const asd = data['ASD vs VWASD (Avg Staking Duration)'];
  if (asd?.rows?.length) {
    const sorted = [...asd.rows].sort((a, b) => (b.dt || '').localeCompare(a.dt || ''));
    stats.latestASD = Number(sorted[0]?.ASD);
    stats.latestVWASD = Number(sorted[0]?.VWASD);
    stats.asdDate = sorted[0]?.dt;
  }

  // Exit Profit/Loss Analysis
  const exitPL = data['Exit Profit/Loss Analysis'];
  if (exitPL?.rows?.length) {
    let profitVolume = 0;
    let lossVolume = 0;
    let profitCount = 0;
    let lossCount = 0;

    for (const row of exitPL.rows) {
      const profit = Number(row.Volume_In_Price_Profit) || 0;
      const loss = Number(row.Volume_In_Price_Loss) || 0;
      if (profit > 0) { profitVolume += profit; profitCount++; }
      if (loss > 0) { lossVolume += loss; lossCount++; }
    }

    stats.exitProfitVolume = profitVolume;
    stats.exitLossVolume = lossVolume;
    stats.exitProfitCount = profitCount;
    stats.exitLossCount = lossCount;
    stats.exitTotalCount = exitPL.rows.length;
  }

  // Individual Exit Details
  const exitDetails = data['Individual Exit Details'];
  if (exitDetails?.rows?.length) {
    stats.totalExitEvents = exitDetails.rows.length;

    // Earliest / latest exit date
    const exitDates = exitDetails.rows
      .map((r) => r.exit_date)
      .filter(Boolean)
      .sort();
    if (exitDates.length) {
      stats.exitFirstDate = exitDates[0].slice(0, 10);
      stats.exitLastDate = exitDates[exitDates.length - 1].slice(0, 10);
    }

    // Recent exits (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    stats.recentExits = exitDetails.rows.filter(
      r => new Date(r.exit_date) >= thirtyDaysAgo
    ).length;
  }

  // Upbit Flow
  // inflow_to_upbit: 온체인에서 Upbit 지갑으로 들어온 TON (양수)
  // outflow_from_upbit: Upbit 지갑에서 온체인으로 나간 TON (음수일 수 있음)
  // net_flow: Dune 쿼리에서 계산된 순유입 (inflow + outflow)
  const upbit = data['Upbit Exchange TON Flow'];
  if (upbit?.rows?.length) {
    let totalInflow = 0;
    let totalOutflow = 0;
    let totalNetFlow = 0;
    for (const row of upbit.rows) {
      totalInflow += Number(row.inflow_to_upbit) || 0;
      totalOutflow += Number(row.outflow_from_upbit) || 0;
      totalNetFlow += Number(row.net_flow) || 0;
    }
    stats.upbitTotalInflow = totalInflow;
    stats.upbitTotalOutflow = totalOutflow;
    stats.upbitNetFlow = totalNetFlow;

    // Data period
    const upbitDates = upbit.rows.map((r) => r.dt).filter(Boolean).sort();
    if (upbitDates.length) {
      stats.upbitFirstDate = upbitDates[0].slice(0, 10);
      stats.upbitLastDate = upbitDates[upbitDates.length - 1].slice(0, 10);
    }
  }

  // Top 10 Holders
  const holders = data['Top 10 TON Holders'];
  if (holders?.rows?.length) {
    stats.topHolders = holders.rows.slice(0, 10);

  }

  return stats;
}

// ─── Report Generation ───

function generateReport(stats, data, reportDate, executionTime) {
  const lines = [];
  const push = (line = '') => lines.push(line);

  push(`# Tokamak Network (TON) 토크노믹스 주간 리포트`);
  push();
  push(`> 쿼리 실행: ${executionTime} | 리포트 생성: ${reportDate} | 자동 생성 by GitHub Actions`);
  push(`> 출처: [Dune Analytics Dashboard](https://dune.com/tokamak-network/tokamak-network-tokenomics-dashboard)`);
  push();
  push('---');
  push();

  // ─── Summary Table ───
  push('## 한눈에 보는 TON 현황');
  push();
  push('| 항목 | 값 |');
  push('|------|-----|');
  push(`| 현재 가격 | **$${fmt(stats.currentPrice)}** |`);
  push(`| 총 발행량 | **${fmt(stats.totalSupply, 0)} TON** |`);
  push(`| 유통량 (스테이킹 제외) | **${fmt(stats.circulatingExclStaking, 0)} TON** |`);
  push(`| 유통량 (스테이킹 포함) | **${fmt(stats.circulatingInclStaking, 0)} TON** |`);
  push(`| 시가총액 | **$${fmt(stats.marketCap, 0)}** |`);
  push(`| 스테이킹 물량 | **${fmt(stats.stakedTON, 0)} TON** |`);
  push(`| 스테이킹 TVL (USD) | **$${fmt(stats.tvlUSD, 0)}** |`);
  if (stats.latestAPY) {
    push(`| 현재 APY | **${fmtPercent(stats.latestAPY)}** |`);
  }
  if (stats.inflationAnnualized != null) {
    push(`| 명목 인플레이션 (총 발행량 기준) | **${fmtPercent(stats.inflationAnnualized)}**/yr |`);
  }
  if (stats.seigInflationAnnualized != null) {
    push(`| 유통 인플레이션 (스테이커 배분 기준) | **${fmtPercent(stats.seigInflationAnnualized)}**/yr |`);
  }
  push();
  push('---');
  push();

  // ─── Price Analysis ───
  push('## 1. 가격 변동');
  push();
  const fmtChange = (v) => {
    if (v == null) return 'N/A';
    const sign = v > 0 ? '+' : '';
    return `${sign}${v.toFixed(2)}%`;
  };
  push('| 기간 | 가격 | 변화율 |');
  push('|------|------:|-------:|');
  push(`| 현재 | $${fmt(stats.currentPrice)} | — |`);
  if (stats.price7dAgo != null) {
    push(`| 7일 전 | $${fmt(stats.price7dAgo)} | ${fmtChange(stats.price7dChange)} |`);
  }
  if (stats.price30dAgo != null) {
    push(`| 30일 전 | $${fmt(stats.price30dAgo)} | ${fmtChange(stats.price30dChange)} |`);
  }
  if (stats.price90dAgo != null) {
    push(`| 90일 전 | $${fmt(stats.price90dAgo)} | ${fmtChange(stats.price90dChange)} |`);
  }
  push();
  if (stats.price30dHigh || stats.price30dLow) {
    push('**최근 30일 범위:**');
    if (stats.price30dHigh) push(`- 고점: $${fmt(stats.price30dHigh.price)} (${fmtDate(stats.price30dHigh.date)})`);
    if (stats.price30dLow) push(`- 저점: $${fmt(stats.price30dLow.price)} (${fmtDate(stats.price30dLow.date)})`);
  }
  push();
  push('---');
  push();

  // ─── Staking Analysis ───
  push('## 2. 스테이킹 현황');
  push();
  if (stats.stakingRatio != null) {
    push(`- **스테이킹 비율**: ${fmtPercent(stats.stakingRatio)}`);
  }
  if (stats.staking7dChange != null) {
    push(`- **전주 대비**: ${fmtChange(stats.staking7dChange)} (${stats.staking7dChangeAmount > 0 ? '+' : ''}${fmt(stats.staking7dChangeAmount, 0)} TON)`);
  }
  if (stats.stakingChangePercent != null) {
    push(`- **전체 기간 변화**: ${stats.stakingChangePercent > 0 ? '+' : ''}${fmtPercent(stats.stakingChangePercent)} (${stats.stakingChangeAmount > 0 ? '+' : ''}${fmt(stats.stakingChangeAmount, 0)} TON)`);
  }
  if (stats.latestAPY) {
    const apyTrend = stats.apyChange30d != null
      ? ` (30일 전 대비 ${stats.apyChange30d > 0 ? '+' : ''}${stats.apyChange30d.toFixed(2)}%p)`
      : '';
    push(`- **현재 APY**: ${fmtPercent(stats.latestAPY)}${apyTrend}`);
  }
  if (stats.totalSeigniorage) {
    push(`- **총 시뇨리지 발행량**: ${fmt(stats.totalSeigniorage, 0)} TON`);
  }
  if (stats.supplyGrowth30d != null) {
    push(`- **30일간 총 발행 증가**: +${fmt(stats.supplyGrowth30d, 0)} TON (명목 ${fmtPercent(stats.inflationAnnualized)}/yr)`);
  }
  if (stats.seigMonthly != null) {
    push(`- **30일간 스테이커 배분**: +${fmt(stats.seigMonthly, 0)} TON (유통 ${fmtPercent(stats.seigInflationAnnualized)}/yr)`);
    push(`  > 명목: 전체 신규 발행 기준 | 유통: 스테이커에게 실제 배분된 물량 기준 (시장 매도 압력)`);
  }
  push();

  // ASD / VWASD
  if (stats.latestASD || stats.latestVWASD) {
    push('### 평균 스테이킹 기간');
    push();
    push('| 지표 | 값 |');
    push('|------|-----|');
    if (stats.latestASD) push(`| 단순 평균 (ASD) | **${fmt(stats.latestASD, 0)}일** |`);
    if (stats.latestVWASD) push(`| 금액가중 평균 (VWASD) | **${fmt(stats.latestVWASD, 0)}일** |`);
    push();
    push('> **VWASD**(Volume-Weighted Average Staking Duration): 스테이킹 금액으로 가중한 평균 기간. VWASD > ASD이면 대규모 스테이커일수록 더 오래 유지하고 있다는 의미.');
    push();
  }
  push('---');
  push();

  // ─── Exit Analysis ───
  push('## 3. Exit(스테이킹 해제) 분석');
  push();
  const exitPeriod = (stats.exitFirstDate && stats.exitLastDate)
    ? ` (${stats.exitFirstDate} ~ ${stats.exitLastDate})`
    : '';
  if (stats.totalExitEvents != null) {
    push(`- **전체 Exit 건수**: ${stats.totalExitEvents}건${exitPeriod}`);
  }
  if (stats.recentExits != null) {
    push(`- **최근 30일 Exit**: ${stats.recentExits}건`);
  }
  if (stats.exitProfitVolume != null) {
    push();
    push('> 기준: 스테이킹 진입 시점 TON 가격 vs Exit 시점 가격 비교');
    push();
    push('| 구분 | 건수 | 볼륨 |');
    push('|------|------:|------:|');
    push(`| 이익 Exit (Exit가 > 진입가) | ${stats.exitProfitCount}건 | ${fmt(stats.exitProfitVolume, 0)} TON |`);
    push(`| 손실 Exit (Exit가 < 진입가) | ${stats.exitLossCount}건 | ${fmt(stats.exitLossVolume, 0)} TON |`);
  }
  push();
  push('---');
  push();

  // ─── Upbit Exchange ───
  push('## 4. Upbit 거래소 온체인 흐름');
  push();
  if (stats.upbitTotalInflow != null) {
    const upbitPeriod = (stats.upbitFirstDate && stats.upbitLastDate)
      ? ` (${stats.upbitFirstDate} ~ ${stats.upbitLastDate})`
      : '';
    push(`> 온체인 → Upbit 지갑 = 유입, Upbit 지갑 → 온체인 = 유출${upbitPeriod}`);
    push();
    push(`- **유입 (온체인 → Upbit)**: ${fmt(stats.upbitTotalInflow, 0)} TON`);
    push(`- **유출 (Upbit → 온체인)**: ${fmt(Math.abs(stats.upbitTotalOutflow), 0)} TON`);
    push(`- **순유입**: ${fmt(stats.upbitNetFlow, 0)} TON`);
  }
  push();
  push('---');
  push();

  // ─── Top Holders ───
  push('## 5. Top 10 TON 홀더');
  push();
  if (stats.topHolders?.length) {
    const totalSupply = stats.totalSupply || 0;
    push('| 순위 | 주소/이름 | 보유량 (TON) | 비중 |');
    push('|------:|-----------|-------------:|-----:|');
    stats.topHolders.forEach((h, i) => {
      const name = h.holder_name_or_address || h.address || 'Unknown';
      const balance = Number(h.total_balance) || 0;
      const pct = totalSupply > 0 ? ((balance / totalSupply) * 100).toFixed(2) + '%' : 'N/A';
      push(`| ${i + 1} | ${name} | ${fmt(balance, 0)} | ${pct} |`);
    });
    push();
  }
  push();

  push();

  // ─── Raw Data Summary ───
  push('## 데이터 수집 요약');
  push();
  push('| 쿼리 | 행 수 | 실행 시간 | 상태 |');
  push('|-------|------:|-----------|------|');
  for (const [name, info] of Object.entries(data)) {
    const status = info.error ? `❌ ${info.error.slice(0, 50)}` : '✅';
    const execTime = info.executionEndedAt ? info.executionEndedAt.replace('T', ' ').slice(0, 19) + ' UTC' : 'N/A';
    push(`| ${name} | ${info.rows?.length || 0} | ${execTime} | ${status} |`);
  }
  push();
  push('---');
  push();
  push('> 본 리포트는 Dune Analytics 대시보드(16개 쿼리)의 온체인 데이터를 기반으로 자동 생성되었습니다.');
  push('> 투자 조언이 아닌 데이터 분석 자료입니다.');
  push();

  return lines.join('\n');
}

// ─── Main ───

async function main() {
  console.log(`\n=== Tokamak Network Dune Report Generator ===\n`);

  // 1. Fetch all queries
  const data = await fetchAllQueries();

  // 2. Determine report date from latest query execution time
  const execTimes = Object.values(data)
    .map((d) => d.executionEndedAt)
    .filter(Boolean)
    .sort();

  const latestExecTime = execTimes.length > 0 ? execTimes[execTimes.length - 1] : null;
  const reportDate = latestExecTime
    ? latestExecTime.slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const executionTime = latestExecTime
    ? latestExecTime.replace('T', ' ').slice(0, 19) + ' UTC'
    : 'N/A';

  console.log(`\nLatest query execution: ${executionTime}`);
  console.log(`Report date (from execution): ${reportDate}`);

  // 3. Calculate statistics
  console.log('Calculating statistics...');
  const stats = calculateStats(data);

  // 4. Generate report
  console.log('Generating report...');
  const report = generateReport(stats, data, reportDate, executionTime);

  // 5. Write to docs/dune_report/DUNE_REPORT_YYYY-MM-DD.md
  const reportDir = join(__dirname, 'docs', 'dune_report');
  mkdirSync(reportDir, { recursive: true });

  const reportPath = join(reportDir, `DUNE_REPORT_${reportDate}.md`);
  writeFileSync(reportPath, report, 'utf-8');

  console.log(`\n✅ Report generated: ${reportPath}`);
  console.log(`   ${report.split('\n').length} lines written`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
