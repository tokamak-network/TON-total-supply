// reference material: https://docs.alchemy.com/docs/how-to-get-erc-20-token-balance-at-a-given-block
const { Alchemy, Network, Utils, BigNumber } = require("alchemy-sdk");
const ethers = require("ethers");
require("dotenv").config();
const Moralis = require("moralis").default;
const fs = require("fs");

const config = {
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
};

const alchemy = new Alchemy(config);

const stakedTON = async (targetBlockNumber) => {
  // autoCoinageOld for all layers
  const contractAutoCoinage = "0x6FC20Ca22E67aAb397Adb977F092245525f7AeEf";
  const numDecimals = 27;

  // autoCoinagenew for all layers
  const contractAutoCoinagePatched =
    "0x47e264ea9b229368aa90c331D3f4CBe0b4c0f01d";

  // ABI
  let abi1 = ["function totalSupply()"];

  // Create function call data -- eth_call
  let iface1 = new ethers.Interface(abi1);
  let data1 = iface1.encodeFunctionData("totalSupply");
  let data2 = iface1.encodeFunctionData("totalSupply");

 
  // Get balance at a particular block -- usage of eth_call
  let stakedTON = [];
  if (targetBlockNumber < 10839649) {
    //first update seignorage block @ 10839649 https://etherscan.io/tx/0x7c02b858b11c9a18973b013d986bc738709569071b5f940fc81048bb009bbc62
    stakedTON = 0;
  } else if (targetBlockNumber < 18417894) {
    //block 18417894 -> Patched block number based on last update seignorage https://etherscan.io/tx/0x71928a3333bac22acc1d1bc0f5bec485af2f89d6f06d350d621f8a6aa3ec5031
    stakedTON = await alchemy.core.call(
      {
        to: contractAutoCoinage,
        data: data1,
      },
      targetBlockNumber
    );
  } else {
    stakedTON = await alchemy.core.call(
      {
        to: contractAutoCoinagePatched,
        data: data2,
      },
      targetBlockNumber
    );
  }

  /*  // result in console
   block time
  let block = await alchemy.core.getBlock(targetBlockNumber);
  let unix_timestamp = block.timestamp;
  var date = new Date(unix_timestamp * 1000);
  
  console.log(
    "At block time (block number):",
    date,
    "(",
    targetBlockNumber,
    ")"
  );
  console.log(
    "(W)TON Staked:",
    parseInt(stakedTON) / 10 ** numDecimals,
    "(W)TON"
  );
  console.log("........................");
  */
  formatedStaked = stakedTON / 10 ** numDecimals;
  return formatedStaked;
};

const updateCSV = async () => {
  try {
    let lastBlock = await alchemy.core.getBlock();
    let lastBlockNumber = lastBlock.number;
    let lastUnix_timestamp = lastBlock.timestamp;
    var lastDate = new Date(lastUnix_timestamp * 1000);

    if (!Moralis.Core.isStarted) {
    await Moralis.start({
      apiKey: process.env.MORALIS_API_KEY,
    });
  }

    // Get relevant blocks based on the last block //list of unix epoch time based on https://docs.google.com/spreadsheets/d/1-4dT3nS4q7RwLgGI6rQ7M1hPx9XHI-Ryw1rkBCvTdcs/edit#gid=681869004 (use https://delim.co/# for comma)
    let unixEpochTimeList = fs.readFileSync("./data/unixEpochTimeList.csv").toString('utf-8').split(',').map(Number);

    let blockNumberList = [];
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

    // write the output
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
 

    process.exit(0);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};
updateCSV();
module.exports = {
  stakedTON,
};