// used https://docs.alchemy.com/docs/sdk-developer-challenge-guide-4 as a reference
const { Alchemy, Network, Utils, BigNumber } = require("alchemy-sdk");
require("dotenv").config();
const Moralis = require("moralis").default;
const fs = require("fs");
const reducedSeignorage = require('./reducedSeignorage');
const stakedTON = require('./stakedTON');
const burnedSeignorage = require('./burnedSeignorage');

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

      blockNumberListEvents = blockNumberList;
      blockNumberListEvents.unshift(blockNumberListEvents[0]); //adds dummy data for the first entry

      ///
      /// update stakedTON 
      ///
      let stakedTONList = [];
      let completeList = [];
      for (let i = 0; i < unixEpochTimeList.length; i++) {
        console.log("........................");
        console.log("Moralis API data retrieval:",i+1,"/",unixEpochTimeList.length)
        if (unixEpochTimeList[i] <= lastUnix_timestamp) {
          const formatedDate = new Date(unixEpochTimeList[i] * 1000);
          const response = await Moralis.EvmApi.block.getDateToBlock({
            chain: "0x1",
            date: formatedDate,
          });
          blockNumberList[i] = response.raw.block;
        }
      }
  
      for (let i = 0; i < blockNumberList.length; i++) {
        console.log("........................");
        console.log("Alchemy API data retrieval:",i+1,"/",blockNumberList.length)
        stakedTONList[i] = await stakedTON(blockNumberList[i]);
        completeList.push([blockNumberList[i],stakedTONList[i]]);
      }
  
      //write the output
      const fileName = "data/block_"+blockNumberList[blockNumberList.length-1].toString()+'_stakedTON.csv';
      const header = "Block number, Staked (W)TON"; // Add the header
      const data = completeList.map(([blockNumber, stakedTON]) => `${blockNumber}, ${stakedTON}`).join("\n"); // Format the data
  
      const output = `${header}\n${data}`; // Combine the header and data
      fs.writeFileSync(fileName, output, function (err) {
        if (err) {
          return console.log(err);
        }
        console.log("The file was saved!");
      });
  
      //Current block
      currentStakedTON = await stakedTON(lastBlockNumber);
      console.log("........................");
      console.log("......Current Staked TON......");
      console.log("Current block number:", lastBlockNumber);
      console.log("Current block time:", lastDate);
      console.log("(W)TON Staked:", currentStakedTON, "(W)TON");
  
      //Result summary
      console.log("........................");
      console.log("......Raw Data......");
      console.log("[blockNumber stakedTON]:", completeList);





      let blockNumberList = [];
      let completeList = [];
      let burnedTONList = [];

      blockNumberList.unshift(blockNumberList[0]); //adds dummy data for the first entry
      for (let i = 0; i < blockNumberList.length - 1; i++) {
        console.log("........................");
        console.log(
          "Alchemy API data retrieval:",
          i + 1,
          "/",
          blockNumberList.length - 1
        );
        burnedTONList[i] = await burnedSeignorage(
          blockNumberList[i],
          blockNumberList[i + 1]
        );
      }
      for (let i = 0; i < blockNumberList.length - 1; i++) {
        completeList.push([blockNumberList[i + 1], burnedTONList[i]]);
      }
      console.log("blockNumber burnedSeig:", completeList);
  
      // write the output
      const fileName =
        "data/block_" +
        blockNumberList[blockNumberList.length - 1].toString() +
        "_burnedTONSeig.csv";
  
      const header = "Block number, Burned seignorage"; // Add the header
      const data = completeList
        .map(([blockNumber, burnedTON]) => `${blockNumber}, ${burnedTON}`)
        .join("\n"); // Format the data
  
      const output = `${header}\n${data}`; // Combine the header and data
      fs.writeFileSync(fileName, output, function (err) {
        if (err) {
          return console.log(err);
        }
        console.log("The file was saved!");
      });
  
      process.exit(0);
    } catch (error) {
      console.log(error);
      process.exit(1);
    }
  };


updateCSV();


reducedSeignorage.updateCSV();
stakedTON.updateCSV();
burnedSeignorage.updateCSV();
