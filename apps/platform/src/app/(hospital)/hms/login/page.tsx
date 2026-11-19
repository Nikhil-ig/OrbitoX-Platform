'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  customTitle?: string;
  departmentId: string;
  departmentName?: string;
  email: string;
  licenseNumber: string;
  accessPin?: string;
  isOnDuty: boolean;
  contextName?: string;
  roleDisplayName?: string;
  roleCategory?: string;
}

export default function ClinicalLoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'credentials' | 'quick_shift' | 'break_glass'>('credentials');
  const [identifier, setIdentifier] = useState('');
  const [pinOrPassword, setPinOrPassword] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [searchStaff, setSearchStaff] = useState('');
  const [selectedRoleCategory, setSelectedRoleCategory] = useState('ALL');

  // Break-glass state
  const [breakGlassDoctor, setBreakGlassDoctor] = useState('dr_strange_01');
  const [breakGlassReason, setBreakGlassReason] = useState('Emergency Level 1 Polytrauma Resuscitation');

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await fetch('/api/hospital/security/staff');
        const data = await res.json();
        if (data.success && data.data) {
          setStaffList(data.data);
        }
      } catch (err) {
        console.error('Failed to load staff list on login page:', err);
      }
    };
    fetchStaff();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/hospital/security/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, pinOrPassword })
      });

      const data = await res.json();
      if (data.success && data.staff) {
        // Save to localStorage
        localStorage.setItem('orbitox_active_clinical_staff', JSON.stringify(data.staff));
        router.push('/hms');
      } else {
        setErrorMessage(data.error || 'Authentication failed. Please check your credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error during login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (staff: StaffMember) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/hospital/security/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: staff.id, pinOrPassword: staff.accessPin || '123456' })
      });

      const data = await res.json();
      if (data.success && data.staff) {
        localStorage.setItem('orbitox_active_clinical_staff', JSON.stringify(data.staff));
        router.push('/hms');
      } else {
        setErrorMessage(data.error || 'Quick login failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBreakGlassLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/hospital/security/break-glass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId: breakGlassDoctor, reason: breakGlassReason, patientId: 'EMERGENCY_GLOBAL_OVERRIDE' })
      });
      const data = await res.json();
      if (data.success) {
        const doc = staffList.find(s => s.id === breakGlassDoctor) || staffList[0];
        localStorage.setItem('orbitox_active_clinical_staff', JSON.stringify(doc));
        window.dispatchEvent(new Event('orbitox_staff_session_changed'));
        router.push('/hms');
      } else {
        setErrorMessage(data.error || 'Break-glass authorization failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStaff = staffList.filter(s => {
    if (selectedRoleCategory !== 'ALL' && s.roleCategory !== selectedRoleCategory) return false;
    if (searchStaff) {
      const q = searchStaff.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        (s.customTitle && s.customTitle.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 60%, #020617 100%)',
        color: '#f8fafc',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background Pulse Orbs */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          left: '20%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(30, 96, 255, 0.15) 0%, rgba(30, 96, 255, 0) 70%)',
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '15%',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0) 70%)',
          pointerEvents: 'none'
        }}
      />

      {/* Top Header & Hospital Brand */}
      <div style={{ textAlign: 'center', marginBottom: '28px', zIndex: 10 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(255, 255, 255, 0.06)',
            padding: '8px 18px',
            borderRadius: '30px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            marginBottom: '14px',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1e60ff 0%, #00b4d8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 800
            }}
          >
            ✚
          </div>
          <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.04em', color: '#ffffff' }}>
            ORBITOX HOSPITAL OS
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#34d399',
              padding: '2px 8px',
              borderRadius: '10px',
              border: '1px solid rgba(16, 185, 129, 0.4)'
            }}
          >
            ENTERPRISE v2.6
          </span>
        </div>

        <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.03em', color: '#ffffff' }}>
          Clinical Staff Authentication Portal
        </h1>
        <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
          Secure Multi-Tenant Healthcare Isolation • Biometric Badge & PIN Governance
        </p>
      </div>

      {/* Main Glassmorphic Login Container */}
      <div
        style={{
          width: '100%',
          maxWidth: activeTab === 'quick_shift' ? '860px' : '520px',
          background: 'rgba(30, 41, 59, 0.75)',
          backdropFilter: 'blur(24px)',
          borderRadius: '28px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          padding: '32px',
          boxSizing: 'border-box',
          zIndex: 10,
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        {/* Navigation Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '6px',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '6px',
            borderRadius: '16px',
            marginBottom: '24px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <button
            type="button"
            onClick={() => { setActiveTab('credentials'); setErrorMessage(''); }}
            style={{
              padding: '10px',
              borderRadius: '12px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'credentials' ? '#1e60ff' : 'transparent',
              color: activeTab === 'credentials' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === 'credentials' ? '0 4px 12px rgba(30, 96, 255, 0.3)' : 'none'
            }}
          >
            🔑 PIN & Password
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('quick_shift'); setErrorMessage(''); }}
            style={{
              padding: '10px',
              borderRadius: '12px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'quick_shift' ? '#1e60ff' : 'transparent',
              color: activeTab === 'quick_shift' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === 'quick_shift' ? '0 4px 12px rgba(30, 96, 255, 0.3)' : 'none'
            }}
          >
            👥 Shift Switcher
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('break_glass'); setErrorMessage(''); }}
            style={{
              padding: '10px',
              borderRadius: '12px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'break_glass' ? '#dc2626' : 'transparent',
              color: activeTab === 'break_glass' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === 'break_glass' ? '0 4px 12px rgba(220, 38, 38, 0.3)' : 'none'
            }}
          >
            🚨 Break-Glass
          </button>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '14px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#fca5a5',
              fontSize: '13px'
            }}
          >
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ─── TAB 1: PIN & PASSWORD LOGIN ─── */}
        {activeTab === 'credentials' && (
          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
                Clinical Email / Staff ID / License Number
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  placeholder="e.g. ashlynn.carder@orbitox.health or dr_ashlynn_01"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1' }}>
                  6-Digit Badge PIN / Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {showPin ? 'Hide PIN 🙈' : 'Show PIN 👁️'}
                </button>
              </div>
              <input
                type={showPin ? 'text' : 'password'}
                required
                placeholder="Enter 6-digit access PIN (Default: 123456)"
                value={pinOrPassword}
                onChange={e => setPinOrPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#ffffff',
                  fontSize: '14px',
                  letterSpacing: showPin ? 'normal' : '0.2em',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Quick Demo Helper Pill */}
            <div
              style={{
                background: 'rgba(30, 96, 255, 0.1)',
                border: '1px solid rgba(30, 96, 255, 0.25)',
                borderRadius: '12px',
                padding: '10px 14px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#93c5fd'
              }}
            >
              <span>💡 Standard Test PIN: <strong>123456</strong></span>
              <button
                type="button"
                onClick={() => setPinOrPassword('123456')}
                style={{ background: '#1e60ff', border: 'none', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', cursor: 'pointer' }}
              >
                Auto-Fill PIN
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #1e60ff 0%, #00b4d8 100%)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 800,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 18px rgba(30, 96, 255, 0.4)',
                transition: 'all 0.2s ease'
              }}
            >
              {isSubmitting ? 'Authenticating Clinical Station...' : 'Secure Clinical Login →'}
            </button>

            {/* ─── 1-CLICK ROLE DEMO FAST-LOGIN TILES ─── */}
            <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', textAlign: 'center' }}>
                ⚡ One-Click Clinical Persona Fast-Login
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))', gap: '8px' }}>
                {[
                  { id: 'nurse_clara_02', name: 'Nurse Clara', role: 'Bedside RN', icon: '👩‍⚕️', color: '#e11d48', bg: 'rgba(225, 29, 72, 0.15)' },
                  { id: 'nurse_palmer_01', name: 'Nurse Palmer', role: 'Charge RN', icon: '👩‍⚕️', color: '#db2777', bg: 'rgba(219, 39, 119, 0.15)' },
                  { id: 'dr_strange_01', name: 'Dr. Strange', role: 'Attending MD', icon: '👨‍⚕️', color: '#1e60ff', bg: 'rgba(30, 96, 255, 0.15)' },
                  { id: 'pharmacist_pepper_01', name: 'Pepper Potts', role: 'PharmD', icon: '💊', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
                  { id: 'lab_banner_01', name: 'Bruce Banner', role: 'Lab MLS', icon: '🔬', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
                  { id: 'dr_director_fury', name: 'Director Fury', role: 'Director', icon: '🛡️', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
                  { id: 'admin_root_01', name: 'Michael T.', role: 'SuperAdmin', icon: '👑', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' }
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={async () => {
                      const match = staffList.find(s => s.id === p.id || s.name.toLowerCase().includes(p.name.toLowerCase()));
                      if (match) {
                        await handleQuickLogin(match);
                      } else {
                        const fallbackStaff = {
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
                        localStorage.setItem('orbitox_active_clinical_staff', JSON.stringify(fallbackStaff));
                        router.push('/hms');
                      }
                    }}
                    style={{
                      padding: '8px 6px',
                      borderRadius: '10px',
                      border: `1px solid ${p.color}40`,
                      background: p.bg,
                      color: '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>{p.icon}</span>
                    <span style={{ fontSize: '11px', fontWeight: 800 }}>{p.name}</span>
                    <span style={{ fontSize: '9px', color: p.color, fontWeight: 700 }}>{p.role}</span>
                  </button>
                ))}
              </div>
            </div>
          </form>
        )}

        {/* ─── TAB 2: QUICK SHIFT SWITCHER (MULTI-DOCTOR ROSTER) ─── */}
        {activeTab === 'quick_shift' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search clinician name, specialty, role..."
                value={searchStaff}
                onChange={e => setSearchStaff(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: '220px',
                  padding: '9px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#ffffff',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                {['ALL', 'Clinical', 'Nursing', 'Allied', 'Administration'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedRoleCategory(cat)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: selectedRoleCategory === cat ? '#1e60ff' : 'rgba(255, 255, 255, 0.08)',
                      color: selectedRoleCategory === cat ? '#ffffff' : '#94a3b8'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '12px',
                maxHeight: '380px',
                overflowY: 'auto',
                paddingRight: '4px'
              }}
            >
              {filteredStaff.map(staff => (
                <div
                  key={staff.id}
                  onClick={() => handleQuickLogin(staff)}
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    padding: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#38bdf8';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(56, 189, 248, 0.2)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <div
                      style={{
                        position: 'relative',
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #1e60ff 0%, #00b4d8 100%)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 800
                      }}
                    >
                      {staff.name.replace(/^(Dr\.|Prof\.|Doctor)\s+/i, '').slice(0, 2).toUpperCase() || 'DR'}
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '-1px',
                          right: '-1px',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: staff.isOnDuty ? '#10b981' : '#94a3b8',
                          border: '2px solid #0f172a'
                        }}
                      />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {staff.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {staff.customTitle || staff.roleDisplayName || staff.role}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '8px' }}>
                    <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 700 }}>
                      📍 {staff.contextName || staff.departmentName || 'General Dept'}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'rgba(30, 96, 255, 0.2)',
                        color: '#93c5fd',
                        fontSize: '10px',
                        fontWeight: 800
                      }}
                    >
                      Login ⚡
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 3: EMERGENCY BREAK-GLASS BYPASS ─── */}
        {activeTab === 'break_glass' && (
          <form onSubmit={handleBreakGlassLogin}>
            <div
              style={{
                background: 'rgba(220, 38, 38, 0.15)',
                border: '1px solid rgba(220, 38, 38, 0.4)',
                borderRadius: '14px',
                padding: '14px',
                marginBottom: '20px',
                fontSize: '12px',
                color: '#fca5a5'
              }}
            >
              <strong style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#fee2e2' }}>
                🚨 High-Risk Trauma Emergency Protocol
              </strong>
              Break-glass elevation issues a temporary 30-minute bypass session with elevated trauma capabilities. All actions will be logged to the immutable SHA-256 ledger.
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                Operating Trauma Attending Doctor
              </label>
              <select
                value={breakGlassDoctor}
                onChange={e => setBreakGlassDoctor(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              >
                {staffList.filter(s => s.role.includes('doctor') || s.role === 'facility_director' || s.role === 'super_admin').map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.customTitle || s.role})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                Trauma Justification Reason *
              </label>
              <textarea
                required
                rows={3}
                value={breakGlassReason}
                onChange={e => setBreakGlassReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 800,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 18px rgba(220, 38, 38, 0.4)'
              }}
            >
              {isSubmitting ? 'Authorizing Break-Glass...' : 'Authorize Emergency Break-Glass Override 🚨'}
            </button>
          </form>
        )}

        {/* Footer Navigation Back to System */}
        <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
          <Link href="/hms" style={{ color: '#94a3b8', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}>
            ← Return to Hospital Command Center
          </Link>
        </div>
      </div>
    </div>
  );
}
