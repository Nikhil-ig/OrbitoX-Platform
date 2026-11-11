'use client';

import React, { useState, useEffect } from 'react';
import HospitalNavLayout from '../components/HospitalNavLayout';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  status: string;
  scope: string;
  lastActive: string;
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'Account' | 'SuperAdmin' | 'Security' | 'Billings' | 'Notifications' | 'Language'>('Account');

  // Active Staff & Form states
  const [staffId, setStaffId] = useState('admin_root_01');
  const [role, setRole] = useState('super_admin');
  const [firstName, setFirstName] = useState('Michael');
  const [lastName, setLastName] = useState('Thompson');
  const [email, setEmail] = useState('superadmin@orbitox.health');
  const [phone, setPhone] = useState('+1 (800) 555-0199');
  const [accountType, setAccountType] = useState('Super Admin (Root Operator)');
  const [licenseNumber, setLicenseNumber] = useState('ROOT-SEC-001');
  const [customTitle, setCustomTitle] = useState('Chief Technology & Systems Officer');
  const [departmentName, setDepartmentName] = useState('Executive Medical Board');
  const [country, setCountry] = useState('United States');
  const [cityState, setCityState] = useState('New York (NY)');
  const [zipCode, setZipCode] = useState('10001');
  const [street, setStreet] = useState('100 Apollo Plaza, Manhattan');

  const [savedNotification, setSavedNotification] = useState(false);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState<{ id: string; type: 'success' | 'error' | 'info'; title: string; message: string }[]>([]);
  const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const loadActiveStaffProfile = () => {
    const saved = localStorage.getItem('orbitox_active_clinical_staff');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setStaffId(parsed.id || 'admin_root_01');
        setRole(parsed.role || 'super_admin');
        const nameParts = (parsed.name || '').split(' ');
        setFirstName(nameParts[0] || 'Clinician');
        setLastName(nameParts.slice(1).join(' ') || '');
        setEmail(parsed.email || 'doctor@orbitox.health');
        setPhone(parsed.phone || '+1 (555) 019-2834');
        setAccountType(parsed.customTitle || parsed.roleDisplayName || parsed.role || 'Attending Physician');
        setLicenseNumber(parsed.licenseNumber || 'MD-NY-000000');
        setCustomTitle(parsed.customTitle || parsed.roleDisplayName || '');
        setDepartmentName(parsed.departmentName || parsed.contextName || 'General Hospital');
      } catch (e) {
        console.warn('Failed to parse active staff in profile:', e);
      }
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await fetch('/api/hospital/security/permissions');
      const data = await res.json();
      if (data.success && data.permissions?.staffDirectory) {
        setStaffList(data.permissions.staffDirectory);
      }
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
    }
  };

  useEffect(() => {
    loadActiveStaffProfile();
    fetchPermissions();

    const handleSessionChange = () => {
      loadActiveStaffProfile();
      fetchPermissions();
    };

    window.addEventListener('orbitox_staff_session_changed', handleSessionChange);
    return () => window.removeEventListener('orbitox_staff_session_changed', handleSessionChange);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      const updates = {
        name: fullName,
        email,
        phone,
        customTitle
      };

      const res = await fetch(`/api/hospital/security/staff/${staffId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      const data = await res.json();
      if (data.success && data.data) {
        localStorage.setItem('orbitox_active_clinical_staff', JSON.stringify(data.data));
        window.dispatchEvent(new Event('orbitox_staff_session_changed'));
        setSavedNotification(true);
        showToast('success', 'Profile Updated', `${fullName}'s credentials and profile saved to cryptographic ledger.`);
        setTimeout(() => setSavedNotification(false), 3000);
      } else {
        showToast('error', 'Update Failed', data.error || 'Failed to update profile');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

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
        showToast('info', 'Emergency Drill Dispatched', 'Code Blue simulation active.');
      } else {
        showToast('error', 'Drill Failed', data.error || 'Failed to start drill');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

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

  const navMenuItems = [
    { id: 'Account', label: 'Account Settings', icon: '👤' },
    { id: 'SuperAdmin', label: '👑 Super Admin & RBAC', icon: '👑' },
    { id: 'Security', label: 'Security & 2FA', icon: '🔒' },
    { id: 'Billings', label: 'Billings & License', icon: '💳' },
    { id: 'Notifications', label: 'Clinical Alerts', icon: '🔔' },
    { id: 'Language', label: 'Language', icon: '🌐' }
  ];

  return (
    <HospitalNavLayout
      headerTitle="Super Admin & Profile Center"
      headerSubtitle="Manage your root permissions, clinical RBAC roles, security keys & platform settings."
    >
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px', alignItems: 'start', position: 'relative' }}>
        
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

        {/* Left Card: General Settings Sub-Navigation */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.95)',
            borderRadius: '28px',
            padding: '24px',
            boxShadow: '0 10px 30px rgba(37, 99, 235, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 8px' }}>
            System Settings
          </h3>

          {navMenuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 18px',
                  borderRadius: '16px',
                  border: 'none',
                  background: isActive ? (item.id === 'SuperAdmin' ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : 'linear-gradient(135deg, #1e60ff 0%, #2563eb 100%)') : 'transparent',
                  color: isActive ? '#ffffff' : '#64748b',
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: isActive ? '0 6px 18px rgba(79, 70, 229, 0.28)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Main Card: Profile & Settings Panel */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.95)',
            borderRadius: '28px',
            padding: '32px',
            boxShadow: '0 10px 30px rgba(37, 99, 235, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}
        >
          {/* Top Profile Summary Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '50%',
                    background: role === 'super_admin' ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : 'linear-gradient(135deg, #1e60ff 0%, #0284c7 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '30px',
                    border: '3px solid #ffffff',
                    boxShadow: '0 6px 16px rgba(79, 70, 229, 0.25)'
                  }}
                >
                  {role === 'super_admin' ? '👑' : role.includes('doctor') ? '👨‍⚕️' : role.includes('nurse') ? '👩‍⚕️' : '🩺'}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                    {firstName} {lastName}
                  </h2>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: 'rgba(99, 102, 241, 0.12)',
                      color: '#4f46e5',
                      fontSize: '11px',
                      fontWeight: 800
                    }}
                  >
                    {accountType.toUpperCase()}
                  </span>
                </div>
                <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  📍 {departmentName} • Zero-Trust Identity Active (License: {licenseNumber})
                </p>
              </div>
            </div>

            <button
              onClick={handleSave}
              style={{
                background: 'linear-gradient(135deg, #1e60ff 0%, #2563eb 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '24px',
                padding: '10px 28px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(30, 96, 255, 0.35)'
              }}
            >
              Save Changes
            </button>
          </div>

          {savedNotification && (
            <div
              style={{
                padding: '10px 16px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#059669',
                fontSize: '13px',
                fontWeight: 600
              }}
            >
              ✓ Profile settings updated successfully!
            </div>
          )}

          {/* TAB 1: Account Information */}
          {activeTab === 'Account' && (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                Personal Information
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    style={{ width: '100%', padding: '11px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', background: 'rgba(248, 250, 252, 0.9)', fontSize: '13px', color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    style={{ width: '100%', padding: '11px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', background: 'rgba(248, 250, 252, 0.9)', fontSize: '13px', color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{ width: '100%', padding: '11px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', background: 'rgba(248, 250, 252, 0.9)', fontSize: '13px', color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    style={{ width: '100%', padding: '11px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', background: 'rgba(248, 250, 252, 0.9)', fontSize: '13px', color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>System Account Role</label>
                <input
                  type="text"
                  disabled
                  value={accountType}
                  style={{ width: '100%', padding: '11px 16px', borderRadius: '14px', border: '1px solid #cbd5e1', background: '#f1f5f9', fontSize: '13px', color: '#475569', fontWeight: 700, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '10px' }}>
                Headquarters Address
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    style={{ width: '100%', padding: '11px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', background: 'rgba(248, 250, 252, 0.9)', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>City / State</label>
                  <input
                    type="text"
                    value={cityState}
                    onChange={e => setCityState(e.target.value)}
                    style={{ width: '100%', padding: '11px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', background: 'rgba(248, 250, 252, 0.9)', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>Street Address</label>
                  <input
                    type="text"
                    value={street}
                    onChange={e => setStreet(e.target.value)}
                    style={{ width: '100%', padding: '11px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', background: 'rgba(248, 250, 252, 0.9)', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>Zip Code</label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={e => setZipCode(e.target.value)}
                    style={{ width: '100%', padding: '11px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', background: 'rgba(248, 250, 252, 0.9)', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: Super Admin & RBAC Controls */}
          {activeTab === 'SuperAdmin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>Super Admin Root Powers & RBAC Delegation</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  As Super Admin, you have unrestricted <code>*.*</code> root capabilities across clinical operations, bed matrices, and security.
                </p>
              </div>

              {/* Quick Actions Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <button
                  disabled={isProcessing}
                  onClick={handleBulkTurnover}
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    background: 'rgba(248, 250, 252, 0.9)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontSize: '20px' }}>🛏️</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Turnover Sanitizing Beds</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Batch reset all sanitizing beds to Available</div>
                </button>

                <button
                  disabled={isProcessing}
                  onClick={handleEmergencyDrill}
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    border: '1px solid #fed7aa',
                    background: '#fff7ed',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontSize: '20px' }}>🚨</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#c2410c' }}>Dispatch Code Blue Drill</div>
                  <div style={{ fontSize: '11px', color: '#9a3412' }}>Simulate telemetry emergency drill</div>
                </button>

                <button
                  onClick={handleExportLedger}
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    border: '1px solid #bbf7d0',
                    background: '#f0fdf4',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontSize: '20px' }}>📜</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>Export SHA-256 Ledger</div>
                  <div style={{ fontSize: '11px', color: '#15803d' }}>Download cryptographic audit history</div>
                </button>
              </div>

              {/* Staff Directory & Roles Table */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Staff RBAC Directory</h4>
                  <a
                    href="/hms/staff"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '10px',
                      background: '#eff6ff',
                      color: '#2563eb',
                      fontSize: '12px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      border: '1px solid #bfdbfe'
                    }}
                  >
                    Manage Roster & Granular Permissions ➡️
                  </a>
                </div>
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '10px 14px', color: '#64748b' }}>Staff Member</th>
                        <th style={{ padding: '10px 14px', color: '#64748b' }}>Assigned Role</th>
                        <th style={{ padding: '10px 14px', color: '#64748b' }}>Permission Scope</th>
                        <th style={{ padding: '10px 14px', color: '#64748b' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffList.map((s) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>{s.name}</td>
                          <td style={{ padding: '10px 14px', color: '#1e60ff', fontWeight: 600 }}>{s.role}</td>
                          <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#64748b' }}>{s.scope}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#059669', fontWeight: 700 }}>
                              ● {s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Security */}
          {activeTab === 'Security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Zero-Trust Security & RBAC</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Connected to OrbitoX Security Vault. 2FA is enforced for all clinical staff.
              </p>
              <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(248, 250, 252, 0.9)', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>Two-Factor Authentication (2FA)</div>
                <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, marginTop: '2px' }}>● ACTIVE (Hardware Key / TOTP)</div>
              </div>
            </div>
          )}

          {/* TAB 4: Billings */}
          {activeTab === 'Billings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Hospital SaaS Subscription</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                    Plan: <strong>OrbitoX Enterprise Hospital OS</strong> (Unlimited Wards & Contexts)
                  </p>
                </div>
                <a
                  href="/hms/billing"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '12px',
                    background: '#0284c7',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    textDecoration: 'none'
                  }}
                >
                  💳 Inpatient Billing Hub →
                </a>
              </div>
              <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(248, 250, 252, 0.9)', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>Next Billing Date</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>September 1, 2026 • Auto-renew enabled</div>
              </div>
            </div>
          )}

          {/* TAB 5: Notifications */}
          {activeTab === 'Notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Emergency Clinical Alerts</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#334155' }}>
                  <input type="checkbox" defaultChecked /> Code Blue Critical Telemetry SMS Alerts
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#334155' }}>
                  <input type="checkbox" defaultChecked /> 30-min STAT Pathology Escalation
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#334155' }}>
                  <input type="checkbox" defaultChecked /> Central Pharmacy 5-Rights Dispense Notifications
                </label>
              </div>
            </div>
          )}

          {/* TAB 6: Language */}
          {activeTab === 'Language' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Language & Localization</h3>
              <select
                style={{
                  width: '200px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  fontSize: '13px',
                  background: '#ffffff'
                }}
              >
                <option>English (United States)</option>
                <option>Spanish (Español)</option>
                <option>German (Deutsch)</option>
                <option>French (Français)</option>
              </select>
            </div>
          )}

        </div>

      </div>
    </HospitalNavLayout>
  );
}
