/**
 * This JavaScript file calculates the total supply and circulating supply of TON (Tokamak Network) based on various factors.
 * It imports required modules, configures the Alchemy SDK, and defines the main function.
 * The main function updates the necessary data, retrieves the latest block information, and performs calculations.
 * The calculated amounts are then printed to the console.
 * The total supply and circulating supply are calculated by subtracting the burned, reduced, locked, and staked amounts from the initial supply.
 * The final results are displayed in the console.
 */
// used https://docs.alchemy.com/docs/sdk-developer-challenge-guide-4 as a reference

// Import required modules
const {Alchemy, Network} = require("alchemy-sdk");
require("dotenv").config();
const update = require("./updateCSV");
const updateUpbit = require("./updateCSVUpbit");

// Configure Alchemy SDK
const config = {
    apiKey: process.env.ALCHEMY_API_KEY,
    network: Network.ETH_MAINNET,
};

const alchemy = new Alchemy(config);
const runMain = async () => {
    // Update burnedTON, lockedTON, burnedSiegTON, reducedSeigTON, stakedTON
    await update.updateCSV();
    // await updateUpbit.updateCSVUpbit(); uncomment this line to get upbit information
};

// Run the main function
runMain();