import {
  TemplatePackager,
  TemplatePackageManifest,
  SignedTemplateBundle,
} from '../packaging/TemplatePackager';

describe('TemplatePackager & Marketplace Cryptographic Verification (Phase P26.11)', () => {
  let edKeyPair: { publicKey: string; privateKey: string };
  let rsaKeyPair: { publicKey: string; privateKey: string };

  const sampleManifest: Omit<TemplatePackageManifest, 'schemaVersion' | 'createdAt' | 'sceneCount' | 'nodeCount'> = {
    id: 'tpl_celestial_gala_2026',
    name: 'Celestial Gala Luxury Invitation',
    version: '1.0.0',
    author: {
      name: 'Nikhil Designer',
      email: 'nikhil@orbitox.io',
      url: 'https://orbitox.io',
    },
    license: 'Commercial',
    description: 'Ultra-luxury gold & obsidian celebration experience template.',
    category: 'gala',
    targetPlatform: 'orbitox-celebrations',
    designTokens: {
      colors: { gold: '#DFBA6B', obsidian: '#060B1A' },
      typography: {
        heading: { fontFamily: 'Cinzel', weights: [700], sizes: { xl: '36px' } },
        body: { fontFamily: 'Inter', weights: [400], sizes: { base: '16px' } },
      },
      spacing: { md: '16px', lg: '24px' },
      shadows: { glow: '0 0 24px rgba(223, 186, 107, 0.4)' },
      radii: { lg: '12px' },
    },
    assets: [
      {
        id: 'asset_banner_01',
        filename: 'celestial-banner.webp',
        mimeType: 'image/webp',
        sha256: 'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
        sizeBytes: 245000,
        originalUrl: 'https://cdn.orbitox.io/assets/celestial.webp',
      },
    ],
    fonts: [
      { family: 'Cinzel', source: 'google' },
      { family: 'Inter', source: 'google' },
    ],
  };

  const sampleScenes = [
    {
      id: 'scene_hero',
      name: 'Hero Section',
      sceneGraph: {
        rootNodeId: 'root',
        nodes: {
          root: {
            id: 'root',
            name: 'Hero Frame',
            kind: 'frame',
            parentId: null,
            children: ['heading_1'],
            geometry: { position: 'flow', x: 0, y: 0, width: 1200, height: 800 },
            style: { fills: [{ type: 'solid', color: '#060B1A' }] },
          },
          heading_1: {
            id: 'heading_1',
            name: 'Main Title',
            kind: 'heading',
            parentId: 'root',
            children: [],
            geometry: { position: 'flow', x: 0, y: 0, width: 'full', height: 'auto' },
            style: {},
            textContent: 'The Celestial Gala',
          },
        },
      },
    },
  ];

  beforeAll(() => {
    edKeyPair = TemplatePackager.generateSigningKeyPair('ed25519');
    rsaKeyPair = TemplatePackager.generateSigningKeyPair('rsa');
  });

  describe('1. Cryptographic Key Generation & Canonical Hashing', () => {
    it('generates valid Ed25519 keypair with standard PEM structure', () => {
      expect(edKeyPair.publicKey).toContain('BEGIN PUBLIC KEY');
      expect(edKeyPair.privateKey).toContain('BEGIN PRIVATE KEY');
    });

    it('generates valid RSA-2048 keypair with standard PEM structure', () => {
      expect(rsaKeyPair.publicKey).toContain('BEGIN PUBLIC KEY');
      expect(rsaKeyPair.privateKey).toContain('BEGIN PRIVATE KEY');
    });

    it('computes deterministic canonical checksum regardless of object key insertion order', () => {
      const objA = { alpha: 'first', beta: 42, gamma: { nested: true, arr: [1, 2, 3] } };
      const objB = { gamma: { arr: [1, 2, 3], nested: true }, beta: 42, alpha: 'first' };

      const hashA = TemplatePackager.computePayloadChecksum(objA);
      const hashB = TemplatePackager.computePayloadChecksum(objB);

      expect(hashA).toBe(hashB);
      expect(hashA).toHaveLength(64); // SHA-256 hex string
    });
  });

  describe('2. Package Creation & Digital Signature Verification', () => {
    it('packages and signs template bundle with Ed25519 digital signature', () => {
      const bundle = TemplatePackager.createPackage({
        manifest: sampleManifest,
        scenes: sampleScenes,
        privateKeyPem: edKeyPair.privateKey,
        publicKeyPem: edKeyPair.publicKey,
        signerId: 'orbitox-verified-creator',
      });

      expect(bundle.manifest.schemaVersion).toBe('1.0');
      expect(bundle.manifest.sceneCount).toBe(1);
      expect(bundle.manifest.nodeCount).toBe(2);
      expect(bundle.signature.algorithm).toBe('ed25519');
      expect(bundle.signature.signatureHex).toBeDefined();
      expect(bundle.checksum).toHaveLength(64);

      // Verify signature with author public key
      const verifyResult = TemplatePackager.verifyPackage(bundle);
      expect(verifyResult.valid).toBe(true);
      expect(verifyResult.manifest?.id).toBe('tpl_celestial_gala_2026');
    });

    it('verifies bundle using an explicitly provided trusted public key', () => {
      const bundle = TemplatePackager.createPackage({
        manifest: sampleManifest,
        scenes: sampleScenes,
        privateKeyPem: edKeyPair.privateKey,
        publicKeyPem: edKeyPair.publicKey,
      });

      const verifyResult = TemplatePackager.verifyPackage(bundle, edKeyPair.publicKey);
      expect(verifyResult.valid).toBe(true);
    });

    it('rejects verification if an untrusted or mismatched public key is provided', () => {
      const anotherKeyPair = TemplatePackager.generateSigningKeyPair('ed25519');
      const bundle = TemplatePackager.createPackage({
        manifest: sampleManifest,
        scenes: sampleScenes,
        privateKeyPem: edKeyPair.privateKey,
        publicKeyPem: edKeyPair.publicKey,
      });

      const verifyResult = TemplatePackager.verifyPackage(bundle, anotherKeyPair.publicKey);
      expect(verifyResult.valid).toBe(false);
      expect(verifyResult.reason).toContain('Cryptographic signature verification failed');
    });

    it('detects tampering and rejects bundle when manifest or scene data is altered', () => {
      const bundle = TemplatePackager.createPackage({
        manifest: sampleManifest,
        scenes: sampleScenes,
        privateKeyPem: edKeyPair.privateKey,
        publicKeyPem: edKeyPair.publicKey,
      });

      // Malicious modification of scene title
      const tamperedBundle: SignedTemplateBundle = JSON.parse(JSON.stringify(bundle));
      tamperedBundle.scenes[0].sceneGraph.nodes.heading_1.textContent = 'Hacked Title (Tampered)';

      const verifyResult = TemplatePackager.verifyPackage(tamperedBundle);
      expect(verifyResult.valid).toBe(false);
      expect(verifyResult.reason).toContain('checksum mismatch');
    });
  });

  describe('3. License Attribution & Compliance Scanner', () => {
    it('passes compliant commercial and MIT licenses with clean audit status', () => {
      const fullManifest: TemplatePackageManifest = {
        ...sampleManifest,
        schemaVersion: '1.0',
        sceneCount: 1,
        nodeCount: 2,
        createdAt: new Date().toISOString(),
      };

      const audit = TemplatePackager.scanLicenseCompliance(fullManifest);
      expect(audit.compliant).toBe(true);
      expect(audit.riskLevel).toBe('low');
      expect(audit.detectedLicenses).toContain('Commercial');
      expect(audit.requiredAttributions).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Cinzel'),
          expect.stringContaining('Inter'),
        ])
      );
    });

    it('flags prohibited copyleft licenses (GPL-3.0) that violate commercial marketplace policy', () => {
      const gplManifest: TemplatePackageManifest = {
        ...sampleManifest,
        license: 'GPL-3.0',
        schemaVersion: '1.0',
        sceneCount: 1,
        nodeCount: 2,
        createdAt: new Date().toISOString(),
      };

      const audit = TemplatePackager.scanLicenseCompliance(gplManifest);
      expect(audit.compliant).toBe(false);
      expect(audit.riskLevel).toBe('prohibited');
      expect(audit.warnings[0]).toContain('prohibited for commercial distribution');
    });

    it('warns when custom fonts or assets lack explicit attribution', () => {
      const unverifiedManifest: TemplatePackageManifest = {
        ...sampleManifest,
        schemaVersion: '1.0',
        sceneCount: 1,
        nodeCount: 2,
        createdAt: new Date().toISOString(),
        fonts: [{ family: 'HelveticaNowDisplay', source: 'custom' }],
        assets: [{ id: 'a1', filename: 'bg.jpg', mimeType: 'image/jpeg', sha256: '', sizeBytes: 100 }],
      };

      const audit = TemplatePackager.scanLicenseCompliance(unverifiedManifest);
      expect(audit.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining('HelveticaNowDisplay'),
          expect.stringContaining('missing SHA-256'),
        ])
      );
    });
  });

  describe('4. Bundle Serialization & Parsing', () => {
    it('round-trips signed bundle to formatted JSON string and back losslessly', () => {
      const bundle = TemplatePackager.createPackage({
        manifest: sampleManifest,
        scenes: sampleScenes,
        privateKeyPem: edKeyPair.privateKey,
        publicKeyPem: edKeyPair.publicKey,
      });

      const serialized = TemplatePackager.serializeBundle(bundle);
      expect(typeof serialized).toBe('string');
      expect(serialized).toContain('tpl_celestial_gala_2026');

      const parsed = TemplatePackager.parseBundle(serialized);
      expect(parsed.manifest.id).toBe(bundle.manifest.id);
      expect(parsed.checksum).toBe(bundle.checksum);
      expect(parsed.signature.signatureHex).toBe(bundle.signature.signatureHex);

      const verifyResult = TemplatePackager.verifyPackage(parsed);
      expect(verifyResult.valid).toBe(true);
    });

    it('throws error when parsing malformed or incomplete bundle JSON', () => {
      expect(() => {
        TemplatePackager.parseBundle('{"manifest": {}}');
      }).toThrow('missing required top-level fields');
    });
  });
});
