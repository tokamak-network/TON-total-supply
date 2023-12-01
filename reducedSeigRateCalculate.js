// used https://docs.alchemy.com/docs/sdk-developer-challenge-guide-4 as a reference
const { Alchemy, Network, Utils, BigNumber } = require("alchemy-sdk");
const ethers = require("ethers");
require("dotenv").config();

const config = {
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
};

const alchemy = new Alchemy(config);

const reducedSeigRateCalculate = async () => {
  //Event collection
  const seigManagerContractAddress =
    "0x710936500aC59e8551331871Cbad3D33d5e0D909";
  const seigManagerABI = `[{"inputs":[{"internalType":"contract ERC20Mintable","name":"ton","type":"address"},{"internalType":"contract ERC20Mintable","name":"wton","type":"address"},{"internalType":"contract Layer2RegistryI","name":"registry","type":"address"},{"internalType":"contract DepositManagerI","name":"depositManager","type":"address"},{"internalType":"uint256","name":"seigPerBlock","type":"uint256"},{"internalType":"address","name":"factory_","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"}],"name":"ChallengerAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"}],"name":"ChallengerRemoved","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"layer2","type":"address"},{"indexed":false,"internalType":"address","name":"coinage","type":"address"}],"name":"CoinageCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"layer2","type":"address"}],"name":"Comitted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"layer2","type":"address"},{"indexed":false,"internalType":"uint256","name":"previousRate","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newRate","type":"uint256"}],"name":"CommissionRateSet","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"totalStakedAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"totalSupplyOfWTON","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"prevTotalSupply","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"nextTotalSupply","type":"uint256"}],"name":"CommitLog1","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Paused","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"}],"name":"PauserAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"}],"name":"PauserRemoved","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"layer2","type":"address"},{"indexed":false,"internalType":"uint256","name":"totalSeig","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"stakedSeig","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"unstakedSeig","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"powertonSeig","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"pseig","type":"uint256"}],"name":"SeigGiven","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Unpaused","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"coinageBurnAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"totBurnAmount","type":"uint256"}],"name":"UnstakeLog","type":"event"},{"constant":true,"inputs":[],"name":"DEFAULT_FACTOR","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"MAX_VALID_COMMISSION","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"MIN_VALID_COMMISSION","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"RAY","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"accRelativeSeig","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"addChallenger","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"addPauser","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"layer2","type":"address"},{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"additionalTotBurnAmount","outputs":[{"internalType":"uint256","name":"totAmount","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"adjustCommissionDelay","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"layer2","type":"address"}],"name":"coinages","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"layer2","type":"address"}],"name":"commissionRates","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"dao","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"daoSeigRate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"delayedCommissionBlock","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"delayedCommissionRate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"delayedCommissionRateNegative","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"layer2","type":"address"}],"name":"deployCoinage","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"depositManager","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"factory","outputs":[{"internalType":"contract CoinageFactoryI","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"layer2","type":"address"}],"name":"getOperatorAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"isChallenger","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"layer2","type":"address"}],"name":"isCommissionRateNegative","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"isOwner","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"isPauser","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"layer2","type":"address"}],"name":"lastCommitBlock","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"lastSeigBlock","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"minimumAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"layer2","type":"address"},{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"onDeposit","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"onTransfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"layer2","type":"address"},{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"onWithdraw","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"pause","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"paused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"pausedBlock","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"powerTONSeigRate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"powerton","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"registry","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"relativeSeigRate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"renounceChallenger","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"target","type":"address"}],"name":"renounceMinter","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"target","type":"address"}],"name":"renounceOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"renounceOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"target","type":"address"}],"name":"renouncePauser","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"renouncePauser","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"renounceWTONMinter","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"seigPerBlock","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"adjustDelay_","type":"uint256"}],"name":"setAdjustDelay","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"factory_","type":"address"}],"name":"setCoinageFactory","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"layer2","type":"address"},{"internalType":"uint256","name":"commissionRate","type":"uint256"},{"internalType":"bool","name":"isCommissionRateNegative","type":"bool"}],"name":"setCommissionRate","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"daoAddress","type":"address"}],"name":"setDao","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"daoSeigRate_","type":"uint256"}],"name":"setDaoSeigRate","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"minimumAmount_","type":"uint256"}],"name":"setMinimumAmount","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"contract PowerTONI","name":"powerton","type":"address"}],"name":"setPowerTON","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"powerTONSeigRate_","type":"uint256"}],"name":"setPowerTONSeigRate","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"PseigRate_","type":"uint256"}],"name":"setPseigRate","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"layer2","type":"address"},{"internalType":"address","name":"challenger","type":"address"}],"name":"slash","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"layer2","type":"address"},{"internalType":"address","name":"account","type":"address"}],"name":"stakeOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"ton","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"tot","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"newSeigManager","type":"address"},{"internalType":"address[]","name":"coinages","type":"address[]"}],"name":"transferCoinageOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"target","type":"address"},{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"layer2","type":"address"},{"internalType":"address","name":"account","type":"address"}],"name":"uncomittedStakeOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"unpause","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"unpausedBlock","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"updateSeigniorage","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"wton","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"}]`;

  const SEIGMANGER_INTERFACE = new Utils.Interface(seigManagerABI);
  const SEIGMANGERL_CREATED_TOPICS = SEIGMANGER_INTERFACE.encodeFilterTopics(
    "SeigGiven",
    []
  );

  // const blockBuffer = Math.ceil((40 * 24 * 60 * 60) / 13); //40 days of block
  // 10837698 begin block for seignorage 
  const startBlock = 10837698;
  const endBlock = 13497999; //SeigRate Change txn https://etherscan.io/tx/0x7a9eb4c3e80ee9e4e0e9c2a6d751a90da8a951d4644100335a4eb6dfbbc2fe33

  const logs = await alchemy.core.getLogs({
    fromBlock: "0x" + startBlock.toString(16),
    toBlock: "0x" + endBlock.toString(16),
    address: seigManagerContractAddress,
    topics: SEIGMANGERL_CREATED_TOPICS,
  });
  const unstakelogs = await alchemy.core.getLogs({
    fromBlock: "0x" + startBlock.toString(16),
    toBlock: "0x" + endBlock.toString(16),
    address: seigManagerContractAddress,
    topics: SEIGMANGERL_UNSTAKED,
  });
  //parse data field to identify unstakedSeig and powertonSeig
  //if powertonSeig is less than 8% of the unstakedSeig, record the amount and add them
  console.log(logs[0]);

  let unmintedSeig = 0;
  let logsLength = logs.length;
  let unmintedSeigList = [];
  let reducedBlockNumberList = [];
  for (let i = 0; i < logsLength; i++) {
    let currentData = logs[i].data.split("");
    let totalSeig = "";
    let stakedSeig = "";
    let unstakedSeig = "";
    let powertonSeig = "";

    //totalSeig
    let dataPosition = 1;
    let start = (dataPosition - 1) * 64;
    for (let j = start; j < 64 + start; j++) {
      totalSeig = totalSeig + currentData[j + 2];
    }

    //stakedSeig
    dataPosition = 2;
    start = (dataPosition - 1) * 64;
    for (let j = start; j < 64 + start; j++) {
      stakedSeig = stakedSeig + currentData[j + 2];
    }

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

    //pseig
    dataPosition = 5;
    start = (dataPosition - 1) * 64;
    pseig = "";
    for (let k = start; k < 64 + start; k++) {
      pseig = pseig + currentData[k + 2];
    }
    if ((parseInt(unstakedSeig, 16) * 8) / 100 > parseInt(powertonSeig, 16)) {
      console.log("-----------");
      console.log("totalseig is:", parseInt(totalSeig, 16) / 10 ** 27);
      console.log("stakedSeig is:", parseInt(stakedSeig, 16) / 10 ** 27);
      console.log("unstakedseig is:", parseInt(unstakedSeig, 16) / 10 ** 27);
      console.log("powertonseig is:", parseInt(powertonSeig, 16) / 10 ** 27);
      console.log("pseig is:", parseInt(pseig, 16) / 10 ** 27);
      unmintedSeig = unmintedSeig + parseInt(powertonSeig, 16);
      unmintedSeigList.push(parseInt(powertonSeig, 16) / 10 ** 27);
      reducedBlockNumberList.push(logs[i].blockNumber);
    }
  }
  unmintedSeig = unmintedSeig / 10 ** 27;
  console.log("-----------");
  console.log("Unminted TON is", unmintedSeig);
  console.log("Unminted TON list is", unmintedSeigList);
  console.log(
    "Block which produced less than it is supposed to ",
    reducedBlockNumberList
  );
};

const runMain = async () => {
  try {
    await reducedSeigRateCalculate();
    process.exit(0);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

runMain();
