'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  OrbitoxLogo,
  ZapIcon,
  ShieldCheckIcon,
  KeyIcon,
  SearchIcon,
  CpuIcon,
  HospitalIcon,
  ShoppingBagIcon,
  BriefcaseIcon,
  UtensilsIcon,
} from '../components/icons';

interface ApiEndpointDef {
  id: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  serviceId: string;
  category: 'admin' | 'hms' | 'commerce' | 'crm' | 'restaurant' | 'hospital';
  title: string;
  description: string;
  scopes?: string[];
  defaultQuery?: string;
  defaultBody?: string;
}

const API_CATALOG: ApiEndpointDef[] = [
  // 1. Admin Overview & Platform
  {
    id: 'ep-admin-overview',
    method: 'GET',
    path: '/api/v1/admin/overview',
    serviceId: 'admin',
    category: 'admin',
    title: 'Platform Overview & Telemetry',
    description: 'Returns real-time platform KPIs, 9 core engines count, traffic metrics, and cryptographic integrity.',
  },
  {
    id: 'ep-admin-services',
    method: 'GET',
    path: '/api/v1/admin/services',
    serviceId: 'admin',
    category: 'admin',
    title: 'List All 9 Core Microservices',
    description: 'Retrieves all microservices with live statuses, call quotas, latencies, and permissions.',
  },
  {
    id: 'ep-admin-services-toggle',
    method: 'POST',
    path: '/api/v1/admin/services',
    serviceId: 'admin',
    category: 'admin',
    title: 'Toggle Microservice Lockout Gate',
    description: 'Transitions microservice status between active and blocked to immediately enforce governance.',
    defaultBody: JSON.stringify({ serviceId: 'commerce', action: 'toggle' }, null, 2),
  },
  {
    id: 'ep-admin-providers',
    method: 'GET',
    path: '/api/v1/admin/providers',
    serviceId: 'admin',
    category: 'admin',
    title: 'List Business Providers & Tenants',
    description: 'Fetches multi-tenant business providers across hospitals, ecommerce, CRM, and restaurants.',
    defaultQuery: 'category=hospitals',
  },
  {
    id: 'ep-admin-api-keys',
    method: 'GET',
    path: '/api/v1/admin/api-keys',
    serviceId: 'admin',
    category: 'admin',
    title: 'List Issued API Credentials',
    description: 'Retrieves active, blocked, and revoked API credentials with rate limits and scopes.',
  },
  {
    id: 'ep-admin-quotas',
    method: 'GET',
    path: '/api/v1/admin/quotas',
    serviceId: 'admin',
    category: 'admin',
    title: 'Platform Quotas & Consumption',
    description: 'Live consumption metrics for monthly API calls, RAM cache, storage, and edge bandwidth.',
  },
  {
    id: 'ep-admin-system',
    method: 'GET',
    path: '/api/v1/admin/system',
    serviceId: 'admin',
    category: 'admin',
    title: 'Cryptographic Health & Frozen Facades',
    description: 'Verifies Ed25519 signature session and deep anti-tamper freeze across all 9 kernel facades.',
  },

  // 2. Hospital Management System (HMS)
  {
    id: 'ep-hms-patients',
    method: 'GET',
    path: '/api/v1/hms/patients',
    serviceId: 'hms',
    category: 'hms',
    title: 'Query Patient Registry (Tenant Scoped)',
    description: 'Fetches clinical patient records, triage scores, vitals, and diagnoses.',
  },
  {
    id: 'ep-hms-triage',
    method: 'POST',
    path: '/api/v1/hms/triage/advance',
    serviceId: 'hms',
    category: 'hms',
    title: 'Advance Emergency Triage State Machine',
    description: 'Transitions patient triage level (Level 1-5) and records audit trail.',
    defaultBody: JSON.stringify({ patientId: 'pat-101', newTriageLevel: 1, reason: 'Rapid response code activated' }, null, 2),
  },
  {
    id: 'ep-hms-beds',
    method: 'GET',
    path: '/api/v1/hms/beds',
    serviceId: 'hms',
    category: 'hms',
    title: 'Hospital Ward & Bed Matrix',
    description: 'Returns real-time ICU, Cardiology, and General ward bed occupancy and rates.',
  },
  {
    id: 'ep-hms-labs',
    method: 'GET',
    path: '/api/v1/hms/labs',
    serviceId: 'hms',
    category: 'hms',
    title: 'Diagnostic Lab Orders',
    description: 'Retrieves Troponin, CBC, Electrolytes, and Biochemistry diagnostic results.',
    defaultQuery: 'patientId=pat-101',
  },

  // 3. Commerce & Store Engine
  {
    id: 'ep-commerce-products',
    method: 'GET',
    path: '/api/v1/commerce/products',
    serviceId: 'commerce',
    category: 'commerce',
    title: 'Query Storefront Catalog',
    description: 'Fetches high-fashion catalog items, inventory levels, prices, and imagery.',
    defaultQuery: 'category=Outerwear',
  },
  {
    id: 'ep-commerce-checkout',
    method: 'POST',
    path: '/api/v1/commerce/checkout/initiate',
    serviceId: 'commerce',
    category: 'commerce',
    title: 'Initiate Zero-Trust Checkout',
    description: 'Creates a signed payment session token and expiration timestamp.',
    defaultBody: JSON.stringify({ items: [{ sku: 'AUR-TC-001', qty: 1 }], total: 1250, customerEmail: 'vip@client.com' }, null, 2),
  },
  {
    id: 'ep-commerce-orders',
    method: 'GET',
    path: '/api/v1/commerce/orders',
    serviceId: 'commerce',
    category: 'commerce',
    title: 'Customer Orders History',
    description: 'Fetches multi-channel order history and fulfillment statuses.',
  },

  // 4. CRM & Pipeline
  {
    id: 'ep-crm-leads',
    method: 'GET',
    path: '/api/v1/crm/leads',
    serviceId: 'crm',
    category: 'crm',
    title: 'Sales Pipeline & Leads',
    description: 'Retrieves prospective customer opportunities, pipeline valuations, and lead scores.',
  },
  {
    id: 'ep-crm-leads-post',
    method: 'POST',
    path: '/api/v1/crm/leads',
    serviceId: 'crm',
    category: 'crm',
    title: 'Ingest Inbound Lead Opportunity',
    description: 'Registers a new enterprise deal into the pipeline state machine.',
    defaultBody: JSON.stringify({ name: 'Dr. Gregory House', email: 'house@princeton.edu', company: 'Diagnostics Group', estimatedValue: 2800000 }, null, 2),
  },

  // 5. Restaurant OS
  {
    id: 'ep-restaurant-menu',
    method: 'GET',
    path: '/api/v1/restaurant/menu',
    serviceId: 'restaurant',
    category: 'restaurant',
    title: 'Menu Catalog & Wine List',
    description: 'Retrieves culinary menu items, preparation times, and prices.',
  },
  {
    id: 'ep-restaurant-orders',
    method: 'GET',
    path: '/api/v1/restaurant/orders',
    serviceId: 'restaurant',
    category: 'restaurant',
    title: 'Kitchen Display Live Tickets',
    description: 'Retrieves live table tickets and cooking status.',
  },

  // 6. Resilient Hospital Proxy
  {
    id: 'ep-hospital-patients-proxy',
    method: 'GET',
    path: '/api/hospital/patients',
    serviceId: 'hms',
    category: 'hospital',
    title: 'Resilient Patients Route (/api/hospital/patients)',
    description: 'Proxies to upstream microservice with automated failover to the in-memory clinical engine (zero 502 HTML parse errors).',
  },
  {
    id: 'ep-hospital-beds-proxy',
    method: 'GET',
    path: '/api/hospital/beds',
    serviceId: 'hms',
    category: 'hospital',
    title: 'Resilient Beds Route (/api/hospital/beds)',
    description: 'Retrieves or mutates bed allocations with automated fallback.',
  },
];

export default function DeveloperApisPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeEndpoint, setActiveEndpoint] = useState<ApiEndpointDef>(API_CATALOG[0]!);
  const [queryInput, setQueryInput] = useState<string>(API_CATALOG[0]?.defaultQuery || '');
  const [bodyInput, setBodyInput] = useState<string>(API_CATALOG[0]?.defaultBody || '');
  const [executing, setExecuting] = useState(false);
  const [responseResult, setResponseResult] = useState<any>(null);
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({});
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const filteredEndpoints = API_CATALOG.filter(
    (ep) => selectedCategory === 'all' || ep.category === selectedCategory
  );

  const handleSelectEndpoint = (ep: ApiEndpointDef) => {
    setActiveEndpoint(ep);
    setQueryInput(ep.defaultQuery || '');
    setBodyInput(ep.defaultBody || '');
    setResponseResult(null);
    setStatusCode(null);
  };

  const handleExecuteRequest = async () => {
    setExecuting(true);
    setResponseResult(null);
    setStatusCode(null);
    const startTime = performance.now();

    try {
      const url = queryInput ? `${activeEndpoint.path}?${queryInput}` : activeEndpoint.path;
      const options: RequestInit = {
        method: activeEndpoint.method,
        headers: {
          'Accept': 'application/json',
          ...(activeEndpoint.method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
        },
      };

      if (activeEndpoint.method !== 'GET' && bodyInput.trim()) {
        options.body = bodyInput;
      }

      const res = await fetch(url, options);
      const headersMap: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        headersMap[key] = val;
      });
      setResponseHeaders(headersMap);
      setStatusCode(res.status);

      const json = await res.json();
      setResponseResult(json);
    } catch (err: any) {
      setStatusCode(500);
      setResponseResult({ error: err.message || 'Execution error' });
    } finally {
      setExecuting(false);
    }
  };

  const copyToClipboard = () => {
    if (responseResult) {
      navigator.clipboard.writeText(JSON.stringify(responseResult, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getMethodBadge = (m: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      GET: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', border: 'rgba(16, 185, 129, 0.3)' },
      POST: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6', border: 'rgba(59, 130, 246, 0.3)' },
      PATCH: { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' },
      DELETE: { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.3)' },
    };
    const c = colors[m] || { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', border: 'rgba(16, 185, 129, 0.3)' };
    return (
      <span
        style={{
          background: c.bg,
          color: c.text,
          border: `1px solid ${c.border}`,
          padding: '3px 8px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 800,
          fontFamily: 'monospace',
          letterSpacing: '0.5px',
        }}
      >
        {m}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* 1. Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '24px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: '#FFFFFF', letterSpacing: '-0.5px' }}>
              Developer API & REST Explorer
            </h1>
            <span
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#60A5FA',
                fontSize: '11.5px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '999px',
              }}
            >
              OpenAPI 3.1
            </span>
          </div>
          <p style={{ color: '#A3AED0', fontSize: '13.5px', margin: 0, lineHeight: 1.5 }}>
            Interactive zero-trust test console for all 9 OrbitoX microservices, platform governance, and resilient edge endpoints.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <a
            href="/api/v1/openapi.json"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#13172B',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '13px',
              padding: '9px 16px',
              borderRadius: '12px',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <OrbitoxLogo size={16} />
            <span>Raw openapi.json ↗</span>
          </a>

          <Link
            href="/admin/api-keys"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '13px',
              padding: '9px 18px',
              borderRadius: '12px',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
            }}
          >
            <KeyIcon size={16} />
            <span>Manage API Keys</span>
          </Link>
        </div>
      </div>

      {/* 2. Category Filter Pills */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'All Endpoints', count: API_CATALOG.length },
          { id: 'admin', label: 'Platform Admin', count: API_CATALOG.filter((e) => e.category === 'admin').length },
          { id: 'hms', label: 'Hospital OS (HMS)', count: API_CATALOG.filter((e) => e.category === 'hms').length },
          { id: 'commerce', label: 'Commerce Engine', count: API_CATALOG.filter((e) => e.category === 'commerce').length },
          { id: 'crm', label: 'CRM Pipeline', count: API_CATALOG.filter((e) => e.category === 'crm').length },
          { id: 'restaurant', label: 'Restaurant OS', count: API_CATALOG.filter((e) => e.category === 'restaurant').length },
          { id: 'hospital', label: 'Resilient Proxy', count: API_CATALOG.filter((e) => e.category === 'hospital').length },
        ].map((tab) => {
          const active = selectedCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              style={{
                background: active ? '#3B82F6' : '#13172B',
                color: active ? '#FFFFFF' : '#A3AED0',
                border: active ? '1px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '999px',
                padding: '7px 16px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  background: active ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                  padding: '2px 7px',
                  borderRadius: '999px',
                  fontSize: '11px',
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Main Workspace: Endpoint Selector & Interactive Console */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 380px) 1fr',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Left: Endpoint List */}
        <div
          style={{
            background: '#13172B',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: '750px',
            overflowY: 'auto',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#7B87A8', textTransform: 'uppercase', padding: '6px 10px', letterSpacing: '0.8px' }}>
            Catalog Endpoints ({filteredEndpoints.length})
          </div>

          {filteredEndpoints.map((ep) => {
            const isSelected = activeEndpoint.id === ep.id;
            return (
              <div
                key={ep.id}
                onClick={() => handleSelectEndpoint(ep)}
                style={{
                  background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                  border: isSelected ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.04)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {getMethodBadge(ep.method)}
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      color: isSelected ? '#FFFFFF' : '#CBD5E1',
                      fontWeight: 600,
                      wordBreak: 'break-all',
                    }}
                  >
                    {ep.path}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: isSelected ? '#93C5FD' : '#A3AED0', fontWeight: 600 }}>
                  {ep.title}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Live Request & Response Inspector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Request Config Card */}
          <div
            style={{
              background: '#13172B',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            {/* Header / Target URL */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {getMethodBadge(activeEndpoint.method)}
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', fontFamily: 'monospace' }}>
                  {activeEndpoint.path}
                </span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  color: '#10B981',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontWeight: 700,
                }}
              >
                Zero-Trust Protected
              </span>
            </div>

            <p style={{ color: '#A3AED0', fontSize: '13px', margin: 0 }}>
              {activeEndpoint.description}
            </p>

            {/* Query String Input if applicable */}
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#7B87A8', textTransform: 'uppercase', marginBottom: '6px' }}>
                URL Query Parameters (optional)
              </label>
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="e.g. category=hospitals&status=active"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#0B0F1E',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  outline: 'none',
                }}
              />
            </div>

            {/* Request Body Input if POST / PATCH */}
            {activeEndpoint.method !== 'GET' && (
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#7B87A8', textTransform: 'uppercase', marginBottom: '6px' }}>
                  JSON Request Body
                </label>
                <textarea
                  rows={5}
                  value={bodyInput}
                  onChange={(e) => setBodyInput(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#0B0F1E',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    color: '#67E8F9',
                    fontSize: '12.5px',
                    fontFamily: 'monospace',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>
            )}

            {/* Execute Button */}
            <div>
              <button
                type="button"
                onClick={handleExecuteRequest}
                disabled={executing}
                style={{
                  background: executing ? '#1E293B' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  border: 'none',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  padding: '11px 24px',
                  borderRadius: '12px',
                  cursor: executing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                  transition: 'all 0.15s ease',
                }}
              >
                <ZapIcon size={16} />
                <span>{executing ? 'Executing Request...' : 'Send Live Request'}</span>
              </button>
            </div>
          </div>

          {/* Response Inspector Card */}
          <div
            style={{
              background: '#13172B',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>
                  Response Output
                </span>
                {statusCode && (
                  <span
                    style={{
                      background: statusCode >= 200 && statusCode < 300 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: statusCode >= 200 && statusCode < 300 ? '#10B981' : '#EF4444',
                      border: `1px solid ${statusCode >= 200 && statusCode < 300 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 800,
                      fontFamily: 'monospace',
                    }}
                  >
                    HTTP {statusCode}
                  </span>
                )}
              </div>

              {/* Telemetry Header Badges */}
              {statusCode && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {responseHeaders['x-orbitox-latency-ms'] && (
                    <span
                      style={{
                        background: 'rgba(59, 130, 246, 0.12)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        color: '#60A5FA',
                        padding: '3px 9px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                      }}
                    >
                      Latency: {responseHeaders['x-orbitox-latency-ms']}ms
                    </span>
                  )}
                  {responseHeaders['x-orbitox-anti-tamper'] && (
                    <span
                      style={{
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        color: '#10B981',
                        padding: '3px 9px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      Anti-Tamper: {responseHeaders['x-orbitox-anti-tamper']}
                    </span>
                  )}
                  {responseResult && (
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {copied ? 'Copied!' : 'Copy JSON'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Code Body */}
            <div
              style={{
                background: '#0B0F1E',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                padding: '16px',
                minHeight: '200px',
                maxHeight: '450px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '12.5px',
                lineHeight: 1.6,
                color: responseResult ? '#67E8F9' : '#64748B',
              }}
            >
              {executing ? (
                <div style={{ color: '#93C5FD', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ZapIcon size={16} color="#3B82F6" />
                  <span>Connecting to gateway and executing zero-trust pipeline...</span>
                </div>
              ) : responseResult ? (
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {JSON.stringify(responseResult, null, 2)}
                </pre>
              ) : (
                <div style={{ color: '#475569', textAlign: 'center', padding: '40px 20px' }}>
                  Click "Send Live Request" above to execute this endpoint and inspect response payloads.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
