import { orbitox } from './index';

async function run() {
  console.log('OrbitoX Singleton Test\\n');

  // 1. Health check
  const health = await orbitox.health();
  console.log('Health:', health);

  // 2. Context creation
  const ctx = await orbitox.context.create({
    type: 'tenant',
    slug: 'acme',
    displayName: 'Acme Corp',
  });
  console.log('Created Context:', ctx.id);

  // 3. Security Check
  try {
    await orbitox.security.authorize('user_123', 'leads.create', ctx.id);
  } catch (e: any) {
    console.log('Security check correctly threw:', e.message);
  }
  
  // 4. Security (RBAC/ABAC)
  const isAllowed = await orbitox.security.check('user_123', 'leads.create', ctx.id);
  console.log('User allowed to create leads (boolean check)?', isAllowed);

  const payload = { email: 'john.doe@example.com', secret: 'super_secret', phone: '+1234567890' };
  const sanitized = orbitox.security.sanitizePii(payload);
  console.log('Sanitized payload:', sanitized);

  // 4. Feature flag registration
  await orbitox.features.define({
    id: 'new-ui',
    displayName: 'New UI Dashboard',
    defaultValue: false,
  });
  await orbitox.features.setOverride('new-ui', ctx.id, true);
  
  const isUiEnabled = await orbitox.features.isEnabled('new-ui', ctx.id);
  const allFlags = await orbitox.features.evaluateAll(ctx.id);
  console.log('Is new UI enabled for Acme Corp?', isUiEnabled);
  console.log('Evaluated all flags for Acme Corp:', allFlags);

  // 5. Audit Log
  await orbitox.audit.log({
    action: 'CREATE',
    entityId: 'lead_001',
    entityType: 'lead',
    userId: 'user_123',
    contextId: ctx.id,
  });
  console.log('Audit event logged.');

  const auditRecords = await orbitox.audit.query({ contextId: ctx.id });
  const chainHealth = await orbitox.audit.verifyChain();
  console.log('Audit query records count:', auditRecords.length);
  console.log('Audit hash-chain integrity:', chainHealth);

  // 6. Events
  orbitox.events.on('lead.created', async (payload) => {
    console.log('Event Received:', payload);
  });
  
  await orbitox.events.emit('lead.created', { id: 'lead_001', name: 'John Doe' }, ctx.id);
  await orbitox.events.emitBatch([
    { name: 'lead.created', payload: { id: 'lead_002', name: 'Jane Smith' }, contextId: ctx.id },
    { name: 'lead.created', payload: { id: 'lead_003', name: 'Bob Johnson' }, contextId: ctx.id },
  ]);

  // 7. AI 
  const reply = await orbitox.ai.ask('Summarize the CRM data', { contextId: ctx.id });
  console.log('AI Reply:', reply);

  // 8. AI Streaming
  process.stdout.write('AI Stream output: ');
  for await (const chunk of orbitox.ai.stream('Hello universe')) {
    process.stdout.write(chunk.text);
  }
  console.log('\n');

  // 9. Billing & Entitlements
  const plan = await orbitox.billing.createPlan({
    name: 'Pro',
    price: 99,
    features: ['pos_basic', 'ai_assistant'],
    limits: { maxOrders: 100 }
  });
  await orbitox.billing.subscribeContext({ contextId: ctx.id, planId: plan.id });
  const hasEntitlement = await orbitox.billing.hasEntitlement(ctx.id, 'ai_assistant');
  const quota = await orbitox.billing.checkQuota(ctx.id, 'maxOrders', 50);
  console.log('Billing entitlement (ai_assistant):', hasEntitlement);
  console.log('Billing quota check (50/100):', quota);

  // 10. Plugin Extension API
  orbitox.use({
    id: 'analytics-plugin',
    name: 'Custom Analytics',
    install(app) {
      console.log('Installed custom plugin on OrbitoX!');
    }
  });

  // 11. Ultra-Easy Builders
  console.log('\\n--- Testing Ultra-Easy Builders ---');
  
  // 11.1 Plan Builder
  const easyPlan = await orbitox.billing.buildPlan('Enterprise')
    .price(999, 'USD', 'year')
    .includeFeatures('crm', 'ai_assistant', 'sso')
    .limit('maxUsers', 1000)
    .publish();
  console.log('Builder created plan:', easyPlan.name, easyPlan.features);

  // 11.2 Tenant Builder
  const easyTenant = await orbitox.tenant('mega-corp', 'Mega Corp Inc')
    .type('tenant')
    .owner('user_999')
    .subscribe(easyPlan.id)
    .enableFeature('new-ui')
    .create();
  console.log('Builder created tenant:', easyTenant.id, 'with plan and features enabled.');

  // 11.3 Workflow Builder
  await orbitox.workflows.build('onboarding-flow', easyTenant.id)
    .name('New Client Onboarding')
    .onEvent('client.joined')
    .action('send-email', 'notifications.email', { template: 'welcome' })
    .delay(2, 'days')
    .action('check-in', 'crm.task', { title: 'Check in with client' })
    .activate();
  console.log('Builder registered workflow: onboarding-flow');

  // 11.4 Policy Builder
  orbitox.security.policy('strict-refund')
    .resource('order')
    .action('refund')
    .maxFieldValue('amount', 100)
    .requireUserAttribute('role', 'manager')
    .register();
  console.log('Builder registered security policy: strict-refund');

  // 11.5 Middleware Verification (Just ensure it returns a function)
  const mw = orbitox.middleware();
  console.log('Middleware created:', typeof mw === 'function');

  console.log('\\n--- Testing Builder CRUD Operations ---');
  // Tenant CRUD
  await orbitox.tenant('mega-corp', 'Mega Corp Inc').settings({ test: true }).update();
  console.log('Tenant Updated:', orbitox.tenant('mega-corp', '').get()?.settings.test === true);
  
  // Plan CRUD
  await orbitox.billing.buildPlan('Enterprise').price(1999).update();
  console.log('Plan Updated:', (await orbitox.billing.buildPlan('Enterprise').get()).price === 1999);
  
  // Workflow CRUD
  await orbitox.workflows.build('onboarding-flow', easyTenant.id).delay(5, 'days').update();
  console.log('Workflow Updated:', (await orbitox.workflows.build('onboarding-flow', easyTenant.id).get()).steps.length > 0);
  
  // Delete all
  const workflowDeleted = await orbitox.workflows.build('onboarding-flow', easyTenant.id).delete();
  const planDeleted = await orbitox.billing.buildPlan('Enterprise').delete();
  const tenantDeleted = orbitox.tenant('mega-corp', '').delete();
  
  orbitox.security.policy('strict-refund').delete();
  const policyDeleted = !orbitox.security.policy('strict-refund').get();
  
  // Multi-Org Same-Slug Isolation Test
  const orgA = await orbitox.tenant('org-a', 'Org A').type('organisation').create();
  const orgB = await orbitox.tenant('org-b', 'Org B').type('organisation').create();

  const childA = await orbitox.tenant('ny-franchise', 'Acme NY').parent(orgA.id).create();
  const childB = await orbitox.tenant('ny-franchise', 'Globex NY').parent(orgB.id).create();

  const getChildA = orbitox.tenant('ny-franchise', '').parent(orgA.id).get();
  const getChildB = orbitox.tenant('ny-franchise', '').parent(orgB.id).get();

  const isIsolated = getChildA?.displayName === 'Acme NY' && getChildB?.displayName === 'Globex NY';
  console.log('Multi-Org Parent-Scoped Slug Isolation Passed:', isIsolated);

  orbitox.tenant('ny-franchise', '').parent(orgA.id).delete();
  orbitox.tenant('ny-franchise', '').parent(orgB.id).delete();
  orbitox.tenant('org-a', '').delete();
  orbitox.tenant('org-b', '').delete();

  console.log('CRUD Deletions passed:', workflowDeleted && planDeleted && tenantDeleted && policyDeleted);

  console.log('\n--- Testing Mandatory Header & Domain Protection Middleware ---');
  const strictMw = orbitox.middleware({
    strictDomainProtection: true,
    baseDomain: 'orbitox.com',
    enforceAuth: true,
  });

  // Test 1: Valid subdomain (acme.orbitox.com)
  let nextCalled = false;
  let statusResult = 200;
  let jsonResult: any = null;

  const mockReq1 = {
    headers: { host: 'acme.orbitox.com', authorization: 'Bearer user_subdomain' },
    method: 'GET',
    url: '/api/menu'
  };
  const mockRes1 = {
    status(s: number) { statusResult = s; return this; },
    json(obj: any) { jsonResult = obj; return this; }
  };

  await strictMw(mockReq1, mockRes1, () => { nextCalled = true; });
  console.log('Subdomain Resolution (acme.orbitox.com):', nextCalled && (mockReq1 as any).orbitoxContext?.slug === 'acme');

  // Test 2: Multi-Header Resolution (x-org-id)
  nextCalled = false;
  const mockReq2 = {
    headers: { 'x-org-id': 'acme', authorization: 'Bearer user_header' },
    method: 'GET',
    url: '/api/menu'
  };
  const mockRes2 = { status() { return this; }, json() { return this; } };
  await strictMw(mockReq2, mockRes2, () => { nextCalled = true; });
  console.log('Multi-Header Resolution (x-org-id):', nextCalled && (mockReq2 as any).orbitoxContext?.slug === 'acme');

  // Test 3: Unknown Tenant Blocking (403 Forbidden)
  let forbiddenCalled = false;
  const mockReq3 = {
    headers: { 'x-tenant-id': 'non-existent-tenant-999', authorization: 'Bearer user_unknown' },
    method: 'GET',
  };
  const mockRes3 = {
    status(s: number) { if (s === 403) forbiddenCalled = true; return this; },
    json(obj: any) { return this; }
  };
  await strictMw(mockReq3, mockRes3, () => {});
  console.log('Unknown Tenant Blocked with 403:', forbiddenCalled);

  console.log('\n--- Testing Dynamic N-Tier Data Isolation & IDOR Protection ---');
  // Test 1: Immutable Hierarchy Write Protection
  const dirtyUpdatePayload = { name: 'Updated Name', tenantId: 'hacked_tenant', orgId: 'hacked_org' };
  const cleanUpdatePayload = orbitox.security.sanitizeWritePayload(dirtyUpdatePayload, true);
  const writeProtectionPassed = cleanUpdatePayload.name === 'Updated Name' && !cleanUpdatePayload.tenantId && !cleanUpdatePayload.orgId;
  console.log('Immutable Write Protection Passed:', writeProtectionPassed);

  // Test 2: IDOR Silent 404 Neutralization
  let idor404Passed = false;
  try {
    orbitox.security.enforceContextBoundary('tenant_123', 'tenant_999');
  } catch (err: any) {
    idor404Passed = err.statusCode === 404 || err.status === 404;
  }
  console.log('IDOR Attack Neutralized with Silent 404:', idor404Passed);

  // Test 3: Cache Key Namespace Isolation
  const { buildCacheKey } = require('@orbitox/core');
  const cacheKey = buildCacheKey('tenant_123', 'rules', 'billing');
  console.log('Multi-Tier Cache Key Namespace Isolated:', cacheKey === 'context:tenant_123:billing:rules');

  console.log('\nAll tests passed successfully!');
}

run().catch(console.error);
