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
const update = require("./updateCSV");

const config = {
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
};
const alchemy = new Alchemy(config);

const runMain = async () => {
  let startBlock = 10643261; // TON contract deployment https://etherscan.io/tx/0x2d66feb7bdaba9f5b2c22e8ec4bfa7b012b2ff655bd93017df203d49747565b2
  let lastBlock = await alchemy.core.getBlock();
  let lastUnix_timestamp = lastBlock.timestamp;
  let lastBlockNumber = lastBlock.number;
  var lastDate = new Date(lastUnix_timestamp * 1000);

  // Max totalSupply: 50_000_000 TON + 3.92 WTON Seignorage per block
  let totalSupply = 50_000_000 + 3.92 * (lastBlockNumber - 10837698); // 10837698 begin block for seignorage https://etherscan.io/tx/0x4750dd10e22f993cea3052dfc9872ad4d25efa68cb21938ad429dd59b912b8b5

  // Burned TON
  let burnedTONAmount = await burnedTON.burnedTON(startBlock, lastBlockNumber);

  // Burned TON Seignorage
  let burnedSeignorageAmount = await burnedSeignorage.burnedSeignorage(
    startBlock,
    lastBlockNumber
  );

  // Reduced TON Seignorage
  let reducedSeignorageAmount = await reducedSeignorage.reducedSeignorage(
    startBlock,
    lastBlockNumber
  );

  // Locked TON
  [lockedTONAmount, spentTONAmount] = await lockedTON.lockedTON(
    startBlock,
    lastBlockNumber
  );
  lockedTONAmount = lockedTONAmount - spentTONAmount;

  // Staked TON
  stakedTONAmount = await stakedTON.stakedTON(lastBlockNumber);

  console.log("............................................");
  console.log("Current block number:", lastBlockNumber);
  console.log("Current block time:", lastDate);
  console.log("............................................");
  console.log("............................................");
  console.log("Burned TON is :", burnedTONAmount);
  console.log("Burned TON Seignorage is :", burnedSeignorageAmount);
  console.log("Reduced TON Seignorage is :", reducedSeignorageAmount);
  console.log("Locked TON is :", lockedTONAmount);
  console.log("Staked TON is :", stakedTONAmount);
  console.log("............................................");
  console.log("............................................");


  // Calculate total supply
  totalSupply =
    totalSupply -
    burnedTONAmount -
    burnedSeignorageAmount -
    reducedSeignorageAmount;
  console.log("Total Supply for TON is :", totalSupply, "TON");

  // Circulating Supply
  let circulatingSupply = totalSupply - stakedTONAmount - lockedTONAmount;
  console.log("Circulating Supply:", circulatingSupply,"TON (",Math.round(circulatingSupply/totalSupply*100),"% of total supply)");

  // Circulating Supply (Upbit), includes staked TON as circulating supply
  let circulatingSupplyUpbit = totalSupply - lockedTONAmount;
  console.log("Circulating Supply (Upbit):", circulatingSupplyUpbit,"TON (",Math.round(circulatingSupplyUpbit/totalSupply*100),"% of total supply)");
  console.log("............................................");
  
  //Update burnedTON, lockedTON, burnedSiegTON, reducedSeigTON, stakedTON
  update.updateCSV()
};

runMain();
