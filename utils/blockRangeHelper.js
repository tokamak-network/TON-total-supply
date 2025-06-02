/**
 * Helper utility for handling eth_getLogs calls with block range limitations.
 * Alchemy API has a limit of ~500 blocks per getLogs request.
 * This utility splits large block ranges into smaller chunks and aggregates the results.
 */

const MAX_BLOCK_RANGE = 9999;

/**
 * Split a large block range into smaller chunks to avoid API limits
 * @param {number} startBlock - Starting block number
 * @param {number} endBlock - Ending block number
 * @param {number} maxRange - Maximum blocks per request (default: 500)
 * @returns {Array} Array of {fromBlock, toBlock} objects
 */
function splitBlockRange(startBlock, endBlock, maxRange = MAX_BLOCK_RANGE) {
  const ranges = [];
  let currentStart = startBlock;

  while (currentStart <= endBlock) {
    const currentEnd = Math.min(currentStart + maxRange - 1, endBlock);
    ranges.push({
      fromBlock: currentStart,
      toBlock: currentEnd
    });
    currentStart = currentEnd + 1;
  }

  return ranges;
}

/**
 * Execute getLogs calls for large block ranges by splitting them into smaller chunks
 * @param {Object} alchemy - Alchemy instance
 * @param {number} startBlock - Starting block number
 * @param {number} endBlock - Ending block number
 * @param {string} contractAddress - Contract address
 * @param {Array} topics - Event topics to filter
 * @param {number} maxRange - Maximum blocks per request (default: 500)
 * @returns {Array} Combined logs from all requests
 */
async function getLogsWithRangeLimit(alchemy, startBlock, endBlock, contractAddress, topics, maxRange = MAX_BLOCK_RANGE) {
  const ranges = splitBlockRange(startBlock, endBlock, maxRange);
  const allLogs = [];

  console.log(`Splitting block range ${startBlock}-${endBlock} into ${ranges.length} chunks...`);

  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    console.log(`Processing chunk ${i + 1}/${ranges.length}: blocks ${range.fromBlock}-${range.toBlock}`);

    try {
      const logs = await alchemy.core.getLogs({
        fromBlock: "0x" + range.fromBlock.toString(16),
        toBlock: "0x" + range.toBlock.toString(16),
        address: contractAddress,
        topics: topics,
      });

      allLogs.push(...logs);

      // Add a small delay to avoid rate limiting
      if (i < ranges.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Error fetching logs for range ${range.fromBlock}-${range.toBlock}:`, error);
      throw error;
    }
  }

  console.log(`Total logs retrieved: ${allLogs.length}`);
  return allLogs;
}

module.exports = {
  splitBlockRange,
  getLogsWithRangeLimit,
  MAX_BLOCK_RANGE
};