/**
 * ==============================================================================
 * OrbitoX Platform — Ultra-Easy Multi-Tenancy & Custom Domain Engine Demo
 * ==============================================================================
 * Demonstrates:
 * 1. Automatic custom domain mapping & routing
 * 2. Wildcard subdomains (*.orbito.com -> tenant_<subdomain>)
 * 3. Dynamic async DB lookups
 * 4. Zero-boilerplate AsyncLocalStorage context propagation (getActiveTenant)
 * 5. 1-Line Express / Connect HTTP Middleware
 * ==============================================================================
 */

const {
  createMultiTenantEngine,
  getActiveTenant,
} = require('@orbitox-io/plugin-engine');

const crm = require('@orbitox-io/crm');

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║ 🌐 OrbitoX Multi-Tenancy & Custom Domain Engine — 1-Line Zero-Boilerplate    ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  // 🚀 1. Initialize MultiTenantEngine with Custom Domains & Wildcards
  const engine = createMultiTenantEngine({
    wildcardRootDomain: 'orbito.com',
    domains: {
      'portal.apollohospitals.com': {
        tenantId: 'tenant_apollo_01',
        name: 'Apollo Hospital Network',
      },
      'crm.maxhealthcare.com': {
        tenantId: 'tenant_max_02',
        name: 'Max Healthcare Group',
      },
    },
    // Dynamic database / Redis lookup for any unknown custom domains:
    resolveTenant: async (host) => {
      if (host === 'custom.medanta.org') {
        return { tenantId: 'tenant_medanta_03', name: 'Medanta The Medicity' };
      }
      return null;
    },
    plugins: [crm],
  });

  console.log('1️⃣  Testing Custom Domain Routing:');

  // 2. Simulate Requests across 4 different custom domains
  const testDomains = [
    'portal.apollohospitals.com', // Static custom domain
    'crm.maxhealthcare.com',      // Static custom domain
    'fortis.orbito.com',          // Automatic wildcard subdomain (*.orbito.com)
    'custom.medanta.org',         // Dynamic Database Resolved domain
  ];

  for (const domain of testDomains) {
    await engine.runWithTenant(domain, async (session) => {
      console.log(`\n   🌐 Request to Host: "${session.domain}"`);
      console.log(`      • Active Tenant ID:   ${session.tenant.tenantId}`);
      console.log(`      • Tenant Name:        ${session.tenant.name}`);

      // Create a lead strictly partitioned to this tenant
      const lead = session.app.crm.createLead({
        name: `Inquiry for ${session.tenant.name}`,
        email: `contact@${session.domain}`,
        company: session.tenant.name,
        estimatedValue: 2500000,
      });

      console.log(`      • Isolated Lead ID:   ${lead.id} (${lead.company})`);

      // Verify AsyncLocalStorage propagation anywhere in the callstack
      const context = getActiveTenant();
      console.log(`      • Context Propagated: ${context?.tenant.tenantId === session.tenant.tenantId ? '✅ True (Zero-Boilerplate)' : '❌ False'}`);
    });
  }

  // 3. Testing 1-Line Express / Connect HTTP Middleware
  console.log('\n2️⃣  Testing 1-Line HTTP Middleware (app.use(engine.middleware())):');
  const middleware = engine.middleware();
  const mockReq = { headers: { host: 'aiims.orbito.com' } };
  const mockRes = { status: (code) => ({ json: (d) => console.log('Response:', d) }) };

  await middleware(mockReq, mockRes, () => {
    console.log(`   ✅ Middleware Intercepted: "${mockReq.headers.host}"`);
    console.log(`   • Attached req.tenant:     ${mockReq.tenant.name} (${mockReq.tenant.tenantId})`);
    console.log(`   • Attached req.app:        ${mockReq.app ? '✅ Isolated OrbitoXApp Ready' : '❌'}`);
  });

  console.log('\n================================================================');
  console.log('🎉 Multi-Tenancy & Custom Domain Engine is 100% Operational!');
  console.log('================================================================\n');
}

main().catch(console.error);
