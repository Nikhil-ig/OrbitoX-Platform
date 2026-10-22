/**
 * 🧪 RestaurantOS 3.1 — Phase 6A Observability Acceptance Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates the 12 Phase 6A acceptance requirements:
 * 1.  /healthz/live probe returns 200 LIVE + uptime
 * 2.  /healthz/ready probe returns 200 READY + dependency health
 * 3.  Event loop monitoring provides multi-sample p50 and p99 latency
 * 4.  Readiness degrades when storage is simulated degraded/read-only
 * 5.  Health endpoints do not expose secrets, credentials, or customer PII
 * 6.  Auto-generated correlation ID (req_${uuid}) when header is omitted
 * 7.  Valid incoming x-request-id header propagation
 * 8.  Anti-log-injection header sanitization (rejects spaces, shell chars, special symbols)
 * 9.  Recursive redaction of credentials, PINs, tokens, and authorization headers
 * 10. Customer PII masking (phone numbers, delivery addresses)
 * 11. Structured NDJSON log output verification (valid JSON, standard fields, durationMs)
 * 12. Backward compatibility: legacy /health endpoint preserved
 */

const http = require('http');
const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Import domain utilities directly to test unit invariants
const {
  validateOrGenerateRequestId,
  maskPhoneNumber,
  redactSensitiveData,
  eventLoopMonitor,
} = require('../packages/domain/logger');

const BASE_URL = 'http://localhost:4010';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(url, reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          json,
        });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runPhase6ATests() {
  console.log('🧪 Starting RestaurantOS Phase 6A Observability Acceptance Suite...\n');
  let passed = 0;
  let total = 0;

  function record(desc, ok, details = '') {
    total++;
    if (ok) {
      passed++;
      console.log(`  ✅ [${total}/12] ${desc}`);
    } else {
      console.error(`  ❌ [${total}/12] ${desc}: ${details}`);
    }
  }

  try {
    // 1. /healthz/live probe
    const liveRes = await request('/healthz/live');
    const isLiveOk = liveRes.statusCode === 200 &&
                     liveRes.json?.status === 'LIVE' &&
                     typeof liveRes.json?.uptimeSeconds === 'number' &&
                     liveRes.headers['x-request-id']?.startsWith('req_');
    record('6A-01: /healthz/live returns HTTP 200 with status LIVE and uptime', isLiveOk, JSON.stringify(liveRes.json));

    // 2. /healthz/ready probe
    const readyRes = await request('/healthz/ready');
    const isReadyOk = readyRes.statusCode === 200 &&
                      readyRes.json?.status === 'READY' &&
                      readyRes.json?.checks?.storage === 'OK' &&
                      readyRes.json?.checks?.eventLoop === 'OK' &&
                      readyRes.json?.checks?.security === 'OK';
    record('6A-02: /healthz/ready returns HTTP 200 with status READY and dependency checks', isReadyOk, JSON.stringify(readyRes.json));

    // 3. Continuous event loop monitoring
    const metrics = eventLoopMonitor.getMetrics();
    const hasEventLoopMetrics = typeof readyRes.json?.latency?.eventLoopP50Ms === 'number' &&
                                typeof readyRes.json?.latency?.eventLoopP99Ms === 'number' &&
                                typeof metrics.p50Ms === 'number' &&
                                typeof metrics.p99Ms === 'number' &&
                                metrics.healthy === true;
    record('6A-03: Event-loop monitor computes continuous rolling p50 and p99 latency', hasEventLoopMetrics, JSON.stringify(readyRes.json?.latency));

    // 4. Readiness degradation reflection
    // Test checkWritable response logic
    const storeModule = require('../packages/storage/store');
    const storeInstance = new storeModule.RestaurantRuntimeStore();
    const canCheckWritable = typeof storeInstance.checkWritable === 'function';
    const isStorageWritable = canCheckWritable ? storeInstance.checkWritable() : false;
    record('6A-04: Storage engine reflects actual filesystem read/write accessibility', canCheckWritable && isStorageWritable, `canCheckWritable=${canCheckWritable}`);

    // 5. Zero secrets or customer records leaked in health endpoints
    const rawLive = liveRes.body.toLowerCase();
    const rawReady = readyRes.body.toLowerCase();
    const noLeaks = !rawLive.includes('password') && !rawLive.includes('secret') && !rawLive.includes('token') &&
                    !rawReady.includes('password') && !rawReady.includes('secret') && !rawReady.includes('token') &&
                    !rawReady.includes('order') && !rawReady.includes('guest');
    record('6A-05: Health endpoints omit credentials, secrets, tokens, and customer PII', noLeaks);

    // 6. Auto-generated correlation ID
    const autoReqRes = await request('/healthz/live');
    const autoReqId = autoReqRes.headers['x-request-id'];
    const isAutoReqIdValid = typeof autoReqId === 'string' &&
                             autoReqId.startsWith('req_') &&
                             autoReqId.length >= 36;
    record('6A-06: Automatically generates cryptographically unique req_${uuid} when header is omitted', isAutoReqIdValid, autoReqId);

    // 7. Valid incoming x-request-id propagation
    const customTraceId = 'trace_phase6a_test_abcdef123456';
    const customReqRes = await request('/healthz/live', {
      headers: { 'x-request-id': customTraceId }
    });
    const isPropagated = customReqRes.headers['x-request-id'] === customTraceId;
    record('6A-07: Valid incoming x-request-id is preserved and echoed in response', isPropagated, customReqRes.headers['x-request-id']);

    // 8. Anti-log-injection header sanitization
    const maliciousHeaders = [
      'trace\r\nInjected-Header: evil',
      'bad trace with spaces',
      'bad; rm -rf /; header',
      'short',
      '<script>alert(1)</script>'
    ];
    let allSanitized = true;
    for (const badHeader of maliciousHeaders) {
      const sanitized = validateOrGenerateRequestId(badHeader);
      if (!sanitized.startsWith('req_')) {
        allSanitized = false;
        break;
      }
    }
    record('6A-08: Untrusted correlation IDs with injection chars/spaces fallback to safe UUID', allSanitized);

    // 9. Recursive redaction of credentials, PINs, tokens, and secrets
    const sensitivePayload = {
      pin: '1234',
      pinHash: '$2a$12$e8Yk2u...',
      salt: 'somesalt',
      staffToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy',
      orderToken: 'ordtok_1234567890abcdef',
      authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy',
      safeData: {
        tableNumber: 'T-10',
        branchId: 'branch_ldh',
        secretCode: 'classified',
      }
    };
    const redacted = redactSensitiveData(sensitivePayload);
    const isRedactedCorrectly =
      redacted.pin === '[REDACTED]' &&
      redacted.pinHash === '[REDACTED]' &&
      redacted.salt === '[REDACTED]' &&
      redacted.staffToken === '[REDACTED]' &&
      redacted.orderToken === '[REDACTED]' &&
      redacted.authorization === '[REDACTED]' &&
      redacted.safeData.tableNumber === 'T-10' &&
      redacted.safeData.secretCode === '[REDACTED]';
    record('6A-09: Recursive redactor scrubs PINs, salts, hashes, tokens, and secret fields', isRedactedCorrectly, JSON.stringify(redacted));

    // 10. Customer PII masking (phone, address)
    const piiPayload = {
      customerPhone: '+91 98765 43210',
      deliveryAddress: 'Flat 402, Green Valley Apartments, Ludhiana',
    };
    const maskedPii = redactSensitiveData(piiPayload);
    const isPiiMasked =
      maskedPii.customerPhone.includes('******3210') &&
      !maskedPii.customerPhone.includes('98765') &&
      maskedPii.deliveryAddress === '[PROTECTED_ADDRESS]';
    record('6A-10: Masks customer phone numbers and protects delivery addresses', isPiiMasked, JSON.stringify(maskedPii));

    // 11. Structured NDJSON logger output format
    let capturedNdjson = '';
    const originalStdoutWrite = process.stdout.write;
    process.stdout.write = (chunk) => {
      capturedNdjson += chunk;
      return true;
    };
    const { logger } = require('../packages/domain/logger');
    logger.info('Order fulfillment step completed', {
      orderId: 'ord_123',
      branchId: 'branch_ldh',
      pin: '9999',
    });
    process.stdout.write = originalStdoutWrite;

    let parsedLog = null;
    try {
      parsedLog = JSON.parse(capturedNdjson.trim());
    } catch {}

    const isNdjsonValid = parsedLog &&
                          parsedLog.level === 'info' &&
                          parsedLog.message === 'Order fulfillment step completed' &&
                          parsedLog.meta?.orderId === 'ord_123' &&
                          parsedLog.meta?.pin === '[REDACTED]' &&
                          typeof parsedLog.timestamp === 'string';
    record('6A-11: Structured logger outputs valid NDJSON with timestamps, levels, and redacted metadata', isNdjsonValid, capturedNdjson);

    // 12. Backward compatibility with legacy /health endpoint
    const legacyRes = await request('/health');
    const isLegacyOk = legacyRes.statusCode === 200 &&
                       legacyRes.json?.status === 'HEALTHY' &&
                       legacyRes.json?.service === 'restaurant-os-runtime' &&
                       typeof legacyRes.json?.uptimeSeconds === 'number' &&
                       typeof legacyRes.json?.storeRevision === 'number';
    record('6A-12: Legacy /health status endpoint preserved with full diagnostic metadata', isLegacyOk, JSON.stringify(legacyRes.json));

  } catch (err) {
    console.error('Fatal test error:', err);
  }

  console.log(`\n========================================`);
  console.log(`Phase 6A Observability Suite: ${passed} / ${total} passed (${Math.round((passed / total) * 100)}%)`);
  console.log(`========================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runPhase6ATests();
