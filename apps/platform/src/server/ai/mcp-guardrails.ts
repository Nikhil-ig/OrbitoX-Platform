import 'server-only';
import crypto from 'node:crypto';

export interface InjectionScanResult {
  blocked: boolean;
  matches: string[];
}

export interface RedactionResult<T = unknown> {
  value: T;
  redactionsApplied: number;
  secretsFiltered: number;
}

const INJECTION_RULES: Array<{ id: string; pattern: RegExp }> = [
  { id: 'instruction_override', pattern: /\b(ignore|disregard|forget)\s+(all\s+)?(previous|prior|system)\s+(instructions|prompts|rules)\b/i },
  { id: 'policy_bypass', pattern: /\b(bypass|disable|skip|override)\s+(guardrail|approval|mfa|step[\s-]?up|rls|auth)\b/i },
  { id: 'prompt_delimiter', pattern: /(<\|im_start\|>|<\|system\|>|\[INST\]|<<SYS>>)/i },
  { id: 'sql_smuggling', pattern: /;\s*(drop|truncate|delete\s+from|alter|grant|revoke)\b|\bunion\s+all?\s+select\b/i },
  { id: 'shell_escape', pattern: /\$\([^)]+\)|`\s*(rm|curl|wget|bash|sh)\b/i },
];

const SENSITIVE_KEY_PATTERN = /(password|passcode|secret|private[_-]?key|api[_-]?key|token|csrf|mfa.*sealed|signature.*key)/i;
const EMAIL_KEY_PATTERN = /(email|contactEmail|billingEmail)/i;
const PHONE_KEY_PATTERN = /(phone|mobile)/i;

const PEM_BLOCK_RE = /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g;
const SECRET_TOKEN_RE = /\b(Bearer\s+[A-Za-z0-9._\-]{12,}|(?:ox_live|ox_test|sk_live|sk_test|rzp_live|rzp_test|whsec)_[A-Za-z0-9_\-]{8,})\b/gi;
const EMAIL_VALUE_RE = /\b([A-Za-z0-9._%+\-]{1,64})@([A-Za-z0-9.\-]+\.[A-Za-z]{2,})\b/g;
const PHONE_VALUE_RE = /(?:^|\s)(\+?[1-9]\d{9,14})(?=\s|$)/g;
const CARD_VALUE_RE = /\b(?:\d[ -]*?){13,19}\b/g;

function isLuhnValid(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (Number.isNaN(n)) return false;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return digits.length >= 13 && digits.length <= 19 && sum % 10 === 0;
}

/**
 * Scans untrusted MCP inputs or prompt strings for prompt-injection / policy-escape markers.
 */
export function scanPromptInjection(input: unknown, depth = 0): InjectionScanResult {
  if (depth > 12 || input === null || input === undefined) {
    return { blocked: false, matches: [] };
  }

  const matches = new Set<string>();

  if (typeof input === 'string') {
    for (const rule of INJECTION_RULES) {
      if (rule.pattern.test(input)) {
        matches.add(rule.id);
      }
    }
    return { blocked: matches.size > 0, matches: Array.from(matches) };
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      const sub = scanPromptInjection(item, depth + 1);
      for (const m of sub.matches) matches.add(m);
    }
    return { blocked: matches.size > 0, matches: Array.from(matches) };
  }

  if (typeof input === 'object') {
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      const kRes = scanPromptInjection(k, depth + 1);
      const vRes = scanPromptInjection(v, depth + 1);
      for (const m of kRes.matches) matches.add(m);
      for (const m of vRes.matches) matches.add(m);
    }
  }

  return { blocked: matches.size > 0, matches: Array.from(matches) };
}

function maskEmail(local: string, domain: string): string {
  const prefix = local.slice(0, Math.min(2, local.length));
  return `${prefix}***@${domain}`;
}

/**
 * Redacts PII and cryptographic/auth secrets recursively and returns exact counts.
 */
export function redactSensitiveData<T>(input: T, options: { maskEmails?: boolean } = {}): RedactionResult<T> {
  const maskEmails = options.maskEmails ?? true;
  let redactionsApplied = 0;
  let secretsFiltered = 0;

  function redactString(raw: string, keyName?: string): string {
    let out = raw;

    out = out.replace(PEM_BLOCK_RE, () => {
      secretsFiltered += 1;
      redactionsApplied += 1;
      return '[REDACTED_PRIVATE_KEY]';
    });

    out = out.replace(SECRET_TOKEN_RE, () => {
      secretsFiltered += 1;
      redactionsApplied += 1;
      return '[REDACTED_SECRET]';
    });

    out = out.replace(CARD_VALUE_RE, (candidate) => {
      const digits = candidate.replace(/[\s-]/g, '');
      if (isLuhnValid(digits)) {
        redactionsApplied += 1;
        return `[REDACTED_CARD_LAST4:${digits.slice(-4)}]`;
      }
      return candidate;
    });

    if (maskEmails) {
      out = out.replace(EMAIL_VALUE_RE, (_full, local: string, domain: string) => {
        redactionsApplied += 1;
        return maskEmail(local, domain);
      });
    } else if (keyName && EMAIL_KEY_PATTERN.test(keyName)) {
      out = out.replace(EMAIL_VALUE_RE, (_full, local: string, domain: string) => {
        redactionsApplied += 1;
        return maskEmail(local, domain);
      });
    }

    if (keyName && PHONE_KEY_PATTERN.test(keyName)) {
      if (out.trim().length > 0 && out !== '[REDACTED_PHONE]') {
        redactionsApplied += 1;
        return '[REDACTED_PHONE]';
      }
    } else {
      out = out.replace(PHONE_VALUE_RE, (full) => {
        redactionsApplied += 1;
        const leadingSpace = full.startsWith(' ') ? ' ' : '';
        return `${leadingSpace}[REDACTED_PHONE]`;
      });
    }

    return out;
  }

  function visit(value: unknown, depth: number, keyName?: string): unknown {
    if (depth > 12 || value === null || value === undefined) return value;

    if (keyName && SENSITIVE_KEY_PATTERN.test(keyName)) {
      secretsFiltered += 1;
      redactionsApplied += 1;
      return '[REDACTED_SECRET]';
    }

    if (typeof value === 'bigint') return value.toString();
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return redactString(value, keyName);
    if (typeof value === 'number' || typeof value === 'boolean') return value;

    if (Array.isArray(value)) {
      return value.map((item) => visit(item, depth + 1, keyName));
    }

    if (typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        result[k] = visit(v, depth + 1, k);
      }
      return result;
    }

    return String(value);
  }

  return {
    value: visit(input, 0) as T,
    redactionsApplied,
    secretsFiltered,
  };
}

/**
 * Sorts object keys recursively to produce deterministic canonical representations.
 */
export function sortJsonKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortJsonKeys);
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      sorted[k] = sortJsonKeys((v as Record<string, unknown>)[k]);
    }
    return sorted;
  }
  return v;
}

/**
 * Computes a deterministic SHA-256 hash over canonical JSON so approvals cannot suffer parameter tampering.
 */
export function canonicalJsonHash(value: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(sortJsonKeys(value))).digest('hex');
}

export interface McpApprovalBindingContext {
  approvalId: string;
  toolName: string;
  serverId: string;
  approvalPolicy: string;
  tenantScope: string;
  requestedById: string;
}

const KID_RE = /^[A-Za-z0-9_-]{1,32}$/;
const SEALED_PAYLOAD_RE =
  /^v1\.([A-Za-z0-9_-]{1,32})\.([A-Za-z0-9_-]{16})\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]+)$/;
const HASH_ENVELOPE_RE = /^v1\.([A-Za-z0-9_-]{1,32})\.([a-f0-9]{64})$/;

export class McpCryptoError extends Error {
  constructor(
    public readonly code:
      | 'MCP_CONFIG_INVALID'
      | 'MCP_KEY_UNAVAILABLE'
      | 'MCP_DECRYPT_FAILED'
      | 'MCP_INPUT_INVALID'
      | 'MCP_HASH_MISMATCH',
    message: string,
  ) {
    super(message);
    this.name = 'McpCryptoError';
  }
}

export interface McpKeyRingConfig {
  encryptionKeys: Record<string, string>;
  activeEncryptionKid: string;
  hmacKeys: Record<string, string>;
  activeHmacKid: string;
}

function parseKeyMap(
  rawMap: Record<string, string>,
  label: string,
): Map<string, Buffer> {
  const result = new Map<string, Buffer>();
  for (const [kid, b64] of Object.entries(rawMap)) {
    if (!KID_RE.test(kid)) {
      throw new McpCryptoError('MCP_CONFIG_INVALID', `Invalid ${label} key ID "${kid}".`);
    }
    if (typeof b64 !== 'string' || !b64.trim()) {
      throw new McpCryptoError('MCP_CONFIG_INVALID', `${label} key "${kid}" must be non-empty base64.`);
    }
    const trimmed = b64.trim();
    const decoded = Buffer.from(trimmed, 'base64');
    if (decoded.length !== 32 || decoded.toString('base64') !== trimmed) {
      throw new McpCryptoError('MCP_CONFIG_INVALID', `${label} key "${kid}" must be a canonical base64 32-byte key.`);
    }
    result.set(kid, decoded);
  }
  if (result.size === 0) {
    throw new McpCryptoError('MCP_CONFIG_INVALID', `${label} must configure at least one key.`);
  }
  return result;
}

export class McpKeyRing {
  private readonly encryptionKeys: Map<string, Buffer>;
  private readonly hmacKeys: Map<string, Buffer>;
  readonly activeEncryptionKid: string;
  readonly activeHmacKid: string;

  constructor(cfg: McpKeyRingConfig) {
    this.encryptionKeys = parseKeyMap(cfg.encryptionKeys, 'encryption');
    this.hmacKeys = parseKeyMap(cfg.hmacKeys, 'HMAC');

    if (!this.encryptionKeys.has(cfg.activeEncryptionKid)) {
      throw new McpCryptoError('MCP_CONFIG_INVALID', 'Active MCP encryption key ID is not in key ring.');
    }
    if (!this.hmacKeys.has(cfg.activeHmacKid)) {
      throw new McpCryptoError('MCP_CONFIG_INVALID', 'Active MCP HMAC key ID is not in key ring.');
    }

    for (const encKey of this.encryptionKeys.values()) {
      for (const hmacKey of this.hmacKeys.values()) {
        if (crypto.timingSafeEqual(encKey, hmacKey)) {
          throw new McpCryptoError(
            'MCP_CONFIG_INVALID',
            'MCP HMAC keys must be cryptographically distinct from MCP encryption keys.',
          );
        }
      }
    }

    this.activeEncryptionKid = cfg.activeEncryptionKid;
    this.activeHmacKid = cfg.activeHmacKid;
  }

  static fromEnv(
    env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
  ): McpKeyRing {
    const rawEnc = env.ORBITOX_MCP_ENCRYPTION_KEYS?.trim();
    const activeEncKid = env.ORBITOX_MCP_ACTIVE_KID?.trim() || '';
    const rawHmac = env.ORBITOX_MCP_HMAC_KEYS?.trim();
    const activeHmacKid = env.ORBITOX_MCP_ACTIVE_HMAC_KID?.trim() || '';

    if (!rawEnc || !activeEncKid || !rawHmac || !activeHmacKid) {
      throw new McpCryptoError(
        'MCP_CONFIG_INVALID',
        'ORBITOX_MCP_ENCRYPTION_KEYS, ORBITOX_MCP_ACTIVE_KID, ORBITOX_MCP_HMAC_KEYS, and ORBITOX_MCP_ACTIVE_HMAC_KID are required.',
      );
    }

    let encObj: unknown;
    let hmacObj: unknown;
    try {
      encObj = JSON.parse(rawEnc);
    } catch {
      throw new McpCryptoError('MCP_CONFIG_INVALID', 'ORBITOX_MCP_ENCRYPTION_KEYS must be valid JSON.');
    }
    try {
      hmacObj = JSON.parse(rawHmac);
    } catch {
      throw new McpCryptoError('MCP_CONFIG_INVALID', 'ORBITOX_MCP_HMAC_KEYS must be valid JSON.');
    }

    if (!encObj || typeof encObj !== 'object' || Array.isArray(encObj)) {
      throw new McpCryptoError('MCP_CONFIG_INVALID', 'ORBITOX_MCP_ENCRYPTION_KEYS must be a JSON object.');
    }
    if (!hmacObj || typeof hmacObj !== 'object' || Array.isArray(hmacObj)) {
      throw new McpCryptoError('MCP_CONFIG_INVALID', 'ORBITOX_MCP_HMAC_KEYS must be a JSON object.');
    }

    return new McpKeyRing({
      encryptionKeys: encObj as Record<string, string>,
      activeEncryptionKid: activeEncKid,
      hmacKeys: hmacObj as Record<string, string>,
      activeHmacKid,
    });
  }

  encryptionKeyFor(kid: string): Buffer {
    const k = this.encryptionKeys.get(kid);
    if (!k) throw new McpCryptoError('MCP_KEY_UNAVAILABLE', `MCP encryption key "${kid}" is not configured.`);
    return k;
  }

  hmacKeyFor(kid: string): Buffer {
    const k = this.hmacKeys.get(kid);
    if (!k) throw new McpCryptoError('MCP_KEY_UNAVAILABLE', `MCP HMAC key "${kid}" is not configured.`);
    return k;
  }
}

function computeAad(ctx: McpApprovalBindingContext): Buffer {
  if (
    !ctx.approvalId ||
    !ctx.tenantScope ||
    !ctx.serverId ||
    !ctx.toolName ||
    !ctx.approvalPolicy ||
    !ctx.requestedById
  ) {
    throw new McpCryptoError('MCP_INPUT_INVALID', 'All AAD binding fields are required.');
  }
  return Buffer.from(
    JSON.stringify([
      ctx.approvalId,
      ctx.tenantScope,
      ctx.serverId,
      ctx.toolName,
      ctx.approvalPolicy,
      ctx.requestedById,
    ]),
    'utf8',
  );
}

/**
 * Encrypts an execution payload at rest using AES-256-GCM with versioned key ID and canonical JSON AAD.
 * Wire format: v1.<kid>.<iv_b64url>.<tag_b64url>.<ciphertext_b64url>
 */
export function sealExecutionPayload(
  payload: unknown,
  context: McpApprovalBindingContext,
  ring: McpKeyRing = McpKeyRing.fromEnv(),
): { sealed: string; kid: string } {
  const plaintext = JSON.stringify(sortJsonKeys(payload));
  const iv = crypto.randomBytes(12);
  const kid = ring.activeEncryptionKid;
  const cipher = crypto.createCipheriv('aes-256-gcm', ring.encryptionKeyFor(kid), iv);
  cipher.setAAD(computeAad(context));
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const sealed = [
    'v1',
    kid,
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
  return { sealed, kid };
}

/**
 * Decrypts a versioned execution payload and validates its AAD binding and GCM tag.
 */
export function unsealExecutionPayload<T = unknown>(
  sealed: string,
  context: McpApprovalBindingContext,
  ring: McpKeyRing = McpKeyRing.fromEnv(),
): { payload: T; kid: string } {
  const match = SEALED_PAYLOAD_RE.exec(sealed);
  if (!match || !match[1] || !match[2] || !match[3] || !match[4]) {
    throw new McpCryptoError('MCP_DECRYPT_FAILED', 'Malformed or unsupported execution payload envelope.');
  }
  const [, kid, ivText, tagText, ctText] = match;
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    ring.encryptionKeyFor(kid),
    Buffer.from(ivText, 'base64url'),
  );
  decipher.setAAD(computeAad(context));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  try {
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(ctText, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
    return { payload: JSON.parse(decrypted) as T, kid };
  } catch {
    throw new McpCryptoError(
      'MCP_DECRYPT_FAILED',
      'Execution payload decryption failed: authentication tag or approval context mismatch.',
    );
  }
}

/**
 * Computes a versioned HMAC-SHA256 over deterministic canonical JSON binding the full approved operation.
 * Wire format: v1.<hmac_kid>.<64_hex>
 */
export function computeCanonicalApprovalHash(
  context: McpApprovalBindingContext & { params: unknown },
  ring: McpKeyRing = McpKeyRing.fromEnv(),
): { hash: string; hmacKid: string } {
  const hmacKid = ring.activeHmacKid;
  const canonicalObj = sortJsonKeys({
    v: 1,
    approvalId: context.approvalId,
    toolName: context.toolName,
    serverId: context.serverId,
    approvalPolicy: context.approvalPolicy,
    tenantScope: context.tenantScope,
    requestedById: context.requestedById,
    params: context.params,
  });
  const digest = crypto
    .createHmac('sha256', ring.hmacKeyFor(hmacKid))
    .update(JSON.stringify(canonicalObj))
    .digest('hex');
  return { hash: `v1.${hmacKid}.${digest}`, hmacKid };
}

/**
 * Constant-time verification of a versioned approval HMAC digest. Rejects legacy unkeyed hashes.
 */
export function verifyCanonicalApprovalHash(
  storedHash: string,
  context: McpApprovalBindingContext & { params: unknown },
  ring: McpKeyRing = McpKeyRing.fromEnv(),
): { valid: boolean; hmacKid: string } {
  const match = HASH_ENVELOPE_RE.exec(storedHash);
  if (!match || !match[1] || !match[2]) {
    return { valid: false, hmacKid: '' };
  }
  const [, hmacKid, storedHex] = match;
  const key = ring.hmacKeyFor(hmacKid);
  const canonicalObj = sortJsonKeys({
    v: 1,
    approvalId: context.approvalId,
    toolName: context.toolName,
    serverId: context.serverId,
    approvalPolicy: context.approvalPolicy,
    tenantScope: context.tenantScope,
    requestedById: context.requestedById,
    params: context.params,
  });
  const expectedBuf = crypto
    .createHmac('sha256', key)
    .update(JSON.stringify(canonicalObj))
    .digest();
  const actualBuf = Buffer.from(storedHex, 'hex');
  if (actualBuf.length !== expectedBuf.length) {
    return { valid: false, hmacKid };
  }
  return { valid: crypto.timingSafeEqual(actualBuf, expectedBuf), hmacKid };
}

/**
 * Sanitizes audit-only operator reason strings (strips control characters, trims, bounds length).
 */
export function sanitizeApprovalReason(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const cleaned = raw.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, 500);
  return cleaned.length > 0 ? cleaned : undefined;
}
