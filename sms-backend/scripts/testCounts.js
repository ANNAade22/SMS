// scripts/testCounts.js
// Simple manual test script for /count endpoints with authentication
// Run with: node scripts/testCounts.js (requires server running separately)

const http = require('http');

const BASE = process.env.TEST_BASE || 'http://localhost:8000/api/v1';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const body = data ? JSON.parse(data) : null;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: null,
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

async function login() {
  const url = new URL(`${BASE}/users/login`);
  const loginRes = await makeRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: 'superadmin',
      password: 'Password123!',
    }),
  });

  if (loginRes.status !== 200) {
    throw new Error(`Login failed: ${loginRes.status}`);
  }

  return loginRes.body.token;
}

async function hit(path, token) {
  const url = new URL(`${BASE}${path}`);
  const res = await makeRequest(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return {
    path,
    status: res.status,
    totalHeader: res.headers['x-total-count'],
    cache: res.headers['x-cache'],
    body: res.body,
  };
}

(async () => {
  try {
    console.log('Logging in...');
    const token = await login();
    console.log('Login successful, testing endpoints...');

    const targets = [
      '/students/count',
      '/teachers/count',
      '/classes/count',
      '/subjects/count',
      '/users/count',
      '/users/count?role=teacher',
      // Dashboard endpoints
      '/dashboard/activities',
      '/dashboard/user-stats',
      '/dashboard/class-distribution',
      '/dashboard/performance',
      '/dashboard/attendance-overview',
    ];
    const results = [];
    for (const t of targets) {
      try {
        results.push(await hit(t, token));
      } catch (e) {
        results.push({ path: t, error: e.message });
      }
    }
    console.table(
      results.map((r) => ({
        path: r.path,
        status: r.status,
        totalHeader: r.totalHeader,
        cache: r.cache,
        totalBody: r.body && r.body.total,
      })),
    );
  } catch (error) {
    console.error('Test failed:', error.message);
  }
})();
