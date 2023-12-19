// used https://docs.alchemy.com/docs/sdk-developer-challenge-guide-4 as a reference
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
  var startBlock = Math.max(10837698, Block1 + 1); // 10837698 begin block for seignorage https://etherscan.io/tx/0x4750dd10e22f993cea3052dfc9872ad4d25efa68cb21938ad429dd59b912b8b5
  if (Block1 == 10643305) {
    startBlock = 10643305;
  }
  const endBlock = Block2;

  const patchedStartBlock = 18417894; //block 18417894 -> Patched block number based on patched contract deployment https://etherscan.io/tx/0xdde91cd2eef02b492015f5dbdcf36bc2e3bbe94627f90df85cf593df29de0561

  let unstakeLogs = [];
  let patchedUnstakeLogs = [];
  if (startBlock < patchedStartBlock) {
    if (endBlock < patchedStartBlock) {
      unstakeLogs = await alchemy.core.getLogs({
        fromBlock: "0x" + startBlock.toString(16),
        toBlock: "0x" + endBlock.toString(16),
        address: seigManagerContractAddress,
        topics: SEIGMANGER_UNSTAKED,
      });
    } else {
      const patchedStartBlock_overlap = patchedStartBlock - 1;
      unstakeLogs = await alchemy.core.getLogs({
        fromBlock: "0x" + startBlock.toString(16),
        toBlock: "0x" + patchedStartBlock_overlap.toString(16),
        address: seigManagerContractAddress,
        topics: SEIGMANGER_UNSTAKED,
      });
      patchedUnstakeLogs = await alchemy.core.getLogs({
        fromBlock: "0x" + patchedStartBlock.toString(16),
        toBlock: "0x" + endBlock.toString(16),
        address: patchedSeigManagerProxyAddress,
        topics: SEIGMANGER_UNSTAKED,
      });
    }
  } else {
    unstakeLogs = await alchemy.core.getLogs({
      fromBlock: "0x" + startBlock.toString(16),
      toBlock: "0x" + endBlock.toString(16),
      address: patchedSeigManagerProxyAddress,
      topics: SEIGMANGER_UNSTAKED,
    });
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
    //console.log("totBurned:", parseInt(totBurned, 16) / 10 ** 27);
  }
  /*
  console.log("-----------");
  console.log("totBurnedTotal:", Number(totBurnedTotal) / 10 ** 27);
  console.log("totBurned list is", totBurnedList);
  console.log("Block which produced totBurned is ", totBurnedBlockNumber);
  */

  // Seigmanager (patched)
  //add up all the burned tot
  patchedLogsLength = patchedUnstakeLogs.length;
  if (patchedLogsLength > 0) {
    for (let i = 0; i < patchedLogsLength; i++) {
      dataPosition = 2;
      start = (dataPosition - 1) * 64;
      totBurned = "";
      //console.log("i:", i, "/", logsLength - 1);
      //console.log("patchedUnstakeLogs[i].data:", patchedUnstakeLogs[i].data);
      //console.log(
      //  "patchedUnstakeLogs[i].blockNumber:",
      //  patchedUnstakeLogs[i].blockNumber
      //);
      //console.log("patchedUnstakeLogs[i]:", patchedUnstakeLogs[i]);
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

  /*
  // Patched Seigmanager Proxy (old version)
  //add up all the burned tot
  logsLength = patchedUnstakeLogs.length - 1;
  console.log(patchedUnstakeLogs[logsLength]);
  patchedTotBurnedTotal = BigInt(0);
  patchedTotBurnedList = [];
  patchedTotBurnedBlockNumber = [];

  for (let i = 0; i < logsLength; i++) {
    dataPosition = 2;
    start = (dataPosition - 1) * 64;
    totBurned = "";
    let currentData2 = patchedUnstakeLogs[i].data.split("");
    for (let j = start; j < 64 + start; j++) {
      totBurned = totBurned + currentData2[j + 2];
    }
    patchedTotBurnedList.push(parseInt(totBurned, 16));
    patchedTotBurnedBlockNumber.push(patchedUnstakeLogs[i].blockNumber);
    patchedTotBurnedTotal = patchedTotBurnedTotal + BigInt("0x" + totBurned);
    console.log("totBurned:", parseInt(totBurned, 16) / 10 ** 27);
  }
  console.log("-----------");
  console.log("totBurnedTotal:", Number(totBurnedTotal) / 10 ** 27);
  console.log(
    "patchedTotBurnedTotal:",
    Number(patchedTotBurnedTotal) / 10 ** 27
  );
  console.log(
    "CombinedTotBurnedTotal:",
    Number(patchedTotBurnedTotal + totBurnedTotal) / 10 ** 27
  );
  console.log("-----------");
  console.log("totBurned list is", totBurnedList);
  console.log("patchedTotBurned list is", patchedTotBurnedList);
  console.log("-----------");
  console.log("Block which produced totBurned is ", totBurnedBlockNumber);
  console.log(
    "Block which produced patchedTotBurned is ",
    patchedTotBurnedBlockNumber
  );
  */
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
    blockNumberList.unshift(blockNumberList[0]); //adds dummy data for the first entry
    
    let completeList = [];
    let burnedTONList = [];
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
      "_burnedSeigTON.csv";

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

module.exports = {
  burnedSeignorage,
};
