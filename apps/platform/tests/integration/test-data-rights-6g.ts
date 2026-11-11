import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync, type ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, describe, it } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';
import { Pool } from 'pg';
import { signBridgeRequest } from '@orbitox-io/bridge';
import {
  FORBIDDEN_EXPORT_COLUMNS,
  readZipArchive,
  verifyExportArchive,
} from '@/server/data-rights/archive';
import {
  extractDeletionCertPublicKeys,
  verifyDeletionCertificate,
} from '@/server/data-rights/deletion-certificate';
import { LocalObjectStore } from '@/server/data-rights/object-store';
import {
  createDefaultDataRightsAdapters,
  processDueOrganizationDeletions,
  processExportJobs,
  purgeExpiredExports,
  setBillingCancellationProviderForTesting,
  type BillingCancellationProvider,
} from '@/server/data-rights/service';
import { createPatient, generateMrn } from '@/server/hospital/hms-repository';
import {
  CUSTOMER_CSRF_COOKIE,
  CUSTOMER_SESSION_COOKIE,
  loginCustomer,
} from '@/server/accounts/account-service';
import {
  decryptAccountEmailPayload,
  generateTotpSecret,
  hashAccountPassword,
  newAccountToken,
  newSessionTokens,
  sealTotpSecret,
} from '@/server/auth/account-security';
import { getPhiKeyRing } from '@/server/hospital/phi-crypto';
import { platformRepository } from '@/server/db/platform-repository';
import { withTenantTx } from '@/server/db/tenant-db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../..');
const orbitoxRoot = path.resolve(repoRoot, 'orbitox');
const restaurantRoot = path.resolve(repoRoot, 'services/restaurant-api');

function allocateFreePort(preferred: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', () => {
      const fb = net.createServer();
      fb.once('error', reject);
      fb.listen(0, '127.0.0.1', () => {
        const addr = fb.address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;
        fb.close(() => resolve(port));
      });
    });
    srv.listen(preferred, '127.0.0.1', () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      srv.close(() => resolve(port));
    });
  });
}

function genEd25519Pair() {
  const pair = crypto.generateKeyPairSync('ed25519');
  return {
    privateKey: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    publicKey: pair.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  };
}

function currentTotpCode(secret: string, now = Date.now()): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const normalized = secret.toUpperCase().replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of normalized) {
    const idx = alphabet.indexOf(ch);
    if (idx < 0) throw new Error(`Invalid base32 char: ${ch}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  const key = Buffer.from(bytes);
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30_000)));
  const digest = crypto.createHmac('sha1', key).update(counter).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 1_000_000).padStart(6, '0');
}

// Configure test cryptographic keys BEFORE importing Next route handlers that read env lazily
const phiKeyHex = crypto.randomBytes(32).toString('base64');
const phiIndexKeyB64 = crypto.randomBytes(32).toString('base64');
const grantPair = genEd25519Pair();
const certPair = genEd25519Pair();
const bridgeSecretHex = crypto.randomBytes(32).toString('hex');

(process.env as Record<string, string | undefined>).NODE_ENV = process.env.NODE_ENV || 'test';
process.env.ORBITOX_PLATFORM_REPOSITORY = 'prisma';
process.env.ORBITOX_BREACHED_PASSWORD_API = 'off';
process.env.ORBITOX_PUBLIC_BASE_URL = process.env.ORBITOX_PUBLIC_BASE_URL || 'https://console.orbitox.test';
process.env.ORBITOX_PHI_KEYS = process.env.ORBITOX_PHI_KEYS || JSON.stringify({ k1: phiKeyHex });
process.env.ORBITOX_PHI_ACTIVE_KID = process.env.ORBITOX_PHI_ACTIVE_KID || 'k1';
process.env.ORBITOX_PHI_INDEX_KEY = process.env.ORBITOX_PHI_INDEX_KEY || phiIndexKeyB64;
process.env.ORBITOX_GRANT_SIGNING_KEYS = JSON.stringify({ k1: grantPair });
process.env.ORBITOX_GRANT_PUBLIC_KEYS = JSON.stringify({ k1: { publicKey: grantPair.publicKey } });
process.env.ORBITOX_DELETION_CERT_KEYS = JSON.stringify({ cert_k1: certPair });
process.env.ORBITOX_DELETION_CERT_KEY_ACTIVE = 'cert_k1';
process.env.ORBITOX_MFA_ENCRYPTION_KEY = process.env.ORBITOX_MFA_ENCRYPTION_KEY || crypto.randomBytes(32).toString('base64');
process.env.ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY = process.env.ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY || crypto.randomBytes(32).toString('base64');
process.env.ORBITOX_SERVER_PEPPER = process.env.ORBITOX_SERVER_PEPPER || 'test_server_pepper_32_characters_long_6g';
process.env.ORBITOX_ADMIN_TOKEN = process.env.ORBITOX_ADMIN_TOKEN || 'test_admin_token_32_characters_long_6g';
process.env.ORBITOX_ADMIN_TOKEN_SCOPES = 'GET:/api/*,POST:/api/*,PUT:/api/*,PATCH:/api/*,DELETE:/api/*';
process.env.ORBITOX_BRIDGE_KEYS = JSON.stringify({ activeKeyId: 'k1', keys: { k1: bridgeSecretHex } });
process.env.ORBITOX_BRIDGE_ACTIVE_KID = 'k1';
process.env.TRUST_PROXY = 'true';

const platformOwnerUrl =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://apple@127.0.0.1:5432/orbitox_phase2';
const platformRuntimeUrl =
  process.env.APP_DATABASE_URL ||
  'postgresql://orbitox_runtime:phase2-local-app@127.0.0.1:5432/orbitox_phase2';
const platformMaintUrl =
  process.env.MAINTENANCE_DATABASE_URL ||
  'postgresql://orbitox_maintenance:phase2-local-maint@127.0.0.1:5432/orbitox_phase2';
const platformAuditUrl =
  process.env.PLATFORM_AUDIT_DATABASE_URL ||
  'postgresql://orbitox_platform_admin_audit:phase2-local-audit@127.0.0.1:5432/orbitox_phase2';
const hmsAuditUrl =
  process.env.HMS_AUDIT_DATABASE_URL ||
  'postgresql://hms_audit_reader:phase2-local-hms-audit@127.0.0.1:5432/orbitox_phase2';
const restaurantOwnerUrl =
  process.env.RESTAURANT_OS_DATABASE_URL ||
  'postgresql://apple@127.0.0.1:5432/restaurant_os';
const restaurantAppPassword = process.env.RESTAURANT_OS_APP_PASSWORD || 'test_app_pass_123';
const restaurantAppUrl =
  process.env.RESTAURANT_OS_APP_DATABASE_URL ||
  (() => {
    const u = new URL(restaurantOwnerUrl);
    u.username = 'restaurantos_app';
    u.password = restaurantAppPassword;
    return u.toString();
  })();

process.env.DATABASE_URL = platformOwnerUrl;
process.env.TEST_DATABASE_URL = platformOwnerUrl;
process.env.APP_DATABASE_URL = platformRuntimeUrl;
process.env.MAINTENANCE_DATABASE_URL = platformMaintUrl;
process.env.PLATFORM_AUDIT_DATABASE_URL = platformAuditUrl;
process.env.HMS_AUDIT_DATABASE_URL = hmsAuditUrl;

describe('Phase 6G G1-G5 End-to-End PostgreSQL Integration Suite', () => {
  const ownerPrisma = new PrismaClient({ datasourceUrl: platformOwnerUrl });
  const runtimePrisma = new PrismaClient({ datasourceUrl: platformRuntimeUrl });
  const maintenancePrisma = new PrismaClient({ datasourceUrl: platformMaintUrl });
  const hmsAuditPrisma = new PrismaClient({ datasourceUrl: hmsAuditUrl });
  const platformPool = new Pool({ connectionString: platformOwnerUrl });
  const restaurantPool = new Pool({ connectionString: restaurantOwnerUrl });

  const suffix = crypto.randomBytes(4).toString('hex');
  const tempDirs: string[] = [];
  let objectStoreRoot = '';
  let objectStore: LocalObjectStore;
  let restaurantServer: ChildProcess | null = null;
  let restaurantBaseUrl = '';

  const createdUserIds: string[] = [];
  let orgAId = '';
  let orgASlug = '';
  let projAId = '';
  let envAId = '';
  let tenantA = '';
  let rawKeyA = '';
  let keyAId = '';
  let ownerAUserId = '';
  let ownerAEmail = '';
  let ownerATotpSecret = '';
  let adminAUserId = '';
  let adminAEmail = '';
  let adminATotpSecret = '';
  let memberAUserId = '';
  let memberAEmail = '';
  const sharedPassword = 'Pass6G!StrongPassword#2026';
  let ownerASessionToken = '';
  let ownerACsrfToken = '';
  let adminASessionToken = '';
  let adminACsrfToken = '';

  let orgBId = '';
  let orgBSlug = '';
  let projBId = '';
  let envBId = '';
  let tenantB = '';
  let rawKeyB = '';
  let keyBId = '';
  let ownerBUserId = '';
  let ownerBEmail = '';
  let ownerBSessionToken = '';
  let ownerBCsrfToken = '';

  let hmsStaffAId = '';
  let hmsPatA1Id = '';
  let hmsPatA1Mrn = '';
  let hmsPatA2Id = '';
  let hmsBedAId = '';
  let hmsInvAId = '';
  let hmsStaffBId = '';
  let hmsPatB1Id = '';
  let hmsPatB1Mrn = '';
  let hmsInvBId = '';

  const restGuestAId = `gst_a_${suffix}`;
  const restOrderAId = `ord_a_${suffix}`;
  const restBranchBId = `branch_b_${suffix}`;
  const restGuestBId = `gst_b_${suffix}`;
  const restOrderBId = `ord_b_${suffix}`;

  const canaryA = {
    patientName: `Aarav CanaryA1 ${suffix}`,
    patientPhone: `+91987650${suffix.slice(0, 4).replace(/[a-f]/g, '1')}`,
    allergies: `PenicillinCanaryA_${suffix}`,
    guestName: `DinerCanaryA_${suffix}`,
    guestEmail: `diner-a-${suffix}@example.invalid`,
  };
  const canaryB = {
    patientName: `Vikram SecretB1 ${suffix}`,
    patientPhone: `+91987659${suffix.slice(0, 4).replace(/[a-f]/g, '9')}`,
    allergies: `PeanutSecretB_${suffix}`,
    guestName: `DinerSecretB_${suffix}`,
    guestEmail: `diner-b-${suffix}@example.invalid`,
  };

  let subAId = `sub_a_${suffix}`;
  let subBId = `sub_b_${suffix}`;
  const billingCancellations: Array<{ subscriptionId: string; idempotencyKey: string }> = [];
  const mockBillingProvider: BillingCancellationProvider = {
    async cancelAtPeriodEnd(subscriptionId, idempotencyKey) {
      billingCancellations.push({ subscriptionId, idempotencyKey });
    },
  };

  let orgBRowSnapshotPlatform: Map<string, number> = new Map();
  let orgBRowSnapshotRestaurant: Map<string, number> = new Map();

  function makeCustomerRequest(
    method: string,
    urlPath: string,
    sessionToken: string,
    csrfToken: string,
    body?: unknown,
  ): NextRequest {
    const headers = new Headers({
      cookie: `${CUSTOMER_SESSION_COOKIE}=${sessionToken}; ${CUSTOMER_CSRF_COOKIE}=${csrfToken}`,
      origin: 'https://console.orbitox.test',
    });
    if (method !== 'GET' && method !== 'HEAD') {
      headers.set('content-type', 'application/json');
      headers.set('x-csrf-token', csrfToken);
    }
    return new NextRequest(`https://console.orbitox.test${urlPath}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  }

  function makeHmsApiRequest(
    method: string,
    urlPath: string,
    tenantId: string,
    apiSecret: string,
    body?: unknown,
  ): NextRequest {
    const headers = new Headers({
      authorization: `Bearer ${apiSecret}`,
      'x-tenant-id': tenantId,
      'x-orbitox-tenant': tenantId,
      'content-type': 'application/json',
    });
    return new NextRequest(`https://console.orbitox.test${urlPath}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  }

  async function discoverOrgColumns(pool: Pool): Promise<Array<{ table: string; column: string }>> {
    const { rows } = await pool.query<{ table_name: string; column_name: string }>(`
      SELECT c.table_name, c.column_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name
      WHERE c.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND (
          c.column_name ~* '(organization|tenant|project)'
          OR (c.table_name = 'PlatformApiKey' AND c.column_name = 'environmentId')
        )
      ORDER BY c.table_name, c.column_name
    `);
    return rows.map((r) => ({ table: r.table_name, column: r.column_name }));
  }

  async function countMatchingRows(
    pool: Pool,
    table: string,
    column: string,
    identifiers: string[],
  ): Promise<number> {
    if (identifiers.length === 0) return 0;
    const colInfo = await pool.query<{ data_type: string }>(
      `SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
      [table, column],
    );
    const dataType = colInfo.rows[0]?.data_type;
    if (dataType === 'ARRAY') {
      const { rows } = await pool.query<{ cnt: number }>(
        `SELECT count(*)::int AS cnt FROM public."${table}" WHERE "${column}" && $1::text[]`,
        [identifiers],
      );
      return Number(rows[0]?.cnt ?? 0);
    }
    if (dataType !== 'text' && dataType !== 'character varying') {
      return 0;
    }
    const { rows } = await pool.query<{ cnt: number }>(
      `SELECT count(*)::int AS cnt FROM public."${table}" WHERE "${column}" = ANY($1::text[])`,
      [identifiers],
    );
    return Number(rows[0]?.cnt ?? 0);
  }

  async function snapshotOrgBRows(): Promise<{
    platform: Map<string, number>;
    restaurant: Map<string, number>;
  }> {
    const idsB = [orgBId, projBId, envBId, tenantB];
    const platCols = await discoverOrgColumns(platformPool);
    const platMap = new Map<string, number>();
    for (const { table, column } of platCols) {
      platMap.set(`${table}.${column}`, await countMatchingRows(platformPool, table, column, idsB));
    }
    const restCols = await discoverOrgColumns(restaurantPool);
    const restMap = new Map<string, number>();
    for (const { table, column } of restCols) {
      restMap.set(`${table}.${column}`, await countMatchingRows(restaurantPool, table, column, idsB));
    }
    return { platform: platMap, restaurant: restMap };
  }

  before(async () => {
    setBillingCancellationProviderForTesting(mockBillingProvider);
    objectStoreRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'orbitox-6g-store-'));
    tempDirs.push(objectStoreRoot);
    objectStore = new LocalObjectStore({
      rootDir: objectStoreRoot,
      signingSecret: 'local-6g-object-store-signing-secret-32chars',
    });

    // Verify RestaurantOS server uses the non-superuser RLS runtime role restaurantos_app (G-6 #3)
    const appCheckPool = new Pool({ connectionString: restaurantAppUrl });
    try {
      const roleCheck = await appCheckPool.query<{
        current_user: string;
        rolsuper: boolean;
        rolbypassrls: boolean;
      }>(
        `SELECT current_user, r.rolsuper, r.rolbypassrls
         FROM pg_roles r
         WHERE r.rolname = current_user`,
      );
      const appRole = roleCheck.rows[0];
      assert.equal(appRole?.current_user, 'restaurantos_app');
      assert.equal(appRole?.rolsuper, false, 'restaurantos_app must NOT be superuser');
      assert.equal(appRole?.rolbypassrls, false, 'restaurantos_app must NOT bypass RLS');
    } finally {
      await appCheckPool.end();
    }

    // Launch real RestaurantOS server on a dedicated port backed by PostgreSQL (non-superuser RLS role)
    const port = await allocateFreePort(4120);
    restaurantBaseUrl = `http://127.0.0.1:${port}`;
    const restLogs: string[] = [];
    restaurantServer = spawn('pnpm', ['exec', 'tsx', 'src/server.ts'], {
      cwd: restaurantRoot,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: String(port),
        HOSTNAME: '127.0.0.1',
        STORAGE_DRIVER: 'postgres',
        DATABASE_URL: restaurantAppUrl,
        RESTAURANTOS_DISABLE_AUTOLISTEN: 'false',
        ORBITOX_BRIDGE_KEYS: process.env.ORBITOX_BRIDGE_KEYS,
        ORBITOX_BRIDGE_ACTIVE_KID: 'k1',
        ORBITOX_GRANT_PUBLIC_KEYS: process.env.ORBITOX_GRANT_PUBLIC_KEYS,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    restaurantServer.stdout?.on('data', (d) => restLogs.push(d.toString()));
    restaurantServer.stderr?.on('data', (d) => restLogs.push(d.toString()));

    let ready = false;
    for (let i = 0; i < 80; i++) {
      if (restaurantServer.exitCode !== null) {
        throw new Error(`RestaurantOS server exited (${restaurantServer.exitCode}): ${restLogs.join('')}`);
      }
      try {
        const res = await fetch(`${restaurantBaseUrl}/healthz/ready`);
        if (res.status === 200 || res.status === 503) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 150));
    }
    if (!ready) {
      throw new Error(`RestaurantOS server timed out starting: ${restLogs.join('')}`);
    }

    // Seed Org A and Org B
    const now = new Date();
    const passHash = await hashAccountPassword(sharedPassword);

    const orgA = await ownerPrisma.platformOrganization.create({
      data: { name: `Org Alpha ${suffix}`, slug: `org-alpha-${suffix}`, billingEmail: `owner-a-${suffix}@example.invalid` },
    });
    const orgB = await ownerPrisma.platformOrganization.create({
      data: { name: `Org Beta ${suffix}`, slug: `org-beta-${suffix}`, billingEmail: `owner-b-${suffix}@example.invalid` },
    });
    orgAId = orgA.id;
    orgASlug = orgA.slug;
    orgBId = orgB.id;
    orgBSlug = orgB.slug;

    ownerAEmail = `owner-a-${suffix}@example.invalid`;
    ownerATotpSecret = generateTotpSecret();
    adminAEmail = `admin-a-${suffix}@example.invalid`;
    adminATotpSecret = generateTotpSecret();
    memberAEmail = `member-a-${suffix}@example.invalid`;
    ownerBEmail = `owner-b-${suffix}@example.invalid`;

    const [uOwnerA, uAdminA, uMemberA, uOwnerB] = await Promise.all([
      ownerPrisma.customerUser.create({
        data: { email: ownerAEmail, passwordHash: passHash, emailVerifiedAt: now, mfaTotpSealed: sealTotpSecret(ownerATotpSecret) },
      }),
      ownerPrisma.customerUser.create({
        data: { email: adminAEmail, passwordHash: passHash, emailVerifiedAt: now, mfaTotpSealed: sealTotpSecret(adminATotpSecret) },
      }),
      ownerPrisma.customerUser.create({
        data: { email: memberAEmail, passwordHash: passHash, emailVerifiedAt: now },
      }),
      ownerPrisma.customerUser.create({
        data: { email: ownerBEmail, passwordHash: passHash, emailVerifiedAt: now, mfaTotpSealed: sealTotpSecret(generateTotpSecret()) },
      }),
    ]);
    ownerAUserId = uOwnerA.id;
    adminAUserId = uAdminA.id;
    memberAUserId = uMemberA.id;
    ownerBUserId = uOwnerB.id;
    createdUserIds.push(ownerAUserId, adminAUserId, memberAUserId, ownerBUserId);

    await ownerPrisma.customerMembership.createMany({
      data: [
        { organizationId: orgAId, userId: ownerAUserId, role: 'OWNER' },
        { organizationId: orgAId, userId: adminAUserId, role: 'ADMIN' },
        { organizationId: orgAId, userId: memberAUserId, role: 'MEMBER' },
        { organizationId: orgBId, userId: ownerBUserId, role: 'OWNER' },
      ],
    });

    const sessOwnerA = newSessionTokens();
    ownerASessionToken = sessOwnerA.sessionToken;
    ownerACsrfToken = sessOwnerA.csrfToken;
    const sessAdminA = newSessionTokens();
    adminASessionToken = sessAdminA.sessionToken;
    adminACsrfToken = sessAdminA.csrfToken;
    const sessOwnerB = newSessionTokens();
    ownerBSessionToken = sessOwnerB.sessionToken;
    ownerBCsrfToken = sessOwnerB.csrfToken;

    await ownerPrisma.customerSession.createMany({
      data: [
        {
          userId: ownerAUserId,
          tokenHash: sessOwnerA.sessionTokenHash,
          csrfTokenHash: sessOwnerA.csrfTokenHash,
          createdAt: now,
          lastSeenAt: now,
          idleExpiresAt: new Date(now.getTime() + 3600_000),
          absoluteExpiresAt: new Date(now.getTime() + 86400_000),
          reauthenticatedAt: now,
          ipAddress: '127.0.0.1',
        },
        {
          userId: adminAUserId,
          tokenHash: sessAdminA.sessionTokenHash,
          csrfTokenHash: sessAdminA.csrfTokenHash,
          createdAt: now,
          lastSeenAt: now,
          idleExpiresAt: new Date(now.getTime() + 3600_000),
          absoluteExpiresAt: new Date(now.getTime() + 86400_000),
          reauthenticatedAt: now,
          ipAddress: '127.0.0.1',
        },
        {
          userId: ownerBUserId,
          tokenHash: sessOwnerB.sessionTokenHash,
          csrfTokenHash: sessOwnerB.csrfTokenHash,
          createdAt: now,
          lastSeenAt: now,
          idleExpiresAt: new Date(now.getTime() + 3600_000),
          absoluteExpiresAt: new Date(now.getTime() + 86400_000),
          reauthenticatedAt: now,
          ipAddress: '127.0.0.1',
        },
      ],
    });

    const projA = await ownerPrisma.platformProject.create({
      data: {
        name: `Project Alpha ${suffix}`,
        slug: `proj-alpha-${suffix}`,
        organizationId: orgAId,
        businessModel: 'B2B_SAAS',
        planTier: 'enterprise',
        technicalLead: 'Lead A',
        contactEmail: ownerAEmail,
        enabledServices: ['hms', 'restaurant'],
      },
    });
    const projB = await ownerPrisma.platformProject.create({
      data: {
        name: `Project Beta ${suffix}`,
        slug: `proj-beta-${suffix}`,
        organizationId: orgBId,
        businessModel: 'B2B_SAAS',
        planTier: 'enterprise',
        technicalLead: 'Lead B',
        contactEmail: ownerBEmail,
        enabledServices: ['hms', 'restaurant'],
      },
    });
    projAId = projA.id;
    projBId = projB.id;

    const [envA, envB] = await Promise.all([
      ownerPrisma.projectEnvironment.create({
        data: { name: 'Production', slug: 'production', projectId: projAId, isProduction: true },
      }),
      ownerPrisma.projectEnvironment.create({
        data: { name: 'Production', slug: 'production', projectId: projBId, isProduction: true },
      }),
    ]);
    envAId = envA.id;
    envBId = envB.id;
    tenantA = `org/${orgAId}/project/${projAId}/environment/${envAId}`;
    tenantB = `org/${orgBId}/project/${projBId}/environment/${envBId}`;

    const [kA, kB] = await Promise.all([
      platformRepository.createApiKey({
        name: `Key A ${suffix}`,
        environmentId: envAId,
        projectId: projAId,
        capabilities: ['write', 'hms:read', 'hms:write', 'hms.patients.write', 'hms.data_rights', 'admin'],
        tenantScope: [tenantA, '*'],
        createdBy: ownerAUserId,
      }),
      platformRepository.createApiKey({
        name: `Key B ${suffix}`,
        environmentId: envBId,
        projectId: projBId,
        capabilities: ['write', 'hms:read', 'hms:write', 'hms.patients.write', 'hms.data_rights', 'admin'],
        tenantScope: [tenantB, '*'],
        createdBy: ownerBUserId,
      }),
    ]);
    rawKeyA = kA.rawSecret;
    keyAId = kA.keyRecord.id;
    rawKeyB = kB.rawSecret;
    keyBId = kB.keyRecord.id;

    // Seed plugin installations & active billing plans for A & B
    for (const [tid, oid, sid, plug, plan] of [
      [tenantA, orgAId, `${subAId}_hms`, '@orbitox/hms', 'hms-starter'],
      [tenantA, orgAId, `${subAId}_rest`, '@orbitox/restaurant', 'restaurant-starter'],
      [tenantB, orgBId, `${subBId}_hms`, '@orbitox/hms', 'hms-starter'],
      [tenantB, orgBId, `${subBId}_rest`, '@orbitox/restaurant', 'restaurant-starter'],
    ] as const) {
      await platformRepository.provisionPluginInstallation({
        tenantId: tid,
        runtimeTenantId: tid,
        pluginId: plug,
        status: 'ACTIVE',
        planId: plan,
      });
      const razorpayPlanId = `plan_${plan}_${suffix}`.replace(/[^A-Za-z0-9_]/g, '_');
      const planMap = await ownerPrisma.billingPlanMap.upsert({
        where: { razorpayPlanId },
        update: { active: true },
        create: {
          razorpayPlanId,
          internalPlanId: plan,
          pluginId: plug,
          amountMinor: 99900,
          currency: 'INR',
          period: 'monthly',
          interval: 1,
          active: true,
        },
      });
      await ownerPrisma.billingSubscription.create({
        data: {
          razorpaySubscriptionId: sid.slice(0, 32),
          organizationId: oid,
          tenantId: tid,
          pluginId: plug,
          razorpayPlanId: planMap.razorpayPlanId,
          status: 'active',
          currentEnd: new Date(now.getTime() + 30 * 86400_000),
        },
      });
    }

    // Seed HMS data for Tenant A & Tenant B
    const ring = getPhiKeyRing();
    await withTenantTx(ownerPrisma, tenantA, async (tx) => {
      await tx.query(`INSERT INTO "HmsDepartment"(id, name) VALUES ($1, $2)`, [`dep_a_${suffix}`, 'Cardiology A']);
      await tx.query(`INSERT INTO "HmsWard"(id, "departmentId", name) VALUES ($1, $2, $3)`, [`ward_a_${suffix}`, `dep_a_${suffix}`, 'Ward A1']);
      hmsBedAId = `bed_a_${suffix}`;
      await tx.query(`INSERT INTO "HmsBed"(id, "wardId", label, "dailyRateMinor") VALUES ($1, $2, $3, 150000)`, [hmsBedAId, `ward_a_${suffix}`, 'A-101']);
      hmsStaffAId = `doc_a_${suffix}`;
      const sealedDocName = (await import('@/server/hospital/phi-crypto')).seal(ring, 'Dr. Alpha', { tenantId: tenantA, column: 'name', rowId: hmsStaffAId });
      const docEmailBlind = (await import('@/server/hospital/phi-crypto')).blindIndex(ring, `doc-a-${suffix}@hms.test`, 'email', tenantA, 'email');
      await tx.query(`INSERT INTO "HmsStaff"(id, "nameSealed", "emailBlind", role) VALUES ($1, $2, $3, 'DOCTOR')`, [hmsStaffAId, sealedDocName, docEmailBlind]);

      const p1 = await createPatient(tx, ring, {
        mrn: generateMrn(),
        name: canaryA.patientName,
        phone: canaryA.patientPhone,
        allergies: canaryA.allergies,
        emergencyContact: '9999900001',
        dateOfBirth: '1990-05-15',
        ageBand: '18-39',
        gender: 'M',
      });
      hmsPatA1Id = p1.id;
      hmsPatA1Mrn = p1.mrn;

      const p2 = await createPatient(tx, ring, {
        mrn: generateMrn(),
        name: `Secondary PatientA2 ${suffix}`,
        phone: '+919800000002',
      });
      hmsPatA2Id = p2.id;

      hmsInvAId = `inv_a_${suffix}`;
      await tx.query(`INSERT INTO "HmsInvoice"(id, "patientId", "totalMinor") VALUES ($1, $2, 50000)`, [hmsInvAId, hmsPatA1Id]);
    });

    await withTenantTx(ownerPrisma, tenantB, async (tx) => {
      await tx.query(`INSERT INTO "HmsDepartment"(id, name) VALUES ($1, $2)`, [`dep_b_${suffix}`, 'Orthopedics B']);
      await tx.query(`INSERT INTO "HmsWard"(id, "departmentId", name) VALUES ($1, $2, $3)`, [`ward_b_${suffix}`, `dep_b_${suffix}`, 'Ward B1']);
      await tx.query(`INSERT INTO "HmsBed"(id, "wardId", label, "dailyRateMinor") VALUES ($1, $2, $3, 250000)`, [`bed_b_${suffix}`, `ward_b_${suffix}`, 'B-101']);
      hmsStaffBId = `doc_b_${suffix}`;
      const sealedDocName = (await import('@/server/hospital/phi-crypto')).seal(ring, 'Dr. Beta', { tenantId: tenantB, column: 'name', rowId: hmsStaffBId });
      const docEmailBlind = (await import('@/server/hospital/phi-crypto')).blindIndex(ring, `doc-b-${suffix}@hms.test`, 'email', tenantB, 'email');
      await tx.query(`INSERT INTO "HmsStaff"(id, "nameSealed", "emailBlind", role) VALUES ($1, $2, $3, 'DOCTOR')`, [hmsStaffBId, sealedDocName, docEmailBlind]);

      const pB = await createPatient(tx, ring, {
        mrn: generateMrn(),
        name: canaryB.patientName,
        phone: canaryB.patientPhone,
        allergies: canaryB.allergies,
        dateOfBirth: '1985-08-20',
      });
      hmsPatB1Id = pB.id;
      hmsPatB1Mrn = pB.mrn;
      hmsInvBId = `inv_b_${suffix}`;
      await tx.query(`INSERT INTO "HmsInvoice"(id, "patientId", "totalMinor") VALUES ($1, $2, 80000)`, [hmsInvBId, hmsPatB1Id]);
    });

    // Seed RestaurantOS Tenant A & B via signed bridge /orbitox/lifecycle/provision + direct rows
    const keys = { activeKeyId: 'k1', keys: { k1: bridgeSecretHex } };
    for (const [tid, slug, restaurantName] of [
      [tenantA, `rest-a-${suffix}`, `Bistro Alpha ${suffix}`],
      [tenantB, `rest-b-${suffix}`, `Bistro Beta ${suffix}`],
    ] as const) {
      const bodyStr = JSON.stringify({
        planId: 'restaurant-starter',
        slug,
        restaurantName,
        revision: 1,
        idempotencyKey: `prov_${slug}`,
      });
      const hdrs = signBridgeRequest(keys, {
        method: 'POST',
        pathWithQuery: '/orbitox/lifecycle/provision',
        tenantId: tid,
        principal: { sub: 'platform_orchestrator', scopes: ['platform:superuser', 'tenant:admin'] },
        body: bodyStr,
      });
      const resp = await fetch(`${restaurantBaseUrl}/orbitox/lifecycle/provision`, {
        method: 'POST',
        headers: { ...hdrs, 'content-type': 'application/json' },
        body: bodyStr,
      });
      assert.ok(
        resp.status === 200 || resp.status === 201,
        `Provision RestaurantOS ${tid} failed (${resp.status}): ${await resp.clone().text()}`,
      );
    }

    // Seed Guest + RestaurantOrder in both RestaurantOS DB tenants
    const brA = await restaurantPool.query<{ id: string }>(`SELECT id FROM "Branch" WHERE "tenantId"=$1 LIMIT 1`, [tenantA]);
    const brB = await restaurantPool.query<{ id: string }>(`SELECT id FROM "Branch" WHERE "tenantId"=$1 LIMIT 1`, [tenantB]);
    const branchAId = brA.rows[0]?.id || `branch_a_${suffix}`;
    const branchBId = brB.rows[0]?.id || restBranchBId;

    await withTenantTx(ownerPrisma, tenantA, async (tx) => {
      await tx.query(
        `INSERT INTO public."PlatformPluginUsage"("tenantId", "projectId", "environmentId", "pluginId", "period", "requestCount")
         VALUES ($1, $2, $3, '@orbitox/hms', '2026-11', 42)`,
        [tenantA, projAId, envAId],
      );
    });

    await restaurantPool.query(
      `INSERT INTO "Guest"(id, "tenantId", name, "tableNumber", role) VALUES ($1, $2, $3, 'T1', 'HOST')`,
      [restGuestAId, tenantA, canaryA.guestName],
    );
    await restaurantPool.query(
      `INSERT INTO "RestaurantOrder"(id, "tenantId", "tableNumber", "sessionId", "branchId", "guestName", status, items, "subtotalMinor", "taxMinor", "totalMinor", "orderToken", customer, "updatedAt")
       VALUES ($1, $2, 'T1', $3, $4, $5, 'PAID', '[]'::jsonb, 10000, 500, 10500, $7, $6::jsonb, now())`,
      [restOrderAId, tenantA, `sess_a_${suffix}`, branchAId, canaryA.guestName, JSON.stringify({ name: canaryA.guestName, email: canaryA.guestEmail }), `ord_secret_tok_${suffix}`],
    );

    const floorARes = await restaurantPool.query<{ id: string }>(`SELECT id FROM "Floor" WHERE "tenantId"=$1 LIMIT 1`, [tenantA]);
    const floorAId = floorARes.rows[0]?.id || `fl_a_${suffix}`;
    const itemARes = await restaurantPool.query<{ id: string }>(`SELECT id FROM "MenuItem" WHERE "tenantId"=$1 LIMIT 1`, [tenantA]);
    const itemAId = itemARes.rows[0]?.id || `item_a_${suffix}`;
    const staffARes = await restaurantPool.query<{ id: string }>(`SELECT id FROM "StaffMember" WHERE "tenantId"=$1 LIMIT 1`, [tenantA]);
    let staffAId = staffARes.rows[0]?.id;
    if (!staffAId) {
      staffAId = `stf_a_${suffix}`;
      await restaurantPool.query(
        `INSERT INTO "StaffMember"(id, "tenantId", name, role, "branchId", salt, "pinHash", status, "updatedAt")
         VALUES ($1, $2, 'Chef Alpha', 'CHEF', $3, $4, $5, 'ACTIVE', now())`,
        [staffAId, tenantA, branchAId, `salt_secret_${suffix}`, `pinhash_secret_${suffix}`],
      );
    }
    if (floorARes.rows[0] && itemARes.rows[0]) {
      await restaurantPool.query(
        `INSERT INTO "BranchMenuOverride"(id, "tenantId", "itemId", "branchId", "isAvailable", "updatedAt")
         VALUES ($1, $2, $3, $4, true, now())`,
        [`ovr_a_${suffix}`, tenantA, itemAId, branchAId],
      );
    }
    await restaurantPool.query(
      `INSERT INTO "KitchenTask"(id, "tenantId", "orderId", "tableNumber", "branchId", "itemName", quantity, station, status, "updatedAt")
       VALUES ($1, $2, $3, 'T1', $4, 'Paneer Tikka', 1, 'TANDOOR', 'QUEUED', now())`,
      [`kt_a_${suffix}`, tenantA, restOrderAId, branchAId],
    );
    await restaurantPool.query(
      `INSERT INTO "ServiceRequest"(id, "tenantId", "tableNumber", "branchId", "floorId", type, status)
       VALUES ($1, $2, 'T1', $3, $4, 'WATER', 'PENDING')`,
      [`sr_a_${suffix}`, tenantA, branchAId, floorAId],
    );
    await restaurantPool.query(
      `INSERT INTO "DiningSession"(id, "tenantId", "tableNumber", "branchId", "floorId", "hostName", status, "guestCapabilityTokens")
       VALUES ($1, $2, 'T1', $3, $4, $5, 'ACTIVE', $6::jsonb)`,
      [`ds_a_${suffix}`, tenantA, branchAId, floorAId, canaryA.guestName, JSON.stringify([`cap_secret_tok_${suffix}`])],
    );
    await restaurantPool.query(
      `INSERT INTO "StaffTokenRevocation"(id, "tenantId", "tokenJti", reason)
       VALUES ($1, $2, $3, 'Rotation check')`,
      [`rev_a_${suffix}`, tenantA, `jti_a_${suffix}`],
    );
    await restaurantPool.query(
      `INSERT INTO "TenantBrandConfig"(id, "tenantId", config, "updatedAt")
       VALUES ($1, $2, '{"brandName":"Bistro Alpha"}'::jsonb, now())
       ON CONFLICT ("tenantId") DO NOTHING`,
      [`brand_a_${suffix}`, tenantA],
    );
    await restaurantPool.query(
      `INSERT INTO "SupportTicket"(id, "tenantId", "branchId", title, status, priority, category, messages, "updatedAt")
       VALUES ($1, $2, $3, 'Printer Setup', 'OPEN', 'LOW', 'HARDWARE', '[]'::jsonb, now())`,
      [`tkt_a_${suffix}`, tenantA, branchAId],
    );
    await restaurantPool.query(
      `INSERT INTO "IdempotencyRecord"(key, "tenantId", result, "expiresAt")
       VALUES ($1, $2, '{"ok":true}'::jsonb, now() + interval '1 day')`,
      [`idem_rest_a_${suffix}`, tenantA],
    );
    await restaurantPool.query(
      `INSERT INTO "Invoice"(id, "tenantId", "orderId", "invoiceNumber", "fiscalYear", "sequenceNumber", gstin, "subtotalMinor", "taxMinor", "totalMinor", "itemBreakdown", "taxBreakdown")
       VALUES ($1, $2, $3, $4, '2026-2027', 1, '03AAAAA0000A1Z5', 10000, 500, 10500, '[]'::jsonb, '{}'::jsonb)`,
      [`rinv_a_${suffix}`, tenantA, restOrderAId, `INV-A-${suffix}`],
    );
    await restaurantPool.query(
      `INSERT INTO "RazorpayPaymentSession"(id, "tenantId", "orderId", "tableNumber", "amountMinor", status, "razorpaySignature", "updatedAt")
       VALUES ($1, $2, $3, 'T1', 10500, 'captured', $4, now())`,
      [`order_rzp_${suffix}`, tenantA, restOrderAId, `rzp_sig_secret_${suffix}`],
    );
    await restaurantPool.query(
      `INSERT INTO "OwnerInvite"(id, "tenantId", "staffMemberId", "tokenHash", "expiresAt")
       VALUES ($1, $2, $3, $4, now() + interval '1 day')`,
      [`oinv_a_${suffix}`, tenantA, staffAId, `invite_hash_secret_${suffix}`],
    );
    await restaurantPool.query(
      `INSERT INTO "TenantDomain"(id, "tenantId", domain, "verificationToken", "verificationStatus", "updatedAt")
       VALUES ($1, $2, $3, $4, 'VERIFIED', now())`,
      [`dom_a_${suffix}`, tenantA, `a-${suffix}.bistro.example`, `dom_verify_secret_${suffix}`],
    );
    await restaurantPool.query(
      `INSERT INTO "TenantPaymentConfig"(id, "tenantId", "encryptedKeyId", "encryptedKeySecret", "encryptedWebhookSecret", gstin, "updatedAt")
       VALUES ($1, $2, $3, $4, $5, '03AAAAA0000A1Z5', now())
       ON CONFLICT ("tenantId") DO NOTHING`,
      [
        `tpc_a_${suffix}`,
        tenantA,
        `enc_keyid_secret_${suffix}`,
        `enc_keysec_secret_${suffix}`,
        `enc_whsec_secret_${suffix}`,
      ],
    );

    await restaurantPool.query(
      `INSERT INTO "Guest"(id, "tenantId", name, "tableNumber", role) VALUES ($1, $2, $3, 'T2', 'HOST')`,
      [restGuestBId, tenantB, canaryB.guestName],
    );
    await restaurantPool.query(
      `INSERT INTO "RestaurantOrder"(id, "tenantId", "tableNumber", "sessionId", "branchId", "guestName", status, items, "subtotalMinor", "taxMinor", "totalMinor", customer, "updatedAt")
       VALUES ($1, $2, 'T2', $3, $4, $5, 'PAID', '[]'::jsonb, 20000, 1000, 21000, $6::jsonb, now())`,
      [restOrderBId, tenantB, `sess_b_${suffix}`, branchBId, canaryB.guestName, JSON.stringify({ name: canaryB.guestName, email: canaryB.guestEmail })],
    );

    const snaps = await snapshotOrgBRows();
    orgBRowSnapshotPlatform = snaps.platform;
    orgBRowSnapshotRestaurant = snaps.restaurant;
  });

  after(async () => {
    setBillingCancellationProviderForTesting(null);
    if (restaurantServer) {
      restaurantServer.kill('SIGTERM');
    }
    if (orgBId) {
      await maintenancePrisma.$queryRaw`SELECT public.close_customer_organization(${orgBId})`.catch(() => {});
    }
    if (orgAId) {
      await maintenancePrisma.$queryRaw`SELECT public.close_customer_organization(${orgAId})`.catch(() => {});
    }
    await restaurantPool.query(`DELETE FROM "Tenant" WHERE id IN ($1, $2)`, [tenantA, tenantB]).catch(() => {});
    await restaurantPool.query(`DELETE FROM "PluginGrantRevision" WHERE "tenantId" IN ($1, $2)`, [tenantA, tenantB]).catch(() => {});
    const createdEmails = [ownerAEmail, adminAEmail, memberAEmail, ownerBEmail].filter(Boolean);
    if (createdEmails.length > 0) {
      await ownerPrisma.accountEmailOutbox.deleteMany({ where: { recipient: { in: createdEmails } } }).catch(() => {});
    }
    if (createdUserIds.length > 0) {
      await ownerPrisma.customerSession.deleteMany({ where: { userId: { in: createdUserIds } } }).catch(() => {});
      await ownerPrisma.customerUser.deleteMany({ where: { id: { in: createdUserIds } } }).catch(() => {});
    }
    await ownerPrisma.organizationDeletionRequest.deleteMany({
      where: { requestedByUserId: { in: createdUserIds } },
    }).catch(() => {});
    await ownerPrisma.billingPlanMap.deleteMany({
      where: { razorpayPlanId: { endsWith: `_${suffix}` } },
    }).catch(() => {});
    for (const d of tempDirs) {
      await fs.rm(d, { recursive: true, force: true });
    }
    await Promise.all([
      ownerPrisma.$disconnect(),
      runtimePrisma.$disconnect(),
      maintenancePrisma.$disconnect(),
      hmsAuditPrisma.$disconnect(),
      platformPool.end(),
      restaurantPool.end(),
    ]);
  });

  it('G1/G5: RestaurantOS data-rights bridge rejects bad signature (401) and replayed nonce (401)', async () => {
    const keys = { activeKeyId: 'k1', keys: { k1: bridgeSecretHex } };
    const bodyStr = JSON.stringify({ context: { actorId: 'test', reason: 'probe' } });
    const headers = signBridgeRequest(keys, {
      method: 'POST',
      pathWithQuery: '/orbitox/data-rights/export',
      tenantId: tenantA,
      principal: { sub: 'platform_data_rights', scopes: ['platform:superuser', 'data-rights:*'] },
      body: bodyStr,
    });

    // 1. Valid request -> 200
    const okRes = await fetch(`${restaurantBaseUrl}/orbitox/data-rights/export`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: bodyStr,
    });
    assert.equal(okRes.status, 200);

    // 2. Exact replay of same nonce -> 401
    const replayRes = await fetch(`${restaurantBaseUrl}/orbitox/data-rights/export`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: bodyStr,
    });
    assert.equal(replayRes.status, 401);

    // 3. Bad signature -> 401
    const badHeaders = {
      ...signBridgeRequest(keys, {
        method: 'POST',
        pathWithQuery: '/orbitox/data-rights/export',
        tenantId: tenantA,
        principal: { sub: 'platform_data_rights', scopes: ['platform:superuser'] },
        body: bodyStr,
      }),
      'x-orbitox-signature': '0'.repeat(64),
    };
    const badRes = await fetch(`${restaurantBaseUrl}/orbitox/data-rights/export`, {
      method: 'POST',
      headers: { ...badHeaders, 'content-type': 'application/json' },
      body: bodyStr,
    });
    assert.equal(badRes.status, 401);

    // 4. Unverified x-tenant-id header -> 401
    const rawHdrRes = await fetch(`${restaurantBaseUrl}/orbitox/data-rights/export`, {
      method: 'POST',
      headers: { 'x-tenant-id': tenantA, 'content-type': 'application/json' },
      body: bodyStr,
    });
    assert.equal(rawHdrRes.status, 401);
  });

  it('G2/G5: exports Org A (HMS+RestaurantOS), leak-scans against every Org B ID, checks PHI logs, single-use link, expiry, and 7-day purge', async () => {
    const { POST: postExport } = await import('@/app/api/v1/customer/organizations/[organizationId]/data/export/route');
    const { POST: postExportDownload } = await import('@/app/api/v1/customer/organizations/[organizationId]/data/export/download/route');

    // Non-owner ADMIN gets 403
    const forbiddenExport = await postExport(
      makeCustomerRequest('POST', `/api/v1/customer/organizations/${orgAId}/data/export`, adminASessionToken, adminACsrfToken, {}),
      { params: Promise.resolve({ organizationId: orgAId }) },
    );
    assert.equal(forbiddenExport.status, 403);

    // OWNER requests export -> 202
    const reqExport = await postExport(
      makeCustomerRequest('POST', `/api/v1/customer/organizations/${orgAId}/data/export`, ownerASessionToken, ownerACsrfToken, {}),
      { params: Promise.resolve({ organizationId: orgAId }) },
    );
    assert.equal(reqExport.status, 202);
    const reqExportJson = await reqExport.json();
    assert.equal(reqExportJson.ok, true);
    const jobId = reqExportJson.job.id || reqExportJson.job.jobId;

    const adapters = createDefaultDataRightsAdapters({
      runtimePrisma,
      maintenancePrisma,
      restaurantBaseUrl,
    });

    const t0 = new Date();
    const runRes = await processExportJobs({
      runtimePrisma,
      maintenancePrisma,
      objectStore,
      adapters,
      publicBaseUrl: 'https://console.orbitox.test',
      now: t0,
    });
    assert.equal(runRes.succeeded, 1);
    const jobOut = runRes.jobs[0]!;
    assert.equal(jobOut.jobId, jobId);

    // Verify outbox EXPORT_READY email carries https://#token= with zero tenant data
    const outboxRow = await ownerPrisma.accountEmailOutbox.findFirst({
      where: { recipient: ownerAEmail, template: 'EXPORT_READY' },
      orderBy: { createdAt: 'desc' },
    });
    assert.ok(outboxRow, 'EXPORT_READY outbox email must be queued');
    const decryptedEmail = decryptAccountEmailPayload(outboxRow.encryptedPayload) as Record<string, unknown>;
    assert.equal(typeof decryptedEmail.link, 'string');
    const linkUrl = new URL(decryptedEmail.link as string);
    assert.equal(linkUrl.protocol, 'https:');
    assert.ok(linkUrl.hash.startsWith('#token='), `Expected #token= fragment, got ${linkUrl.hash}`);
    const tokenFromEmail = decodeURIComponent(linkUrl.hash.slice('#token='.length));
    assert.equal(tokenFromEmail, jobOut.rawDownloadToken);
    assert.equal(JSON.stringify(decryptedEmail).includes(orgASlug), false);
    assert.equal(JSON.stringify(decryptedEmail).includes(canaryA.patientName), false);

    // Note: in CI/local override where process.env.ORBITOX_OBJECT_STORE_LOCAL_DIR is set by download route
    process.env.ORBITOX_OBJECT_STORE_LOCAL_DIR = objectStoreRoot;

    // G-5: DATA_EXPORT_DOWNLOAD token is refused by verify-email AND a VERIFY_EMAIL token is refused by /data/export/download
    const { POST: postVerifyEmail } = await import('@/app/api/v1/customer/auth/verify-email/route');
    const crossUseExportOnVerify = await postVerifyEmail(
      new NextRequest('https://console.orbitox.test/api/v1/customer/auth/verify-email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: tokenFromEmail }),
      }),
    );
    assert.equal(crossUseExportOnVerify.status, 400);

    const verifyTokenPair = newAccountToken('VERIFY_EMAIL');
    await ownerPrisma.accountToken.create({
      data: {
        tokenHash: verifyTokenPair.tokenHash,
        purpose: 'VERIFY_EMAIL',
        userId: memberAUserId,
        organizationId: orgAId,
        email: memberAEmail,
        expiresAt: verifyTokenPair.expiresAt,
      },
    });
    const crossUseVerifyOnDownload = await postExportDownload(
      makeCustomerRequest(
        'POST',
        `/api/v1/customer/organizations/${orgAId}/data/export/download`,
        ownerASessionToken,
        ownerACsrfToken,
        { token: verifyTokenPair.token },
      ),
      { params: Promise.resolve({ organizationId: orgAId }) },
    );
    assert.equal(crossUseVerifyOnDownload.status, 410);

    // Original VERIFY_EMAIL token remained unconsumed and still works on verify-email
    const realVerifyRes = await postVerifyEmail(
      new NextRequest('https://console.orbitox.test/api/v1/customer/auth/verify-email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: verifyTokenPair.token }),
      }),
    );
    assert.equal(realVerifyRes.status, 200);

    // 1st download with single-use DATA_EXPORT_DOWNLOAD token -> 200 ZIP (unconsumed by verify-email)
    const dl1 = await postExportDownload(
      makeCustomerRequest(
        'POST',
        `/api/v1/customer/organizations/${orgAId}/data/export/download`,
        ownerASessionToken,
        ownerACsrfToken,
        { token: tokenFromEmail },
      ),
      { params: Promise.resolve({ organizationId: orgAId }) },
    );
    assert.equal(dl1.status, 200);
    const zipBytes = Buffer.from(await dl1.arrayBuffer());

    // 2nd download with same single-use token -> 410
    const dl2 = await postExportDownload(
      makeCustomerRequest(
        'POST',
        `/api/v1/customer/organizations/${orgAId}/data/export/download`,
        ownerASessionToken,
        ownerACsrfToken,
        { token: tokenFromEmail },
      ),
      { params: Promise.resolve({ organizationId: orgAId }) },
    );
    assert.equal(dl2.status, 410);

    // Expired link fails -> 410
    const expiredRawToken = 'B'.repeat(43);
    const expiredHash = crypto.createHash('sha256').update(expiredRawToken).digest('hex');
    await ownerPrisma.dataExportDownloadToken.create({
      data: {
        id: `det_exp_${suffix}`,
        jobId,
        organizationId: orgAId,
        tokenHash: expiredHash,
        objectKey: jobOut.objectKey,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    const dlExpired = await postExportDownload(
      makeCustomerRequest(
        'POST',
        `/api/v1/customer/organizations/${orgAId}/data/export/download`,
        ownerASessionToken,
        ownerACsrfToken,
        { token: expiredRawToken },
      ),
      { params: Promise.resolve({ organizationId: orgAId }) },
    );
    assert.equal(dlExpired.status, 410);

    // Verify manifest & SHA-256 hashes inside archive
    const manifest = verifyExportArchive(zipBytes);
    assert.equal(manifest.organizationId, orgAId);
    if (process.env.ORBITOX_EXPORT_MANIFEST_OUT) {
      await fs.writeFile(
        process.env.ORBITOX_EXPORT_MANIFEST_OUT,
        JSON.stringify(manifest, null, 2),
      );
    }

    // Check archive contents & zero-leak against EVERY Org B identifier
    const archiveMap = readZipArchive(zipBytes);
    const allArchiveText = Array.from(archiveMap.values())
      .map((buf) => buf.toString('utf8'))
      .join('\n');

    assert.ok(allArchiveText.includes(canaryA.patientName), 'Archive must include decrypted Org A HMS patient');
    assert.ok(allArchiveText.includes(canaryA.guestName), 'Archive must include Org A RestaurantOS guest');

    // G-2: Verify ALL 13 Platform tables and ALL 23 exported RestaurantOS tables are present in manifest
    const platformTablesInArchive = new Set(
      manifest.tables.filter((t) => t.pluginId === 'platform').map((t) => t.table),
    );
    for (const expectedPlatformTable of [
      'PlatformOrganization',
      'CustomerMembership',
      'CustomerUser',
      'PlatformProject',
      'ProjectEnvironment',
      'PlatformApiKey',
      'PluginInstallation',
      'PluginGrantRevision',
      'BillingSubscription',
      'PlatformPluginUsage',
      'PlatformAuditEvent',
      'DataRightsJob',
      'OrganizationDeletionRequest',
    ]) {
      assert.ok(
        platformTablesInArchive.has(expectedPlatformTable),
        `Expected platform table "${expectedPlatformTable}" in Org A export archive`,
      );
    }

    const restaurantTablesInArchive = new Set(
      manifest.tables.filter((t) => t.pluginId === '@orbitox/restaurant').map((t) => t.table),
    );
    for (const expectedRestTable of [
      'Tenant',
      'Branch',
      'Floor',
      'TableFloor',
      'MenuCategory',
      'MenuItem',
      'BranchMenuOverride',
      'RestaurantOrder',
      'KitchenTask',
      'ServiceRequest',
      'DiningSession',
      'Guest',
      'StaffMember',
      'StaffTokenRevocation',
      'TenantBrandConfig',
      'SupportTicket',
      'DomainEvent',
      'IdempotencyRecord',
      'Invoice',
      'RazorpayPaymentSession',
      'OwnerInvite',
      'TenantDomain',
      'PluginGrantRevision',
    ]) {
      assert.ok(
        restaurantTablesInArchive.has(expectedRestTable),
        `Expected RestaurantOS table "${expectedRestTable}" in Org A export archive`,
      );
    }
    assert.equal(
      manifest.tables.some((t) => ['TenantPaymentConfig', 'HmsStaffCredential', 'HmsStaffSession'].includes(t.table)),
      false,
      'Secret credential/payment-config tables must never be exported',
    );

    // Verify seeded usage/member/API-key metadata appears while secret columns & values are completely absent
    const customerUsersJson = JSON.parse(archiveMap.get('platform/platform/CustomerUser.json')!.toString('utf8'));
    assert.ok(customerUsersJson.some((u: any) => u.email === ownerAEmail && u.lastLoginAt), 'CustomerUser export must include safe profile and lastLoginAt');
    const apiKeysJson = JSON.parse(archiveMap.get('platform/platform/PlatformApiKey.json')!.toString('utf8'));
    assert.equal(apiKeysJson.length, 1);
    assert.equal(apiKeysJson[0].id, keyAId);
    const usageJson = JSON.parse(archiveMap.get('platform/platform/PlatformPluginUsage.json')!.toString('utf8'));
    assert.ok(usageJson.some((u: any) => u.requestCount === '42'));
    const subsJson = JSON.parse(archiveMap.get('platform/platform/BillingSubscription.json')!.toString('utf8'));
    assert.ok(subsJson.length >= 2);
    const auditJson = JSON.parse(archiveMap.get('platform/platform/PlatformAuditEvent.json')!.toString('utf8'));
    assert.ok(auditJson.length >= 1);

    // G-2 secret column deny-list sweep across EVERY CSV header and EVERY JSON file key in the archive
    const forbiddenSet = new Set(FORBIDDEN_EXPORT_COLUMNS.map((c) => c.toLowerCase()));
    const scanJsonKeys = (val: unknown, filePath: string): void => {
      if (!val || typeof val !== 'object') return;
      if (Array.isArray(val)) {
        for (const item of val) scanJsonKeys(item, filePath);
        return;
      }
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        assert.equal(
          forbiddenSet.has(k.toLowerCase()),
          false,
          `Forbidden secret key "${k}" found in ${filePath}`,
        );
        if (v && typeof v === 'object') scanJsonKeys(v, filePath);
      }
    };
    for (const [filePath, buf] of archiveMap.entries()) {
      if (filePath.endsWith('.csv')) {
        const headerLine = buf.toString('utf8').split(/\r?\n/, 1)[0] || '';
        const headers = headerLine.split(',').map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());
        for (const h of headers) {
          assert.equal(
            forbiddenSet.has(h),
            false,
            `Forbidden secret CSV header "${h}" found in ${filePath}`,
          );
        }
      } else if (filePath.endsWith('.json') && filePath !== 'manifest.json') {
        scanJsonKeys(JSON.parse(buf.toString('utf8')), filePath);
      }
    }
    for (const secretSentinel of [
      `ord_secret_tok_${suffix}`,
      `salt_secret_${suffix}`,
      `pinhash_secret_${suffix}`,
      `cap_secret_tok_${suffix}`,
      `rzp_sig_secret_${suffix}`,
      `invite_hash_secret_${suffix}`,
      `dom_verify_secret_${suffix}`,
      `enc_keyid_secret_${suffix}`,
      `enc_keysec_secret_${suffix}`,
      `enc_whsec_secret_${suffix}`,
    ]) {
      assert.equal(
        allArchiveText.includes(secretSentinel),
        false,
        `Secret sentinel value "${secretSentinel}" leaked into archive!`,
      );
    }

    const orgBIdentifiers = [
      orgBId,
      orgBSlug,
      projBId,
      envBId,
      tenantB,
      hmsStaffBId,
      hmsPatB1Id,
      hmsPatB1Mrn,
      canaryB.patientName,
      canaryB.patientPhone,
      canaryB.allergies,
      hmsInvBId,
      restGuestBId,
      restOrderBId,
      canaryB.guestName,
      canaryB.guestEmail,
      ownerBEmail,
      ownerBUserId,
      keyBId,
    ];
    for (const secretB of orgBIdentifiers) {
      assert.equal(
        allArchiveText.includes(secretB),
        false,
        `EXPORT LEAK DETECTED: Org B identifier "${secretB}" found in Org A archive!`,
      );
    }

    // Verify HmsPhiAccessLog via hms_audit_reader role recorded DSR_EXPORT entries
    const phiLogs = await hmsAuditPrisma.$queryRaw<Array<{ patientId: string; purpose: string; requestId: string }>>`
      WITH scoped AS (SELECT set_config('app.current_tenant_id', ${tenantA}, true))
      SELECT l."patientId", l."purpose", l."requestId"
      FROM scoped, public."HmsPhiAccessLog" l
      WHERE l."purpose" = 'DSR_EXPORT' AND l."requestId" = ${jobId}
    `;
    assert.ok(phiLogs.some((r) => r.patientId === hmsPatA1Id));

    // Verify 7-day export archive cleanup sweep
    const purgeRes = await purgeExpiredExports({
      maintenancePrisma,
      objectStore,
      now: new Date(t0.getTime() + 8 * 86400_000),
    });
    assert.equal(purgeRes.purgedJobs, 1);
    assert.equal(await objectStore.get(jobOut.objectKey), null);
  });

  it('G4/G5: Principal export/correct/RESTRICT in HMS hides patient, blocks updates/processing, and logs zero PHI in audit rows', async () => {
    const { POST: postPrincipalHms } = await import('@/app/api/v1/hms/data-rights/principal/route');
    const { GET: listPatients } = await import('@/app/api/hospital/patients/route');
    const { GET: listPatientsV1 } = await import('@/app/api/v1/hms/patients/route');
    const { GET: getPatientById, PATCH: patchPatientById } = await import('@/app/api/hospital/patients/[id]/route');
    const { POST: advanceTriage } = await import('@/app/api/v1/hms/triage/advance/route');
    const { POST: postLab } = await import('@/app/api/hospital/labs/route');
    const { POST: postCustomerPrincipal } = await import('@/app/api/v1/customer/organizations/[organizationId]/tenants/[projectId]/environments/[environmentId]/data/principal/route'
    );

    // Ensure RESTAURANTOS_RUNTIME_URL points to our test server for customer principal route
    process.env.RESTAURANTOS_RUNTIME_URL = restaurantBaseUrl;

    // 1. Export principal
    const expRes = await postPrincipalHms(
      makeHmsApiRequest('POST', '/api/v1/hms/data-rights/principal', tenantA, rawKeyA, {
        action: 'export',
        principal: { kind: 'patient', id: hmsPatA1Id },
        reason: 'Patient access request under DPDP section 11',
      }),
    );
    assert.equal(expRes.status, 200);
    const expJson = await expRes.json();
    assert.equal(expJson.data.tables.HmsPatient[0].name, canaryA.patientName);

    // 2. Correct principal phone & allergies
    const newPhone = '+919899990001';
    const corrRes = await postPrincipalHms(
      makeHmsApiRequest('POST', '/api/v1/hms/data-rights/principal', tenantA, rawKeyA, {
        action: 'correct',
        principal: { kind: 'patient', id: hmsPatA1Id },
        fields: { phone: newPhone, allergies: 'NoneKnown' },
        reason: 'DPDP correction request verified by patient',
      }),
    );
    assert.equal(corrRes.status, 200);

    // Confirm updated phone blind index matches on search before RESTRICT
    const phoneSearchBefore = await listPatients(
      makeHmsApiRequest('GET', `/api/hospital/patients?phone=${encodeURIComponent(newPhone)}`, tenantA, rawKeyA),
    );
    assert.equal(phoneSearchBefore.status, 200);
    const phoneRowsBefore = (await phoneSearchBefore.json()).data as Array<{ id: string }>;
    assert.equal(phoneRowsBefore.some((r) => r.id === hmsPatA1Id), true);

    // 3. RESTRICT patient (default @orbitox/hms policy from config, no explicit mode needed)
    const restrictRes = await postPrincipalHms(
      makeHmsApiRequest('POST', '/api/v1/hms/data-rights/principal', tenantA, rawKeyA, {
        action: 'erase',
        principal: { kind: 'patient', id: hmsPatA1Id },
        reason: 'Legal medical retention restriction requested',
      }),
    );
    assert.equal(restrictRes.status, 200);
    const restrictJson = await restrictRes.json();
    assert.equal(restrictJson.data.mode, 'RESTRICT');
    assert.equal(restrictJson.data.rowsRestrictedByTable.HmsPatient, 1);

    // Row retained in DB for legal retention
    const patRow = await ownerPrisma.hmsPatient.findUnique({
      where: { tenantId_id: { tenantId: tenantA, id: hmsPatA1Id } },
      select: { processingStatus: true },
    });
    assert.equal(patRow?.processingStatus, 'RESTRICTED');

    // Hidden from hospital patient list
    const list1 = await listPatients(
      makeHmsApiRequest('GET', '/api/hospital/patients', tenantA, rawKeyA),
    );
    const list1Ids = ((await list1.json()).data as Array<{ id: string }>).map((r) => r.id);
    assert.equal(list1Ids.includes(hmsPatA1Id), false, 'Restricted patient must be hidden from list');
    assert.equal(list1Ids.includes(hmsPatA2Id), true, 'Active patient remains visible');

    // Hidden from v1 patient list
    const listV1 = await listPatientsV1(
      makeHmsApiRequest('GET', '/api/v1/hms/patients', tenantA, rawKeyA),
    );
    const listV1Ids = ((await listV1.json()).data as Array<{ id: string }>).map((r) => r.id);
    assert.equal(listV1Ids.includes(hmsPatA1Id), false, 'Restricted patient must be hidden from v1 list');

    // Hidden from phone search
    const phoneSearchAfter = await listPatients(
      makeHmsApiRequest('GET', `/api/hospital/patients?phone=${encodeURIComponent(newPhone)}`, tenantA, rawKeyA),
    );
    const phoneRowsAfter = (await phoneSearchAfter.json()).data as Array<{ id: string }>;
    assert.equal(phoneRowsAfter.some((r) => r.id === hmsPatA1Id), false, 'Restricted patient must be hidden from phone search');

    // Hidden from normal GET by id (404)
    const getOne = await getPatientById(
      makeHmsApiRequest('GET', `/api/hospital/patients/${hmsPatA1Id}`, tenantA, rawKeyA),
      { params: Promise.resolve({ id: hmsPatA1Id }) },
    );
    assert.equal(getOne.status, 404);

    // Updates and clinical mutations blocked (409 PATIENT_PROCESSING_RESTRICTED)
    const patchRes = await patchPatientById(
      makeHmsApiRequest('PATCH', `/api/hospital/patients/${hmsPatA1Id}`, tenantA, rawKeyA, { triageLevel: 2 }),
      { params: Promise.resolve({ id: hmsPatA1Id }) },
    );
    assert.equal(patchRes.status, 409);

    const triageRes = await advanceTriage(
      makeHmsApiRequest('POST', '/api/v1/hms/triage/advance', tenantA, rawKeyA, { patientId: hmsPatA1Id, newTriageLevel: 1 }),
    );
    assert.equal(triageRes.status, 409);

    const labRes = await postLab(
      makeHmsApiRequest('POST', '/api/hospital/labs', tenantA, rawKeyA, { patientId: hmsPatA1Id, testType: 'CBC' }),
    );
    assert.equal(labRes.status, 409);

    // Verify audit rows contain NO PHI
    const auditEvents = await ownerPrisma.platformAuditEvent.findMany({
      where: { entityType: 'HmsPatient', entityId: hmsPatA1Id },
    });
    assert.ok(auditEvents.length >= 3);
    const auditText = JSON.stringify(auditEvents);
    assert.equal(auditText.includes(canaryA.patientName), false);
    assert.equal(auditText.includes(newPhone), false);
    assert.equal(auditText.includes('NoneKnown'), false);

    // Verify RestaurantOS Guest principal DELETE via customer dashboard DSR route (config default = DELETE)
    const restEraseRes = await postCustomerPrincipal(
      makeCustomerRequest(
        'POST',
        `/api/v1/customer/organizations/${orgAId}/tenants/${projAId}/environments/${envAId}/data/principal`,
        adminASessionToken,
        adminACsrfToken,
        {
          pluginId: '@orbitox/restaurant',
          action: 'erase',
          principal: { kind: 'diner', id: restGuestAId },
          reason: 'Diner erasure request under DPDP section 12',
        },
      ),
      { params: Promise.resolve({ organizationId: orgAId, projectId: projAId, environmentId: envAId }) },
    );
    assert.equal(restEraseRes.status, 200);
    const restEraseJson = await restEraseRes.json();
    assert.equal(restEraseJson.result.mode, 'DELETE');
    assert.equal(restEraseJson.result.rowsDeletedByTable.Guest, 1);
  });

  it('G3/G5: Deletion schedule -> cancel -> everything works -> reschedule -> crash-resume Day-30 -> 0 Org A rows & unchanged Org B -> CLI verify/tamper', async () => {
    const {
      GET: getDeletion,
      POST: postDeletion,
      DELETE: cancelDeletionRoute,
    } = await import('@/app/api/v1/customer/organizations/[organizationId]/data/deletion/route');
    const { GET: listV1Patients } = await import('@/app/api/v1/hms/patients/route');

    // 1. Schedule deletion -> blocks non-owner logins, suspends API keys, calls cancelAtPeriodEnd, queues email
    const sched1 = await postDeletion(
      makeCustomerRequest(
        'POST',
        `/api/v1/customer/organizations/${orgAId}/data/deletion`,
        ownerASessionToken,
        ownerACsrfToken,
        { reason: 'Closing organization A' },
      ),
      { params: Promise.resolve({ organizationId: orgAId }) },
    );
    assert.equal(sched1.status, 202);
    const sched1Json = await sched1.json();
    assert.equal(sched1Json.request.status, 'SCHEDULED');
    assert.ok(billingCancellations.length >= 2, 'Billing cancelAtPeriodEnd must be called');

    const schedEmail = await ownerPrisma.accountEmailOutbox.findFirst({
      where: { recipient: ownerAEmail, template: 'DELETION_SCHEDULED' },
    });
    assert.ok(schedEmail, 'DELETION_SCHEDULED email must be queued');

    // Non-owner login (ADMIN / MEMBER) immediately rejected
    const adminBlocked = await loginCustomer({
      email: adminAEmail,
      password: sharedPassword,
      ipAddress: '127.0.0.1',
    });
    assert.equal(adminBlocked.ok, false);
    assert.equal(adminBlocked.reason, 'ORGANIZATION_DELETION_PENDING');

    const memberBlocked = await loginCustomer({
      email: memberAEmail,
      password: sharedPassword,
      ipAddress: '127.0.0.1',
    });
    assert.equal(memberBlocked.ok, false);

    // Owner login STILL works during cooling-off (with valid MFA TOTP)
    const freshOwnerLogin = await loginCustomer({
      email: ownerAEmail,
      password: sharedPassword,
      totpCode: currentTotpCode(ownerATotpSecret),
      ipAddress: '127.0.0.1',
    });
    assert.equal(freshOwnerLogin.ok, true, 'OWNER login must still succeed during deletion cooling-off');
    if (freshOwnerLogin.ok) {
      // Confirm newly issued OWNER session can inspect pending deletion state while non-owners are blocked
      const statusViaFreshOwner = await getDeletion(
        makeCustomerRequest(
          'GET',
          `/api/v1/customer/organizations/${orgAId}/data/deletion`,
          freshOwnerLogin.sessionToken,
          freshOwnerLogin.csrfToken,
        ),
        { params: Promise.resolve({ organizationId: orgAId }) },
      );
      assert.equal(statusViaFreshOwner.status, 200);
    }
    const keyAAfterSched = await ownerPrisma.platformApiKey.findUnique({ where: { id: keyAId } });
    assert.equal(keyAAfterSched?.status, 'SUSPENDED');
    const apiWhileSuspended = await listV1Patients(
      makeHmsApiRequest('GET', '/api/v1/hms/patients', tenantA, rawKeyA),
    );
    assert.equal(apiWhileSuspended.status, 403);

    // Running sweep BEFORE Day 30 does NOT erase org A
    const adapters = createDefaultDataRightsAdapters({
      runtimePrisma,
      maintenancePrisma,
      restaurantBaseUrl,
    });
    const earlySweep = await processDueOrganizationDeletions({
      maintenancePrisma,
      objectStore,
      adapters,
      now: new Date(Date.now() + 10 * 86400_000),
    });
    assert.equal(earlySweep.completed, 0);

    // 2. Cancel deletion -> restores non-owner logins and previously active API keys
    const cancelRes = await cancelDeletionRoute(
      makeCustomerRequest(
        'DELETE',
        `/api/v1/customer/organizations/${orgAId}/data/deletion`,
        ownerASessionToken,
        ownerACsrfToken,
      ),
      { params: Promise.resolve({ organizationId: orgAId }) },
    );
    assert.equal(cancelRes.status, 200);

    const adminRestored = await loginCustomer({
      email: adminAEmail,
      password: sharedPassword,
      totpCode: currentTotpCode(adminATotpSecret),
      ipAddress: '127.0.0.1',
    });
    assert.equal(adminRestored.ok, true);
    // Refresh admin session tokens in case session was revoked during pending deletion
    adminASessionToken = adminRestored.sessionToken;
    adminACsrfToken = adminRestored.csrfToken;

    const keyAAfterCancel = await ownerPrisma.platformApiKey.findUnique({ where: { id: keyAId } });
    assert.equal(keyAAfterCancel?.status, 'ACTIVE');
    const apiAfterCancel = await listV1Patients(
      makeHmsApiRequest('GET', '/api/v1/hms/patients', tenantA, rawKeyA),
    );
    assert.equal(apiAfterCancel.status, 200);

    // 3. Re-schedule deletion -> fast-forward test clock past +30 days -> crash midway -> resume cleanly
    const sched2 = await postDeletion(
      makeCustomerRequest(
        'POST',
        `/api/v1/customer/organizations/${orgAId}/data/deletion`,
        ownerASessionToken,
        ownerACsrfToken,
        { reason: 'Final confirmed deletion' },
      ),
      { params: Promise.resolve({ organizationId: orgAId }) },
    );
    assert.equal(sched2.status, 202);
    const sched2Id = (await sched2.json()).request.id;

    // Seed an orphan object under exports/orgA to verify object-store prefix purge during Day-30
    await objectStore.put(`exports/${orgAId}/pre-deletion.zip`, Buffer.from('stale-export'));

    const day31Clock = new Date(Date.now() + 31 * 86400_000);

    // Simulated crash right after plugins erase!
    await assert.rejects(
      () =>
        processDueOrganizationDeletions({
          maintenancePrisma,
          objectStore,
          adapters,
          now: day31Clock,
          crashAfterStepForTesting: 'after_plugin_erase',
        }),
      /INJECTED_CRASH_AFTER_PLUGIN_ERASE/,
    );

    // Resume on recovery -> completes with 1 certificate & zero double counting
    const resumedSweep = await processDueOrganizationDeletions({
      maintenancePrisma,
      objectStore,
      adapters,
      now: day31Clock,
    });
    assert.equal(resumedSweep.acquired, true);
    assert.equal(resumedSweep.completed, 1);
    assert.equal(resumedSweep.certificates.length, 1);
    const cert = resumedSweep.certificates[0]!;
    assert.equal(cert.payload.organizationId, orgAId);
    assert.equal(cert.payload.purpose, 'orbitox.deletion_certificate.v1');
    assert.match(cert.spkiFingerprint, /^[a-f0-9]{64}$/);
    assert.equal(cert.payload.spkiFingerprint, cert.spkiFingerprint);
    assert.equal(cert.payload.objectStoreObjectsDeleted, 1);
    assert.ok(cert.payload.backupNotice.includes('data persists in encrypted backups until'));
    assert.ok(cert.payload.backupNotice.includes('unrecoverable'));

    // Re-running sweep produces 0 additional work (idempotent)
    const noopSweep = await processDueOrganizationDeletions({
      maintenancePrisma,
      objectStore,
      adapters,
      now: day31Clock,
    });
    assert.equal(noopSweep.completed, 0);

    // OWNER-only certificate retrieval works for ownerA even after PlatformOrganization was deleted
    const certFetchOwner = await getDeletion(
      makeCustomerRequest('GET', `/api/v1/customer/organizations/${orgAId}/data/deletion`, ownerASessionToken, ownerACsrfToken),
      { params: Promise.resolve({ organizationId: orgAId }) },
    );
    assert.equal(certFetchOwner.status, 200);
    const certFetchJson = await certFetchOwner.json();
    assert.equal(certFetchJson.request.id, sched2Id);
    assert.equal(certFetchJson.request.status, 'COMPLETED');
    assert.equal(certFetchJson.request.certificate.signature, cert.signature);

    // Other org's owner gets 404 (cannot retrieve Org A's deletion certificate)
    const certFetchOther = await getDeletion(
      makeCustomerRequest('GET', `/api/v1/customer/organizations/${orgAId}/data/deletion`, ownerBSessionToken, ownerBCsrfToken),
      { params: Promise.resolve({ organizationId: orgAId }) },
    );
    assert.equal(certFetchOther.status, 404);

    // 4. Verify certificate via offline CLI + prove 1-byte tamper fails
    const pubKeys = extractDeletionCertPublicKeys(process.env.ORBITOX_DELETION_CERT_KEYS!);
    assert.equal(verifyDeletionCertificate(cert, pubKeys).valid, true);

    const cliDir = await fs.mkdtemp(path.join(os.tmpdir(), 'orbitox-6g-cli-'));
    tempDirs.push(cliDir);
    const certFile = path.join(cliDir, 'deletion-certificate.json');
    const tamperedFile = path.join(cliDir, 'deletion-certificate-tampered.json');
    const pubFile = path.join(cliDir, 'deletion-cert-public-keys.json');
    await fs.writeFile(certFile, JSON.stringify(cert, null, 2));
    const tamperedCert = structuredClone(cert);
    tamperedCert.payload.totalRowsDeleted += 1;
    await fs.writeFile(tamperedFile, JSON.stringify(tamperedCert, null, 2));
    await fs.writeFile(pubFile, JSON.stringify(pubKeys, null, 2));

    const cliScript = path.resolve(orbitoxRoot, 'scripts/verify-deletion-certificate.ts');
    const okCli = execFileSync(
      'pnpm',
      ['exec', 'tsx', cliScript, '--cert', certFile, '--public-key', pubFile],
      { cwd: orbitoxRoot, encoding: 'utf8' },
    );
    assert.equal(JSON.parse(okCli).valid, true);

    const badCli = spawnSync(
      'pnpm',
      ['exec', 'tsx', cliScript, '--cert', tamperedFile, '--public-key', pubFile],
      { cwd: orbitoxRoot, encoding: 'utf8' },
    );
    assert.equal(badCli.status, 1);

    // 5. Scripted information_schema sweep over EVERY table with org/tenant/project columns in BOTH DBs
    const idsA = [orgAId, projAId, envAId, tenantA];
    const platCols = await discoverOrgColumns(platformPool);
    for (const { table, column } of platCols) {
      const remaining = await countMatchingRows(platformPool, table, column, idsA);
      assert.equal(
        remaining,
        0,
        `Platform DB table ${table}.${column} still has ${remaining} rows for deleted Org A!`,
      );
    }

    const restCols = await discoverOrgColumns(restaurantPool);
    for (const { table, column } of restCols) {
      const remaining = await countMatchingRows(restaurantPool, table, column, idsA);
      assert.equal(
        remaining,
        0,
        `RestaurantOS DB table ${table}.${column} still has ${remaining} rows for deleted Org A!`,
      );
    }

    // 6. Verify Org B's row counts across ALL tables in BOTH DBs are 100% unchanged
    const afterSnaps = await snapshotOrgBRows();
    for (const [k, beforeCount] of orgBRowSnapshotPlatform.entries()) {
      assert.equal(
        afterSnaps.platform.get(k),
        beforeCount,
        `Org B Platform row count changed in ${k}: ${beforeCount} -> ${afterSnaps.platform.get(k)}`,
      );
    }
    for (const [k, beforeCount] of orgBRowSnapshotRestaurant.entries()) {
      assert.equal(
        afterSnaps.restaurant.get(k),
        beforeCount,
        `Org B RestaurantOS row count changed in ${k}: ${beforeCount} -> ${afterSnaps.restaurant.get(k)}`,
      );
    }
  });
});
