'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Product, useCommerceRecentlyViewed, useCommerceCart, useCommerceCurrency } from '@orbitox/commerce';
import { IconEye, IconClose, IconPlus, IconCheck } from './storefront-icons';

export interface RecentlyViewedProps {
  storeSlug: string;
  storeId: string;
  onOpenCart?: () => void;
}

export function StorefrontRecentlyViewed({ storeSlug, storeId, onOpenCart }: RecentlyViewedProps) {
  const { recentProducts, clearRecentlyViewed } = useCommerceRecentlyViewed(storeSlug);
  const { addItem } = useCommerceCart(storeId);
  const baseCurrency = storeSlug === 'punjabi-jutti' ? 'INR' : 'USD';
  const { formatPrice } = useCommerceCurrency(baseCurrency, storeSlug);

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [quickAddedId, setQuickAddedId] = useState<string | null>(null);

  if (!recentProducts || recentProducts.length === 0) return null;

  const handleQuickAdd = (p: Product) => {
    addItem({
      productId: p.id,
      variantId: p.variants[0]?.id,
      quantity: 1,
    });
    setQuickAddedId(p.id);
    if (onOpenCart) onOpenCart();
    setTimeout(() => setQuickAddedId(null), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 900,
      }}
    >
      {/* Floating Trigger Pill */}
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            padding: '10px 18px',
            borderRadius: '999px',
            background: 'var(--orb-surface, #161618)',
            border: '1px solid var(--orb-border, rgba(255, 255, 255, 0.2))',
            color: '#FFF',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backdropFilter: 'blur(10px)',
          }}
        >
          <IconEye size={16} color="var(--orb-primary, #D4AF37)" />
          <span>Recently Viewed</span>
          <span
            style={{
              padding: '2px 6px',
              borderRadius: '999px',
              background: 'var(--orb-primary, #D4AF37)',
              color: '#000',
              fontSize: '10px',
              fontWeight: 800,
            }}
          >
            {recentProducts.length}
          </span>
        </button>
      ) : (
        /* Expanded Floating Tray */
        <div
          style={{
            width: '380px',
            background: 'var(--orb-surface, #161618)',
            borderRadius: '16px',
            border: '1px solid var(--orb-border, rgba(255, 255, 255, 0.2))',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconEye size={15} color="var(--orb-primary, #D4AF37)" />
              <span style={{ fontSize: '13px', fontWeight: 800 }}>Recently Browsed</span>
              <span style={{ fontSize: '11px', color: 'var(--orb-text-muted, #888)' }}>({recentProducts.length})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={clearRecentlyViewed}
                style={{ background: 'none', border: 'none', color: '#888', fontSize: '10px', cursor: 'pointer' }}
              >
                Clear
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                title="Close"
              >
                <IconClose size={14} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
            {recentProducts.map((p) => (
              <div
                key={p.id}
                style={{
                  minWidth: '100px',
                  maxWidth: '100px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  flexShrink: 0,
                }}
              >
                <Link href={`/store/${storeSlug}/product/${p.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ height: '70px', borderRadius: '6px', overflow: 'hidden', background: '#222' }}>
                    {p.media[0] && <img src={p.media[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '4px' }}>
                    {p.title}
                  </div>
                </Link>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--orb-primary, #D4AF37)' }}>
                  {formatPrice(p.price)}
                </div>
                <button
                  onClick={() => handleQuickAdd(p)}
                  style={{
                    padding: '4px 6px',
                    borderRadius: '4px',
                    background: quickAddedId === p.id ? '#10B981' : 'var(--orb-primary, #D4AF37)',
                    color: '#000',
                    fontWeight: 800,
                    fontSize: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                  }}
                >
                  {quickAddedId === p.id ? (
                    <IconCheck size={11} />
                  ) : (
                    <>
                      <IconPlus size={10} />
                      <span>Add</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
