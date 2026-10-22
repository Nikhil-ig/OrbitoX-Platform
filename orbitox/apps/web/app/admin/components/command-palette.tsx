'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../data/admin-context';
import { BUSINESS_CATEGORIES } from '../data/mock-data';
import {
  SearchIcon,
  KeyIcon,
  BarChartIcon,
  SlidersIcon,
  ShieldCheckIcon,
  PackageIcon,
  CpuIcon,
  RocketIcon,
  HospitalIcon,
  ShoppingBagIcon,
  BriefcaseIcon,
  CreditCardIcon,
  GlobeIcon,
  ZapIcon,
} from './icons';
import { DynamicIcon } from './dynamic-icon';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenKeyModal: () => void;
}

interface PaletteItem {
  id: string;
  category: 'Running Micro-Apps' | 'Pages' | 'Services' | 'Business Verticals' | 'Providers' | 'Actions';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  action: () => void;
}

export function CommandPalette({ isOpen, onClose, onOpenKeyModal }: CommandPaletteProps) {
  const router = useRouter();
  const { services, providers } = useAdmin();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
      setQuery('');
    }
  }, [isOpen]);

  // Build searchable items
  const allItems: PaletteItem[] = [
    // Running Functional Micro-Applications
    {
      id: 'app-commerce',
      category: 'Running Micro-Apps',
      title: 'Commerce Studio Hub',
      subtitle: 'Headless multi-tenant e-commerce console',
      icon: <ShoppingBagIcon size={18} color="#FF7A1A" />,
      action: () => {
        router.push('/commerce');
        onClose();
      },
    },
    {
      id: 'app-storefront',
      category: 'Running Micro-Apps',
      title: 'Live Customer Storefront (Aura Luxury)',
      subtitle: 'Public-facing e-commerce storefront',
      icon: <GlobeIcon size={18} color="#FF7A1A" />,
      action: () => {
        router.push('/store/aura-luxury');
        onClose();
      },
    },
    {
      id: 'app-store-builder',
      category: 'Running Micro-Apps',
      title: 'Storefront Creative Builder',
      subtitle: 'Visual drag-and-drop storefront customizer',
      icon: <RocketIcon size={18} color="#A855F7" />,
      action: () => {
        router.push('/commerce/store/builder');
        onClose();
      },
    },
    {
      id: 'app-orders',
      category: 'Running Micro-Apps',
      title: 'Orders & Fulfillment Pipeline',
      subtitle: 'Customer checkout orders & logistics matrix',
      icon: <PackageIcon size={18} color="#38BDF8" />,
      action: () => {
        router.push('/commerce/orders');
        onClose();
      },
    },
    {
      id: 'app-hms',
      category: 'Running Micro-Apps',
      title: 'Hospital OS Command Center',
      subtitle: 'Emergency triage & clinical workflows',
      icon: <HospitalIcon size={18} color="#10B981" />,
      action: () => {
        router.push('/hms');
        onClose();
      },
    },
    {
      id: 'app-hms-beds',
      category: 'Running Micro-Apps',
      title: 'ICU & Ward Bed Matrix',
      subtitle: 'Hospital inpatient capacity allocation',
      icon: <HospitalIcon size={18} color="#38BDF8" />,
      action: () => {
        router.push('/hms/beds');
        onClose();
      },
    },
    {
      id: 'app-crm',
      category: 'Running Micro-Apps',
      title: 'CRM Sales & Leads Pipeline',
      subtitle: 'Zero-leak deal pipeline & scoring',
      icon: <BriefcaseIcon size={18} color="#818CF8" />,
      action: () => {
        router.push('/crm/leads');
        onClose();
      },
    },
    {
      id: 'app-inventory',
      category: 'Running Micro-Apps',
      title: 'Central Stock & Inventory Matrix',
      subtitle: 'Multi-warehouse SKU tracking and levels',
      icon: <PackageIcon size={18} color="#06B6D4" />,
      action: () => {
        router.push('/inventory/items');
        onClose();
      },
    },
    {
      id: 'app-finance',
      category: 'Running Micro-Apps',
      title: 'Enterprise Billing & Invoices',
      subtitle: 'General tax ledger & automated billing',
      icon: <CreditCardIcon size={18} color="#10B981" />,
      action: () => {
        router.push('/finance/invoices');
        onClose();
      },
    },
    {
      id: 'app-hrms',
      category: 'Running Micro-Apps',
      title: 'HRMS Workforce & Employee Directory',
      subtitle: 'Staff onboarding & organizational chart',
      icon: <BriefcaseIcon size={18} color="#8B5CF6" />,
      action: () => {
        router.push('/hrms/employees');
        onClose();
      },
    },
    // Core Actions
    {
      id: 'act-key',
      category: 'Actions',
      title: 'Issue New API Key',
      subtitle: 'Create cryptographic Ed25519 token',
      icon: <KeyIcon size={18} color="#FF7A1A" />,
      action: () => {
        onClose();
        onOpenKeyModal();
      },
    },
    // Core Pages
    {
      id: 'page-overview',
      category: 'Pages',
      title: 'Overview Dashboard',
      subtitle: 'Platform KPIs & capacity health',
      icon: <BarChartIcon size={18} color="#5865F2" />,
      action: () => {
        router.push('/admin');
        onClose();
      },
    },
    {
      id: 'page-projects',
      category: 'Pages',
      title: 'Client Projects (O2O2B2B2C Ecosystem)',
      subtitle: 'Manage client tenants, plan limits, and zero-code plugins',
      icon: <RocketIcon size={18} color="#FF7A1A" />,
      action: () => {
        router.push('/admin/projects');
        onClose();
      },
    },
    {
      id: 'page-services',
      category: 'Pages',
      title: 'Platform Services',
      subtitle: 'Govern all 9 microservice engines',
      icon: <CpuIcon size={18} color="#A855F7" />,
      action: () => {
        router.push('/admin/services');
        onClose();
      },
    },
    {
      id: 'page-keys',
      category: 'Pages',
      title: 'API Keys Governance Center',
      subtitle: 'Manage and revoke access tokens',
      icon: <KeyIcon size={18} color="#FF7A1A" />,
      action: () => {
        router.push('/admin/api-keys');
        onClose();
      },
    },
    {
      id: 'page-developer-apis',
      category: 'Pages',
      title: 'Developer REST APIs',
      subtitle: 'Interactive zero-trust API testing console',
      icon: <ZapIcon size={18} color="#06B6D4" />,
      action: () => {
        router.push('/admin/developer-apis');
        onClose();
      },
    },
    {
      id: 'page-quotas',
      category: 'Pages',
      title: 'Resource Quotas & Limits',
      subtitle: 'Monthly volume and capacity meters',
      icon: <SlidersIcon size={18} color="#10B981" />,
      action: () => {
        router.push('/admin/quotas');
        onClose();
      },
    },
    {
      id: 'page-system',
      category: 'Pages',
      title: 'System Health & Crypto Diagnostics',
      subtitle: 'Ed25519 signatures and facade runtime states',
      icon: <ShieldCheckIcon size={18} color="#38BDF8" />,
      action: () => {
        router.push('/admin/system');
        onClose();
      },
    },
    {
      id: 'page-market',
      category: 'Pages',
      title: 'Plugin Marketplace',
      subtitle: 'Discover and install capabilities',
      icon: <PackageIcon size={18} color="#EC4899" />,
      action: () => {
        router.push('/admin/marketplace');
        onClose();
      },
    },
  ];

  // Add Services
  services.forEach((s) => {
    allItems.push({
      id: `svc-${s.id}`,
      category: 'Services',
      title: s.name,
      subtitle: `${s.packageName} • v${s.version} • ${s.status.toUpperCase()}`,
      icon: <DynamicIcon name={s.id} size={18} color={s.badgeColor || '#5865F2'} />,
      action: () => {
        router.push(`/admin/services/${s.id}`);
        onClose();
      },
    });
  });

  // Add Business Verticals
  BUSINESS_CATEGORIES.forEach((cat) => {
    allItems.push({
      id: `cat-${cat.slug}`,
      category: 'Business Verticals',
      title: cat.title,
      subtitle: `${cat.subtitle} (${providers[cat.slug]?.length || 0} Providers)`,
      icon: <DynamicIcon name={cat.slug} size={18} color={cat.color || '#5865F2'} />,
      action: () => {
        router.push(`/admin/business/${cat.slug}`);
        onClose();
      },
    });
  });

  // Add Individual Providers
  Object.entries(providers).forEach(([catSlug, list]) => {
    list.forEach((p) => {
      allItems.push({
        id: `prov-${p.id}`,
        category: 'Providers',
        title: p.name,
        subtitle: `${p.city}, ${p.country} • https://${p.customDomain} • ${p.plan}`,
        icon: <DynamicIcon name={p.categorySlug || catSlug} size={18} color="#5865F2" />,
        action: () => {
          router.push(`/admin/business/${catSlug}/${p.id}`);
          onClose();
        },
      });
    });
  });

  // Filter items
  const filtered = allItems.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 7, 13, 0.82)',
        backdropFilter: 'blur(20px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '80px',
      }}
      onClick={onClose}
    >
      <div
        className="squircle-card"
        style={{
          width: '100%',
          maxWidth: '660px',
          background: '#13172B',
          border: '1px solid rgba(88, 101, 242, 0.3)',
          borderRadius: '22px',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.85), 0 0 40px rgba(88, 101, 242, 0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '600px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '18px 22px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(10, 13, 24, 0.6)',
          }}
        >
          <SearchIcon size={20} color="#5865F2" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, microservice (HMS, Commerce...), or provider..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 500,
              outline: 'none',
            }}
          />
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#7B87A8',
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '3px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            ESC
          </span>
        </div>

        {/* Results List */}
        <div style={{ overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#A3AED0', fontSize: '13px' }}>
              No matches found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.slice(0, 20).map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(88, 101, 242, 0.22) 0%, rgba(139, 92, 246, 0.14) 100%)'
                      : 'transparent',
                    border: isSelected ? '1px solid rgba(88, 101, 242, 0.35)' : '1px solid transparent',
                    transition: 'all 0.12s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '9px',
                        background: isSelected ? 'rgba(88, 101, 242, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13.5px',
                          fontWeight: 700,
                          color: '#FFFFFF',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.title}
                      </div>
                      <div
                        style={{
                          fontSize: '11.5px',
                          color: '#A3AED0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      color: isSelected ? '#A5B4FC' : '#7B87A8',
                      background: 'rgba(255, 255, 255, 0.06)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      flexShrink: 0,
                      marginLeft: '12px',
                    }}
                  >
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            background: 'rgba(10, 13, 24, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11.5px',
            color: '#7B87A8',
          }}
        >
          <div style={{ display: 'flex', gap: '14px' }}>
            <span>↑↓ navigate</span>
            <span>↵ select</span>
            <span>esc close</span>
          </div>
          <span style={{ color: '#5865F2', fontWeight: 800 }}>OrbitoX Command Engine</span>
        </div>
      </div>
    </div>
  );
}
