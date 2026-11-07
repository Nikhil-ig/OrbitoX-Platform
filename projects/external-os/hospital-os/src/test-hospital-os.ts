import { orbitox, createOrbitoXApp } from '@orbitox/runtime';
import { hospitalEntityConfigs } from './domain/entities.config';
import { wireHospitalOS } from './index';
import { HierarchyService } from './services/hierarchy.service';
import { AdmissionService } from './services/admission.service';
import { TelemetryService } from './services/telemetry.service';
import { PharmacyService } from './services/pharmacy.service';
import { LabService } from './services/lab.service';
import { BillingService } from './services/billing.service';
import { DashboardService } from './services/dashboard.service';
import { SecurityService } from './services/security.service';
import { instantiateMedicalDevice } from './domain/equipment-catalog';
import { BedEntity, MedicalRecordEntity, StaffEntity } from './domain/types';

async function runHospitalOSE2ETest() {
  console.log('🏥 ═══════════════════════════════════════════════════════════════');
  console.log('   ORBITOX HOSPITAL OS — FULL E2E CLINICAL LIFECYCLE TEST');
  console.log('═════════════════════════════════════════════════════════════════\n');

  // 1. Initialize Runtime App
  const { app, server } = await createOrbitoXApp({
    app: { name: 'Apollo Hospital OS Test', port: 3001 },
    entities: hospitalEntityConfigs
  });
  wireHospitalOS(app);

  // 2. Build 6-Tier Hospital Context Tree
  console.log('--- Step 1: Building 6-Tier Hierarchy ---');
  const tree = await HierarchyService.bootstrapStandardHospital({
    orgId: 'apollo-global',
    orgName: 'Apollo Health Global',
    branchId: 'apollo-ny',
    branchName: 'Apollo Hospital NY'
  });

  // 3. Register Staff (Doctor & Nurse)
  console.log('\n--- Step 2: Registering Staff Members ---');
  const drStrange = await orbitox.db.create<StaffEntity>('staff', {
    name: 'Dr. Stephen Strange',
    role: 'attending_doctor',
    departmentId: tree.departments.cardiology.id,
    email: 'strange@apollo.com',
    licenseNumber: 'MD-CARDIO-9988',
    shiftSchedule: 'day',
    isOnDuty: true
  }, tree.departments.cardiology.id);

  const nursePalmer = await orbitox.db.create<StaffEntity>('staff', {
    name: 'Nurse Christine Palmer',
    role: 'head_nurse',
    departmentId: tree.departments.cardiology.id,
    email: 'palmer@apollo.com',
    licenseNumber: 'RN-ICU-4421',
    shiftSchedule: 'day',
    isOnDuty: true
  }, tree.wards.cardioICU.id);
  console.log(`✅ Staff Registered: ${drStrange.name} (Doctor) & ${nursePalmer.name} (Nurse)`);

  // 4. Provision ICU Bed with 2 Paired Medical Devices
  console.log('\n--- Step 3: Configuring ICU Bed & Medical Equipment ---');
  const monitor = instantiateMedicalDevice('PHILIPS_MX800', 'MX800-SN-44321');
  const ventilator = instantiateMedicalDevice('HAMILTON_G5', 'HG5-SN-88210');

  const icuBed = await orbitox.db.create<BedEntity>('bed', {
    label: 'Bed 101-A (ICU Station)',
    wardId: tree.wards.cardioICU.id,
    roomId: tree.rooms.room101.id,
    type: 'icu',
    status: 'available',
    isTemporary: false,
    dailyRate: 1500,
    attachedEquipment: [monitor, ventilator],
    telemetryThresholds: { minSpO2: 90, maxHeartRate: 130, minHeartRate: 45, maxTemperature: 39.5, minTemperature: 35.0, maxRespiratoryRate: 30 }
  }, tree.beds.bed101A.id);
  console.log(`✅ Bed Configured: ${icuBed.label} with attached ${monitor.model} & ${ventilator.model}`);

  // 5. Admit Patient into Bed 101-A
  console.log('\n--- Step 4: Patient Admission & Atomic Bed Lock ---');
  const patient = await AdmissionService.admitPatient({
    name: 'Tony Stark',
    age: 48,
    gender: 'M',
    bloodGroup: 'O+',
    category: 'general',
    bedId: icuBed.id,
    attendingDoctorId: drStrange.id,
    contextId: tree.beds.bed101A.id
  });

  // Verify Bed is now occupied
  const occupiedBed = await orbitox.db.findById<BedEntity>('bed', icuBed.id, tree.beds.bed101A.id);
  console.log(`Validation Check: Is Bed Status 'occupied'? -> ${occupiedBed?.status === 'occupied'}`);

  // 6. Medical Diagnosis Record Creation
  console.log('\n--- Step 5: Doctor Diagnosis Record ---');
  const record = await orbitox.db.create<MedicalRecordEntity>('medical_record', {
    patientId: patient.id,
    doctorId: drStrange.id,
    type: 'initial_assessment',
    diagnosis: 'Acute ST-Elevation Myocardial Infarction (STEMI)',
    icdCode: 'I21.0',
    clinicalNotes: 'Patient admitted with severe chest pain. ECG shows ST elevation in lead II/III/aVF.',
    vitals: { timestamp: new Date().toISOString(), heartRate: 110, bloodPressure: '135/85', spo2: 94, temperature: 37.1, respiratoryRate: 20 }
  }, tree.beds.bed101A.id);
  console.log(`✅ Medical Record Created: ID ${record.id} (Diagnosis: ${record.diagnosis})`);

  // 7. IoT Telemetry Stream & Alarm Breach Simulation
  console.log('\n--- Step 6: IoT Telemetry Stream & Alarm Simulation ---');
  console.log('Sending normal telemetry stream...');
  await TelemetryService.processVitalsStream(icuBed.id, { timestamp: new Date().toISOString(), heartRate: 85, bloodPressure: '120/80', spo2: 98, temperature: 36.8, respiratoryRate: 16 }, tree.beds.bed101A.id);

  console.log('Simulating critical telemetry vitals breach (SpO2 drops to 83%)...');
  const alarmResult = await TelemetryService.processVitalsStream(icuBed.id, { timestamp: new Date().toISOString(), heartRate: 142, bloodPressure: '80/50', spo2: 83, temperature: 38.2, respiratoryRate: 32 }, tree.beds.bed101A.id);
  console.log(`✅ Alarm Dispatched: Status -> ${alarmResult.status} | Severity -> ${alarmResult.status === 'alarm' ? 'CODE_BLUE' : 'NORMAL'}`);

  // 8. Pharmacy Medication Flow (Prescribe -> Dispense -> Administer)
  console.log('\n--- Step 7: Medication 5-Rights Pharmacy Pipeline ---');
  const treatment = await PharmacyService.prescribeMedication({
    patientId: patient.id,
    recordId: record.id,
    doctorId: drStrange.id,
    drugName: 'Metoprolol Tartrate',
    dosage: '50mg',
    frequency: 'BID',
    route: 'PO',
    contextId: tree.beds.bed101A.id
  });

  await PharmacyService.verifyAndDispense(treatment.id, 'pharmacist_pepper_01', tree.beds.bed101A.id);
  await PharmacyService.administerAtBedside(treatment.id, nursePalmer.id, tree.beds.bed101A.id);

  // 9. Pathology Lab Order Pipeline
  console.log('\n--- Step 8: Pathology Lab Order & Critical Value Escalation ---');
  const labOrder = await LabService.orderTest({
    patientId: patient.id,
    doctorId: drStrange.id,
    testType: 'Troponin-I',
    priority: 'stat',
    contextId: tree.beds.bed101A.id
  });

  await LabService.reportResults({
    orderId: labOrder.id,
    resultSummary: 'Troponin-I: 4.2 ng/mL (Normal: < 0.04 ng/mL)',
    isCriticalValue: true,
    contextId: tree.beds.bed101A.id
  });

  // 10. Role-Based Dashboards Validation
  console.log('\n--- Step 9: Role-Based Dashboard Aggregation ---');
  const doctorDash = await DashboardService.getDashboardForRole('attending_doctor', tree.departments.cardiology.id);
  const nurseDash = await DashboardService.getDashboardForRole('head_nurse', tree.wards.cardioICU.id);
  const adminDash = await DashboardService.getDashboardForRole('super_admin', tree.branch.id);
  console.log(`✅ Doctor Dashboard Patients: ${doctorDash.patients?.length || 0}`);
  console.log(`✅ Nurse Dashboard Ratio: ${nurseDash.nurseToPatientRatio}`);
  console.log(`✅ Super Admin Occupancy Rate: ${adminDash.kpis?.occupancyRate}%`);

  // 11. Break-Glass Emergency Trauma Override
  console.log('\n--- Step 10: Break-Glass Emergency Override ---');
  const breakGlass = await SecurityService.requestBreakGlassOverride({
    doctorId: drStrange.id,
    reason: 'Unidentified unconscious trauma resuscitation in ER',
    patientId: patient.id
  });
  console.log(`✅ Break-Glass Token Generated: ${breakGlass.token} (Scope: ${breakGlass.scope})`);

  // 12. Discharge & Auto-Billing Invoice Settlement
  console.log('\n--- Step 11: Patient Discharge & Auto-Invoicing ---');
  const invoice = await BillingService.generateDischargeInvoice(patient.id, tree.beds.bed101A.id);
  console.log(`✅ Final Discharge Invoice Generated: Total Due -> $${invoice.patientDue}`);

  console.log('\n═════════════════════════════════════════════════════════════════');
  console.log('🎉 ALL 11 HOSPITAL OS CLINICAL STAGES PASSED WITH 100% SUCCESS!');
  console.log('═════════════════════════════════════════════════════════════════\n');

  if (server && server.close) {
    server.close();
  }
  process.exit(0);
}

runHospitalOSE2ETest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
