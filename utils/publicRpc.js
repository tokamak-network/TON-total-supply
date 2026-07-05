/**
 * eth_getLogs over free public RPC endpoints.
 * Alchemy's free tier limits eth_getLogs to a 10-block range, so log queries
 * are sent to public endpoints that accept unbounded block ranges instead.
 * Endpoints are tried in order until one succeeds; set the GETLOGS_RPC_URL
 * environment variable to try a custom endpoint first.
 */
const { ethers } = require("ethers");
require("dotenv").config();

const PUBLIC_RPC_ENDPOINTS = [
  "https://rpc.mevblocker.io",
  "https://eth.llamarpc.com",
  "https://ethereum.blockpi.network/v1/rpc/public",
];

// One provider per endpoint, shared across calls
const providers = new Map();
const getProvider = (url) => {
  if (!providers.has(url)) {
    providers.set(url, new ethers.JsonRpcProvider(url, "mainnet", { staticNetwork: true }));
  }
  return providers.get(url);
};

// Endpoint that served the previous call successfully — tried first so a dead
// primary is not re-attempted on every call
let lastGoodUrl = null;

/**
 * Fetch logs for a block range, falling back across public RPC endpoints
 * @param {number} startBlock - Starting block number
 * @param {number} endBlock - Ending block number
 * @param {string} contractAddress - Contract address
 * @param {Array} topics - Event topics to filter
 * @returns {Array} Logs for the requested range
 */
async function getLogsViaPublicRpc(startBlock, endBlock, contractAddress, topics) {
  const configured = process.env.GETLOGS_RPC_URL
    ? [process.env.GETLOGS_RPC_URL, ...PUBLIC_RPC_ENDPOINTS]
    : PUBLIC_RPC_ENDPOINTS;
  const endpoints = lastGoodUrl
    ? [lastGoodUrl, ...configured.filter((url) => url !== lastGoodUrl)]
    : configured;

  let lastError;
  for (const url of endpoints) {
    try {
      const logs = await getProvider(url).getLogs({
        fromBlock: startBlock,
        toBlock: endBlock,
        address: contractAddress,
        topics: topics,
      });
      console.log(`Retrieved ${logs.length} logs for blocks ${startBlock}-${endBlock} via ${url}`);
      lastGoodUrl = url;
      return logs;
    } catch (error) {
      console.error(`getLogs failed on ${url} (blocks ${startBlock}-${endBlock}): ${error.message}`);
      lastError = error;
    }
  }
  throw lastError;
}

module.exports = {
  getLogsViaPublicRpc,
};
