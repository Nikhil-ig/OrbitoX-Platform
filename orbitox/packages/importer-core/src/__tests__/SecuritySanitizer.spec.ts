import { SecuritySanitizer } from '../pipeline/SecuritySanitizer';

describe('SecuritySanitizer & Zero-Trust Defense (Phase P26.13)', () => {
  describe('1. XSS Penetration Defense & Script Disarming', () => {
    it('neutralizes raw script tags and inline alert payloads', () => {
      const maliciousHtml = '<section><h1>Welcome</h1><script>alert("xss")</script><p>Text</p></section>';
      const result = SecuritySanitizer.sanitize(maliciousHtml);

      expect(result.sanitizedCode).not.toContain('<script');
      expect(result.sanitizedCode).not.toContain('alert("xss")');
      expect(result.sanitizedCode).toContain('<h1>Welcome</h1>');
      expect(result.sanitizedCode).toContain('<p>Text</p>');
      expect(result.removedNodes).toContain('dangerous_html_tags');
    });

    it('strips all inline DOM event handlers (onerror, onload, onclick, onmouseover)', () => {
      const maliciousHtml = `
        <div>
          <img src="invalid.jpg" onerror="fetch('/steal?c=' + document.cookie)" />
          <button onclick="executeEvil()" onmouseover="trackUser()">Submit</button>
        </div>
      `;
      const result = SecuritySanitizer.sanitize(maliciousHtml);

      expect(result.sanitizedCode).not.toContain('onerror=');
      expect(result.sanitizedCode).not.toContain('onclick=');
      expect(result.sanitizedCode).not.toContain('onmouseover=');
      expect(result.sanitizedCode).not.toContain('document.cookie');
      expect(result.removedNodes).toContain('inline_event_handlers');
    });

    it('neutralizes javascript:, vbscript:, and data:text/html pseudo-protocols', () => {
      const maliciousHtml = `
        <a href="javascript:alert('pwned')">Claim Prize</a>
        <a href="javascript:/*--></title></style></textarea></noscript>*/alert(1)">Bypass</a>
        <a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">Data URL</a>
      `;
      const result = SecuritySanitizer.sanitize(maliciousHtml);

      expect(result.sanitizedCode).not.toContain('javascript:');
      expect(result.sanitizedCode).not.toContain('data:text/html');
      expect(result.sanitizedCode).toContain('href="#"');
    });

    it('disarms SVG embedded scripts, XML handlers, and xlink pseudo-protocols', () => {
      const maliciousSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100">
          <script type="text/javascript">alert('svg-xss');</script>
          <handler xmlns:ev="http://www.w3.org/2001/xml-events" ev:event="load">malicious()</handler>
          <a xlink:href="javascript:alert(1)">
            <circle cx="50" cy="50" r="40" fill="gold" />
          </a>
        </svg>
      `;
      const sanitized = SecuritySanitizer.sanitizeSvg(maliciousSvg);

      expect(sanitized).not.toContain('<script');
      expect(sanitized).not.toContain('alert(');
      expect(sanitized).not.toContain('<handler');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).toContain('<circle cx="50" cy="50" r="40" fill="gold" />');
    });
  });

  describe('2. SSRF Egress Defense & IP Range Filtering', () => {
    it('blocks localhost and loopback interfaces (IPv4, IPv6, 0.0.0.0)', () => {
      expect(SecuritySanitizer.isSafeExternalUrl('http://localhost:3000/api')).toBe(false);
      expect(SecuritySanitizer.isSafeExternalUrl('http://127.0.0.1:8080/metrics')).toBe(false);
      expect(SecuritySanitizer.isSafeExternalUrl('http://127.1.2.3')).toBe(false);
      expect(SecuritySanitizer.isSafeExternalUrl('http://0.0.0.0:80')).toBe(false);
      expect(SecuritySanitizer.isSafeExternalUrl('http://[::1]:8080')).toBe(false);
    });

    it('blocks AWS/GCP/Azure cloud instance metadata services', () => {
      expect(SecuritySanitizer.isSafeExternalUrl('http://169.254.169.254/latest/meta-data/')).toBe(false);
      expect(SecuritySanitizer.isSafeExternalUrl('http://169.254.169.254/computeMetadata/v1/')).toBe(false);
      expect(SecuritySanitizer.isSafeExternalUrl('http://metadata.google.internal/computeMetadata/v1/')).toBe(false);
      expect(SecuritySanitizer.isSafeExternalUrl('http://[fd00:ec2::254]/latest/meta-data/')).toBe(false);
    });

    it('blocks RFC 1918 private network ranges (10/8, 172.16/12, 192.168/16)', () => {
      expect(SecuritySanitizer.isSafeExternalUrl('http://10.0.0.1/admin')).toBe(false);
      expect(SecuritySanitizer.isSafeExternalUrl('http://10.254.254.254/')).toBe(false);
      expect(SecuritySanitizer.isSafeExternalUrl('http://172.16.0.1/')).toBe(false);
      expect(SecuritySanitizer.isSafeExternalUrl('http://172.31.255.255/')).toBe(false);
      expect(SecuritySanitizer.isSafeExternalUrl('http://192.168.1.1/router')).toBe(false);
      expect(SecuritySanitizer.isSafeExternalUrl('http://192.168.0.254/')).toBe(false);
    });

    it('blocks internal private top-level domains (.internal, .local, .corp, .lan)', () => {
      expect(SecuritySanitizer.isSafeExternalUrl('http://database.internal/secret')).toBe(false);
      expect(SecuritySanitizer.isSafeExternalUrl('http://printer.local/')).toBe(false);
      expect(SecuritySanitizer.isSafeExternalUrl('http://auth.corp/token')).toBe(false);
      expect(SecuritySanitizer.isSafeExternalUrl('http://nas.lan/data')).toBe(false);
    });

    it('blocks integer-encoded and hex-encoded IP addresses to bypass string filters', () => {
      // 2130706433 === 127.0.0.1 in 32-bit unsigned int
      expect(SecuritySanitizer.isSafeExternalUrl('http://2130706433/admin')).toBe(false);
      expect(SecuritySanitizer.isSafeExternalUrl('http://0x7f000001/')).toBe(false);
    });

    it('allows legitimate public internet CDNs and APIs', () => {
      expect(SecuritySanitizer.isSafeExternalUrl('https://images.unsplash.com/photo-1519741497674-611481863552')).toBe(true);
      expect(SecuritySanitizer.isSafeExternalUrl('https://cdn.shopify.com/s/files/1/0000/products/sample.jpg')).toBe(true);
      expect(SecuritySanitizer.isSafeExternalUrl('https://fonts.googleapis.com/css2?family=Cinzel:wght@700')).toBe(true);
      expect(SecuritySanitizer.isSafeExternalUrl('https://api.figma.com/v1/files/abc123xyz')).toBe(true);
      expect(SecuritySanitizer.isSafeExternalUrl('http://example.com/invitation')).toBe(true);
    });
  });

  describe('3. Zip Bomb & Decompression Exhaustion Defense', () => {
    it('detects and blocks archives with excessive file count (> 5,000 files)', () => {
      const result = SecuritySanitizer.validateDecompressionSafety({
        compressedBytes: 1000000,
        expectedUncompressedBytes: 5000000,
        fileCount: 12000,
      });

      expect(result.safe).toBe(false);
      expect(result.reason).toContain('maximum permitted file count');
    });

    it('detects and blocks archives exceeding 250 MB total uncompressed size', () => {
      const result = SecuritySanitizer.validateDecompressionSafety({
        compressedBytes: 50000000,
        expectedUncompressedBytes: 300 * 1024 * 1024, // 300 MB
        fileCount: 100,
      });

      expect(result.safe).toBe(false);
      expect(result.reason).toContain('maximum permitted uncompressed size');
    });

    it('detects and blocks suspicious compression ratios (> 100:1) characteristic of Zip bombs', () => {
      const result = SecuritySanitizer.validateDecompressionSafety({
        compressedBytes: 50000, // 50 KB
        expectedUncompressedBytes: 50 * 1024 * 1024, // 50 MB (1000:1 ratio)
        fileCount: 1,
      });

      expect(result.safe).toBe(false);
      expect(result.reason).toContain('Potential Zip bomb detected');
    });

    it('passes safe, standard theme and design archive packages', () => {
      const result = SecuritySanitizer.validateDecompressionSafety({
        compressedBytes: 4500000, // 4.5 MB
        expectedUncompressedBytes: 12000000, // 12 MB (2.6:1 ratio)
        fileCount: 85,
      });

      expect(result.safe).toBe(true);
    });
  });
});
