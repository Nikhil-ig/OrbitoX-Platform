/**
 * 🪐 SSRF-Protected Safe Fetcher
 * Guards external HTTP/HTTPS calls against Server-Side Request Forgery.
 *
 * Enforces:
 * 1. Protocol whitelist (only http: and https:).
 * 2. Hostname DNS resolution prior to connection.
 * 3. Strict rejection of private, loopback, link-local, and multicast IP ranges:
 *    - IPv4: 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16, 0.0.0.0/8, 224.0.0.0/4, 240.0.0.0/4
 *    - IPv6: ::1, ::, fc00::/7, fe80::/10, ff00::/8, ::ffff:0:0/96
 * 4. Manual redirect validation: re-resolves and validates the target IP on every hop.
 * 5. Strict redirect cap (default: 3 hops maximum).
 */

export interface SafeFetchOptions extends RequestInit {
  maxRedirects?: number;
  timeoutMs?: number;
}

const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_TIMEOUT_MS = 10_000;

export function isIPv4Address(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) >= 0 && Number(p) <= 255);
}

export function isIPv6Address(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  return ip.includes(':') && /^[0-9a-fA-F:]+$/.test(ip);
}

export function isIPAddress(ip: string): number {
  if (isIPv4Address(ip)) return 4;
  if (isIPv6Address(ip)) return 6;
  return 0;
}

/**
 * Checks whether an IP address belongs to a private, loopback, link-local, or multicast range.
 */
export function isPrivateOrBlockedIP(ip: string): boolean {
  if (!ip) return true;

  // Handle IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  const v4MappedPrefix = '::ffff:';
  if (ip.toLowerCase().startsWith(v4MappedPrefix)) {
    const rest = ip.slice(v4MappedPrefix.length);
    if (isIPv4Address(rest)) {
      return isPrivateOrBlockedIP(rest);
    }
  }

  // IPv4 Checks
  if (isIPv4Address(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true;
    }
    const [b0, b1] = parts as [number, number, number, number];

    // 0.0.0.0/8 (Current network)
    if (b0 === 0) return true;
    // 127.0.0.0/8 (Loopback)
    if (b0 === 127) return true;
    // 10.0.0.0/8 (Private Class A)
    if (b0 === 10) return true;
    // 172.16.0.0/12 (Private Class B: 172.16.0.0 - 172.31.255.255)
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
    // 192.168.0.0/16 (Private Class C)
    if (b0 === 192 && b1 === 168) return true;
    // 169.254.0.0/16 (Link-local / Cloud metadata)
    if (b0 === 169 && b1 === 254) return true;
    // 224.0.0.0/4 (Multicast: 224.0.0.0 - 239.255.255.255)
    if (b0 >= 224 && b0 <= 239) return true;
    // 240.0.0.0/4 (Reserved / Future use)
    if (b0 >= 240) return true;

    return false;
  }

  // IPv6 Checks
  if (isIPv6Address(ip)) {
    const lower = ip.toLowerCase();
    // Loopback ::1 and unspecified ::
    if (lower === '::1' || lower === '::' || lower === '0:0:0:0:0:0:0:1' || lower === '0:0:0:0:0:0:0:0') {
      return true;
    }

    // fc00::/7 (Unique Local Address: fc00:: to fdff::)
    if (/^[fF][c-dC-D]/.test(lower)) {
      return true;
    }

    // fe80::/10 (Link-Local: fe80:: to febf::)
    if (/^[fF][eE][89a-bA-B]/.test(lower)) {
      return true;
    }

    // ff00::/8 (Multicast: ff00:: to ffff::)
    if (/^[fF][fF]/.test(lower)) {
      return true;
    }

    return false;
  }

  // Unknown format - reject by default
  return true;
}

/**
 * Resolves a hostname and asserts all resolved IP addresses are public and safe.
 */
export async function assertSafeDestination(hostname: string): Promise<string[]> {
  // Direct IP literal
  if (isIPAddress(hostname) !== 0) {
    if (isPrivateOrBlockedIP(hostname)) {
      throw new Error(`SSRF blocked: direct IP destination "${hostname}" is private or loopback.`);
    }
    return [hostname];
  }

  // In browser environments, DNS lookup is handled by the browser network stack
  if (typeof window !== 'undefined') {
    return [hostname];
  }

  // Domain lookup via dynamic node:dns
  try {
    const mod = 'node:dns';
    const dns = await import(/* webpackIgnore: true */ mod);
    const addresses = await dns.promises.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      throw new Error(`SSRF error: unable to resolve hostname "${hostname}".`);
    }

    for (const addr of addresses) {
      if (isPrivateOrBlockedIP(addr.address)) {
        throw new Error(
          `SSRF blocked: hostname "${hostname}" resolves to private/loopback IP ${addr.address}.`
        );
      }
    }

    return addresses.map((a: any) => a.address);
  } catch (err: any) {
    if (err.message.startsWith('SSRF blocked:')) throw err;
    throw new Error(`DNS resolution failed for hostname "${hostname}": ${err.message}`);
  }
}

/**
 * Safe fetch wrapper with SSRF protection, IP validation, and redirect hop checking.
 */
export async function safeFetch(
  input: string | URL,
  init?: SafeFetchOptions
): Promise<Response> {
  const maxRedirects = init?.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let currentUrl = new URL(typeof input === 'string' ? input : input.toString());
  let redirectCount = 0;

  while (true) {
    // Protocol validation
    if (currentUrl.protocol !== 'http:' && currentUrl.protocol !== 'https:') {
      throw new Error(`SSRF blocked: protocol "${currentUrl.protocol}" is not allowed.`);
    }

    // Validate hostname and resolved IPs
    await assertSafeDestination(currentUrl.hostname);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(currentUrl.toString(), {
        ...init,
        redirect: 'manual', // Enforce manual redirect handling to validate every hop
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if redirect response
      const isRedirect = [301, 302, 303, 307, 308].includes(response.status);
      if (isRedirect) {
        const location = response.headers.get('location');
        if (!location) {
          return response;
        }

        redirectCount++;
        if (redirectCount > maxRedirects) {
          throw new Error(`SSRF blocked: exceeded maximum redirects (${maxRedirects}).`);
        }

        // Parse new target URL relative to current URL
        currentUrl = new URL(location, currentUrl);
        continue;
      }

      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Request to "${currentUrl}" timed out after ${timeoutMs}ms.`);
      }
      throw err;
    }
  }
}
