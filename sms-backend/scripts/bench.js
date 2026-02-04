/*
  Quick local load test using autocannon.
  Defaults: GET /api/v1/subjects on localhost.
  Config via env:
    PORT, URL, PATH, CONN, DURATION, PIPES, TITLE, METHOD, AUTH_BEARER
*/
const autocannon = require('autocannon');
const path = require('path');
const dotenv = require('dotenv');

// Load env from project config so PORT and others match server
dotenv.config({ path: path.resolve(__dirname, '../config.env') });

const METHOD = process.env.METHOD || 'GET';
const PORT = process.env.PORT || 3000;
const BASE = process.env.URL || `http://localhost:${PORT}`;
// IMPORTANT: avoid using process.env.PATH (Windows PATH), use ENDPOINT/API_PATH/BENCH_PATH instead
const RAW_ENDPOINT =
  process.env.ENDPOINT ||
  process.env.API_PATH ||
  process.env.BENCH_PATH ||
  '/api/v1/subjects';

// If a full URL is provided in ENDPOINT, use it directly; otherwise join with BASE
let URL = '';
if (/^https?:\/\//i.test(RAW_ENDPOINT)) {
  URL = RAW_ENDPOINT;
} else {
  let endpoint = RAW_ENDPOINT;
  // Sanitize accidental PATH pollution (Windows PATH contains \\ and ;) by falling back to default
  if (/[\\;]/.test(endpoint)) endpoint = '/api/v1/subjects';
  if (!endpoint.startsWith('/')) endpoint = `/${endpoint}`;
  URL = `${BASE}${endpoint}`;
}
const CONN = Number(process.env.CONN || 50);
const DURATION = Number(process.env.DURATION || 10);
const PIPES = Number(process.env.PIPES || 1);
const TITLE = process.env.TITLE || 'quick-bench';
const AUTH_BEARER = process.env.AUTH_BEARER || '';

async function run() {
  console.log('Starting benchmark:');
  console.log('  URL      :', URL);
  console.log('  method   :', METHOD);
  console.log('  conn     :', CONN);
  console.log('  duration :', `${DURATION}s`);
  console.log('  pipelining:', PIPES);

  const headers = { accept: 'application/json' };
  if (AUTH_BEARER) headers.authorization = `Bearer ${AUTH_BEARER}`;

  const instance = autocannon(
    {
      url: URL,
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
      }
      // Pretty print
      autocannon.printResult(result, { renderLatencyTable: true });
    },
  );

  // Gracefully stop on SIGINT
  process.once('SIGINT', () => instance.stop());
}

run();
