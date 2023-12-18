// used https://docs.alchemy.com/docs/sdk-developer-challenge-guide-4 as a reference
const { Alchemy, Network, Utils, BigNumber } = require("alchemy-sdk");
const { ethers, JsonRpcProvider, utils } = require("ethers");
require("dotenv").config();
const Moralis = require("moralis").default;
const fs = require("fs");

const config = {
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
};
const alchemy = new Alchemy(config);
const provider = new JsonRpcProvider(process.env.RPC_ENDPOINT);

const reducedSeignorage = async (Block1, Block2) => {
  //Event collection
  const seigManagerContractAddress =
    "0x710936500aC59e8551331871Cbad3D33d5e0D909";

  const seigManagerABI = `[{"inputs":[{"internalType":"contract ERC20Mintable","name":"ton","type":"address"},{"internalType":"contract ERC20Mintable","name":"wton","type":"address"},{"internalType":"contract Layer2RegistryI","name":"registry","type":"address"},{"internalType":"contract DepositManagerI","name":"depositManager","type":"address"},{"internalType":"uint256","name":"seigPerBlock","type":"uint256"},{"internalType":"address","name":"factory_","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"}],"name":"ChallengerAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"}],"name":"ChallengerRemoved","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"layer2","type":"address"},{"indexed":false,"internalType":"address","name":"coinage","type":"address"}],"name":"CoinageCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"layer2","type":"address"}],"name":"Comitted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"layer2","type":"address"},{"indexed":false,"internalType":"uint256","name":"previousRate","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newRate","type":"uint256"}],"name":"CommissionRateSet","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"totalStakedAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"totalSupplyOfWTON","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"prevTotalSupply","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"nextTotalSupply","type":"uint256"}],"name":"CommitLog1","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Paused","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"}],"name":"PauserAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"}],"name":"PauserRemoved","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"layer2","type":"address"},{"indexed":false,"internalType":"uint256","name":"totalSeig","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"stakedSeig","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"unstakedSeig","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"powertonSeig","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"pseig","type":"uint256"}],"name":"SeigGiven","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Unpaused","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"coinageBurnAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"totBurnAmount","type":"uint256"}],"name":"UnstakeLog","type":"event"},{"constant":true,"inputs":[],"name":"DEFAULT_FACTOR","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"MAX_VALID_COMMISSION","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"MIN_VALID_COMMISSION","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"RAY","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"accRelativeSeig","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"addChallenger","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"addPauser","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"layer2","type":"address"},{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"additionalTotBurnAmount","outputs":[{"internalType":"uint256","name":"totAmount","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"adjustCommissionDelay","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"layer2","type":"address"}],"name":"coinages","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"layer2","type":"address"}],"name":"commissionRates","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"dao","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"daoSeigRate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"delayedCommissionBlock","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"delayedCommissionRate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"delayedCommissionRateNegative","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"layer2","type":"address"}],"name":"deployCoinage","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"depositManager","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"factory","outputs":[{"internalType":"contract CoinageFactoryI","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"layer2","type":"address"}],"name":"getOperatorAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"isChallenger","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"layer2","type":"address"}],"name":"isCommissionRateNegative","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"isOwner","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"isPauser","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"layer2","type":"address"}],"name":"lastCommitBlock","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"lastSeigBlock","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"minimumAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"layer2","type":"address"},{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"onDeposit","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"onTransfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"layer2","type":"address"},{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"onWithdraw","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"pause","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"paused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"pausedBlock","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"powerTONSeigRate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"powerton","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"registry","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"relativeSeigRate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"renounceChallenger","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"target","type":"address"}],"name":"renounceMinter","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"target","type":"address"}],"name":"renounceOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"renounceOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"target","type":"address"}],"name":"renouncePauser","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"renouncePauser","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"renounceWTONMinter","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"seigPerBlock","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"adjustDelay_","type":"uint256"}],"name":"setAdjustDelay","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"factory_","type":"address"}],"name":"setCoinageFactory","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"layer2","type":"address"},{"internalType":"uint256","name":"commissionRate","type":"uint256"},{"internalType":"bool","name":"isCommissionRateNegative","type":"bool"}],"name":"setCommissionRate","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"daoAddress","type":"address"}],"name":"setDao","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"daoSeigRate_","type":"uint256"}],"name":"setDaoSeigRate","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"minimumAmount_","type":"uint256"}],"name":"setMinimumAmount","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"contract PowerTONI","name":"powerton","type":"address"}],"name":"setPowerTON","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"powerTONSeigRate_","type":"uint256"}],"name":"setPowerTONSeigRate","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"PseigRate_","type":"uint256"}],"name":"setPseigRate","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"layer2","type":"address"},{"internalType":"address","name":"challenger","type":"address"}],"name":"slash","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"layer2","type":"address"},{"internalType":"address","name":"account","type":"address"}],"name":"stakeOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"ton","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"tot","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"newSeigManager","type":"address"},{"internalType":"address[]","name":"coinages","type":"address[]"}],"name":"transferCoinageOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"target","type":"address"},{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"layer2","type":"address"},{"internalType":"address","name":"account","type":"address"}],"name":"uncomittedStakeOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"unpause","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"unpausedBlock","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"updateSeigniorage","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"wton","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"}]`;

  const SEIGMANGER_INTERFACE = new Utils.Interface(seigManagerABI);
  const SEIGMANGERL_CREATED_TOPICS = SEIGMANGER_INTERFACE.encodeFilterTopics(
    "SeigGiven",
    []
  );
  var startBlock = Math.min(Math.max(10837698, Block1 + 1), 13497999); // 10837698 begin block for seignorage https://etherscan.io/tx/0x4750dd10e22f993cea3052dfc9872ad4d25efa68cb21938ad429dd59b912b8b5
  if (Block1 == 10643305) {
    startBlock = 10643305;
  }

  const endBlock = Math.min(Block2, 13497999); //block 13497999-> Powerton seig rate changed back to 10% https://etherscan.io/tx/0x7a9eb4c3e80ee9e4e0e9c2a6d751a90da8a951d4644100335a4eb6dfbbc2fe33

  //alchemy
  const logs = await alchemy.core.getLogs({
    fromBlock: "0x" + startBlock.toString(16),
    toBlock: "0x" + endBlock.toString(16),
    address: seigManagerContractAddress,
    topics: SEIGMANGERL_CREATED_TOPICS,
  });

  //parse data field to identify unstakedSeig and powertonSeig
  //if powertonSeig is less than 8% of the unstakedSeig (it should be 10%), record the amount and add them

  let unmintedSeig = 0;
  let logsLength = logs.length;
  let unmintedSeigList = [];
  let reducedBlockNumberList = [];
  let allList = [];
  for (let i = 0; i < logsLength; i++) {
    let currentData = logs[i].data.split("");
    let unstakedSeig = "";
    let powertonSeig = "";

    //unstakedSeig
    dataPosition = 3;
    start = (dataPosition - 1) * 64;
    for (let j = start; j < 64 + start; j++) {
      unstakedSeig = unstakedSeig + currentData[j + 2];
    }

    //powertonSeig
    dataPosition = 4;
    start = (dataPosition - 1) * 64;
    for (let k = start; k < 64 + start; k++) {
      powertonSeig = powertonSeig + currentData[k + 2];
    }

    if ((parseInt(unstakedSeig, 16) * 8) / 100 > parseInt(powertonSeig, 16)) {
      //console.log("-----------");
      //console.log("powertonSeig is:", parseInt(powertonSeig, 16) / 10 ** 27);
      unmintedSeig = unmintedSeig + parseInt(powertonSeig, 16);
      unmintedSeigList.push(parseInt(powertonSeig, 16) / 10 ** 27);
      reducedBlockNumberList.push(logs[i].blockNumber);
      allList.push([
        logs[i].blockNumber,
        parseInt(powertonSeig, 16) / 10 ** 27,
      ]);
    }
  }

  /* check
  unmintedSeig = unmintedSeig / 10 ** 27;
  console.log("-----------");
  console.log("Unminted TON is", unmintedSeig);
  console.log("Unminted TON list is", unmintedSeigList);
  console.log(
    "Block which produced less than it is supposed to ",
    reducedBlockNumberList
  );
  */

  /*
  //ethers.js
    const logs_ETHERS = await provider.getLogs({
      address: seigManagerContractAddress,
      topics: [SEIGMANGERL_CREATED_TOPICS],
      fromBlock: startBlock, 
      toBlock: endBlock
  });

  //ETHERS version: parse data field to identify unstakedSeig and powertonSeig
  //if powertonSeig is less than 8% of the unstakedSeig (it should be 10%), record the amount and add them
  let unmintedSeig_ETHERS = 0;
  let logsLength_ETHERS = logs_ETHERS.length;
  let unmintedSeigList_ETHERS = [];
  let reducedBlockNumberList_ETHERS = [];
  let allList_ETHERS = [];
  for (let i = 0; i < logsLength_ETHERS; i++) {
    let currentData = logs_ETHERS[i].data.split("");
    let unstakedSeig = "";
    let powertonSeig = "";

    //unstakedSeig
    dataPosition = 3;
    start = (dataPosition - 1) * 64;
    for (let j = start; j < 64 + start; j++) {
      unstakedSeig = unstakedSeig + currentData[j + 2];
    }

    //powertonSeig
    dataPosition = 4;
    start = (dataPosition - 1) * 64;
    for (let k = start; k < 64 + start; k++) {
      powertonSeig = powertonSeig + currentData[k + 2];
    }

    if ((parseInt(unstakedSeig, 16) * 8) / 100 > parseInt(powertonSeig, 16)) {
      unmintedSeig_ETHERS = unmintedSeig_ETHERS + parseInt(powertonSeig, 16);
      unmintedSeigList_ETHERS.push(parseInt(powertonSeig, 16) / 10 ** 27);
      reducedBlockNumberList_ETHERS.push(logs_ETHERS[i].blockNumber);
      allList_ETHERS.push([
        logs_ETHERS[i].blockNumber,
        parseInt(powertonSeig, 16) / 10 ** 27,
      ]);
    }
  }

  unmintedSeig_ETHERS / 10 ** 27;
  console.log("unmintedSeig / 10 ** 27:",unmintedSeig / 10 ** 27);
  console.log("unmintedSeig_ETHERS / 10 ** 27:",unmintedSeig_ETHERS / 10 ** 27);
*/  
  return unmintedSeig / 10 ** 27;
};

const runMain = async () => {
  try {
    await Moralis.start({
      apiKey: process.env.MORALIS_API_KEY,
    });
    let lastBlock = await alchemy.core.getBlock();
    let lastUnix_timestamp = lastBlock.timestamp;

    // Get relevant blocks based on the last block //list of unix epoch time based on https://docs.google.com/spreadsheets/d/1-4dT3nS4q7RwLgGI6rQ7M1hPx9XHI-Ryw1rkBCvTdcs/edit#gid=681869004 (use https://delim.co/# for comma)
    let unixEpochTimeList = fs.readFileSync("./data/unixEpochTimeList.csv").toString('utf-8').split(',').map(Number);
    let blockNumberList = [];
    let completeList = [];
    let reducedTONList = [];
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
      reducedTONList[i] = await reducedSeignorage(
        blockNumberList[i],
        blockNumberList[i + 1]
      );
    }
    for (let i = 0; i < blockNumberList.length - 1; i++) {
      completeList.push([blockNumberList[i + 1], reducedTONList[i]]);
    }
    console.log("blockNumber reducedSeig:", completeList);

    // write the output
    const fileName =
      "data/block_" +
      blockNumberList[blockNumberList.length - 1].toString() +
      "_reducedTONSeig.csv";

      const header = "Block number, Reduced seignorage"; // Add the header
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

runMain();