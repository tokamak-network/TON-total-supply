/**
 * This JavaScript file contains code for retrieving and updating the staked TON (WTON) data.
 * It utilizes the Alchemy SDK, ethers.js, dotenv, Moralis, and fs modules.
 * The code retrieves the staked TON balance at a given block number using the Alchemy API.
 * It also updates a CSV file with the staked TON data for a list of specified block numbers.
 * The staked TON data includes the block number and the amount of staked TON (WTON) at that block.
 * The file exports the stakedTON function for external use.
 *
 * reference https://docs.alchemy.com/docs/how-to-get-erc-20-token-balance-at-a-given-block
 */
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
  formatedStaked = stakedTON / 10 ** numDecimals;
  return formatedStaked;
};

module.exports = {
  stakedTON,
};