# 👨‍⚕️ Doctors & Clinical Staff: Complete Role Management Guide

> **Everything about registering, managing, scheduling, and scoping clinical staff — Doctors, Nurses, Pharmacists, Lab Technicians, Biomed Engineers, and Administrative Personnel.**

---

## 📑 Table of Contents
1. [The Staff Hierarchy & Reporting Chain](#1-the-staff-hierarchy--reporting-chain)
2. [All 16 Clinical Roles Explained](#2-all-16-clinical-roles-explained)
3. [Doctor Specializations & Sub-Specializations](#3-doctor-specializations--sub-specializations)
4. [Shift Management & On-Call Scheduling](#4-shift-management--on-call-scheduling)
5. [Registering Staff (Step-by-Step Code)](#5-registering-staff-step-by-step-code)
6. [Doctor–Patient Assignment & Handoff Workflows](#6-doctorpatient-assignment--handoff-workflows)
7. [Nurse Task Queue & Medication Round System](#7-nurse-task-queue--medication-round-system)
8. [Real-World Problem: Staff Shortage & Auto-Escalation](#8-real-world-problem-staff-shortage--auto-escalation)

---

## 1. The Staff Hierarchy & Reporting Chain

```mermaid
graph TD
    classDef admin fill:#dc2626,stroke:#fca5a5,stroke-width:2px,color:#fff;
    classDef doc fill:#2563eb,stroke:#93c5fd,stroke-width:2px,color:#fff;
    classDef nurse fill:#059669,stroke:#6ee7b7,stroke-width:2px,color:#fff;
    classDef support fill:#7c3aed,stroke:#c4b5fd,stroke-width:2px,color:#fff;

    SA["🔑 Super Admin<br><i>(Network-Wide Control)</i>"]:::admin
    FD["🏢 Facility Director<br><i>(Single Hospital Branch)</i>"]:::admin

    DH["🫀 Department Head<br><i>(Dr. Strange — Cardiology Chief)</i>"]:::doc
    AD["👨‍⚕️ Attending Doctor<br><i>(Primary Physician)</i>"]:::doc
    SD["🧠 Specialist Doctor<br><i>(Cross-Dept Consultant)</i>"]:::doc
    RD["📖 Resident Doctor<br><i>(Supervised Trainee)</i>"]:::doc

    HN["👩‍⚕️ Head Nurse<br><i>(Ward Supervisor)</i>"]:::nurse
    SN["💉 Staff Nurse<br><i>(Bedside Nurse)</i>"]:::nurse
    TN["🚨 Triage Nurse<br><i>(ER Assessment)</i>"]:::nurse

    PH["💊 Pharmacist"]:::support
    LT["🔬 Lab Technician"]:::support
    RAD["📸 Radiologist"]:::support
    BE["🔧 Biomed Engineer"]:::support
    BA["💳 Billing Admin"]:::support
    RC["📋 Receptionist"]:::support
    HK["🧹 Housekeeping Lead"]:::support

    SA --> FD
    FD --> DH
    DH --> AD
    DH --> SD
    AD --> RD

    FD --> HN
    HN --> SN
    HN --> TN

    FD --> PH
    FD --> LT
    FD --> RAD
    FD --> BE
    FD --> BA
    BA --> RC
    FD --> HK
```

---

## 2. All 16 Clinical Roles Explained

| # | Role | `StaffRole` Value | Context Scope | What They Can Do | What They Cannot Do |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | **Super Admin** | `super_admin` | Entire hospital network | Configure SaaS plans, manage all branches, view audit trails, manage licensing | Write medical records |
| 2 | **Facility Director** | `facility_director` | Single hospital branch | Manage departments, approve staff, view branch KPIs, manage bed capacity | Access other branches |
| 3 | **Department Head** | `department_head` | Their department + sub-wards | Manage ward staff, approve consultations, view all dept patient records | Access other departments |
| 4 | **Attending Doctor** | `attending_doctor` | Assigned patients only | Diagnose, prescribe, order labs, request consultations, sign discharge | View other doctors' patients |
| 5 | **Specialist Doctor** | `specialist_doctor` | Via Peer Mesh only | Write consultation notes, prescribe via peer tunnel (time-limited) | Direct admission, discharge |
| 6 | **Resident Doctor** | `resident_doctor` | Supervised scope | Write progress notes (requires attending co-sign), assist procedures | Prescribe controlled substances |
| 7 | **Head Nurse** | `head_nurse` | Entire ward | Manage nurse assignments, verify bed sanitization, approve overtime | Write diagnoses |
| 8 | **Staff Nurse** | `staff_nurse` | Assigned beds only | Administer medications, record vitals, update patient status | Prescribe medications |
| 9 | **Triage Nurse** | `triage_nurse` | ER department | Initial patient assessment, assign severity (ESI 1–5), route to dept | Final diagnosis |
| 10 | **Pharmacist** | `pharmacist` | Pharmacy department | Verify prescriptions, flag drug interactions, dispense medications | Modify prescriptions |
| 11 | **Lab Technician** | `lab_technician` | Pathology lab | Collect samples, run tests, report results, flag critical values | View medical records |
| 12 | **Radiologist** | `radiologist` | Imaging department | Perform X-Ray/CT/MRI, write imaging reports, flag findings | Prescribe treatments |
| 13 | **Billing Admin** | `billing_admin` | Finance scope | Generate invoices, process insurance claims, manage payments | Access medical records |
| 14 | **Receptionist** | `receptionist` | Front desk | Register new patients, schedule appointments, print ID badges | View diagnoses |
| 15 | **Biomed Engineer** | `biomed_engineer` | Equipment scope | Calibrate devices, schedule maintenance, update firmware, condemn equipment | Access patient data |
| 16 | **Housekeeping Lead** | `housekeeping_lead` | Facility scope | Mark beds as sanitized, manage room turnover queue | Access clinical data |

---

## 3. Doctor Specializations & Sub-Specializations

| Department | Specialization | Sub-Specializations | Common Procedures |
| :--- | :--- | :--- | :--- |
| **Cardiology** | Cardiologist | Interventional, Electrophysiology, Heart Failure | Angioplasty, Pacemaker implant, Echo |
| **Neurology** | Neurologist | Stroke, Epilepsy, Neuromuscular | EEG, Lumbar Puncture, TPA administration |
| **Orthopedics** | Orthopedic Surgeon | Spine, Joint Replacement, Sports Medicine | Knee/Hip replacement, ACL repair |
| **Pulmonology** | Pulmonologist | Critical Care, Sleep Medicine, Interventional | Bronchoscopy, Ventilator management |
| **Gastroenterology** | Gastroenterologist | Hepatology, IBD, Motility | Endoscopy, Colonoscopy, ERCP |
| **Nephrology** | Nephrologist | Dialysis, Transplant | Hemodialysis, Peritoneal dialysis |
| **Oncology** | Oncologist | Medical, Surgical, Radiation | Chemotherapy, Biopsy, Radiation therapy |
| **Pediatrics** | Pediatrician | Neonatology, Pediatric ICU | Neonatal resuscitation, Growth monitoring |
| **OB/GYN** | Obstetrician | Maternal-Fetal, Reproductive | C-Section, Labor induction, Ultrasound |
| **Psychiatry** | Psychiatrist | Addiction, Forensic, Child | Psychiatric evaluation, ECT |
| **Emergency** | Emergency Physician | Trauma, Toxicology | Resuscitation, Intubation, Chest tube |
| **Anesthesiology** | Anesthesiologist | Cardiac, Neuro, Pain Mgmt | General/Regional anesthesia, Nerve blocks |
| **Radiology** | Radiologist | Interventional, Neuroradiology | CT/MRI interpretation, Biopsy guidance |
| **Pathology** | Pathologist | Histopathology, Microbiology | Tissue analysis, Culture & sensitivity |

---

## 4. Shift Management & On-Call Scheduling

```mermaid
gantt
    title ICU Doctor On-Call Schedule (Weekly)
    dateFormat HH:mm
    axisFormat %H:%M

    section Dr. Strange
    Day Shift (07:00-19:00)    :active, d1, 07:00, 12h

    section Dr. Palmer
    Night Shift (19:00-07:00)  :crit, n1, 19:00, 12h

    section Dr. Banner
    On-Call Backup (24h)       :done, oc1, 00:00, 24h
```

### Shift Types & Rules

| Shift Type | Hours | Key Rules |
| :--- | :--- | :--- |
| **Day Shift** | 07:00 – 19:00 | Primary patient responsibility; can discharge and admit |
| **Night Shift** | 19:00 – 07:00 | Full authority; must hand off critical patients to incoming day shift |
| **On-Call** | 24h standby | Backup for emergencies; system pages via `orbitox.events.emit('staff.page.urgent')` |
| **Rotating** | Alternating Day/Night weekly | Schedule stored in `shiftSchedule: 'rotating'` |

```typescript
// Auto-verify doctor is on duty before patient admission
export async function verifyDoctorOnDuty(doctorId: string): Promise<boolean> {
  const doctor = await orbitox.db.findById('staff', doctorId);
  if (!doctor) throw new Error('Doctor not found');
  if (!doctor.isOnDuty) {
    // Auto-escalate to on-call backup
    const onCallDoc = await orbitox.db.findMany('staff', {
      filter: { role: 'attending_doctor', shiftSchedule: 'on_call', isOnDuty: true },
      contextId: doctor.departmentId, limit: 1
    });
    if (onCallDoc.data.length > 0) {
      console.log(`⚠️ Dr. ${doctor.name} is off duty. Routing to On-Call: Dr. ${onCallDoc.data[0].name}`);
      return true;
    }
    throw new Error(`No doctors available in ${doctor.departmentId}. ESCALATE to Facility Director.`);
  }
  return true;
}
```

---

## 5. Registering Staff (Step-by-Step Code)

```typescript
import { orbitox } from '@orbitox/runtime';

// ─── Register Department Head ──────────────────────────────────
const deptHead = await orbitox.db.create('staff', {
  name: 'Dr. Stephen Strange',
  role: 'department_head',
  departmentId: cardioDept.id,
  email: 'strange@apollo-hospital.com',
  phone: '+1-212-555-0199',
  licenseNumber: 'MD-CARDIO-9988',
  specialization: 'Interventional Cardiology',
  shiftSchedule: 'day',
  isOnDuty: true
}, cardioDept.id);

// ─── Register Attending Doctor ─────────────────────────────────
const attendingDoc = await orbitox.db.create('staff', {
  name: 'Dr. Christine Palmer',
  role: 'attending_doctor',
  departmentId: cardioDept.id,
  email: 'palmer@apollo-hospital.com',
  phone: '+1-212-555-0202',
  licenseNumber: 'MD-CARDIO-7721',
  specialization: 'Electrophysiology',
  shiftSchedule: 'night',
  isOnDuty: false
}, cardioDept.id);

// ─── Register Head Nurse ───────────────────────────────────────
const headNurse = await orbitox.db.create('staff', {
  name: 'Nurse Maria Hill',
  role: 'head_nurse',
  departmentId: cardioDept.id,
  email: 'hill@apollo-hospital.com',
  phone: '+1-212-555-0303',
  licenseNumber: 'RN-ICU-4421',
  shiftSchedule: 'rotating',
  isOnDuty: true
}, icuWard.id); // Scoped to ICU Ward

// ─── Register Pharmacist ──────────────────────────────────────
const pharmacist = await orbitox.db.create('staff', {
  name: 'Dr. Pepper Singh',
  role: 'pharmacist',
  departmentId: pharmacy.id,
  email: 'singh@apollo-hospital.com',
  phone: '+1-212-555-0404',
  licenseNumber: 'RPH-NY-8812',
  shiftSchedule: 'day',
  isOnDuty: true
}, pharmacy.id);

// ─── Register Biomed Engineer ─────────────────────────────────
const biomedEngineer = await orbitox.db.create('staff', {
  name: 'Tony Rhodes',
  role: 'biomed_engineer',
  departmentId: hospital.id,
  email: 'rhodes@apollo-hospital.com',
  phone: '+1-212-555-0505',
  licenseNumber: 'BME-NY-1122',
  shiftSchedule: 'day',
  isOnDuty: true
}, hospital.id); // Scoped to entire hospital
```

---

## 6. Doctor–Patient Assignment & Handoff Workflows

```mermaid
sequenceDiagram
    autonumber
    actor DocDay as 👨‍⚕️ Dr. Strange (Day Shift)
    participant API as ⚡ OrbitoX API
    participant DB as 🗄️ Database
    actor DocNight as 👩‍⚕️ Dr. Palmer (Night Shift)
    participant Audit as ⛓️ Audit Vault

    Note over DocDay,DocNight: Shift Handoff at 19:00

    DocDay->>API: POST /api/handoffs<br>{ fromDoctorId, toDoctorId, patientIds: ['pat_01', 'pat_02'] }
    API->>DB: Update patients: attendingDoctorId = Dr. Palmer
    API->>Audit: Log Handoff [Dr. Strange → Dr. Palmer | 2 patients]
    API-->>DocDay: ✅ Handoff Confirmed
    API-->>DocNight: 📱 Push Notification: "You have 2 new patients"

    DocNight->>API: GET /api/patients (Night Shift Scope)
    API-->>DocNight: ✅ Returns pat_01, pat_02 with full medical history
```

---

## 7. Nurse Task Queue & Medication Round System

```mermaid
graph LR
    classDef task fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff;
    classDef done fill:#1e293b,stroke:#6b7280,stroke-width:1px,color:#9ca3af;

    subgraph NurseQueue ["👩‍⚕️ Nurse Maria's Task Queue (Shift: 07:00–19:00)"]
        T1["💊 07:30 — Administer Metoprolol 50mg to Bed 101-A"]:::task
        T2["📟 08:00 — Record Vitals for all ICU beds"]:::task
        T3["💉 09:00 — IV Fluid Change on Bed 101-B"]:::task
        T4["💊 12:00 — Insulin Injection for Bed 102-A"]:::task
        T5["📋 14:00 — Wound Dressing Change Bed 103-A"]:::task
        T6["✅ 07:00 — Morning Report Handoff (COMPLETED)"]:::done
    end
```

```typescript
// Auto-generate nurse medication rounds from treatment orders
orbitox.events.on('treatment.ordered', async (payload) => {
  if (payload.record.type === 'medication') {
    await orbitox.db.create('nurse_task', {
      nurseId: getAssignedNurseForBed(payload.record.bedId),
      patientId: payload.record.patientId,
      taskType: 'administer_medication',
      description: `Administer ${payload.record.procedureOrDrug} ${payload.record.dosage} (${payload.record.route})`,
      scheduledAt: calculateNextDoseTime(payload.record.frequency),
      status: 'pending'
    });
  }
});
```

---

## 8. Real-World Problem: Staff Shortage & Auto-Escalation

```mermaid
graph TD
    classDef normal fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff;
    classDef warn fill:#78350f,stroke:#f59e0b,stroke-width:2px,color:#fff;
    classDef crit fill:#991b1b,stroke:#fca5a5,stroke-width:2px,color:#fff;

    CHECK["🔍 Check Ward Staff-to-Patient Ratio"]:::normal
    OK["✅ Ratio Adequate (1:2 ICU, 1:6 Ward)"]:::normal
    WARN["⚠️ Ratio Below Minimum"]:::warn
    PAGE["📱 Page Off-Duty Staff"]:::warn
    CRIT["🚨 Critical Shortage"]:::crit
    ESC["📢 Escalate to Facility Director"]:::crit
    AGENCY["🏥 Alert Staffing Agency"]:::crit

    CHECK --> OK
    CHECK --> WARN
    WARN --> PAGE
    PAGE --> |"No Response in 15 min"| CRIT
    CRIT --> ESC
    CRIT --> AGENCY
```

```typescript
// Run every 30 minutes via cron workflow
export async function checkStaffingLevels(wardId: string) {
  const onDutyNurses = await orbitox.db.findMany('staff', {
    filter: { role: 'staff_nurse', isOnDuty: true }, contextId: wardId
  });
  const occupiedBeds = await orbitox.db.findMany('bed', {
    filter: { status: 'occupied' }, contextId: wardId
  });

  const ratio = occupiedBeds.data.length / Math.max(onDutyNurses.data.length, 1);
  const isICU = wardId.includes('icu');
  const maxRatio = isICU ? 2 : 6; // ICU: 1:2, General: 1:6

  if (ratio > maxRatio) {
    await orbitox.events.emit('staffing.shortage.alert', {
      wardId, currentRatio: ratio, requiredRatio: maxRatio,
      severity: ratio > maxRatio * 2 ? 'CRITICAL' : 'WARNING'
    });
  }
}
```

---

### 🔗 Related Guides:
- 🏥 [**Hospital SaaS Master Guide**](./HOSPITAL_SAAS_DEVELOPER_GUIDE.md)
- 🔄 [**Clinical Workflow Flows**](./HOSPITAL_CLINICAL_WORKFLOW_FLOW.md)
- 🛏️ [**Rooms, Beds & Equipment Guide**](./ROOMS_BEDS_AND_EQUIPMENT.md)
- 📊 [**Admin Dashboards & KPIs**](./PLATFORM_ADMIN_AND_DASHBOARDS.md)
