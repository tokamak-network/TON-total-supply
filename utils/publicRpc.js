/**
 * eth_getLogs over free public RPC endpoints.
 * Alchemy's free tier limits eth_getLogs to a 10-block range, so log queries
 * are sent to public endpoints that accept unbounded block ranges instead.
 * Endpoints are tried in order until one succeeds; set the GETLOGS_RPC_URL
 * environment variable to try a custom endpoint first (with an optional
 * GETLOGS_RPC_MAX_RANGE if that endpoint caps the block span per request).
 */
const { ethers } = require("ethers");
require("dotenv").config();

// maxBlockRange caps the block span per getLogs request for endpoints that
// reject large ranges; omit it for endpoints verified to accept unbounded ones.
const PUBLIC_RPC_ENDPOINTS = [
  { url: "https://rpc.mevblocker.io" },
  { url: "https://gateway.tenderly.co/public/mainnet" },
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
    ? [
        {
          url: process.env.GETLOGS_RPC_URL,
          maxBlockRange: Number(process.env.GETLOGS_RPC_MAX_RANGE) || undefined,
        },
        ...PUBLIC_RPC_ENDPOINTS,
      ]
    : PUBLIC_RPC_ENDPOINTS;
  // Drop duplicates (e.g. GETLOGS_RPC_URL matching a default) before ordering
  const unique = configured.filter(
    (endpoint, i) => configured.findIndex((e) => e.url === endpoint.url) === i
  );
  const endpoints = lastGoodUrl
    ? [
        ...unique.filter((endpoint) => endpoint.url === lastGoodUrl),
        ...unique.filter((endpoint) => endpoint.url !== lastGoodUrl),
      ]
    : unique;

  let lastError;
  for (const endpoint of endpoints) {
    try {
      const provider = getProvider(endpoint.url);
      const step = endpoint.maxBlockRange || endBlock - startBlock + 1;
      const logs = [];
      for (let from = startBlock; from <= endBlock; from += step) {
        const to = Math.min(from + step - 1, endBlock);
        logs.push(
          ...(await provider.getLogs({
            fromBlock: from,
            toBlock: to,
            address: contractAddress,
            topics: topics,
          }))
        );
      }
      console.log(`Retrieved ${logs.length} logs for blocks ${startBlock}-${endBlock} via ${endpoint.url}`);
      lastGoodUrl = endpoint.url;
      return logs;
    } catch (error) {
      console.error(`getLogs failed on ${endpoint.url} (blocks ${startBlock}-${endBlock}): ${error.message}`);
      lastError = error;
    }
  }
  throw lastError;
}

module.exports = {
  getLogsViaPublicRpc,
};
