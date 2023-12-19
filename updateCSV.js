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
      .readFileSync("./data/unixEpochTimeList.csv")
      .toString("utf-8")
      .split(",")
      .map(Number);

    let blockNumberList = [];
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
      }
    }



    console.log("blockNumberList:",blockNumberList);
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
    let fileName =
      "data/block_" +
      blockNumberList[blockNumberList.length - 1].toString() +
      "_stakedTON.csv";
    let header = "Block number, Staked (W)TON"; // Add the header
    let data = completeList
      .map(([blockNumber, stakedTON]) => `${blockNumber}, ${stakedTON}`)
      .join("\n"); // Format the data

    let output = `${header}\n${data}`; // Combine the header and data
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
    blockNumberListEvents.unshift(blockNumberListEvents[0]); //adds dummy data for the first entry for events based blocks
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
      "data/block_" +
      blockNumberListEvents[blockNumberListEvents.length - 1].toString() +
      "_burnedTON.csv";

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
      "data/block_" +
      blockNumberListEvents[blockNumberListEvents.length - 1].toString() +
      "_lockedTON.csv";

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
      "data/block_" +
      blockNumberListEvents[blockNumberListEvents.length - 1].toString() +
      "_burnedSeigTON.csv";

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
      "data/block_" +
      blockNumberListEvents[blockNumberListEvents.length - 1].toString() +
      "_reducedSeigTON.csv";

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