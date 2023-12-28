/**
 * This script updates and generates CSV files for different metrics related to TON (Telegram Open Network) supply.
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

    // Get relevant blocks based on the last block //list of unix epoch time based on https://docs.google.com/spreadsheets/d/1-4dT3nS4q7RwLgGI6rQ7M1hPx9XHI-Ryw1rkBCvTdcs/edit#gid=681869004 (use https://delim.co/# for comma)
    let unixEpochTimeList = fs
      .readFileSync("./data/upbit/unixEpochTimeListUpbit.csv")
      .toString("utf-8")
      .split(",")
      .map(Number);

    let blockNumberList = [];
    let completeList2 =[];
    for (let i = 0; i < unixEpochTimeList.length; i++) {
      console.log("........................");
      console.log(
        "Moralis API data retrieval:",
        i + 1,
        "/",
        unixEpochTimeList.length
      );
      if (unixEpochTimeList[i] <= lastUnix_timestamp) {
        const formatedDate = new Date(unixEpochTimeList[i] * 1000);
        const response = await Moralis.EvmApi.block.getDateToBlock({
          chain: "0x1",
          date: formatedDate,
        });
        blockNumberList.push(response.raw.block);
        completeList2.push([unixEpochTimeList[i], response.raw.block]);
      }
    }

    ///
    /// 0. block number
    ///
    // write the output
    let fileName =
      "data/upbit/blockNumber_column_F.csv";

    let header = "Unix Epoch time, Block number"; // Add the header
    let data = completeList2.map(([unixEpochTime, blockNumber]) => `${unixEpochTime}, ${blockNumber}`).join("\n"); // Format the data
  
    let output = `${header}\n${data}`; // Combine the header and data
      fs.writeFileSync(fileName, output, function (err) {
        if (err) {
          return console.log(err);
        }
        console.log("The file was saved!");
      });
    ///
    /// End update block number
    ///


    ///
    /// 1. Begin update stakedTON
    ///
    let stakedTONList = [];
    let completeList = [];

    for (let i = 0; i < blockNumberList.length; i++) {
      console.log("........................");
      console.log(
        "Alchemy API data retrieval:",
        i + 1,
        "/",
        blockNumberList.length
      );
      stakedTONList[i] = await stakedTON.stakedTON(blockNumberList[i]);
      completeList.push([blockNumberList[i], stakedTONList[i]]);
    }

    //write the output
    fileName =
      "data/upbit/stakedTON_column_Z.csv";
    header = "Block number, Staked (W)TON"; // Add the header
    data = completeList
      .map(([blockNumber, stakedTON]) => `${blockNumber}, ${stakedTON}`)
      .join("\n"); // Format the data

    output = `${header}\n${data}`; // Combine the header and data
    fs.writeFileSync(fileName, output, function (err) {
      if (err) {
        return console.log(err);
      }
      console.log("The file was saved!");
    });

    //Current block
    currentStakedTON = await stakedTON.stakedTON(lastBlockNumber);
    console.log("........................");
    console.log("......Current Staked TON......");
    console.log("Current block number:", lastBlockNumber);
    console.log("Current block time:", lastDate);
    console.log("(W)TON Staked:", currentStakedTON, "(W)TON");

    //Result summary
    console.log("........................");
    console.log("......Raw Data......");
    console.log("[blockNumber stakedTON]:", completeList);

    ///
    /// End update stakedTON
    ///
    ///
    /// 2. Begin update burnedTON
    ///
    let blockNumberListEvents = blockNumberList;
    blockNumberListEvents.unshift(10643261); // block number is based on Tokamak Network TON contract deployment: https://etherscan.io/tx/0x2d66feb7bdaba9f5b2c22e8ec4bfa7b012b2ff655bd93017df203d49747565b2
    console.log("blockNumberListEvents:",blockNumberListEvents);
    
    completeList = [];
    let burnedTONList = [];
    for (let i = 0; i < blockNumberListEvents.length - 1; i++) {
      console.log("........................");
      console.log(
        "Alchemy API data retrieval:",
        i + 1,
        "/",
        blockNumberListEvents.length - 1
      );
      burnedTONList[i] = await burnedTON.burnedTON(
        blockNumberListEvents[i],
        blockNumberListEvents[i + 1]
      );
    }
    for (let i = 0; i < blockNumberListEvents.length - 1; i++) {
      completeList.push([blockNumberListEvents[i + 1], burnedTONList[i]]);
    }
    console.log("blockNumber burnedTON:", completeList);

    // write the output
    fileName =
      "data/upbit/burnedTON_column_K";

    header = "Block number, Burned TON"; // Add the header
    data = completeList
      .map(([blockNumber, reducedTON]) => `${blockNumber}, ${reducedTON}`)
      .join("\n"); // Format the data

    output = `${header}\n${data}`; // Combine the header and data
    fs.writeFileSync(fileName, output, function (err) {
      if (err) {
        return console.log(err);
      }
      console.log("The file was saved!");
    });
    ///
    /// End update burnedTON
    ///

    ///
    /// 3. Begin update lockedTON
    ///
    completeList = [];
    let lockedTONList = [];
    let spentTONList = [];
    for (let i = 0; i < blockNumberListEvents.length - 1; i++) {
      console.log("........................");
      console.log(
        "Alchemy API data retrieval:",
        i + 1,
        "/",
        blockNumberListEvents.length - 1
      );
      [lockedTONList[i], spentTONList[i]] = await lockedTON.lockedTON(
        blockNumberListEvents[i],
        blockNumberListEvents[i + 1]
      );
    }
    for (let i = 0; i < blockNumberListEvents.length - 1; i++) {
      completeList.push([
        blockNumberListEvents[i + 1],
        lockedTONList[i],
        spentTONList[i],
      ]);
    }
    console.log("blockNumber lockedTON spentTON:", completeList);

    // write the output
    fileName =
      "data/upbit/lockedTON_column_W.csv";

    header = "Block number, Locked TON, Spent TON"; // Add the header
    data = completeList
      .map(
        ([blockNumber, lockedTON, spentTON]) =>
          `${blockNumber}, ${lockedTON}, ${spentTON}`
      )
      .join("\n"); // Format the data

    output = `${header}\n${data}`; // Combine the header and data
    fs.writeFileSync(fileName, output, function (err) {
      if (err) {
        return console.log(err);
      }
      console.log("The file was saved!");
    });

    ///
    /// End update lockedTON
    ///

    ///
    /// 4. Begin update burnedSeignorage
    ///
    completeList = [];
    let burnedSeignorageList = [];
    for (let i = 0; i < blockNumberListEvents.length - 1; i++) {
      console.log("........................");
      console.log(
        "Alchemy API data retrieval:",
        i + 1,
        "/",
        blockNumberListEvents.length - 1
      );
      burnedSeignorageList[i] = await burnedSeignorage.burnedSeignorage(
        blockNumberListEvents[i],
        blockNumberListEvents[i + 1]
      );
    }
    for (let i = 0; i < blockNumberListEvents.length - 1; i++) {
      completeList.push([blockNumberListEvents[i + 1], burnedSeignorageList[i]]);
    }
    console.log("blockNumber burnedSeig:", completeList);

    // write the output
    fileName =
      "data/upbit/burnedSeigTON_column_H.csv";

    header = "Block number, Burned seignorage"; // Add the header
    data = completeList
      .map(([blockNumber, burnedTON]) => `${blockNumber}, ${burnedTON}`)
      .join("\n"); // Format the data

    output = `${header}\n${data}`; // Combine the header and data
    fs.writeFileSync(fileName, output, function (err) {
      if (err) {
        return console.log(err);
      }
      console.log("The file was saved!");
    });
    ///
    /// End update burnedSeignorage
    ///

    ///
    /// 5. Begin update reducedSeignorage
    ///
    completeList = [];
    let reducedTONList = [];
    for (let i = 0; i < blockNumberListEvents.length - 1; i++) {
      console.log("........................");
      console.log(
        "Alchemy API data retrieval:",
        i + 1,
        "/",
        blockNumberListEvents.length - 1
      );
      reducedTONList[i] = await reducedSeignorage.reducedSeignorage(
        blockNumberListEvents[i],
        blockNumberListEvents[i + 1]
      );
    }
    for (let i = 0; i < blockNumberListEvents.length - 1; i++) {
      completeList.push([blockNumberListEvents[i + 1], reducedTONList[i]]);
    }
    console.log("blockNumber reducedSeig:", completeList);

    // write the output
    fileName =
      "data/upbit/reducedSeigTON_column_I.csv";

      header = "Block number, Reduced seignorage"; // Add the header
      data = completeList.map(([blockNumber, reducedTON]) => `${blockNumber}, ${reducedTON}`).join("\n"); // Format the data
  
      output = `${header}\n${data}`; // Combine the header and data
      fs.writeFileSync(fileName, output, function (err) {
        if (err) {
          return console.log(err);
        }
        console.log("The file was saved!");
      });
    ///
    /// End update reducedSeignorage
    ///

      process.exit(0);
    } catch (error) {
      console.log(error);
      process.exit(1);
    }
};

module.exports = {
  updateCSV,
};