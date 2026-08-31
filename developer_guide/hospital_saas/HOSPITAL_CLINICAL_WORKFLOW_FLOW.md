# 🏥 Clinical Workflows & Operational Execution Flow Guide

> **A beginner-friendly, deeply detailed visual guide to clinical lifecycles, cross-department specialist consultations, real-time bed capacity state machines, IoT telemetry alarms, pharmacy medication safety pipelines, and emergency break-glass protocols in OrbitoX.**

---

## 📑 Table of Contents
1. [The Big Picture: A Real Patient's Journey (The Story)](#1-the-big-picture-a-real-patients-journey-the-story)
2. [End-to-End Clinical Lifecycle Flow (9 Stages Explained)](#2-end-to-end-clinical-lifecycle-flow-9-stages-explained)
3. [Cross-Department Specialist Consultation (Peer Mesh Flow)](#3-cross-department-specialist-consultation-peer-mesh-flow)
4. [Real-Time Bed State Machine & Capacity Orchestrator](#4-real-time-bed-state-machine--capacity-orchestrator)
5. [Real-Time IoT Medical Telemetry & Alarms Flow](#5-real-time-iot-medical-telemetry--alarms-flow)
6. [Pharmacy Medication Dispensing & 5-Rights Safety Pipeline](#6-pharmacy-medication-dispensing--5-rights-safety-pipeline)
7. [Pathology Lab Order & Critical Value Escalation Flow](#7-pathology-lab-order--critical-value-escalation-flow)
8. [Emergency "Break-Glass" Protocol (Trauma Override)](#8-emergency-break-glass-protocol-trauma-override)
9. [Edge Cases & Error Handling Reference](#9-edge-cases--error-handling-reference)

---

## 1. The Big Picture: A Real Patient's Journey (The Story)

To understand how clinical data moves through OrbitoX, let's follow a real-world patient scenario:

> **The Story of Patient Tony Stark:**
> 1. **Arrival & Triage:** Tony arrives at the Emergency Department with acute cardiac trauma (ESI-1: Resuscitation).
> 2. **Admission & Bed Lock:** The reception team admits Tony. OrbitoX automatically checks bed capacity, reserves **Bed 101-A (Cardiology ICU)**, and locks the bed so nobody else can take it.
> 3. **Medical Device Pairing:** A **Philips IntelliVue MX800 Vitals Monitor** and **Hamilton-G5 Ventilator** are paired with Bed 101-A, streaming continuous telemetry.
> 4. **Doctor Diagnosis:** Dr. Strange (Cardiology) creates Tony's medical record (`STEMI - ICD-10: I21.0`).
> 5. **Cross-Department Need:** Dr. Strange notices neurological symptoms and requests a consultation from Dr. Xavier (Neurology).
> 6. **Secure Peer Mesh:** OrbitoX creates a temporary **24-hour peer tunnel** between Cardiology and Neurology so Dr. Xavier can review records and prescribe neuroprotective therapy.
> 7. **Treatment & Pharmacy Safety:** Dr. Strange prescribes cardiac medication; the safety engine checks allergies/interactions, pushes to the Pharmacy Queue, and the nurse verifies via barcode scanner.
> 8. **Discharge & Sanitization:** Once healed, Tony is discharged. The bed status automatically transitions to `Sanitizing` for housekeeping and the final itemized bill is generated.
> 9. **HIPAA Compliance:** Every single action is permanently recorded in an immutable, cryptographic SHA-256 audit ledger.

---

## 2. End-to-End Clinical Lifecycle Flow (9 Stages Explained)

```mermaid
sequenceDiagram
    autonumber
    actor Pat as 👨‍🦽 Patient / Reception
    participant API as ⚡ OrbitoX API Engine
    participant Hooks as 🪝 Entity Lifecycle Hooks
    participant Sec as 🛡️ Zero-Trust Security Gate
    actor Doc as 👨‍⚕️ Attending Doctor
    participant Telemetry as 📟 Medical IoT Stream
    participant Flow as 📦 Workflows Engine
    actor Pharm as 💊 Pharmacist
    actor Nurse as 💉 Staff Nurse
    participant Audit as ⛓️ Immutable Audit Vault

    Note over Pat,API: Stage 1: Patient Admission & Bed Lock
    Pat->>API: 1. POST /api/patients<br><i>Body: { name: 'Tony Stark', bedId: 'bed_101_a' }</i>
    API->>Hooks: 2. Execute beforeCreate(Patient)
    Hooks->>Hooks: 3. Verify Bed 101-A is 'available' & Check SaaS Bed Quota
    Hooks-->>API: 4. Approved
    API->>API: 5. Save Patient to Database
    API->>Hooks: 6. Execute afterCreate(Patient)
    Hooks->>Hooks: 7. Set Bed 101-A Status to 'occupied'
    API->>Audit: 8. Cryptographic SHA-256 Log [ADMISSION | Tony Stark | Bed 101-A]
    API-->>Pat: 9. ✅ 201 Created: { patientId: 'pat_001', status: 'admitted' }

    Note over Doc,API: Stage 2: Clinical Examination & Diagnosis
    Doc->>API: 10. POST /api/medical-records<br><i>Body: { patientId: 'pat_001', diagnosis: 'Acute STEMI', icdCode: 'I21.0' }</i>
    API->>Sec: 11. Verify Doctor Context matches Cardiology Dept
    Sec-->>API: 12. Context Validated (Access Granted)
    API->>Audit: 13. Cryptographic SHA-256 Log [DIAGNOSIS | pat_001]
    API-->>Doc: 14. ✅ 201 Created: { recordId: 'rec_99', diagnosis: 'Saved' }

    Note over Doc,Pharm: Stage 3: Treatment Prescription & Pharmacy Safety
    Doc->>API: 15. POST /api/treatments<br><i>Body: { patientId: 'pat_001', procedureOrDrug: 'Metoprolol 50mg PO BID' }</i>
    API->>Hooks: 16. Drug Safety Check (Allergies + Max Dose + Interactions)
    Hooks->>Flow: 17. Trigger Event 'treatment.ordered'
    Flow->>Pharm: 18. Real-Time Push to Pharmacy Dispensing Dashboard
    Pharm->>API: 19. PATCH /api/treatments/:id { status: 'dispensed' }
    API->>Audit: 20. Cryptographic SHA-256 Log [TREATMENT | pat_001 | Metoprolol]

    Note over Nurse,API: Stage 4: Barcode Administration
    Nurse->>API: 21. Scan Patient Wristband + Medication Barcode
    API-->>Nurse: 22. ✅ 5-Rights Verified: Administer Dose
    Nurse->>API: 23. PATCH /api/treatments/:id { status: 'administered' }

    Note over Telemetry,Nurse: Stage 5: Continuous IoT Monitoring
    Telemetry->>API: 24. Live Vitals: SpO2 96%, HR 84 bpm (Within Safe Range)
```

---

## 3. Cross-Department Specialist Consultation (Peer Mesh Flow)

In modern healthcare, specialists from different departments frequently need to consult on the same patient. **OrbitoX solves this using Inter-Branch Peer Mesh Links.**

```mermaid
sequenceDiagram
    autonumber
    actor DrCardio as 🫀 Dr. Strange (Cardiology)
    participant API as ⚡ OrbitoX API Engine
    participant Mesh as 🕸️ Context Mesh Engine
    participant Sec as 🛡️ Zero-Trust Security Gate
    actor DrNeuro as 🧠 Dr. Xavier (Neurology)
    participant Audit as ⛓️ Immutable Audit Vault

    Note over DrCardio,DrNeuro: Patient Tony Stark is in Cardiology ICU Bed 101-A

    DrNeuro->>API: 1. GET /api/medical-records/rec_tony_stark
    API->>Sec: 2. Check Context Boundary (Neurology -> Cardiology Bed)
    Sec-->>DrNeuro: 3. 🛑 403 Forbidden (Zero-Trust Isolation Blocks Snooping)

    Note over DrCardio,Mesh: Dr. Strange requests Neurology Consult
    DrCardio->>API: 4. POST /api/consultations<br><i>{ targetDept: 'neurology', patientId: 'pat_tony_stark', ttlHours: 24 }</i>
    API->>Mesh: 5. orbitox.context.linkPeers('cardiology', 'neurology', ['medical_record.read', 'treatment.write'])
    Mesh-->>API: 6. Peer Link Active (Valid for 24 Hours)
    API->>Audit: 7. Log Peer Link Creation [Cardio ⇄ Neuro | Scope: Tony Stark]

    Note over DrNeuro,API: Dr. Xavier now has temporary consultation access
    DrNeuro->>API: 8. GET /api/medical-records/rec_tony_stark
    API->>Sec: 9. Check Context + Active Peer Mesh Tunnel
    Sec-->>API: 10. Access Granted via Peer Link
    API-->>DrNeuro: 11. ✅ 200 OK: Full Medical History & Vitals

    DrNeuro->>API: 12. POST /api/treatments<br><i>{ patientId: 'pat_tony_stark', procedure: 'Neuroprotective Infusion' }</i>
    API->>Sec: 13. Validate Peer Permission ('treatment.write')
    Sec-->>API: 14. Permission Verified
    API->>Audit: 15. Log Specialist Treatment Prescribed by Consulting Doctor
    API-->>DrNeuro: 16. ✅ 201 Created

    Note over DrCardio,Mesh: Consultation Completed
    DrCardio->>API: 17. DELETE /api/consultations/con_123
    API->>Mesh: 18. Revoke Peer Mesh Tunnel
    API->>Audit: 19. Log Peer Link Revocation
```

---

## 4. Real-Time Bed State Machine & Capacity Orchestrator

```mermaid
stateDiagram-v2
    [*] --> Available: Bed Registered in System

    Available --> Reserved: Scheduled Admission / Elective Surgery
    Reserved --> Available: Admission Cancelled / Expired

    Available --> Occupied: Emergency Admission via POST /api/patients
    Reserved --> Occupied: Patient Check-In & Admitted

    Occupied --> Discharging: Doctor Signs Discharge Order
    Discharging --> Sanitizing: Patient Left Room (Housekeeping Alert)

    Sanitizing --> Maintenance: Equipment / Bio-Sensor Fault Detected
    Maintenance --> Sanitizing: Repairs Completed & Certified
    Sanitizing --> Available: Deep Cleaning Verified by Housekeeping Lead

    Occupied --> Transferred: Inter-Ward Transfer (ICU → General)
    Transferred --> Sanitizing: Previous Bed Emptied

    Available --> TemporarySurge: Mass Casualty / Epidemic Surge Declared
    TemporarySurge --> Occupied: Patient Admitted
    Occupied --> Decommissioned: Surge Patient Discharged (Auto-Cleaned)
    Decommissioned --> [*]
```

### Bed State Definitions & Business Rules:

| Bed State | Description | Can Admit Patient? | Automatic Triggers & Actions |
| :--- | :--- | :---: | :--- |
| **`available`** | Fully sanitized, inspected, and ready for occupancy. | ✅ **Yes** | Instant admission allowed. |
| **`reserved`** | Held for an incoming elective surgery or scheduled patient. | ⚠️ **Only for Reserved Patient** | Auto-releases if patient does not check in within 2 hours. |
| **`occupied`** | Patient currently assigned and receiving care. | ❌ **No** | Blocks any duplicate admission in `beforeCreate` hook. |
| **`discharging`** | Doctor signed discharge paperwork; billing finalizing. | ❌ **No** | Generates final pharmacy & billing statements. |
| **`sanitizing`** | Patient has departed; housekeeping team cleaning. | ❌ **No** | Emits `housekeeping.dispatch` event with room number. |
| **`maintenance`** | Bed telemetry, oxygen monitor, or motor malfunctioning. | ❌ **No** | Creates urgent work-order ticket for biomedical team. |
| **`transferred`** | Patient moved to another department/ward. | ❌ **No** | Immediately transitions previous bed to `sanitizing`. |
| **`temporary_surge`** | Overflow bed during disasters. | ✅ **Yes** | Automatically destroyed on patient discharge. |

---

## 5. Real-Time IoT Medical Telemetry & Alarms Flow

```mermaid
sequenceDiagram
    autonumber
    participant Monitor as 📟 Philips MX800 (Bed 101-A)
    participant Ingest as 📡 IoT Telemetry Ingest
    participant Engine as ⚡ Threshold Engine
    participant NurseStation as 👩‍⚕️ Nurse Central Station
    participant DocMobile as 📱 Doctor Mobile App
    participant Audit as ⛓️ Immutable Audit Vault

    Monitor->>Ingest: Stream: { spo2: 88, hr: 142, bp: '85/55', rr: 32 }
    Ingest->>Engine: Evaluate against Bed 101-A Thresholds (minSpO2: 90, maxHR: 130)
    
    Note over Engine: Breaches: SpO2 (88 < 90) + Tachycardia (142 > 130)
    
    Engine->>NurseStation: 🚨 HIGH_PRIORITY CODE BLUE: Bed 101-A Vitals Compromised!
    Engine->>DocMobile: 📱 URGENT PUSH: Dr. Strange — Tony Stark SpO2 88%
    Engine->>Audit: ⛓️ Log Critical Vitals Event [Bed 101-A | SpO2: 88% | HR: 142]

    NurseStation-->>Engine: Nurse Palmer acknowledges alarm (Response Time: 14s)
    DocMobile-->>Engine: Dr. Strange acknowledges (Response Time: 28s)
```

---

## 6. Pharmacy Medication Dispensing & 5-Rights Safety Pipeline

```mermaid
graph TD
    classDef doc fill:#2563eb,stroke:#93c5fd,stroke-width:2px,color:#fff;
    classDef check fill:#dc2626,stroke:#fca5a5,stroke-width:2px,color:#fff;
    classDef pharm fill:#7c3aed,stroke:#c4b5fd,stroke-width:2px,color:#fff;
    classDef nurse fill:#059669,stroke:#6ee7b7,stroke-width:2px,color:#fff;
    classDef audit fill:#1e293b,stroke:#6b7280,stroke-width:1px,color:#9ca3af;

    RX["👨‍⚕️ Doctor Prescribes<br>Metoprolol 50mg PO BID"]:::doc
    ALLERGY["🛡️ Check 1: Allergy Screen<br>Patient allergies vs drug class"]:::check
    INTERACT["🛡️ Check 2: Drug Interactions<br>Active meds vs new prescription"]:::check
    DOSE["🛡️ Check 3: Max Daily Dose<br>Weight-based calculation validation"]:::check
    PHARM_V["💊 Pharmacist Verification<br>Review on Pharmacy Dashboard"]:::pharm
    DISPENSE["📦 Dispensed & Labeled<br>Barcode generated"]:::pharm
    SCAN_PT["📱 Scan 1: Patient Wristband<br>Confirm identity"]:::nurse
    SCAN_RX["📱 Scan 2: Medication Pack<br>Match active prescription"]:::nurse
    ADMIN["💉 Administered by Nurse"]:::nurse
    LOG["⛓️ Immutable Audit Entry"]:::audit

    RX --> ALLERGY --> INTERACT --> DOSE --> PHARM_V --> DISPENSE --> SCAN_PT --> SCAN_RX --> ADMIN --> LOG
```

---

## 7. Pathology Lab Order & Critical Value Escalation Flow

```mermaid
graph TD
    classDef doc fill:#2563eb,stroke:#93c5fd,stroke-width:2px,color:#fff;
    classDef lab fill:#d97706,stroke:#fcd34d,stroke-width:2px,color:#fff;
    classDef crit fill:#dc2626,stroke:#fca5a5,stroke-width:2px,color:#fff;

    ORDER["👨‍⚕️ Doctor Orders STAT Lab<br>Troponin + CBC + BMP"]:::doc
    COLLECT["🩸 Sample Collected<br>Barcode tube labeled"]:::lab
    ANALYZE["🔬 Analyzer Runs Sample<br>Cobas 6000 / Sysmex"]:::lab
    RESULT["📊 Result Evaluated"]:::lab

    EVAL{{"Is Value Critical?"}}
    NORMAL["✅ Normal Result<br>Post to Doctor Dashboard"]:::doc
    CRITICAL["🚨 CRITICAL: Troponin 4.2 ng/mL<br>(Normal: < 0.04)"]:::crit
    TIMER["⏱️ Start 30-Min Acknowledgment Timer"]:::crit
    PAGE["📱 Multi-Channel Alert to Doctor<br>Push + SMS + Dashboard"]:::crit
    ACK["👨‍⚕️ Doctor Acknowledges"]:::doc
    ESCALATE["📢 Escalate to Dept Head (if unacknowledged)"]:::crit

    ORDER --> COLLECT --> ANALYZE --> RESULT --> EVAL
    EVAL --> |"No"| NORMAL
    EVAL --> |"Yes"| CRITICAL --> TIMER --> PAGE --> ACK
    TIMER --> |"Timeout > 30 min"| ESCALATE
```

---

## 8. Emergency "Break-Glass" Protocol (Trauma Override)

When an unconscious trauma patient arrives in the Emergency Room, there is no time to wait for administrative context permissions. **OrbitoX provides a cryptographic Break-Glass protocol:**

```mermaid
sequenceDiagram
    autonumber
    actor ERDoc as 🚨 ER Trauma Doctor
    participant API as ⚡ OrbitoX API Engine
    participant Gate as 🛡️ Break-Glass Security Gate
    participant Audit as ⛓️ Immutable Audit Vault
    participant Alert as 📢 Hospital Compliance & CMO

    ERDoc->>API: 1. POST /api/security/break-glass<br><i>{ reason: 'Severe Cardiac Arrest resuscitation', patientId: 'pat_unconscious' }</i>
    API->>Gate: 2. Verify Doctor is Authenticated & Active on Hospital Roster
    Gate->>Gate: 3. Temporarily Elevate Context Scope to Emergency Full Read
    Gate->>Audit: 4. 🚨 RECORD BREAK-GLASS INCIDENT<br>(Doctor ID, Exact Timestamp, Justification, Geolocation)
    Gate->>Alert: 5. Broadcast High-Priority Alert to Chief Medical Officer & Legal
    Gate-->>ERDoc: 6. Issue 30-Minute Scoped Emergency Access Token

    ERDoc->>API: 7. GET /api/medical-records/rec_unconscious (with token)
    API-->>ERDoc: 8. ✅ Access Granted under Emergency Protocol
```

---

## 9. Edge Cases & Error Handling Reference

| Edge Case / Failure Scenario | What OrbitoX Does | HTTP Status Code | Developer Log Output |
| :--- | :--- | :---: | :--- |
| **Two nurses admit patients to the same bed simultaneously** | `beforeCreate` hook detects race condition via atomic DB lock. Second request is safely rejected. | `400 Bad Request` | `[Bed Hook] Error: Bed bed_101_a is already OCCUPIED!` |
| **Hospital exceeds licensed SaaS bed capacity** | `orbitox.billing.checkQuota()` detects quota limit. | `402 Payment Required` | `[Billing] Quota exceeded for metric 'maxBeds'` |
| **Neurology doctor accesses Cardiology patient without consult** | Zero-Trust policy engine returns empty sub-tree. | `404 Not Found` *(Silent IDOR Defense)* | `[Security] Unauthorized access attempt blocked` |
| **Peer mesh consultation expires after 24 hours** | Context mesh engine invalidates link; doctor is safely restricted back to their home department. | `403 Forbidden` | `[ContextMesh] Peer link expired at 2026-08-20T12:00:00Z` |
| **Patient is prescribed a drug they are allergic to** | Drug safety engine halts order before submission. | `422 Unprocessable Entity` | `[DrugSafety] CRITICAL: Patient allergic to Penicillin class!` |
| **Biomedical ventilator telemetry stream drops offline** | Telemetry ingest detects heartbeat timeout (>30s) and emits device offline alert. | WebSocket Event | `[Telemetry] Device dev_vent_01 on Bed 101-A is OFFLINE` |
| **Temporary surge bed discharged** | Context node is destroyed; equipment returned to pool; billing captures overflow rate. | `200 OK` | `[SurgeEngine] Decommissioned temporary bed context node ctx_surge_01` |

---

### 🔗 Related Guides:
- 📖 [**Hospital SaaS Master Guide**](./HOSPITAL_SAAS_DEVELOPER_GUIDE.md)
- 👨‍⚕️ [**Doctors & Clinical Staff**](./DOCTORS_AND_CLINICAL_STAFF.md)
- 🛏️ [**Rooms, Beds & Medical Equipment**](./ROOMS_BEDS_AND_EQUIPMENT.md)
- 🏢 [**Branches & Departments**](./BRANCHES_AND_DEPARTMENTS.md)
- 📊 [**Admin Dashboards & KPIs**](./PLATFORM_ADMIN_AND_DASHBOARDS.md)
- 🏃 [**Patient Lifecycle Flow**](./PATIENT_LIFECYCLE_FLOW.md)
- 💊 [**Pharmacy, Lab & Billing**](./PHARMACY_LAB_AND_BILLING.md)
- 🔐 [**Security & Compliance**](./SECURITY_AND_COMPLIANCE.md)
- 🧭 [**Developer Guide Master Hub**](../README.md)
