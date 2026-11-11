import { orbitox } from './index';
import { createOrbitoXApp } from './orbitox-app';

async function runE2E() {
  console.log('🚀 Starting OrbitoX E2E Healthcare SaaS Simulation (Clinical Edition)\n');

  // --- 1. SETUP ADVANCED SCAFFOLDER API & HOOKS ---
  console.log('--- Phase 1: Advanced API Engine (Clinical Models) ---');

  const mockBedsDB: Record<string, any> = {};

  let appServer: any;
  let hospitalGroup: any;
  let beds: any[] = [];
  let cardioDept: any, neuroDept: any, icuWard: any, neuroWard: any;
  
  try {
    const { server } = await createOrbitoXApp({
      app: { name: 'Hospital SaaS Engine', port: 3002 },
      entities: [
        {
          id: 'lead',
          name: 'Lead',
          fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'symptoms', type: 'text' }
          ]
        },
        {
          id: 'staff',
          name: 'Staff',
          fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'role', type: 'text', required: true }, // doctor, nurse
            { name: 'departmentId', type: 'text', required: true }
          ]
        },
        {
          id: 'patient',
          name: 'Patient',
          fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'bedId', type: 'text', required: true },
            { name: 'status', type: 'text' }
          ],
          hooks: {
            beforeCreate: async (payload, context) => {
              const bed = mockBedsDB[payload.bedId];
              if (!bed) throw new Error(`Bed ${payload.bedId} does not exist`);
              if (bed.status !== 'available') throw new Error(`Bed ${payload.bedId} is already occupied!`);
              
              if (hospitalGroup) {
                const quota = await orbitox.billing.checkQuota(hospitalGroup.id, 'maxBeds', Object.keys(mockBedsDB).filter(k => mockBedsDB[k].status === 'occupied').length);
                if (!quota.allowed) throw new Error('Hospital has reached maximum licensed beds capacity!');
              }
              return payload;
            },
            afterCreate: (record, context) => {
              mockBedsDB[record.bedId].status = 'occupied';
              console.log(`[Hook] afterCreate: Automatically marked Bed ${record.bedId} as occupied.`);
            }
          }
        },
        {
          id: 'medical_record',
          name: 'MedicalRecord',
          fields: [
            { name: 'patientId', type: 'text', required: true },
            { name: 'doctorId', type: 'text', required: true },
            { name: 'diagnosis', type: 'text', required: true },
            { name: 'notes', type: 'text' }
          ]
        },
        {
          id: 'treatment',
          name: 'Treatment',
          fields: [
            { name: 'recordId', type: 'text', required: true },
            { name: 'procedure', type: 'text', required: true },
            { name: 'status', type: 'text' }
          ],
          hooks: {
            afterCreate: (record, context) => {
              console.log(`[Hook] afterCreate Treatment: Automatically alerting Pharmacy & Surgery Prep!`);
            }
          }
        }
      ]
    });
    appServer = server;

    // --- 2. SETUP BILLING & CONTEXT HIERARCHY ---
    console.log('\n--- Phase 2: Context Hierarchy & Billing Quotas ---');
    const enterprisePlan = await orbitox.billing.createPlan({
      name: 'Healthcare Enterprise',
      price: 5000,
      features: ['ai_diagnostics', 'inter_branch_mesh', 'audit_vault'],
      limits: { maxBeds: 5 }
    });

    hospitalGroup = await orbitox.tenant('global-health', 'Global Health Group').type('organisation').subscribe(enterprisePlan.id).create();
    cardioDept = await orbitox.tenant('cardio-dept', 'Cardiology').type('department').parent(hospitalGroup.id).create();
    neuroDept = await orbitox.tenant('neuro-dept', 'Neurology').type('department').parent(hospitalGroup.id).create();
    icuWard = await orbitox.tenant('icu-ward', 'Cardio ICU').type('ward').parent(cardioDept.id).create();
    neuroWard = await orbitox.tenant('neuro-ward', 'Neuro Ward').type('ward').parent(neuroDept.id).create();

    for (let i = 1; i <= 3; i++) {
      const bed = await orbitox.tenant(`bed-icu-${i}`, `ICU Bed ${i}`).type('bed').parent(icuWard.id).create();
      beds.push(bed);
    }
    const neuroBed = await orbitox.tenant('bed-neuro-1', 'Neuro Bed 1').type('bed').parent(neuroWard.id).create();
    beds.push(neuroBed);

    for (const bed of beds) mockBedsDB[bed.id] = { id: bed.id, status: 'available' };
    console.log(`[Context] Built Hospital Tree with ${beds.length} Total Beds.`);

    // --- 3. ONBOARDING STAFF (Doctors & Nurses) ---
    console.log('\n--- Phase 3: Onboarding Doctors & Staff ---');
    const docRes = await fetch('http://localhost:3002/api/staffs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Dr. Stephen Strange', role: 'doctor', departmentId: cardioDept.id })
    });
    const docData = await docRes.json() as any;
    console.log(`[API] Created Staff: ${docData.data.name} (${docData.data.role} in Cardiology)`);

    const nurseRes = await fetch('http://localhost:3002/api/staffs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Nurse Christine Palmer', role: 'nurse', departmentId: icuWard.id })
    });
    const nurseData = await nurseRes.json() as any;
    console.log(`[API] Created Staff: ${nurseData.data.name} (${nurseData.data.role} in ICU Ward)`);

    // --- 4. SIMULATE CRM LEAD & WORKFLOW ---
    console.log('\n--- Phase 4: Workflows (CRM to Admission) ---');
    await orbitox.workflows.build('admission-workflow', hospitalGroup.id)
      .name('Auto-Admit VIP Leads')
      .onEvent('lead.created')
      .action('notify-admin', 'notifications.email', { template: 'vip_alert' })
      .activate();

    const leadRes = await fetch('http://localhost:3002/api/leads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Tony Stark', symptoms: 'Shrapnel in chest' })
    });
    const leadData = await leadRes.json() as any;
    console.log(`[API] Created CRM Lead: ${leadData.data.name}`);

    // --- 5. CAPACITY MANAGEMENT & ADMISSION ---
    console.log('\n--- Phase 5: Admission & Bed Capacity Management ---');
    const admitRes = await fetch('http://localhost:3002/api/patients', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Tony Stark', bedId: beds[0].id, status: 'admitted' })
    });
    const admitData = await admitRes.json() as any;
    console.log(`[API] Admission Result: ${admitData.message || admitData.error}`);
    console.log(`[Query] Current Bed Availability:`, Object.values(mockBedsDB).filter((b: any) => b.status === 'available').length);

    // --- 6. CLINICAL WORKFLOW (Doctor -> Patient File -> Treatment) ---
    console.log('\n--- Phase 6: Full Clinical Workflow (Diagnosis & Treatment) ---');
    
    // Create Medical Record
    const recordRes = await fetch('http://localhost:3002/api/medical-records', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId: admitData.data.id, doctorId: docData.data.id, diagnosis: 'Severe cardiac trauma', notes: 'Requires immediate arc reactor replacement' })
    });
    const recordData = await recordRes.json() as any;
    console.log(`[API] Created Medical Record for ${admitData.data.name} by ${docData.data.name}`);

    // Create Treatment
    const treatmentRes = await fetch('http://localhost:3002/api/treatments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId: recordData.data.id, procedure: 'Arc Reactor Surgery', status: 'pending_prep' })
    });
    const treatmentData = await treatmentRes.json() as any;
    console.log(`[API] Ordered Treatment: ${treatmentData.data.procedure}`);

    // --- 7. ZERO TRUST & INTER-BRANCH MESH ---
    console.log('\n--- Phase 7: Zero-Trust & Inter-Branch Mesh ---');
    console.log(`[Security] Cardio Doctor attempting to read Tony's File... (ALLOWED naturally via Context Tree)`);
    
    let neuroCanAccessCardio = orbitox.context.canPeerAccess(neuroDept.id, cardioDept.id, 'medical_record.read');
    console.log(`[Security] Neuro Doctor accessing Cardio Patient's File (BEFORE Mesh): ${neuroCanAccessCardio}`); // false

    orbitox.context.linkPeers(neuroDept.id, cardioDept.id, ['medical_record.read', 'treatment.read']);
    neuroCanAccessCardio = orbitox.context.canPeerAccess(neuroDept.id, cardioDept.id, 'medical_record.read');
    console.log(`[Security] Neuro Doctor accessing Cardio Patient's File (AFTER Mesh Grant): ${neuroCanAccessCardio}`); // true

    // --- 8. IMMUTABLE AUDIT TRAIL ---
    console.log('\n--- Phase 8: Immutable Audit & Compliance ---');
    const auditChain = await orbitox.audit.verifyChain();
    console.log(`[Audit] Total Immutable Events Logged: ${auditChain.totalEntries}`);
    console.log(`[Audit] SHA-256 Hash-Chain Intact & Valid: ${auditChain.valid}`);
    
    const treatmentLogs = await orbitox.audit.query({ entityId: treatmentData.data.id });
    console.log(`[Audit] Immutable Clinical Logs for Treatment ${treatmentData.data.id}: ${treatmentLogs.length} event(s)`);

  } finally {
    if (appServer) appServer.close();
  }

  console.log('\n--- Cleanup ---');
  for (const b of beds) await orbitox.context.delete(b.id);
  await orbitox.context.delete(icuWard.id);
  await orbitox.context.delete(neuroWard.id);
  await orbitox.context.delete(cardioDept.id);
  await orbitox.context.delete(neuroDept.id);
  await orbitox.context.delete(hospitalGroup.id);
  
  console.log('✅ End-to-End Clinical Simulation Completed Successfully!');
}

runE2E().catch(console.error);
