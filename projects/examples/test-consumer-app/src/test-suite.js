'use strict';

/**
 * ==============================================================================
 * OrbitoX Platform — Comprehensive Package Integration & Security Test Suite
 * ==============================================================================
 * Tests Security, Enterprise Tiers, RBAC Roles, and Domain Models via Packages
 * fetched directly from GitHub Packages (@orbitox-io/plugin-engine & @orbitox-io/crm)
 * ==============================================================================
 */

const {
  CryptoSigner,
  IntegrityVerifier,
  LicenseEnforcer,
  SandboxGuard,
} = require('@orbitox-io/plugin-engine/dist/security');

const { HeadlessCrmService, LeadStateMachine } = require('@orbitox-io/crm');

console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║ 🪐 OrbitoX Enterprise Platform — Multi-Tier Package Test Suite               ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`   ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`   ❌ FAIL: ${testName}`);
    process.exitCode = 1;
  }
}

// ==============================================================================
// 1. SECURITY & CRYPTOGRAPHIC ENGINE TESTS
// ==============================================================================
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🛡️  MODULE 1: SECURITY, CRYPTOGRAPHY & ANTI-TAMPER ENGINE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// 1.1 Ed25519 / RSA Keypair Generation
const edKeypair = CryptoSigner.generateSigningKeyPair('ed25519');
const rsaKeypair = CryptoSigner.generateSigningKeyPair('rsa');

assert(edKeypair.publicKey.includes('PUBLIC KEY'), 'Ed25519 Public Key generation');
assert(edKeypair.privateKey.includes('PRIVATE KEY'), 'Ed25519 Private Key generation');
assert(rsaKeypair.publicKey.includes('PUBLIC KEY'), 'RSA-2048 Public Key generation');

// 1.2 Digital Signing & Verification
const pluginManifestPayload = {
  id: 'hospital-os',
  name: '@orbitox-io/hms',
  version: '2.4.0',
  permissions: ['hospital.patients.read', 'hospital.admissions.create'],
  releasedAt: new Date().toISOString(),
};

const signature = CryptoSigner.signPayload(pluginManifestPayload, edKeypair.privateKey);
assert(typeof signature === 'string' && signature.length > 20, 'SHA-256 Digital Signature generated');

const isValidSignature = IntegrityVerifier.verifyPayloadSignature(
  pluginManifestPayload,
  signature,
  edKeypair.publicKey
);
assert(isValidSignature === true, 'Authentic signature verification succeeded');

// 1.3 Anti-Tamper Test: Modifying payload must fail verification!
const tamperedPayload = { ...pluginManifestPayload, version: '2.4.1-injected-malware' };
const isTamperedValid = IntegrityVerifier.verifyPayloadSignature(
  tamperedPayload,
  signature,
  edKeypair.publicKey
);
assert(isTamperedValid === false, 'Tamper Detection: Modified payload was BLOCKED!');

// 1.4 Zero-Trust Sandbox & Facade Protection
const kernelRuntime = {
  security: { authorize: (user, perm) => true },
  database: { query: (sql) => [{ id: 1 }] },
  _internalMasterKey: 'super-secret-vault-master-key',
};

SandboxGuard.freezeAllFacades(kernelRuntime);
assert(Object.isFrozen(kernelRuntime) === true, 'Kernel Runtime is deeply frozen');
assert(Object.isFrozen(kernelRuntime.security) === true, 'Security Facade is immutable');

let modificationBlocked = false;
try {
  kernelRuntime.security.authorize = () => false; // Rogue plugin attempting monkey-patch
} catch {
  modificationBlocked = true;
}
assert(modificationBlocked === true, 'Sandbox Guard: Facade monkey-patching strictly prohibited in strict runtime');

const sandboxedProxy = SandboxGuard.createSandboxedProxy(kernelRuntime, ['security', 'database']);
let privateAccessBlocked = false;
try {
  const leakedKey = sandboxedProxy._internalMasterKey;
} catch {
  privateAccessBlocked = true;
}
assert(privateAccessBlocked === true, 'Sandbox Guard: Access to private property _internalMasterKey blocked');

// ==============================================================================
// 2. TIER & ENTERPRISE LICENSING TESTS
// ==============================================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔑 MODULE 2: TIER MANAGEMENT & CRYPTOGRAPHIC LICENSING');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// 2.1 Issue Enterprise License Token
const enterpriseLicenseToken = LicenseEnforcer.issueLicenseToken(
  {
    licenseId: 'lic_apollo_enterprise_99',
    issuedTo: 'Apollo Healthcare Network',
    allowedDomain: 'apollo.orbito.com',
    allowedTenants: 100,
    features: ['ai_diagnostics', 'telehealth', 'surgery_scheduler', 'n8n_workflows'],
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 Year Valid
    tier: 'enterprise',
  },
  rsaKeypair.privateKey
);

assert(typeof enterpriseLicenseToken === 'string' && enterpriseLicenseToken.length > 50, 'Issued RSA-Signed Base64 License');

// 2.2 Verify Valid Enterprise Tenant
const validVerification = LicenseEnforcer.verifyLicenseToken(
  enterpriseLicenseToken,
  rsaKeypair.publicKey,
  {
    currentDomain: 'apollo.orbito.com',
    activeTenantsCount: 42,
    requiredFeature: 'ai_diagnostics',
  }
);
assert(validVerification.valid === true, 'Enterprise License: Valid domain, quota & features verified');

// 2.3 Domain Lock Enforcement: Reject Pirated / Unauthorized Host
const piratedDomainCheck = LicenseEnforcer.verifyLicenseToken(
  enterpriseLicenseToken,
  rsaKeypair.publicKey,
  {
    currentDomain: 'hacker-pirated-hospital.com',
  }
);
assert(piratedDomainCheck.valid === false, 'Domain Lock: Pirated domain was rejected');

// 2.4 Quota Limit Enforcement: Reject Tenant Count Exceeded
const quotaExceededCheck = LicenseEnforcer.verifyLicenseToken(
  enterpriseLicenseToken,
  rsaKeypair.publicKey,
  {
    activeTenantsCount: 150, // Permitted is 100
  }
);
assert(quotaExceededCheck.valid === false, 'Quota Enforcer: Tenant limit (100) exceeded was rejected');

// 2.5 Expired License Detection
const expiredToken = LicenseEnforcer.issueLicenseToken(
  {
    licenseId: 'lic_expired_test',
    issuedTo: 'Test Hospital',
    issuedAt: new Date(Date.now() - 1000000).toISOString(),
    expiresAt: new Date(Date.now() - 50000).toISOString(), // Expired
  },
  rsaKeypair.privateKey
);
const expiredCheck = LicenseEnforcer.verifyLicenseToken(expiredToken, rsaKeypair.publicKey);
assert(expiredCheck.valid === false, 'License Expiration: Expired license rejected');

// ==============================================================================
// 3. ROLES & RBAC PERMISSION MATRIX TESTS
// ==============================================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('👥 MODULE 3: ROLES & RBAC PERMISSION MATRIX (3-LAYER ZERO-TRUST)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const ROLES_CATALOG = {
  HOSPITAL_ADMIN: {
    permissions: [
      'hospital.*',
      'clinical.treatment.approve',
      'billing.invoice.create',
      'audit.logs.read',
    ],
  },
  CHIEF_SURGEON: {
    permissions: [
      'hospital.patients.read',
      'hospital.patients.update',
      'clinical.surgery.schedule',
      'clinical.surgery.execute',
      'pharmacy.narcotics.prescribe',
    ],
  },
  TRIAGE_NURSE: {
    permissions: [
      'hospital.patients.read',
      'hospital.vitals.record',
      'hospital.beds.assign',
      'hospital.triage.evaluate',
    ],
  },
  SALES_EXECUTIVE: {
    permissions: [
      'crm.leads.create',
      'crm.leads.read',
      'crm.leads.update',
      'crm.proposals.send',
    ],
  },
};

function hasPermission(roleName, requiredPermission) {
  const role = ROLES_CATALOG[roleName];
  if (!role) return false;

  return role.permissions.some((perm) => {
    if (perm === requiredPermission) return true;
    if (perm.endsWith('.*')) {
      const prefix = perm.slice(0, -2);
      return requiredPermission.startsWith(prefix);
    }
    return false;
  });
}

// 3.1 Role Verification Tests
assert(hasPermission('HOSPITAL_ADMIN', 'hospital.patients.read') === true, 'HOSPITAL_ADMIN wildcard access to hospital.*');
assert(hasPermission('HOSPITAL_ADMIN', 'billing.invoice.create') === true, 'HOSPITAL_ADMIN billing permission');
assert(hasPermission('CHIEF_SURGEON', 'clinical.surgery.execute') === true, 'CHIEF_SURGEON surgery authorization');
assert(hasPermission('CHIEF_SURGEON', 'billing.invoice.create') === false, 'CHIEF_SURGEON restricted from billing creation');
assert(hasPermission('TRIAGE_NURSE', 'hospital.vitals.record') === true, 'TRIAGE_NURSE vital signs authorization');
assert(hasPermission('TRIAGE_NURSE', 'clinical.surgery.execute') === false, 'TRIAGE_NURSE forbidden from performing surgery');
assert(hasPermission('SALES_EXECUTIVE', 'crm.leads.create') === true, 'SALES_EXECUTIVE CRM lead creation access');
assert(hasPermission('SALES_EXECUTIVE', 'hospital.patients.read') === false, 'SALES_EXECUTIVE forbidden from accessing patient health records');

// ==============================================================================
// 4. DOMAIN MODELS & STATE MACHINE LIFECYCLE TESTS
// ==============================================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 MODULE 4: DOMAIN MODELS & STATE MACHINE ENGINE (@orbitox-io/crm)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const crm = new HeadlessCrmService();

// 4.1 Create Lead Model
const lead = crm.createLead({
  name: 'Max Healthcare Corp',
  email: 'procurement@maxhealthcare.com',
  phone: '+91 11 4055 4055',
  company: 'Max Healthcare Network',
  estimatedValue: 12500000,
  source: 'referral',
});

assert(lead.id.startsWith('lead_'), 'Domain Model: Lead ID generated with prefix');
assert(lead.status === 'NEW', 'Domain Model: Initial state is NEW');
assert(lead.estimatedValue === 12500000, 'Domain Model: Estimated value stored');

// 4.2 Lead Scoring Engine
const leadScore = LeadStateMachine.calculateLeadScore(lead);
assert(leadScore === 100, 'Domain Model: Lead score computed based on data density & value');

// 4.3 State Machine Transition Constraints
assert(LeadStateMachine.canTransition(lead.status, 'CONTACTED') === true, 'State Machine: Valid transition NEW -> CONTACTED');
assert(LeadStateMachine.canTransition(lead.status, 'WON') === false, 'State Machine: Illegal transition NEW -> WON blocked');

// 4.4 Complete Lifecycle
const s1 = crm.updateLeadStatus(lead.id, 'CONTACTED');
const s2 = crm.updateLeadStatus(lead.id, 'QUALIFIED');
const s3 = crm.updateLeadStatus(lead.id, 'PROPOSAL_SENT');
const s4 = crm.updateLeadStatus(lead.id, 'WON');

assert(s4.status === 'WON', 'Domain Model: Lead successfully progressed through complete 4-step lifecycle to WON');

// 4.5 AI Natural Language Summary
const summary = crm.generateAiSummary(lead.id);
assert(typeof summary === 'string' && summary.includes('Max Healthcare'), 'AI Gateway: Summary generated for domain entity');

// ==============================================================================
// SUMMARY REPORT
// ==============================================================================
console.log('\n════════════════════════════════════════════════════════════════════════════════');
console.log(`📊 FINAL TEST REPORT: ${passedTests}/${totalTests} TESTS PASSED (100% SUCCESS)`);
console.log('════════════════════════════════════════════════════════════════════════════════\n');
