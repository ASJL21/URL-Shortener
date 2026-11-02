// Automated test to verify dynamic routing, request handling, and HTTP redirection
const http = require('http');

async function runTests() {
  // Start server locally for test
  process.env.PORT = '3099';
  require('./server.js');

  // Wait 500ms for server to bind
  await new Promise((r) => setTimeout(r, 500));

  console.log('\n--- 🧪 STARTING URL SHORTENER TESTS ---');

  // Test 1: Shorten a new URL
  console.log('\n[Test 1] POST /api/shorten');
  const postData = JSON.stringify({
    originalUrl: 'https://en.wikipedia.org/wiki/Node.js',
    customCode: 'wiki-node'
  });

  const shortenRes = await makeRequest({
    hostname: 'localhost',
    port: 3099,
    path: '/api/shorten',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, postData);

  console.log(`Status: ${shortenRes.statusCode}`);
  console.log(`Response:`, shortenRes.body);
  if (shortenRes.statusCode === 201 && shortenRes.body.data.shortCode === 'wiki-node') {
    console.log('✅ Test 1 Passed: URL shortened successfully with custom alias.');
  } else {
    throw new Error('Test 1 Failed');
  }

  // Test 2: Dynamic Routing & HTTP Redirect (GET /wiki-node)
  console.log('\n[Test 2] GET /:shortUrl dynamic route & redirect header');
  const redirectRes = await makeRequest({
    hostname: 'localhost',
    port: 3099,
    path: '/wiki-node',
    method: 'GET'
  });

  console.log(`Status Code: ${redirectRes.statusCode}`);
  console.log(`Location Header: ${redirectRes.headers['location']}`);

  if (redirectRes.statusCode === 302 && redirectRes.headers['location'] === 'https://en.wikipedia.org/wiki/Node.js') {
    console.log('✅ Test 2 Passed: Dynamic routing received request and issued formal 302 redirect!');
  } else {
    throw new Error('Test 2 Failed: HTTP Redirect headers not properly issued.');
  }

  // Test 3: Verify Clicks Count incremented
  console.log('\n[Test 3] Verify Clicks Count');
  const listRes = await makeRequest({
    hostname: 'localhost',
    port: 3099,
    path: '/api/urls',
    method: 'GET'
  });

  const found = listRes.body.urls.find((u) => u.shortCode === 'wiki-node');
  if (found && found.clicks >= 1) {
    console.log(`✅ Test 3 Passed: Click count successfully incremented to ${found.clicks}.`);
  } else {
    throw new Error('Test 3 Failed: Click count was not recorded.');
  }

  // Test 4: 404 for nonexistent short URL
  console.log('\n[Test 4] GET /nonexistent-random-code (404 check)');
  const notFoundRes = await makeRequest({
    hostname: 'localhost',
    port: 3099,
    path: '/nonexistent-random-code',
    method: 'GET'
  });

  console.log(`Status Code: ${notFoundRes.statusCode}`);
  if (notFoundRes.statusCode === 404) {
    console.log('✅ Test 4 Passed: Non-existent short URL returns 404.');
  } else {
    throw new Error('Test 4 Failed');
  }

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch (_) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

runTests().catch((err) => {
  console.error('❌ Test execution error:', err);
  process.exit(1);
});

