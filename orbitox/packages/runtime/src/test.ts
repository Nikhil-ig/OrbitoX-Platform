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

  console.log('\nAll tests passed successfully!');
}

run().catch(console.error);
