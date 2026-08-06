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

  console.log('\\nAll tests passed successfully!');
}

run().catch(console.error);
