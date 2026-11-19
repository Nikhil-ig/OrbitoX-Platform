import { orbitox } from './index';

async function runHospitalTest() {
  console.log('🏥 OrbitoX Hospital N-Tier Context Test\n');

  // 1. Create the Hospital Hierarchy
  console.log('--- Building Hospital Context Tree ---');
  
  const hospital = await orbitox.context.create({
    type: 'organisation',
    slug: 'apollo-ny',
    displayName: 'Apollo Hospital NY',
  });

  const cardio = await orbitox.context.create({
    type: 'department',
    slug: 'cardiology',
    displayName: 'Cardiology Department',
    parentId: hospital.id
  });

  const icuWard = await orbitox.context.create({
    type: 'ward',
    slug: 'icu-a',
    displayName: 'ICU Ward A',
    parentId: cardio.id
  });

  const room101 = await orbitox.context.create({
    type: 'room',
    slug: 'room-101',
    displayName: 'Room 101',
    parentId: icuWard.id
  });

  const bed1 = await orbitox.context.create({
    type: 'bed',
    slug: 'bed-1',
    displayName: 'Bed 1',
    parentId: room101.id
  });

  const bed2 = await orbitox.context.create({
    type: 'bed',
    slug: 'bed-2',
    displayName: 'Bed 2',
    parentId: room101.id
  });

  const neuro = await orbitox.context.create({
    type: 'department',
    slug: 'neurology',
    displayName: 'Neurology Department',
    parentId: hospital.id
  });

  const neuroWard = await orbitox.context.create({
    type: 'ward',
    slug: 'neuro-ward',
    displayName: 'Neuro Ward',
    parentId: neuro.id
  });

  const room201 = await orbitox.context.create({
    type: 'room',
    slug: 'room-201',
    displayName: 'Room 201',
    parentId: neuroWard.id
  });

  const bed3 = await orbitox.context.create({
    type: 'bed',
    slug: 'bed-3',
    displayName: 'Bed 3',
    parentId: room201.id
  });

  console.log(`✅ Hierarchy Built Successfully.`);
  console.log(`- Hospital: ${hospital.displayName} (${hospital.id})`);
  console.log(`  - Dept: ${cardio.displayName} (${cardio.id})`);
  console.log(`    - Ward: ${icuWard.displayName}`);
  console.log(`      - Room: ${room101.displayName}`);
  console.log(`        - Bed: ${bed1.displayName} (${bed1.id})`);
  console.log(`        - Bed: ${bed2.displayName} (${bed2.id})`);
  console.log(`  - Dept: ${neuro.displayName} (${neuro.id})`);
  console.log(`    - Ward: ${neuroWard.displayName}`);
  console.log(`      - Room: ${room201.displayName}`);
  console.log(`        - Bed: ${bed3.displayName} (${bed3.id})\n`);

  // 2. Fetching Descendants (What wards/rooms are under Cardio?)
  console.log('--- Fetching Doctor\'s Wards & Rooms ---');
  // @ts-ignore - The internal context service has the hierarchical resolution logic
  const cardioDescendants = orbitox.context['svc'].getDescendants(cardio.id);
  const descendantNames = cardioDescendants.map((c: any) => c.displayName);
  console.log(`Cardiology Descendants:`, descendantNames.join(', '));
  console.log(`Validation Passed?`, descendantNames.includes('Room 101') && descendantNames.includes('Bed 1') && !descendantNames.includes('Bed 3'));
  console.log();


  // 3. Simulating Patients in DB
  console.log('--- Simulating Patient Records in DB ---');
  const mockPatientsDatabase = [
    { id: 'pat_01', name: 'John Doe', contextId: bed1.id, diagnosis: 'Heart Attack' },
    { id: 'pat_02', name: 'Jane Smith', contextId: bed2.id, diagnosis: 'Arrhythmia' },
    { id: 'pat_03', name: 'Bob Johnson', contextId: bed3.id, diagnosis: 'Migraine' } // Bob is in Neuro
  ];
  console.log(`Total admitted patients across hospital: ${mockPatientsDatabase.length}\n`);

  // 4. Auto-Scoping Patients for the Doctor
  console.log('--- Auto-Scoping Queries for Doctor (Cardiology) ---');
  
  // We mock the user assigning
  const doctorUserId = 'dr_strange';
  
  // The Security Middleware generates a dynamic visibility clause
  // Basically it says: Find all contexts this doctor has access to, and generate a DB filter.
  // We'll simulate the filter generation by getting all descendant IDs + the department ID itself
  const allowedContextIds = [cardio.id, ...cardioDescendants.map((c: any) => c.id)];
  
  const visibilityFilter = {
    contextId: { $in: allowedContextIds }
  };

  console.log('Generated N-Tier Visibility Filter:', visibilityFilter);

  // Apply the filter to the mock database
  const visiblePatients = mockPatientsDatabase.filter(pat => 
    visibilityFilter.contextId.$in.includes(pat.contextId)
  );

  console.log('\nDoctor\'s View (Patients in Cardiology):');
  visiblePatients.forEach(p => console.log(`- [${p.id}] ${p.name} (Diagnosis: ${p.diagnosis})`));

  console.log('\nValidation Passed? Only Cardio Patients Visible:', 
    visiblePatients.length === 2 && 
    visiblePatients.some(p => p.name === 'John Doe') && 
    !visiblePatients.some(p => p.name === 'Bob Johnson')
  );

  // 5. Cleanup
  console.log('\n--- Cleaning Up Contexts ---');
  await orbitox.context.delete(bed1.id);
  await orbitox.context.delete(bed2.id);
  await orbitox.context.delete(room101.id);
  await orbitox.context.delete(icuWard.id);
  await orbitox.context.delete(cardio.id);
  await orbitox.context.delete(bed3.id);
  await orbitox.context.delete(room201.id);
  await orbitox.context.delete(neuroWard.id);
  await orbitox.context.delete(neuro.id);
  await orbitox.context.delete(hospital.id);
  console.log('Cleanup complete.');
}

runHospitalTest().catch(console.error);
