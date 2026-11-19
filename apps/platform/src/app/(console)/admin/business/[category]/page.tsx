'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useAdmin } from '../../data/admin-context';
import { BUSINESS_CATEGORIES } from '../../data/mock-data';
import { ProviderCard } from '../../components/provider-card';
import { OnboardProviderModal } from '../../components/onboard-provider-modal';
import { DynamicIcon } from '../../components/dynamic-icon';
import {
  ChevronRightIcon,
  SearchIcon,
  PlusIcon,
  ArrowDownIcon,
} from '../../components/icons';

interface PageProps {
  params: Promise<{ category: string }>;
}

export default function BusinessCategoryProvidersPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const categorySlug = resolvedParams.category;

  const { providers, showToast } = useAdmin();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked' | 'maintenance'>('all');
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);

  const category = BUSINESS_CATEGORIES.find((c) => c.slug === categorySlug);
  const providerList = providers[categorySlug] || [];

  if (!category) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Business Vertical Not Found</h2>
        <p style={{ color: '#A3AED0' }}>The specified business service category does not exist.</p>
        <Link
          href="/admin/business"
          className="pill-interactive pill-interactive-primary"
          style={{
            display: 'inline-block',
            marginTop: '16px',
            textDecoration: 'none',
          }}
        >
          Back to All Verticals
        </Link>
      </div>
    );
  }

  const filteredProviders = providerList.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.customDomain.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(providerList, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `orbitox_${categorySlug}_providers.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`Exported ${providerList.length} ${category.title} providers to JSON`);
  };

  const activeCount = providerList.filter((p) => p.status === 'active').length;
  const maintenanceCount = providerList.filter((p) => p.status === 'maintenance').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#A3AED0' }}>
        <Link href="/admin" style={{ color: '#A3AED0', textDecoration: 'none', fontWeight: 600 }}>
          Admin
        </Link>
        <ChevronRightIcon size={12} color="#7B87A8" />
        <Link href="/admin/business" style={{ color: '#A3AED0', textDecoration: 'none', fontWeight: 600 }}>
          Business Verticals
        </Link>
        <ChevronRightIcon size={12} color="#7B87A8" />
        <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{category.title}</span>
      </div>

      {/* Category Hero Banner Squircle Card */}
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
        {/* Ambient colored corner glow */}
        <div
          style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: '220px',
            height: '220px',
            background: category.color,
            opacity: 0.16,
            filter: 'blur(55px)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: `${category.color}18`,
              border: `1px solid ${category.color}35`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: category.color,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
            }}
          >
            <DynamicIcon name={category.slug || category.id} size={32} color={category.color} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: 900, margin: 0, letterSpacing: '-0.5px', color: '#FFFFFF' }}>
                {category.title}
              </h1>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: '999px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: category.color,
                  border: `1px solid ${category.color}40`,
                }}
              >
                {providerList.length} Providers Live
              </span>
            </div>
            <p style={{ color: '#A3AED0', fontSize: '13.5px', margin: '6px 0 0 0', maxWidth: '650px', lineHeight: '1.5' }}>
              {category.description}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleExportJson}
            className="pill-interactive"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
            }}
          >
            <ArrowDownIcon size={14} color="#CBD5E1" />
            <span>Export JSON</span>
          </button>
          <button
            type="button"
            onClick={() => setIsOnboardModalOpen(true)}
            className="pill-interactive pill-interactive-orange"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 20px',
            }}
          >
            <PlusIcon size={14} color="#FFFFFF" />
            <span>Onboard {category.title.split(' ')[0]}</span>
          </button>
        </div>
      </div>

      {/* Quick Summary KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <div className="squircle-card" style={{ padding: '22px 26px', background: '#13172B', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '20px' }}>
          <div style={{ fontSize: '10.5px', color: '#7B87A8', fontWeight: 700, letterSpacing: '0.6px' }}>TOTAL PROVISIONED</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#FFFFFF', marginTop: '6px', letterSpacing: '-0.5px' }}>
            {providerList.length} Providers
          </div>
          <div style={{ fontSize: '11.5px', color: '#10B981', marginTop: '4px', fontWeight: 700 }}>
            {activeCount} Active • {maintenanceCount} Maintenance
          </div>
        </div>

        <div className="squircle-card" style={{ padding: '22px 26px', background: '#13172B', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '20px' }}>
          <div style={{ fontSize: '10.5px', color: '#7B87A8', fontWeight: 700, letterSpacing: '0.6px' }}>AGGREGATE API VOLUME</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#38BDF8', marginTop: '6px', letterSpacing: '-0.5px' }}>
            {category.totalApiCalls}
          </div>
          <div style={{ fontSize: '11.5px', color: '#A3AED0', marginTop: '4px' }}>Monthly requests across vertical</div>
        </div>

        <div className="squircle-card" style={{ padding: '22px 26px', background: '#13172B', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '20px' }}>
          <div style={{ fontSize: '10.5px', color: '#7B87A8', fontWeight: 700, letterSpacing: '0.6px' }}>AUDIENCE REACH</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#818CF8', marginTop: '6px', letterSpacing: '-0.5px' }}>
            {category.totalActiveUsers}
          </div>
          <div style={{ fontSize: '11.5px', color: '#A3AED0', marginTop: '4px' }}>End-user population served</div>
        </div>

        <div className="squircle-card" style={{ padding: '22px 26px', background: '#13172B', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '20px' }}>
          <div style={{ fontSize: '10.5px', color: '#7B87A8', fontWeight: 700, letterSpacing: '0.6px' }}>ACTIVE ENGINES</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#FF7A1A', marginTop: '6px', letterSpacing: '-0.5px' }}>
            {category.activeServices.length} Engines
          </div>
          <div style={{ fontSize: '11.5px', color: '#A3AED0', marginTop: '4px' }}>Zero-trust multi-tenant context</div>
        </div>
      </div>

      {/* Filter and Search Bar (Sleek pill style) */}
      <div
        className="squircle-card"
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
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
          <SearchIcon size={16} color="#818CF8" />
          <input
            type="text"
            placeholder={`Search ${category.title.split(' ')[0]} by name, city, custom domain...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '13px',
              outline: 'none',
              fontWeight: 600,
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#7B87A8', fontWeight: 700, letterSpacing: '0.4px', marginRight: '4px' }}>
            STATUS:
          </span>
          {(['all', 'active', 'blocked', 'maintenance'] as const).map((st) => {
            const active = statusFilter === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  fontSize: '11.5px',
                  fontWeight: active ? 700 : 600,
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  background: active ? '#5865F2' : '#171D36',
                  color: active ? '#FFFFFF' : '#A3AED0',
                  boxShadow: active ? '0 2px 10px rgba(88, 101, 242, 0.4)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {st}
              </button>
            );
          })}
        </div>
      </div>

      {/* Providers Grid */}
      {filteredProviders.length === 0 ? (
        <div
          className="squircle-card"
          style={{
            padding: '60px',
            textAlign: 'center',
            background: '#13172B',
            borderRadius: '20px',
            border: '1px dashed rgba(255, 255, 255, 0.12)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
            <SearchIcon size={36} color="#7B87A8" />
          </div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>No providers match your filter</h3>
          <p style={{ color: '#A3AED0', fontSize: '13px', margin: '6px 0 0 0' }}>
            Try adjusting your search query or status criteria.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '24px',
          }}
        >
          {filteredProviders.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              categorySlug={categorySlug}
            />
          ))}
        </div>
      )}

      {/* Onboard Provider Modal */}
      <OnboardProviderModal
        isOpen={isOnboardModalOpen}
        onClose={() => setIsOnboardModalOpen(false)}
        defaultCategorySlug={categorySlug}
      />
    </div>
  );
}
