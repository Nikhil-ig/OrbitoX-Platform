import * as nodeCrypto from 'crypto';

const encoder = new TextEncoder();

export function getAdminToken(): string {
  return (process.env.ORBITOX_ADMIN_TOKEN || '').trim();
}

export function getRuntimeToken(): string {
  return (process.env.ORBITOX_RUNTIME_TOKEN || '').trim();
}

export function getInternalSecret(): string {
  return (
    process.env.ORBITOX_CONTROL_SECRET ||
    process.env.ORBITOX_INTERNAL_SECRET ||
    process.env.ORBITOX_SERVER_PEPPER ||
    'orbitox_default_internal_process_shared_secret_32_chars'
  ).trim();
}

/**
 * Constant-time string equality comparison using SHA-256 digest
 */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  if (!a || !b) return false;
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);
  const va = new Uint8Array(ha);
  const vb = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i]! ^ vb[i]!;
  return diff === 0;
}

/**
 * Synchronous constant-time comparison when Node crypto is available
 */
export function safeEqualSync(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ha = nodeCrypto.createHash('sha256').update(a).digest();
  const hb = nodeCrypto.createHash('sha256').update(b).digest();
  return nodeCrypto.timingSafeEqual(ha, hb);
}

/**
 * Extracts raw credential presented in Authorization (Bearer or Basic) or x-admin-token header
 */
export function extractPresentedCredential(req: { headers: { get: (name: string) => string | null } }): string | null {
  const xAdminToken = req.headers.get('x-admin-token')?.trim();
  if (xAdminToken) return xAdminToken;

  const header = req.headers.get('authorization');
  if (!header) return null;
  const [scheme, value] = header.split(' ');
  if (!scheme || !value) return null;
  if (scheme.toLowerCase() === 'bearer') return value.trim();
  if (scheme.toLowerCase() === 'basic') {
    try {
      const decoded = atob(value.trim());
      const idx = decoded.indexOf(':');
      return idx === -1 ? decoded : decoded.slice(idx + 1);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Verifies whether a presented token or header matches the configured admin token
 */
export async function verifyAdminToken(presented: string | null | undefined): Promise<boolean> {
  if (!presented) return false;
  const adminToken = getAdminToken();
  if (!adminToken) return false;
  return safeEqual(presented, adminToken);
}

/**
 * Synchronous check for admin token
 */
export function verifyAdminTokenSync(presented: string | null | undefined): boolean {
  if (!presented) return false;
  const adminToken = getAdminToken();
  if (!adminToken) return false;
  return safeEqualSync(presented, adminToken);
}

/**
 * Generates an internal cryptographic token proving the request was verified by middleware
 */
export async function createInternalAuthToken(principal: 'admin' | 'runtime'): Promise<{ signature: string; timestamp: string }> {
  const ts = Date.now().toString();
  const payload = `${principal}:${ts}`;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getInternalSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const signature = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return { signature, timestamp: ts };
}

/**
 * Synchronous verification of the internal authentication token
 */
export function verifyInternalAuthTokenSync(principal: string, signature: string, timestamp: string): boolean {
  if (!principal || !signature || !timestamp) return false;
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(Date.now() - ts) > 60000) return false;

  const payload = `${principal}:${ts}`;
  const expected = nodeCrypto.createHmac('sha256', getInternalSecret()).update(payload).digest('hex');
  if (signature.length !== expected.length) return false;
  return nodeCrypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
}
