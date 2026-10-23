# 🪐 OrbitoX P26 — Zero-Trust Security & Ingestion Threat Model
**Document ID:** `docs/P26_SECURITY_MODEL.md`  
**Phase:** P26 Phase 0 (Security Engineering)  
**Status:** CANONICAL SPECIFICATION  
**Author:** Security Engineer & Multi-Tenant SaaS Architect  
**Date:** October 2026  

---

## 1. Executive Summary & Zero-Trust Mandate

When an application accepts arbitrary external files (ZIP archives, HTML, CSS, JavaScript, SVG, Figma packages), it opens a high-risk attack surface.

The **OrbitoX Universal Ingestion Security Model** operates under strict **Zero-Trust**:
1. **Never Execute Untrusted Code:** No uploaded script, Liquid tag, WordPress PHP, or imported JavaScript is ever executed directly on the host server or in the parent window of the Studio.
2. **Deterministic Sanitization Before AST Hydration:** Every external payload is disarmed and scrubbed before it touches the OrbitoX SceneGraph.
3. **Multi-Tenant Scoping Invariance:** Ingested projects and assets are strictly partitioned by `tenantId` using cryptographic session context.
4. **Cryptographic Anti-Tamper Verification:** All shared plugins and marketplace packages must be digitally signed with Ed25519 signatures.

---

## 2. Threat Vector Matrix & Defense Mechanisms

| Threat Vector | Attack Scenario | Defense Implementation | Defense Gate |
|:---|:---|:---|:---|
| **Stored XSS** | `<script>` or `<img src=x onerror=alert()>` embedded in imported HTML or SVG. | Strict DOMPurify sanitization stripping all executable tags, inline event listeners, and `javascript:` URIs. | Ingestion Gate (Stage 1) |
| **Server-Side Request Forgery (SSRF)** | User requests import of internal network URL (e.g. `http://169.254.169.254/latest/meta-data`). | URL crawler runs inside restricted egress proxy blocking RFC1918 private IP ranges, cloud metadata IPs, and localhost. | Network Egress Gate |
| **Zip Bomb / Decompression Quota Bomb** | 10MB uploaded ZIP expanding to 100GB in memory, crashing browser/server. | Streaming decompression with strict safety caps: max unpacked size 150MB, max entry count 5,000 files, ratio cap 1:20. | Archive Extraction Gate |
| **Prototype Pollution** | Malicious `__proto__` or `constructor` keys in uploaded JSON templates. | Recursive schema validator (`JSON.parse` with safe reviver) that strips dangerous object prototypes. | IR Validation Gate |
| **Cross-Tenant Data Bleed** | Tenant A attempts to link or access imported media assets belonging to Tenant B. | All asset records and schemas are scoped with `session.scopeData(payload)` and validated against `getActiveTenant()`. | Persistence Gate |
| **Arbitrary Code Execution in Sandbox** | User insists on running third-party JS widget or dynamic embed. | Isolated `<iframe sandbox="allow-scripts" csp="default-src 'none';">` with zero access to parent DOM, cookies, or localStorage. | Runtime Boundary Gate |

---

## 3. Strict Sanitization Pipeline (`DOMSanitizerService`)

```typescript
import DOMPurify from 'dompurify';

export class DOMSanitizerService {
  private static readonly PURIFY_CONFIG = {
    ALLOWED_TAGS: [
      'div', 'section', 'article', 'header', 'footer', 'main', 'nav', 'aside',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'blockquote', 'pre', 'code',
      'ul', 'ol', 'li', 'a', 'button', 'img', 'svg', 'path', 'circle', 'rect',
      'line', 'polyline', 'polygon', 'g', 'defs', 'lineargradient', 'radialgradient', 'stop'
    ],
    ALLOWED_ATTR: [
      'class', 'id', 'style', 'href', 'target', 'src', 'alt', 'width', 'height',
      'd', 'fill', 'stroke', 'stroke-width', 'viewBox', 'xmlns', 'cx', 'cy', 'r', 'rx', 'ry'
    ],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'meta', 'link'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'data-action'],
    ALLOW_DATA_ATTR: false,
  };

  static sanitizeHtml(rawHtml: string): string {
    return DOMPurify.sanitize(rawHtml, this.PURIFY_CONFIG);
  }

  static sanitizeSvg(rawSvg: string): string {
    return DOMPurify.sanitize(rawSvg, {
      USE_PROFILES: { svg: true, svgFilters: true },
      FORBID_TAGS: ['script', 'foreignObject']
    });
  }
}
```

---

## 4. Multi-Tenant Isolation & OrbitoX Rules Compliance

In accordance with OrbitoX core architecture (`AGENTS.md`):
1. **Tenant Scoping:** Every imported document, page, and asset is permanently tagged with `tenantId`:
   ```typescript
   const activeTenant = getActiveTenant();
   const scopedProject = session.scopeData({
     ...projectIR,
     tenantId: activeTenant.id,
     importedByUserId: session.userId,
   });
   ```
2. **Cryptographic Signatures:**
   All exported packages and templates destined for the OrbitoX Marketplace are signed using `CryptoSigner` (Ed25519). Before importing any third-party template package, the system verifies its cryptographic signature:
   ```typescript
   const isValid = CryptoSigner.verifySignature(packagePayload, packageSignature, publisherPublicKey);
   if (!isValid) throw new SecurityError("Package digital signature invalid or tampered with.");
   ```
3. **Facade Freezing:**
   Internal kernel facades are deeply frozen using `SandboxGuard.freezeAllFacades` before executing any user-facing plugins.

*This concludes the Security Model. Proceed to `docs/P26_LICENSE_MODEL.md`.*
