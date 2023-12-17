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

const runMain = async () => {
  try {
    let lastBlock = await alchemy.core.getBlock();
    let lastBlockNumber = lastBlock.number;
    let lastUnix_timestamp = lastBlock.timestamp;
    var lastDate = new Date(lastUnix_timestamp * 1000);

    await Moralis.start({
      apiKey: process.env.MORALIS_API_KEY,
    });

    // Get relevant blocks based on the last block //list of unix epoch time based on https://docs.google.com/spreadsheets/d/1-4dT3nS4q7RwLgGI6rQ7M1hPx9XHI-Ryw1rkBCvTdcs/edit#gid=681869004 (use https://delim.co/# for comma)
//    let unixEpochTimeList = [1597168209,1599846609,1602438609,1605030609,1607622609,1610214609,1612806609,1615398609,1617990609,1620582609,1623174609,1625766609,1628358609,1630950609,1633542609,1636134609,1638726609,1641318609,1643910609,1646502609,1649094609,1651686609,1654278609,1656870609,1659462609,1662054609,1664646609,1667238609,1669830609,1672422609,1675014609,1677606609,1680198609,1682790609,1685382609,1687974609,1690566609,1693158609,1695750609,1698342609,1700934609,1703526609,1703966400,1706644800,1709150400,1711828800,1714420800,1717099200,1719691200,1722369600,1725048000,1727640000,1730318400,1732910400,1735588800,1738267200,1740686400,1743364800,1745956800,1748635200,1751227200,1753905600,1756584000,1759176000,1761854400,1764446400,1767124800,1769803200,1772222400,1774900800,1777492800,1780171200,1782763200,1785441600,1788120000,1790712000,1793390400,1795982400];
    let unixEpochTimeList = [1597211409,1599889809,1602481809,1605073809,1607665809,1610257809,1612849809,1615441809,1618033809,1620625809,1623217809,1625809809,1628401809,1630993809,1633585809,1636177809,1638769809,1641361809,1643953809,1646545809,1649137809,1651729809,1654321809,1656913809,1659505809,1662097809,1664689809,1667281809,1669873809,1672465809,1675057809,1677649809,1680241809,1682833809,1685425809,1688017809,1690609809,1693201809,1695793809,1698385809,1700977809,1703569809,1703966400,1706644800,1709150400,1711828800,1714420800,1717099200,1719691200,1722369600,1725048000,1727640000,1730318400,1732910400,1735588800,1738267200,1740686400,1743364800,1745956800,1748635200,1751227200,1753905600,1756584000,1759176000,1761854400,1764446400,1767124800,1769803200,1772222400,1774900800,1777492800,1780171200,1782763200,1785441600,1788120000,1790712000,1793390400,1795982400];

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
    const output = completeList.join("\n");
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

runMain();
