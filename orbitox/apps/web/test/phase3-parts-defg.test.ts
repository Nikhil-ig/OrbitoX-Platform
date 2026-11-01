process.env.APP_DATABASE_URL = process.env.APP_DATABASE_URL || 'postgresql://orbitox_runtime@127.0.0.1:5432/orbitox_phase2';
process.env.PLATFORM_AUDIT_DATABASE_URL = process.env.PLATFORM_AUDIT_DATABASE_URL || 'postgresql://orbitox_platform_admin_audit@127.0.0.1:5432/orbitox_phase2';
process.env.OUTBOX_RELAY_DATABASE_URL = process.env.OUTBOX_RELAY_DATABASE_URL || 'postgresql://orbitox_outbox_relay@127.0.0.1:5432/orbitox_phase2';
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.APP_DATABASE_URL;
}

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as crypto from 'crypto';
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { platformRepository } from '../lib/platform-repository';
import {
  signGrant,
  verifyGrant,
  MemoryRevisionStore,
  canUse,
  GrantError,
  EntitlementClaims,
  LicenceClaims,
  setGrantKeysForTesting,
  getActiveGrantSigner,
  getPublicGrantKeys,
  createEntitlementGrantToken,
  PluginGrantEnforcer,
} from '@orbitox-io/plugin-engine';
import { ControlClient, SignedRuntimeConfiguration } from '@orbitox/external-runtime-sdk';
import { GET as getGrantKeys } from '../app/api/v1/platform/grant-keys/route';
import { POST as postRazorpayWebhook } from '../app/api/v1/billing/webhook/razorpay/route';
import { webhookLedger } from '../lib/razorpay-webhook';
import { POST as postPatient, GET as getPatients } from '../app/api/hospital/patients/route';
import { POST as postLogin } from '../app/api/hospital/security/login/route';
import { hmsGrantEnforcer, hmsRevisionStore } from '../app/api/_lib/route-auth';
import { withTenantTx } from '../lib/tenant-db';
import { createPatient } from '../lib/hms-repository';
import { getPhiKeyRing } from '../lib/phi-crypto';
import { prisma } from '../lib/prisma';

describe('Phase 3 Parts D–G: Rights, Licensing, Enforcement, Webhooks & SDK', () => {
  const TEST_ADMIN_TOKEN = 'test_admin_token_super_secret_32_chars_minimum';
  const RAZORPAY_SECRET = 'test_razorpay_webhook_secret_key_123';

  // Test Ed25519 key pairs
  const k1 = crypto.generateKeyPairSync('ed25519');
  const k2 = crypto.generateKeyPairSync('ed25519');
  const attacker = crypto.generateKeyPairSync('ed25519');

  const pubK1Pem = k1.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const pubK2Pem = k2.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const privK1Pem = k1.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const privK2Pem = k2.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

  let testOrg: any;
  const runId = crypto.randomBytes(4).toString('hex');

  before(async () => {
    process.env.ORBITOX_ADMIN_TOKEN = TEST_ADMIN_TOKEN;
    process.env.PLATFORM_ADMIN_TOKEN = TEST_ADMIN_TOKEN;
    process.env.ORBITOX_RUNTIME_TOKEN = TEST_ADMIN_TOKEN;
    process.env.RAZORPAY_WEBHOOK_SECRET = RAZORPAY_SECRET;

    setGrantKeysForTesting(
      {
        k1: { privateKey: privK1Pem, publicKey: pubK1Pem },
        k2: { privateKey: privK2Pem, publicKey: pubK2Pem },
      },
      'k1'
    );

    await platformRepository.ensurePlanCatalogueSeeded();
    const orgs = await platformRepository.listOrganizations();
    testOrg = orgs.find((o) => o.slug === 'test-org-phase3-dg');
    if (!testOrg) {
      testOrg = await platformRepository.createOrganization({
        name: 'Phase 3 D-G Test Org',
        slug: 'test-org-phase3-dg',
        billingEmail: 'phase3-dg@orbitox.io',
      });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Part D: Grant Security & Verification (7 Reference Tests)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Part D: Grant Cryptographic Security (Port of 7 Reference Tests)', () => {
    const T = 'org/city-care/project/main/environment/prod';
    const now = Date.now();
    const sec = Math.floor(now / 1000);

    const entClaims = (over: Partial<EntitlementClaims> = {}): EntitlementClaims => ({
      typ: 'orbitox-ent',
      iss: 'orbitox',
      aud: 'hospital-os',
      sub: T,
      plan: 'hms-pro',
      status: 'ACTIVE',
      features: ['patients', 'labs'],
      quotas: { patients: { limit: 5000, window: 'none' } },
      rev: 7,
      exp: sec + 900,
      iat: sec,
      nbf: sec - 5,
      jti: crypto.randomUUID(),
      ...over,
    });

    const verifyOpts = (over: any = {}) => ({
      type: 'orbitox-ent' as const,
      audience: 'hospital-os',
      subject: T,
      trustedKeys: { k1: k1.publicKey, k2: k2.publicKey },
      now,
      ...over,
    });

    const reason = (r: string) => (e: any) => e instanceof GrantError && e.reason === r;

    it('1. valid token verifies and gates features (canUse)', async () => {
      const token = signGrant(entClaims(), k1.privateKey, 'k1', now);
      const c = await verifyGrant<EntitlementClaims>(token, verifyOpts());
      assert.equal(c.plan, 'hms-pro');
      assert.equal(canUse(c, 'labs', true), 'ALLOW');
      assert.equal(canUse(c, 'pharmacy', false), 'NOT_IN_PLAN');
      assert.equal(canUse({ ...c, status: 'READ_ONLY' }, 'labs', true), 'READ_ONLY');
      assert.equal(canUse({ ...c, status: 'READ_ONLY' }, 'labs', false), 'ALLOW');
      assert.equal(canUse({ ...c, status: 'SUSPENDED' }, 'labs', false), 'SUSPENDED');
    });

    it('2. rejects forged, tampered, alg-swapped and unknown-key tokens', async () => {
      // Forged with attacker key
      await assert.rejects(
        verifyGrant(signGrant(entClaims(), attacker.privateKey, 'k1', now), verifyOpts()),
        reason('BAD_SIGNATURE')
      );

      // Tampered payload
      const t = signGrant(entClaims(), k1.privateKey, 'k1', now).split('.');
      const t1 = t[1]!;
      const p = JSON.parse(Buffer.from(t1, 'base64url').toString());
      p.features.push('pharmacy');
      p.plan = 'hms-enterprise';
      await assert.rejects(
        verifyGrant([t[0]!, Buffer.from(JSON.stringify(p)).toString('base64url'), t[2]!].join('.'), verifyOpts()),
        reason('BAD_SIGNATURE')
      );

      // alg: none
      const h = Buffer.from(JSON.stringify({ alg: 'none', kid: 'k1', typ: 'orbitox-ent' })).toString('base64url');
      await assert.rejects(verifyGrant([h, t[1], ''].join('.'), verifyOpts()), reason('BAD_ALG'));

      // Unknown kid
      await assert.rejects(verifyGrant(signGrant(entClaims(), k1.privateKey, 'zz', now), verifyOpts()), reason('UNKNOWN_KID'));
      await assert.rejects(verifyGrant(signGrant(entClaims(), k1.privateKey, '__proto__', now), verifyOpts()), reason('UNKNOWN_KID'));

      // Malformed
      await assert.rejects(verifyGrant('a.b', verifyOpts()), reason('MALFORMED'));
    });

    it('3. binds to plugin (aud) and tenant (sub)', async () => {
      const tok = signGrant(entClaims(), k1.privateKey, 'k1', now);
      await assert.rejects(verifyGrant(tok, verifyOpts({ audience: 'restaurant-os' })), reason('WRONG_AUDIENCE'));
      await assert.rejects(
        verifyGrant(tok, verifyOpts({ subject: 'org/other/project/main/environment/prod' })),
        reason('WRONG_SUBJECT')
      );
    });

    it('4. expiry, not-before and max lifetime', async () => {
      await assert.rejects(
        verifyGrant(signGrant(entClaims({ exp: sec + 900 }), k1.privateKey, 'k1', now), verifyOpts({ now: now + 3600_000 })),
        reason('EXPIRED')
      );
      await assert.rejects(
        verifyGrant(signGrant(entClaims(), k1.privateKey, 'k1', now + 600_000), verifyOpts()),
        reason('NOT_YET_VALID')
      );
      assert.throws(
        () => signGrant(entClaims({ exp: sec + 2 * 86400 }), k1.privateKey, 'k1', now),
        reason('LIFETIME_TOO_LONG')
      );
    });

    it('5. rollback protection: an older, more permissive grant is refused after a downgrade/suspension', async () => {
      const store = new MemoryRevisionStore();
      const oldPro = signGrant(entClaims({ rev: 7 }), k1.privateKey, 'k1', now);
      const newSuspended = signGrant(entClaims({ rev: 8, status: 'SUSPENDED' }), k1.privateKey, 'k1', now);
      await verifyGrant(oldPro, verifyOpts({ revisions: store }));
      await verifyGrant(newSuspended, verifyOpts({ revisions: store }));
      await assert.rejects(verifyGrant(oldPro, verifyOpts({ revisions: store })), reason('ROLLBACK'));
    });

    it('6. key rotation: k2 tokens verify while k1 is still trusted; k1 tokens fail after removal', async () => {
      await verifyGrant(signGrant(entClaims(), k2.privateKey, 'k2', now), verifyOpts());
      await assert.rejects(
        verifyGrant(signGrant(entClaims(), k1.privateKey, 'k1', now), verifyOpts({ trustedKeys: { k2: k2.publicKey } })),
        reason('UNKNOWN_KID')
      );
    });

    it('7. licence files are a separate type and cannot be used as entitlements (or vice versa)', async () => {
      const lic = signGrant(
        {
          typ: 'orbitox-lic',
          aud: 'deploy_acme_01',
          sub: 'org_acme',
          plugins: ['hospital-os'],
          maxTenants: 25,
          rev: 1,
          exp: sec + 30 * 86400,
        } as any,
        k1.privateKey,
        'k1',
        now
      );
      const c = await verifyGrant<LicenceClaims>(lic, {
        type: 'orbitox-lic',
        audience: 'deploy_acme_01',
        trustedKeys: { k1: k1.publicKey },
        now,
      });
      assert.equal(c.maxTenants, 25);
      await assert.rejects(verifyGrant(lic, verifyOpts({ audience: 'deploy_acme_01', subject: undefined })), reason('WRONG_TYPE'));
      await assert.rejects(
        verifyGrant(signGrant(entClaims(), k1.privateKey, 'k1', now), {
          type: 'orbitox-lic',
          audience: 'hospital-os',
          trustedKeys: { k1: k1.publicKey },
          now,
        }),
        reason('WRONG_TYPE')
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Part D: Platform Grant Endpoints & HTTP Enforcements
  // ───────────────────────────────────────────────────────────────────────────
  describe('Part D: Platform Grant Endpoints & Request-Time Enforcement', () => {
    let projSlug: string;
    let canonicalTenant: string;

    before(async () => {
      projSlug = `grant-proj-${Date.now()}`;
      canonicalTenant = `org/${testOrg.slug}/project/${projSlug}/environment/production`;
      await platformRepository.createProject({
        name: 'Grant Test Project',
        slug: projSlug,
        organizationId: testOrg.id,
        businessModel: 'HEALTHCARE_NETWORK',
        planTier: 'growth',
        technicalLead: 'Lead Dev',
        contactEmail: 'dev@test.io',
        plugins: [{ pluginId: '@orbitox/hms', planId: 'hms-starter' }],
      });
    });

    it('GET /api/v1/platform/grant-keys publishes public keys by kid without authentication', async () => {
      const req = new NextRequest('http://127.0.0.1:3005/api/v1/platform/grant-keys');
      const res = await getGrantKeys(req);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.keys));
      assert.ok(body.keys.some((k: any) => k.kid === 'k1'));
      assert.ok(body.keys.some((k: any) => k.kid === 'k2'));
      assert.ok(body.publicKeys.k1.includes('BEGIN PUBLIC KEY'));
    });

    it('GET /api/v1/platform/grants rejects unauthorized caller without service auth or bridge signature', async () => {
      const req = new NextRequest(`http://127.0.0.1:3005/api/v1/platform/grants/${canonicalTenant}/@orbitox/hms`);
      const res = await getGrants(req, {
        params: Promise.resolve({ slug: [testOrg.slug, 'project', projSlug, 'environment', 'production', '@orbitox', 'hms'] }),
      });
      assert.equal(res.status, 401);
      const body = await res.json();
      assert.equal(body.error, 'UNAUTHORIZED');
    });

    it('GET /api/v1/platform/grants issues 15-minute compact grant token with service auth', async () => {
      const req = new NextRequest(
        `http://127.0.0.1:3005/api/v1/platform/grants?tenant=${encodeURIComponent(canonicalTenant)}&plugin=@orbitox/hms`,
        {
          headers: {
            Authorization: `Bearer ${TEST_ADMIN_TOKEN}`,
          },
        }
      );
      const res = await getGrants(req, { params: Promise.resolve({ slug: [] }) });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.grant, 'Must return signed token');
      assert.equal(body.status, 'ACTIVE');
      assert.equal(body.planId, 'hms-starter');
      assert.ok(body.features.includes('patients'));

      // Verify the minted token with verifyGrant
      const claims = await verifyGrant<EntitlementClaims>(body.grant, {
        type: 'orbitox-ent',
        audience: '@orbitox/hms',
        subject: canonicalTenant,
        trustedKeys: getPublicGrantKeys(),
      });
      assert.equal(claims.sub, canonicalTenant);
      assert.equal(claims.aud, '@orbitox/hms');
      assert.equal(claims.status, 'ACTIVE');
    });

    it('HospitalOS: feature not in plan returns 403 FEATURE_NOT_IN_PLAN', async () => {
      // Starter plan does NOT have 'labs'
      const token = createEntitlementGrantToken({
        tenantId: canonicalTenant,
        pluginId: '@orbitox/hms',
        planId: 'hms-starter',
        status: 'ACTIVE',
        features: ['patients', 'appointments', 'billing'],
        quotas: { patients: { limit: 500, window: 'none' } },
        revision: 1,
      });

      const enforcer = new PluginGrantEnforcer({
        audience: '@orbitox/hms',
        trustedKeys: getPublicGrantKeys(),
      });

      const res = await enforcer.enforce({
        tenantId: canonicalTenant,
        feature: 'labs',
        write: false,
        token,
      });

      assert.equal(res.allowed, false);
      assert.equal(res.code, 'FEATURE_NOT_IN_PLAN');
      assert.equal(res.status, 403);
    });

    it('HospitalOS: READ_ONLY status permits reads but returns 402 PAYMENT_REQUIRED on write', async () => {
      const token = createEntitlementGrantToken({
        tenantId: canonicalTenant,
        pluginId: '@orbitox/hms',
        planId: 'hms-starter',
        status: 'READ_ONLY',
        features: ['patients', 'appointments', 'billing'],
        quotas: { patients: { limit: 500, window: 'none' } },
        revision: 2,
      });

      const enforcer = new PluginGrantEnforcer({
        audience: '@orbitox/hms',
        trustedKeys: getPublicGrantKeys(),
      });

      // Read -> allowed
      const readRes = await enforcer.enforce({
        tenantId: canonicalTenant,
        feature: 'patients',
        write: false,
        token,
      });
      assert.equal(readRes.allowed, true);

      // Write -> 402 PAYMENT_REQUIRED
      const writeRes = await enforcer.enforce({
        tenantId: canonicalTenant,
        feature: 'patients',
        write: true,
        token,
      });
      assert.equal(writeRes.allowed, false);
      assert.equal(writeRes.code, 'PAYMENT_REQUIRED');
      assert.equal(writeRes.status, 402);
    });

    it('HospitalOS: SUSPENDED status returns 403 SERVICE_SUSPENDED for all requests', async () => {
      const token = createEntitlementGrantToken({
        tenantId: canonicalTenant,
        pluginId: '@orbitox/hms',
        planId: 'hms-starter',
        status: 'SUSPENDED',
        features: ['patients', 'appointments', 'billing'],
        quotas: { patients: { limit: 500, window: 'none' } },
        revision: 3,
      });

      const enforcer = new PluginGrantEnforcer({
        audience: '@orbitox/hms',
        trustedKeys: getPublicGrantKeys(),
      });

      const res = await enforcer.enforce({
        tenantId: canonicalTenant,
        feature: 'patients',
        write: false,
        token,
      });
      assert.equal(res.allowed, false);
      assert.equal(res.code, 'SERVICE_SUSPENDED');
      assert.equal(res.status, 403);
    });

    it('Platform unreachable: keeps using last valid grant until expiration, then refuses writes and allows reads', async () => {
      const enforcer = new PluginGrantEnforcer({
        audience: '@orbitox/hms',
        trustedKeys: getPublicGrantKeys(),
        fetchGrant: async () => {
          throw new Error('Platform unreachable (Connection refused)');
        },
        allowOfflineReads: true,
      });

      const testNow = Date.now();
      const validToken = createEntitlementGrantToken(
        {
          tenantId: canonicalTenant,
          pluginId: '@orbitox/hms',
          planId: 'hms-starter',
          status: 'ACTIVE',
          features: ['patients'],
          quotas: { patients: { limit: 500, window: 'none' } },
          revision: 4,
          ttlSeconds: 60,
        },
        testNow
      );

      // 1. Initial valid grant cached
      const r1 = await enforcer.enforce({
        tenantId: canonicalTenant,
        feature: 'patients',
        write: true,
        token: validToken,
        now: testNow,
      });
      assert.equal(r1.allowed, true);

      // 2. Platform unreachable before expiry -> continues to serve writes
      const r2 = await enforcer.enforce({
        tenantId: canonicalTenant,
        feature: 'patients',
        write: true,
        now: testNow + 30 * 1000,
      });
      assert.equal(r2.allowed, true);

      // 3. Platform unreachable after expiry (at now + 120s) -> refuses writes!
      const rWriteExpired = await enforcer.enforce({
        tenantId: canonicalTenant,
        feature: 'patients',
        write: true,
        now: testNow + 120 * 1000,
      });
      assert.equal(rWriteExpired.allowed, false);
      assert.equal(rWriteExpired.code, 'PLATFORM_UNREACHABLE');

      // 4. Platform unreachable after expiry -> still allows reads!
      const rReadExpired = await enforcer.enforce({
        tenantId: canonicalTenant,
        feature: 'patients',
        write: false,
        now: testNow + 120 * 1000,
      });
      assert.equal(rReadExpired.allowed, true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Part D: P4 Review Requirement: Hard Quotas inside Database Write Transaction
  // ───────────────────────────────────────────────────────────────────────────
  describe('Part D (P4 Review Requirement): Database Hard Quotas in Write Transaction', () => {
    it('20 parallel creates at limit−1 succeed exactly once, with 19 failing with QUOTA_EXCEEDED', async () => {
      const qTenant = `org/${testOrg.slug}/project/quota-proj-${Date.now()}/environment/production`;
      const HARD_LIMIT = 10;
      const ring = getPhiKeyRing();

      // 1. Pre-insert 9 patients so existing count is limit - 1
      for (let i = 1; i <= 9; i++) {
        await withTenantTx(prisma, qTenant, async (tx) => {
          return await createPatient(
            tx,
            ring,
            {
              mrn: `MRN-PRE-${i}-${Date.now()}`,
              name: `Pre-existing Patient ${i}`,
            },
            HARD_LIMIT
          );
        });
      }

      // Verify count is exactly 9 (limit - 1)
      await withTenantTx(prisma, qTenant, async (tx) => {
        const { rows } = await tx.query<{ count: number }>(
          `SELECT count(*)::int AS count FROM "HmsPatient" WHERE "tenantId" = $1`,
          [qTenant]
        );
        assert.equal(Number(rows[0]!.count), 9, 'Must have exactly 9 patients before parallel race');
      });

      // 2. Fire 20 parallel creates concurrently at limit - 1
      const promises = Array.from({ length: 20 }, (_, idx) =>
        withTenantTx(prisma, qTenant, async (tx) => {
          return await createPatient(
            tx,
            ring,
            {
              mrn: `MRN-RACE-${idx}-${Date.now()}`,
              name: `Concurrent Patient ${idx}`,
            },
            HARD_LIMIT
          );
        })
      );

      const results = await Promise.allSettled(promises);

      // 3. Assert exactly 1 succeeds and exactly 19 fail
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      assert.equal(fulfilled.length, 1, `Expected exactly 1 parallel create to succeed, got ${fulfilled.length}`);
      assert.equal(rejected.length, 19, `Expected exactly 19 parallel creates to fail, got ${rejected.length}`);

      for (const rej of rejected) {
        const reason = (rej as PromiseRejectedResult).reason;
        const msg = String(reason?.message || reason?.code || reason);
        assert.ok(
          msg.includes('QUOTA_EXCEEDED') || reason?.code === 'QUOTA_EXCEEDED',
          `Rejection must be QUOTA_EXCEEDED, got: ${msg}`
        );
      }

      // 4. Assert final database count is exactly 10 (hard limit)
      await withTenantTx(prisma, qTenant, async (tx) => {
        const { rows } = await tx.query<{ count: number }>(
          `SELECT count(*)::int AS count FROM "HmsPatient" WHERE "tenantId" = $1`,
          [qTenant]
        );
        assert.equal(Number(rows[0]!.count), 10, 'Final count in database must be exactly 10 (no overshoot)');
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Part E: Push Plus Pull with 5-Second Suspension
  // ───────────────────────────────────────────────────────────────────────────
  describe('Part E: Push Plus Pull with 5-Second Suspension & Rollback Replay', () => {
    let pTenant: string;
    let projSlug: string;

    before(async () => {
      projSlug = `e-proj-${Date.now()}`;
      pTenant = `org/${testOrg.slug}/project/${projSlug}/environment/production`;
      await platformRepository.createProject({
        name: 'Part E Test Project',
        slug: projSlug,
        organizationId: testOrg.id,
        businessModel: 'HEALTHCARE_NETWORK',
        planTier: 'growth',
        technicalLead: 'Lead Dev',
        contactEmail: 'dev@test.io',
        plugins: [{ pluginId: '@orbitox/hms', planId: 'hms-starter' }],
      });
    });

    it('Admin suspends HospitalOS -> writes refused within 5s, logins get error', async () => {
      const startTime = Date.now();

      // 1. Admin suspends HospitalOS for tenant
      await platformRepository.updatePluginInstallationStatus(pTenant, '@orbitox/hms', 'SUSPENDED');
      hmsGrantEnforcer.invalidate(pTenant);

      const elapsed = Date.now() - startTime;
      assert.ok(elapsed < 5000, `Suspension operation took ${elapsed}ms; must be under 5000ms`);

      // 2. Writes refused: verify via enforcer
      const writeDecision = await hmsGrantEnforcer.enforce({
        tenantId: pTenant,
        feature: 'patients',
        write: true,
      });
      assert.equal(writeDecision.allowed, false);
      assert.equal(writeDecision.code, 'SERVICE_SUSPENDED');
      assert.equal(writeDecision.status, 403);
    });

    it('Resume -> access restored within 5s', async () => {
      const startTime = Date.now();

      // Admin resumes HospitalOS
      await platformRepository.updatePluginInstallationStatus(pTenant, '@orbitox/hms', 'ACTIVE');
      hmsGrantEnforcer.invalidate(pTenant);

      const elapsed = Date.now() - startTime;
      assert.ok(elapsed < 5000, `Resume operation took ${elapsed}ms; must be under 5000ms`);

      const writeDecision = await hmsGrantEnforcer.enforce({
        tenantId: pTenant,
        feature: 'patients',
        write: true,
      });
      assert.equal(writeDecision.allowed, true);
    });

    it('Replay rollback protection: an old grant replayed after suspension is refused with ROLLBACK', async () => {
      const revStore = new MemoryRevisionStore();
      const enforcer = new PluginGrantEnforcer({
        audience: '@orbitox/hms',
        trustedKeys: getPublicGrantKeys(),
        revisions: revStore,
      });

      // Grant at revision 10
      const activeRev10 = createEntitlementGrantToken({
        tenantId: pTenant,
        pluginId: '@orbitox/hms',
        planId: 'hms-starter',
        status: 'ACTIVE',
        features: ['patients'],
        quotas: { patients: { limit: 500, window: 'none' } },
        revision: 10,
      });

      // Grant at revision 11 (after suspension)
      const suspendedRev11 = createEntitlementGrantToken({
        tenantId: pTenant,
        pluginId: '@orbitox/hms',
        planId: 'hms-starter',
        status: 'SUSPENDED',
        features: ['patients'],
        quotas: { patients: { limit: 500, window: 'none' } },
        revision: 11,
      });

      // Plugin observes rev 10
      await enforcer.enforce({ tenantId: pTenant, feature: 'patients', write: true, token: activeRev10 });

      // Plugin observes rev 11
      await enforcer.enforce({ tenantId: pTenant, feature: 'patients', write: true, token: suspendedRev11 });

      // Attacker replays rev 10 -> MUST return ROLLBACK
      const replayRes = await enforcer.enforce({ tenantId: pTenant, feature: 'patients', write: true, token: activeRev10 });
      assert.equal(replayRes.allowed, false);
      assert.equal(replayRes.code, 'ROLLBACK');
      assert.equal(replayRes.status, 403);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Part F: Razorpay Billing Webhook & Grace Periods
  // ───────────────────────────────────────────────────────────────────────────
  describe('Part F: Razorpay as Billing Input & Grace Periods', () => {
    let fTenant: string;
    let projSlug: string;

    before(async () => {
      projSlug = `f-proj-${Date.now()}`;
      fTenant = `org/${testOrg.slug}/project/${projSlug}/environment/production`;
      await platformRepository.createProject({
        name: 'Part F Razorpay Project',
        slug: projSlug,
        organizationId: testOrg.id,
        businessModel: 'HEALTHCARE_NETWORK',
        planTier: 'growth',
        technicalLead: 'Lead Dev',
        contactEmail: 'dev@test.io',
        plugins: [{ pluginId: '@orbitox/hms', planId: 'hms-starter' }],
      });
    });

    function createRazorpayWebhookRequest(event: any, signatureOverride?: string): NextRequest {
      const raw = JSON.stringify(event);
      const sig =
        signatureOverride ??
        crypto.createHmac('sha256', RAZORPAY_SECRET).update(raw).digest('hex');

      return new NextRequest('http://127.0.0.1:3005/api/v1/billing/webhook/razorpay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': sig,
        },
        body: raw,
      });
    }

    it('rejects webhooks with invalid or missing HMAC signatures with 400', async () => {
      const event = { id: `evt_forged_${Date.now()}`, event: 'subscription.activated' };
      const req = createRazorpayWebhookRequest(event, 'invalid_signature_hex_code_1234');
      const res = await postRazorpayWebhook(req);
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.error, 'INVALID_SIGNATURE');
    });

    it('processes webhooks idempotently: duplicate event ID returns duplicate: true without re-executing', async () => {
      const eventId = `evt_idem_${Date.now()}`;
      const event = {
        id: eventId,
        event: 'subscription.charged',
        tenantId: fTenant,
        pluginId: '@orbitox/hms',
        notes: { tenantId: fTenant, pluginId: '@orbitox/hms' },
      };

      const req1 = createRazorpayWebhookRequest(event);
      const res1 = await postRazorpayWebhook(req1);
      assert.equal(res1.status, 200);
      const body1 = await res1.json();
      assert.equal(body1.success, true);
      assert.equal(body1.eventId, eventId);

      // Repeat same event
      const req2 = createRazorpayWebhookRequest(event);
      const res2 = await postRazorpayWebhook(req2);
      assert.equal(res2.status, 200);
      const body2 = await res2.json();
      assert.equal(body2.duplicate, true);
      assert.equal(body2.received, true);
    });

    it('payment.failed initiates grace period: Day 0–7 ACTIVE, Day 8 READ_ONLY, Day 31 SUSPENDED', async () => {
      // 1. Put installation in ACTIVE
      await platformRepository.updatePluginInstallationStatus(fTenant, '@orbitox/hms', 'ACTIVE');
      const failedTimeSec = Math.floor(Date.now() / 1000);

      // Day 3 (within 7-day grace period) -> remains ACTIVE
      const evtDay3 = {
        id: `evt_fail_day3_${Date.now()}`,
        event: 'payment.failed',
        notes: { tenantId: fTenant, pluginId: '@orbitox/hms' },
        payload: {
          payment: {
            entity: { created_at: failedTimeSec, notes: { tenantId: fTenant, pluginId: '@orbitox/hms' } },
          },
        },
        testClock: (failedTimeSec + 3 * 86400) * 1000,
      };
      const resDay3 = await postRazorpayWebhook(createRazorpayWebhookRequest(evtDay3));
      assert.equal(resDay3.status, 200);
      const instDay3 = await platformRepository.getPluginInstallation(fTenant, '@orbitox/hms');
      assert.equal(instDay3?.status, 'ACTIVE', 'Day 3 must remain ACTIVE during grace period');

      // Day 8 (after 7 days grace) -> transitions to READ_ONLY
      const evtDay8 = {
        id: `evt_fail_day8_${Date.now()}`,
        event: 'payment.failed',
        notes: { tenantId: fTenant, pluginId: '@orbitox/hms' },
        payload: {
          payment: {
            entity: { created_at: failedTimeSec, notes: { tenantId: fTenant, pluginId: '@orbitox/hms' } },
          },
        },
        testClock: (failedTimeSec + 8 * 86400) * 1000,
      };
      const resDay8 = await postRazorpayWebhook(createRazorpayWebhookRequest(evtDay8));
      assert.equal(resDay8.status, 200);
      const instDay8 = await platformRepository.getPluginInstallation(fTenant, '@orbitox/hms');
      assert.equal(instDay8?.status, 'READ_ONLY', 'Day 8 must transition to READ_ONLY');

      // Day 31 (after 30 days grace) -> transitions to SUSPENDED
      const evtDay31 = {
        id: `evt_fail_day31_${Date.now()}`,
        event: 'payment.failed',
        notes: { tenantId: fTenant, pluginId: '@orbitox/hms' },
        payload: {
          payment: {
            entity: { created_at: failedTimeSec, notes: { tenantId: fTenant, pluginId: '@orbitox/hms' } },
          },
        },
        testClock: (failedTimeSec + 31 * 86400) * 1000,
      };
      const resDay31 = await postRazorpayWebhook(createRazorpayWebhookRequest(evtDay31));
      assert.equal(resDay31.status, 200);
      const instDay31 = await platformRepository.getPluginInstallation(fTenant, '@orbitox/hms');
      assert.equal(instDay31?.status, 'SUSPENDED', 'Day 31 must transition to SUSPENDED');

      // Subsequent payment.captured -> restores ACTIVE
      const evtPaid = {
        id: `evt_paid_${Date.now()}`,
        event: 'payment.captured',
        notes: { tenantId: fTenant, pluginId: '@orbitox/hms' },
        payload: {
          payment: {
            entity: { notes: { tenantId: fTenant, pluginId: '@orbitox/hms' } },
          },
        },
      };
      const resPaid = await postRazorpayWebhook(createRazorpayWebhookRequest(evtPaid));
      assert.equal(resPaid.status, 200);
      const instPaid = await platformRepository.getPluginInstallation(fTenant, '@orbitox/hms');
      assert.equal(instPaid?.status, 'ACTIVE', 'Payment captured restores ACTIVE status');
    });

    it('subscription.cancelled transitions installation to SUSPENDED', async () => {
      const evtCancel = {
        id: `evt_cancel_${Date.now()}`,
        event: 'subscription.cancelled',
        notes: { tenantId: fTenant, pluginId: '@orbitox/hms' },
        payload: {
          subscription: {
            entity: { notes: { tenantId: fTenant, pluginId: '@orbitox/hms' } },
          },
        },
      };
      const resCancel = await postRazorpayWebhook(createRazorpayWebhookRequest(evtCancel));
      assert.equal(resCancel.status, 200);
      const inst = await platformRepository.getPluginInstallation(fTenant, '@orbitox/hms');
      assert.equal(inst?.status, 'SUSPENDED');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Part G: Runtime SDK Signature Check
  // ───────────────────────────────────────────────────────────────────────────
  describe('Part G: Runtime SDK Signature Check Against Pinned Ed25519 Keys', () => {
    function signConfigWithEd25519(config: Partial<SignedRuntimeConfiguration>, privKey: crypto.KeyObject, kid = 'k1'): string {
      const header = Buffer.from(JSON.stringify({ alg: 'EdDSA', kid, typ: 'orbitox-cfg' })).toString('base64url');
      const body = Buffer.from(
        JSON.stringify({
          projectId: config.projectId,
          configVersion: config.configVersion,
          revisionNumber: config.revisionNumber,
          issuedAt: config.issuedAt,
        })
      ).toString('base64url');
      const sig = crypto.sign(null, Buffer.from(`${header}.${body}`), privKey);
      return `${header}.${body}.${Buffer.from(sig).toString('base64url')}`;
    }

    it('accepts validly signed configuration matching pinned Ed25519 keys', () => {
      const client = new ControlClient({
        manifest: {
          projectId: 'proj_pilot_01',
          slug: 'pilot',
          name: 'Pilot OS',
          type: 'restaurant-os',
          version: '1.0.0',
          runtime: { type: 'standalone', entrypoint: 'src/server.ts', defaultPort: 4010, healthEndpoint: '/health' },
          enabledPlugins: [],
          enabledFeatures: ['orders'],
          apis: [],
          planReferences: [],
          environmentMetadata: { defaultEnvironment: 'production', supportedEnvironments: ['production'] },
          platformController: { controlPlaneUrl: 'http://localhost:3005', syncIntervalSeconds: 30, requireSignedConfig: true },
          capabilities: [],
        },
        pinnedPublicKeys: { k1: k1.publicKey },
      });

      const config: SignedRuntimeConfiguration = {
        configVersion: 100,
        revisionNumber: 2,
        projectId: 'proj_pilot_01',
        environment: 'production',
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400 * 1000).toISOString(),
        features: { orders: true, kds: true },
        entitlements: {},
        apiPolicies: {},
        mcpTools: [],
        desiredState: {},
        signature: '',
      };
      config.signature = signConfigWithEd25519(config, k1.privateKey, 'k1');

      const verified = client.verifyConfigSignature(config);
      assert.equal(verified, true, 'Config signed with pinned k1 must verify');
    });

    it('rejects unsigned configuration and preserves previous configuration', async () => {
      const client = new ControlClient({
        manifest: {
          projectId: 'proj_pilot_01',
          slug: 'pilot',
          name: 'Pilot OS',
          type: 'restaurant-os',
          version: '1.0.0',
          runtime: { type: 'standalone', entrypoint: 'src/server.ts', defaultPort: 4010, healthEndpoint: '/health' },
          enabledPlugins: [],
          enabledFeatures: ['orders'],
          apis: [],
          planReferences: [],
          environmentMetadata: { defaultEnvironment: 'production', supportedEnvironments: ['production'] },
          platformController: { controlPlaneUrl: 'http://localhost:3005', syncIntervalSeconds: 30, requireSignedConfig: true },
          capabilities: [],
        },
        pinnedPublicKeys: { k1: k1.publicKey },
      });

      const unsignedConfig: any = {
        configVersion: 101,
        revisionNumber: 3,
        projectId: 'proj_pilot_01',
        features: { orders: true, hacked: true },
        signature: '', // Unsigned!
      };

      const verified = client.verifyConfigSignature(unsignedConfig);
      assert.equal(verified, false, 'Unsigned configuration must be rejected');
    });

    it('rejects tampered or forged signature and preserves previous configuration', () => {
      const client = new ControlClient({
        manifest: {
          projectId: 'proj_pilot_01',
          slug: 'pilot',
          name: 'Pilot OS',
          type: 'restaurant-os',
          version: '1.0.0',
          runtime: { type: 'standalone', entrypoint: 'src/server.ts', defaultPort: 4010, healthEndpoint: '/health' },
          enabledPlugins: [],
          enabledFeatures: ['orders'],
          apis: [],
          planReferences: [],
          environmentMetadata: { defaultEnvironment: 'production', supportedEnvironments: ['production'] },
          platformController: { controlPlaneUrl: 'http://localhost:3005', syncIntervalSeconds: 30, requireSignedConfig: true },
          capabilities: [],
        },
        pinnedPublicKeys: { k1: k1.publicKey },
      });

      const config: SignedRuntimeConfiguration = {
        configVersion: 102,
        revisionNumber: 4,
        projectId: 'proj_pilot_01',
        environment: 'production',
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400 * 1000).toISOString(),
        features: { orders: true },
        entitlements: {},
        apiPolicies: {},
        mcpTools: [],
        desiredState: {},
        signature: '',
      };

      // Attacker signs with unpinned key
      config.signature = signConfigWithEd25519(config, attacker.privateKey, 'k1');
      assert.equal(client.verifyConfigSignature(config), false, 'Attacker signature must be rejected');

      // Tampered payload with k1 signature
      const validSig = signConfigWithEd25519(config, k1.privateKey, 'k1');
      const parts = validSig.split('.');
      const tamperedBody = Buffer.from(JSON.stringify({ projectId: 'other_proj' })).toString('base64url');
      config.signature = `${parts[0]}.${tamperedBody}.${parts[2]}`;
      assert.equal(client.verifyConfigSignature(config), false, 'Tampered payload must be rejected');
    });
  });
});
