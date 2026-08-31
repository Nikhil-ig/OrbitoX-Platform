/**
 * ==============================================================================
 * 🪐 OrbitoX Enterprise Platform — Live Package Consumer Application
 * ==============================================================================
 * Consuming directly from GitHub Packages:
 * - @orbitox-io/plugin-engine (v1.4.0)
 * - @orbitox-io/crm (v1.0.1)
 * ==============================================================================
 */

const {
  createOrbitoX,
  createMultiTenantEngine,
  getActiveTenant,
  CryptoSigner,
  IntegrityVerifier,
  LicenseEnforcer,
} = require('@orbitox-io/plugin-engine');

const crm = require('@orbitox-io/crm');

async function runLiveApplication() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║ 🪐 OrbitoX Enterprise Production Package Consumer Running                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  // ==============================================================================
  // 1. INITIALIZE MULTI-TENANT ENGINE WITH CUSTOM DOMAIN ROUTING
  // ==============================================================================
  console.log('🚀 STEP 1: Bootstrapping Smart Multi-Tenant & Custom Domain Engine...');

  const engine = createMultiTenantEngine({
    cacheTtlMs: 5 * 60 * 1000, // 5 minutes high-speed in-memory RAM cache
    wildcardRootDomain: 'orbito.com',
    domains: {
      'portal.apollohospitals.com': {
        tenantId: 'tenant_apollo_01',
        name: 'Apollo Hospital Network',
        tier: 'enterprise',
        features: ['ai_diagnostics', 'telehealth', 'surgery_scheduler'],
      },
      'crm.maxhealthcare.com': {
        tenantId: 'tenant_max_02',
        name: 'Max Healthcare Group',
        tier: 'growth',
        features: ['telehealth'],
      },
      'starter-clinic.orbito.com': {
        tenantId: 'tenant_starter_03',
        name: 'City Care Clinic',
        tier: 'starter',
        features: ['basic_crm'],
      },
    },
    // Dynamic database / Redis lookup for customer custom domains:
    resolveTenant: async (host) => {
      if (host === 'custom.medanta.org') {
        return {
          tenantId: 'tenant_medanta_04',
          name: 'Medanta The Medicity',
          tier: 'enterprise',
          features: ['ai_diagnostics', 'telehealth'],
        };
      }
      return null;
    },
    plugins: [crm],
  });

  console.log('   ✅ MultiTenantEngine Initialized in 1 Line!\n');

  // ==============================================================================
  // 2. SIMULATE INCOMING CUSTOM DOMAIN REQUESTS
  // ==============================================================================
  console.log('🌐 STEP 2: Processing Multi-Tenant Traffic Across 4 Distinct Domains...');

  const incomingRequests = [
    { host: 'portal.apollohospitals.com', leadName: 'Dr. Ramesh Sharma', value: 8500000 },
    { host: 'crm.maxhealthcare.com',      leadName: 'Dr. Ananya Iyer',   value: 3200000 },
    { host: 'starter-clinic.orbito.com',  leadName: 'Dr. Vikram Patel',  value: 450000 },
    { host: 'custom.medanta.org',         leadName: 'Dr. Sunita Rao',    value: 12000000 },
  ];

  for (const req of incomingRequests) {
    await engine.runWithTenant(req.host, async (session) => {
      console.log(`\n   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`   🌐 Custom Domain: "${session.domain}"`);
      console.log(`      • Tenant Name:      ${session.tenant.name}`);
      console.log(`      • Tenant ID:        ${session.tenant.tenantId}`);
      console.log(`      • Subscription:     [${session.tenant.tier?.toUpperCase()}]`);
      console.log(`      • AI Diagnostics:   ${session.hasFeature('ai_diagnostics') ? '✅ Enabled' : '❌ Disabled (Upgrade Required)'}`);

      // Auto-Scope Data persistence to this tenant
      const safeLeadData = session.scopeData({
        name: req.leadName,
        email: `contact@${session.domain}`,
        company: session.tenant.name,
        estimatedValue: req.value,
      });

      const lead = session.app.crm.createLead(safeLeadData);
      console.log(`      • Scoped Lead ID:   ${lead.id}`);
      console.log(`      • Value:            INR ${lead.estimatedValue.toLocaleString()}`);

      // Progress the sales pipeline lifecycle
      session.app.crm.updateLeadStatus(lead.id, 'CONTACTED');
      session.app.crm.updateLeadStatus(lead.id, 'QUALIFIED');
      session.app.crm.updateLeadStatus(lead.id, 'PROPOSAL_SENT');
      const wonLead = session.app.crm.updateLeadStatus(lead.id, 'WON');

      console.log(`      • Pipeline Status:  ${wonLead.status} 🎉 (DEAL WON)`);

      // Zero-Boilerplate Context Propagation Test
      const activeSession = getActiveTenant();
      console.log(`      • Context Check:    ${activeSession?.tenant.tenantId === session.tenant.tenantId ? '✅ Isolated via AsyncLocalStorage' : '❌ Error'}`);
    });
  }

  // ==============================================================================
  // 3. 1-LINE HTTP MIDDLEWARE SIMULATION WITH FEATURE GUARDS
  // ==============================================================================
  console.log('\n\n🛡️  STEP 3: Testing 1-Line Express / Connect HTTP Middleware with Feature Security...');

  const middleware = engine.middleware();
  const aiFeatureGuard = engine.requireFeature('ai_diagnostics');

  // Test Case A: Apollo Hospital (Enterprise Tier with AI Diagnostics)
  console.log('\n   A. Client Request from "portal.apollohospitals.com" ➔ /api/ai-diagnostics:');
  const reqApollo = { headers: { host: 'portal.apollohospitals.com' } };
  const resApollo = { status: () => ({ json: (data) => console.log('      Response:', data) }) };

  await middleware(reqApollo, resApollo, () => {
    aiFeatureGuard(reqApollo, resApollo, () => {
      console.log('      ✅ Authorized! Tenant "Apollo Hospital Network" accessed Enterprise AI Diagnostics.');
    });
  });

  // Test Case B: Starter Clinic (Starter Tier attempting to access Enterprise AI Diagnostics)
  console.log('\n   B. Client Request from "starter-clinic.orbito.com" ➔ /api/ai-diagnostics:');
  const reqStarter = { headers: { host: 'starter-clinic.orbito.com' } };
  const resStarter = {
    status: (code) => ({
      json: (data) => {
        console.log(`      🔒 Blocked [HTTP ${code}]: "${data.message}"`);
      },
    }),
  };

  await middleware(reqStarter, resStarter, () => {
    aiFeatureGuard(reqStarter, resStarter, () => {});
  });

  console.log('\n================================================================');
  console.log('🎉 Production Package Execution Complete — 100% Operational!');
  console.log('================================================================\n');
}

runLiveApplication().catch(console.error);
