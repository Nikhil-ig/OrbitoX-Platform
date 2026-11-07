# 🏥 Hospital OS — Enterprise Clinical SaaS & Automation Package

> **Production-ready, HIPAA-compliant Hospital Management SaaS built on the OrbitoX Platform. Features 16 clinical roles, 17 bed types, 18 paired medical devices, real-time IoT vital sign alarms, n8n-style workflow automations, 11 role dashboards, and universal database support (`orbitox.db`).**

---

## 📑 Table of Contents
1. [Quickstart (Run in 30 Seconds)](#1-quickstart-run-in-30-seconds)
2. [How It Works: The 6-Tier Hospital Context Tree](#2-how-it-works-the-6-tier-hospital-context-tree)
3. [Medical Equipment Pairing & Live Telemetry](#3-medical-equipment-pairing--live-telemetry)
4. [n8n-Style Workflow Automation Engine](#4-n8n-style-workflow-automation-engine)
5. [11 Role-Based Dashboards](#5-11-role-based-dashboards)
6. [Support Sub-Systems (Pharmacy, Lab, Auto-Billing)](#6-support-sub-systems-pharmacy-lab-auto-billing)
7. [Zero-Trust Security & Break-Glass Emergency Mode](#7-zero-trust-security--break-glass-emergency-mode)
8. [REST API Reference](#8-rest-api-reference)

---

## 1. Quickstart (Run in 30 Seconds)

### Run the End-to-End Simulation Test:
```bash
npx ts-node src/test-hospital-os.ts
```

### Start the Live REST Server:
```bash
npx ts-node src/server.ts
```
The server will boot on `http://localhost:3000/api`.

---

## 2. How It Works: The 6-Tier Hospital Context Tree

Hospital multi-tenancy in OrbitoX is hierarchical:
$$\text{Apollo Global (Organisation)} \longrightarrow \text{Apollo NY (Branch)} \longrightarrow \text{Cardiology (Dept)} \longrightarrow \text{Cardiac ICU (Ward)} \longrightarrow \text{Room 101} \longrightarrow \text{Bed 101-A}$$

* **Top-Down Visibility:** Super Admins see all branches; Department Heads see only their department.
* **Horizontal Isolation:** Neurology doctors cannot see Cardiology patients without an active **Peer Mesh Tunnel**.
* **Bed-Level Binding:** Every patient, monitor, and prescription is bound to a specific bed node.

---

## 3. Medical Equipment Pairing & Live Telemetry

Beds can be paired with real-world hardware models:
* **Philips IntelliVue MX800**: ECG, SpO2, NIBP, EtCO2, Temperature
* **Hamilton-G5**: Mechanical invasive ventilation
* **B.Braun Infusomat Space**: IV infusion syringe pump
* **ZOLL R Series Plus**: Defibrillator crash cart
* **Fresenius 5008S**: Hemodialysis unit

When vital signs drop (e.g. SpO2 < 90% or Heart Rate > 130 bpm), the telemetry engine instantly dispatches a **Code Blue Alert** to Central Nurse Stations.

---

## 4. n8n-Style Workflow Automation Engine

Chaining clinical triggers and actions is as simple as n8n:

```typescript
import { orbitox } from '@orbitox/runtime';
import { HospitalTriggers, HospitalActions } from 'hospital-os';

orbitox.flow('emergency-vitals-escalation')
  .when(HospitalTriggers.onVitalsBreached({ minSpO2: 90 }))
  .if((data) => data.vitals.spo2 < 85)
    .then(HospitalActions.dispatchCodeBlue({ team: 'resuscitation' }))
    .then(HospitalActions.pageDoctor({ role: 'attending_doctor', urgent: true }))
  .else()
    .then(HospitalActions.notifyNurseStation({ sound: 'warning' }))
  .always()
    .then(HospitalActions.auditVaultLog());
```

---

## 5. 11 Role-Based Dashboards

`DashboardService.getDashboardForRole(role, contextId)` generates tailored views for:
1. **Super Admin** — Network-wide occupancy, multi-branch revenue, SaaS quota manager.
2. **Facility Director** — Branch bed census, today's admissions/discharges, staff on duty.
3. **Department Head** — Department bed matrix, all department medical records.
4. **Attending Doctor** — Assigned patients, live bedside vitals, treatment orders, lab feed.
5. **Specialist Doctor** — Time-limited Peer Mesh consultation cases.
6. **Head Nurse** — Ward bed census, nurse-to-patient ratio alerts, medication round queues.
7. **Staff Nurse** — Bedside vitals, barcode scanning verification for medications.
8. **Pharmacist** — Drug interaction checker, 5-rights verification, dispensing queue.
9. **Lab Technician** — Specimen collection, analyzer pipeline, 30-min critical escalation.
10. **Biomedical Engineer** — Equipment status grid (Online/Alarm/Offline), calibration schedule.
11. **Billing Admin** — Itemized discharge invoices, electronic insurance claims (ANSI X12 837).

---

## 6. Support Sub-Systems (Pharmacy, Lab, Auto-Billing)

* **Pharmacy Safety:** Auto-screens allergies and drug interactions when doctors prescribe.
* **Pathology Pipeline:** Tests ordered STAT start a 30-minute acknowledgment timer for critical values.
* **Auto-Billing:** Discharges compile daily bed charges, procedures, medications, and labs into a finalized itemized invoice.

---

## 7. Zero-Trust Security & Break-Glass Emergency Mode

* **Silent IDOR Defense:** Unauthorized data queries return empty sets (`404 Not Found`).
* **Break-Glass Emergency Protocol:** ER physicians can generate a temporary **30-minute trauma override token** with audited justification for unconscious patients.
* **SHA-256 Audit Vault:** All clinical and billing actions are cryptographically recorded in an immutable ledger.

---

## 8. REST API Reference

| HTTP Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `POST` | `/api/hospital/admissions` | Admit patient & atomically lock bed |
| `POST` | `/api/hospital/beds` | Provision new bed with paired equipment |
| `GET` | `/api/hospital/beds` | List all beds in caller's context scope |
| `POST` | `/api/hospital/telemetry` | Ingest live vital sign stream & check alarms |
| `POST` | `/api/hospital/treatments` | Prescribe medication / procedure |
| `POST` | `/api/hospital/labs` | Order pathology lab test |
| `POST` | `/api/hospital/billing/discharge` | Generate final itemized discharge invoice |
| `GET` | `/api/hospital/dashboard` | Fetch role-specific dashboard data |
| `POST` | `/api/hospital/security/break-glass` | Request 30-min emergency trauma token |
