/*
  Staged (ramp) benchmark runner.
  Runs multiple phases sequentially using the existing bench.js logic via autocannon API.
*/
const autocannon = require('autocannon');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../config.env') });

const BASE = process.env.URL || `http://localhost:${process.env.PORT || 3000}`;
const RAW_ENDPOINT =
  process.env.ENDPOINT || process.env.API_PATH || '/api/v1/subjects';
const AUTH_BEARER = process.env.AUTH_BEARER || '';
let endpoint = RAW_ENDPOINT.startsWith('http')
  ? RAW_ENDPOINT
  : `${BASE}${RAW_ENDPOINT.startsWith('/') ? '' : '/'}${RAW_ENDPOINT}`;

// Phases: connections, duration(s)
const phases = [
  { c: 50, d: 10 },
  { c: 100, d: 15 },
  { c: 200, d: 20 },
  { c: 300, d: 20 },
];

const headers = { accept: 'application/json' };
if (AUTH_BEARER) headers.authorization = `Bearer ${AUTH_BEARER}`;

async function runPhase(idx) {
  if (idx >= phases.length) {
    console.log('Ramp complete.');
    return;
  }
  const { c, d } = phases[idx];
  console.log(
    `\nPhase ${idx + 1}/${phases.length} -> ${c} connections for ${d}s`,
  );
  return new Promise((resolve) => {
    autocannon(
      {
        url: endpoint,
        connections: c,
        duration: d,
        pipelining: 1,
        method: 'GET',
        headers,
        title: `phase-${idx + 1}`,
      },
      (err, result) => {
        if (err) console.error('Phase error:', err.message);
        else autocannon.printResult(result, { renderLatencyTable: false });
        resolve();
      },
    );
  }).then(() => runPhase(idx + 1));
}

(async () => {
  console.log('Starting ramp benchmark against:', endpoint);
  await runPhase(0);
})();
