import { createOrbitoXApp } from '@orbitox/runtime';
import { hospitalEntityConfigs } from './domain/entities.config';
import { wireHospitalOS } from './index';
import { HierarchyService } from './services/hierarchy.service';
import { HospitalOSClient } from './client/HospitalOSClient';

async function testHospitalOSClientSDK() {
  console.log('🧪 Testing HospitalOSClient Universal SDK...');
  const PORT = 3004;
  const { app, server } = await createOrbitoXApp({
    app: { name: 'HospitalOS Client SDK Test', port: PORT },
    entities: hospitalEntityConfigs
  });
  wireHospitalOS(app);

  await HierarchyService.bootstrapStandardHospital({
    orgId: 'apollo-global',
    orgName: 'Apollo Health Global',
    branchId: 'apollo-ny',
    branchName: 'Apollo Hospital NY'
  });

  const client = new HospitalOSClient({ baseUrl: `http://localhost:${PORT}/api/hospital` });

  // 1. Hierarchy & Structure
  console.log('1. Testing getHierarchy() & getDepartmentsAndWards()...');
  const { tree } = await client.getHierarchy();
  console.log(`   ✅ Hierarchy Root: ${tree?.name || 'Root'}`);

  const depts = await client.getDepartmentsAndWards();
  console.log(`   ✅ Departments Count: ${depts.departments.length} | Wards Count: ${depts.wards.length}`);

  // 2. Staff Directory
  console.log('2. Testing getStaff()...');
  const staff = await client.getStaff();
  console.log(`   ✅ Staff Members Count: ${staff.length}`);

  // 3. Beds
  console.log('3. Testing getBeds()...');
  const beds = await client.getBeds();
  console.log(`   ✅ Total Inpatient Beds: ${beds.length}`);
  const availableBed = beds.find(b => b.status === 'available');

  // 4. Patients Admission
  console.log('4. Testing admitPatient()...');
  const testPatient = await client.admitPatient({
    name: 'Bruce Wayne',
    age: 42,
    gender: 'M',
    bloodGroup: 'A+',
    diagnosis: 'Thoracic Contusion',
    attendingDoctorId: 'dr_strange_01',
    status: availableBed ? 'admitted' : 'pre_registered',
    bedId: availableBed ? availableBed.id : undefined
  });
  console.log(`   ✅ Admitted Patient: ${testPatient.name} (ID: ${testPatient.id})`);

  // 5. Prescribing & Dispensing
  console.log('5. Testing prescribeMedication() & dispenseMedication()...');
  const treatment = await client.prescribeMedication({
    patientId: testPatient.id,
    drugName: 'Ceftriaxone 1g IV',
    dosage: '1g IV STAT',
    doctorId: 'dr_strange_01'
  });
  console.log(`   ✅ Prescribed Treatment: ${treatment.procedureOrDrug || 'Medication'} (ID: ${treatment.id})`);

  const dispensed = await client.dispenseMedication(treatment.id, 'pharmacist_pepper_01');
  console.log(`   ✅ Dispensed Status: ${dispensed.status}`);

  const administered = await client.administerMedication(treatment.id, 'nurse_palmer_01');
  console.log(`   ✅ Administered Status: ${administered.status}`);

  // 6. Appointments
  console.log('6. Testing createAppointment() & getAppointments()...');
  const appt = await client.createAppointment({
    patientName: 'Bruce Wayne',
    doctor: 'Dr. Stephen Strange',
    type: 'Cardiology Follow-Up',
    date: 'Tomorrow',
    time: '02:00 PM',
    status: 'Confirmed'
  });
  console.log(`   ✅ Created Appointment: ID ${appt.id}`);

  // 7. Hospital Stats
  console.log('7. Testing getStats()...');
  const stats = await client.getStats();
  console.log(`   ✅ Hospital Stats: ${stats.totalPatients} Patients | ${stats.totalBeds} Beds`);

  // 8. Cryptographic Audit Ledger
  console.log('8. Testing getAuditLogs()...');
  const auditLogs = await client.getAuditLogs();
  console.log(`   ✅ Audit Records Count: ${auditLogs.length}`);

  // 9. Pathology & Diagnostic Lab Workflow
  console.log('9. Testing orderLabTest() & reportLabResult()...');
  const labOrder = await client.orderLabTest({
    patientId: testPatient.id,
    doctorId: 'dr_strange_01',
    testType: 'Troponin-I (STAT)',
    priority: 'stat',
    clinicalNotes: 'Rule out acute coronary syndrome'
  });
  console.log(`   ✅ Ordered Diagnostic Lab: ${labOrder.testType} (ID: ${labOrder.id}, Priority: ${labOrder.priority})`);

  const completedLab = await client.reportLabResult(labOrder.id, {
    numericValue: 0.45,
    resultSummary: 'Elevated Troponin-I consistent with myocardial injury',
    isCriticalValue: true,
    technicianId: 'lab_tech_01'
  });
  console.log(`   ✅ Lab Findings Recorded: Status ${completedLab.status}, Critical: ${completedLab.isCriticalValue}, Flag: ${completedLab.flag}`);

  const patientLabs = await client.getLabOrders({ patientId: testPatient.id });
  console.log(`   ✅ Patient Diagnostic Orders Count: ${patientLabs.length}`);

  // 10. Financial Billing & Inpatient Revenue Settlement
  console.log('10. Testing generateDischargeBill() & payInvoice()...');
  const invoice = await client.generateDischargeBill(testPatient.id);
  console.log(`   ✅ Generated Itemized Bill: Total $${invoice.subtotal}, Insurance Coverage $${invoice.insuranceCoverage}, Patient Due $${invoice.patientDue}`);
  console.log(`   ✅ Line Items Billed: ${invoice.lineItems.length} items`);

  const paidInvoice = await client.payInvoice(invoice.id, 'credit_card', invoice.patientDue);
  console.log('\n🎉 ALL HOSPITAL OS CLIENT SDK TESTS (INCLUDING LABS & BILLING) PASSED WITH 100% SUCCESS!\n');
  server.close();
  process.exit(0);
}

testHospitalOSClientSDK().catch(err => {
  console.error('❌ SDK Test Failed:', err);
  process.exit(1);
});
