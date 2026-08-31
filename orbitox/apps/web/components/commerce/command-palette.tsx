'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { commerceEngine, Product, Customer } from '@orbitox/commerce';
import {
  IconSearch,
  IconShoppingBag,
  IconChartBar,
  IconPalette,
  IconSparkles,
  IconPackage,
  IconUsers,
  IconTag,
  IconBot,
  IconRocket,
  IconPlus,
  IconImage,
  IconSidebar,
  IconClose,
} from './builder/studio-icons';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  storeId?: string;
  activeStoreSlug?: string;
  onOpenPlatformTheme?: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  storeId = 'store_aura_luxury',
  activeStoreSlug = 'punjabi-jutti',
  onOpenPlatformTheme,
}: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const [products] = useState<Product[]>(() => commerceEngine.products.listProducts(storeId).products);
  const [customers] = useState<Customer[]>(() => commerceEngine.customers.listCustomersByStore(storeId));

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const navigationItems = [
    { label: 'Store Overview & Analytics', route: '/commerce', icon: <IconChartBar size={16} />, category: 'Navigation' },
    { label: 'Visual Storefront Builder', route: '/commerce/store/builder', icon: <IconPalette size={16} />, category: 'Navigation' },
    { label: 'Theme Studio & Design Tokens', route: '/commerce/store/theme', icon: <IconSparkles size={16} />, category: 'Navigation' },
    { label: 'Products & Variant Matrix', route: '/commerce/products', icon: <IconShoppingBag size={16} />, category: 'Navigation' },
    { label: 'Media & Brand Asset Library', route: '/commerce/media', icon: <IconImage size={16} />, category: 'Navigation' },
    { label: 'Orders & Fulfillment Pipeline', route: '/commerce/orders', icon: <IconPackage size={16} />, category: 'Navigation' },
    { label: 'Customer CRM & VIP Segmentation', route: '/commerce/customers', icon: <IconUsers size={16} />, category: 'Navigation' },
    { label: 'Discounts & Promo Codes', route: '/commerce/discounts', icon: <IconTag size={16} />, category: 'Navigation' },
    { label: 'n8n Automation Engine', route: '/commerce/automations', icon: <IconBot size={16} />, category: 'Navigation' },
    { label: 'Live Customer Storefront', route: `/store/${activeStoreSlug}`, icon: <IconSidebar size={16} />, category: 'Storefront' },
  ];

  const actionItems = [
    { label: '🎨 Platform Workspace Theme & Style Studio', action: onOpenPlatformTheme, icon: <IconPalette size={16} />, category: 'Platform Settings' },
    { label: 'AI Autopilot: Generate Traditional Fashion Storefront', route: '/commerce/store/builder?autopilot=true', icon: <IconSparkles size={16} />, category: 'Quick Actions' },
    { label: 'Add New Handcrafted Product', route: '/commerce/products?new=true', icon: <IconPlus size={16} />, category: 'Quick Actions' },
    { label: 'Create VIP Discount Voucher', route: '/commerce/discounts?new=true', icon: <IconTag size={16} />, category: 'Quick Actions' },
    { label: 'Publish Storefront Changes Live', route: '/commerce/store/builder', icon: <IconRocket size={16} />, category: 'Quick Actions' },
  ];

  const matchedNav = navigationItems.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  const matchedActions = actionItems.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  const matchedProducts = query.trim()
    ? products
        .filter((p) => p.title.toLowerCase().includes(query.toLowerCase()) || p.categoryName?.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5)
        .map((p) => ({
          label: `${p.title} (₹${p.price.toLocaleString()})`,
          route: `/commerce/products?edit=${p.id}`,
          icon: <IconShoppingBag size={16} />,
          category: 'Products',
        }))
    : [];

  const matchedCustomers = query.trim()
    ? customers
        .filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(query.toLowerCase()) || c.email.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 4)
        .map((c) => ({
          label: `${c.firstName} ${c.lastName} (${c.email})`,
          route: `/commerce/customers?id=${c.id}`,
          icon: <IconUsers size={16} />,
          category: 'Customers',
        }))
    : [];

  const allResults = [...matchedActions, ...matchedNav, ...matchedProducts, ...matchedCustomers];

  const handleSelectResult = (item: any) => {
    if (item.action) {
      item.action();
    } else if (item.route) {
      router.push(item.route);
    }
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '580px',
          background: '#101320',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(229, 169, 60, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <IconSearch size={18} style={{ color: '#E5A93C' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, page, product, or customer..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 600,
              outline: 'none',
            }}
          />
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#94A3B8',
              fontSize: '10px',
              fontWeight: 800,
              fontFamily: 'monospace',
            }}
          >
            ESC
          </span>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '8px' }}>
          {allResults.length > 0 ? (
            allResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={idx}
                  onClick={() => handleSelectResult(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    background: isSelected ? 'rgba(229, 169, 60, 0.15)' : 'transparent',
                    border: isSelected ? '1px solid rgba(229, 169, 60, 0.35)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.1s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <span style={{ color: isSelected ? '#E5A93C' : '#94A3B8', display: 'flex', alignItems: 'center' }}>
                      {item.icon}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? '#FFFFFF' : '#CBD5E1',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.label}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      color: isSelected ? '#E5A93C' : '#64748B',
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.category}
                  </span>
                </div>
              );
            })
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '12px' }}>
              No commands or items matched &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
