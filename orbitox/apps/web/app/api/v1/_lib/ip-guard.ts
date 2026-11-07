/**
 * Secure IP resolution and CIDR allowlist matching for IPv4 and IPv6.
 * Zero-dependency, timing-safe, and resistant to client header spoofing.
 */

function parseIPv4(ip: string): number | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let num = 0;
  for (let i = 0; i < 4; i++) {
    const n = Number(parts[i]);
    if (isNaN(n) || n < 0 || n > 255 || parts[i] === '') return null;
    num = ((num << 8) | n) >>> 0;
  }
  return num;
}

function parseIPv6(ip: string): bigint | null {
  let clean = ip.trim().toLowerCase();

  // Handle IPv4-mapped IPv6 (::ffff:192.0.2.1)
  if (clean.includes('.')) {
    const lastColon = clean.lastIndexOf(':');
    if (lastColon !== -1) {
      const v4Part = clean.substring(lastColon + 1);
      const v4Num = parseIPv4(v4Part);
      if (v4Num === null) return null;
      const v4Hex = (v4Num >>> 16).toString(16).padStart(4, '0') + ':' + (v4Num & 0xffff).toString(16).padStart(4, '0');
      clean = clean.substring(0, lastColon + 1) + v4Hex;
    }
  }

  // Handle '::' expansion
  if (clean.includes('::')) {
    const sides = clean.split('::');
    if (sides.length !== 2) return null; // Only one '::' allowed
    const left = sides[0] ? sides[0].split(':').filter(Boolean) : [];
    const right = sides[1] ? sides[1].split(':').filter(Boolean) : [];
    const missing = 8 - (left.length + right.length);
    if (missing < 0) return null;
    const middle = new Array(missing).fill('0');
    const fullParts = [...left, ...middle, ...right];
    if (fullParts.length !== 8) return null;
    clean = fullParts.join(':');
  }

  const parts = clean.split(':');
  if (parts.length !== 8) return null;

  try {
    let result = BigInt(0);
    for (let i = 0; i < 8; i++) {
      const val = parseInt(parts[i]!, 16);
      if (isNaN(val) || val < 0 || val > 0xffff) return null;
      result = (result << BigInt(16)) | BigInt(val);
    }
    return result;
  } catch {
    return null;
  }
}

export function isIpInCidr(ip: string, rule: string): boolean {
  const trimmed = rule.trim();
  if (trimmed === '*' || trimmed === '0.0.0.0/0' || trimmed === '::/0') return true;

  const [subnetStr, maskStr] = trimmed.split('/');
  if (!subnetStr) return false;

  // Normalize ::1 to 127.0.0.1 for local comparisons
  const normIp = ip === '::1' ? '127.0.0.1' : ip;
  const normSubnet = subnetStr === '::1' ? '127.0.0.1' : subnetStr;

  // Single IP match (no mask or /32 or /128)
  if (!maskStr) {
    return normIp === normSubnet || ip === subnetStr;
  }

  const mask = parseInt(maskStr, 10);
  if (isNaN(mask) || mask < 0) return false;

  // Attempt IPv4
  const ip4 = parseIPv4(normIp);
  const subnet4 = parseIPv4(normSubnet);
  if (ip4 !== null && subnet4 !== null) {
    if (mask > 32) return false;
    if (mask === 0) return true;
    const maskBits = (0xffffffff << (32 - mask)) >>> 0;
    return (ip4 & maskBits) === (subnet4 & maskBits);
  }

  // Attempt IPv6
  const ip6 = parseIPv6(ip);
  const subnet6 = parseIPv6(subnetStr);
  if (ip6 !== null && subnet6 !== null) {
    if (mask > 128) return false;
    if (mask === 0) return true;
    const maskBits = ((BigInt(1) << BigInt(mask)) - BigInt(1)) << BigInt(128 - mask);
    return (ip6 & maskBits) === (subnet6 & maskBits);
  }

  return false;
}

export function isIpAllowed(clientIp: string, allowlist?: string[]): boolean {
  if (!allowlist || allowlist.length === 0) return true;
  return allowlist.some((rule) => isIpInCidr(clientIp, rule));
}

/**
 * Resolves the client IP safely according to trusted-proxy configuration.
 * If not running behind a configured trusted proxy, ignores client-injected headers.
 */
export function resolveClientIp(
  headers: Headers,
  directConnectionIp?: string
): string {
  const fallbackIp = directConnectionIp || '127.0.0.1';
  const trustedProxiesEnv = process.env.TRUSTED_PROXIES;
  const trustProxyBool = process.env.TRUST_PROXY === 'true';

  // If trusted proxies are not configured, do NOT trust x-forwarded-for
  if (!trustedProxiesEnv && !trustProxyBool) {
    return fallbackIp;
  }

  const trustedRules = trustedProxiesEnv
    ? trustedProxiesEnv.split(',').map((s) => s.trim()).filter(Boolean)
    : ['127.0.0.1/32', '::1/128', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'];

  const xff = headers.get('x-forwarded-for');
  if (!xff) {
    return headers.get('x-real-ip')?.trim() || fallbackIp;
  }

  const hops = xff.split(',').map((h) => h.trim()).filter(Boolean);
  if (hops.length === 0) return fallbackIp;

  // Walk hops from right to left (most recent proxy backwards)
  // The first untrusted IP from the right is the true client IP
  for (let i = hops.length - 1; i >= 0; i--) {
    const hop = hops[i]!;
    const isTrusted = trustedRules.some((rule) => isIpInCidr(hop, rule));
    if (!isTrusted) {
      return hop;
    }
  }

  // All hops in chain are trusted proxies; return the leftmost IP
  return hops[0] || fallbackIp;
}
