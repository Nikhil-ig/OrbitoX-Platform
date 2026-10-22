/**
 * SecuritySanitizer
 * Enterprise Zero-Trust security layer for Orbitox universal imports:
 * - Sanitizes untrusted HTML, SVG, and JSX markup
 * - Neutralizes XSS vectors, script tags, event handlers, and javascript: pseudo-protocols
 * - Hardens SSRF egress protection against private networks, cloud metadata, and encoded loopbacks
 * - Defends against Zip bombs and decompression resource exhaustion attacks
 */

export class SecuritySanitizer {
  private static readonly DANGEROUS_TAGS_REGEX =
    /<\s*(script|iframe|object|embed|applet|form|input|link|meta|base)[^>]*>.*?<\s*\/\s*\1\s*>|<\s*(script|iframe|object|embed|applet|form|input|link|meta|base)[^>]*\/?>/gis;
  
  private static readonly INLINE_EVENT_REGEX =
    /\son[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

  private static readonly JAVASCRIPT_URL_REGEX =
    /(?:href|src|xlink:href)\s*=\s*(?:"\s*(?:javascript:|vbscript:|data:text\/html)[^"]*"|'\s*(?:javascript:|vbscript:|data:text\/html)[^']*'|(?:javascript:|vbscript:|data:text\/html)[^\s>]+)/gi;

  private static readonly SVG_DANGEROUS_ELEMENTS_REGEX =
    /<\s*(?:script|handler|listener|animate|set)[^>]*>.*?<\s*\/\s*(?:script|handler|listener|animate|set)\s*>|<\s*(?:script|handler|listener|animate|set)[^>]*\/?>/gis;

  /**
   * Universal sanitizer returning disarmed code and list of stripped patterns
   */
  static sanitize(rawCode: string): { sanitizedCode: string; removedNodes: string[] } {
    if (!rawCode) return { sanitizedCode: '', removedNodes: [] };
    const removedNodes: string[] = [];

    if (this.DANGEROUS_TAGS_REGEX.test(rawCode)) {
      removedNodes.push('dangerous_html_tags');
    }
    if (this.INLINE_EVENT_REGEX.test(rawCode)) {
      removedNodes.push('inline_event_handlers');
    }
    if (this.JAVASCRIPT_URL_REGEX.test(rawCode)) {
      removedNodes.push('javascript_pseudo_protocols');
    }

    const sanitizedCode = this.sanitizeHtml(rawCode);
    return { sanitizedCode, removedNodes };
  }

  /**
   * Disarm raw HTML string by stripping script blocks and inline events
   */
  static sanitizeHtml(html: string): string {
    if (!html) return '';
    let clean = html.replace(this.DANGEROUS_TAGS_REGEX, '');
    clean = clean.replace(this.INLINE_EVENT_REGEX, '');
    clean = clean.replace(this.JAVASCRIPT_URL_REGEX, 'href="#"');
    return clean;
  }

  /**
   * Disarm raw SVG string by removing embedded scripts, handlers, and pseudo-protocols
   */
  static sanitizeSvg(svg: string): string {
    if (!svg) return '';
    let clean = svg.replace(this.SVG_DANGEROUS_ELEMENTS_REGEX, '');
    clean = clean.replace(this.INLINE_EVENT_REGEX, '');
    clean = clean.replace(this.JAVASCRIPT_URL_REGEX, 'href="#"');
    return clean;
  }

  /**
   * Validate that a URL does not attempt SSRF against private, link-local,
   * or cloud metadata IP ranges.
   */
  static isSafeExternalUrl(urlStr: string): boolean {
    try {
      let protocol = '';
      let host = '';

      if (typeof URL !== 'undefined') {
        const parsed = new URL(urlStr);
        protocol = parsed.protocol.toLowerCase();
        host = parsed.hostname.toLowerCase();
      } else {
        const match = urlStr.match(/^([a-z]+:)\/\/([^/:]+)/i);
        if (!match) return false;
        protocol = match[1]?.toLowerCase() || '';
        host = match[2]?.toLowerCase() || '';
      }

      // 1. Only HTTP and HTTPS protocols permitted
      if (protocol !== 'http:' && protocol !== 'https:') {
        return false;
      }

      // Remove IPv6 brackets if present for analysis
      const cleanHost = host.replace(/^\[|\]$/g, '');

      // 2. Loopback and Localhost check
      if (
        cleanHost === 'localhost' ||
        cleanHost === '127.0.0.1' ||
        cleanHost === '0.0.0.0' ||
        cleanHost === '::1' ||
        cleanHost === '::'
      ) {
        return false;
      }

      // 3. Domain suffixes for internal namespaces
      if (
        cleanHost.endsWith('.localhost') ||
        cleanHost.endsWith('.internal') ||
        cleanHost.endsWith('.local') ||
        cleanHost.endsWith('.corp') ||
        cleanHost.endsWith('.lan') ||
        cleanHost === 'metadata.google.internal'
      ) {
        return false;
      }

      // 4. Cloud Metadata (AWS, Azure, GCP, DigitalOcean)
      // 169.254.169.254, fd00:ec2::254
      if (cleanHost === '169.254.169.254' || cleanHost.startsWith('169.254.') || cleanHost.startsWith('fd00:ec2:')) {
        return false;
      }

      // 5. IPv4 Private Ranges (RFC 1918)
      // 10.0.0.0 - 10.255.255.255 (10/8)
      if (cleanHost.startsWith('10.')) {
        return false;
      }

      // 192.168.0.0 - 192.168.255.255 (192.168/16)
      if (cleanHost.startsWith('192.168.')) {
        return false;
      }

      // 172.16.0.0 - 172.31.255.255 (172.16/12)
      const ipParts = cleanHost.split('.').map(Number);
      if (ipParts.length === 4 && !ipParts.some(isNaN)) {
        const [p1, p2] = ipParts;
        if (p1 === 172 && p2 !== undefined && p2 >= 16 && p2 <= 31) {
          return false;
        }
        if (p1 === 127) {
          return false; // Whole 127.0.0.0/8 block
        }
        if (p1 === 0) {
          return false; // 0.0.0.0/8
        }
      }

      // 6. Decimal/Hex Encoded Loopbacks (e.g., 2130706433 or 0x7f000001)
      if (/^\d+$/.test(cleanHost)) {
        const num = Number(cleanHost);
        if (num >= 2130706432 && num <= 2147483647) {
          return false; // 127.0.0.0/8 in 32-bit uint
        }
      }
      if (/^0x[0-9a-f]+$/i.test(cleanHost)) {
        return false;
      }

      // 7. IPv6 Unique Local / Link Local
      if (cleanHost.startsWith('fe80:') || cleanHost.startsWith('fc00:') || cleanHost.startsWith('fd00:')) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates archive decompression safety to prevent Zip bombs and resource exhaustion.
   */
  static validateDecompressionSafety(params: {
    compressedBytes: number;
    expectedUncompressedBytes: number;
    fileCount: number;
    maxUncompressedBytes?: number;
    maxFileCount?: number;
    maxCompressionRatio?: number;
  }): { safe: boolean; reason?: string } {
    const maxUncompressed = params.maxUncompressedBytes || 250 * 1024 * 1024; // 250 MB
    const maxFiles = params.maxFileCount || 5000;
    const maxRatio = params.maxCompressionRatio || 100; // 100:1

    if (params.fileCount > maxFiles) {
      return {
        safe: false,
        reason: `Archive exceeds maximum permitted file count (${params.fileCount} > ${maxFiles}).`,
      };
    }

    if (params.expectedUncompressedBytes > maxUncompressed) {
      return {
        safe: false,
        reason: `Archive exceeds maximum permitted uncompressed size (${params.expectedUncompressedBytes} bytes > ${maxUncompressed} bytes).`,
      };
    }

    if (params.compressedBytes > 0) {
      const ratio = params.expectedUncompressedBytes / params.compressedBytes;
      if (ratio > maxRatio && params.expectedUncompressedBytes > 10 * 1024 * 1024) {
        return {
          safe: false,
          reason: `Suspicious compression ratio (${ratio.toFixed(1)}:1 exceeds limit of ${maxRatio}:1). Potential Zip bomb detected.`,
        };
      }
    }

    return { safe: true };
  }
}
