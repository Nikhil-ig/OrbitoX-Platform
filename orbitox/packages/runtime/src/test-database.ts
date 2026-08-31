import { orbitox, createOrbitoXApp, createDatabaseAdapter } from './index';

interface PatientRecord {
  id: string;
  name: string;
  condition?: string;
  contextId?: string;
}

async function runDatabaseIntegrationTest() {
  console.log('🗄️ Starting OrbitoX Universal Database Adapter Test\n');

  // --- 1. TEST BUILT-IN DATABASE FACADE & IN-MEMORY ADAPTER ---
  console.log('--- Step 1: Testing Default Database Facade ---');
  const patient1 = await orbitox.db.create<PatientRecord>('patient', {
    name: 'Tony Stark',
    condition: 'Cardiac trauma'
  }, 'ctx_cardio_icu');

  const patient2 = await orbitox.db.create<PatientRecord>('patient', {
    name: 'Bruce Banner',
    condition: 'Gamma radiation'
  }, 'ctx_neuro_ward');

  console.log(`[DB Facade] Created patient: ${patient1.name} (ID: ${patient1.id})`);
  console.log(`[DB Facade] Created patient: ${patient2.name} (ID: ${patient2.id})`);

  // Query with Context Isolation
  const cardioPatients = await orbitox.db.findMany<PatientRecord>('patient', { contextId: 'ctx_cardio_icu' });
  console.log(`[DB Facade] Query with contextId 'ctx_cardio_icu': ${cardioPatients.data.length} record(s)`);
  console.log(`[DB Facade] Context Isolation Verified:`, cardioPatients.data.length === 1 && cardioPatients.data[0]!.name === 'Tony Stark');

  // --- 2. TEST CUSTOM DATABASE ADAPTER (Simulating Prisma / Mongo / Drizzle) ---
  console.log('\n--- Step 2: Testing Custom Database Adapter Plugin ---');
  
  // Custom mock database storage (simulating external Postgres/Mongo cluster)
  const externalPostgresCluster: Record<string, PatientRecord[]> = {
    patient: []
  };

  // Create a 5-line custom adapter using createDatabaseAdapter helper!
  const customPrismaStyleAdapter = createDatabaseAdapter('custom_postgres', {
    findMany: async (entity, opts) => {
      const records = externalPostgresCluster[entity] || [];
      const filtered = opts.contextId ? records.filter(r => r.contextId === opts.contextId) : records;
      return {
        data: filtered,
        meta: { page: 1, limit: 20, total: filtered.length }
      };
    },
    create: async (entity, data, ctxId) => {
      const record: PatientRecord = { id: `pg_${Date.now()}`, ...(data as any), contextId: ctxId };
      if (!externalPostgresCluster[entity]) externalPostgresCluster[entity] = [];
      externalPostgresCluster[entity]!.push(record);
      return record;
    },
    findById: async (entity, id) => {
      return externalPostgresCluster[entity]?.find(r => r.id === id) || null;
    },
    delete: async (entity, id) => {
      const list = externalPostgresCluster[entity];
      if (!list) return false;
      const idx = list.findIndex(r => r.id === id);
      if (idx >= 0) {
        list.splice(idx, 1);
        return true;
      }
      return false;
    }
  });

  // Plug the custom adapter into OrbitoX in 1 line!
  orbitox.db.useAdapter(customPrismaStyleAdapter);
  console.log(`[DB Facade] Switched adapter to: ${orbitox.db.getAdapter().name}`);

  // Test operations with the new custom adapter
  const newPgPatient = await orbitox.db.create<PatientRecord>('patient', { name: 'Peter Parker', condition: 'Spider Bite' }, 'ctx_er_bay');
  console.log(`[Custom DB] Created record in external DB: ${newPgPatient.name} (ID: ${newPgPatient.id})`);

  const fetchedPg = await orbitox.db.findById<PatientRecord>('patient', newPgPatient.id);
  console.log(`[Custom DB] Fetched record by ID: ${fetchedPg?.name}`);
  console.log(`[Custom DB] Verified in External DB array:`, externalPostgresCluster.patient!.length === 1);

  // --- 3. TEST createOrbitoXApp WITH CUSTOM DB ADAPTER ---
  console.log('\n--- Step 3: Booting Auto-REST API with Custom DB Adapter ---');
  const { server } = await createOrbitoXApp({
    app: { name: 'Custom DB App', port: 3009 },
    database: {
      adapter: customPrismaStyleAdapter
    },
    entities: [
      {
        id: 'patient',
        name: 'Patient',
        fields: [{ name: 'name', type: 'text', required: true }]
      }
    ]
  });

  try {
    const res = await fetch('http://localhost:3009/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Steve Rogers' })
    });
    const data = await res.json() as any;
    console.log(`[Auto-REST API] Created Patient via REST: ${data.data.name} (ID: ${data.data.id})`);
    console.log(`[Auto-REST API] Total records in Custom Database: ${externalPostgresCluster.patient!.length}`);
  } finally {
    server.close();
  }

  console.log('\n✅ Universal Database Adapter Integration Test Completed Successfully!');
}

runDatabaseIntegrationTest().catch(console.error);
