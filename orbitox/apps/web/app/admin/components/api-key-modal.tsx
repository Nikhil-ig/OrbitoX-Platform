'use client';

import React, { useState } from 'react';
import { useAdmin } from '../data/admin-context';
import { ApiKeyItem } from '../data/mock-data';
import { KeyIcon, CheckIcon, CopyIcon } from './icons';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultServiceId?: string;
  defaultProviderId?: string;
}

export function ApiKeyModal({
  isOpen,
  onClose,
  defaultServiceId,
  defaultProviderId,
}: ApiKeyModalProps) {
  const { services, providers, generateApiKey } = useAdmin();

  const [name, setName] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState(defaultServiceId || 'all');
  const [selectedProviderId, setSelectedProviderId] = useState(defaultProviderId || '');
  const [environment, setEnvironment] = useState<'production' | 'staging' | 'sandbox'>('production');
  const [rateLimit, setRateLimit] = useState(2000);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['*']);
  const [generatedKey, setGeneratedKey] = useState<ApiKeyItem | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Flatten all providers across all categories for selection
  const allProvidersList = Object.values(providers).flat();

  // Scopes options based on service
  const currentService = services.find((s) => s.id === selectedServiceId);
  const availableScopes = currentService
    ? currentService.permissions.map((p) => p.code)
    : [
        'hms.patients.read',
        'hms.triage.execute',
        'commerce.orders.fulfill',
        'crm.leads.read',
        'pos.checkout.process',
        'restaurant.orders.kds',
        'school.students.enroll',
        'finance.ledger.read',
        'inventory.stock.adjust',
      ];

  const handleScopeToggle = (scope: string) => {
    if (scope === '*') {
      setSelectedScopes(['*']);
      return;
    }
    const filtered = selectedScopes.filter((s) => s !== '*');
    if (filtered.includes(scope)) {
      const next = filtered.filter((s) => s !== scope);
      setSelectedScopes(next.length === 0 ? ['*'] : next);
    } else {
      setSelectedScopes([...filtered, scope]);
    }
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const servName =
      selectedServiceId === 'all'
        ? 'Platform Universal Root'
        : services.find((s) => s.id === selectedServiceId)?.name || 'Custom Service';

    const provObj = allProvidersList.find((p) => p.id === selectedProviderId);

    const key = generateApiKey({
      name: name.trim(),
      serviceId: selectedServiceId,
      serviceName: servName,
      providerId: provObj?.id,
      providerName: provObj?.name,
      environment,
      scopes: selectedScopes,
      rateLimitPerMin: rateLimit,
    });

    setGeneratedKey(key);
  };

  const handleCopy = () => {
    if (generatedKey?.rawKey) {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(generatedKey.rawKey);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleResetAndClose = () => {
    setGeneratedKey(null);
    setName('');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 7, 13, 0.82)',
        backdropFilter: 'blur(20px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        className="squircle-card"
        style={{
          width: '100%',
          maxWidth: '620px',
          background: '#13172B',
          border: '1px solid rgba(88, 101, 242, 0.3)',
          borderRadius: '24px',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.85), 0 0 40px rgba(88, 101, 242, 0.2)',
          padding: '32px',
          color: '#FFFFFF',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(255, 122, 26, 0.15)',
                  border: '1px solid rgba(255, 122, 26, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FF7A1A',
                }}
              >
                <KeyIcon size={22} />
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 900, margin: 0, letterSpacing: '-0.4px', color: '#FFFFFF' }}>
                {generatedKey ? 'API Key Generated' : 'Issue New API Secret Key'}
              </h2>
            </div>
            <p style={{ color: '#A3AED0', fontSize: '13.5px', margin: '6px 0 0 54px' }}>
              {generatedKey
                ? 'Store this secret token now. For zero-trust security, it will not be displayed again.'
                : 'Configure zero-trust cryptographic access tokens for services and providers.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '8px',
              color: '#A3AED0',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Generated Key View */}
        {generatedKey ? (
          <div>
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '14px',
                padding: '18px',
                marginBottom: '22px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#10B981', fontWeight: 800, marginBottom: '10px' }}>
                <CheckIcon size={14} color="#10B981" />
                <span>SUCCESS — CRYPTOGRAPHIC TOKEN EMITTED</span>
              </div>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  background: '#0D1122',
                  padding: '14px',
                  borderRadius: '10px',
                  wordBreak: 'break-all',
                  color: '#38BDF8',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <span>{generatedKey.rawKey}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="pill-interactive"
                  style={{
                    background: copied ? '#10B981' : '#5865F2',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFF',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                  <span>{copied ? 'Copied' : 'Copy Key'}</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13.5px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                <span style={{ color: '#7B87A8' }}>Key Name:</span>
                <span style={{ fontWeight: 700, color: '#FFFFFF' }}>{generatedKey.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                <span style={{ color: '#7B87A8' }}>Target Service:</span>
                <span style={{ fontWeight: 700, color: '#FFFFFF' }}>{generatedKey.serviceName}</span>
              </div>
              {generatedKey.providerName && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                  <span style={{ color: '#7B87A8' }}>Scoped Provider:</span>
                  <span style={{ fontWeight: 700, color: '#FFFFFF' }}>{generatedKey.providerName}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                <span style={{ color: '#7B87A8' }}>Rate Limit:</span>
                <span style={{ fontWeight: 700, color: '#38BDF8' }}>{generatedKey.rateLimitPerMin} req / min</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px' }}>
                <span style={{ color: '#7B87A8' }}>Allowed Scopes:</span>
                <span style={{ fontWeight: 700, color: '#5865F2' }}>{generatedKey.scopes.join(', ')}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetAndClose}
              className="pill-interactive pill-interactive-orange"
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Done & Dismiss
            </button>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#7B87A8', marginBottom: '6px', letterSpacing: '0.4px' }}>
                KEY LABEL / IDENTIFIER *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. St. Jude Emergency Triage Kiosk"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: '#171D36',
                  border: '1px solid rgba(255, 255, 255, 0.09)',
                  color: '#FFF',
                  fontSize: '13.5px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#7B87A8', marginBottom: '6px', letterSpacing: '0.4px' }}>
                  TARGET SERVICE
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: '#171D36',
                    border: '1px solid rgba(255, 255, 255, 0.09)',
                    color: '#FFF',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="all">Platform Universal Root (*)</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#7B87A8', marginBottom: '6px', letterSpacing: '0.4px' }}>
                  BIND TO BUSINESS TENANT
                </label>
                <select
                  value={selectedProviderId}
                  onChange={(e) => setSelectedProviderId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: '#171D36',
                    border: '1px solid rgba(255, 255, 255, 0.09)',
                    color: '#FFF',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">(None - System Orchestrator)</option>
                  {allProvidersList.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.categorySlug.toUpperCase()}] {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#7B87A8', marginBottom: '6px', letterSpacing: '0.4px' }}>
                  ENVIRONMENT
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['production', 'staging', 'sandbox'] as const).map((env) => (
                    <button
                      key={env}
                      type="button"
                      onClick={() => setEnvironment(env)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '10px',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        border: environment === env ? '1px solid #5865F2' : '1px solid rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer',
                        background: environment === env ? 'rgba(88, 101, 242, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                        color: environment === env ? '#FFFFFF' : '#A3AED0',
                        textTransform: 'capitalize',
                      }}
                    >
                      {env}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#7B87A8', letterSpacing: '0.4px' }}>RATE LIMIT</label>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#38BDF8' }}>{rateLimit} req/min</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={10000}
                  step={100}
                  value={rateLimit}
                  onChange={(e) => setRateLimit(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#FF7A1A' }}
                />
              </div>
            </div>

            {/* Scope Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#7B87A8', marginBottom: '8px', letterSpacing: '0.4px' }}>
                ACCESS SCOPES & PERMISSIONS
              </label>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  maxHeight: '130px',
                  overflowY: 'auto',
                  background: '#171D36',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleScopeToggle('*')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    border: 'none',
                    cursor: 'pointer',
                    background: selectedScopes.includes('*') ? '#5865F2' : 'rgba(255, 255, 255, 0.08)',
                    color: selectedScopes.includes('*') ? '#FFF' : '#A3AED0',
                  }}
                >
                  * Full Wildcard Root
                </button>
                {availableScopes.map((scope) => {
                  const active = selectedScopes.includes(scope) && !selectedScopes.includes('*');
                  return (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => handleScopeToggle(scope)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: active ? '#38BDF8' : 'rgba(255, 255, 255, 0.08)',
                        color: active ? '#0A0D18' : '#A3AED0',
                      }}
                    >
                      {scope}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Action */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={handleResetAndClose}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#A3AED0',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '13.5px',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="pill-interactive pill-interactive-orange"
                style={{
                  flex: 2,
                  padding: '14px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontSize: '13.5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span>Generate & Sign Key</span>
                <span>→</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
