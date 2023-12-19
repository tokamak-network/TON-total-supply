// used https://docs.alchemy.com/docs/sdk-developer-challenge-guide-4 as a reference
const { Alchemy, Network, Utils, BigNumber } = require("alchemy-sdk");
require("dotenv").config();
const Moralis = require("moralis").default;
const fs = require("fs");

const config = {
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
};
const alchemy = new Alchemy(config);

const burnedTON = async (Block1, Block2) => {
  //Event collection
  const TONContractAddress =
    "0x2be5e8c109e2197D077D13A82dAead6a9b3433C5";

  const TONABI = [{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"}],"name":"MinterAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"}],"name":"MinterRemoved","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"constant":false,"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"addMinter","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"approveAndCall","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"callbackEnabled","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"bool","name":"_callbackEnabled","type":"bool"}],"name":"enableCallback","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"isMinter","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"isOwner","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"mint","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"target","type":"address"}],"name":"renounceMinter","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"renounceMinter","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"target","type":"address"}],"name":"renounceOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"renounceOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"target","type":"address"}],"name":"renouncePauser","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"seigManager","outputs":[{"internalType":"contract SeigManagerI","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"contract SeigManagerI","name":"_seigManager","type":"address"}],"name":"setSeigManager","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"target","type":"address"},{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}]

  const TON_INTERFACE = new Utils.Interface(TONABI);
  const TON_CREATED_TOPICS = TON_INTERFACE.encodeFilterTopics(
    "Transfer",
    [null,"0x0000000000000000000000000000000000000001"]
  );
  
  var startBlock = Math.min(Math.max(10643305, Block1 + 1)); // 10643305 block -> earliest block number for record | 10643261 block -> TON contract deployment https://etherscan.io/tx/0x2d66feb7bdaba9f5b2c22e8ec4bfa7b012b2ff655bd93017df203d49747565b2
  if (Block1 == 10643305) {
    startBlock = 10643305;
  }
  const endBlock = Block2; 

  //alchemy
  const logs = await alchemy.core.getLogs({
    fromBlock: "0x" + startBlock.toString(16),
    toBlock: "0x" + endBlock.toString(16),
    address: TONContractAddress,
    topics: TON_CREATED_TOPICS,
  });

  let logsLength = logs.length;
  let burned = 0;
  for (let i = 0; i < logsLength; i++) {
    //burned amount
    let burnedAmount = 0;
      burnedAmount = logs[i].data;
      burned = burned + parseInt(burnedAmount, 16);
  }
  return burned/ 10 ** 18;
};

const updateCSV = async () => {
  try {
    if (!Moralis.Core.isStarted) {
    await Moralis.start({
      apiKey: process.env.MORALIS_API_KEY,
    });
  }
    let lastBlock = await alchemy.core.getBlock();
    let lastUnix_timestamp = lastBlock.timestamp;

    // Get relevant blocks based on the last block //list of unix epoch time based on https://docs.google.com/spreadsheets/d/1-4dT3nS4q7RwLgGI6rQ7M1hPx9XHI-Ryw1rkBCvTdcs/edit#gid=681869004 (use https://delim.co/# for comma)
    let unixEpochTimeList = fs.readFileSync("./data/unixEpochTimeList.csv").toString('utf-8').split(',').map(Number);
    let blockNumberList = [];
    let completeList = [];
    let burnedTONList = [];
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

    blockNumberList.unshift(blockNumberList[0]); //adds dummy data for the first entry
    for (let i = 0; i < blockNumberList.length - 1; i++) {
      console.log("........................");
      console.log(
        "Alchemy API data retrieval:",
        i + 1,
        "/",
        blockNumberList.length - 1
      );
      burnedTONList[i] = await burnedTON(
        blockNumberList[i],
        blockNumberList[i + 1]
      );
    }
    for (let i = 0; i < blockNumberList.length - 1; i++) {
      completeList.push([blockNumberList[i + 1], burnedTONList[i]]);
    }
    console.log("blockNumber burnedTON:", completeList);

    // write the output
    const fileName =
      "data/block_" +
      blockNumberList[blockNumberList.length - 1].toString() +
      "_burnedTON.csv";

      const header = "Block number, Burned TON"; // Add the header
      const data = completeList.map(([blockNumber, reducedTON]) => `${blockNumber}, ${reducedTON}`).join("\n"); // Format the data
  
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
module.exports = {
    burnedTON,
};