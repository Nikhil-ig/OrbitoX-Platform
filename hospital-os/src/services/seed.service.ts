import { orbitox } from '@orbitox/runtime';
import { HierarchyService } from './hierarchy.service';
import { StaffService } from './staff.service';

export class HospitalSeedService {
  static async seedComprehensiveHospitalData(clearExisting: boolean = true, existingTree?: any): Promise<{
    bedsCount: number;
    patientsCount: number;
    treatmentsCount: number;
    labsCount: number;
    invoicesCount: number;
    appointmentsCount: number;
  }> {
    console.log(`🧹 [SeedService] Starting ${clearExisting ? 'CLEAN & RE-SEED' : 'SEED'} of enterprise hospital database...`);

    // 1. If clearExisting, remove existing entities
    if (clearExisting) {
      const entitiesToClear = ['bed', 'patient', 'treatment', 'lab_order', 'invoice', 'appointment'];
      for (const ent of entitiesToClear) {
        try {
          const existing = await orbitox.db.findMany(ent as any);
          for (const item of existing.data) {
            try {
              await orbitox.db.delete(ent as any, item.id, item.contextId || 'default-context');
            } catch {}
          }
        } catch (err) {
          console.warn(`[SeedService] Warning clearing ${ent}:`, err);
        }
      }
    }

    // 2. Ensure Hierarchy and Staff exist
    let tree = existingTree || HierarchyService.getTree();
    if (!tree) {
      try {
        tree = await HierarchyService.bootstrapStandardHospital({
          orgId: 'apollo-global',
          orgName: 'Apollo Health Global',
          branchId: 'apollo-ny',
          branchName: 'Apollo Hospital New York'
        });
      } catch {
        tree = HierarchyService.getTree();
      }
    }

    await StaffService.seedInitialStaff();

    const cardioICUId = tree?.wards?.cardioICU?.id || 'ward_cardio_icu';
    const room101Id = tree?.rooms?.room101?.id || 'room_101';
    const emergencyId = tree?.departments?.emergency?.id || 'dept_emergency';
    const generalMedId = tree?.departments?.cardiology?.id || 'dept_cardiology';
    const neurologyId = tree?.departments?.neurology?.id || 'dept_neurology';

    // 3. SEED REALISTIC BED STATIONS ACROSS WARDS (10 Beds)
    const beds = [
      {
        id: 'bed-101-a',
        label: 'Bed 101-A (Cardiac ICU)',
        wardId: cardioICUId,
        roomId: room101Id,
        type: 'icu',
        status: 'occupied',
        isTemporary: false,
        dailyRate: 1500,
        attachedEquipment: [
          { deviceId: 'dev_philips_01', deviceType: 'multi_para_vitals_monitor', manufacturer: 'Philips', model: 'IntelliVue MX800', status: 'online' },
          { deviceId: 'dev_hamilton_01', deviceType: 'mechanical_ventilator', manufacturer: 'Hamilton Medical', model: 'Hamilton-G5', status: 'online' }
        ]
      },
      {
        id: 'bed-101-b',
        label: 'Bed 101-B (Cardiac ICU)',
        wardId: cardioICUId,
        roomId: room101Id,
        type: 'icu',
        status: 'occupied',
        isTemporary: false,
        dailyRate: 1500,
        attachedEquipment: [
          { deviceId: 'dev_ge_01', deviceType: 'multi_para_vitals_monitor', manufacturer: 'GE Healthcare', model: 'CARESCAPE B650', status: 'online' },
          { deviceId: 'dev_alaris_01', deviceType: 'iv_infusion_pump', manufacturer: 'BD Alaris', model: 'System 8015', status: 'online' }
        ]
      },
      {
        id: 'bed-er-01',
        label: 'Trauma Bay 01 (Emergency)',
        wardId: emergencyId,
        type: 'emergency_trauma_bay',
        status: 'occupied',
        isTemporary: false,
        dailyRate: 850,
        attachedEquipment: [
          { deviceId: 'dev_zoll_01', deviceType: 'defibrillator_crash_cart', manufacturer: 'ZOLL Medical', model: 'R Series Plus', status: 'online' },
          { deviceId: 'dev_mindray_01', deviceType: 'patient_monitor', manufacturer: 'Mindray', model: 'BeneVision N22', status: 'online' }
        ]
      },
      {
        id: 'bed-er-02',
        label: 'Trauma Bay 02 (Emergency Resuscitation)',
        wardId: emergencyId,
        type: 'emergency_trauma_bay',
        status: 'available',
        isTemporary: false,
        dailyRate: 850,
        attachedEquipment: [
          { deviceId: 'dev_zoll_02', deviceType: 'defibrillator_crash_cart', manufacturer: 'ZOLL Medical', model: 'R Series Plus', status: 'online' }
        ]
      },
      {
        id: 'bed-201-a',
        label: 'Bed 201-A (Neuro Step-Down)',
        wardId: neurologyId,
        type: 'general',
        status: 'occupied',
        isTemporary: false,
        dailyRate: 750,
        attachedEquipment: [
          { deviceId: 'dev_welch_01', deviceType: 'spot_vitals_monitor', manufacturer: 'Welch Allyn', model: 'Connex Spot Monitor', status: 'online' }
        ]
      },
      {
        id: 'bed-201-b',
        label: 'Bed 201-B (Neuro Step-Down)',
        wardId: neurologyId,
        type: 'general',
        status: 'occupied',
        isTemporary: false,
        dailyRate: 750,
        attachedEquipment: [
          { deviceId: 'dev_welch_02', deviceType: 'spot_vitals_monitor', manufacturer: 'Welch Allyn', model: 'Connex Spot Monitor', status: 'online' }
        ]
      },
      {
        id: 'bed-301-a',
        label: 'Bed 301-A (General Medicine Ward)',
        wardId: generalMedId,
        type: 'general',
        status: 'occupied',
        isTemporary: false,
        dailyRate: 500,
        attachedEquipment: [
          { deviceId: 'dev_masimo_02', deviceType: 'pulse_oximeter', manufacturer: 'Masimo', model: 'Rad-97', status: 'online' }
        ]
      },
      {
        id: 'bed-301-b',
        label: 'Bed 301-B (General Medicine Ward)',
        wardId: generalMedId,
        type: 'general',
        status: 'available',
        isTemporary: false,
        dailyRate: 500,
        attachedEquipment: [
          { deviceId: 'dev_masimo_03', deviceType: 'pulse_oximeter', manufacturer: 'Masimo', model: 'Rad-97', status: 'online' }
        ]
      },
      {
        id: 'bed-401-iso',
        label: 'Isolation Station 401 (Negative Pressure)',
        wardId: emergencyId,
        type: 'isolation',
        status: 'sanitizing',
        isTemporary: false,
        dailyRate: 1100,
        attachedEquipment: [
          { deviceId: 'dev_hepa_01', deviceType: 'hepa_filtration_monitor', manufacturer: 'Camfil', model: 'CleanZone HEPA', status: 'online' }
        ]
      },
      {
        id: 'bed-surge-01',
        label: 'Surge Station T-01 (Overflow)',
        wardId: emergencyId,
        type: 'temporary_surge',
        status: 'available',
        isTemporary: true,
        dailyRate: 450,
        attachedEquipment: [
          { deviceId: 'dev_masimo_01', deviceType: 'pulse_oximeter', manufacturer: 'Masimo', model: 'Rad-97', status: 'online' }
        ]
      }
    ];

    for (const b of beds) {
      await orbitox.db.create<any>('bed', b, b.wardId);
    }

    // 4. SEED REALISTIC PATIENT EHR PROFILES ACROSS CLINICAL ROLES (10 Patients)
    const now = Date.now();
    const patients = [
      // 1. Tony Stark (Cardiology Inpatient)
      {
        id: 'pat-tony-01',
        name: 'Tony Stark',
        age: 48,
        gender: 'M',
        bloodGroup: 'O+',
        category: 'general',
        bedId: 'bed-101-a',
        status: 'admitted',
        diagnosis: 'Acute Anterior STEMI (Myocardial Infarction)',
        attendingDoctorId: 'dr_strange_01',
        phone: '+1 (212) 555-0199',
        email: 'tony.stark@starkindustries.com',
        allergies: ['Penicillin', 'Sulfa Drugs'],
        insurance: { provider: 'Stark Global Health Plan', policyNumber: 'STK-CORP-9001' },
        emergencyContact: { name: 'Pepper Potts', phone: '+1 (212) 555-0100', relation: 'Spouse' },
        vitals: { hr: 82, bp: '130/84', spo2: 98, temp: 37.1, resp: 16 },
        admittedAt: new Date(now - 3600000 * 48).toISOString(),
        registeredAt: new Date(now - 3600000 * 72).toISOString()
      },
      // 2. Steve Rogers (Cardio-Pulmonary Inpatient)
      {
        id: 'pat-steve-02',
        name: 'Steve Rogers',
        age: 36,
        gender: 'M',
        bloodGroup: 'A+',
        category: 'general',
        bedId: 'bed-101-b',
        status: 'admitted',
        diagnosis: 'Acute Pulmonary Edema & Congestive Heart Failure',
        attendingDoctorId: 'dr_strange_01',
        phone: '+1 (718) 555-0144',
        email: 'steve.rogers@avengers.org',
        allergies: ['No Known Drug Allergies (NKDA)'],
        insurance: { provider: 'Blue Cross Blue Shield', policyNumber: 'BCBS-882104' },
        emergencyContact: { name: 'Sam Wilson', phone: '+1 (718) 555-0177', relation: 'Colleague' },
        vitals: { hr: 94, bp: '142/90', spo2: 94, temp: 36.8, resp: 22 },
        admittedAt: new Date(now - 3600000 * 24).toISOString(),
        registeredAt: new Date(now - 3600000 * 30).toISOString()
      },
      // 3. Natasha Romanoff (Trauma ER Inpatient)
      {
        id: 'pat-natasha-03',
        name: 'Natasha Romanoff',
        age: 32,
        gender: 'F',
        bloodGroup: 'B+',
        category: 'trauma',
        bedId: 'bed-er-01',
        status: 'admitted',
        diagnosis: 'C2-C3 Vertebral Contusion & Cerebral Concussion',
        attendingDoctorId: 'dr_ashlynn_01',
        phone: '+1 (347) 555-0188',
        email: 'n.romanoff@shield.gov',
        allergies: ['Latex', 'Codeine'],
        insurance: { provider: 'UnitedHealthcare Global', policyNumber: 'UHC-992100' },
        emergencyContact: { name: 'Clint Barton', phone: '+1 (347) 555-0199', relation: 'Family' },
        vitals: { hr: 74, bp: '118/75', spo2: 99, temp: 36.9, resp: 14 },
        admittedAt: new Date(now - 3600000 * 12).toISOString(),
        registeredAt: new Date(now - 3600000 * 16).toISOString()
      },
      // 4. Wanda Maximoff (Neuro Inpatient)
      {
        id: 'pat-wanda-04',
        name: 'Wanda Maximoff',
        age: 29,
        gender: 'F',
        bloodGroup: 'AB-',
        category: 'general',
        bedId: 'bed-201-a',
        status: 'admitted',
        diagnosis: 'Post-Cranial Neuralgia & Vasovagal Syncope',
        attendingDoctorId: 'dr_house_01',
        phone: '+1 (201) 555-0122',
        email: 'wanda.maximoff@orbitox.health',
        allergies: ['Aspirin (Bronchospasm Risk)'],
        insurance: { provider: 'Aetna Signature Health', policyNumber: 'AET-443201' },
        emergencyContact: { name: 'Vision Synthezoid', phone: '+1 (201) 555-0133', relation: 'Partner' },
        vitals: { hr: 68, bp: '112/70', spo2: 99, temp: 37.0, resp: 15 },
        admittedAt: new Date(now - 3600000 * 36).toISOString(),
        registeredAt: new Date(now - 3600000 * 40).toISOString()
      },
      // 5. Thor Odinson (Cardiothoracic Post-Op Inpatient)
      {
        id: 'pat-thor-05',
        name: 'Thor Odinson',
        age: 42,
        gender: 'M',
        bloodGroup: 'O+',
        category: 'general',
        bedId: 'bed-201-b',
        status: 'admitted',
        diagnosis: 'Post-Op Thoracotomy & Sternal Wire Stabilization',
        attendingDoctorId: 'dr_grey_01',
        phone: '+1 (917) 555-0111',
        email: 'thor@asgard.realm',
        allergies: ['No Known Drug Allergies (NKDA)'],
        insurance: { provider: 'Cigna Comprehensive', policyNumber: 'CIG-773210' },
        emergencyContact: { name: 'Jane Foster', phone: '+1 (917) 555-0122', relation: 'Spouse' },
        vitals: { hr: 88, bp: '135/82', spo2: 97, temp: 37.4, resp: 18 },
        admittedAt: new Date(now - 3600000 * 60).toISOString(),
        registeredAt: new Date(now - 3600000 * 70).toISOString()
      },
      // 6. Peter Parker (Pediatric / General Inpatient)
      {
        id: 'pat-peter-06',
        name: 'Peter Parker',
        age: 21,
        gender: 'M',
        bloodGroup: 'O+',
        category: 'pediatric',
        bedId: 'bed-301-a',
        status: 'admitted',
        diagnosis: 'Acute Viral Bronchitis & Reactive Airway Wheezing',
        attendingDoctorId: 'dr_strange_01',
        phone: '+1 (718) 555-0199',
        email: 'peter.parker@dailybugle.com',
        allergies: ['Peanuts'],
        insurance: { provider: 'Empire BlueCross Medicaid', policyNumber: 'MED-110293' },
        emergencyContact: { name: 'May Parker', phone: '+1 (718) 555-0101', relation: 'Guardian' },
        vitals: { hr: 78, bp: '120/78', spo2: 98, temp: 37.2, resp: 16 },
        admittedAt: new Date(now - 3600000 * 8).toISOString(),
        registeredAt: new Date(now - 3600000 * 10).toISOString()
      },
      // 7. Carol Danvers (Triage High-Acuity Evaluation)
      {
        id: 'pat-carol-07',
        name: 'Carol Danvers',
        age: 34,
        gender: 'F',
        bloodGroup: 'O-',
        category: 'trauma',
        status: 'triage',
        triageLevel: 2,
        diagnosis: 'Severe Hypobaric Decompression & Hyperlactatemia',
        attendingDoctorId: 'dr_house_01',
        phone: '+1 (310) 555-0155',
        email: 'carol.danvers@usaf.mil',
        allergies: ['NKDA'],
        insurance: { provider: 'Tricare Military Prime', policyNumber: 'TRI-883201' },
        emergencyContact: { name: 'Maria Rambeau', phone: '+1 (310) 555-0166', relation: 'Friend' },
        registeredAt: new Date(now - 3600000 * 2).toISOString()
      },
      // 8. Bruce Banner (Pre-Registered Consultation)
      {
        id: 'pat-bruce-08',
        name: 'Bruce Banner',
        age: 45,
        gender: 'M',
        bloodGroup: 'B-',
        category: 'general',
        status: 'pre_registered',
        diagnosis: 'Gamma Radiation Biomarker & Endocrine Intake',
        attendingDoctorId: 'dr_strange_01',
        phone: '+1 (212) 555-0177',
        email: 'bruce.banner@culver.edu',
        allergies: ['Sedatives (Paradoxical Reaction)'],
        insurance: { provider: 'Stark Corporate Health', policyNumber: 'STK-SCI-4002' },
        registeredAt: new Date(now - 3600000 * 1).toISOString()
      },
      // 9. Jennifer Walters (Outpatient Clinic)
      {
        id: 'pat-jen-09',
        name: 'Jennifer Walters',
        age: 31,
        gender: 'F',
        bloodGroup: 'A-',
        category: 'general',
        status: 'outpatient',
        diagnosis: 'Orthopedic Left ACL Reconstruction Review',
        attendingDoctorId: 'dr_watson_01',
        phone: '+1 (310) 555-0188',
        email: 'jen.walters@glk-law.com',
        allergies: ['NKDA'],
        insurance: { provider: 'MetLife Legal & Health', policyNumber: 'MET-554109' },
        registeredAt: new Date(now - 3600000 * 18).toISOString()
      },
      // 10. Bucky Barnes (Discharged Inpatient)
      {
        id: 'pat-bucky-10',
        name: 'Bucky Barnes',
        age: 38,
        gender: 'M',
        bloodGroup: 'AB+',
        category: 'general',
        status: 'discharged',
        diagnosis: 'Prosthetic Neural Interface Integration (Cleared)',
        attendingDoctorId: 'dr_ashlynn_01',
        phone: '+1 (718) 555-0133',
        email: 'james.barnes@veterans.gov',
        allergies: ['NKDA'],
        insurance: { provider: 'Veterans Affairs Choice', policyNumber: 'VA-900213' },
        registeredAt: new Date(now - 3600000 * 96).toISOString(),
        admittedAt: new Date(now - 3600000 * 90).toISOString(),
        dischargedAt: new Date(now - 3600000 * 12).toISOString()
      }
    ];

    for (const p of patients) {
      await orbitox.db.create<any>('patient', p, p.bedId ? cardioICUId : emergencyId);
    }

    // 5. SEED eMAR PRESCRIPTIONS (Ordered, Dispensed, Administered for Pharmacist & Nurse testing)
    const treatments = [
      // 1. Metoprolol Tartrate (Ordered -> Pharmacist can verify and dispense)
      {
        id: 'rx-001',
        recordId: 'rec_01',
        patientId: 'pat-tony-01',
        prescribedByDoctorId: 'dr_strange_01',
        type: 'medication',
        procedureOrDrug: 'Metoprolol Tartrate',
        dosage: '50mg',
        frequency: 'BID (Twice Daily)',
        route: 'Oral (PO)',
        status: 'ordered',
        createdAt: new Date(now - 3600000 * 4).toISOString()
      },
      // 2. Furosemide STAT (Dispensed -> Nurse can 2-step BCMA administer)
      {
        id: 'rx-002',
        recordId: 'rec_02',
        patientId: 'pat-steve-02',
        prescribedByDoctorId: 'dr_strange_01',
        type: 'medication',
        procedureOrDrug: 'Furosemide',
        dosage: '40mg',
        frequency: 'STAT (Immediate)',
        route: 'IV Push',
        status: 'dispensed',
        dispensedBy: 'Peter Parker, PharmD',
        dispensedAt: new Date(now - 3600000 * 1).toISOString(),
        createdAt: new Date(now - 3600000 * 3).toISOString()
      },
      // 3. Ceftriaxone Sodium (Administered -> Fully logged)
      {
        id: 'rx-003',
        recordId: 'rec_03',
        patientId: 'pat-natasha-03',
        prescribedByDoctorId: 'dr_ashlynn_01',
        type: 'medication',
        procedureOrDrug: 'Ceftriaxone Sodium',
        dosage: '1g in 100ml NS',
        frequency: 'Q24H (Daily)',
        route: 'IV Piggyback',
        status: 'administered',
        dispensedBy: 'Peter Parker, PharmD',
        administeredBy: 'Nurse Wanda Maximoff, RN',
        administeredAt: new Date(now - 3600000 * 2).toISOString(),
        createdAt: new Date(now - 3600000 * 8).toISOString()
      },
      // 4. Enoxaparin / Lovenox (Ordered -> Pharmacist can verify)
      {
        id: 'rx-004',
        recordId: 'rec_04',
        patientId: 'pat-thor-05',
        prescribedByDoctorId: 'dr_grey_01',
        type: 'medication',
        procedureOrDrug: 'Enoxaparin Sodium (Lovenox)',
        dosage: '40mg / 0.4mL',
        frequency: 'Daily (09:00 AM)',
        route: 'Subcutaneous (SubQ)',
        status: 'ordered',
        createdAt: new Date(now - 3600000 * 5).toISOString()
      },
      // 5. Ondansetron (Dispensed -> Nurse can administer)
      {
        id: 'rx-005',
        recordId: 'rec_05',
        patientId: 'pat-wanda-04',
        prescribedByDoctorId: 'dr_house_01',
        type: 'medication',
        procedureOrDrug: 'Ondansetron (Zofran)',
        dosage: '4mg',
        frequency: 'Q8H PRN (Nausea)',
        route: 'IV Push',
        status: 'dispensed',
        dispensedBy: 'Pepper Potts, PharmD',
        dispensedAt: new Date(now - 3600000 * 2).toISOString(),
        createdAt: new Date(now - 3600000 * 6).toISOString()
      },
      // 6. Albuterol Inhaler (Ordered -> Pharmacist verify)
      {
        id: 'rx-006',
        recordId: 'rec_06',
        patientId: 'pat-peter-06',
        prescribedByDoctorId: 'dr_strange_01',
        type: 'medication',
        procedureOrDrug: 'Albuterol Sulfate Inhaler',
        dosage: '90mcg (2 Puffs)',
        frequency: 'Q4H PRN (Wheezing)',
        route: 'Inhalation (MDI)',
        status: 'ordered',
        createdAt: new Date(now - 3600000 * 1).toISOString()
      },
      // 7. Morphine Sulfate (Dispensed -> Controlled Substance schedule II)
      {
        id: 'rx-007',
        recordId: 'rec_07',
        patientId: 'pat-natasha-03',
        prescribedByDoctorId: 'dr_ashlynn_01',
        type: 'medication',
        procedureOrDrug: 'Morphine Sulfate (Schedule II)',
        dosage: '4mg',
        frequency: 'Q4H PRN (Severe Pain)',
        route: 'IV Push Slow',
        status: 'dispensed',
        dispensedBy: 'Peter Parker, PharmD',
        dispensedAt: new Date(now - 3600000 * 1).toISOString(),
        createdAt: new Date(now - 3600000 * 4).toISOString()
      }
    ];

    for (const t of treatments) {
      await orbitox.db.create<any>('treatment', t, cardioICUId);
    }

    // 6. SEED DIAGNOSTIC LAB ORDERS (For Lab Tech & Doctor testing)
    const labs = [
      // 1. STAT Critical Troponin for Tony Stark
      {
        id: 'lab-001',
        patientId: 'pat-tony-01',
        patientName: 'Tony Stark',
        orderedByDoctorId: 'dr_strange_01',
        doctorName: 'Dr. Stephen Strange',
        testType: 'Troponin-I (STAT)',
        priority: 'stat',
        status: 'completed',
        isCriticalValue: true,
        numericValue: 1.45,
        referenceRange: '0 - 0.04 ng/mL',
        resultSummary: '🚨 CRITICAL HIGH: 1.45 ng/mL (Reference: 0 - 0.04 ng/mL). Acute myocardial injury confirmed. STAT Pager Dispatched.',
        specimenTube: 'Gold Top (SST Serum)',
        orderedAt: new Date(now - 3600000 * 3).toISOString(),
        reportedAt: new Date(now - 3600000 * 2).toISOString()
      },
      // 2. Potassium Serum for Steve Rogers
      {
        id: 'lab-002',
        patientId: 'pat-steve-02',
        patientName: 'Steve Rogers',
        orderedByDoctorId: 'dr_strange_01',
        doctorName: 'Dr. Stephen Strange',
        testType: 'Potassium (Serum)',
        priority: 'urgent',
        status: 'in_analyzer',
        isCriticalValue: false,
        numericValue: 4.2,
        referenceRange: '3.5 - 5.0 mEq/L',
        resultSummary: 'Specimen in automated chemistry analyzer (Roche Cobas 8000).',
        specimenTube: 'Gold Top (SST Serum)',
        orderedAt: new Date(now - 3600000 * 1).toISOString()
      },
      // 3. Complete Blood Count for Natasha Romanoff
      {
        id: 'lab-003',
        patientId: 'pat-natasha-03',
        patientName: 'Natasha Romanoff',
        orderedByDoctorId: 'dr_ashlynn_01',
        doctorName: 'Dr. Ashlynn Carder',
        testType: 'Complete Blood Count (CBC)',
        priority: 'routine',
        status: 'completed',
        isCriticalValue: false,
        numericValue: 14.8,
        referenceRange: '4.5 - 11.0 k/uL',
        resultSummary: 'WBC: 14.8 k/uL (Mild Leukocytosis), Hgb: 11.2 g/dL, Platelets: 284 k/uL (Normal).',
        specimenTube: 'Lavender Top (K2 EDTA)',
        orderedAt: new Date(now - 3600000 * 8).toISOString(),
        reportedAt: new Date(now - 3600000 * 6).toISOString()
      },
      // 4. Comprehensive Metabolic Panel for Wanda Maximoff
      {
        id: 'lab-004',
        patientId: 'pat-wanda-04',
        patientName: 'Wanda Maximoff',
        orderedByDoctorId: 'dr_house_01',
        doctorName: 'Dr. Gregory House',
        testType: 'Sodium (Serum)',
        priority: 'routine',
        status: 'completed',
        isCriticalValue: false,
        numericValue: 139,
        referenceRange: '135 - 145 mEq/L',
        resultSummary: 'Electrolytes within normal reference limits. Na: 139 mEq/L, K: 4.1 mEq/L, Cl: 101 mEq/L.',
        specimenTube: 'Gold Top (SST Serum)',
        orderedAt: new Date(now - 3600000 * 12).toISOString(),
        reportedAt: new Date(now - 3600000 * 10).toISOString()
      },
      // 5. Arterial Blood Gas for Thor Odinson
      {
        id: 'lab-005',
        patientId: 'pat-thor-05',
        patientName: 'Thor Odinson',
        orderedByDoctorId: 'dr_grey_01',
        doctorName: 'Dr. Meredith Grey',
        testType: 'Arterial Blood Gas (pH)',
        priority: 'urgent',
        status: 'ordered',
        isCriticalValue: false,
        resultSummary: 'Phlebotomy specimen collection pending.',
        specimenTube: 'Green Top (Lithium Heparin Syringe on Ice)',
        orderedAt: new Date(now - 3600000 * 2).toISOString()
      },
      // 6. Serum Lactate for Carol Danvers
      {
        id: 'lab-006',
        patientId: 'pat-carol-07',
        patientName: 'Carol Danvers',
        orderedByDoctorId: 'dr_house_01',
        doctorName: 'Dr. Gregory House',
        testType: 'Serum Lactate (Sepsis)',
        priority: 'stat',
        status: 'ordered',
        isCriticalValue: false,
        resultSummary: 'STAT order dispatched to phlebotomist.',
        specimenTube: 'Gray Top (Sodium Fluoride / Potassium Oxalate)',
        orderedAt: new Date(now - 3600000 * 1).toISOString()
      },
      // 7. Serum Creatinine for Peter Parker
      {
        id: 'lab-007',
        patientId: 'pat-peter-06',
        patientName: 'Peter Parker',
        orderedByDoctorId: 'dr_strange_01',
        doctorName: 'Dr. Stephen Strange',
        testType: 'Serum Creatinine (Renal)',
        priority: 'routine',
        status: 'completed',
        isCriticalValue: false,
        numericValue: 0.9,
        referenceRange: '0.6 - 1.2 mg/dL',
        resultSummary: 'Renal function normal. Serum Creatinine: 0.9 mg/dL, eGFR > 90 mL/min/1.73m2.',
        specimenTube: 'Gold Top (SST Serum)',
        orderedAt: new Date(now - 3600000 * 6).toISOString(),
        reportedAt: new Date(now - 3600000 * 5).toISOString()
      }
    ];

    for (const l of labs) {
      await orbitox.db.create<any>('lab_order', l, cardioICUId);
    }

    // 7. SEED ITEMIZED INPATIENT SUPERBILLS & INVOICES (For Billing Officer testing)
    const invoices = [
      // 1. Tony Stark - High Complexity Superbill (Unpaid -> Test Settlement)
      {
        id: 'inv-001',
        patientId: 'pat-tony-01',
        patientName: 'Tony Stark',
        subtotal: 3645,
        taxAmount: 323,
        insuranceCoverage: 2800,
        patientDue: 1168,
        status: 'unpaid',
        insuranceProvider: 'Stark Global Health Plan',
        policyNumber: 'STK-CORP-9001',
        preAuthStatus: 'APPROVED',
        issuedAt: new Date(now - 3600000 * 24).toISOString(),
        lineItems: [
          { description: 'Bed 101-A (Cardiac ICU) — 2 Days ($1500/day)', category: 'bed_charge', quantity: 2, unitCost: 1500, totalCost: 3000 },
          { description: 'CPT 99223 Inpatient Consult (Attending MD High Complexity)', category: 'consultation', quantity: 1, unitCost: 350, totalCost: 350 },
          { description: 'Lab: Troponin-I (STAT Cardiac Panel)', category: 'lab_test', quantity: 1, unitCost: 120, totalCost: 120 },
          { description: 'Rx: Metoprolol Tartrate 50mg PO BID (3-Day Supply)', category: 'medication', quantity: 6, unitCost: 25, totalCost: 150 },
          { description: 'Telemetry Continuous ECG 12-Lead Rhythm Strip Analysis', category: 'telemetry', quantity: 1, unitCost: 25, totalCost: 25 }
        ]
      },
      // 2. Steve Rogers - Congestive Heart Failure Superbill (Unpaid)
      {
        id: 'inv-002',
        patientId: 'pat-steve-02',
        patientName: 'Steve Rogers',
        subtotal: 2250,
        taxAmount: 199,
        insuranceCoverage: 1830,
        patientDue: 619,
        status: 'unpaid',
        insuranceProvider: 'Blue Cross Blue Shield',
        policyNumber: 'BCBS-882104',
        preAuthStatus: 'APPROVED',
        issuedAt: new Date(now - 3600000 * 18).toISOString(),
        lineItems: [
          { description: 'Bed 101-B (Cardiac ICU) — 1 Day ($1500/day)', category: 'bed_charge', quantity: 1, unitCost: 1500, totalCost: 1500 },
          { description: 'CPT 99222 Inpatient Initial Care Moderate Complexity', category: 'consultation', quantity: 1, unitCost: 280, totalCost: 280 },
          { description: 'Rx: Furosemide 40mg IV Push STAT Push Rate', category: 'medication', quantity: 2, unitCost: 65, totalCost: 130 },
          { description: 'Lab: Potassium Serum + Arterial Blood Gas', category: 'lab_test', quantity: 2, unitCost: 95, totalCost: 190 },
          { description: 'Continuous Oxygen Cannula Therapy (2L/min)', category: 'respiratory', quantity: 1, unitCost: 150, totalCost: 150 }
        ]
      },
      // 3. Natasha Romanoff - Emergency Trauma (Paid / Settled)
      {
        id: 'inv-003',
        patientId: 'pat-natasha-03',
        patientName: 'Natasha Romanoff',
        subtotal: 1850,
        taxAmount: 164,
        insuranceCoverage: 1850,
        patientDue: 0,
        status: 'paid',
        insuranceProvider: 'UnitedHealthcare Global',
        policyNumber: 'UHC-992100',
        preAuthStatus: 'APPROVED',
        paidAt: new Date(now - 3600000 * 4).toISOString(),
        paymentMethod: 'corporate_insurance_eft',
        issuedAt: new Date(now - 3600000 * 10).toISOString(),
        lineItems: [
          { description: 'Trauma Bay 01 (Emergency Level 1 Facility Fee)', category: 'bed_charge', quantity: 1, unitCost: 850, totalCost: 850 },
          { description: 'Emergency Spine CT Immobilization Protocol', category: 'radiology', quantity: 1, unitCost: 650, totalCost: 650 },
          { description: 'Rx: Ceftriaxone 1g IV Piggyback Infusion', category: 'medication', quantity: 1, unitCost: 140, totalCost: 140 },
          { description: 'Lab: Complete Blood Count (CBC)', category: 'lab_test', quantity: 1, unitCost: 85, totalCost: 85 },
          { description: 'Crash Cart Defibrillator ZOLL Readiness Fee', category: 'equipment', quantity: 1, unitCost: 125, totalCost: 125 }
        ]
      },
      // 4. Wanda Maximoff - Neuro Step-Down Superbill (Unpaid)
      {
        id: 'inv-004',
        patientId: 'pat-wanda-04',
        patientName: 'Wanda Maximoff',
        subtotal: 2100,
        taxAmount: 186,
        insuranceCoverage: 1750,
        patientDue: 536,
        status: 'unpaid',
        insuranceProvider: 'Aetna Signature Health',
        policyNumber: 'AET-443201',
        preAuthStatus: 'APPROVED',
        issuedAt: new Date(now - 3600000 * 30).toISOString(),
        lineItems: [
          { description: 'Bed 201-A (Neuro Step-Down) — 2 Days ($750/day)', category: 'bed_charge', quantity: 2, unitCost: 750, totalCost: 1500 },
          { description: 'Neurology Consultation & Reflex EMG', category: 'consultation', quantity: 1, unitCost: 350, totalCost: 350 },
          { description: 'Lab: Sodium Serum & Electrolytes Panel', category: 'lab_test', quantity: 1, unitCost: 85, totalCost: 85 },
          { description: 'Rx: Ondansetron 4mg IV + Topiramate 25mg', category: 'medication', quantity: 2, unitCost: 82.5, totalCost: 165 }
        ]
      },
      // 5. Thor Odinson - Cardiothoracic Post-Op (Unpaid)
      {
        id: 'inv-005',
        patientId: 'pat-thor-05',
        patientName: 'Thor Odinson',
        subtotal: 4200,
        taxAmount: 372,
        insuranceCoverage: 3600,
        patientDue: 972,
        status: 'unpaid',
        insuranceProvider: 'Cigna Comprehensive',
        policyNumber: 'CIG-773210',
        preAuthStatus: 'APPROVED',
        issuedAt: new Date(now - 3600000 * 50).toISOString(),
        lineItems: [
          { description: 'Bed 201-B (Neuro Step-Down) — 4 Days ($750/day)', category: 'bed_charge', quantity: 4, unitCost: 750, totalCost: 3000 },
          { description: 'Cardiothoracic Surgery Post-Op Wound Debridement & Dressing', category: 'procedure', quantity: 1, unitCost: 750, totalCost: 750 },
          { description: 'Rx: Cefazolin 2g IV Q8H + Lovenox 40mg SubQ', category: 'medication', quantity: 4, unitCost: 75, totalCost: 300 },
          { description: 'Lab: Arterial Blood Gas (ABG)', category: 'lab_test', quantity: 1, unitCost: 150, totalCost: 150 }
        ]
      },
      // 6. Peter Parker - General Med Bronchitis (Unpaid)
      {
        id: 'inv-006',
        patientId: 'pat-peter-06',
        patientName: 'Peter Parker',
        subtotal: 980,
        taxAmount: 87,
        insuranceCoverage: 830,
        patientDue: 237,
        status: 'unpaid',
        insuranceProvider: 'Empire BlueCross Medicaid',
        policyNumber: 'MED-110293',
        preAuthStatus: 'APPROVED',
        issuedAt: new Date(now - 3600000 * 6).toISOString(),
        lineItems: [
          { description: 'Bed 301-A (General Medicine) — 1 Day ($500/day)', category: 'bed_charge', quantity: 1, unitCost: 500, totalCost: 500 },
          { description: 'Pediatric Inpatient Admission Examination', category: 'consultation', quantity: 1, unitCost: 200, totalCost: 200 },
          { description: 'Rx: Albuterol Inhaler + Dextromethorphan', category: 'medication', quantity: 2, unitCost: 55, totalCost: 110 },
          { description: 'Lab: Serum Creatinine + Respiratory Viral Panel', category: 'lab_test', quantity: 1, unitCost: 170, totalCost: 170 }
        ]
      }
    ];

    for (const inv of invoices) {
      await orbitox.db.create<any>('invoice', inv, cardioICUId);
    }

    // 8. SEED APPOINTMENTS
    const appointments = [
      {
        id: 'apt-001',
        patientName: 'Tony Stark',
        doctor: 'Dr. Stephen Strange',
        type: 'Cardiology Follow-up & 2D Echo',
        time: '09:30 AM',
        date: 'Today',
        room: 'Consultation Room 3',
        status: 'Confirmed'
      },
      {
        id: 'apt-002',
        patientName: 'Steve Rogers',
        doctor: 'Dr. Stephen Strange',
        type: 'Pulmonology Spirometry & Echo Review',
        time: '11:00 AM',
        date: 'Today',
        room: 'Consultation Room 1',
        status: 'Confirmed'
      },
      {
        id: 'apt-003',
        patientName: 'Natasha Romanoff',
        doctor: 'Dr. Ashlynn Carder',
        type: 'Post-Trauma Spine Assessment',
        time: '02:15 PM',
        date: 'Today',
        room: 'Trauma Bay 01',
        status: 'Confirmed'
      },
      {
        id: 'apt-004',
        patientName: 'Wanda Maximoff',
        doctor: 'Dr. Gregory House',
        type: 'Neuro-Electrophysiology & EEG',
        time: '03:30 PM',
        date: 'Today',
        room: 'Consultation Room 2',
        status: 'Confirmed'
      },
      {
        id: 'apt-005',
        patientName: 'Bruce Banner',
        doctor: 'Dr. Stephen Strange',
        type: 'Cellular Radiation Follow-up',
        time: '04:45 PM',
        date: 'Today',
        room: 'Consultation Room 3',
        status: 'Pending'
      }
    ];

    for (const apt of appointments) {
      await orbitox.db.create<any>('appointment', apt, cardioICUId);
    }

    // 9. AUDIT TRAIL LOG
    await orbitox.audit.log({
      action: 'HOSPITAL_DATABASE_RESEEDED',
      entityType: 'platform',
      entityId: 'apollo-global',
      userId: 'super_admin',
      reason: `Provisioned 10 beds, 10 patients, 7 eMAR treatments, 7 diagnostic labs, 6 superbills for role testing.`
    });

    console.log(`✅ [SeedService] Enterprise Hospital Database successfully seeded with rich clinical records:`);
    console.log(`   - 🛏️ Beds:         ${beds.length}`);
    console.log(`   - 👥 Patients:     ${patients.length}`);
    console.log(`   - 💊 Prescriptions: ${treatments.length}`);
    console.log(`   - 🔬 Labs:         ${labs.length}`);
    console.log(`   - 💳 Superbills:   ${invoices.length}`);
    console.log(`   - 📅 Appointments: ${appointments.length}\n`);

    return {
      bedsCount: beds.length,
      patientsCount: patients.length,
      treatmentsCount: treatments.length,
      labsCount: labs.length,
      invoicesCount: invoices.length,
      appointmentsCount: appointments.length
    };
  }
}
