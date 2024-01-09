/**
 * This JavaScript file calculates the total supply and circulating supply of TON (Token) based on various factors.
 * It imports required modules, configures the Alchemy SDK, and defines the main function.
 * The main function updates the necessary data, retrieves the latest block information, and performs calculations.
 * The calculated amounts are then printed to the console.
 * The total supply and circulating supply are calculated by subtracting the burned, reduced, locked, and staked amounts from the initial supply.
 * The final results are displayed in the console.
 */
// used https://docs.alchemy.com/docs/sdk-developer-challenge-guide-4 as a reference

// Import required modules
const { Alchemy, Network} = require("alchemy-sdk");
require("dotenv").config();
const reducedSeignorage = require("./reducedSeignorage");
const stakedTON = require("./stakedTON");
const burnedSeignorage = require("./burnedSeignorage");
const burnedTON = require("./burnedTON");
const lockedTON = require("./lockedTON");
const update = require("./updateCSV");

// Configure Alchemy SDK
const config = {
    apiKey: process.env.ALCHEMY_API_KEY,
    network: Network.ETH_MAINNET,
};
const alchemy = new Alchemy(config);

// Main function
const runMain = async () => {
    // Update burnedTON, lockedTON, burnedSiegTON, reducedSeigTON, stakedTON
    //await update.updateCSV();

    // Set the start block for calculations
    let startBlock = 10643261; // TON contract deployment https://etherscan.io/tx/0x2d66feb7bdaba9f5b2c22e8ec4bfa7b012b2ff655bd93017df203d49747565b2

    // Get the latest block information
    let lastBlock = await alchemy.core.getBlock();
    let lastUnix_timestamp = lastBlock.timestamp;
    let lastBlockNumber = lastBlock.number;
    var lastDate = new Date(lastUnix_timestamp * 1000);

    // Calculate the max total supply: 50_000_000 TON + 3.92 WTON Seignorage per block
    let totalSupply = 50_000_000 + 3.92 * (lastBlockNumber - 10837698); // 10837698 begin block for seignorage https://etherscan.io/tx/0x4750dd10e22f993cea3052dfc9872ad4d25efa68cb21938ad429dd59b912b8b5

    // Calculate the burned TON amount
    let burnedTONAmount = await burnedTON.burnedTON(startBlock, lastBlockNumber);

    // Calculate the burned TON Seignorage amount
    let burnedSeignorageAmount = await burnedSeignorage.burnedSeignorage(startBlock, lastBlockNumber);

    // Calculate the reduced TON Seignorage amount
    let reducedSeignorageAmount = await reducedSeignorage.reducedSeignorage(startBlock, lastBlockNumber);

    // Calculate the locked TON amount
    [lockedTONAmount, spentTONAmount] = await lockedTON.lockedTON(startBlock, lastBlockNumber);
    lockedTONAmount = lockedTONAmount - spentTONAmount;

    // Calculate the staked TON amount
    stakedTONAmount = await stakedTON.stakedTON(lastBlockNumber);

    // Print the current block number and time
    console.log("............................................");
    console.log("Current block number:", lastBlockNumber);
    console.log("Current block time:", lastDate);
    console.log("............................................");

    // Print the calculated amounts
    console.log("............................................");
    console.log("Burned TON is :", burnedTONAmount);
    console.log("Burned TON Seignorage is :", burnedSeignorageAmount);
    console.log("Reduced TON Seignorage is :", reducedSeignorageAmount);
    console.log("Locked TON is :", lockedTONAmount);
    console.log("Staked TON is :", stakedTONAmount);
    console.log("............................................");

    // Calculate the total supply
    totalSupply = totalSupply - burnedTONAmount - burnedSeignorageAmount - reducedSeignorageAmount;
    console.log("Total Supply for TON is :", totalSupply, "TON");

    // Calculate the circulating supply
    let circulatingSupply = totalSupply - stakedTONAmount - lockedTONAmount;
    console.log(
        "Circulating Supply:",
        circulatingSupply,
        "TON (",
        Math.round((circulatingSupply / totalSupply) * 100),
        "% of total supply)"
    );

    // Calculate the circulating supply (Upbit), includes staked TON as circulating supply
    let circulatingSupplyUpbit = totalSupply - lockedTONAmount;
    console.log(
        "Circulating Supply (Upbit):",
        circulatingSupplyUpbit,
        "TON (",
        Math.round((circulatingSupplyUpbit / totalSupply) * 100),
        "% of total supply)"
    );
    console.log("............................................");
};

// Run the main function
runMain();
