'use client';

import React, { useState } from 'react';
import {
  Settings,
  Globe2,
  QrCode,
  ShieldCheck,
  Check,
  Save,
  Building2,
  Lock,
} from 'lucide-react';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';

export default function WorkspaceSettingsPage() {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <WorkspaceShell>
      <div style={{ maxWidth: '820px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>Atelier Settings & White-Label</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
              Configure agency identity, custom root domains, and door staff gate passcodes.
            </p>
          </div>

          <button onClick={handleSave} className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.84rem', background: '#3b82f6', gap: '6px' }}>
            <Save size={14} />
            <span>{saved ? 'Settings Saved' : 'Save Changes'}</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Brand Identity */}
          <div className="surface-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '16px' }}>
              Agency Branding
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Agency Legal Name</label>
                <input type="text" defaultValue="Vivah Luxury Event Ateliers Pvt Ltd" className="input" />
              </div>
              <div className="form-group">
                <label className="form-label">Support Email Displayed to Clients</label>
                <input type="email" defaultValue="concierge@vivahevents.com" className="input" />
              </div>
            </div>
          </div>

          {/* Custom Domain Configuration */}
          <div className="surface-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Globe2 size={18} color="#60a5fa" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
                Custom Vanity Root Domain
              </h3>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)', marginBottom: '18px' }}>
              All client invitation portals will be hosted under your branded custom domain.
            </p>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Your Domain</label>
              <input type="text" defaultValue="celebrate.vivahevents.com" className="input" />
            </div>

            <div
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                fontSize: '0.8rem',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Check size={14} />
              <span>DNS CNAME record verified • Automated SSL Active</span>
            </div>
          </div>

          {/* Door Staff Security */}
          <div className="surface-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <QrCode size={18} color="#10b981" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
                Door Staff Passcode Security
              </h3>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)', marginBottom: '18px' }}>
              Gate attendants enter this passcode on the mobile scanner app to check in guests without accessing financial data.
            </p>

            <div className="form-group">
              <label className="form-label">Master Door Staff Passcode</label>
              <input type="text" defaultValue="PALACE-782" className="input" />
            </div>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}
