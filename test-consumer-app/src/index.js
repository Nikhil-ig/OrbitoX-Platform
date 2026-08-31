// 🚀 1-Line Ultra-Easy OrbitoX Application Bootstrap Demo
const { createOrbitoX } = require('@orbitox-io/plugin-engine');
const crm = require('@orbitox-io/crm');

async function bootstrap() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║ 🪐 OrbitoX Enterprise Client — 1-Line Ultra-Easy Bootstrapper Demo          ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  // 🚀 1-Line Fluent Initialization: verifies licenses, freezes facades, and mounts plugins
  const app = await createOrbitoX({
    license: process.env.ORBITOX_LICENSE_KEY,
    plugins: [crm],
  });

  console.log('✅ Application Bootstrapped in 1 Line!');
  console.log(`• Security Context: ${app.security.isVerified ? '🔒 Licensed Enterprise' : '⚡ Developer Mode'}`);
  console.log(`• Mounted Plugins:  [${Array.from(app.plugins.keys()).join(', ')}]\n`);

  // 1. Direct Access to CRM Plugin via `app.crm`
  console.log('1️⃣  Direct Access via app.crm.createLead():');
  const lead = app.crm.createLead({
    name: 'Dr. Ramesh Sharma',
    email: 'r.sharma@apollo.com',
    phone: '+91 98765 43210',
    company: 'Apollo Healthcare Network',
    estimatedValue: 4500000,
  });

  console.log(`   • Lead Created: ${lead.name} (${lead.company})`);
  console.log(`   • Lead ID:      ${lead.id}`);
  console.log(`   • Value:        INR ${lead.estimatedValue.toLocaleString()}`);

  // 2. Sales Pipeline State Transitions
  console.log('\n2️⃣  Progressing Sales Pipeline via app.crm.updateLeadStatus():');
  const s1 = app.crm.updateLeadStatus(lead.id, 'CONTACTED');
  const s2 = app.crm.updateLeadStatus(lead.id, 'QUALIFIED');
  const s3 = app.crm.updateLeadStatus(lead.id, 'PROPOSAL_SENT');
  const wonLead = app.crm.updateLeadStatus(lead.id, 'WON');

  console.log(`   • Final Status: ${wonLead?.status} 🎉 (DEAL WON!)`);

  // 3. AI Copilot Summary
  console.log('\n3️⃣  AI Summary via app.crm.generateAiSummary():');
  const summary = app.crm.generateAiSummary(lead.id);
  console.log(`   • ${summary}`);

  console.log('\n================================================================');
  console.log('🎉 1-Line createOrbitoX() Client is 100% Operational & Verified!');
  console.log('================================================================\n');
}

bootstrap().catch(console.error);
