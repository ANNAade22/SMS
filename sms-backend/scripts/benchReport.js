/*
  Benchmark runner with JSON + CSV export.
  Uses autocannon programmatically. Writes results to ./bench-results/
  Env vars (same as bench.js) + OUT (basename, default timestamp) + FORMAT (json,csv,all)
*/
const fs = require('fs');
const path = require('path');
const autocannon = require('autocannon');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../config.env') });

const METHOD = process.env.METHOD || 'GET';
const PORT = process.env.PORT || 3000;
const BASE = process.env.URL || `http://localhost:${PORT}`;
const RAW_ENDPOINT =
  process.env.ENDPOINT || process.env.API_PATH || '/api/v1/subjects';
const AUTH_BEARER = process.env.AUTH_BEARER || '';
const CONN = Number(process.env.CONN || 50);
const DURATION = Number(process.env.DURATION || 10);
const PIPES = Number(process.env.PIPES || 1);
const TITLE = process.env.TITLE || 'bench-report';
const OUT_BASENAME =
  process.env.OUT || new Date().toISOString().replace(/[:.]/g, '-');
const FORMAT = (process.env.FORMAT || 'all').toLowerCase();

let endpoint = '';
if (/^https?:\/\//i.test(RAW_ENDPOINT)) endpoint = RAW_ENDPOINT;
else {
  let ep = RAW_ENDPOINT.startsWith('/') ? RAW_ENDPOINT : `/${RAW_ENDPOINT}`;
  endpoint = `${BASE}${ep}`;
}

const outDir = path.resolve(__dirname, '../bench-results');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function toCSV(result) {
  const rows = [];
  rows.push('metric,value');
  rows.push(`title,${result.title}`);
  rows.push(`requests.total,${result.requests.total}`);
  rows.push(`requests.average,${result.requests.average}`);
  rows.push(`requests.p95,${result.requests.p95}`);
  rows.push(`requests.p99,${result.requests.p99}`);
  rows.push(`latency.average,${result.latency.average}`);
  rows.push(`latency.p50,${result.latency.p50}`);
  rows.push(`latency.p95,${result.latency.p95}`);
  rows.push(`latency.p99,${result.latency.p99}`);
  rows.push(`throughput.total,${result.throughput.total}`);
  rows.push(`errors,${result.errors}`);
  rows.push(`timeouts,${result.timeouts}`);
  return rows.join('\n');
}

function writeFiles(result) {
  if (FORMAT === 'json' || FORMAT === 'all') {
    fs.writeFileSync(
      path.join(outDir, `${OUT_BASENAME}.json`),
      JSON.stringify(result, null, 2),
    );
  }
  if (FORMAT === 'csv' || FORMAT === 'all') {
    fs.writeFileSync(path.join(outDir, `${OUT_BASENAME}.csv`), toCSV(result));
  }
}

console.log('Running benchmark with export:');
console.log({
  endpoint,
  CONN,
  DURATION,
  PIPES,
  METHOD,
  TITLE,
  OUT_BASENAME,
  FORMAT,
});

const headers = { accept: 'application/json' };
if (AUTH_BEARER) headers.authorization = `Bearer ${AUTH_BEARER}`;

const instance = autocannon(
  {
    url: endpoint,
    connections: CONN,
    duration: DURATION,
    pipelining: PIPES,
    method: METHOD,
    headers,
    title: TITLE,
  },
  (err, result) => {
    if (err) {
      console.error('Benchmark error:', err.message);
      process.exitCode = 1;
    } else {
      writeFiles(result);
      console.log('Files written to', outDir);
    }
    autocannon.printResult(result, { renderLatencyTable: true });
  },
);

process.once('SIGINT', () => instance.stop());
