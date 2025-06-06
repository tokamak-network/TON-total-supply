/**
 * This file contains a JavaScript module that calculates the burned seignorage
 * for a given range of blocks. It exports a function called `burnedSeignorage`
 * that takes in the start and end block numbers and returns the total burned seignorage.
 * The module also exports an `updateCSV` function that retrieves relevant block numbers
 * based on the last block, calculates the burned seignorage for each block range,
 * and writes the output to a CSV file.
 *
 * The `burnedSeignorage` function uses the Alchemy API to retrieve logs for the
 * specified block range and calculates the burned seignorage by parsing the data
 * from the logs. It adds up all the burned TON (TON is a cryptocurrency) and returns
 * the total burned seignorage.
 *
 * The `updateCSV` function uses the Moralis API to retrieve the last block's timestamp,
 * reads a list of Unix epoch times from a CSV file, converts the Unix epoch times to block numbers,
 * and then calculates the burned seignorage for each block range. It writes the block numbers
 * and corresponding burned seignorage to a CSV file.
 *
 * This module can be used to track and analyze the burned seignorage over time in the TON blockchain.
 */

// used https://docs.alchemy.com/docs/sdk-developer-challenge-guide-4 as a reference
const { Alchemy, Network, Utils } = require("alchemy-sdk");
require("dotenv").config();
const Moralis = require("moralis").default;
const fs = require("fs");
const { getLogsWithRangeLimit } = require("./utils/blockRangeHelper");

const config = {
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
};
const alchemy = new Alchemy(config);

const burnedSeignorage = async (Block1, Block2) => {
  //ABI and contract setting
  const seigManagerContractAddress =
    "0x710936500aC59e8551331871Cbad3D33d5e0D909";
  const patchedSeigManagerProxyAddress =
    "0x0b55a0f463b6DEFb81c6063973763951712D0E5F";
  const seigManagerABI = `[{"inputs":[{"internalType":"contract ERC20Mintable","name":"ton","type":"address"},{"internalType":"contract ERC20Mintable","name":"wton","type":"address"},{"internalType":"contract Layer2RegistryI","name":"registry","type":"address"},{"internalType":"contract DepositManagerI","name":"depositManager","type":"address"},{"internalType":"uint256","name":"seigPerBlock","type":"uint256"},{"internalType":"address","name":"factory_","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"}],"name":"ChallengerAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"}],"name":"ChallengerRemoved","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"layer2","type":"address"},{"indexed":false,"internalType":"address","name":"coinage","type":"address"}],"name":"CoinageCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"layer2","type":"address"}],"name":"Comitted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"layer2","type":"address"},{"indexed":false,"internalType":"uint256","name":"previousRate","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newRate","type":"uint256"}],"name":"CommissionRateSet","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"totalStakedAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"totalSupplyOfWTON","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"prevTotalSupply","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"nextTotalSupply","type":"uint256"}],"name":"CommitLog1","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Paused","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"}],"name":"PauserAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"}],"name":"PauserRemoved","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"layer2","type":"address"},{"indexed":false,"internalType":"uint256","name":"totalSeig","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"stakedSeig","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"unstakedSeig","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"powertonSeig","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"pseig","type":"uint256"}],"name":"SeigGiven","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Unpaused","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"coinageBurnAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"totBurnAmount","type":"uint256"}],"name":"UnstakeLog","type":"event"},{"constant":true,"inputs":[],"name":"DEFAULT_FACTOR","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"MAX_VALID_COMMISSION","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"MIN_VALID_COMMISSION","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"RAY","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"accRelativeSeig","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"addChallenger","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"addPauser","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"layer2","type":"address"},{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"additionalTotBurnAmount","outputs":[{"internalType":"uint256","name":"totAmount","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"adjustCommissionDelay","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"layer2","type":"address"}],"name":"coinages","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"layer2","type":"address"}],"name":"commissionRates","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"dao","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"daoSeigRate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"delayedCommissionBlock","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"delayedCommissionRate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"delayedCommissionRateNegative","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"layer2","type":"address"}],"name":"deployCoinage","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"depositManager","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"factory","outputs":[{"internalType":"contract CoinageFactoryI","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"layer2","type":"address"}],"name":"getOperatorAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"isChallenger","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"layer2","type":"address"}],"name":"isCommissionRateNegative","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"isOwner","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"isPauser","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"layer2","type":"address"}],"name":"lastCommitBlock","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"lastSeigBlock","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"minimumAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"layer2","type":"address"},{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"onDeposit","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"onTransfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"layer2","type":"address"},{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"onWithdraw","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"pause","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"paused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"pausedBlock","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"powerTONSeigRate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"powerton","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"registry","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"relativeSeigRate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"renounceChallenger","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"target","type":"address"}],"name":"renounceMinter","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"target","type":"address"}],"name":"renounceOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"renounceOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"target","type":"address"}],"name":"renouncePauser","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"renouncePauser","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"renounceWTONMinter","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"seigPerBlock","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"adjustDelay_","type":"uint256"}],"name":"setAdjustDelay","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"factory_","type":"address"}],"name":"setCoinageFactory","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"layer2","type":"address"},{"internalType":"uint256","name":"commissionRate","type":"uint256"},{"internalType":"bool","name":"isCommissionRateNegative","type":"bool"}],"name":"setCommissionRate","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"daoAddress","type":"address"}],"name":"setDao","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"daoSeigRate_","type":"uint256"}],"name":"setDaoSeigRate","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"minimumAmount_","type":"uint256"}],"name":"setMinimumAmount","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"contract PowerTONI","name":"powerton","type":"address"}],"name":"setPowerTON","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"powerTONSeigRate_","type":"uint256"}],"name":"setPowerTONSeigRate","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"PseigRate_","type":"uint256"}],"name":"setPseigRate","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"layer2","type":"address"},{"internalType":"address","name":"challenger","type":"address"}],"name":"slash","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"layer2","type":"address"},{"internalType":"address","name":"account","type":"address"}],"name":"stakeOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"ton","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"tot","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"newSeigManager","type":"address"},{"internalType":"address[]","name":"coinages","type":"address[]"}],"name":"transferCoinageOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"target","type":"address"},{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"layer2","type":"address"},{"internalType":"address","name":"account","type":"address"}],"name":"uncomittedStakeOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"unpause","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"unpausedBlock","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"updateSeigniorage","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"wton","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"}]`;

  const SEIGMANGER_INTERFACE = new Utils.Interface(seigManagerABI);

  const SEIGMANGER_UNSTAKED = SEIGMANGER_INTERFACE.encodeFilterTopics(
    "UnstakeLog",
    []
  );

  //block data retrieval
  var startBlock = Block1;
  const endBlock = Block2;

  const patchedStartBlock = 18417894; //block 18417894 -> Patched block number based on patched contract deployment https://etherscan.io/tx/0xdde91cd2eef02b492015f5dbdcf36bc2e3bbe94627f90df85cf593df29de0561

  let unstakeLogs = [];
  let patchedUnstakeLogs = [];
  if (startBlock < patchedStartBlock) {
    if (endBlock < patchedStartBlock) {
      unstakeLogs = await getLogsWithRangeLimit(
        alchemy,
        startBlock,
        endBlock,
        seigManagerContractAddress,
        SEIGMANGER_UNSTAKED
      );
    } else {
      const patchedStartBlock_overlap = patchedStartBlock - 1;
      unstakeLogs = await getLogsWithRangeLimit(
        alchemy,
        startBlock,
        patchedStartBlock_overlap,
        seigManagerContractAddress,
        SEIGMANGER_UNSTAKED
      );
      patchedUnstakeLogs = await getLogsWithRangeLimit(
        alchemy,
        patchedStartBlock,
        endBlock,
        patchedSeigManagerProxyAddress,
        SEIGMANGER_UNSTAKED
      );
    }
  } else {
    unstakeLogs = await getLogsWithRangeLimit(
      alchemy,
      startBlock,
      endBlock,
      patchedSeigManagerProxyAddress,
      SEIGMANGER_UNSTAKED
    );
  }

  // Seigmanager (old version)
  //add up all the burned tot
  logsLength = unstakeLogs.length;
  totBurnedTotal = 0;
  totBurnedList = [];
  totBurnedBlockNumber = [];

  for (let i = 0; i < logsLength; i++) {
    dataPosition = 2;
    start = (dataPosition - 1) * 64;
    totBurned = "";
    //console.log("i:", i, "/", logsLength - 1);
    //console.log("unstakeLogs[i].data:", unstakeLogs[i].data);
    //console.log("unstakeLogs[i].blockNumber:", unstakeLogs[i].blockNumber);
    //console.log("unstakeLogs[i]:", unstakeLogs[i]);
    let currentData2 = unstakeLogs[i].data.split("");
    for (let j = start; j < 64 + start; j++) {
      totBurned = totBurned + currentData2[j + 2];
    }
    totBurnedList.push(parseInt(totBurned, 16) / 10 ** 27);
    totBurnedBlockNumber.push(unstakeLogs[i].blockNumber);
    totBurnedTotal = totBurnedTotal + parseInt(totBurned, 16) / 10 ** 27;
  }

  // Seigmanager (patched)
  //add up all the burned tot
  patchedLogsLength = patchedUnstakeLogs.length;
  if (patchedLogsLength > 0) {
    for (let i = 0; i < patchedLogsLength; i++) {
      dataPosition = 2;
      start = (dataPosition - 1) * 64;
      totBurned = "";
      let currentData2 = patchedUnstakeLogs[i].data.split("");
      for (let j = start; j < 64 + start; j++) {
        totBurned = totBurned + currentData2[j + 2];
      }
      totBurnedList.push(parseInt(totBurned, 16) / 10 ** 27);
      totBurnedBlockNumber.push(patchedUnstakeLogs[i].blockNumber);
      totBurnedTotal = totBurnedTotal + parseInt(totBurned, 16) / 10 ** 27;
    }
  }

  return totBurnedTotal;
};

module.exports = {
  burnedSeignorage,
};
