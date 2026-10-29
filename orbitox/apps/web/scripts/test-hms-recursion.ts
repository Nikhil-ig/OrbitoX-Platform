import http from 'http';

async function runSelfRecursionTest() {
  let requestCount = 0;
  const PORT = 3999;
  const TARGET_URL = `http://127.0.0.1:${PORT}/api/hospital/security/login`;

  const server = http.createServer(async (req, res) => {
    requestCount++;
    const currentCount = requestCount;

    // Simulate what authenticatedHospitalFetch does:
    // It forwards the request to ORBITOX_BACKEND_URL (default http://localhost:PORT)
    try {
      if (currentCount > 200) {
        // Circuit breaker for test safety so process does not crash memory
        res.writeHead(508, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Loop detected', depth: currentCount }));
        return;
      }

      const response = await fetch(TARGET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      });

      const data = await response.json();
      res.writeHead(response.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (err: any) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message, count: currentCount }));
    }
  });

  await new Promise<void>((resolve) => server.listen(PORT, '127.0.0.1', () => resolve()));

  console.log(`Test server running on port ${PORT}. Initiating first request...`);

  try {
    const res = await fetch(TARGET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initial: true }),
    });
    const result = await res.json();
    console.log(`Final response status: ${res.status}`);
    console.log(`Total requests handled before resolution/termination: ${requestCount}`);
    console.log(`Response body:`, result);
  } catch (err: any) {
    console.error(`Request failed with error: ${err.message}`);
    console.log(`Total requests handled before failure: ${requestCount}`);
  } finally {
    server.close();
  }
}

runSelfRecursionTest();
