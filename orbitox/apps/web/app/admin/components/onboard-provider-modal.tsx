'use client';

import React, { useState } from 'react';
import { useAdmin } from '../data/admin-context';
import { BUSINESS_CATEGORIES, BusinessProvider } from '../data/mock-data';
import { BuildingIcon, CheckIcon, PlusIcon } from './icons';
import { DynamicIcon } from './dynamic-icon';

interface OnboardProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategorySlug?: string;
}

export function OnboardProviderModal({
  isOpen,
  onClose,
  defaultCategorySlug,
}: OnboardProviderModalProps) {
  const { addProvider, services } = useAdmin();

  const [categorySlug, setCategorySlug] = useState(defaultCategorySlug || 'hospitals');
  const [name, setName] = useState('');
  const [legalEntity, setLegalEntity] = useState('');
  const [tagline, setTagline] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('USA');
  const [customDomain, setCustomDomain] = useState('');
  const [plan, setPlan] = useState('Enterprise Tier 1');
  const [avatar, setAvatar] = useState('hospital');
  const [selectedServices, setSelectedServices] = useState<string[]>(['hms', 'inventory', 'crm']);
  const [apiCallQuota, setApiCallQuota] = useState(3000000);
  const [storageQuotaGb, setStorageQuotaGb] = useState(500);

  if (!isOpen) return null;

  const handleCategoryChange = (slug: string) => {
    setCategorySlug(slug);
    const cat = BUSINESS_CATEGORIES.find((c) => c.slug === slug);
    if (cat) {
      setAvatar(cat.slug);
      setSelectedServices(cat.activeServices.slice(0, 3));
    }
  };

  const handleToggleService = (svcId: string) => {
    if (selectedServices.includes(svcId)) {
      setSelectedServices(selectedServices.filter((s) => s !== svcId));
    } else {
      setSelectedServices([...selectedServices, svcId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !customDomain.trim()) return;

    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const newProvider: BusinessProvider = {
      id,
      categorySlug,
      name: name.trim(),
      legalEntity: legalEntity.trim() || `${name.trim()} Holdings Inc.`,
      tagline: tagline.trim() || `Enterprise ${categorySlug} tenant`,
      city: city.trim() || 'Global',
      country: country.trim() || 'Global',
      status: 'active',
      plan,
      customDomain: customDomain.trim().toLowerCase().replace(/^https?:\/\//, ''),
      cnameVerified: true,
      sslActive: true,
      avatar: avatar || 'building',
      createdAt: new Date().toISOString().slice(0, 10),
      metrics: [
        { label: 'Active Capacity', value: '100% Ready', subtext: 'Provisioned' },
        { label: 'Network Latency', value: '12 ms', subtext: 'Anycast Edge' },
        { label: 'Registered Entities', value: '0 Active', subtext: 'New Onboard' },
        { label: 'Operating Staff', value: 'Admin Only', subtext: 'SSO Enabled' },
      ],
      monthlyApiCalls: 0,
      apiCallQuota,
      storageUsedGb: 0,
      storageQuotaGb,
      enabledServices: selectedServices.length > 0 ? selectedServices : ['crm'],
      apiKeysCount: 1,
      contactEmail: `admin@${customDomain.trim().toLowerCase().replace(/^https?:\/\//, '')}`,
      technicalLead: 'Platform SuperAdmin (Self-Provisioned)',
    };

    addProvider(categorySlug, newProvider);
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
          maxWidth: '660px',
          background: '#13172B',
          border: '1px solid rgba(88, 101, 242, 0.3)',
          borderRadius: '24px',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.85), 0 0 40px rgba(88, 101, 242, 0.2)',
          padding: '32px',
          color: '#FFFFFF',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Modal Header */}
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
                <BuildingIcon size={22} />
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 900, margin: 0, letterSpacing: '-0.4px', color: '#FFFFFF' }}>
                Onboard New Business Provider
              </h2>
            </div>
            <p style={{ color: '#A3AED0', fontSize: '13.5px', margin: '6px 0 0 54px' }}>
              Provision an isolated zero-trust tenant with custom domain routing and microservice licenses.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
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

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#7B87A8', marginBottom: '6px', letterSpacing: '0.4px' }}>
                BUSINESS VERTICAL *
              </label>
              <select
                value={categorySlug}
                onChange={(e) => handleCategoryChange(e.target.value)}
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
                {BUSINESS_CATEGORIES.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#7B87A8', marginBottom: '6px', letterSpacing: '0.4px' }}>
                LICENSE PLAN TIER *
              </label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
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
                <option value="Enterprise Dedicated">Enterprise Dedicated</option>
                <option value="Enterprise Tier 1">Enterprise Tier 1</option>
                <option value="Growth Pro">Growth Pro</option>
                <option value="Starter Biz">Starter Biz</option>
                <option value="Campus Enterprise">Campus Enterprise</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#7B87A8', marginBottom: '6px', letterSpacing: '0.4px' }}>
              PROVIDER / INSTITUTION NAME *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Cedars-Sinai Medical Center"
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
                LEGAL ENTITY
              </label>
              <input
                type="text"
                placeholder="e.g. Cedars-Sinai Health Trust Inc."
                value={legalEntity}
                onChange={(e) => setLegalEntity(e.target.value)}
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

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#7B87A8', marginBottom: '6px', letterSpacing: '0.4px' }}>
                CUSTOM DOMAIN (HOSTED FQDN) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. portal.cedarssinai.org"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: '#171D36',
                  border: '1px solid rgba(255, 255, 255, 0.09)',
                  color: '#5865F2',
                  fontFamily: 'monospace',
                  fontSize: '13.5px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#7B87A8', marginBottom: '6px', letterSpacing: '0.4px' }}>
                SPECIALTY / TAGLINE
              </label>
              <input
                type="text"
                placeholder="e.g. Comprehensive Acute Neurosurgery & Trauma"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
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

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#7B87A8', marginBottom: '6px', letterSpacing: '0.4px' }}>
                CITY & COUNTRY
              </label>
              <input
                type="text"
                placeholder="e.g. Los Angeles, USA"
                value={city}
                onChange={(e) => setCity(e.target.value)}
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
          </div>

          {/* Microservices Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#7B87A8', marginBottom: '8px', letterSpacing: '0.4px' }}>
              INITIAL ACTIVE MICROSERVICE ENGINES
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {services.map((svc) => {
                const isSelected = selectedServices.includes(svc.id);
                return (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => handleToggleService(svc.id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: isSelected ? '1px solid #10B981' : '1px solid rgba(255, 255, 255, 0.08)',
                      background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      color: isSelected ? '#10B981' : '#A3AED0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <DynamicIcon name={svc.id} size={14} color={isSelected ? '#10B981' : '#A3AED0'} />
                    <span>{svc.name.split(' ')[0]}</span>
                    {isSelected ? <CheckIcon size={12} color="#10B981" /> : <PlusIcon size={12} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button
              type="button"
              onClick={onClose}
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
              <span>Provision & Bind Domain</span>
              <span>→</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
