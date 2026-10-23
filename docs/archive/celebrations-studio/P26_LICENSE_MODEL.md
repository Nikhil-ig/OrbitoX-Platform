# 🪐 OrbitoX P26 — Provenance, Licensing, & Marketplace Governance Model
**Document ID:** `docs/P26_LICENSE_MODEL.md`  
**Phase:** P26 Phase 0 (Governance & Legal Architecture)  
**Status:** CANONICAL SPECIFICATION  
**Author:** Principal Product Architect & Open-Source Compliance Officer  
**Date:** October 2026  

---

## 1. Executive Summary & Core Principles

When creators import code, themes, and design assets from external ecosystems (GitHub, Figma Community, WordPress.org, Shopify Theme Store, Canva), they enter a complex landscape of intellectual property rights, copyleft provisions (GPL), and commercial restrictions.

The **OrbitoX Provenance & License Model** ensures:
1. **Immutable Provenance Tracking:** Every imported element retains its source origin, author attribution, and license metadata.
2. **Copyleft & Commercial Compliance:** Automated license detection warns creators when importing GPL or Non-Commercial (CC BY-NC) assets into commercial SaaS projects.
3. **Marketplace Redistribution Governance:** Projects containing restrictive third-party licenses are prevented from being listed on the OrbitoX Marketplace without proper attribution or relicensing.

---

## 2. Ingested Provenance Metadata Schema

Every imported template, section, and asset record includes a `provenance` block:

```typescript
export interface ProvenanceMetadata {
  sourceType: 'figma' | 'shopify' | 'wordpress' | 'github' | 'url' | 'canva' | 'native';
  originalUrl?: string;
  authorName?: string;
  authorUrl?: string;
  copyrightNotice?: string;
  licenseType: 'MIT' | 'Apache-2.0' | 'GPL-2.0' | 'GPL-3.0' | 'CC-BY-4.0' | 'CC-BY-NC-4.0' | 'Proprietary' | 'Unknown';
  licenseUrl?: string;
  importedAt: string;
  importedByTenantId: string;
  modifiedAfterImport: boolean;
  commercialRedistributionAllowed: boolean;
}
```

---

## 3. Automated License Detection Engine

When an archive or project is ingested, the `LicenseDetectorService` scans:
1. Standard license files (`LICENSE`, `LICENSE.md`, `COPYING`, `package.json` license field).
2. Header comments in CSS/JS (`/*! Theme Name: Dawn, License: MIT */`).
3. WordPress `style.css` metadata (`License: GNU General Public License v2 or later`).
4. Shopify theme `settings_schema.json` author and theme store info.

### Compliance Rules Matrix:

| Detected License | Personal / Client Use | Commercial SaaS Deployment | OrbitoX Marketplace Listing |
|:---:|:---:|:---:|:---:|
| **MIT / BSD / ISC** | ✅ Allowed | ✅ Allowed (Preserve copyright notice) | ✅ Allowed with attribution |
| **Apache 2.0** | ✅ Allowed | ✅ Allowed (Preserve NOTICE file) | ✅ Allowed with attribution |
| **GPL v2 / v3** | ✅ Allowed | ⚠️ Allowed for internal SaaS; copyleft applies to derivative distribution | ❌ Blocked from closed-source commercial sale |
| **CC BY (Creative Commons)** | ✅ Allowed | ✅ Allowed with visual credit | ✅ Allowed |
| **CC BY-NC (Non-Commercial)** | ✅ Allowed (Non-commercial) | ❌ Disallowed for commercial storefronts | ❌ Disallowed |
| **Proprietary (Shopify Paid Theme)** | ✅ Allowed on single store | ❌ Disallowed from multiple client resale | ❌ Disallowed from marketplace |

---

## 4. Marketplace Packaging & Cryptographic Manifest

When a creator packages an OrbitoX project or theme for publication to the **OrbitoX Marketplace**:
1. The **Marketplace Packaging Engine** bundles the schema, design tokens, and local assets into a `.orbitox-template` package.
2. A `manifest.json` is generated listing all provenance records and third-party dependencies.
3. The package is digitally signed with the creator's Ed25519 private key (`CryptoSigner`).
4. The marketplace validation pipeline checks the signature, scans for un-attributed GPL/proprietary code, and authorizes publication.

*This concludes the License & Provenance Model. Proceed to `docs/P26_CONTROL_CAPABILITY_MATRIX.json`.*
