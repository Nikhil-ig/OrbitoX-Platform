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

export interface StaffClaims {
  sub: string;
  name?: string;
  role: 'MANAGER' | 'OPERATIONS' | 'POS' | 'CHEF' | 'ADMIN';
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
    | 'INVALID_SECRET';
}

export interface StaffDirectoryMember {
  id: string;
  name: string;
  role: 'MANAGER' | 'OPERATIONS' | 'POS' | 'CHEF' | 'ADMIN';
  branchId: string;
  station?: string;
  salt: string;
  pinHash: string;
  status: 'ACTIVE' | 'SUSPENDED';
  permissions?: string[];
}

export type SanitizedStaffMember = Omit<StaffDirectoryMember, 'pinHash' | 'salt'>;

const TOKEN_PREFIX = 'orb_stf';

// In-memory revocation caches backed by durable persistence
const revokedStaffTokenJtis = new Set<string>();
const revokedStaffTokens = new Set<string>();
const revokedStaffIds = new Set<string>();

// Rate-limiting tracker for PIN verification: identifier -> { count, lockedUntil }
const pinAttemptTracker = new Map<string, { count: number; lockedUntil?: number }>();

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
 * Helper to compute salted PIN hash.
 */
function hashPin(pin: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(`pin_salt_${pin}`).digest('hex');
}

/**
 * Server-Authoritative Staff Directory with Salted Hashes.
 * Staff roles and branch affiliations are strictly derived from these records.
 *
 * In production mode:
 * - Default static fixture accounts are STRICTLY QUARANTINED and never loaded.
 * - Staff accounts must be dynamically provisioned and loaded from persistent store.
 * - Default PINs (8899, 1122, 5566, 0000, etc.) are rejected in production.
 *
 * Rotation / Invalidation Policy:
 * - To rotate a PIN: managers or administrators invoke PATCH /api/restaurant/staff/:id with { pin: '<new_pin>' }.
 * - To invalidate a staff credential: POST /api/restaurant/staff/:id/revoke immediately terminates active sessions.
 */
const SALT_LUDHIANA = 'salt_ldh_8392_sec';
const SALT_CHANDIGARH = 'salt_chd_4910_sec';
const SALT_DELHI = 'salt_del_7214_sec';
const SALT_ADMIN = 'salt_adm_9918_sec';

export const DEV_TEST_STAFF_FIXTURES: StaffDirectoryMember[] = [
  {
    id: 'stf_mgr_ldh_01',
    name: 'Sukhwinder Sandhu',
    role: 'MANAGER',
    branchId: 'branch_ldh',
    salt: SALT_LUDHIANA,
    pinHash: hashPin('8899', SALT_LUDHIANA),
    status: 'ACTIVE',
  },
  {
    id: 'stf_ops_ldh_01',
    name: 'Amanpreet Kaur',
    role: 'OPERATIONS',
    branchId: 'branch_ldh',
    salt: SALT_LUDHIANA,
    pinHash: hashPin('1122', SALT_LUDHIANA),
    status: 'ACTIVE',
  },
  {
    id: 'stf_pos_ldh_01',
    name: 'Rohan Verma',
    role: 'POS',
    branchId: 'branch_ldh',
    salt: SALT_LUDHIANA,
    pinHash: hashPin('3344', SALT_LUDHIANA),
    status: 'ACTIVE',
  },
  {
    id: 'stf_chef_ldh_01',
    name: 'Master Chef Baljit',
    role: 'CHEF',
    branchId: 'branch_ldh',
    station: 'TANDOOR',
    salt: SALT_LUDHIANA,
    pinHash: hashPin('5566', SALT_LUDHIANA),
    status: 'ACTIVE',
  },
  {
    id: 'stf_mgr_chd_01',
    name: 'Karan Kapoor',
    role: 'MANAGER',
    branchId: 'branch_chd',
    salt: SALT_CHANDIGARH,
    pinHash: hashPin('9900', SALT_CHANDIGARH),
    status: 'ACTIVE',
  },
  {
    id: 'stf_mgr_del_01',
    name: 'Rajesh Mehra',
    role: 'MANAGER',
    branchId: 'branch_del',
    salt: SALT_DELHI,
    pinHash: hashPin('7788', SALT_DELHI),
    status: 'ACTIVE',
  },
  {
    id: 'stf_admin_01',
    name: 'Head of Culinary Operations',
    role: 'ADMIN',
    branchId: '*',
    salt: SALT_ADMIN,
    pinHash: hashPin('0000', SALT_ADMIN),
    status: 'ACTIVE',
  },
];

// In production, STAFF_DIRECTORY starts empty and is populated strictly from persisted/provisioned store records.
export const STAFF_DIRECTORY: StaffDirectoryMember[] =
  process.env.NODE_ENV === 'production' ? [] : [...DEV_TEST_STAFF_FIXTURES];

type StaffPersistenceCallback = (member: StaffDirectoryMember) => void;
let staffPersistenceCallback: StaffPersistenceCallback | null = null;

export function registerStaffPersistenceCallback(cb: StaffPersistenceCallback): void {
  staffPersistenceCallback = cb;
}

/**
 * Hydrates dynamically provisioned staff members from persistent storage.
 */
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

/**
 * Returns a sanitized view of the staff directory with PIN hashes and salts stripped.
 */
export function getPublicStaffList(branchId?: string): SanitizedStaffMember[] {
  return STAFF_DIRECTORY
    .filter((m) => !branchId || branchId === '*' || m.branchId === '*' || m.branchId === branchId)
    .map(({ salt, pinHash, ...safe }) => safe);
}

/**
 * Looks up a staff member by ID (internal use).
 */
export function getStaffMember(id: string): StaffDirectoryMember | undefined {
  return STAFF_DIRECTORY.find((m) => m.id === id);
}

/**
 * Creates and registers a new staff member with salted SHA-256 PIN hash.
 */
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

/**
 * Authoritatively updates staff assignment, station permissions, status, or PIN.
 */
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

/**
 * Revokes all tokens associated with a staff member's ID.
 */
export function revokeStaffMemberTokens(staffId: string): boolean {
  if (!staffId) return false;
  revokedStaffIds.add(staffId);
  persistDurableRevocations();
  return true;
}

/**
 * Checks if a staff member's credentials have been revoked.
 */
export function isStaffMemberRevoked(staffId: string): boolean {
  return revokedStaffIds.has(staffId);
}

/**
 * Resets brute-force rate-limiting tracker for PIN verification.
 */
export function resetStaffLockout(key?: string): void {
  if (key) {
    pinAttemptTracker.delete(key);
  } else {
    pinAttemptTracker.clear();
  }
}

/**
 * Authenticates a staff PIN against the server-authoritative staff directory.
 * Enforces rate-limiting (5 failures -> 15 min lock) and timing-safe equality.
 * In production mode, rejects hardcoded development fixtures and requires provisioned records.
 */
export function authenticateStaffByPin(
  pin: string,
  options?: {
    branchId?: string;
    staffId?: string;
    clientIp?: string;
  }
): {
  success: boolean;
  member?: StaffDirectoryMember;
  error?: string;
  isLocked?: boolean;
} {
  const rateLimitKey = options?.clientIp || options?.staffId || 'global_auth_ip';
  const tracker = pinAttemptTracker.get(rateLimitKey);
  const now = Date.now();

  if (tracker && tracker.lockedUntil && tracker.lockedUntil > now) {
    const remainingSeconds = Math.ceil((tracker.lockedUntil - now) / 1000);
    return {
      success: false,
      error: `TOO_MANY_FAILED_ATTEMPTS: Account locked. Try again in ${remainingSeconds}s.`,
      isLocked: true,
    };
  }

  if (!pin || typeof pin !== 'string') {
    return { success: false, error: 'MISSING_PIN' };
  }

  // In production mode, strictly fail closed if no authoritative staff accounts are provisioned
  if (process.env.NODE_ENV === 'production' && STAFF_DIRECTORY.length === 0) {
    return {
      success: false,
      error: 'NO_ACTIVE_STAFF_ACCOUNTS: Production mode requires authoritatively provisioned staff credentials.',
    };
  }

  // Find candidate members
  let candidates = STAFF_DIRECTORY.filter((m) => m.status === 'ACTIVE');
  if (options?.staffId) {
    candidates = candidates.filter((m) => m.id === options.staffId);
  }

  let matchedMember: StaffDirectoryMember | undefined;

  for (const candidate of candidates) {
    const candidateHash = hashPin(pin, candidate.salt);
    const candidateBuf = Buffer.from(candidateHash, 'hex');
    const expectedBuf = Buffer.from(candidate.pinHash, 'hex');

    if (candidateBuf.length === expectedBuf.length && crypto.timingSafeEqual(candidateBuf, expectedBuf)) {
      matchedMember = candidate;
      break;
    }
  }

  if (matchedMember) {
    // Reset failed counter on success
    pinAttemptTracker.delete(rateLimitKey);
    return { success: true, member: matchedMember };
  }

  // Record failed attempt
  const currentAttempts = (tracker?.count || 0) + 1;
  if (currentAttempts >= 5) {
    pinAttemptTracker.set(rateLimitKey, {
      count: currentAttempts,
      lockedUntil: now + 15 * 60 * 1000, // 15-minute lockout
    });
    return {
      success: false,
      error: 'TOO_MANY_FAILED_ATTEMPTS: Account locked due to 5 consecutive failed PIN attempts.',
      isLocked: true,
    };
  } else {
    pinAttemptTracker.set(rateLimitKey, { count: currentAttempts });
    return { success: false, error: 'INVALID_CREDENTIALS', isLocked: false };
  }
}

/**
 * Issues a cryptographically signed staff token with HMAC-SHA256 signature.
 */
export function issueStaffToken(
  options: {
    sub: string;
    name?: string;
    role: 'MANAGER' | 'OPERATIONS' | 'POS' | 'CHEF' | 'ADMIN';
    branchId?: string;
    station?: string;
    permissions?: string[];
    expiresInSeconds?: number;
  },
  secret?: string
): string {
  const signingSecret = secret || getStaffAuthSecret();
  const now = Math.floor(Date.now() / 1000);
  const ttl = options.expiresInSeconds ?? 8 * 60 * 60; // Default 8 hours
  const jti = `jti_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

  const defaultPermissions: Record<string, string[]> = {
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
    CHEF: ['KDS_BUMP', 'ITEM_FULFILL', 'RECALL', 'EXPO_DISPATCH'],
  };

  const claims: StaffClaims = {
    sub: options.sub,
    name: options.name,
    role: options.role,
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
 */
export function verifyStaffToken(token: string, secret?: string): TokenVerificationResult {
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

  const verificationSecret = secret || getStaffAuthSecret();
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

export const DEV_TEST_STATION_SECRETS: Record<
  string,
  { station: string; branchId: string; isPrivileged: boolean }
> = {
  'stn_sec_tandoor_ldh_99x7': { station: 'TANDOOR', branchId: 'branch_ldh', isPrivileged: false },
  'stn_sec_curry_ldh_88y6': { station: 'CURRY_LINE', branchId: 'branch_ldh', isPrivileged: false },
  'stn_sec_expo_ldh_77z5': { station: 'EXPO', branchId: 'branch_ldh', isPrivileged: true },
  'stn_sec_beverage_ldh_66w4': { station: 'BEVERAGE', branchId: 'branch_ldh', isPrivileged: false },
};

/**
 * Resolves registered physical hardware kitchen station secrets.
 *
 * Security & Environment Rules:
 * - In production mode, station credentials MUST come from validated runtime configuration (RESTAURANT_STATION_SECRETS).
 * - Hardcoded source secrets and dev test fixtures are strictly forbidden in production.
 * - If no station secrets are configured in production, station authentication fails closed.
 *
 * Safe Rotation Process:
 * - Generate a new high-entropy random token (e.g. crypto.randomBytes(24).toString('hex')).
 * - Update RESTAURANT_STATION_SECRETS environment variable with the new secret mapping.
 * - Terminate active connections and update terminal hardware settings.
 */
export function getRegisteredStationSecrets(): Record<
  string,
  { station: string; branchId: string; isPrivileged: boolean }
> {
  const configuredSecrets: Record<string, { station: string; branchId: string; isPrivileged: boolean }> = {};

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
  }

  if (process.env.NODE_ENV === 'production') {
    return configuredSecrets;
  }

  return {
    ...DEV_TEST_STATION_SECRETS,
    ...configuredSecrets,
  };
}

export const REGISTERED_STATION_SECRETS: Record<
  string,
  { station: string; branchId: string; isPrivileged: boolean }
> = new Proxy(DEV_TEST_STATION_SECRETS, {
  get(target, prop: string) {
    const secrets = getRegisteredStationSecrets();
    return (secrets as any)[prop];
  },
  has(target, prop: string) {
    const secrets = getRegisteredStationSecrets();
    return prop in secrets;
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
