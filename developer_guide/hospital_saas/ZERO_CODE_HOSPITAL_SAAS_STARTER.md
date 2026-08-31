# ⚡ 1-Line Zero-Code Hospital SaaS Starter & Developer Guide

> **How to launch a complete, enterprise-grade Hospital Management SaaS with real database persistence, IoT telemetry, 6-tier hierarchy, 5-rights pharmacy, and Next.js frontend in under 5 minutes without writing domain logic from scratch.**

---

## 🎯 Executive Overview

Building a Hospital SaaS from scratch traditionally takes **6–12 months** of engineering:
- Database schemas for patients, admissions, bed censuses, vitals, prescriptions, lab orders, and billing
- Multi-tier tenancy (Organisation $\rightarrow$ Branch $\rightarrow$ Department $\rightarrow$ Ward $\rightarrow$ Room $\rightarrow$ Bed Station)
- IoT telemetry stream ingestion with Code Blue threshold alarms
- 5-Rights Pharmacy safety and dispensing queues
- Emergency Break-Glass security overrides
- Cryptographic SHA-256 audit logging (HIPAA/NABH compliance)

### 💡 The OrbitoX Solution: Zero-Code / Pre-Packaged Hospital OS
With **OrbitoX + Hospital OS**, **100% of this domain logic is pre-written and packaged**. You can launch a brand-new Hospital SaaS in **3 lines of backend code** and **1 React hook on the frontend**.

---

## 🚀 1. Launching the Backend (3 Lines of Code)

Create an `index.ts` file in your Node.js/Express/Nest project:

```typescript
import { createHospitalSaaS } from 'hospital-os';

// 🚀 1-Line Bootstrap: Initializes DB schemas, 6-tier context tree, and 12 REST endpoints
const hospital = await createHospitalSaaS({
  name: 'Mayo Clinic Healthcare Group',
  port: 3000,
  complianceFramework: 'HIPAA',
  initialBranchName: 'Mayo Clinic - Rochester Campus'
});
```

### What `createHospitalSaaS()` Automatically Provisions:
1. **8 Pre-Configured Database Entities**: `patient`, `bed`, `treatment`, `medical_record`, `lab_order`, `invoice`, `staff`, `audit_ledger`.
2. **Standard 6-Tier Context Hierarchy**:
   - `Organisation`: Mayo Clinic Healthcare Group
   - `Tenant / Branch`: Rochester Campus
   - `Departments`: Cardiology, Neurology, Emergency, Pharmacy, Pathology
   - `Wards`: Cardiac ICU Ward, Trauma Resuscitation Unit
   - `Rooms`: ICU Room 101, ER Trauma Bay
   - `Bed Stations`: Bed 101-A, Bed 101-B, Trauma Bay 01
3. **Medical Device Machinery Catalog**: Philips IntelliVue MX800, Hamilton-G5 Ventilator, GE CARESCAPE B650, ZOLL R Series Plus Defibrillator.
4. **12 Live REST Endpoints**:
   - `GET /api/hospital/beds` — Live beds with active admitted patients
   - `POST /api/hospital/admissions` — Atomic patient check-in & bed locking
   - `GET /api/hospital/hierarchy` — 6-tier dynamic context tree
   - `POST /api/hospital/contexts` — 1-click node provisioning (Org $\rightarrow$ Bed)
   - `POST /api/hospital/telemetry` — Code Blue vital threshold alarms ($SpO_2 < 90\%$)
   - `GET /api/hospital/treatments` — 5-Rights pharmacy order queue
   - `POST /api/hospital/treatments/:id/dispense` — Pharmacist verification
   - `POST /api/hospital/security/break-glass` — 30-min emergency JWT override
   - `GET /api/hospital/audit` — Cryptographic SHA-256 audit ledger

---

## 💻 2. Building Frontend Web Pages Fastly (1-Line React Hook)

In your Next.js or React frontend, simply import `useHospitalOS`:

```tsx
'use client';

import { useHospitalOS } from '@/hooks/useHospitalOS';

export default function HospitalDashboard() {
  const {
    beds,              // Live beds + admitted patients from DB
    hierarchy,         // 6-tier context tree
    treatments,        // Pharmacy prescription queue
    auditLogs,         // SHA-256 cryptographic logs
    metrics,           // { totalBeds, occupiedBeds, occupancyRate }
    activeAlarm,       // Real-time Code Blue telemetry alarm
    admitPatient,      // 1-Click atomic patient admission
    dispenseMedication // 1-Click 5-rights pharmacy dispense
  } = useHospitalOS();

  return (
    <div className="p-8 bg-slate-950 text-white min-h-screen">
      <h1 className="text-3xl font-bold">Hospital Command Center</h1>
      
      {/* 1. Live Occupancy Metrics */}
      <div className="grid grid-cols-3 gap-6 my-6">
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
          <p className="text-sm text-slate-400">Total Beds</p>
          <p className="text-3xl font-bold">{metrics.totalBeds}</p>
        </div>
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
          <p className="text-sm text-slate-400">Occupied Beds</p>
          <p className="text-3xl font-bold text-amber-400">{metrics.occupiedBeds}</p>
        </div>
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
          <p className="text-sm text-slate-400">Occupancy Rate</p>
          <p className="text-3xl font-bold text-emerald-400">{metrics.occupancyRate}%</p>
        </div>
      </div>

      {/* 2. Live Bed Matrix */}
      <div className="grid grid-cols-3 gap-6">
        {beds.map((bed) => (
          <div key={bed.id} className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
            <h3 className="font-bold text-lg">{bed.label}</h3>
            <span className={`px-3 py-1 text-xs rounded-full ${bed.status === 'occupied' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {bed.status.toUpperCase()}
            </span>
            
            {bed.patient && (
              <div className="mt-4 p-3 bg-slate-800/50 rounded-xl">
                <p className="font-semibold text-white">{bed.patient.name} ({bed.patient.age} yrs)</p>
                <p className="text-xs text-slate-400">Diag: {bed.patient.diagnosis}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🛠️ 3. Universal Client SDK (`HospitalOSClient`)

For backend-to-backend integrations, microservices, mobile apps, or Vue/Svelte frontends:

```typescript
import { HospitalOSClient } from 'hospital-os';

const client = new HospitalOSClient({ baseUrl: 'http://localhost:3000/api/hospital' });

// 1. Fetch live beds
const beds = await client.getBeds();

// 2. Admit patient
const patient = await client.admitPatient({
  name: 'Diana Prince',
  age: 29,
  gender: 'F',
  bloodGroup: 'A+',
  bedId: 'bed-101-b',
  diagnosis: 'Acute Coronary Syndrome',
  attendingDoctorId: 'dr_strange_01'
});

// 3. Dispense Medication
await client.dispenseMedication('rx-001', 'pharm_banner_01');

// 4. Stream Telemetry
await client.streamTelemetry('bed-101-a', {
  spo2: 84, // Triggers Code Blue
  heartRate: 142,
  bpSys: 180,
  bpDia: 110
});
```

---

## 📋 4. Feature Comparison: From Scratch vs. OrbitoX Hospital OS

| Architectural Layer | Traditional Custom Build | With OrbitoX + Hospital OS |
| :--- | :--- | :--- |
| **Development Time** | 6 to 12 Months | **5 Minutes** |
| **Database Schemas** | Handcrafted SQL migrations & foreign keys | **Zero-Code (Auto-injected discriminator tables)** |
| **6-Tier Multi-Tenancy** | Complex nested joins & fragile queries | **1-Line `HierarchyService.bootstrap()`** |
| **Code Blue Telemetry** | Custom WebSockets & threshold math | **Built-in `TelemetryService` + BullMQ queues** |
| **Pharmacy 5-Rights** | Custom state machine & role guards | **Pre-wired `PharmacyService` (Order $\rightarrow$ Dispense $\rightarrow$ Administer)** |
| **Zero-Trust Security** | Manual role checks on every endpoint | **Built-in Zero-Trust ACLs & Silent 404 IDOR defense** |
| **Compliance Audit** | Manual audit table inserts | **Cryptographic SHA-256 Hash Chain Vault** |
| **Frontend UI** | Rebuilding complex dashboards | **Pre-built `useHospitalOS` hook & widgets** |

---

## 🎉 Summary

Whenever you need to launch a new hospital, clinic chain, veterinary network, or healthcare SaaS:
1. Call `createHospitalSaaS({ name: 'Your Hospital' })` in your server.
2. Drop `useHospitalOS()` into your Next.js/React frontend.
3. All database tables, multi-tier isolation, real-time telemetry, and compliance security are immediately live and production-ready!
