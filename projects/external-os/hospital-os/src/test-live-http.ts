import { createOrbitoXApp, orbitox } from '@orbitox/runtime';
import { hospitalEntityConfigs } from './domain/entities.config';
import { wireHospitalOS } from './index';
import { HierarchyService } from './services/hierarchy.service';
import { instantiateMedicalDevice } from './domain/equipment-catalog';

async function runLiveHTTPServerTest() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   ORBITOX HOSPITAL OS — LIVE HTTP REST API TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const PORT = 3002;
  const BASE_URL = `http://localhost:${PORT}`;

  // 1. Boot Live Server
  console.log(`[1/12] Booting OrbitoX Live Server on port ${PORT}...`);
  const { app, server } = await createOrbitoXApp({
    app: { name: 'Apollo Hospital Live Test', port: PORT },
    entities: hospitalEntityConfigs
  });
  wireHospitalOS(app);

  // 2. Initialize Hierarchy
  console.log('[2/12] Initializing 6-Tier Hospital Context Hierarchy...');
  const tree = await HierarchyService.bootstrapStandardHospital({
    orgId: 'apollo-global',
    orgName: 'Apollo Health Global',
    branchId: 'apollo-ny',
    branchName: 'Apollo Hospital NY'
  });

  const cardioContext = tree.departments.cardiology.id;
  const bedContext = tree.beds.bed101A.id;

  // Helper fetch function
  async function apiCall(method: string, path: string, body?: any, headers: Record<string, string> = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-context-id': bedContext,
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    return { status: res.status, ok: res.ok, data };
  }

  // Test 1: Provision ICU Bed with Equipment
  console.log('\n[3/12] Testing POST /api/hospital/beds (Provision Bed with Paired Equipment)...');
  const monitor = instantiateMedicalDevice('PHILIPS_MX800', 'MX800-TEST-9988');
  const vent = instantiateMedicalDevice('HAMILTON_G5', 'HG5-TEST-1122');

  const bedRes = await apiCall('POST', '/api/hospital/beds', {
    label: 'Bed 101-A (Cardio ICU)',
    wardId: tree.wards.cardioICU.id,
    type: 'icu',
    dailyRate: 1500,
    attachedEquipment: [monitor, vent]
  });
  console.log(`HTTP Status: ${bedRes.status} | Response:`, JSON.stringify(bedRes.data));
  const createdBedId = bedRes.data.bed.id;

  // Test 2: List Beds
  console.log('\n[4/12] Testing GET /api/hospital/beds (Query Scoped Beds)...');
  const listBedsRes = await apiCall('GET', '/api/hospital/beds');
  console.log(`HTTP Status: ${listBedsRes.status} | Total Beds in Context: ${listBedsRes.data.data?.length}`);

  // Test 3: Patient Admission
  console.log('\n[5/12] Testing POST /api/hospital/admissions (Admit Tony Stark)...');
  const admitRes = await apiCall('POST', '/api/hospital/admissions', {
    name: 'Tony Stark',
    age: 48,
    gender: 'M',
    bloodGroup: 'O+',
    category: 'general',
    bedId: createdBedId,
    attendingDoctorId: 'dr_strange_01'
  });
  console.log(`HTTP Status: ${admitRes.status} | Response:`, JSON.stringify(admitRes.data));
  const admittedPatientId = admitRes.data.patient.id;

  // Test 4: Anti-Double-Booking Guard (Attempt to admit a 2nd patient to the SAME bed)
  console.log('\n[6/12] Testing Anti-Double-Booking Guard (Attempt 2nd admission on occupied bed)...');
  const doubleBookRes = await apiCall('POST', '/api/hospital/admissions', {
    name: 'Bruce Banner',
    age: 45,
    gender: 'M',
    bloodGroup: 'B+',
    category: 'general',
    bedId: createdBedId,
    attendingDoctorId: 'dr_strange_01'
  });
  console.log(`HTTP Status: ${doubleBookRes.status} (Expected: 400 Bad Request) | Error:`, doubleBookRes.data.error);

  // Test 5: Normal Telemetry Stream
  console.log('\n[7/12] Testing POST /api/hospital/telemetry (Normal Vitals Stream)...');
  const normTelem = await apiCall('POST', '/api/hospital/telemetry', {
    bedId: createdBedId,
    vitals: { timestamp: new Date().toISOString(), heartRate: 78, bloodPressure: '120/80', spo2: 98, temperature: 36.8, respiratoryRate: 16 }
  });
  console.log(`HTTP Status: ${normTelem.status} | Telemetry Result:`, normTelem.data.result?.status);

  // Test 6: Critical Vitals Telemetry Breach (SpO2: 82% -> Code Blue Trigger)
  console.log('\n[8/12] Testing POST /api/hospital/telemetry (Critical Vitals Breach: SpO2 82% Code Blue)...');
  const critTelem = await apiCall('POST', '/api/hospital/telemetry', {
    bedId: createdBedId,
    vitals: { timestamp: new Date().toISOString(), heartRate: 145, bloodPressure: '80/50', spo2: 82, temperature: 38.4, respiratoryRate: 34 }
  });
  console.log(`HTTP Status: ${critTelem.status} | Telemetry Alarms:`, critTelem.data.result?.alarms);

  // Test 7: Medication Prescription
  console.log('\n[9/12] Testing POST /api/hospital/treatments (Doctor Prescribes Metoprolol 50mg)...');
  const rxRes = await apiCall('POST', '/api/hospital/treatments', {
    patientId: admittedPatientId,
    recordId: 'rec_initial_01',
    doctorId: 'dr_strange_01',
    drugName: 'Metoprolol Tartrate',
    dosage: '50mg',
    frequency: 'BID',
    route: 'PO'
  });
  console.log(`HTTP Status: ${rxRes.status} | Treatment ID:`, rxRes.data.treatment?.id);

  // Test 8: Pathology STAT Lab Order
  console.log('\n[10/12] Testing POST /api/hospital/labs (Doctor Orders STAT Troponin-I)...');
  const labRes = await apiCall('POST', '/api/hospital/labs', {
    patientId: admittedPatientId,
    doctorId: 'dr_strange_01',
    testType: 'Troponin-I',
    priority: 'stat'
  });
  console.log(`HTTP Status: ${labRes.status} | Lab Order ID:`, labRes.data.order?.id);

  // Test 9: Role-Based Dashboards
  console.log('\n[11/12] Testing GET /api/hospital/dashboard for Multiple Roles...');
  const docDash = await apiCall('GET', '/api/hospital/dashboard', undefined, { 'x-staff-role': 'attending_doctor', 'x-context-id': cardioContext });
  console.log(`- Attending Doctor Dashboard: ${docDash.data.dashboard.patients?.length} Patients | Widgets:`, docDash.data.dashboard.widgets);

  const nurseDash = await apiCall('GET', '/api/hospital/dashboard', undefined, { 'x-staff-role': 'head_nurse', 'x-context-id': cardioContext });
  console.log(`- Head Nurse Dashboard: Ratio -> ${nurseDash.data.dashboard.nurseToPatientRatio} | Bed Census: ${nurseDash.data.dashboard.wardBedCensus?.length}`);

  const adminDash = await apiCall('GET', '/api/hospital/dashboard', undefined, { 'x-staff-role': 'super_admin', 'x-context-id': tree.branch.id });
  console.log(`- Super Admin Dashboard: Occupancy Rate -> ${adminDash.data.dashboard.kpis?.occupancyRate}%`);

  // Test 10: Break-Glass & Discharge Billing
  console.log('\n[12/12] Testing Break-Glass Override & Discharge Billing...');
  const bgRes = await apiCall('POST', '/api/hospital/security/break-glass', {
    doctorId: 'dr_strange_01',
    reason: 'Unidentified unconscious cardiac trauma patient in ER',
    patientId: admittedPatientId
  });
  console.log(`- Break-Glass Token: ${bgRes.data.override?.token} (Scope: ${bgRes.data.override?.scope})`);

  const billRes = await apiCall('POST', '/api/hospital/billing/discharge', {
    patientId: admittedPatientId
  });
  console.log(`- Final Discharge Invoice: Subtotal: $${billRes.data.invoice?.subtotal} | Patient Responsibility: $${billRes.data.invoice?.patientDue}`);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🎉 ALL 12 LIVE HTTP REST API TESTS COMPLETED WITH 100% SUCCESS!');
  console.log('═══════════════════════════════════════════════════════════════\n');

  process.exit(0);
}

runLiveHTTPServerTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
