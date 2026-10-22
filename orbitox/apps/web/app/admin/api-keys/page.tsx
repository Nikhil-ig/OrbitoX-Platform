'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAdmin } from '../data/admin-context';
import { ApiKeyModal } from '../components/api-key-modal';
import {
  KeyIcon,
  PlusIcon,
  SearchIcon,
  CopyIcon,
  BuildingIcon,
  ExternalLinkIcon,
} from '../components/icons';

export default function ApiKeysManagementPage() {
  const { apiKeys, toggleApiKeyStatus, revokeApiKey, showToast, providers } = useAdmin();
  const [searchQuery, setSearchQuery] = useState('');
  const [envFilter, setEnvFilter] = useState<'all' | 'production' | 'staging' | 'sandbox'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked' | 'revoked'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getProviderCategorySlug = (provId?: string) => {
    if (!provId) return null;
    for (const [catSlug, list] of Object.entries(providers)) {
      if (list.some((p) => p.id === provId)) return catSlug;
    }
    return null;
  };

  const filteredKeys = apiKeys.filter((k) => {
    const matchesSearch =
      k.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (k.providerName && k.providerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      k.maskedKey.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEnv = envFilter === 'all' || k.environment === envFilter;
    const matchesStatus = statusFilter === 'all' || k.status === statusFilter;
    return matchesSearch && matchesEnv && matchesStatus;
  });

  const handleCopyKey = (keyString: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(keyString);
    }
    showToast('Copied key prefix to clipboard');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Top Header Squircle Card */}
      <div
        className="squircle-card"
        style={{
          padding: '30px 34px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px',
          background: '#13172B',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: '24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(88, 101, 242, 0.2) 0%, rgba(88, 101, 242, 0.05) 100%)',
                border: '1px solid rgba(88, 101, 242, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818CF8',
                boxShadow: '0 8px 24px rgba(88, 101, 242, 0.25)',
              }}
            >
              <KeyIcon size={26} color="#818CF8" />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 900, margin: 0, letterSpacing: '-0.5px', color: '#FFFFFF' }}>
              Platform API Key & Credential Center
            </h1>
          </div>
          <p style={{ color: '#A3AED0', fontSize: '13.5px', margin: '8px 0 0 0', maxWidth: '750px', lineHeight: 1.6 }}>
            Generate, inspect, block, or permanently revoke cryptographic API keys across all microservices and business tenants.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="pill-interactive pill-interactive-orange"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '11px 22px',
            fontSize: '13px',
          }}
        >
          <PlusIcon size={14} color="#FFFFFF" />
          <span>Generate New API Key</span>
        </button>
      </div>

      {/* Filter and Search Bar (Sleek Borderless Elevated) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#13172B',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          padding: '14px 20px',
          borderRadius: '20px',
          boxShadow: '0 12px 36px -8px rgba(0, 0, 0, 0.45)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
          <SearchIcon size={16} color="#818CF8" />
          <input
            type="text"
            placeholder="Search key by label, service, tenant, or prefix..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '13.5px',
              outline: 'none',
              fontWeight: 600,
            }}
          />
        </div>

        {/* Environment Filter */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#7B87A8', fontWeight: 700, letterSpacing: '0.6px' }}>ENV:</span>
          {(['all', 'production', 'staging', 'sandbox'] as const).map((env) => (
            <button
              key={env}
              type="button"
              onClick={() => setEnvFilter(env)}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '11.5px',
                fontWeight: envFilter === env ? 700 : 600,
                border: 'none',
                cursor: 'pointer',
                textTransform: 'capitalize',
                background: envFilter === env ? '#5865F2' : '#171D36',
                color: envFilter === env ? '#FFFFFF' : '#A3AED0',
                boxShadow: envFilter === env ? '0 4px 14px rgba(88, 101, 242, 0.4)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {env}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#7B87A8', fontWeight: 700, letterSpacing: '0.6px' }}>STATUS:</span>
          {(['all', 'active', 'blocked', 'revoked'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '11.5px',
                fontWeight: statusFilter === st ? 700 : 600,
                border: 'none',
                cursor: 'pointer',
                textTransform: 'capitalize',
                background: statusFilter === st ? '#FF7A1A' : '#171D36',
                color: statusFilter === st ? '#FFFFFF' : '#A3AED0',
                boxShadow: statusFilter === st ? '0 4px 14px rgba(255, 122, 26, 0.4)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Keys Table Container (Squircle Card) */}
      <div
        className="squircle-card"
        style={{
          padding: '24px',
          background: '#13172B',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: '24px',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  background: '#171D36',
                  color: '#7B87A8',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                <th style={{ padding: '14px 20px' }}>Key Name & Identifier</th>
                <th style={{ padding: '14px 20px' }}>Target Scope & Service</th>
                <th style={{ padding: '14px 20px' }}>Rate Limit</th>
                <th style={{ padding: '14px 20px' }}>Last Used</th>
                <th style={{ padding: '14px 20px' }}>Status</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredKeys.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#A3AED0' }}>
                    No API keys matched your current filters.
                  </td>
                </tr>
              ) : (
                filteredKeys.map((key) => {
                  const isBlocked = key.status === 'blocked';
                  const isRevoked = key.status === 'revoked';

                  return (
                    <tr
                      key={key.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Name & Masked String */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 700, color: '#FFFFFF' }}>{key.name}</div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontFamily: 'monospace',
                            fontSize: '11.5px',
                            color: '#38BDF8',
                            marginTop: '3px',
                          }}
                        >
                          <span>{key.maskedKey}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyKey(key.maskedKey)}
                            title="Copy masked prefix"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#818CF8',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px',
                            }}
                          >
                            <CopyIcon size={12} color="#818CF8" />
                          </button>
                        </div>
                      </td>

                      {/* Target Service & Tenant */}
                      <td style={{ padding: '16px 20px' }}>
                        {key.serviceId !== 'all' ? (
                          <Link
                            href={`/admin/services/${key.serviceId}`}
                            style={{
                              color: '#818CF8',
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>{key.serviceName}</span>
                            <ExternalLinkIcon size={11} color="#818CF8" />
                          </Link>
                        ) : (
                          <div style={{ color: '#E2E8F0', fontWeight: 600 }}>{key.serviceName}</div>
                        )}

                        {key.providerName && (
                          <div style={{ marginTop: '4px' }}>
                            {(() => {
                              const provCategorySlug = getProviderCategorySlug(key.providerId);
                              if (provCategorySlug && key.providerId) {
                                return (
                                  <Link
                                    href={`/admin/business/${provCategorySlug}/${key.providerId}`}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '11px',
                                      color: '#C084FC',
                                      textDecoration: 'none',
                                      fontWeight: 600,
                                    }}
                                  >
                                    <BuildingIcon size={12} color="#C084FC" />
                                    <span>{key.providerName}</span>
                                    <ExternalLinkIcon size={10} color="#C084FC" />
                                  </Link>
                                );
                              }
                              return (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#C084FC' }}>
                                  <BuildingIcon size={12} color="#C084FC" />
                                  <span>{key.providerName}</span>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                        {!key.providerName && (
                          <div style={{ fontSize: '11px', color: '#7B87A8', marginTop: '3px' }}>
                            Universal Root
                          </div>
                        )}
                      </td>

                      {/* Rate Limit */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontWeight: 600, color: '#FFFFFF' }}>
                          {key.rateLimitPerMin}
                        </span>{' '}
                        <span style={{ color: '#64748B', fontSize: '11px' }}>req/min</span>
                      </td>

                      {/* Last Used */}
                      <td style={{ padding: '16px 20px', color: '#94A3B8', fontSize: '12px' }}>
                        {key.lastUsedAt}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            padding: '3px 8px',
                            borderRadius: '999px',
                            background:
                              key.status === 'active'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : isBlocked
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(100, 116, 139, 0.2)',
                            color:
                              key.status === 'active'
                                ? '#10B981'
                                : isBlocked
                                ? '#EF4444'
                                : '#94A3B8',
                            border: `1px solid ${
                              key.status === 'active'
                                ? 'rgba(16, 185, 129, 0.3)'
                                : isBlocked
                                ? 'rgba(239, 68, 68, 0.3)'
                                : 'rgba(100, 116, 139, 0.3)'
                            }`,
                          }}
                        >
                          {key.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {!isRevoked && (
                            <button
                              type="button"
                              onClick={() => toggleApiKeyStatus(key.id)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                border: isBlocked ? '1px solid #10B981' : '1px solid rgba(239, 68, 68, 0.4)',
                                background: isBlocked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                                color: isBlocked ? '#10B981' : '#EF4444',
                              }}
                            >
                              {isBlocked ? 'Activate' : 'Block'}
                            </button>
                          )}
                          {!isRevoked ? (
                            <button
                              type="button"
                              onClick={() => revokeApiKey(key.id)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: '#94A3B8',
                              }}
                            >
                              Revoke
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#64748B', fontStyle: 'italic' }}>
                              Revoked
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ApiKeyModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
