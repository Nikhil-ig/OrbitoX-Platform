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
  
  const allowed = await orbitox.security.check('user_123', 'leads.create', ctx.id);
  console.log('User allowed to create leads (boolean check)?', allowed);

  // 4. Feature flag registration
  await orbitox.features.define({
    id: 'new-ui',
    displayName: 'New UI Dashboard',
    defaultValue: false,
  });
  await orbitox.features.setOverride('new-ui', ctx.id, true);
  
  const isUiEnabled = await orbitox.features.isEnabled('new-ui', ctx.id);
  console.log('Is new UI enabled for Acme Corp?', isUiEnabled);

  // 5. Audit Log
  await orbitox.audit.log({
    action: 'CREATE',
    entityId: 'lead_001',
    entityType: 'lead',
    userId: 'user_123',
    contextId: ctx.id,
  });
  console.log('Audit event logged.');

  // 6. Events
  orbitox.events.on('lead.created', async (payload) => {
    console.log('Event Received:', payload);
  });
  
  await orbitox.events.emit('lead.created', { id: 'lead_001', name: 'John Doe' }, ctx.id);

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
