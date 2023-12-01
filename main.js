// reference material: https://docs.alchemy.com/docs/how-to-get-erc-20-token-balance-at-a-given-block
const { Alchemy, Network, Utils, BigNumber } = require("alchemy-sdk");
const ethers = require('ethers');
require("dotenv").config();

const config = {
    apiKey: process.env.ALCHEMY_API_KEY,
    network: Network.ETH_MAINNET,
};

const alchemy = new Alchemy(config);

const main = async () => {
    // Target address for balance (WTON contract address)
    const contractAddressWTON = "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2";
    const numDecimalsWTON = 27;

    // TON contract address
    const contractAddressTON = "0x2be5e8c109e2197D077D13A82dAead6a9b3433C5";
    const numDecimalsTON = 18;

    // TON Burn address by Tokamak Network (DAOvault -> 0x...1)
    const burnAddressTON = "0x0000000000000000000000000000000000000001";  

    // Target Block number
    //const blockNum = 14109200; //2022. 2. 28 오전 5:00:00 OR Unix epoch time: 1643572800 
    const blockNum = 18681264; //2022. 2. 28 오전 5:00:00 OR Unix epoch time: 1643572800 18662197


    // ABI
    let abi1 = [
        'function balanceOf(address account)'
    ];
    let abi2 = [
        'function totalSupply()'
    ];

    // Create function call data -- eth_call
    let iface1 = new ethers.Interface(abi1);
    let iface2 = new ethers.Interface(abi2);
    let data1 = iface1.encodeFunctionData("balanceOf", [contractAddressWTON]);
    let data2 = iface2.encodeFunctionData("totalSupply");
    let data3 = iface1.encodeFunctionData("balanceOf", [burnAddressTON]);
    let data4 = iface2.encodeFunctionData("totalSupply");



    // Get balance at a particular block -- usage of eth_call
    let balanceTONHeldByWTON = await alchemy.core.call({
        to: contractAddressTON,
        data: data1,
    }, blockNum);
    
    let totalSupplyWTON = await alchemy.core.call({
        to: contractAddressWTON,
        data: data2,
    }, blockNum);

    let balanceOfBurnedTON = await alchemy.core.call({
        to: contractAddressTON,
        data: data3,
    }, blockNum);

    let totalSupplyTON = await alchemy.core.call({
        to: contractAddressTON,
        data: data4,
    }, blockNum);
    

    let totalSupplyTONWTON = BigInt(totalSupplyTON)*BigInt(10**9)+BigInt(totalSupplyWTON)-BigInt(balanceTONHeldByWTON)*BigInt(10**9)-BigInt(balanceOfBurnedTON)*BigInt(10**9);

    balanceTONHeldByWTON = (parseInt(balanceTONHeldByWTON) / 10 ** numDecimalsTON);
    totalSupplyWTON = (parseInt(totalSupplyWTON) / 10 ** numDecimalsWTON);
    balanceOfBurnedTON = (parseInt(balanceOfBurnedTON) / 10 ** numDecimalsTON);
    totalSupplyTON = (parseInt(totalSupplyTON) / 10 ** numDecimalsTON);
    totalSupplyTONWTON = Number(totalSupplyTONWTON / BigInt(10 ** (numDecimalsWTON-10)))/10**10;

    console.log("At block number:", blockNum)
    console.log("TON TotalSupply:", totalSupplyTON, "TON");
    console.log("WTON TotalSupply:", totalSupplyWTON, "WTON");
    console.log("TON Held By WTON contract:", balanceTONHeldByWTON, "TON");
    console.log("TON Held By 0x...1:", balanceOfBurnedTON, "TON");
    console.log("Total Supply for TON(WTON) - 'missed seignorage' is:",totalSupplyTONWTON, "TON"); // This can overflow -> NaN
    console.log("This does not account for unminted TON -> need to calculate it based on the last update seignorage")
};

const runMain = async () => {
    try {
        await main();
        process.exit(0);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
};

runMain();