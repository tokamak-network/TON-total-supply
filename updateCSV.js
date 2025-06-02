/**
 * INCREMENTAL UPDATE VERSION:
 * This script updates CSV files incrementally by checking existing data
 * and only fetching new data points since the last update.
 * This reduces API calls from ~60 to 1-2 for typical updates.
 */

/**
 * This script updates and generates CSV files for different metrics related to TON (Tokamak Network) supply.
 * It retrieves data using the Alchemy API and writes the output to CSV files.
 * The metrics include burned TON, locked TON, burned seignorage, and reduced seignorage.
 * The script iterates over a list of block numbers and calculates the corresponding metrics for each block.
 * The output CSV files are named based on the block number and the specific metric.
 * The script uses the `fs` module to write the CSV files.
 * If an error occurs during the execution of the script, it will be logged to the console and the process will exit with a non-zero status code.
 */

// Rest of the code...
// used https://docs.alchemy.com/docs/sdk-developer-challenge-guide-4 as a reference
const { Alchemy, Network, Utils, BigNumber } = require("alchemy-sdk");
require("dotenv").config();
const Moralis = require("moralis").default;
const fs = require("fs");
const reducedSeignorage = require("./reducedSeignorage");
const stakedTON = require("./stakedTON");
const burnedSeignorage = require("./burnedSeignorage");
const burnedTON = require("./burnedTON");
const lockedTON = require("./lockedTON");

const config = {
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
};
const alchemy = new Alchemy(config);

// Helper function to get last timestamp from existing data
const getLastTimestamp = (fileName) => {
  try {
    if (fs.existsSync(fileName)) {
      const data = fs.readFileSync(fileName, "utf-8");
      const lines = data.trim().split("\n");
      if (lines.length > 1) {
        const lastLine = lines[lines.length - 1];
        const timestamp = parseInt(lastLine.split(",")[0]);
        return timestamp;
      }
    }
    return 0;
  } catch (error) {
    console.log(`No existing data found for ${fileName}, starting fresh`);
    return 0;
  }
};

// Helper function to get last block number from existing data
const getLastBlockNumber = (fileName) => {
  try {
    if (fs.existsSync(fileName)) {
      const data = fs.readFileSync(fileName, "utf-8");
      const lines = data.trim().split("\n");
      if (lines.length > 1) {
        const lastLine = lines[lines.length - 1];
        const blockNumber = parseInt(lastLine.split(",")[0]);
        return blockNumber;
      }
    }
    return 0;
  } catch (error) {
    console.log(`No existing data found for ${fileName}, starting fresh`);
    return 0;
  }
};

// Helper function to append data to CSV
const appendToCSV = (fileName, header, newData) => {
  let output;
  if (fs.existsSync(fileName)) {
    // File exists, append new data
    const newLines = newData.map(row => row.join(", ")).join("\n");
    if (newLines) {
      output = "\n" + newLines;
      fs.appendFileSync(fileName, output);
    }
  } else {
    // File doesn't exist, create with header
    const allLines = newData.map(row => row.join(", ")).join("\n");
    output = `${header}\n${allLines}`;
    fs.writeFileSync(fileName, output);
  }
};

// updates all csv
const updateCSV = async () => {
  try {
    if (!Moralis.Core.isStarted) {
      await Moralis.start({
        apiKey: process.env.MORALIS_API_KEY,
      });
    }
    let lastBlock = await alchemy.core.getBlock();
    let lastUnix_timestamp = lastBlock.timestamp;
    let lastBlockNumber = lastBlock.number;
    var lastDate = new Date(lastUnix_timestamp * 1000);

    // Get full time list
    let unixEpochTimeList = fs
      .readFileSync("./data/unixEpochTimeList.csv")
      .toString("utf-8")
      .split(",")
      .map(Number);

    // 🔍 CHECK EXISTING DATA - Get last processed timestamp
    const lastStoredTimestamp = getLastTimestamp("./data/blockNumber_column_F.csv");
    console.log(`📊 Last stored timestamp: ${lastStoredTimestamp} (${lastStoredTimestamp ? new Date(lastStoredTimestamp * 1000).toISOString() : 'none'})`);

    // 🎯 FILTER: Only process new timestamps
    const newTimestamps = unixEpochTimeList.filter(timestamp =>
      timestamp > lastStoredTimestamp && timestamp <= lastUnix_timestamp
    );

    console.log(`🚀 Total timestamps: ${unixEpochTimeList.length}`);
    console.log(`✅ Already processed: ${unixEpochTimeList.length - newTimestamps.length}`);
    console.log(`🔄 New timestamps to process: ${newTimestamps.length}`);

    if (newTimestamps.length === 0) {
      console.log("🎉 No new data to process! All timestamps are up to date.");
      console.log(`Current block: ${lastBlockNumber}`);
      console.log(`Current time: ${lastDate}`);
      return;
    }

    // Process only new timestamps
    let newBlockNumberData = [];
    let newBlockNumberList = [];

    for (let i = 0; i < newTimestamps.length; i++) {
      console.log("........................");
      console.log(
        "🔄 Moralis API data retrieval:",
        i + 1,
        "/",
        newTimestamps.length,
        `(NEW data only)`
      );

      const formatedDate = new Date(newTimestamps[i] * 1000);
      const response = await Moralis.EvmApi.block.getDateToBlock({
        chain: "0x1",
        date: formatedDate,
      });
      newBlockNumberList.push(response.raw.block);
      newBlockNumberData.push([newTimestamps[i], response.raw.block]);
    }

    // 📝 APPEND new block number data
    if (newBlockNumberData.length > 0) {
      appendToCSV(
        "data/blockNumber_column_F.csv",
        "Unix Epoch time, Block number",
        newBlockNumberData
      );
      console.log(`✅ Added ${newBlockNumberData.length} new block numbers`);
    }

    // 🔍 GET ALL BLOCK NUMBERS for event-based data (needed for range queries)
    let allBlockNumbers = [];
    if (fs.existsSync("./data/blockNumber_column_F.csv")) {
      const blockData = fs.readFileSync("./data/blockNumber_column_F.csv", "utf-8");
      const lines = blockData.trim().split("\n").slice(1); // Skip header
      allBlockNumbers = lines.map(line => parseInt(line.split(",")[1]));
    }

    ///
    /// 1. UPDATE STAKED TON (only new block numbers)
    ///
    if (newBlockNumberList.length > 0) {
      console.log("🔄 Processing new staked TON data...");
      let newStakedTONData = [];

      for (let i = 0; i < newBlockNumberList.length; i++) {
        console.log("........................");
        console.log(
          "⚡ Alchemy API data retrieval:",
          i + 1,
          "/",
          newBlockNumberList.length,
          "(NEW staking data)"
        );
        const stakedAmount = await stakedTON.stakedTON(newBlockNumberList[i]);
        newStakedTONData.push([newBlockNumberList[i], stakedAmount]);
      }

      appendToCSV(
        "data/stakedTON_column_Y.csv",
        "Block number, Staked (W)TON",
        newStakedTONData
      );
      console.log(`✅ Added ${newStakedTONData.length} new staking records`);
    }

    ///
    /// 2-5. UPDATE EVENT-BASED DATA (burned, locked, seignorage)
    /// Only process new block ranges
    ///
    if (newBlockNumberList.length > 0) {
      console.log("🔄 Processing new event-based data...");

      // Get last processed block for events
      const lastEventBlock = getLastBlockNumber("data/burnedTON_column_J.csv");
      console.log(`📊 Last processed event block: ${lastEventBlock}`);

      // Create event block ranges - only new ones
      let eventBlockRanges = [];
      const startBlock = lastEventBlock || 10643261; // TON deployment block

      for (let i = 0; i < newBlockNumberList.length; i++) {
        eventBlockRanges.push({
          startBlock: i === 0 ? startBlock : newBlockNumberList[i - 1],
          endBlock: newBlockNumberList[i]
        });
      }

      console.log(`🎯 Processing ${eventBlockRanges.length} new block ranges for events`);

      let newBurnedTONData = [];
      let newLockedTONData = [];
      let newBurnedSeignorageData = [];
      let newReducedSeignorageData = [];

      for (let i = 0; i < eventBlockRanges.length; i++) {
        const range = eventBlockRanges[i];
        console.log(`🔥 Processing range ${i + 1}/${eventBlockRanges.length}: blocks ${range.startBlock + 1} to ${range.endBlock}`);

        // Process all event types for this range
        const [burnedAmount, [lockedAmount, spentAmount], burnedSeigAmount, reducedSeigAmount] = await Promise.all([
          burnedTON.burnedTON(range.startBlock + 1, range.endBlock),
          lockedTON.lockedTON(range.startBlock + 1, range.endBlock),
          burnedSeignorage.burnedSeignorage(range.startBlock + 1, range.endBlock),
          reducedSeignorage.reducedSeignorage(range.startBlock + 1, range.endBlock)
        ]);

        newBurnedTONData.push([range.endBlock, burnedAmount]);
        newLockedTONData.push([range.endBlock, lockedAmount, spentAmount]);
        newBurnedSeignorageData.push([range.endBlock, burnedSeigAmount]);
        newReducedSeignorageData.push([range.endBlock, reducedSeigAmount]);
      }

      // Append all new event data
      if (newBurnedTONData.length > 0) {
        appendToCSV("data/burnedTON_column_J.csv", "Block number, Burned TON", newBurnedTONData);
        console.log(`✅ Added ${newBurnedTONData.length} new burned TON records`);
      }

      if (newLockedTONData.length > 0) {
        appendToCSV("data/lockedTON+spentTON_column_V+W.csv", "Block number, Locked TON, Spent TON", newLockedTONData);
        console.log(`✅ Added ${newLockedTONData.length} new locked TON records`);
      }

      if (newBurnedSeignorageData.length > 0) {
        appendToCSV("data/burnedSeigSWTON.csv", "Block number, Burned SWTON seignorage", newBurnedSeignorageData);
        console.log(`✅ Added ${newBurnedSeignorageData.length} new burned seignorage records`);
      }

      if (newReducedSeignorageData.length > 0) {
        appendToCSV("data/reducedSeigTON_column_H.csv", "Block number, Reduced seignorage", newReducedSeignorageData);
        console.log(`✅ Added ${newReducedSeignorageData.length} new reduced seignorage records`);
      }
    }

    // Current status
    let currentStakedTON = await stakedTON.stakedTON(lastBlockNumber);
    console.log("\n🎉 INCREMENTAL UPDATE COMPLETE!");
    console.log(`📊 Processed ${newTimestamps.length} new timestamps`);
    console.log(`💰 API calls saved: ~${(unixEpochTimeList.length - newTimestamps.length) * 5} calls`);
    console.log("\n📈 Current Status:");
    console.log(`Block: ${lastBlockNumber}`);
    console.log(`Date: ${lastDate}`);
    console.log(`Staked: ${currentStakedTON} TON`);

    process.exit(0);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

module.exports = {
  updateCSV,
};