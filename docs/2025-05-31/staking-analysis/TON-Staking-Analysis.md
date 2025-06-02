# TON (Tokamak Network) Staking Ecosystem Analysis Report

**Analysis Date: May 31, 2025** 🔄
**Analysis Period: August 2020 ~ May 2025** 🔄
**Data Points: 60 time-series measurements** 🔄

---

## 📋 Executive Summary

This report provides a quantitative analysis of Tokamak Network's staking ecosystem using 4.75 years of actual on-chain data.

### Key Metrics (as of May 2025) 🔄
- **Current Staking Scale**: 24,225,901 TON (50.6% of total supply) 🔄
- **Staking Growth Rate**: 311.1% annual CAGR 🔄 → [View Calculation Method](./TON-Staking-CAGR-Calculation.md)
- **Network Maturity Index**: 83.4% 🔄 → [View Calculation Method](./TON-Staking-CAGR-Calculation.md)
- **Total Growth Multiple**: 783.9x (over 4.75 years) 🔄

---

## 🎯 1. Staking Mechanism and Structure

### Tokamak Network Staking System

#### Layer 2 Rollup-based Staking
Tokamak Network operates as an Ethereum Layer 2 rollup solution with a seigniorage-based staking reward system.

**Key Features:**
- **Dual Token System**: Utilizing TON and WTON
- **Seigniorage Rewards**: Incentives through new issuance ([TON Staking V2](https://github.com/tokamak-network/ton-staking-v2/blob/ton-staking-v2/docs/en/ton-staking-v2.md) reference)
- **Two Participation Methods**: Direct staking (operators) / Delegated staking (general users)

**✅ Delegated Staking Verification**: Currently operational at [simple.staking.tokamak.network](https://simple.staking.tokamak.network)

#### Staking Contract Structure
```
SeigManager (0x710936500aC59e8551331871Cbad3D33d5e0D909)
├── Seigniorage distribution management
├── AutoCoinage (legacy): Blocks 10839649 ~ 18417894
├── AutoCoinage (patched): After block 18417894
└── Individual operator Coinage contracts
```

### Seigniorage Mechanism (Based on Actual Data)

#### Reduced Seigniorage
- **Active Period**: Early 2021 (blocks 12,402,184 ~ 13,558,613)
- **Maximum Reduction**: 32,765 TON
- **Current Status**: 0 TON since 2021 (policy change)

#### Burned Seigniorage
- **Continuous Burning**: From 2020 to present
- **Initial Burn Amount**: Hundreds to thousands of TON per month
- **Recent Burn Amount**: Stabilized at tens of TON per month
- **Purpose**: Inflation control

---

## 📊 2. Staking Growth Analysis

### Quantitative Growth 🔄
- **Initial Staking Amount** (September 2020): 30,904 TON
- **Current Staking Amount** (May 2025): 24,225,901 TON 🔄
- **Growth Multiple**: 783.9x 🔄
- **Compound Annual Growth Rate**: 311.1% 🔄

### Network Maturity Index: 83.4% 🔄
**Calculation Formula**: `Staking Ratio + DAO Lock Ratio` (based on initial supply of 50M TON)

- Staked TON: 24,225,901 TON → 48.5% 🔄
- DAO Locked TON: 17,458,010 TON → 34.9%
- **Total Maturity**: 48.5% + 34.9% = **83.4%** 🔄

**Maturity Stage**: Above 80% indicates fully mature stage 💎

---

## ⚠️ 3. Risk Factors

### Technical Risks
- **Smart Contract Risk**: 2022 AutoCoinage patch case study
- **Centralization Risk**: Potential concentration of large stakers

### Economic Risks
- **Market Volatility**: Token price fluctuations affecting staking incentives
- **Competitive Services**: Yield competition with other DeFi services

---

## 🔍 4. Conclusion

### Verified Performance 🔄
Tokamak Network's staking ecosystem achieved the following over 4.75 years:

1. **783.9x Staking Amount Increase**: 30,904 TON → 24,225,901 TON 🔄
2. **High Network Participation Rate**: 50.6% of total supply staked 🔄
3. **Stable Seigniorage System**: Continuous reward distribution and inflation control
4. **Practical Delegated Staking**: Accessible structure for general users

### Limitations and Considerations
- High growth rate due to low initial base
- Includes overall cryptocurrency market growth effects
- Future growth rates expected to gradually decelerate

---

## 📚 References and Disclaimer

### Data Sources
- `stakedTON_column_Y.csv` - On-chain staking time-series data
- `blockNumber_column_F.csv` - Block-time mapping data
- `lockedTON+spentTON_column_V+W.csv` - DAO lock data
- `reducedSeigTON_column_H.csv` - Reduced seigniorage data
- `burnedSeigSWTON.csv` - Burned seigniorage data

### Analysis Methodology 🔄
- Utilized 60 time-series data points over 4.75 years 🔄
- Applied standard CAGR formula
- All calculation processes transparently disclosed

### Disclaimer 🔄
- This analysis is based on data up to May 2025 🔄
- Future projections are estimates based on historical data
- Additional research and expert consultation recommended for investment decisions

---

*All figures in this report are based on publicly available on-chain data and are verifiable.*