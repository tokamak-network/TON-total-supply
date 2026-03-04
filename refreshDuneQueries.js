/**
 * Tokamak Network - Dune Dashboard Query Refresher
 *
 * Executes all 16 saved Dune queries to refresh their cached results.
 * This step costs Dune credits, and can use a separate API key from
 * the report generator.
 *
 * Usage:
 *   DUNE_EXECUTE_API_KEY=xxx node refreshDuneQueries.js
 *   (or set in .env as DUNE_EXECUTE_API_KEY or falls back to DUNE_API_KEY)
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load API Key ───

function loadEnv() {
  try {
    const envPath = join(__dirname, '.env');
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const match = line.match(/^(\w+)=(.+)$/);
        if (match && !process.env[match[1]]) {
          process.env[match[1]] = match[2].trim();
        }
      }
    }
  } catch (_) { /* ignore */ }
}

loadEnv();

// DUNE_EXECUTE_API_KEY for running queries (costs credits)
// Falls back to DUNE_API_KEY if not set separately
const API_KEY = process.env.DUNE_EXECUTE_API_KEY || process.env.DUNE_API_KEY;
if (!API_KEY) {
  console.error('Error: DUNE_EXECUTE_API_KEY (or DUNE_API_KEY) is not set.');
  process.exit(1);
}

const BASE_URL = 'https://api.dune.com/api/v1';
const headers = { 'X-Dune-API-Key': API_KEY };

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 200; // ~10 minutes max per query
const CONCURRENCY = 4; // parallel executions
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Dune API: Check Freshness ───

async function getLastExecutionTime(queryId) {
  const res = await fetch(`${BASE_URL}/query/${queryId}/results?limit=1`, { headers });
  if (!res.ok) return null;

  const data = await res.json();
  const endedAt = data.execution_ended_at;
  if (!endedAt) return null;

  return new Date(endedAt);
}

function isStale(lastExecTime) {
  if (!lastExecTime) return true;
  return (Date.now() - lastExecTime.getTime()) > STALE_THRESHOLD_MS;
}

// ─── Dune API: Execute & Poll ───

async function executeQuery(queryId) {
  const res = await fetch(`${BASE_URL}/query/${queryId}/execute`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ performance: 'medium' }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Execute failed (${res.status}): ${err}`);
  }

  const { execution_id } = await res.json();
  return execution_id;
}

async function pollExecution(executionId) {
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const res = await fetch(`${BASE_URL}/execution/${executionId}/status`, { headers });
    if (!res.ok) {
      throw new Error(`Status check failed (${res.status})`);
    }

    const data = await res.json();
    const state = data.state;

    if (state === 'QUERY_STATE_COMPLETED') {
      return { success: true, state };
    }
    if (state === 'QUERY_STATE_FAILED' || state === 'QUERY_STATE_CANCELLED') {
      return { success: false, state, error: data.error };
    }
    // Still pending/executing, continue polling
  }

  return { success: false, state: 'TIMEOUT', error: 'Polling timeout exceeded' };
}

async function executeAndWait(query) {
  const startTime = Date.now();
  const executionId = await executeQuery(query.id);
  const result = await pollExecution(executionId);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  return {
    ...query,
    executionId,
    elapsed: `${elapsed}s`,
    ...result,
  };
}

// ─── Concurrency Control ───

async function runWithConcurrency(tasks, concurrency, fn) {
  const results = [];
  const queue = [...tasks];

  async function worker() {
    while (queue.length > 0) {
      const task = queue.shift();
      const result = await fn(task);
      results.push(result);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);

  return results;
}

// ─── Main ───

async function main() {
  const queryConfig = JSON.parse(readFileSync(join(__dirname, 'query_ids.json'), 'utf-8'));
  const queries = queryConfig.queries;

  console.log(`\n=== Dune Dashboard Query Refresher ===`);
  console.log(`Queries: ${queries.length}`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log(`API Key: ...${API_KEY.slice(-6)}\n`);

  // Check freshness of each query first
  console.log('Checking cached result freshness...\n');
  const staleQueries = [];
  const freshQueries = [];

  for (const query of queries) {
    const lastExec = await getLastExecutionTime(query.id);
    if (isStale(lastExec)) {
      const age = lastExec
        ? `${((Date.now() - lastExec.getTime()) / 3600000).toFixed(1)}h ago`
        : 'no cached result';
      console.log(`  ⏳ ${query.name} — stale (${age})`);
      staleQueries.push(query);
    } else {
      const age = `${((Date.now() - lastExec.getTime()) / 3600000).toFixed(1)}h ago`;
      console.log(`  ✅ ${query.name} — fresh (${age}), skip`);
      freshQueries.push(query);
    }
  }

  console.log(`\nFresh: ${freshQueries.length}, Stale: ${staleQueries.length}`);

  if (staleQueries.length === 0) {
    console.log('\nAll queries are fresh. No execution needed. Saving credits.');
    return;
  }

  console.log(`\nExecuting ${staleQueries.length} stale queries...\n`);

  const results = await runWithConcurrency(staleQueries, CONCURRENCY, async (query) => {
    console.log(`  [START] ${query.name} (${query.id})`);
    try {
      const result = await executeAndWait(query);
      const icon = result.success ? '✅' : '❌';
      console.log(`  ${icon} ${query.name} — ${result.elapsed}`);
      return result;
    } catch (err) {
      console.log(`  ❌ ${query.name} — Error: ${err.message}`);
      return { ...query, success: false, error: err.message, elapsed: 'N/A' };
    }
  });

  // Summary
  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`\n─── Summary ───`);
  console.log(`✅ Fresh (skipped): ${freshQueries.length}`);
  console.log(`✅ Refreshed: ${succeeded}`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}`);
    for (const r of results.filter((r) => !r.success)) {
      console.log(`   - ${r.name}: ${r.error || r.state}`);
    }
  }

  console.log();

  if (failed > 0) {
    console.error('Some queries failed. Report may have stale data.');
    process.exit(1);
  }

  console.log('All queries are now fresh.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
