# TON (Tokamak Network) Supply Analysis Project Documentation

## 📋 Project Overview

This project is a **JavaScript application that accurately calculates and tracks the total supply and circulating supply of TON (Tokamak Network) tokens**.

### 🎯 Purpose
- Accurate calculation of TON token supply
- Time-series data collection and analysis
- Supply tracking through Google Spreadsheet
- Quantitative analysis of various supply reduction factors

## 🏗️ Project Structure

### 📁 Core Files
```
TON-total-supply/
├── main.js                    # Main execution file (real-time calculation)
├── updateAll.js              # Scheduled updater
├── updateCSV.js              # CSV data update logic
├── updateCSVUpbit.js         # Upbit-specific CSV update
├── utils/
│   └── blockRangeHelper.js   # Block range limitation helper
└── data/                     # Generated CSV data files
```

### 🧮 Calculation Modules
- **`burnedTON.js`** - Calculate TON burned to 0x0000...0001 address
- **`burnedSeignorage.js`** - Calculate seignorage burned due to unstaking
- **`reducedSeignorage.js`** - Calculate PowerTON seignorage reduction due to DAO directive
- **`lockedTON.js`** - Calculate TON locked in DAO vault
- **`stakedTON.js`** - Calculate TON staked in Seigmanager

## 🔧 Technology Stack

### Key Dependencies
```json
{
  "dependencies": {
    "dotenv": "^16.4.7",        // Environment variable management
    "ethers": "^6.13.4",        // Ethereum interaction
    "moralis": "^2.27.2"        // Blockchain API
  },
  "devDependencies": {
    "alchemy-sdk": "^3.5.0"     // Ethereum data retrieval
  }
}
```

### API Services
- **Alchemy SDK** - Ethereum blockchain data retrieval
- **Moralis API** - Unix timestamp → block number conversion

## 📊 TON Supply Calculation Logic

### Basic Calculation Formula

#### Total Supply
```javascript
// 1. Base supply calculation
totalSupply = 50_000_000 + 3.92 * (lastBlockNumber - 10837698)

// 2. Apply reduction factors
totalSupply = totalSupply - burnedTONAmount - reducedSeignorageAmount
```

#### Circulating Supply
```javascript
// General circulating supply (excluding staking)
circulatingSupply = totalSupply - stakedTONAmount - lockedTONAmount

// Upbit circulating supply (including staking)
circulatingSupplyUpbit = totalSupply - lockedTONAmount
```

### 🔥 Supply Reduction Factors

#### 1. Burned TON
- **Target**: TON sent to 0x0000000000000000000000000000000000000001 address
- **Collection Method**: Transfer event log analysis
- **Contract**: TON Token Contract (0x2be5e8c109e2197D077D13A82dAead6a9b3433C5)

#### 2. Burned Seignorage
- **Cause**: Unstaking before seignorage update
- **Collection Event**: totBurnAmount field in UnstakeLog event
- **Contract**: SeigManager (both old and new versions)

#### 3. Reduced Seignorage
- **Cause**: PowerTON seignorage rate reduction from 10% → 5% by DAO directive
- **Detection Condition**: `powertonSeig < unstakedSeig * 8%`
- **Collection Event**: SeigGiven event

#### 4. Locked TON
- **Location**: DAO vault (0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303)
- **Calculation**: Locked TON - Spent TON
- **Collection Method**: Transfer events to DAO vault

#### 5. Staked TON
- **Location**: AutoCoinage contract in SeigManager
- **Feature**: Considers contract changes due to vulnerability patches
- **Breakpoint**: Block 18417894 (patched contract deployment)

## 🚀 `node updateAll.js` Execution Process

### 📈 Detailed Step-by-Step Process

#### 1️⃣ **Initialization and Setup**
```javascript
// Initialize Moralis API
await Moralis.start({ apiKey: process.env.MORALIS_API_KEY });

// Retrieve latest block information
let lastBlock = await alchemy.core.getBlock();
let lastBlockNumber = lastBlock.number;
let lastUnix_timestamp = lastBlock.timestamp;
```

#### 2️⃣ **Loading Time Reference Points**
- **Source**: `data/unixEpochTimeList.csv` (79 time points)
- **Range**: August 12, 2020 ~ Present
- **Frequency**: Approximately monthly + special event points
- **Processing**: Unix timestamp → block number conversion (using Moralis API)

#### 3️⃣ **Block Number Mapping Generation**
```javascript
// Output: data/blockNumber_column_F.csv
// Format: Unix Epoch time, Block number
// Example: 1597211409, 10643261
```

#### 4️⃣ **Staked TON Aggregation**
```javascript
// Calculate staking amount for each time point
for (let i = 0; i < blockNumberList.length; i++) {
  stakedTONList[i] = await stakedTON.stakedTON(blockNumberList[i]);
}
// Output: data/stakedTON_column_Y.csv
```

#### 5️⃣ **Burned TON Aggregation**
```javascript
// Calculate burn amount by period (block range: previous point+1 ~ current point)
for (let i = 0; i < blockNumberListEvents.length - 1; i++) {
  burnedTONList[i] = await burnedTON.burnedTON(
    blockNumberListEvents[i] + 1,
    blockNumberListEvents[i + 1]
  );
}
// Output: data/burnedTON_column_J.csv
```

#### 6️⃣ **DAO Locked/Spent TON Aggregation**
```javascript
// Calculate locked TON and spent TON simultaneously
[lockedTONList[i], spentTONList[i]] = await lockedTON.lockedTON(
  blockNumberListEvents[i] + 1,
  blockNumberListEvents[i + 1]
);
// Output: data/lockedTON+spentTON_column_V+W.csv
```

#### 7️⃣ **Burned Seignorage Aggregation**
```javascript
// Collect totBurnAmount from UnstakeLog events
burnedSeignorageList[i] = await burnedSeignorage.burnedSeignorage(
  blockNumberListEvents[i] + 1,
  blockNumberListEvents[i + 1]
);
// Output: data/burnedSeigSWTON.csv
```

#### 8️⃣ **Reduced Seignorage Aggregation**
```javascript
// Calculate PowerTON seignorage reduction
reducedTONList[i] = await reducedSeignorage.reducedSeignorage(
  blockNumberListEvents[i] + 1,
  blockNumberListEvents[i + 1]
);
// Output: data/reducedSeigTON_column_H.csv
```

### 📊 Generated Data Files

| File Name | Content | Columns | Purpose |
|-----------|---------|---------|---------|
| `blockNumber_column_F.csv` | Time-block mapping | Unix Epoch time, Block number | Time-based tracking |
| `stakedTON_column_Y.csv` | Staking amount | Block number, Staked (W)TON | Circulating supply calculation |
| `burnedTON_column_J.csv` | Burned TON | Block number, Burned TON | Total supply calculation |
| `lockedTON+spentTON_column_V+W.csv` | DAO locked/spent | Block number, Locked TON, Spent TON | Circulating supply calculation |
| `burnedSeigSWTON.csv` | Burned seignorage | Block number, Burned SWTON seignorage | Total supply calculation |
| `reducedSeigTON_column_H.csv` | Reduced seignorage | Block number, Reduced seignorage | Total supply calculation |

## 🔧 Technical Improvements

### 🚫 Resolving eth_getLogs Block Range Limitation

#### Problem
- Alchemy API's eth_getLogs throws error when exceeding 500 blocks
- Constraints when collecting large amounts of historical data

#### Solution: Block Range Helper Function
```javascript
// utils/blockRangeHelper.js
async function getLogsWithRangeLimit(alchemy, startBlock, endBlock, contractAddress, topics) {
  const ranges = splitBlockRange(startBlock, endBlock, 499); // Split into 499-block chunks
  const allLogs = [];

  for (let range of ranges) {
    const logs = await alchemy.core.getLogs({
      fromBlock: "0x" + range.fromBlock.toString(16),
      toBlock: "0x" + range.toBlock.toString(16),
      address: contractAddress,
      topics: topics,
    });
    allLogs.push(...logs);

    // Prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return allLogs;
}
```

#### Applied Files
- ✅ `burnedTON.js`
- ✅ `lockedTON.js`
- ✅ `burnedSeignorage.js`
- ✅ `reducedSeignorage.js`

## 📈 Data Utilization

### Google Spreadsheet Integration
- **Method**: Manual copy/paste
- **Target**: [TON Supply Spreadsheet](https://docs.google.com/spreadsheets/d/1-4dT3nS4q7RwLgGI6rQ7M1hPx9XHI-Ryw1rkBCvTdcs/edit?usp=sharing)
- **Frequency**: Manual updates as needed

### Real-time Calculation (`main.js`)
```javascript
// Immediate calculation based on latest block
console.log("Total Supply for TON is :", totalSupply, "TON");
console.log("Circulating Supply:", circulatingSupply, "TON");
console.log("Circulating Supply (Upbit):", circulatingSupplyUpbit, "TON");
```

## 🛠️ Usage

### Environment Setup
```bash
# 1. Set environment variables
cp .env_example .env
# Set ALCHEMY_API_KEY and MORALIS_API_KEY

# 2. Install dependencies
npm install

# 3. Run real-time calculation
node main.js

# 4. Run historical data update
node updateAll.js
```

### Expected Execution Time
- **`main.js`**: ~30 seconds (latest data only)
- **`updateAll.js`**: ~10-15 minutes (complete 79 time points)

## 📊 Output Examples

### main.js Execution Result
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

## 🔒 Security Considerations

### Environment Variable Protection
- `.env` file excluded from Git tracking
- Excluded from AI indexing via `.cursorignore`
- Prevents API key exposure

### File Exclusion Settings
```
# .gitignore & .cursorignore
.env
.env.local
.env.production
.env.development
node_modules/
.DS_Store
```

## 🚀 Future Improvement Possibilities

1. **Automated Google Sheets API Integration**
2. **Real-time Monitoring Dashboard**
3. **Alert System (for sudden supply changes)**
4. **More Granular Time Interval Data Collection**
5. **GraphQL API Provision**

---

*This document is a comprehensive technical documentation for the TON supply analysis project. Please feel free to contact us with any additional questions or improvement suggestions.*