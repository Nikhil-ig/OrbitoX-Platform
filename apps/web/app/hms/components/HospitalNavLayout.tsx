'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStaffAuth, StaffProfile } from '../context/StaffAuthContext';
import { PlatformGovernanceDock } from '../../components/platform-governance-dock';
import { useAdmin } from '../../admin/data/admin-context';

interface HospitalNavLayoutProps {
  children: React.ReactNode;
  headerTitle?: string;
  headerSubtitle?: string;
  actions?: React.ReactNode;
}

export default function HospitalNavLayout({
  children,
  headerTitle,
  headerSubtitle,
  actions
}: HospitalNavLayoutProps) {
  const pathname = usePathname();
  const {
    currentStaff: activeStaff,
    allStaff: staffList,
    switchStaff,
    logout,
    can,
    isSuperAdmin,
    isDoctor,
    isNurse,
    isPharmacist,
    isLabTech,
    isDirector,
    isAdmin
  } = useStaffAuth();

  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const [showShiftSwitcherModal, setShowShiftSwitcherModal] = useState(false);
  const [showAlertDrawer, setShowAlertDrawer] = useState(false);
  const [showCommandModal, setShowCommandModal] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [commandData, setCommandData] = useState<{
    patients: any[];
    beds: any[];
    staff: any[];
    treatments: any[];
    labs: any[];
  }>({
    patients: [],
    beds: [],
    staff: [],
    treatments: [],
    labs: []
  });
  const [globalStats, setGlobalStats] = useState({
    alarmBeds: 0,
    orderedMeds: 0,
    triagePatients: 0,
    sanitizingBeds: 0,
    criticalLabs: 0,
    pendingInvoices: 0
  });
  const [searchShiftStaff, setSearchShiftStaff] = useState('');
  const [toasts, setToasts] = useState<{ id: string; type: 'success' | 'error' | 'info'; title: string; message: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const fetchGlobalStats = async () => {
    try {
      const [bedsRes, medsRes, ptsRes, labsRes, billsRes] = await Promise.all([
        fetch('/api/hospital/beds').catch(() => null),
        fetch('/api/hospital/treatments').catch(() => null),
        fetch('/api/hospital/patients').catch(() => null),
        fetch('/api/hospital/labs').catch(() => null),
        fetch('/api/hospital/billing').catch(() => null)
      ]);

      let alarmBeds = 0;
      let sanitizingBeds = 0;
      let orderedMeds = 0;
      let triagePatients = 0;
      let criticalLabs = 0;
      let pendingInvoices = 0;

      if (bedsRes && bedsRes.ok) {
        const b = await bedsRes.json();
        if (b.data) {
          alarmBeds = b.data.filter((x: any) => x.status === 'alarm').length;
          sanitizingBeds = b.data.filter((x: any) => x.status === 'sanitizing').length;
        }
      }

      if (medsRes && medsRes.ok) {
        const m = await medsRes.json();
        if (m.data) {
          orderedMeds = m.data.filter((x: any) => x.status === 'ordered').length;
        }
      }

      if (ptsRes && ptsRes.ok) {
        const p = await ptsRes.json();
        if (p.data) {
          triagePatients = p.data.filter((x: any) => x.status === 'triage' || x.status === 'pre_registered').length;
        }
      }

      if (labsRes && labsRes.ok) {
        const l = await labsRes.json();
        if (l.data) {
          criticalLabs = l.data.filter((x: any) => x.isCriticalValue || x.status === 'critical_result').length;
        }
      }

      if (billsRes && billsRes.ok) {
        const bl = await billsRes.json();
        if (bl.data) {
          pendingInvoices = bl.data.filter((x: any) => x.status !== 'paid').length;
        }
      }

      setGlobalStats({ alarmBeds, orderedMeds, triagePatients, sanitizingBeds, criticalLabs, pendingInvoices });
    } catch {}
  };

  const fetchCommandData = async () => {
    try {
      const [pRes, bRes, sRes, tRes, lRes] = await Promise.all([
        fetch('/api/hospital/patients').catch(() => null),
        fetch('/api/hospital/beds').catch(() => null),
        fetch('/api/hospital/security/staff').catch(() => null),
        fetch('/api/hospital/treatments').catch(() => null),
        fetch('/api/hospital/labs').catch(() => null)
      ]);

      let pts: any[] = [];
      let bds: any[] = [];
      let stf: any[] = [];
      let tx: any[] = [];
      let lb: any[] = [];

      if (pRes && pRes.ok) { const d = await pRes.json(); pts = d.data || []; }
      if (bRes && bRes.ok) { const d = await bRes.json(); bds = d.data || []; }
      if (sRes && sRes.ok) { const d = await sRes.json(); stf = d.data || []; }
      if (tRes && tRes.ok) { const d = await tRes.json(); tx = d.data || []; }
      if (lRes && lRes.ok) { const d = await lRes.json(); lb = d.data || []; }

      setCommandData({ patients: pts, beds: bds, staff: stf, treatments: tx, labs: lb });
    } catch {}
  };

  useEffect(() => {
    fetchGlobalStats();

    const interval = setInterval(() => {
      fetchGlobalStats();
    }, 5000);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandModal(prev => {
          if (!prev) fetchCommandData();
          return !prev;
        });
      } else if (e.key === 'Escape') {
        setShowCommandModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Shift Handover / Switch Active Staff Member
  const handleShiftHandover = (staff: any) => {
    switchStaff(staff);
    setShowStaffDropdown(false);
    setShowShiftSwitcherModal(false);
    showToast('success', 'Shift Handover Complete', `Now operating as ${staff.name} (${staff.customTitle || staff.roleDisplayName || staff.role})`);
  };

  // Superadmin Action: Bulk Turnover of Sanitizing Beds
  const handleBulkTurnover = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/hospital/security/purge-sanitized', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Bulk Turnover Complete', data.message || `All sanitizing beds marked AVAILABLE.`);
      } else {
        showToast('error', 'Turnover Failed', data.error || 'Failed to process turnover');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Superadmin Action: Emergency Code Blue Drill
  const handleEmergencyDrill = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/hospital/security/drill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'CODE_BLUE_DRILL', ward: 'Cardiac ICU' })
      });
      const data = await res.json();
      if (data.success) {
        showToast('info', 'Emergency Drill Dispatched', 'Code Blue simulation active. Team notification broadcasted.');
      } else {
        showToast('error', 'Drill Failed', data.error || 'Failed to start drill');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Superadmin Action: Export SHA-256 Audit Ledger
  const handleExportLedger = async () => {
    try {
      const res = await fetch('/api/hospital/audit');
      const data = await res.json();
      if (data.success && data.data) {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data.data, null, 2))}`;
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', jsonString);
        downloadAnchor.setAttribute('download', `orbitox_audit_ledger_${Date.now()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showToast('success', 'Audit Ledger Exported', `Downloaded ${data.data.length} cryptographic audit records.`);
      }
    } catch (err: any) {
      showToast('error', 'Export Failed', err.message);
    }
  };

  // Superadmin Action: Reset & Re-Seed Enterprise Database
  const handleResetAndReSeed = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/hospital/reset-seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Database Reset & Re-Seeded!', 'Clean multi-role clinical test data loaded successfully.');
        setTimeout(() => {
          window.location.reload();
        }, 600);
      } else {
        showToast('error', 'Reset Failed', data.error || 'Failed to re-seed');
      }
    } catch (err: any) {
      showToast('error', 'Reset Error', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper for dynamic persona visual identity
  const getPersonaMeta = (staff: any) => {
    if (!staff) return {
      icon: '👨‍⚕️',
      roleBadge: 'CLINICAL STAFF',
      badgeBg: 'rgba(30, 96, 255, 0.12)',
      badgeColor: '#1e60ff',
      badgeBorder: 'rgba(30, 96, 255, 0.3)',
      avatarGradient: 'linear-gradient(135deg, #1e60ff 0%, #2563eb 100%)',
      avatarBorder: '#1e60ff',
      title: 'Clinical User'
    };

    const r = staff.role || '';
    if (r === 'super_admin') {
      return {
        icon: '👑',
        roleBadge: 'SUPERADMIN ROOT',
        badgeBg: 'linear-gradient(135deg, rgba(79, 70, 229, 0.12) 0%, rgba(124, 58, 237, 0.12) 100%)',
        badgeColor: '#4f46e5',
        badgeBorder: 'rgba(99, 102, 241, 0.3)',
        avatarGradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        avatarBorder: '#6366f1',
        title: `${staff.name} (Super Admin Root)`
      };
    }
    if (r === 'head_nurse') {
      return {
        icon: '👩‍⚕️',
        roleBadge: 'CHARGE NURSE (RN)',
        badgeBg: 'linear-gradient(135deg, rgba(236, 72, 153, 0.12) 0%, rgba(219, 39, 119, 0.12) 100%)',
        badgeColor: '#db2777',
        badgeBorder: 'rgba(236, 72, 153, 0.3)',
        avatarGradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
        avatarBorder: '#ec4899',
        title: `${staff.name} (ICU Charge Nurse)`
      };
    }
    if (r === 'staff_nurse') {
      return {
        icon: '👩‍⚕️',
        roleBadge: 'BEDSIDE NURSE (RN)',
        badgeBg: 'linear-gradient(135deg, rgba(244, 63, 94, 0.12) 0%, rgba(225, 29, 72, 0.12) 100%)',
        badgeColor: '#e11d48',
        badgeBorder: 'rgba(244, 63, 94, 0.3)',
        avatarGradient: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
        avatarBorder: '#f43f5e',
        title: `${staff.name} (Bedside Staff Nurse)`
      };
    }
    if (['attending_doctor', 'department_head', 'specialist_doctor'].includes(r)) {
      return {
        icon: '👨‍⚕️',
        roleBadge: r === 'department_head' ? 'CHIEF OF DEPT (MD)' : 'ATTENDING MD',
        badgeBg: 'linear-gradient(135deg, rgba(30, 96, 255, 0.12) 0%, rgba(37, 99, 235, 0.12) 100%)',
        badgeColor: '#1d4ed8',
        badgeBorder: 'rgba(30, 96, 255, 0.3)',
        avatarGradient: 'linear-gradient(135deg, #1e60ff 0%, #2563eb 100%)',
        avatarBorder: '#1e60ff',
        title: `${staff.name} (${staff.customTitle || 'Physician'})`
      };
    }
    if (r === 'pharmacist') {
      return {
        icon: '💊',
        roleBadge: 'CLINICAL PHARMD',
        badgeBg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.12) 100%)',
        badgeColor: '#059669',
        badgeBorder: 'rgba(16, 185, 129, 0.3)',
        avatarGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        avatarBorder: '#10b981',
        title: `${staff.name} (Clinical Pharmacist)`
      };
    }
    if (r === 'lab_technician') {
      return {
        icon: '🔬',
        roleBadge: 'PATHOLOGY MLS',
        badgeBg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.12) 100%)',
        badgeColor: '#d97706',
        badgeBorder: 'rgba(245, 158, 11, 0.3)',
        avatarGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        avatarBorder: '#f59e0b',
        title: `${staff.name} (Pathology Technologist)`
      };
    }
    if (r === 'facility_director') {
      return {
        icon: '🛡️',
        roleBadge: 'FACILITY DIRECTOR',
        badgeBg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(124, 58, 237, 0.12) 100%)',
        badgeColor: '#7c3aed',
        badgeBorder: 'rgba(139, 92, 246, 0.3)',
        avatarGradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        avatarBorder: '#8b5cf6',
        title: `${staff.name} (Facility Director)`
      };
    }
    return {
      icon: '🥼',
      roleBadge: (staff.roleDisplayName || staff.role || 'CLINICAL').toUpperCase(),
      badgeBg: 'rgba(100, 116, 139, 0.12)',
      badgeColor: '#475569',
      badgeBorder: 'rgba(100, 116, 139, 0.3)',
      avatarGradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
      avatarBorder: '#64748b',
      title: `${staff.name} (${staff.roleDisplayName || staff.role})`
    };
  };

  const persona = getPersonaMeta(activeStaff);

  const allNavItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/hms',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ),
      visible: true
    },
    {
      id: 'patients',
      label: 'Patients',
      path: '/hms/patients',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      ),
      visible: can('patient.read')
    },
    {
      id: 'appointments',
      label: 'Appointments',
      path: '/hms/appointments',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      ),
      visible: isDoctor || isNurse || isAdmin || can('patient.read')
    },
    {
      id: 'labs',
      label: 'Diagnostics & Labs',
      path: '/hms/labs',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 18h12"></path>
          <path d="M10 2v7.5L5.5 17A2 2 0 0 0 7.3 20h9.4a2 2 0 0 0 1.8-3L14 9.5V2"></path>
          <path d="M8.5 2h7"></path>
        </svg>
      ),
      visible: can('lab.read')
    },
    {
      id: 'pharmacy',
      label: 'Pharmacy',
      path: '/hms/pharmacy',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path>
          <path d="m8.5 8.5 7 7"></path>
        </svg>
      ),
      visible: can('treatment.read')
    },
    {
      id: 'beds',
      label: 'Bed Matrix',
      path: '/hms/beds',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 4v16"></path>
          <path d="M2 8h18a2 2 0 0 1 2 2v10"></path>
          <path d="M2 17h20"></path>
          <path d="M6 8v9"></path>
        </svg>
      ),
      visible: can('bed.read')
    },
    {
      id: 'telemetry',
      label: 'IoT Telemetry',
      path: '/hms/telemetry',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
      ),
      visible: can('telemetry.read')
    },
    {
      id: 'billing',
      label: 'Billing & Claims',
      path: '/hms/billing',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2"></rect>
          <line x1="2" y1="10" x2="22" y2="10"></line>
        </svg>
      ),
      visible: can('billing.read') || can('billing.manage')
    },
    {
      id: 'hierarchy',
      label: 'Hierarchy Tree',
      path: '/hms/hierarchy',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="3" width="6" height="4" rx="1"></rect>
          <rect x="2" y="17" width="6" height="4" rx="1"></rect>
          <rect x="16" y="17" width="6" height="4" rx="1"></rect>
          <path d="M12 7v5"></path>
          <path d="M5 12h14"></path>
          <path d="M5 12v5"></path>
          <path d="M19 12v5"></path>
        </svg>
      ),
      visible: isSuperAdmin || isDirector || can('hierarchy.manage')
    },
    {
      id: 'staff',
      label: 'Staff & RBAC',
      path: '/hms/staff',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      ),
      visible: can('staff.read') || can('staff.manage')
    },
    {
      id: 'profile',
      label: 'Settings & Profile',
      path: '/hms/profile',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      ),
      visible: true
    }
  ];

  const navItems = allNavItems.filter(item => item.visible);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0f6ff 0%, #e6f0fa 45%, #eef4fc 100%)',
        color: '#0f172a',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        display: 'flex',
        padding: '24px',
        boxSizing: 'border-box',
        gap: '24px',
        position: 'relative',
        overflowX: 'hidden'
      }}
    >
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
              border: t.type === 'success' ? '1px solid #10b981' : t.type === 'error' ? '1px solid #ef4444' : '1px solid #818cf8',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              animation: 'fadeIn 0.2s ease-in-out'
            }}
          >
            <span style={{ fontSize: '16px' }}>{t.type === 'success' ? '✅' : t.type === 'error' ? '⚠️' : '👑'}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '13px' }}>{t.title}</div>
              <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '2px' }}>{t.message}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 1. Left Floating Pill Sidebar */}
      <aside
        style={{
          width: '76px',
          minWidth: '76px',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.9)',
          boxShadow: '0 12px 36px rgba(37, 99, 235, 0.06), 0 1px 3px rgba(0, 0, 0, 0.02)',
          borderRadius: '38px',
          padding: '24px 12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 20,
          boxSizing: 'border-box',
          height: 'calc(100vh - 48px)',
          position: 'sticky',
          top: '24px'
        }}
      >
        {/* Top OrbitoX Platform Back Link */}
        <Link
          href="/admin"
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '14px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            color: '#FF7A1A',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.2s ease',
          }}
          title="Return to OrbitoX Platform Admin OS"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF7A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" fill="#FF7A1A" />
            <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-30 12 12)" />
            <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(30 12 12)" />
          </svg>
        </Link>

        {/* Top App Logo Pill with Medical Wave */}
        <Link
          href="/hms"
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #1e60ff 0%, #00b4d8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(30, 96, 255, 0.35)',
            textDecoration: 'none',
            color: '#ffffff',
            transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
          title="OrbitoX Hospital OS"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
        </Link>

        {/* Center Nav Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/hms' && pathname?.startsWith(item.path));
            return (
              <Link
                key={item.id}
                href={item.path}
                title={item.label}
                prefetch={false}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isActive ? 'linear-gradient(135deg, #1e60ff 0%, #2563eb 100%)' : 'transparent',
                  color: isActive ? '#ffffff' : '#64748b',
                  boxShadow: isActive ? '0 6px 18px rgba(30, 96, 255, 0.32)' : 'none',
                  transition: 'all 0.2s ease',
                  textDecoration: 'none',
                  position: 'relative'
                }}
              >
                {item.icon}
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      right: '-8px',
                      width: '4px',
                      height: '16px',
                      borderRadius: '4px',
                      background: '#1e60ff'
                    }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom Profile Avatar with Dynamic Role Persona */}
        <Link
          href="/hms/profile"
          style={{
            position: 'relative',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            border: `2px solid ${persona.avatarBorder}`,
            display: 'block'
          }}
          title={persona.title}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              background: persona.avatarGradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '18px',
              color: '#ffffff'
            }}
          >
            {persona.icon}
          </div>
        </Link>
      </aside>

      {/* 2. Main Content Canvas */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', zIndex: 10, minWidth: 0 }}>
        
        {/* Universal Code Blue & Emergency Alert Banner */}
        {(globalStats.alarmBeds > 0 || globalStats.criticalLabs > 0) && (
          <div
            style={{
              padding: '12px 20px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.35)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>🚨</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '14px' }}>
                  {globalStats.alarmBeds > 0 ? `CODE BLUE / CRITICAL TELEMETRY BREACH (${globalStats.alarmBeds} ACTIVE)` : `CRITICAL PATHOLOGY VALUE ALERT (${globalStats.criticalLabs} UNRESOLVED)`}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.95 }}>
                  Immediate clinical intervention required. Attending clinicians paged.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {globalStats.alarmBeds > 0 && (
                <Link
                  href="/hms/telemetry"
                  style={{
                    padding: '6px 14px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    color: '#dc2626',
                    fontSize: '12px',
                    fontWeight: 800,
                    textDecoration: 'none'
                  }}
                >
                  Open Telemetry ⚡
                </Link>
              )}
              {globalStats.criticalLabs > 0 && (
                <Link
                  href="/hms/labs"
                  style={{
                    padding: '6px 14px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    color: '#dc2626',
                    fontSize: '12px',
                    fontWeight: 800,
                    textDecoration: 'none'
                  }}
                >
                  View Panic Labs 🔬
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Top Header Bar */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '20px',
            flexWrap: 'wrap',
            position: 'relative'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                {headerTitle || (activeStaff ? `Good Day, ${activeStaff.name} 👋` : 'OrbitoX Clinical Command')}
              </h1>
              {/* Dynamic Persona Role Badge */}
              <button
                onClick={() => {
                  if (activeStaff?.role === 'super_admin') {
                    setShowSuperAdminModal(true);
                  } else {
                    setShowShiftSwitcherModal(true);
                  }
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: `1px solid ${persona.badgeBorder}`,
                  background: persona.badgeBg,
                  color: persona.badgeColor,
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.15s ease'
                }}
                title={activeStaff?.role === 'super_admin' ? "👑 Open SuperAdmin Root Control Center" : "🔄 Switch Active Clinical Shift"}
              >
                <span>{persona.icon}</span>
                <span>{persona.roleBadge}</span>
              </button>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0', fontWeight: 500 }}>
              {headerSubtitle || (activeStaff ? `Active Shift: ${activeStaff.customTitle || activeStaff.roleDisplayName || activeStaff.role} • 📍 ${activeStaff.contextName || activeStaff.departmentName || 'General Dept'}` : 'Live Hospital Operating System')}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', position: 'relative' }}>
            {/* ─── GLOBAL COMMAND PALETTE (CMD+K) TRIGGER ─── */}
            <button
              onClick={() => {
                fetchCommandData();
                setShowCommandModal(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 14px',
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                background: 'rgba(255, 255, 255, 0.95)',
                color: '#64748b',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
              }}
              title="Global Quick Search (Cmd+K)"
            >
              <span>🔍</span>
              <span>Quick Search</span>
              <kbd style={{ padding: '2px 6px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', fontSize: '10px', fontWeight: 800, border: '1px solid #cbd5e1' }}>
                ⌘K
              </kbd>
            </button>
            {/* ─── GLOBAL EMERGENCY & INTERCONNECTED TASK HUB ─── */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowAlertDrawer(!showAlertDrawer)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '20px',
                  border: (globalStats.alarmBeds > 0 || globalStats.orderedMeds > 0) ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                  background: (globalStats.alarmBeds > 0) ? '#fee2e2' : '#ffffff',
                  color: (globalStats.alarmBeds > 0) ? '#dc2626' : '#475569',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}
                title="Global Hospital Alerts & Cross-Module Tasks"
              >
                <span>🔔</span>
                <span>Alerts</span>
                {(globalStats.alarmBeds + globalStats.orderedMeds + globalStats.triagePatients + globalStats.criticalLabs + globalStats.pendingInvoices) > 0 && (
                  <span style={{
                    padding: '1px 6px',
                    borderRadius: '10px',
                    fontSize: '10px',
                    fontWeight: 900,
                    background: (globalStats.alarmBeds > 0 || globalStats.criticalLabs > 0) ? '#ef4444' : '#2563eb',
                    color: '#ffffff'
                  }}>
                    {globalStats.alarmBeds + globalStats.orderedMeds + globalStats.triagePatients + globalStats.criticalLabs + globalStats.pendingInvoices}
                  </span>
                )}
              </button>

              {/* Alert Drawer Dropdown */}
              {showAlertDrawer && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '340px',
                    background: '#ffffff',
                    borderRadius: '20px',
                    boxShadow: '0 15px 40px -10px rgba(0, 0, 0, 0.25)',
                    border: '1px solid #e2e8f0',
                    padding: '16px',
                    zIndex: 110,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>⚡ Global Clinical Action Hub</div>
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>● Connected Live</span>
                  </div>

                  {/* 1. Critical Alarms */}
                  <Link
                    href="/hms/telemetry"
                    onClick={() => setShowAlertDrawer(false)}
                    style={{ textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderRadius: '12px', background: globalStats.alarmBeds > 0 ? '#fef2f2' : '#f8fafc', border: globalStats.alarmBeds > 0 ? '1px solid #fecdd3' : '1px solid #e2e8f0' }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: globalStats.alarmBeds > 0 ? '#dc2626' : '#334155' }}>
                        🚨 Critical Vitals & Code Blues
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Real-time telemetry monitor</div>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: globalStats.alarmBeds > 0 ? '#dc2626' : '#64748b' }}>
                      {globalStats.alarmBeds} Active
                    </span>
                  </Link>

                  {/* 2. Critical Lab Results */}
                  <Link
                    href="/hms/labs"
                    onClick={() => setShowAlertDrawer(false)}
                    style={{ textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderRadius: '12px', background: globalStats.criticalLabs > 0 ? '#fef2f2' : '#f8fafc', border: globalStats.criticalLabs > 0 ? '1px solid #fecdd3' : '1px solid #e2e8f0' }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: globalStats.criticalLabs > 0 ? '#dc2626' : '#334155' }}>
                        🔬 STAT Critical Lab Findings
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Pathology & diagnostics alerts</div>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: globalStats.criticalLabs > 0 ? '#dc2626' : '#64748b' }}>
                      {globalStats.criticalLabs} Critical
                    </span>
                  </Link>

                  {/* 3. Pending Pharmacy */}
                  <Link
                    href="/hms/pharmacy"
                    onClick={() => setShowAlertDrawer(false)}
                    style={{ textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderRadius: '12px', background: globalStats.orderedMeds > 0 ? '#eff6ff' : '#f8fafc', border: globalStats.orderedMeds > 0 ? '1px solid #bfdbfe' : '1px solid #e2e8f0' }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: globalStats.orderedMeds > 0 ? '#2563eb' : '#334155' }}>
                        💊 eMAR Prescriptions to Dispense
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Central pharmacy queue</div>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: globalStats.orderedMeds > 0 ? '#2563eb' : '#64748b' }}>
                      {globalStats.orderedMeds} Pending
                    </span>
                  </Link>

                  {/* 4. Unassigned Patients */}
                  <Link
                    href="/hms/beds"
                    onClick={() => setShowAlertDrawer(false)}
                    style={{ textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderRadius: '12px', background: globalStats.triagePatients > 0 ? '#fffbeb' : '#f8fafc', border: globalStats.triagePatients > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0' }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: globalStats.triagePatients > 0 ? '#d97706' : '#334155' }}>
                        🛏️ Inpatients Awaiting Bed
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>ER triage & census</div>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: globalStats.triagePatients > 0 ? '#d97706' : '#64748b' }}>
                      {globalStats.triagePatients} Waiting
                    </span>
                  </Link>

                  {/* 5. Invoices Pending Payment */}
                  <Link
                    href="/hms/billing"
                    onClick={() => setShowAlertDrawer(false)}
                    style={{ textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                        💳 Unpaid Discharge Bills
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Inpatient billing ledger</div>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>
                      {globalStats.pendingInvoices} Due
                    </span>
                  </Link>

                  {/* 6. Sanitizing Beds */}
                  <Link
                    href="/hms/beds"
                    onClick={() => setShowAlertDrawer(false)}
                    style={{ textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                        🧹 UV-C Turnover Stations
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Housekeeping terminal clean</div>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>
                      {globalStats.sanitizingBeds} Cleaning
                    </span>
                  </Link>
                </div>
              )}
            </div>

            {/* Active Staff Member Profile Pill & Shift Switcher Dropdown */}
            {activeStaff && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowStaffDropdown(!showStaffDropdown)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '6px 14px 6px 8px',
                    borderRadius: '24px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #dbeafe',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.08)',
                    cursor: 'pointer'
                  }}
                  title="Click to switch active shift or view RBAC capabilities"
                >
                  <div
                    style={{
                      position: 'relative',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #1e60ff 0%, #00b4d8 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 800
                    }}
                  >
                    {activeStaff.name.replace(/^(Dr\.|Prof\.|Doctor)\s+/i, '').slice(0, 2).toUpperCase() || 'DR'}
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '-1px',
                        right: '-1px',
                        width: '9px',
                        height: '9px',
                        borderRadius: '50%',
                        background: activeStaff.isOnDuty ? '#10b981' : '#94a3b8',
                        border: '2px solid #ffffff'
                      }}
                    />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                      {activeStaff.name.split(',')[0]}
                    </div>
                    <div style={{ fontSize: '10px', color: '#1e60ff', fontWeight: 700 }}>
                      {activeStaff.role.replace('_', ' ').toUpperCase()} ▾
                    </div>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {showStaffDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      width: '280px',
                      background: '#ffffff',
                      borderRadius: '18px',
                      boxShadow: '0 15px 40px -10px rgba(0, 0, 0, 0.25)',
                      border: '1px solid #e2e8f0',
                      padding: '12px',
                      zIndex: 100,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: '12px' }}>
                      <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>{activeStaff.name}</strong>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{activeStaff.customTitle || activeStaff.roleDisplayName}</span>
                      <div style={{ fontSize: '11px', color: '#0369a1', marginTop: '4px', fontWeight: 600 }}>
                        📍 {activeStaff.contextName || activeStaff.departmentName}
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', fontFamily: 'monospace' }}>
                        🪪 {activeStaff.licenseNumber} • PIN: {activeStaff.accessPin || '123456'}
                      </div>
                    </div>

                    <button
                      onClick={() => { setShowStaffDropdown(false); setShowShiftSwitcherModal(true); }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: 'none',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        textAlign: 'left'
                      }}
                    >
                      <span>🔄</span> Switch Clinical Shift / Account
                    </button>

                    <Link
                      href="/hms/staff"
                      onClick={() => setShowStaffDropdown(false)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: '#f8fafc',
                        color: '#334155',
                        fontSize: '12px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span>➕</span> Provision New Clinical Staff
                    </Link>

                    <button
                      onClick={() => { setShowStaffDropdown(false); handleResetAndReSeed(); }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid #fed7aa',
                        background: '#fff7ed',
                        color: '#c2410c',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        textAlign: 'left'
                      }}
                    >
                      <span>⚡</span> Reset & Re-Seed Test Data
                    </button>

                    <button
                      onClick={() => {
                        setShowStaffDropdown(false);
                        logout();
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: '#fef2f2',
                        color: '#b91c1c',
                        fontSize: '12px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        borderTop: '1px solid #fee2e2',
                        width: '100%',
                        textAlign: 'left'
                      }}
                    >
                      <span>🚪</span> Lock Station / Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Role-Gated Quick Actions Menu Trigger */}
            {activeStaff?.role === 'super_admin' ? (
              <button
                onClick={() => setShowSuperAdminModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '22px',
                  padding: '9px 18px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>👑</span> Root Actions
              </button>
            ) : (
              <button
                onClick={() => setShowShiftSwitcherModal(true)}
                style={{
                  background: persona.badgeBg,
                  color: persona.badgeColor,
                  border: `1px solid ${persona.badgeBorder}`,
                  borderRadius: '22px',
                  padding: '9px 16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                }}
              >
                <span>🔄</span> Shift Handover
              </button>
            )}

            {/* Custom page actions if any */}
            {actions}
          </div>
        </header>

        {/* Child Page Content */}
        <PlatformGovernanceDock serviceId="hms" tenantId="st-jude" />
        {children}
      </main>

      {/* ─── MODAL: QUICK SHIFT SWITCHER ─── */}
      {showShiftSwitcherModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0',
              padding: '28px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>🔄 Clinical Shift Handover & RBAC Persona Switcher</h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>Select any registered physician, nurse, or pharmacist to switch active session identity instantly.</p>
              </div>
              <button
                onClick={() => setShowShiftSwitcherModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            {/* 1-Click Fast Persona Tier Buttons */}
            <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
                ⚡ Quick Clinical Persona Switcher
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '6px' }}>
                {[
                  { id: 'nurse_clara_02', name: 'Nurse Clara', role: 'Bedside RN', icon: '👩‍⚕️', color: '#e11d48', bg: 'rgba(225, 29, 72, 0.12)' },
                  { id: 'nurse_palmer_01', name: 'Nurse Palmer', role: 'Charge RN', icon: '👩‍⚕️', color: '#db2777', bg: 'rgba(219, 39, 119, 0.12)' },
                  { id: 'dr_strange_01', name: 'Dr. Strange', role: 'Attending MD', icon: '👨‍⚕️', color: '#1e60ff', bg: 'rgba(30, 96, 255, 0.12)' },
                  { id: 'pharmacist_pepper_01', name: 'Pepper Potts', role: 'PharmD', icon: '💊', color: '#059669', bg: 'rgba(5, 150, 105, 0.12)' },
                  { id: 'lab_banner_01', name: 'Bruce Banner', role: 'Lab MLS', icon: '🔬', color: '#d97706', bg: 'rgba(217, 119, 6, 0.12)' },
                  { id: 'dr_director_fury', name: 'Director Fury', role: 'CMO Director', icon: '🛡️', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.12)' },
                  { id: 'admin_root_01', name: 'Michael T.', role: 'SuperAdmin', icon: '👑', color: '#4f46e5', bg: 'rgba(79, 70, 229, 0.12)' }
                ].map(p => {
                  const isCurrent = activeStaff?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        const match = staffList.find(s => s.id === p.id || s.name.toLowerCase().includes(p.name.toLowerCase()));
                        if (match) {
                          handleShiftHandover(match);
                        } else {
                          const fallbackStaff: StaffProfile = {
                            id: p.id,
                            name: p.name,
                            role: p.id === 'nurse_clara_02' ? 'staff_nurse' : p.id === 'nurse_palmer_01' ? 'head_nurse' : p.id === 'dr_strange_01' ? 'department_head' : p.id === 'pharmacist_pepper_01' ? 'pharmacist' : p.id === 'lab_banner_01' ? 'lab_technician' : p.id === 'dr_director_fury' ? 'facility_director' : 'super_admin',
                            departmentId: 'dept_cardio',
                            departmentName: 'Clinical Services',
                            email: `${p.id}@orbitox.health`,
                            licenseNumber: `MED-${p.id.toUpperCase()}`,
                            isOnDuty: true,
                            shiftSchedule: 'day' as const,
                            contextId: 'apollo-global'
                          };
                          handleShiftHandover(fallbackStaff);
                        }
                      }}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '10px',
                        border: isCurrent ? `2px solid ${p.color}` : `1px solid #e2e8f0`,
                        background: isCurrent ? p.bg : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ fontSize: '15px' }}>{p.icon}</span>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{p.name}</span>
                      <span style={{ fontSize: '8px', color: p.color, fontWeight: 700 }}>{p.role}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <input
              type="text"
              placeholder="Search clinician by name, specialty, role, or department..."
              value={searchShiftStaff}
              onChange={e => setSearchShiftStaff(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                marginBottom: '16px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxHeight: '380px', overflowY: 'auto' }}>
              {staffList
                .filter(s => {
                  if (!searchShiftStaff) return true;
                  const q = searchShiftStaff.toLowerCase();
                  return (
                    s.name.toLowerCase().includes(q) ||
                    s.email.toLowerCase().includes(q) ||
                    s.role.toLowerCase().includes(q) ||
                    (s.customTitle && s.customTitle.toLowerCase().includes(q))
                  );
                })
                .map(staff => {
                  const isCurrent = activeStaff?.id === staff.id;
                  return (
                    <div
                      key={staff.id}
                      onClick={() => handleShiftHandover(staff)}
                      style={{
                        padding: '12px',
                        borderRadius: '14px',
                        border: isCurrent ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        background: isCurrent ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => {
                        if (!isCurrent) e.currentTarget.style.background = '#f8fafc';
                      }}
                      onMouseLeave={e => {
                        if (!isCurrent) e.currentTarget.style.background = '#ffffff';
                      }}
                    >
                      <div
                        style={{
                          position: 'relative',
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: isCurrent ? '#2563eb' : '#64748b',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          fontWeight: 800
                        }}
                      >
                        {staff.name.replace(/^(Dr\.|Prof\.|Doctor)\s+/i, '').slice(0, 2).toUpperCase() || 'DR'}
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '-1px',
                            right: '-1px',
                            width: '9px',
                            height: '9px',
                            borderRadius: '50%',
                            background: staff.isOnDuty ? '#10b981' : '#94a3b8',
                            border: '2px solid #ffffff'
                          }}
                        />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {staff.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {staff.customTitle || staff.roleDisplayName || staff.role}
                        </div>
                        <div style={{ fontSize: '10px', color: '#0284c7', fontWeight: 600 }}>
                          📍 {staff.contextName || staff.departmentName}
                        </div>
                      </div>
                      {isCurrent && (
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb' }}>✓ Active</span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ─── SUPERADMIN ROOT OMNI-CONTROL CENTER MODAL ─── */}
      {showSuperAdminModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 300,
            padding: '20px'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '680px',
              background: '#ffffff',
              borderRadius: '28px',
              padding: '32px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                  👑
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Super Admin Root Control Center</h2>
                  <span style={{ fontSize: '12px', color: '#6366f1', fontWeight: 700 }}>Active Role: SUPERADMIN • Scope: *.* (Unlimited)</span>
                </div>
              </div>
              <button
                onClick={() => setShowSuperAdminModal(false)}
                style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            {/* Quick Omni-Action Buttons */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '10px' }}>
                Instant Root Actions
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {/* 1. Bulk Turnover */}
                <button
                  disabled={isProcessing}
                  onClick={handleBulkTurnover}
                  style={{
                    padding: '14px',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    background: 'rgba(248, 250, 252, 0.9)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontSize: '18px' }}>🛏️</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Bulk Turnover Beds</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Make all sanitizing beds available</div>
                </button>

                {/* 2. Dispatch Code Blue Drill */}
                <button
                  disabled={isProcessing}
                  onClick={handleEmergencyDrill}
                  style={{
                    padding: '14px',
                    borderRadius: '16px',
                    border: '1px solid #fed7aa',
                    background: '#fff7ed',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontSize: '18px' }}>🚨</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#c2410c' }}>Dispatch Code Blue Drill</div>
                  <div style={{ fontSize: '11px', color: '#9a3412' }}>Simulate telemetry emergency flow</div>
                </button>

                {/* 3. Export Cryptographic Audit Ledger */}
                <button
                  onClick={handleExportLedger}
                  style={{
                    padding: '14px',
                    borderRadius: '16px',
                    border: '1px solid #bbf7d0',
                    background: '#f0fdf4',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontSize: '18px' }}>📜</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>Export SHA-256 Ledger</div>
                  <div style={{ fontSize: '11px', color: '#15803d' }}>Download immutable audit trails</div>
                </button>

                {/* 4. Reset & Re-Seed Enterprise Database */}
                <button
                  disabled={isProcessing}
                  onClick={() => { setShowSuperAdminModal(false); handleResetAndReSeed(); }}
                  style={{
                    padding: '14px',
                    borderRadius: '16px',
                    border: '1px solid #fbcfe8',
                    background: '#fdf2f8',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontSize: '18px' }}>🔄</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#db2777' }}>Reset & Re-Seed DB</div>
                  <div style={{ fontSize: '11px', color: '#be185d' }}>Clear & load clean role test data</div>
                </button>
              </div>
            </div>

            {/* Granted Root Capabilities Matrix */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '10px' }}>
                Active Super Admin Permissions Matrix (*.*)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '190px', overflowY: 'auto' }}>
                {[
                  { name: 'Clinical Intake & Surge Bypass', scope: 'clinical.intake.bypass', desc: 'Direct patient admission to any station' },
                  { name: 'eMAR & 5-Rights Pharmacy Override', scope: 'pharmacy.dispense.override', desc: 'Emergency medication push authorization' },
                  { name: 'Bed Matrix & Housekeeping Root', scope: 'beds.omni.manage', desc: 'Add, edit, transfer, and purge beds' },
                  { name: 'Cryptographic Break-Glass Authority', scope: 'security.breakglass.issue', desc: 'Zero-Trust 30-minute bypass tokens' },
                  { name: 'SHA-256 Audit Ledger Query & Export', scope: 'audit.ledger.export', desc: 'Real-time blockchain audit verification' },
                  { name: '6-Tier Context Hierarchy Architect', scope: 'hierarchy.tree.edit', desc: 'Manage Org, Branch, Ward & Bed nodes' }
                ].map((cap, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '14px',
                      background: 'rgba(248, 250, 252, 0.9)',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px'
                    }}
                  >
                    <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{cap.name}</div>
                      <div style={{ fontSize: '10px', color: '#6366f1', fontFamily: 'monospace' }}>{cap.scope}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
              <Link
                href="/hms/profile"
                onClick={() => setShowSuperAdminModal(false)}
                style={{ fontSize: '12px', color: '#4f46e5', fontWeight: 700, textDecoration: 'none' }}
              >
                Manage Staff & Roles in Settings →
              </Link>
              <button
                onClick={() => setShowSuperAdminModal(false)}
                style={{ padding: '8px 20px', borderRadius: '12px', border: 'none', background: '#0f172a', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Close Control Center
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── GLOBAL COMMAND PALETTE (CMD+K / CTRL+K) MODAL ─── */}
      {showCommandModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '80px',
            zIndex: 9999
          }}
          onClick={() => setShowCommandModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              width: '640px',
              maxWidth: '92vw',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.8)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '75vh'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '18px 22px', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '20px' }}>🔍</span>
              <input
                type="text"
                autoFocus
                placeholder="Type to search patients, beds, doctors, medications, labs..."
                value={commandQuery}
                onChange={e => setCommandQuery(e.target.value)}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#0f172a',
                  background: 'transparent'
                }}
              />
              <kbd style={{ padding: '3px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#64748b', fontSize: '11px', fontWeight: 800, border: '1px solid #e2e8f0' }}>
                ESC
              </kbd>
            </div>

            {/* Quick Actions Shortcuts */}
            <div style={{ padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '8px', overflowX: 'auto' }}>
              {[
                { label: '➕ Admit Patient', href: '/hms/patients' },
                { label: '💊 Prescribe eMAR', href: '/hms/pharmacy' },
                { label: '🔬 Order STAT Lab', href: '/hms/labs' },
                { label: '📡 Live Telemetry', href: '/hms/telemetry' },
                { label: '🛏️ Bed Matrix', href: '/hms/beds' },
                { label: '💳 Inpatient Bills', href: '/hms/billing' }
              ].map((act, i) => (
                <Link
                  key={i}
                  href={act.href}
                  onClick={() => setShowCommandModal(false)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    color: '#334155',
                    fontSize: '11px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {act.label}
                </Link>
              ))}
            </div>

            {/* Results Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Group 1: Patients */}
              {(() => {
                const q = commandQuery.toLowerCase().trim();
                const matched = commandData.patients.filter(p => !q || p.name?.toLowerCase().includes(q) || p.diagnosis?.toLowerCase().includes(q)).slice(0, 4);
                if (matched.length === 0 && q) return null;
                return (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Patients ({matched.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {matched.map(p => (
                        <Link
                          key={p.id}
                          href="/hms/patients"
                          onClick={() => setShowCommandModal(false)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 14px',
                            borderRadius: '14px',
                            background: '#ffffff',
                            border: '1px solid #f1f5f9',
                            textDecoration: 'none'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>{p.name} ({p.age}y, {p.gender})</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{p.diagnosis || 'Clinical Inpatient'} • {p.bedLabel || 'Unassigned'}</div>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '8px', background: p.status === 'admitted' ? '#eff6ff' : '#f8fafc', color: p.status === 'admitted' ? '#2563eb' : '#64748b' }}>
                            {p.status?.toUpperCase()}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Group 2: Diagnostic Labs */}
              {(() => {
                const q = commandQuery.toLowerCase().trim();
                const matched = commandData.labs.filter(l => !q || l.testType?.toLowerCase().includes(q) || l.patientName?.toLowerCase().includes(q)).slice(0, 3);
                if (matched.length === 0 && q) return null;
                return (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Diagnostic Pathology ({matched.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {matched.map(l => (
                        <Link
                          key={l.id}
                          href="/hms/labs"
                          onClick={() => setShowCommandModal(false)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 14px',
                            borderRadius: '14px',
                            background: '#faf5ff',
                            border: '1px solid #f3e8ff',
                            textDecoration: 'none'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, color: '#9333ea', fontSize: '13px' }}>🔬 {l.testType}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{l.patientName || 'Patient'} • Priority: {l.priority}</div>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: l.isCriticalValue ? '#dc2626' : '#9333ea' }}>
                            {l.status}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Group 3: Beds */}
              {(() => {
                const q = commandQuery.toLowerCase().trim();
                const matched = commandData.beds.filter(b => !q || b.label?.toLowerCase().includes(q) || b.type?.toLowerCase().includes(q)).slice(0, 3);
                if (matched.length === 0 && q) return null;
                return (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Beds & Inpatient Stations ({matched.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {matched.map(b => (
                        <Link
                          key={b.id}
                          href="/hms/beds"
                          onClick={() => setShowCommandModal(false)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 14px',
                            borderRadius: '14px',
                            background: '#f0fdf4',
                            border: '1px solid #dcfce7',
                            textDecoration: 'none'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, color: '#16a34a', fontSize: '13px' }}>🛏️ {b.label}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{b.type?.toUpperCase()} Ward • Rate: ${b.dailyRate}/day</div>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: b.status === 'available' ? '#16a34a' : '#d97706' }}>
                            ● {b.status}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b' }}>
              <span>Pro Tip: Press <kbd style={{ padding: '1px 5px', borderRadius: '4px', background: '#e2e8f0', color: '#334155', fontWeight: 700 }}>⌘K</kbd> anywhere to activate</span>
              <span>Universal Zero-Trust Index</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
