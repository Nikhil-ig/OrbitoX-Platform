'use client';

import React, { useState, useEffect } from 'react';
import HospitalNavLayout from './components/HospitalNavLayout';
import Link from 'next/link';
import { useStaffAuth } from './context/StaffAuthContext';

interface BedStation {
  id: string;
  label: string;
  wardId: string;
  type: string;
  status: 'available' | 'occupied' | 'alarm' | 'sanitizing';
  isTemporary?: boolean;
  dailyRate: number;
  attachedEquipment?: Array<{ model?: string; deviceId?: string; status: string }>;
  patient?: {
    id: string;
    name: string;
    age: number;
    gender: string;
    bloodGroup?: string;
    category?: string;
    diagnosis?: string;
    attendingDoctorId: string;
    admittedAt: string;
    allergies?: string[];
    phone?: string;
    email?: string;
  } | null;
  vitals?: {
    spo2: number;
    hr: number;
    bp: string;
    temp: number;
    resp: number;
  };
}

interface HospitalStats {
  totalPatients: number;
  malePatients: number;
  femalePatients: number;
  malePercent: number;
  femalePercent: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  totalRooms: number;
  totalAppointments: number;
  totalTreatments: number;
  occupancyRate: number;
}

interface AuditLogEntry {
  id?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  occurredAt?: string;
  timestamp?: string;
  reason?: string;
  rowHash?: string;
  userId?: string;
  contextId?: string;
  [key: string]: any;
}

export default function BeautifulHospitalDashboard() {
  const { currentStaff, isDoctor, isNurse, isPharmacist, isLabTech, isAdmin, isSuperAdmin, can } = useStaffAuth();
  const [beds, setBeds] = useState<BedStation[]>([]);
  const [stats, setStats] = useState<HospitalStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [breakGlass, setBreakGlass] = useState(false);
  const [breakGlassToken, setBreakGlassToken] = useState<string | null>(null);
  const [simulatingAlarm, setSimulatingAlarm] = useState(false);
  // Custom Toast Notifications
  const [toasts, setToasts] = useState<{ id: string; type: 'success' | 'error' | 'info'; title: string; message: string }[]>([]);
  const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Comprehensive Admit form state (ALL FIELDS)
  const [admitName, setAdmitName] = useState('');
  const [admitAge, setAdmitAge] = useState('34');
  const [admitGender, setAdmitGender] = useState<'M' | 'F' | 'Other'>('F');
  const [admitBlood, setAdmitBlood] = useState('O+');
  const [admitPhone, setAdmitPhone] = useState('+1 (805) 529-1832');
  const [admitEmail, setAdmitEmail] = useState('');
  const [admitCategory, setAdmitCategory] = useState('general');
  const [admitTriage, setAdmitTriage] = useState('3');
  const [admitBedId, setAdmitBedId] = useState('');
  const [admitDoctor, setAdmitDoctor] = useState('dr_ashlynn_01');
  const [admitStatus, setAdmitStatus] = useState('pre_registered');
  const [admitDiag, setAdmitDiag] = useState('Clinical Intake & Consultation');
  const [admitAllergies, setAdmitAllergies] = useState('NKDA (No Known Drug Allergies)');
  const [admitEmergName, setAdmitEmergName] = useState('John Connor');
  const [admitEmergPhone, setAdmitEmergPhone] = useState('+1 (555) 992-1100');
  const [admitEmergRelation, setAdmitEmergRelation] = useState('Family');
  const [admitInsurance, setAdmitInsurance] = useState('Blue Cross Blue Shield');
  const [admitPolicyNo, setAdmitPolicyNo] = useState('BCBS-982144');
  const [admitNotes, setAdmitNotes] = useState('Patient registration record created. Baseline vitals monitoring protocol activated.');
  const [isAdmitting, setIsAdmitting] = useState(false);

  // Timeframe filter
  const [timeframe, setTimeframe] = useState<'Monthly' | 'Weekly' | 'Daily'>('Monthly');

  // Staff Doctors List from Live Staff Directory
  const [staffDoctors, setStaffDoctors] = useState<any[]>([]);

  // Auxiliary clinical subsystem summaries
  const [labSummary, setLabSummary] = useState<{ total: number; stat: number; critical: number }>({ total: 0, stat: 0, critical: 0 });
  const [billingSummary, setBillingSummary] = useState<{ total: number; collected: number; due: number }>({ total: 0, collected: 0, due: 0 });
  const [rxSummary, setRxSummary] = useState<{ total: number; pendingDispense: number }>({ total: 0, pendingDispense: 0 });

  // 1. Fetch Real Stats directly from OrbitoX Database
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/hospital/stats');
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  // Fetch Auxiliary Subsystems Stats
  const fetchAuxStats = async () => {
    try {
      const [labsRes, billingRes, rxRes] = await Promise.all([
        fetch('/api/hospital/labs').then(r => r.json()).catch(() => ({ data: [] })),
        fetch('/api/hospital/billing').then(r => r.json()).catch(() => ({ data: [] })),
        fetch('/api/hospital/treatments').then(r => r.json()).catch(() => ({ data: [] }))
      ]);

      if (labsRes.data) {
        const total = labsRes.data.length;
        const stat = labsRes.data.filter((l: any) => l.priority === 'stat' || l.priority === 'urgent').length;
        const critical = labsRes.data.filter((l: any) => l.isCriticalValue).length;
        setLabSummary({ total, stat, critical });
      }

      if (billingRes.data) {
        let collected = 0;
        let due = 0;
        billingRes.data.forEach((inv: any) => {
          if (inv.status === 'paid') collected += (inv.subtotal || 0);
          else due += (inv.patientDue || 0);
        });
        setBillingSummary({ total: billingRes.data.length, collected, due });
      }

      if (rxRes.data) {
        const total = rxRes.data.length;
        const pendingDispense = rxRes.data.filter((t: any) => t.status === 'ordered').length;
        setRxSummary({ total, pendingDispense });
      }
    } catch (err) {
      console.error('Failed to fetch auxiliary stats:', err);
    }
  };

  // 2. Fetch Real Beds from OrbitoX Database
  const fetchLiveBeds = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/hospital/beds');
      const data = await res.json();
      if (data.success && data.data) {
        const enrichedBeds: BedStation[] = data.data.map((b: any) => ({
          ...b,
          vitals: b.vitals || {
            spo2: b.status === 'occupied' ? 98 : 99,
            hr: b.status === 'occupied' ? 82 : 70,
            bp: '124/80',
            temp: 37.0,
            resp: 16
          }
        }));
        setBeds(enrichedBeds);
      }
    } catch (err) {
      console.error('Failed to fetch beds from OrbitoX DB:', err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Fetch Real Cryptographic SHA-256 Audit Logs from OrbitoX
  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/hospital/audit');
      const data = await res.json();
      if (data.success && data.data) {
        setAuditLogs(data.data.slice(-6).reverse());
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    }
  };

  // 4. Fetch Staff Directory
  const fetchStaffDoctors = async () => {
    try {
      const res = await fetch('/api/hospital/security/staff');
      const data = await res.json();
      if (data.success && data.data) {
        const docs = data.data.filter((s: any) =>
          s.role.includes('doctor') ||
          s.role === 'department_head' ||
          s.role === 'facility_director' ||
          s.role === 'super_admin'
        );
        setStaffDoctors(docs);
        if (docs.length > 0) {
          let defaultDocName = docs[0].name;
          const saved = localStorage.getItem('orbitox_active_clinical_staff');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              const match = docs.find((d: any) => d.id === parsed.id || d.name === parsed.name);
              if (match) defaultDocName = match.name;
            } catch {}
          }
          setAdmitDoctor(defaultDocName);
        }
      }
    } catch (err) {
      console.error('Failed to fetch staff directory in dashboard:', err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchAuxStats();
    fetchLiveBeds();
    fetchAuditLogs();
    fetchStaffDoctors();

    const handleSessionChange = () => {
      fetchStaffDoctors();
      fetchAuxStats();
    };

    window.addEventListener('orbitox_staff_session_changed', handleSessionChange);
    return () => window.removeEventListener('orbitox_staff_session_changed', handleSessionChange);
  }, []);

  // 4. Handle Comprehensive Patient Admission (ALL FIELDS)
  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admitName) return;

    if (admitStatus === 'admitted' && !admitBedId) {
      showToast('error', 'Bed Required', 'Please select an inpatient bed station to admit this patient.');
      return;
    }

    setIsAdmitting(true);
    try {
      const res = await fetch('/api/hospital/admissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: admitName,
          age: parseInt(admitAge) || 30,
          gender: admitGender,
          bloodGroup: admitBlood,
          phone: admitPhone,
          email: admitEmail || `${admitName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          category: admitCategory,
          triageLevel: parseInt(admitTriage) || 3,
          bedId: admitBedId || undefined,
          attendingDoctorId: admitDoctor,
          status: admitStatus,
          diagnosis: admitDiag,
          allergies: admitAllergies,
          emergencyContactName: admitEmergName,
          emergencyContactPhone: admitEmergPhone,
          emergencyContactRelation: admitEmergRelation,
          insuranceProvider: admitInsurance,
          policyNumber: admitPolicyNo,
          clinicalNotes: admitNotes
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast('success', 'Patient Registered', `Successfully registered ${admitName} (${admitStatus.toUpperCase()}).`);
        setShowAdmitModal(false);
        setAdmitName('');
        await Promise.all([fetchStats(), fetchLiveBeds(), fetchAuditLogs()]);
      } else {
        showToast('error', 'Registration Failed', data.error || 'Admission failed');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Admission failed');
    } finally {
      setIsAdmitting(false);
    }
  };

  // 5. Trigger Code Blue Telemetry Breach via API -> writes to DB & audit
  const triggerCodeBlue = async () => {
    const occupied = beds.find(b => b.status === 'occupied') || beds[0];
    if (!occupied) return;

    setSimulatingAlarm(true);
    try {
      const res = await fetch('/api/hospital/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bedId: occupied.id,
          vitals: {
            spo2: 81,
            heartRate: 155,
            bpSys: 185,
            bpDia: 110,
            temperature: 39.4,
            respiratoryRate: 32,
            timestamp: new Date().toISOString()
          }
        })
      });

      const data = await res.json();
      if (data.status === 'alarm') {
        setBeds(prev => prev.map(b => b.id === occupied.id ? { ...b, status: 'alarm' } : b));
        await Promise.all([fetchStats(), fetchAuditLogs()]);
      }
    } catch (err) {
      console.error('Failed to trigger Code Blue:', err);
    } finally {
      setSimulatingAlarm(false);
    }
  };

  // 6. Emergency Break-Glass Mode
  const triggerBreakGlass = async () => {
    try {
      const res = await fetch('/api/hospital/security/break-glass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: 'dr_ashlynn_01',
          reason: 'Emergency Level 1 Polytrauma Override',
          patientId: beds.find(b => b.patient)?.patient?.id || 'pat-tony-01'
        })
      });
      const data = await res.json();
      if (data.override?.token) {
        setBreakGlassToken(data.override.token);
        setBreakGlass(true);
        await fetchAuditLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalPatients = stats?.totalPatients ?? beds.filter(b => b.patient).length;
  const totalRooms = stats?.totalRooms ?? 1;
  const totalBeds = stats?.totalBeds ?? beds.length;
  const totalAppointments = stats?.totalAppointments ?? 4;
  const malePercent = stats?.malePercent ?? 50;
  const femalePercent = stats?.femalePercent ?? 50;
  const occupiedBeds = stats?.occupiedBeds ?? beds.filter(b => b.status === 'occupied').length;
  const availableBeds = stats?.availableBeds ?? beds.filter(b => b.status === 'available').length;

  return (
    <HospitalNavLayout
      headerTitle={`Good Day, ${currentStaff?.name || 'Clinician'} 👋`}
      headerSubtitle={`Active Shift: ${currentStaff?.customTitle || currentStaff?.roleDisplayName || currentStaff?.role || 'Clinical Services'} • 📍 ${currentStaff?.contextName || currentStaff?.departmentName || 'Apollo Hospital New York'}`}
      actions={
        can('patient.admit') ? (
          <button
            onClick={() => setShowAdmitModal(true)}
            style={{
              background: 'linear-gradient(135deg, #1e60ff 0%, #2563eb 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '24px',
              padding: '10px 22px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(30, 96, 255, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'transform 0.15s ease'
            }}
          >
            <span>+</span> Admit Patient
          </button>
        ) : isNurse ? (
          <Link
            href="/hms/beds"
            style={{
              background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '24px',
              padding: '10px 22px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(236, 72, 153, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none'
            }}
          >
            <span>🩺</span> Bedside Vitals Rounds
          </Link>
        ) : isPharmacist ? (
          <Link
            href="/hms/pharmacy"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '24px',
              padding: '10px 22px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none'
            }}
          >
            <span>💊</span> Dispense eMAR Queue
          </Link>
        ) : isLabTech ? (
          <Link
            href="/hms/labs"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '24px',
              padding: '10px 22px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(245, 158, 11, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none'
            }}
          >
            <span>🔬</span> Process Specimen Labs
          </Link>
        ) : null
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
        
        {/* Floating Custom Toast Notifications */}
        <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 999, display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '380px' }}>
          {toasts.map(t => (
            <div
              key={t.id}
              style={{
                padding: '14px 18px',
                borderRadius: '18px',
                background: t.type === 'success' ? '#0f172a' : t.type === 'error' ? '#7f1d1d' : '#1e293b',
                color: '#ffffff',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)',
                border: t.type === 'success' ? '1px solid #10b981' : t.type === 'error' ? '1px solid #ef4444' : '1px solid #3b82f6',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                animation: 'fadeIn 0.2s ease-in-out'
              }}
            >
              <span style={{ fontSize: '16px' }}>{t.type === 'success' ? '✅' : t.type === 'error' ? '⚠️' : 'ℹ️'}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '13px' }}>{t.title}</div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '2px' }}>{t.message}</div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Break-Glass Notification Banner if Active */}
        {breakGlass && (
          <div
            style={{
              padding: '16px 24px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(244, 63, 94, 0.12))',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>🚨</span>
              <div>
                <strong style={{ color: '#b91c1c', fontSize: '14px' }}>EMERGENCY BREAK-GLASS OVERRIDE ACTIVE</strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#ef4444' }}>
                  Zero-Trust RBAC bypassed for 30 minutes. Token: <code style={{ background: '#ffffff', padding: '2px 6px', borderRadius: '4px' }}>{breakGlassToken?.slice(0, 16)}...</code>
                </p>
              </div>
            </div>
            <button
              onClick={() => setBreakGlass(false)}
              style={{
                padding: '6px 14px',
                borderRadius: '12px',
                border: '1px solid #ef4444',
                background: '#ffffff',
                color: '#ef4444',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 🚨 ACTIVE STAT CRITICAL CLINICAL ALERTS STRIP (Real-time Breaches) */}
        {(labSummary.critical > 0 || beds.some(b => b.status === 'alarm') || rxSummary.pendingDispense > 0) && (
          <div
            style={{
              padding: '14px 20px',
              borderRadius: '20px',
              background: beds.some(b => b.status === 'alarm') || labSummary.critical > 0
                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(220, 38, 38, 0.08))'
                : 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(217, 119, 6, 0.08))',
              border: beds.some(b => b.status === 'alarm') || labSummary.critical > 0
                ? '1px solid rgba(239, 68, 68, 0.3)'
                : '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>
                {beds.some(b => b.status === 'alarm') ? '🚨' : labSummary.critical > 0 ? '🔬' : '💊'}
              </span>
              <div>
                <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                  {beds.some(b => b.status === 'alarm')
                    ? 'EMERGENCY: Code Blue Vitals Breach Detected in Inpatient Wards'
                    : labSummary.critical > 0
                    ? `STAT CRITICAL: ${labSummary.critical} Diagnostic Lab Result(s) Out-of-Bounds`
                    : `PHARMACY QUEUE: ${rxSummary.pendingDispense} Prescription(s) Awaiting Pharmacist Dispense`}
                </strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#475569' }}>
                  {beds.some(b => b.status === 'alarm')
                    ? 'Attending resuscitation teams paged. Silence alarm or review telemetry curve.'
                    : labSummary.critical > 0
                    ? 'Urgent pathology values require immediate clinician review and treatment escalation.'
                    : '5-Rights verification pending in Central Pharmacy eMAR queue.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {beds.some(b => b.status === 'alarm') && (
                <Link
                  href="/hms/telemetry"
                  style={{
                    padding: '6px 14px',
                    borderRadius: '12px',
                    background: '#dc2626',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    textDecoration: 'none'
                  }}
                >
                  View Telemetry →
                </Link>
              )}
              {labSummary.critical > 0 && (
                <Link
                  href="/hms/labs"
                  style={{
                    padding: '6px 14px',
                    borderRadius: '12px',
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    textDecoration: 'none'
                  }}
                >
                  Review Labs ({labSummary.critical}) →
                </Link>
              )}
              {rxSummary.pendingDispense > 0 && (
                <Link
                  href="/hms/pharmacy"
                  style={{
                    padding: '6px 14px',
                    borderRadius: '12px',
                    background: '#d97706',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    textDecoration: 'none'
                  }}
                >
                  Dispense eMAR ({rxSummary.pendingDispense}) →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* 🌟 ENTERPRISE CLINICAL SUBSYSTEMS LAUNCHPAD (Deeply Interconnected 6-Module Hub) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          
          {/* Module 1: Labs */}
          <Link
            href="/hms/labs"
            style={{
              textDecoration: 'none',
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              borderRadius: '20px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '10px',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 14px rgba(30, 96, 255, 0.04)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.1)', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                🔬
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: labSummary.critical > 0 ? '#ef4444' : '#9333ea', background: labSummary.critical > 0 ? '#fee2e2' : 'rgba(168, 85, 247, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                {labSummary.critical > 0 ? `${labSummary.critical} CRITICAL` : `${labSummary.total} Total`}
              </span>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>Pathology Labs</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>STAT Orders & Ref Ranges</div>
            </div>
          </Link>

          {/* Module 2: Pharmacy */}
          <Link
            href="/hms/pharmacy"
            style={{
              textDecoration: 'none',
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              borderRadius: '20px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '10px',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 14px rgba(30, 96, 255, 0.04)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                💊
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: rxSummary.pendingDispense > 0 ? '#d97706' : '#10b981', background: rxSummary.pendingDispense > 0 ? '#fef3c7' : 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                {rxSummary.pendingDispense > 0 ? `${rxSummary.pendingDispense} To Dispense` : 'Ready'}
              </span>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>eMAR Pharmacy</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>5-Rights Closed Loop</div>
            </div>
          </Link>

          {/* Module 3: Telemetry */}
          <Link
            href="/hms/telemetry"
            style={{
              textDecoration: 'none',
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              borderRadius: '20px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '10px',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 14px rgba(30, 96, 255, 0.04)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                📡
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                NEWS2 Live
              </span>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>IoT Telemetry</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>ECG Waves & Vitals</div>
            </div>
          </Link>

          {/* Module 4: Billing */}
          <Link
            href="/hms/billing"
            style={{
              textDecoration: 'none',
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              borderRadius: '20px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '10px',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 14px rgba(30, 96, 255, 0.04)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'rgba(14, 165, 233, 0.1)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                💳
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7', background: 'rgba(14, 165, 233, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                ${billingSummary.due.toLocaleString()} Due
              </span>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>Revenue & Billing</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Inpatient Invoicing & Claims</div>
            </div>
          </Link>

          {/* Module 5: Bed Matrix */}
          <Link
            href="/hms/beds"
            style={{
              textDecoration: 'none',
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              borderRadius: '20px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '10px',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 14px rgba(30, 96, 255, 0.04)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'rgba(30, 96, 255, 0.1)', color: '#1e60ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                🛏️
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e60ff', background: 'rgba(30, 96, 255, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                {availableBeds} Free / {totalBeds}
              </span>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>Bed Station Matrix</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Turnover & Devices</div>
            </div>
          </Link>

          {/* Module 6: Staff & Governance */}
          <Link
            href="/hms/staff"
            style={{
              textDecoration: 'none',
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              borderRadius: '20px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '10px',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 14px rgba(30, 96, 255, 0.04)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                👥
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                {staffDoctors.length} On Duty
              </span>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>Staff Directory</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>RBAC & Shift Handovers</div>
            </div>
          </Link>

        </div>

        {/* ─── ROLE-TAILORED CLINICAL PERSONA WORKSPACE BANNER ─── */}
        <div
          style={{
            background: isDoctor
              ? 'linear-gradient(135deg, rgba(30, 96, 255, 0.08) 0%, rgba(59, 130, 246, 0.04) 100%)'
              : isNurse
              ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.08) 0%, rgba(244, 114, 182, 0.04) 100%)'
              : isPharmacist
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(52, 211, 153, 0.04) 100%)'
              : isLabTech
              ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(251, 191, 36, 0.04) 100%)'
              : 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.04) 100%)',
            border: isDoctor
              ? '1px solid rgba(30, 96, 255, 0.25)'
              : isNurse
              ? '1px solid rgba(236, 72, 153, 0.25)'
              : isPharmacist
              ? '1px solid rgba(16, 185, 129, 0.25)'
              : isLabTech
              ? '1px solid rgba(245, 158, 11, 0.25)'
              : '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '24px',
            padding: '18px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.02)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '16px',
                background: isDoctor ? '#1e60ff' : isNurse ? '#ec4899' : isPharmacist ? '#10b981' : isLabTech ? '#f59e0b' : '#6366f1',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)'
              }}
            >
              {isDoctor ? '👨‍⚕️' : isNurse ? '👩‍⚕️' : isPharmacist ? '💊' : isLabTech ? '🔬' : '👑'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  {isDoctor
                    ? 'Attending Physician Clinical Rounds Hub'
                    : isNurse
                    ? 'Ward Nursing Station & Bedside BCMA Hub'
                    : isPharmacist
                    ? 'Central Pharmacy Dispensing & Formulary Hub'
                    : isLabTech
                    ? 'Diagnostic Pathology & Specimen Processing Hub'
                    : 'Global Hospital Executive Governance Hub'}
                </h3>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    color: isDoctor ? '#1e60ff' : isNurse ? '#ec4899' : isPharmacist ? '#10b981' : isLabTech ? '#f59e0b' : '#6366f1',
                    border: '1px solid currentColor'
                  }}
                >
                  {currentStaff?.role?.toUpperCase().replace('_', ' ') || 'ACTIVE ROLE'}
                </span>
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                {isDoctor
                  ? 'Access assigned inpatient rounds, clinical SOAP notes, eMAR prescriptions, and STAT emergency lab requisitions.'
                  : isNurse
                  ? 'Monitor bedside NEWS2 vitals, 5-rights barcode medication rounds, ward turnover, and SBAR shift handovers.'
                  : isPharmacist
                  ? 'Validate electronic prescriptions, drug-drug interactions, batch formulary restock, and ADR logging.'
                  : isLabTech
                  ? 'Generate phlebotomy specimen barcodes, enter analyzer diagnostic findings, and dispatch STAT panic alerts.'
                  : 'Manage enterprise organizational hierarchy, inpatient superbill billing settlement, and cryptographic SHA-256 audit ledgers.'}
              </p>
            </div>
          </div>

          {/* Persona 1-Click Fast Actions */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {isDoctor && (
              <>
                <Link href="/hms/patients" style={{ padding: '8px 14px', borderRadius: '12px', background: '#1e60ff', color: '#fff', fontSize: '12px', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(30, 96, 255, 0.3)' }}>
                  📋 Patient Rounds ({totalPatients})
                </Link>
                <Link href="/hms/pharmacy" style={{ padding: '8px 14px', borderRadius: '12px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#1e60ff', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>
                  💊 Quick Prescribe
                </Link>
                <Link href="/hms/labs" style={{ padding: '8px 14px', borderRadius: '12px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>
                  🔬 Order STAT Lab
                </Link>
              </>
            )}
            {isNurse && (
              <>
                <Link href="/hms/patients" style={{ padding: '8px 14px', borderRadius: '12px', background: '#ec4899', color: '#fff', fontSize: '12px', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(236, 72, 153, 0.3)' }}>
                  🩺 Log Bedside Vitals (NEWS2)
                </Link>
                <Link href="/hms/pharmacy" style={{ padding: '8px 14px', borderRadius: '12px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#ec4899', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>
                  📱 BCMA Med Rounds
                </Link>
                <Link href="/hms/beds" style={{ padding: '8px 14px', borderRadius: '12px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>
                  🛏️ Bed Matrix & Turnover
                </Link>
              </>
            )}
            {isPharmacist && (
              <>
                <Link href="/hms/pharmacy" style={{ padding: '8px 14px', borderRadius: '12px', background: '#10b981', color: '#fff', fontSize: '12px', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)' }}>
                  ⚡ Dispense eMAR Queue ({rxSummary.pendingDispense})
                </Link>
                <Link href="/hms/pharmacy" style={{ padding: '8px 14px', borderRadius: '12px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#10b981', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>
                  📦 Formulary Stock
                </Link>
              </>
            )}
            {isLabTech && (
              <>
                <Link href="/hms/labs" style={{ padding: '8px 14px', borderRadius: '12px', background: '#f59e0b', color: '#fff', fontSize: '12px', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)' }}>
                  🩸 Specimen Barcodes
                </Link>
                <Link href="/hms/labs" style={{ padding: '8px 14px', borderRadius: '12px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>
                  🔬 Enter Findings
                </Link>
              </>
            )}
            {isAdmin && (
              <>
                <Link href="/hms/staff" style={{ padding: '8px 14px', borderRadius: '12px', background: '#6366f1', color: '#fff', fontSize: '12px', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)' }}>
                  👥 Staff Directory & RBAC
                </Link>
                <Link href="/hms/billing" style={{ padding: '8px 14px', borderRadius: '12px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#6366f1', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>
                  💳 Settle Superbills
                </Link>
              </>
            )}
          </div>
        </div>

        {/* 1. TOP ROW: 3 KPI CARDS (Real Database Data) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          
          {/* Card 1: Total Patient */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.95)',
              borderRadius: '28px',
              padding: '24px 28px',
              boxShadow: '0 10px 30px rgba(37, 99, 235, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '20px',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'rgba(30, 96, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#1e60ff'
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#334155' }}>Total Patient</span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                REAL DB
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <span style={{ fontSize: '38px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>
                {totalPatients}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: 'rgba(30, 96, 255, 0.08)',
                  color: '#1e60ff',
                  fontSize: '12px',
                  fontWeight: 700
                }}
              >
                ↗ Admitted <span style={{ fontWeight: 500, color: '#64748b' }}>active in wards</span>
              </span>
            </div>

            <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
              <div>Male <strong style={{ color: '#0f172a', fontWeight: 700 }}>{stats?.malePatients ?? 0}</strong></div>
              <div>Female <strong style={{ color: '#0f172a', fontWeight: 700 }}>{stats?.femalePatients ?? 0}</strong></div>
            </div>
          </div>

          {/* Card 2: Overall Room / Beds */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.95)',
              borderRadius: '28px',
              padding: '24px 28px',
              boxShadow: '0 10px 30px rgba(37, 99, 235, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '20px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'rgba(14, 165, 233, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0284c7'
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M8 12h8"></path>
                    <path d="M12 8v8"></path>
                  </svg>
                </div>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#334155' }}>Ward Bed Stations</span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7', background: 'rgba(14, 165, 233, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                REAL DB
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <span style={{ fontSize: '38px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>
                {totalBeds}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: 'rgba(14, 165, 233, 0.08)',
                  color: '#0284c7',
                  fontSize: '12px',
                  fontWeight: 700
                }}
              >
                {stats?.occupancyRate ?? 75}% <span style={{ fontWeight: 500, color: '#64748b' }}>Occupancy</span>
              </span>
            </div>

            <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
              <div>Occupied <strong style={{ color: '#1e60ff', fontWeight: 700 }}>{occupiedBeds}</strong></div>
              <div>Available <strong style={{ color: '#10b981', fontWeight: 700 }}>{availableBeds}</strong></div>
            </div>
          </div>

          {/* Card 3: Appointment */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.95)',
              borderRadius: '28px',
              padding: '24px 28px',
              boxShadow: '0 10px 30px rgba(37, 99, 235, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '20px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'rgba(99, 102, 241, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#4f46e5'
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#334155' }}>Appointments</span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5', background: 'rgba(99, 102, 241, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                REAL DB
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <span style={{ fontSize: '38px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>
                {totalAppointments}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: 'rgba(99, 102, 241, 0.08)',
                  color: '#4f46e5',
                  fontSize: '12px',
                  fontWeight: 700
                }}
              >
                Scheduled <span style={{ fontWeight: 500, color: '#64748b' }}>active clinic</span>
              </span>
            </div>

            <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
              <div>Rx Orders <strong style={{ color: '#0f172a', fontWeight: 700 }}>{stats?.totalTreatments ?? 4}</strong></div>
              <div>Consultations <strong style={{ color: '#0f172a', fontWeight: 700 }}>{totalAppointments}</strong></div>
            </div>
          </div>

        </div>

        {/* 2. MIDDLE ROW: ANALYTICS BAR CHART & GENDER GAUGE */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '20px' }}>
          
          {/* Analytics Chart */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.95)',
              borderRadius: '28px',
              padding: '24px 30px',
              boxShadow: '0 10px 30px rgba(37, 99, 235, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Clinical Activity Analytics</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '6px' }}>
                  <span style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a' }}>{totalPatients}</span>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '16px',
                      background: 'rgba(30, 96, 255, 0.08)',
                      color: '#1e60ff',
                      fontSize: '11px',
                      fontWeight: 700
                    }}
                  >
                    Active Cases
                  </span>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>in Apollo Hospital</span>
                </div>
              </div>

              {/* Monthly Dropdown Pill */}
              <button
                onClick={() => setTimeframe(t => t === 'Monthly' ? 'Weekly' : 'Monthly')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '20px',
                  background: 'rgba(241, 245, 249, 0.8)',
                  border: '1px solid #e2e8f0',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                {timeframe}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>

            {/* Custom SVG Bar Chart */}
            <div style={{ height: '220px', width: '100%', position: 'relative', marginTop: '10px' }}>
              <svg width="100%" height="100%" viewBox="0 0 540 200" preserveAspectRatio="none">
                <defs>
                  <pattern id="diagonalHatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="0" y2="6" stroke="#93c5fd" strokeWidth="2.5" />
                  </pattern>

                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1e60ff" />
                    <stop offset="100%" stopColor="#00b4d8" />
                  </linearGradient>

                  <pattern id="dotPattern" width="4" height="4" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1" fill="#60a5fa" />
                  </pattern>
                </defs>

                <line x1="20" y1="20" x2="520" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="20" y1="60" x2="520" y2="60" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="20" y1="100" x2="520" y2="100" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="20" y1="140" x2="520" y2="140" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="20" y1="170" x2="520" y2="170" stroke="#e2e8f0" />

                {[
                  { day: 'Sun', height: 90, topHatch: 25, x: 45 },
                  { day: 'Mon', height: 120, topHatch: 35, x: 115 },
                  { day: 'Tue', height: 140, topHatch: 40, x: 185 },
                  { day: 'Wed', height: 160, topHatch: 45, x: 255 },
                  { day: 'Thu', height: 110, topHatch: 30, x: 325 },
                  { day: 'Fri', height: 135, topHatch: 35, x: 395 },
                  { day: 'Sat', height: 85, topHatch: 25, x: 465 },
                ].map((bar, i) => {
                  const yBase = 170;
                  const barWidth = 36;
                  const bodyHeight = bar.height - bar.topHatch;
                  const yBody = yBase - bodyHeight;
                  const yTop = yBody - bar.topHatch;

                  return (
                    <g key={i}>
                      <rect
                        x={bar.x}
                        y={yTop}
                        width={barWidth}
                        height={bar.topHatch}
                        rx="10"
                        fill="url(#diagonalHatch)"
                      />

                      <rect
                        x={bar.x}
                        y={yBody}
                        width={barWidth}
                        height={bodyHeight}
                        rx="10"
                        fill="url(#barGradient)"
                      />

                      <rect
                        x={bar.x}
                        y={yBase - 16}
                        width={barWidth}
                        height="16"
                        rx="4"
                        fill="url(#dotPattern)"
                      />

                      <text
                        x={bar.x + barWidth / 2}
                        y="190"
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="11"
                        fontWeight="600"
                      >
                        {bar.day}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Gender Demographics Gauge */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.95)',
              borderRadius: '28px',
              padding: '24px 28px',
              boxShadow: '0 10px 30px rgba(37, 99, 235, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '340px'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Gender Ratio</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>{totalPatients}</span>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Total Inpatients</span>
                </div>
              </div>

              <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e60ff', background: 'rgba(30, 96, 255, 0.1)', padding: '4px 10px', borderRadius: '12px' }}>
                LIVE RATIO
              </span>
            </div>

            {/* Concentric Gauge Visualization */}
            <div style={{ width: '100%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '4px', marginBottom: '4px' }}>
              <svg width="240" height="135" viewBox="0 0 240 135" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="maleGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#1e60ff" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                  <linearGradient id="femaleGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>
                </defs>

                {/* Base Track */}
                <path
                  d="M 35 115 A 85 85 0 0 1 205 115"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="18"
                  strokeLinecap="round"
                />

                {/* Female Arc Segment */}
                <path
                  d="M 35 115 A 85 85 0 0 1 205 115"
                  fill="none"
                  stroke="url(#femaleGaugeGradient)"
                  strokeWidth="18"
                  strokeDasharray="267"
                  strokeDashoffset="0"
                  strokeLinecap="round"
                />

                {/* Male Arc Segment */}
                <path
                  d="M 35 115 A 85 85 0 0 1 205 115"
                  fill="none"
                  stroke="url(#maleGaugeGradient)"
                  strokeWidth="18"
                  strokeDasharray={`${(malePercent / 100) * 267} 267`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                />
              </svg>

              {/* Inside Dome Numbers */}
              <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Inpatients</div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', lineHeight: 1.15, marginTop: '2px' }}>{totalPatients}</div>
              </div>
            </div>

            {/* Structured Dual Demographic Badges */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '16px',
                  background: 'rgba(30, 96, 255, 0.05)',
                  border: '1px solid rgba(30, 96, 255, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1e60ff' }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Male</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{Math.round((totalPatients * malePercent) / 100)}</span>
                  <span style={{ fontSize: '11px', color: '#1e60ff', fontWeight: 700, marginLeft: '4px' }}>{malePercent}%</span>
                </div>
              </div>

              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '16px',
                  background: 'rgba(6, 182, 212, 0.06)',
                  border: '1px solid rgba(6, 182, 212, 0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#06b6d4' }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Female</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{totalPatients - Math.round((totalPatients * malePercent) / 100)}</span>
                  <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 700, marginLeft: '4px' }}>{femalePercent}%</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* 3. BOTTOM ROW: REAL BEDS & REAL AUDIT LEDGER */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
          
          {/* Live Inpatient Census */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.95)',
              borderRadius: '28px',
              padding: '24px 28px',
              boxShadow: '0 10px 30px rgba(37, 99, 235, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Live Bed Stations</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Real-time stations in OrbitoX 6-Tier Context Hierarchy & DB
                </p>
              </div>
              <Link
                href="/hms/beds"
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#1e60ff',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                View Matrix →
              </Link>
            </div>

            {/* Bed Cards List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Loading live beds from OrbitoX...</div>
              ) : beds.slice(0, 4).map((bed) => (
                <div
                  key={bed.id}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '18px',
                    background: bed.status === 'alarm' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(248, 250, 252, 0.8)',
                    border: `1px solid ${bed.status === 'alarm' ? 'rgba(239, 68, 68, 0.3)' : '#f1f5f9'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '12px',
                        background: bed.status === 'occupied' ? '#e0f2fe' : bed.status === 'alarm' ? '#fee2e2' : '#ecfdf5',
                        color: bed.status === 'occupied' ? '#0284c7' : bed.status === 'alarm' ? '#ef4444' : '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '14px'
                      }}
                    >
                      🛏️
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{bed.label}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {bed.patient ? `${bed.patient.name} (${bed.patient.diagnosis || 'Admitted'})` : 'No Patient Admitted (Available)'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: bed.status === 'occupied' ? 'rgba(30, 96, 255, 0.1)' : bed.status === 'alarm' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                        color: bed.status === 'occupied' ? '#1e60ff' : bed.status === 'alarm' ? '#ef4444' : '#10b981'
                      }}
                    >
                      ● {bed.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                onClick={triggerCodeBlue}
                disabled={simulatingAlarm}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '14px',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  background: 'rgba(239, 68, 68, 0.06)',
                  color: '#dc2626',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {simulatingAlarm ? 'Simulating...' : '⚡ Trigger Code Blue'}
              </button>

              <button
                onClick={triggerBreakGlass}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '14px',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  background: 'rgba(245, 158, 11, 0.06)',
                  color: '#d97706',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                🛡️ Break-Glass Override
              </button>
            </div>
          </div>

          {/* Real SHA-256 Audit Ledger Feed */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.95)',
              borderRadius: '28px',
              padding: '24px 28px',
              boxShadow: '0 10px 30px rgba(37, 99, 235, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Audit Vault Ledger</h3>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '3px 8px', borderRadius: '10px' }}>
                SHA-256 Verified
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '250px' }}>
              {auditLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '12px' }}>
                  No recent audit logs
                </div>
              ) : (
                auditLogs.map((log, idx) => (
                  <div
                    key={log.id || idx}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '12px',
                      background: 'rgba(248, 250, 252, 0.8)',
                      border: '1px solid #f1f5f9',
                      fontSize: '11px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#1e293b' }}>
                      <span>{log.action}</span>
                      <span style={{ color: '#94a3b8', fontWeight: 500 }}>
                        {(log.occurredAt || log.timestamp) ? new Date((log.occurredAt || log.timestamp)!).toLocaleTimeString() : 'Just now'}
                      </span>
                    </div>
                    <div style={{ color: '#64748b', marginTop: '2px' }}>{log.reason || `Action executed on ${log.entityType || 'entity'}`}</div>
                    {log.rowHash && (
                      <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px', fontFamily: 'monospace' }}>
                        Hash: {log.rowHash.slice(0, 16)}...
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Comprehensive Patient Admission Modal (ALL FIELDS) */}
      {showAdmitModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
            overflowY: 'auto'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '780px',
              maxHeight: '90vh',
              background: '#ffffff',
              borderRadius: '28px',
              padding: '32px 36px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              overflowY: 'auto'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Admit Inpatient</h2>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e60ff', background: 'rgba(30, 96, 255, 0.1)', padding: '3px 8px', borderRadius: '12px' }}>
                    ● Enterprise Clinical Admission
                  </span>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  Complete all clinical, triage, insurance, and emergency fields. Data is persisted directly to OrbitoX DB and the SHA-256 audit ledger.
                </p>
              </div>

              <button
                onClick={() => setShowAdmitModal(false)}
                style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', fontSize: '16px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* SECTION 1: Patient Identity & Demographics */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#1e60ff', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  1. Patient Identity & Contact
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sarah Connor"
                      value={admitName}
                      onChange={e => setAdmitName(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Age *
                    </label>
                    <input
                      type="number"
                      required
                      value={admitAge}
                      onChange={e => setAdmitAge(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Gender *
                    </label>
                    <select
                      value={admitGender}
                      onChange={e => setAdmitGender(e.target.value as any)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', background: '#fff', boxSizing: 'border-box' }}
                    >
                      <option value="F">Female</option>
                      <option value="M">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Blood Group *
                    </label>
                    <select
                      value={admitBlood}
                      onChange={e => setAdmitBlood(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', background: '#fff', boxSizing: 'border-box' }}
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={admitPhone}
                      onChange={e => setAdmitPhone(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="patient@example.com"
                      value={admitEmail}
                      onChange={e => setAdmitEmail(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Clinical Triage & Placement */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  2. Clinical Triage & Placement
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  {/* CLINICAL STATUS (DEFAULT: PRE-REGISTERED) */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                      Clinical Status * (Default: Pre-Registered)
                    </label>
                    <select
                      value={admitStatus}
                      onChange={e => setAdmitStatus(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '2px solid #38bdf8', outline: 'none', fontSize: '13px', background: '#f0f9ff', fontWeight: 700, color: '#0369a1', boxSizing: 'border-box' }}
                    >
                      <option value="pre_registered">🟡 Pre-Registered / Intake Waiting</option>
                      <option value="triage">🔴 ER Triage & Rapid Assessment</option>
                      <option value="outpatient">🟣 Outpatient Specialist Consult</option>
                      <option value="admitted">🔵 Inpatient Admitted to Bed Station</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Assign Bed Station {admitStatus === 'admitted' ? '*' : '(Optional)'}
                    </label>
                    <select
                      value={admitBedId}
                      onChange={e => setAdmitBedId(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', background: '#fff', boxSizing: 'border-box' }}
                    >
                      <option value="">-- Unassigned (Waiting / Outpatient) --</option>
                      {beds.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.label} — ${b.dailyRate}/day ({b.status.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Patient Category
                    </label>
                    <select
                      value={admitCategory}
                      onChange={e => setAdmitCategory(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', background: '#fff', boxSizing: 'border-box' }}
                    >
                      <option value="general">General Inpatient</option>
                      <option value="vip">VIP Suite</option>
                      <option value="trauma">Emergency Trauma</option>
                      <option value="pediatric">Pediatric</option>
                      <option value="geriatric">Geriatric</option>
                      <option value="maternity">Maternity</option>
                      <option value="psychiatric">Psychiatric</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Triage Acuity Level
                    </label>
                    <select
                      value={admitTriage}
                      onChange={e => setAdmitTriage(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', background: '#fff', boxSizing: 'border-box' }}
                    >
                      <option value="1">Level 1 - Resuscitation (Immediate)</option>
                      <option value="2">Level 2 - Emergent (&lt;15 min)</option>
                      <option value="3">Level 3 - Urgent (&lt;30 min)</option>
                      <option value="4">Level 4 - Less Urgent (&lt;60 min)</option>
                      <option value="5">Level 5 - Non-Urgent (&lt;120 min)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Attending Physician
                    </label>
                    <select
                      value={admitDoctor}
                      onChange={e => setAdmitDoctor(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', background: '#fff', boxSizing: 'border-box' }}
                    >
                      {staffDoctors.length > 0 ? (
                        staffDoctors.map(doc => (
                          <option key={doc.id} value={doc.name}>
                            {doc.name} — {doc.customTitle || doc.roleDisplayName || doc.role} ({doc.contextName || 'General'})
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Dr. Ashlynn Carder">Dr. Ashlynn Carder (Lead Clinician)</option>
                          <option value="Dr. Stephen Strange">Dr. Stephen Strange (Cardiothoracic)</option>
                          <option value="Dr. Gregory House">Dr. Gregory House (Diagnostic Medicine)</option>
                          <option value="Dr. John Watson">Dr. John Watson (General Medicine)</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Medical Assessment & Safety */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  3. Clinical Diagnosis & Safety Alerts
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Primary Diagnosis / Chief Complaint *
                    </label>
                    <input
                      type="text"
                      required
                      value={admitDiag}
                      onChange={e => setAdmitDiag(e.target.value)}
                      placeholder="e.g. Acute Myocardial Infarction"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Known Allergies
                    </label>
                    <input
                      type="text"
                      value={admitAllergies}
                      onChange={e => setAdmitAllergies(e.target.value)}
                      placeholder="e.g. Penicillin, Latex, NSAIDs, None"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Initial Clinical & Triage Notes
                    </label>
                    <textarea
                      rows={2}
                      value={admitNotes}
                      onChange={e => setAdmitNotes(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: Emergency Contact & Insurance */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  4. Emergency Contact & Insurance Coverage
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Emergency Contact Name
                    </label>
                    <input
                      type="text"
                      value={admitEmergName}
                      onChange={e => setAdmitEmergName(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Emergency Contact Phone
                    </label>
                    <input
                      type="text"
                      value={admitEmergPhone}
                      onChange={e => setAdmitEmergPhone(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Insurance Carrier
                    </label>
                    <input
                      type="text"
                      value={admitInsurance}
                      onChange={e => setAdmitInsurance(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Policy / Member ID
                    </label>
                    <input
                      type="text"
                      value={admitPolicyNo}
                      onChange={e => setAdmitPolicyNo(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowAdmitModal(false)}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#64748b',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isAdmitting}
                  style={{
                    padding: '12px 28px',
                    borderRadius: '14px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #1e60ff 0%, #2563eb 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: '0 8px 20px rgba(30, 96, 255, 0.35)'
                  }}
                >
                  {isAdmitting ? 'Persisting to OrbitoX DB...' : 'Confirm Full Admission'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </HospitalNavLayout>
  );
}
