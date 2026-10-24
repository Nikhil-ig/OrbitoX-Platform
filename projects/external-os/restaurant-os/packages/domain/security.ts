/**
 * 🔐 RestaurantOS 2.x — Cryptographic Security & Staff Token Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Server-Side Token Generation, Verification, Expiration & Revocation.
 *
 * Guarantees:
 * 1. Cryptographic HMAC-SHA256 signature verification (timingSafeEqual).
 * 2. Explicit expiration (exp) and unique token identifier (jti).
 * 3. Durable, restart-persistent revocation registry for instant invalidation.
 * 4. Tenant, branch, station, and permission-bounded claims.
 * 5. Production environment enforcement (blocks development fixtures in production).
 * 6. Rate-limiting & brute-force protection against credential guessing.
 * 7. Server-authoritative role & branch assignment from trusted staff directory.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';

export type StaffRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'OPERATIONS' | 'POS' | 'SERVER' | 'CHEF';

export interface StaffClaims {
  sub: string;
  name?: string;
  role: StaffRole;
  tenantId: string;
  branchId: string;
  station?: string;
  permissions: string[];
  iat: number;
  exp: number;
  jti: string;
}

export interface TokenVerificationResult {
  valid: boolean;
  claims?: StaffClaims;
  error?:
    | 'INVALID_FORMAT'
    | 'INVALID_SIGNATURE'
    | 'MALFORMED_PAYLOAD'
    | 'TOKEN_EXPIRED'
    | 'TOKEN_REVOKED'
    | 'FUTURE_ISSUED_TOKEN'
    | 'INVALID_SECRET'
    | 'TENANT_MISMATCH';
}

export interface StaffDirectoryMember {
  id: string;
  name: string;
  role: StaffRole;
  branchId: string;
  station?: string;
  salt: string;
  pinHash: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_INVITE' | 'REVOKED';
  permissions?: string[];
}

export type SanitizedStaffMember = Omit<StaffDirectoryMember, 'pinHash' | 'salt'>;

const TOKEN_PREFIX = 'orb_stf';

// In-memory revocation caches backed by durable persistence
const revokedStaffTokenJtis = new Set<string>();
const revokedStaffTokens = new Set<string>();
const revokedStaffIds = new Set<string>();

// Rate-limiting and brute-force lockout tracker:
// Keys: `staff:${tenantId}:${staffId}` and `ip:${tenantId}:${clientIp}`
interface AttemptRecord {
  count: number;
  lockedUntil?: number;
}
const authAttemptTracker = new Map<string, AttemptRecord>();

/**
 * Resolves or generates a machine signing secret stored in data/.staff_signing_secret
 * with 0600 file permissions to ensure restart continuity across service reboots.
 */
function resolvePersistentMachineSecret(): string {
  const dataDir = process.env.RESTAURANT_STORE_PATH
    ? path.dirname(process.env.RESTAURANT_STORE_PATH)
    : path.join(__dirname, '..', '..', 'data');

  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch (e) {
      // Non-fatal
    }
  }

  const secretFile = path.join(dataDir, '.staff_signing_secret');
  if (fs.existsSync(secretFile)) {
    try {
      const stored = fs.readFileSync(secretFile, 'utf8').trim();
      if (stored.length >= 32) return stored;
    } catch (e) {
      // Non-fatal
    }
  }

  const freshSecret = crypto.randomBytes(32).toString('hex');
  try {
    fs.writeFileSync(secretFile, freshSecret, { mode: 0o600, encoding: 'utf8' });
  } catch (e) {
    // Non-fatal
  }
  return freshSecret;
}

/**
 * Resolves the server-authoritative secret for signing and verifying staff credentials.
 * In production mode, fails safe if a cryptographically weak or default key is detected.
 */
export function getStaffAuthSecret(): string {
  const envSecret = process.env.STAFF_AUTH_SECRET || process.env.STAFF_JWT_SECRET || process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (
      !envSecret ||
      envSecret.length < 32 ||
      envSecret.includes('default_key') ||
      envSecret.includes('test_only') ||
      envSecret === 'orbitox_hospitality_staff_vault_secret_key_v2_2026_test_only_0123456789abcdef'
    ) {
      throw new Error(
        '🚨 [SECURITY FATAL] STAFF_AUTH_SECRET (or STAFF_JWT_SECRET / JWT_SECRET) must be configured with at least 32 cryptographically strong characters in production mode.'
      );
    }
    return envSecret;
  }
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }
  return resolvePersistentMachineSecret();
}

/**
 * Resolves durable revocation store file path.
 */
function getRevocationFilePath(): string {
  const dataDir = process.env.RESTAURANT_STORE_PATH
    ? path.dirname(process.env.RESTAURANT_STORE_PATH)
    : path.join(__dirname, '..', '..', 'data');
  return path.join(dataDir, '.revoked_staff_tokens.json');
}

/**
 * Hydrates durable revocations from disk into the fast in-memory Set.
 */
export function loadDurableRevocations(): void {
  try {
    const file = getRevocationFilePath();
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.tokens)) {
        parsed.tokens.forEach((t: string) => revokedStaffTokens.add(t));
      }
      if (Array.isArray(parsed.jtis)) {
        parsed.jtis.forEach((j: string) => revokedStaffTokenJtis.add(j));
      }
      if (Array.isArray(parsed.staffIds)) {
        parsed.staffIds.forEach((s: string) => revokedStaffIds.add(s));
      }
    }
  } catch (err) {
    // Non-fatal
  }
}

/**
 * Persists current revocation sets to disk with atomic write and 0600 mode.
 */
export function persistDurableRevocations(): void {
  try {
    const file = getRevocationFilePath();
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const payload = JSON.stringify(
      {
        tokens: Array.from(revokedStaffTokens),
        jtis: Array.from(revokedStaffTokenJtis),
        staffIds: Array.from(revokedStaffIds),
        lastUpdated: new Date().toISOString(),
      },
      null,
      2
    );
    const tmp = `${file}.tmp.${Date.now()}_${process.pid}`;
    fs.writeFileSync(tmp, payload, { mode: 0o600, encoding: 'utf8' });
    fs.renameSync(tmp, file);
  } catch (err) {
    console.error('⚠️ [Security] Failed to persist revocations durably:', err);
  }
}

// Initial hydration on module initialization
loadDurableRevocations();

/**
 * Slow cryptographic staff secret hashing using scrypt with per-user salt.
 * Resistant to GPU/ASIC brute force attacks.
 */
export function hashStaffSecretSync(secret: string, salt: string): string {
  const hash = crypto.scryptSync(secret, salt, 32, { N: 16384, r: 8, p: 1 });
  return `scrypt:${hash.toString('hex')}`;
}

/**
 * Legacy HMAC-SHA256 PIN hashing (kept for migration / backwards compatibility).
 */
export function hashLegacyPin(pin: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(`pin_salt_${pin}`).digest('hex');
}

/**
 * Primary PIN/secret hashing function — uses slow scrypt.
 */
export function hashPin(pin: string, salt: string): string {
  return hashStaffSecretSync(pin, salt);
}

/**
 * Verifies candidate secret against stored hash.
 * Supports transparent upgrade from legacy HMAC-SHA256 to slow scrypt.
 */
export function verifyStaffSecret(
  candidateSecret: string,
  storedHash: string,
  salt: string
): { valid: boolean; needsRehash: boolean } {
  if (!candidateSecret || !storedHash || !salt) {
    return { valid: false, needsRehash: false };
  }

  // Modern slow scrypt hash
  if (storedHash.startsWith('scrypt:')) {
    const candidate = hashStaffSecretSync(candidateSecret, salt);
    const candidateBuf = Buffer.from(candidate);
    const storedBuf = Buffer.from(storedHash);
    if (candidateBuf.length === storedBuf.length && crypto.timingSafeEqual(candidateBuf, storedBuf)) {
      return { valid: true, needsRehash: false };
    }
    return { valid: false, needsRehash: false };
  }

  // Legacy HMAC-SHA256 hash path -> signals re-hash required on successful verification
  try {
    const legacyCandidate = hashLegacyPin(candidateSecret, salt);
    const candidateBuf = Buffer.from(legacyCandidate, 'hex');
    const storedBuf = Buffer.from(storedHash, 'hex');
    if (candidateBuf.length === storedBuf.length && crypto.timingSafeEqual(candidateBuf, storedBuf)) {
      return { valid: true, needsRehash: true };
    }
  } catch {
    // Non-hex or malformed
  }

  return { valid: false, needsRehash: false };
}

/**
 * Resolves the real client IP. Only honors x-forwarded-for if the direct peer
 * socket address matches a configured trusted proxy in TRUSTED_PROXIES.
 */
export function resolveClientIp(req: http.IncomingMessage): string {
  const socketIp = req.socket?.remoteAddress || '127.0.0.1';
  const trustedProxiesEnv = process.env.TRUSTED_PROXIES;
  if (!trustedProxiesEnv) {
    // No trusted proxy configured -> Ignore x-forwarded-for to prevent attacker-controlled header spoofing
    return socketIp;
  }
  const trustedList = trustedProxiesEnv.split(',').map((p) => p.trim()).filter(Boolean);
  const isTrusted = trustedList.some((t) => {
    if (t === '*' || t === socketIp) return true;
    if (
      t === '127.0.0.1' &&
      (socketIp === '127.0.0.1' || socketIp === '::ffff:127.0.0.1' || socketIp === '::1')
    ) {
      return true;
    }
    return false;
  });

  if (!isTrusted) {
    return socketIp;
  }

  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
    return parts[0] || socketIp;
  }
  return socketIp;
}

/**
 * Device enrollment token claims and signing.
 * Allows floor/kitchen staff short PINs only on verified enrolled devices.
 */
export interface DeviceTokenClaims {
  tenantId: string;
  branchId: string;
  deviceId: string;
  enrolledAt: number;
}

export function issueDeviceToken(options: {
  tenantId: string;
  branchId: string;
  deviceId?: string;
}): string {
  if (!options.tenantId) throw new Error('tenantId is required to issue device token');
  const deviceId = options.deviceId || `dev_${crypto.randomBytes(8).toString('hex')}`;
  const claims: DeviceTokenClaims = {
    tenantId: options.tenantId,
    branchId: options.branchId || '*',
    deviceId,
    enrolledAt: Math.floor(Date.now() / 1000),
  };
  const payloadBase64 = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');
  const secret = deriveTenantSigningSecret(options.tenantId);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`orb_dev.${payloadBase64}`)
    .digest('base64url');
  return `orb_dev.${payloadBase64}.${signature}`;
}

export function verifyDeviceToken(
  token: string,
  expectedTenantId: string,
  expectedBranchId?: string
): { valid: boolean; claims?: DeviceTokenClaims; error?: string } {
  if (!token || typeof token !== 'string') return { valid: false, error: 'INVALID_TOKEN' };
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'orb_dev') return { valid: false, error: 'INVALID_FORMAT' };
  const [, payloadBase64, providedSig] = parts;
  const secret = deriveTenantSigningSecret(expectedTenantId);
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`orb_dev.${payloadBase64}`)
    .digest('base64url');
  const pBuf = Buffer.from(providedSig);
  const eBuf = Buffer.from(expectedSig);
  if (pBuf.length !== eBuf.length || !crypto.timingSafeEqual(pBuf, eBuf)) {
    return { valid: false, error: 'INVALID_SIGNATURE' };
  }
  let claims: DeviceTokenClaims;
  try {
    claims = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
  } catch {
    return { valid: false, error: 'MALFORMED_PAYLOAD' };
  }
  if (claims.tenantId !== expectedTenantId) {
    return { valid: false, error: 'TENANT_MISMATCH' };
  }
  if (
    expectedBranchId &&
    expectedBranchId !== '*' &&
    claims.branchId !== '*' &&
    claims.branchId !== expectedBranchId
  ) {
    return { valid: false, error: 'BRANCH_MISMATCH' };
  }
  return { valid: true, claims };
}

/**
 * DEV_TEST_STAFF_FIXTURES removed from runtime path.
 * Seeding occurs authoritatively through provisioning scripts.
 */
export const DEV_TEST_STAFF_FIXTURES: StaffDirectoryMember[] = [];
export const STAFF_DIRECTORY: StaffDirectoryMember[] = [];

type StaffPersistenceCallback = (member: StaffDirectoryMember) => void;
let staffPersistenceCallback: StaffPersistenceCallback | null = null;

export function registerStaffPersistenceCallback(cb: StaffPersistenceCallback): void {
  staffPersistenceCallback = cb;
}

export function loadPersistedStaffMembers(members: StaffDirectoryMember[]): void {
  if (!Array.isArray(members)) return;
  for (const m of members) {
    const existingIdx = STAFF_DIRECTORY.findIndex((x) => x.id === m.id);
    if (existingIdx >= 0) {
      STAFF_DIRECTORY[existingIdx] = m;
    } else {
      STAFF_DIRECTORY.push(m);
    }
  }
}

export function getPublicStaffList(branchId?: string): SanitizedStaffMember[] {
  return STAFF_DIRECTORY
    .filter((m) => !branchId || branchId === '*' || m.branchId === '*' || m.branchId === branchId)
    .map(({ salt, pinHash, ...safe }) => safe);
}

export function getStaffMember(id: string): StaffDirectoryMember | undefined {
  return STAFF_DIRECTORY.find((m) => m.id === id);
}

export function createStaffMember(data: {
  name: string;
  role: 'MANAGER' | 'OPERATIONS' | 'POS' | 'CHEF' | 'ADMIN';
  branchId: string;
  station?: string;
  pin: string;
  permissions?: string[];
}): SanitizedStaffMember {
  if (!data.name || !data.pin || !data.role || !data.branchId) {
    throw new Error('Name, role, branchId, and PIN are required');
  }
  const id = `stf_${data.role.toLowerCase()}_${data.branchId === '*' ? 'all' : data.branchId.replace('branch_', '')}_${Date.now().toString(36)}`;
  const salt = `salt_${data.branchId}_${crypto.randomBytes(8).toString('hex')}`;
  const pinHash = hashPin(data.pin, salt);
  const member: StaffDirectoryMember = {
    id,
    name: data.name.trim(),
    role: data.role,
    branchId: data.branchId,
    station: data.station,
    salt,
    pinHash,
    status: 'ACTIVE',
    permissions: data.permissions,
  };
  STAFF_DIRECTORY.push(member);
  if (staffPersistenceCallback) {
    try {
      staffPersistenceCallback(member);
    } catch (e) {
      console.error('Failed to execute staff persistence callback:', e);
    }
  }
  const { salt: _s, pinHash: _p, ...safe } = member;
  return safe;
}

export function updateStaffMember(
  id: string,
  updates: Partial<{
    name: string;
    role: 'MANAGER' | 'OPERATIONS' | 'POS' | 'CHEF' | 'ADMIN';
    branchId: string;
    station?: string;
    status: 'ACTIVE' | 'SUSPENDED';
    pin?: string;
    permissions?: string[];
  }>
): SanitizedStaffMember | null {
  const member = STAFF_DIRECTORY.find((m) => m.id === id);
  if (!member) return null;
  if (updates.name !== undefined) member.name = updates.name.trim();
  if (updates.role !== undefined) member.role = updates.role;
  if (updates.branchId !== undefined) member.branchId = updates.branchId;
  if (updates.station !== undefined) member.station = updates.station;
  if (updates.status !== undefined) member.status = updates.status;
  if (updates.permissions !== undefined) member.permissions = updates.permissions;
  if (updates.pin) {
    const salt = `salt_${member.branchId}_${crypto.randomBytes(8).toString('hex')}`;
    member.salt = salt;
    member.pinHash = hashPin(updates.pin, salt);
  }
  if (staffPersistenceCallback) {
    try {
      staffPersistenceCallback(member);
    } catch (e) {
      console.error('Failed to execute staff persistence callback on update:', e);
    }
  }
  const { salt: _s, pinHash: _p, ...safe } = member;
  return safe;
}

export function revokeStaffMemberTokens(staffId: string): boolean {
  if (!staffId) return false;
  revokedStaffIds.add(staffId);
  persistDurableRevocations();
  return true;
}

export function isStaffMemberRevoked(staffId: string): boolean {
  return revokedStaffIds.has(staffId);
}

/**
 * Checks lockout for a staff account and client IP within a tenant.
 */
export function checkStaffLockout(
  tenantId: string,
  staffId: string,
  clientIp: string
): { isLocked: boolean; error?: string; remainingSeconds?: number } {
  const now = Date.now();
  const staffKey = `staff:${tenantId}:${staffId}`;
  const staffRec = authAttemptTracker.get(staffKey);
  if (staffRec?.lockedUntil && staffRec.lockedUntil > now) {
    const remainingSeconds = Math.ceil((staffRec.lockedUntil - now) / 1000);
    return {
      isLocked: true,
      remainingSeconds,
      error: `Staff account locked due to too many failed attempts. Try again in ${remainingSeconds}s.`,
    };
  }

  const ipKey = `ip:${tenantId}:${clientIp}`;
  const ipRec = authAttemptTracker.get(ipKey);
  if (ipRec?.lockedUntil && ipRec.lockedUntil > now) {
    const remainingSeconds = Math.ceil((ipRec.lockedUntil - now) / 1000);
    return {
      isLocked: true,
      remainingSeconds,
      error: `Client IP temporarily throttled due to excessive failed attempts. Try again in ${remainingSeconds}s.`,
    };
  }

  return { isLocked: false };
}

/**
 * Records failed authentication attempt.
 * 5 consecutive failed attempts lock that specific staff member for 15 minutes.
 */
export function recordFailedStaffAttempt(
  tenantId: string,
  staffId: string,
  clientIp: string
): { isLocked: boolean; error?: string; remainingSeconds?: number } {
  const now = Date.now();
  const staffKey = `staff:${tenantId}:${staffId}`;
  const staffRec = authAttemptTracker.get(staffKey) || { count: 0 };
  staffRec.count += 1;
  let isLocked = false;
  let remainingSeconds = 0;
  if (staffRec.count >= 5) {
    staffRec.lockedUntil = now + 15 * 60 * 1000;
    isLocked = true;
    remainingSeconds = 15 * 60;
  }
  authAttemptTracker.set(staffKey, staffRec);

  const ipKey = `ip:${tenantId}:${clientIp}`;
  const ipRec = authAttemptTracker.get(ipKey) || { count: 0 };
  ipRec.count += 1;
  if (ipRec.count >= 20) {
    ipRec.lockedUntil = now + 15 * 60 * 1000;
  }
  authAttemptTracker.set(ipKey, ipRec);

  if (isLocked) {
    return {
      isLocked: true,
      remainingSeconds,
      error: `Account locked due to 5 consecutive failed attempts. Try again in ${remainingSeconds}s.`,
    };
  }
  return { isLocked: false };
}

/**
 * Resets failed counter on successful staff login.
 */
export function recordSuccessfulStaffAttempt(
  tenantId: string,
  staffId: string,
  clientIp: string
): void {
  authAttemptTracker.delete(`staff:${tenantId}:${staffId}`);
}

/**
 * Resets brute-force rate-limiting tracker for PIN verification.
 */
export function resetStaffLockout(key?: string): void {
  if (key) {
    authAttemptTracker.delete(key);
  } else {
    authAttemptTracker.clear();
  }
}

/**
 * Authenticates a staff PIN against directory (internal/legacy fallback).
 */
export function authenticateStaffByPin(
  pin: string,
  options?: {
    branchId?: string;
    staffId?: string;
    clientIp?: string;
    tenantId?: string;
  }
): {
  success: boolean;
  member?: StaffDirectoryMember;
  error?: string;
  isLocked?: boolean;
} {
  const tid = options?.tenantId || 'global';
  const sid = options?.staffId || 'unidentified';
  const ip = options?.clientIp || '127.0.0.1';

  const lockout = checkStaffLockout(tid, sid, ip);
  if (lockout.isLocked) {
    return { success: false, error: lockout.error, isLocked: true };
  }

  if (!pin || typeof pin !== 'string') {
    return { success: false, error: 'MISSING_PIN' };
  }

  let candidates = STAFF_DIRECTORY.filter((m) => m.status === 'ACTIVE');
  if (options?.staffId) {
    candidates = candidates.filter((m) => m.id === options.staffId);
  }

  let matchedMember: StaffDirectoryMember | undefined;
  for (const candidate of candidates) {
    const verified = verifyStaffSecret(pin, candidate.pinHash, candidate.salt);
    if (verified.valid) {
      matchedMember = candidate;
      break;
    }
  }

  if (matchedMember) {
    recordSuccessfulStaffAttempt(tid, matchedMember.id, ip);
    return { success: true, member: matchedMember };
  }

  const fail = recordFailedStaffAttempt(tid, sid, ip);
  return {
    success: false,
    error: fail.isLocked ? fail.error : 'INVALID_CREDENTIALS',
    isLocked: fail.isLocked,
  };
}

/**
 * Derives a cryptographically separated signing secret for a specific tenant using HKDF.
 * Guarantees that even if one tenant's secret or token is compromised, other tenants remain secure.
 */
export function deriveTenantSigningSecret(tenantId: string, masterSecret?: string): string {
  const master = masterSecret || getStaffAuthSecret();
  const derived = crypto.hkdfSync(
    'sha256',
    Buffer.from(master, 'utf8'),
    Buffer.from(tenantId, 'utf8'),
    Buffer.from('restaurantos-tenant-jwt-signing', 'utf8'),
    32
  );
  return Buffer.from(derived).toString('hex');
}

/**
 * Issues a cryptographically signed staff token with HMAC-SHA256 signature.
 * When tenantId is specified, the token is signed with an HKDF-derived per-tenant secret.
 */
export function issueStaffToken(
  options: {
    sub: string;
    name?: string;
    role: StaffRole;
    tenantId: string;
    branchId?: string;
    station?: string;
    permissions?: string[];
    expiresInSeconds?: number;
  },
  secret?: string
): string {
  if (!options.tenantId) {
    throw new Error('tenantId is strictly required to issue staff tokens.');
  }

  const signingSecret = secret || deriveTenantSigningSecret(options.tenantId);
  const now = Math.floor(Date.now() / 1000);
  const ttl = options.expiresInSeconds ?? 60 * 60; // Default 1 hour short expiry
  const jti = `jti_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

  const defaultPermissions: Record<string, string[]> = {
    OWNER: ['*'],
    ADMIN: ['*'],
    MANAGER: ['*'],
    OPERATIONS: [
      'SERVICE_REQUEST_RESOLVE',
      'TABLE_UPDATE',
      'LAYOUT_MUTATE',
      'MERGE_TABLES',
      'SEAT_MANAGE',
    ],
    POS: ['SESSION_CLOSE', 'BILL_SETTLEMENT', 'ORDER_CREATE', 'FINANCE_READ'],
    SERVER: ['ORDER_CREATE', 'SERVICE_REQUEST_RESOLVE', 'TABLE_UPDATE', 'BILL_SETTLEMENT'],
    CHEF: ['KDS_BUMP', 'ITEM_FULFILL', 'RECALL', 'EXPO_DISPATCH'],
  };

  const claims: StaffClaims = {
    sub: options.sub,
    name: options.name,
    role: options.role,
    tenantId: options.tenantId,
    branchId: options.branchId || '*',
    station: options.station,
    permissions: options.permissions || defaultPermissions[options.role] || [],
    iat: now,
    exp: now + ttl,
    jti,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', signingSecret)
    .update(`${TOKEN_PREFIX}.${payloadBase64}`)
    .digest('base64url');

  return `${TOKEN_PREFIX}.${payloadBase64}.${signature}`;
}

/**
 * Validates a staff token: checks prefix, timing-safe HMAC-SHA256 signature, expiry,
 * future issuance, and restart-durable revocation.
 * Supports per-tenant HKDF key derivation via expectedTenantId.
 */
export function verifyStaffToken(
  token: string,
  secretOrOptions?: string | { secret?: string; expectedTenantId?: string }
): TokenVerificationResult {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'INVALID_FORMAT' };
  }

  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) {
    return { valid: false, error: 'INVALID_FORMAT' };
  }

  const [, payloadBase64, providedSig] = parts;

  // 1. Check revocation by exact token string
  if (revokedStaffTokens.has(token)) {
    return { valid: false, error: 'TOKEN_REVOKED' };
  }

  let verificationSecret: string;
  let expectedTenantId: string | undefined;

  if (typeof secretOrOptions === 'string') {
    verificationSecret = secretOrOptions;
  } else if (secretOrOptions && typeof secretOrOptions === 'object') {
    expectedTenantId = secretOrOptions.expectedTenantId;
    if (secretOrOptions.secret) {
      verificationSecret = secretOrOptions.secret;
    } else if (expectedTenantId) {
      verificationSecret = deriveTenantSigningSecret(expectedTenantId);
    } else {
      verificationSecret = getStaffAuthSecret();
    }
  } else {
    verificationSecret = getStaffAuthSecret();
  }

  const expectedSig = crypto
    .createHmac('sha256', verificationSecret)
    .update(`${TOKEN_PREFIX}.${payloadBase64}`)
    .digest('base64url');

  const providedBuf = Buffer.from(providedSig);
  const expectedBuf = Buffer.from(expectedSig);

  if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
    return { valid: false, error: 'INVALID_SIGNATURE' };
  }

  let claims: StaffClaims;
  try {
    const jsonStr = Buffer.from(payloadBase64, 'base64url').toString('utf8');
    claims = JSON.parse(jsonStr);
  } catch (err) {
    return { valid: false, error: 'MALFORMED_PAYLOAD' };
  }

  // 2. Check revocation by unique token identifier (jti) or staff subject ID
  if (claims.jti && revokedStaffTokenJtis.has(claims.jti)) {
    return { valid: false, error: 'TOKEN_REVOKED' };
  }
  if (claims.sub && (revokedStaffIds.has(claims.sub) || isStaffMemberRevoked(claims.sub))) {
    return { valid: false, error: 'TOKEN_REVOKED' };
  }

  const now = Math.floor(Date.now() / 1000);

  // 3. Reject future-issued tokens (protect against clock manipulation / replay attacks > 5 mins)
  if (claims.iat && claims.iat > now + 300) {
    return { valid: false, error: 'FUTURE_ISSUED_TOKEN', claims };
  }

  // 4. Check token expiration
  if (claims.exp && claims.exp < now) {
    return { valid: false, error: 'TOKEN_EXPIRED', claims };
  }

  // 5. Enforce tenant host scoping strictly: token MUST have tenantId AND match expectedTenantId
  if (expectedTenantId) {
    if (!claims.tenantId || claims.tenantId !== expectedTenantId) {
      return { valid: false, error: 'TENANT_MISMATCH', claims };
    }
  }

  return { valid: true, claims };
}

/**
 * Revokes a staff token by registering its identifier or full token string.
 * Persists durably across server restarts.
 */
export function revokeStaffToken(token: string): boolean {
  if (!token) return false;
  revokedStaffTokens.add(token);
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const claims: StaffClaims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      if (claims.jti) revokedStaffTokenJtis.add(claims.jti);
    }
  } catch (err) {
    // Non-fatal
  }
  persistDurableRevocations();
  return true;
}

/**
 * Checks if a token has been explicitly revoked.
 */
export function isStaffTokenRevoked(token: string): boolean {
  if (revokedStaffTokens.has(token)) return true;
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const claims: StaffClaims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      if (claims.jti && revokedStaffTokenJtis.has(claims.jti)) return true;
    }
  } catch (err) {
    // Non-fatal
  }
  return false;
}

/**
 * Hydrates staff revocations from external persistent storage.
 */
export function loadPersistedStaffRevocations(tokens: string[], jtis: string[], staffIds?: string[]): void {
  if (Array.isArray(tokens)) tokens.forEach((t) => revokedStaffTokens.add(t));
  if (Array.isArray(jtis)) jtis.forEach((j) => revokedStaffTokenJtis.add(j));
  if (Array.isArray(staffIds)) staffIds.forEach((s) => revokedStaffIds.add(s));
}

/**
 * Resolves whether an incoming request Origin is permitted under CORS policy.
 * Evaluates process.env.RESTAURANTOS_ALLOWED_ORIGINS (comma-separated origins).
 * Defaults safely to localhost / 127.0.0.1 / [::1].
 * Returns the permitted origin string to reflect, or null if disallowed.
 */
export function resolveAllowedOrigin(req?: http.IncomingMessage): string | null {
  if (!req || !req.headers) return null;
  const origin = req.headers.origin;
  if (!origin || typeof origin !== 'string') return null;

  const envOrigins = process.env.RESTAURANTOS_ALLOWED_ORIGINS;
  if (envOrigins) {
    const list = envOrigins.split(',').map((s) => s.trim()).filter(Boolean);
    if (list.includes('*')) return '*';
    if (list.includes(origin)) return origin;
    return null;
  }

  // Default allowlist: localhost and loopback interfaces
  try {
    const parsed = new URL(origin);
    if (
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '[::1]'
    ) {
      return origin;
    }
  } catch {
    return null;
  }

  return null;
}

let cachedStationSecrets: Record<string, { station: string; branchId: string; isPrivileged: boolean }> | null = null;

function resolvePersistentStationSecretsFile(): string {
  const dataDir = process.env.RESTAURANT_STORE_PATH
    ? path.dirname(process.env.RESTAURANT_STORE_PATH)
    : path.join(__dirname, '..', '..', 'data');

  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {
      // Non-fatal
    }
  }

  return path.join(dataDir, '.station_secrets.json');
}

/**
 * Resolves registered physical hardware kitchen station secrets.
 *
 * Security & Environment Rules:
 * - Station credentials are dynamically loaded from RESTAURANT_STATION_SECRETS (JSON or comma-separated pairs)
 *   or from a local permissions-restricted 0600 file (.station_secrets.json).
 * - If neither is present, dynamic high-entropy station secrets are generated and written to .station_secrets.json (mode 0600).
 * - Hardcoded static stn_sec_* secrets are completely eliminated.
 */
export function getRegisteredStationSecrets(): Record<
  string,
  { station: string; branchId: string; isPrivileged: boolean }
> {
  if (cachedStationSecrets && !process.env.RELOAD_STATION_SECRETS) {
    return cachedStationSecrets;
  }

  const configuredSecrets: Record<string, { station: string; branchId: string; isPrivileged: boolean }> = {};

  // 1. From environment variable RESTAURANT_STATION_SECRETS
  const envSecrets = process.env.RESTAURANT_STATION_SECRETS;
  if (envSecrets) {
    try {
      const parsed = JSON.parse(envSecrets);
      if (typeof parsed === 'object' && parsed !== null) {
        Object.assign(configuredSecrets, parsed);
      }
    } catch {
      const pairs = envSecrets.split(',');
      for (const pair of pairs) {
        const [sec, stn, br, priv] = pair.trim().split(':');
        if (sec && stn && br) {
          configuredSecrets[sec] = { station: stn, branchId: br, isPrivileged: priv === 'true' };
        }
      }
    }
    cachedStationSecrets = configuredSecrets;
    return configuredSecrets;
  }

  // 2. From persistent 0600 file .station_secrets.json
  const secretFile = resolvePersistentStationSecretsFile();
  if (fs.existsSync(secretFile)) {
    try {
      const content = fs.readFileSync(secretFile, 'utf8').trim();
      const parsed = JSON.parse(content);
      if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length > 0) {
        cachedStationSecrets = parsed;
        return parsed;
      }
    } catch {
      // Non-fatal, fallback to generation
    }
  }

  // 3. Dynamically generate fresh station secrets and save with 0600 mode
  const generated: Record<string, { station: string; branchId: string; isPrivileged: boolean }> = {
    [`stn_sec_${crypto.randomBytes(16).toString('hex')}`]: { station: 'TANDOOR', branchId: 'branch_ldh', isPrivileged: false },
    [`stn_sec_${crypto.randomBytes(16).toString('hex')}`]: { station: 'CURRY_LINE', branchId: 'branch_ldh', isPrivileged: false },
    [`stn_sec_${crypto.randomBytes(16).toString('hex')}`]: { station: 'EXPO', branchId: 'branch_ldh', isPrivileged: true },
    [`stn_sec_${crypto.randomBytes(16).toString('hex')}`]: { station: 'BEVERAGE', branchId: 'branch_ldh', isPrivileged: false },
  };

  try {
    fs.writeFileSync(secretFile, JSON.stringify(generated, null, 2), { mode: 0o600, encoding: 'utf8' });
  } catch {
    // Non-fatal
  }

  cachedStationSecrets = generated;
  return generated;
}

// Eagerly resolve and guarantee station secrets exist on boot
try {
  getRegisteredStationSecrets();
} catch {
  // Non-fatal during early boot
}

export const DEV_TEST_STATION_SECRETS: Record<
  string,
  { station: string; branchId: string; isPrivileged: boolean }
> = {};

export const REGISTERED_STATION_SECRETS: Record<
  string,
  { station: string; branchId: string; isPrivileged: boolean }
> = new Proxy({} as any, {
  get(target, prop: string) {
    const secrets = getRegisteredStationSecrets();
    return (secrets as any)[prop];
  },
  has(target, prop: string) {
    const secrets = getRegisteredStationSecrets();
    return prop in secrets;
  },
  ownKeys() {
    const secrets = getRegisteredStationSecrets();
    return Reflect.ownKeys(secrets);
  },
  getOwnPropertyDescriptor(target, prop) {
    const secrets = getRegisteredStationSecrets();
    if (prop in secrets) {
      return {
        configurable: true,
        enumerable: true,
        value: (secrets as any)[prop],
        writable: false,
      };
    }
    return undefined;
  },
});

/**
 * Development & Test Fixtures ONLY (Strictly disabled and forbidden in production mode).
 */
export const DEV_TEST_STAFF_TOKENS: Record<
  string,
  { role: 'MANAGER' | 'OPERATIONS' | 'POS' | 'CHEF' | 'ADMIN'; isPrivileged: boolean; station?: string; branchId: string }
> = {
  'staff:operations': { role: 'OPERATIONS', isPrivileged: false, branchId: 'branch_ldh' },
  'staff:floor': { role: 'OPERATIONS', isPrivileged: false, branchId: 'branch_ldh' },
  'staff:manager': { role: 'MANAGER', isPrivileged: true, branchId: '*' },
  'staff:pos': { role: 'POS', isPrivileged: true, branchId: '*' },
  'orbito_manager_token': { role: 'MANAGER', isPrivileged: true, branchId: '*' },
  'staff:chef_tandoor': { role: 'CHEF', isPrivileged: false, station: 'TANDOOR', branchId: 'branch_ldh' },
  'staff:chef_curry_line': { role: 'CHEF', isPrivileged: false, station: 'CURRY_LINE', branchId: 'branch_ldh' },
};

export const DEV_TEST_STATION_TOKENS: Record<
  string,
  { station: string; branchId: string; isPrivileged: boolean }
> = {
  'station_tandoor_key': { station: 'TANDOOR', branchId: 'branch_ldh', isPrivileged: false },
  'station_curry_key': { station: 'CURRY_LINE', branchId: 'branch_ldh', isPrivileged: false },
  'station_expo_key': { station: 'EXPO', branchId: 'branch_ldh', isPrivileged: true },
  'station:tandoor:secret': { station: 'TANDOOR', branchId: 'branch_ldh', isPrivileged: false },
  'station:curry:secret': { station: 'CURRY_LINE', branchId: 'branch_ldh', isPrivileged: false },
  'station:bar:secret': { station: 'BAR', branchId: 'branch_ldh', isPrivileged: false },
  'station:expo:secret': { station: 'EXPO', branchId: 'branch_ldh', isPrivileged: true },
};
