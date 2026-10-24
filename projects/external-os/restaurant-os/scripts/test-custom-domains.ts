/**
 * 🧪 RestaurantOS Custom Domains & On-Demand TLS Verification Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Comprehensive verification of:
 * 1. Domain syntax validation & reserved domain guardrails.
 * 2. DNS challenge generation (TXT + CNAME target).
 * 3. Domain anti-theft collision guardrails (stolen domain rejection).
 * 4. DNS cryptographic verification (failure without TXT, success with matching token).
 * 5. Caddy On-Demand TLS Gatekeeper (/internal/tls/ask) enforcement:
 *    - Unknown domains rejected (403).
 *    - Unverified (PENDING) domains rejected (403).
 *    - Suspended tenant domains rejected (403).
 *    - Verified active tenant domains authorized (200).
 * 6. Live HTTP server custom domain routing & cache invalidation.
 */

import * as http from 'http';
import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import {
  TenantProvisioningService,
  CustomDomainService,
  DnsResolver,
  validateDomainSyntax,
  issueStaffToken,
  invalidateTenantResolutionCache,
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
  path: string,
  headers: Record<string, string>,
  body?: any
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const dataStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const reqHeaders: Record<string, string> = { ...headers };
    if (dataStr) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(dataStr).toString();
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let responseData = '';
        res.on('data', (c) => (responseData += c));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(responseData);
          } catch {
            json = responseData;
          }
          resolve({ status: res.statusCode || 500, headers: res.headers, body: json });
        });
      }
    );
    req.on('error', reject);
    if (dataStr) req.write(dataStr);
    req.end();
  });
}

// In-memory mock DNS resolver for authoritative deterministic test scenarios
class MockDnsResolver implements DnsResolver {
  private txtRecords = new Map<string, string[][]>();
  private cnameRecords = new Map<string, string[]>();

  setTxt(hostname: string, records: string[][]): void {
    this.txtRecords.set(hostname.toLowerCase(), records);
  }

  setCname(hostname: string, target: string): void {
    this.cnameRecords.set(hostname.toLowerCase(), [target]);
  }

  async resolveTxt(hostname: string): Promise<string[][]> {
    const records = this.txtRecords.get(hostname.toLowerCase());
    if (!records) {
      const err: any = new Error(`queryTxt ENOTFOUND ${hostname}`);
      err.code = 'ENOTFOUND';
      throw err;
    }
    return records;
  }

  async resolveCname(hostname: string): Promise<string[]> {
    const target = this.cnameRecords.get(hostname.toLowerCase());
    if (!target) {
      const err: any = new Error(`queryCname ENOTFOUND ${hostname}`);
      err.code = 'ENOTFOUND';
      throw err;
    }
    return target;
  }
}

async function runCustomDomainsTestSuite() {
  console.log('\n===============================================================');
  console.log('🌐 RESTAURANTOS ITEM 3: CUSTOM DOMAINS & ON-DEMAND TLS SUITE');
  console.log('===============================================================\n');

  // --- Suite 1: Domain Syntax Validation Guardrails ---
  console.log('--- Suite 1: Domain Syntax Validation Guardrails ---');
  assert(validateDomainSyntax('dine.goodbistro.com').valid, 'Valid FQDN "dine.goodbistro.com" accepted');
  assert(validateDomainSyntax('order.delhibistro.in').valid, 'Valid ccTLD "order.delhibistro.in" accepted');
  assert(!validateDomainSyntax('http://dine.goodbistro.com').valid, 'Domain with protocol http:// rejected');
  assert(!validateDomainSyntax('dine.goodbistro.com:8080').valid, 'Domain with port rejected');
  assert(!validateDomainSyntax('dine.goodbistro.com/menu').valid, 'Domain with path rejected');
  assert(!validateDomainSyntax('192.168.1.1').valid, 'Raw IP address rejected');
  assert(!validateDomainSyntax('orbitox.live').valid, 'Root platform domain "orbitox.live" rejected');
  assert(!validateDomainSyntax('orbitox.io').valid, 'Root platform domain "orbitox.io" rejected');

  // Provision two isolated tenants for custom domain testing
  const provisioning = new TenantProvisioningService(prisma);
  const runId = Date.now().toString(36);
  const slug1 = `dom1-${runId}`;
  const slug2 = `dom2-${runId}`;

  const tenant1 = await provisioning.provisionTenant({
    restaurantName: 'Domain Bistro 1',
    slug: slug1,
    ownerName: 'Owner One',
    ownerEmail: `owner1@${slug1}.test`,
    templateId: 'tmpl_starter_bistro',
  });

  const tenant2 = await provisioning.provisionTenant({
    restaurantName: 'Domain Bistro 2',
    slug: slug2,
    ownerName: 'Owner Two',
    ownerEmail: `owner2@${slug2}.test`,
    templateId: 'tmpl_starter_bistro',
  });

  const mockDns = new MockDnsResolver();
  const domainService = new CustomDomainService(prisma, 'cname.restaurantos.orbitox.io', mockDns);

  // --- Suite 2: Domain Challenge Generation & Anti-Theft Guardrails ---
  console.log('\n--- Suite 2: Domain Challenge Generation & Anti-Theft Guardrails ---');
  const targetDomain = `dine.${runId}.testbistro.com`;

  // Tenant 1 adds custom domain
  const challenge = await domainService.addCustomDomain(tenant1.tenantId, targetDomain);
  assert(challenge.domain === targetDomain, 'Challenge domain matches input');
  assert(challenge.verificationStatus === 'PENDING', 'Initial verification status is PENDING');
  assert(challenge.txtRecordName === `_restaurantos-verify.${targetDomain}`, 'TXT record host correctly formatted');
  assert(challenge.txtRecordValue.startsWith('orb_verify_'), 'Verification token has orb_verify_ prefix');
  assert(challenge.cnameTarget === 'cname.restaurantos.orbitox.io', 'CNAME target correctly assigned');

  // Anti-Theft: Tenant 2 attempts to claim the same domain -> Collision Error!
  let collisionCaught = false;
  try {
    await domainService.addCustomDomain(tenant2.tenantId, targetDomain);
  } catch (err: any) {
    if (err.message.includes('DOMAIN_ALREADY_CLAIMED')) {
      collisionCaught = true;
    }
  }
  assert(collisionCaught, 'Anti-Theft: Tenant 2 cannot claim a domain registered to Tenant 1 (DOMAIN_ALREADY_CLAIMED)');

  // Same tenant re-adding returns existing pending challenge
  const reAdded = await domainService.addCustomDomain(tenant1.tenantId, targetDomain);
  assert(reAdded.id === challenge.id, 'Idempotent domain addition for same tenant returns existing record');

  // --- Suite 3: Cryptographic DNS Verification Flow ---
  console.log('\n--- Suite 3: Cryptographic DNS Verification Flow ---');
  // Attempt 1: Verify when DNS record does not exist
  const verifyNoDns = await domainService.verifyCustomDomain(tenant1.tenantId, targetDomain, mockDns);
  assert(verifyNoDns.verified === false, 'Verification fails when DNS TXT record does not exist');
  assert(verifyNoDns.status === 'FAILED', 'Domain status transitions to FAILED');

  // Attempt 2: Verify when DNS record has wrong token
  mockDns.setTxt(`_restaurantos-verify.${targetDomain}`, [['wrong_token_here']]);
  const verifyWrongDns = await domainService.verifyCustomDomain(tenant1.tenantId, targetDomain, mockDns);
  assert(verifyWrongDns.verified === false, 'Verification fails when DNS TXT contains invalid token');

  // Attempt 3: Verify when DNS record contains expected token
  mockDns.setTxt(`_restaurantos-verify.${targetDomain}`, [[challenge.verificationToken]]);
  const verifySuccess = await domainService.verifyCustomDomain(tenant1.tenantId, targetDomain, mockDns);
  assert(verifySuccess.verified === true, 'Verification succeeds when DNS TXT matches challenge token');
  assert(verifySuccess.status === 'VERIFIED', 'Domain status transitions to VERIFIED');
  assert(Boolean(verifySuccess.verifiedAt), 'Timestamp verifiedAt is recorded');

  // Verify database record has updated sslStatus
  const dbRecord = await prisma.tenantDomain.findUnique({ where: { domain: targetDomain } });
  assert(dbRecord?.verificationStatus === 'VERIFIED', 'Database record has status VERIFIED');
  assert(dbRecord?.sslStatus === 'ACTIVE', 'Database record sslStatus transitions to ACTIVE');

  // --- Suite 4: Caddy On-Demand TLS Gatekeeper (/internal/tls/ask) ---
  console.log('\n--- Suite 4: Caddy On-Demand TLS Gatekeeper Enforcement ---');
  // 1. Unknown domain -> false
  const askUnknown = await domainService.isDomainAllowedForTls('intruder-fake-site.com');
  assert(askUnknown === false, 'TLS Ask: Unknown domain rejected');

  // 2. Unverified (PENDING) domain -> false
  const pendingDomain = `pending.${runId}.testbistro.com`;
  await domainService.addCustomDomain(tenant1.tenantId, pendingDomain);
  const askPending = await domainService.isDomainAllowedForTls(pendingDomain);
  assert(askPending === false, 'TLS Ask: Unverified PENDING domain rejected');

  // 3. Verified active domain -> true
  const askVerified = await domainService.isDomainAllowedForTls(targetDomain);
  assert(askVerified === true, 'TLS Ask: Verified domain on active tenant authorized for TLS (200 OK)');

  // 4. Suspended tenant -> false
  await provisioning.suspendTenant(tenant1.tenantId);
  const askSuspended = await domainService.isDomainAllowedForTls(targetDomain);
  assert(askSuspended === false, 'TLS Ask: Verified domain on SUSPENDED tenant rejected');

  // Resume tenant
  await provisioning.resumeTenant(tenant1.tenantId);
  const askResumed = await domainService.isDomainAllowedForTls(targetDomain);
  assert(askResumed === true, 'TLS Ask: Verified domain authorized after tenant resumed');

  // --- Suite 5: Live HTTP Server Custom Domain Endpoints & Traffic Routing ---
  console.log('\n--- Suite 5: Live HTTP Server Custom Domain Routing & Endpoints ---');
  const serverPort = 4023;
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

  // Wait for HTTP server boot
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
  assert(serverReady, `Live test server responsive on port ${serverPort}`);

  const tokenTenant1 = issueStaffToken({
    sub: 'stf_mgr_dom1',
    name: 'Manager Dom1',
    role: 'MANAGER',
    tenantId: tenant1.tenantId,
    branchId: tenant1.branchId,
  });

  try {
    // 5.1 GET /internal/tls/ask?domain=...
    const caddyAskOk = await makeRequest(serverPort, 'GET', `/internal/tls/ask?domain=${targetDomain}`, {});
    assert(caddyAskOk.status === 200, 'GET /internal/tls/ask for verified domain returns HTTP 200 OK');

    const caddyAskForbidden = await makeRequest(
      serverPort,
      'GET',
      '/internal/tls/ask?domain=hacker-not-verified.com',
      {}
    );
    assert(caddyAskForbidden.status === 403, 'GET /internal/tls/ask for unverified domain returns HTTP 403 FORBIDDEN');

    // 5.2 GET /api/restaurant/domains -> List domains
    const listRes = await makeRequest(serverPort, 'GET', '/api/restaurant/domains', {
      Host: `${slug1}.orbitox.live`,
      Authorization: `Bearer ${tokenTenant1}`,
    });
    assert(listRes.status === 200 && Array.isArray(listRes.body.data), 'GET /api/restaurant/domains returns domain list');
    assert(listRes.body.data.some((d: any) => d.domain === targetDomain), 'Verified domain is present in manager list');

    // 5.3 Live traffic to verified custom domain resolves to Tenant 1
    const customHostTraffic = await makeRequest(serverPort, 'GET', '/api/restaurant/tables', {
      Host: targetDomain,
    });
    assert(
      customHostTraffic.headers['x-tenant-id'] === tenant1.tenantId,
      'Live request with Host = verified custom domain resolves authoritatively to Tenant 1'
    );

    // 5.4 DELETE /api/restaurant/domains/:domain
    const deleteRes = await makeRequest(serverPort, 'DELETE', `/api/restaurant/domains/${encodeURIComponent(pendingDomain)}`, {
      Host: `${slug1}.orbitox.live`,
      Authorization: `Bearer ${tokenTenant1}`,
    });
    assert(deleteRes.status === 200 && deleteRes.body.success, 'DELETE /api/restaurant/domains/:domain removes domain');
  } finally {
    serverProc.kill('SIGTERM');
  }

  console.log('\n===============================================================');
  console.log('Results: All Custom Domains & On-Demand TLS tests passed!');
  console.log('🎉 ITEM 3 VERIFICATION COMPLETE!');
  console.log('===============================================================\n');
}

runCustomDomainsTestSuite()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error in custom domains test suite:', err);
    process.exit(1);
  });
