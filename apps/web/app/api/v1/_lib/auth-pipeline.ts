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
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i % b.length);
  }
  return diff === 0;
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

export function adminTokenAllowsRequest(pathname: string, method: string): boolean {
  const configured = process.env.ORBITOX_ADMIN_TOKEN_SCOPES || '';
  const normalizedMethod = method.toUpperCase();
  return configured.split(',').some((rawScope) => {
    const scope = rawScope.trim();
    const separator = scope.indexOf(':');
    if (separator <= 0) return false;
    const scopedMethod = scope.slice(0, separator).trim().toUpperCase();
    const scopedPath = scope.slice(separator + 1).trim();
    if (
      !['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(scopedMethod) ||
      !scopedPath.startsWith('/') ||
      scopedPath === '/*' ||
      (scopedPath.includes('*') && !scopedPath.endsWith('/*'))
    ) return false;
    if (scopedMethod !== normalizedMethod) return false;
    return scopedPath.endsWith('/*')
      ? pathname.startsWith(scopedPath.slice(0, -1))
      : pathname === scopedPath;
  });
}

export async function verifyAdminTokenForRequest(
  presented: string | null | undefined,
  pathname: string,
  method: string,
): Promise<boolean> {
  return adminTokenAllowsRequest(pathname, method) && verifyAdminToken(presented);
}

export function verifyAdminTokenForRequestSync(
  presented: string | null | undefined,
  pathname: string,
  method: string,
): boolean {
  return adminTokenAllowsRequest(pathname, method) && verifyAdminTokenSync(presented);
}

/**
 * Generates an internal cryptographic token proving the request was verified by middleware
 */
export async function createInternalAuthToken(
  principal: 'admin' | 'runtime',
  actorId?: string,
): Promise<{ signature: string; timestamp: string }> {
  const ts = Date.now().toString();
  const payload = actorId ? `${principal}:${ts}:${actorId}` : `${principal}:${ts}`;
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
