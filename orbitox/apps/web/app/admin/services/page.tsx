'use client';

import React, { useState } from 'react';
import { useAdmin } from '../data/admin-context';
import { ServiceCard } from '../components/service-card';
import { ApiKeyModal } from '../components/api-key-modal';
import { DynamicIcon } from '../components/dynamic-icon';
import { CpuIcon, KeyIcon, SearchIcon } from '../components/icons';

export default function ServicesPage() {
  const { services } = useAdmin();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [targetServiceId, setTargetServiceId] = useState<string | undefined>(undefined);

  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'healthcare', label: 'Healthcare' },
    { id: 'ecommerce', label: 'E-Commerce' },
    { id: 'sales', label: 'CRM & Sales' },
    { id: 'restaurant', label: 'Restaurant' },
    { id: 'finance', label: 'Finance' },
    { id: 'logistics', label: 'Logistics' },
    { id: 'hr', label: 'HR & People' },
    { id: 'education', label: 'Education' },
    { id: 'retail', label: 'Retail POS' },
  ];

  const filteredServices = services.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.packageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || s.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || s.status === selectedStatus;
    return matchesSearch && matchesCat && matchesStatus;
  });

  const handleOpenKeyModalForService = (serviceId: string) => {
    setTargetServiceId(serviceId);
    setIsKeyModalOpen(true);
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
              <CpuIcon size={26} color="#818CF8" />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 900, margin: 0, letterSpacing: '-0.5px', color: '#FFFFFF' }}>
              Platform Services & Microservices Engine
            </h1>
          </div>
          <p style={{ color: '#A3AED0', fontSize: '13.5px', margin: '8px 0 0 0', maxWidth: '750px', lineHeight: 1.6 }}>
            Govern and inspect all 9 OrbitoX core services. Toggle active/blocked status, check consumption quotas, and issue scoped API credentials.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setTargetServiceId(undefined);
            setIsKeyModalOpen(true);
          }}
          className="pill-interactive pill-interactive-orange"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '11px 22px',
            fontSize: '13px',
          }}
        >
          <KeyIcon size={15} color="#FFFFFF" />
          <span>Issue Service API Key</span>
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
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
          <SearchIcon size={18} color="#818CF8" />
          <input
            type="text"
            placeholder="Search service name, package, or description..."
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

        {/* Status Filter */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#7B87A8', fontWeight: 700, letterSpacing: '0.6px' }}>STATUS:</span>
          {['all', 'active', 'blocked'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedStatus(st)}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '11.5px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                textTransform: 'capitalize',
                background: selectedStatus === st ? '#5865F2' : '#171D36',
                color: selectedStatus === st ? '#FFFFFF' : '#A3AED0',
                boxShadow: selectedStatus === st ? '0 4px 14px rgba(88, 101, 242, 0.4)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: isSelected ? 700 : 600,
                border: isSelected ? '1px solid rgba(255, 122, 26, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                background: isSelected ? '#FF7A1A' : '#13172B',
                color: isSelected ? '#FFFFFF' : '#A3AED0',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: isSelected ? '0 4px 14px rgba(255, 122, 26, 0.35)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {cat.id !== 'all' && (
                <DynamicIcon name={cat.id} size={14} color={isSelected ? '#FFFFFF' : '#818CF8'} />
              )}
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <div
          style={{
            padding: '60px',
            textAlign: 'center',
            background: '#13172B',
            borderRadius: '20px',
            border: '1px dashed rgba(255, 255, 255, 0.1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
            <SearchIcon size={36} color="#7B87A8" />
          </div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>No matching services found</h3>
          <p style={{ color: '#A3AED0', fontSize: '13px', margin: '6px 0 0 0' }}>
            Try adjusting your search query or category filter.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '20px',
          }}
        >
          {filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onOpenKeyModal={handleOpenKeyModalForService}
            />
          ))}
        </div>
      )}

      {/* Scoped API Key Modal */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        defaultServiceId={targetServiceId}
      />
    </div>
  );
}
