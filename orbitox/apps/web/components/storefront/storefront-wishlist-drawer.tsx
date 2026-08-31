'use client';

import React from 'react';
import Link from 'next/link';
import { useCommerceWishlist, useCommerceCart, useCommerceCurrency } from '@orbitox/commerce';
import {
  IconHeart,
  IconClose,
  IconShoppingBag,
  IconTrash,
  IconArrowRight,
  IconPlus,
} from './storefront-icons';

export interface WishlistDrawerProps {
  storeSlug: string;
  storeId: string;
  isOpen: boolean;
  onClose: () => void;
  onOpenCart?: () => void;
}

export function StorefrontWishlistDrawer({
  storeSlug,
  storeId,
  isOpen,
  onClose,
  onOpenCart,
}: WishlistDrawerProps) {
  const { items, count, removeItem, clearWishlist } = useCommerceWishlist(storeSlug);
  const { addItem } = useCommerceCart(storeId);
  const baseCurrency = storeSlug === 'punjabi-jutti' ? 'INR' : 'USD';
  const { formatPrice } = useCommerceCurrency(baseCurrency, storeSlug);

  if (!isOpen) return null;

  const handleMoveToCart = (productId: string, product: any) => {
    addItem({
      productId,
      variantId: product.variants[0]?.id,
      quantity: 1,
    });
    removeItem(productId);
    if (onOpenCart) {
      onClose();
      onOpenCart();
    }
  };

  const handleMoveAllToCart = () => {
    for (const item of items) {
      addItem({
        productId: item.productId,
        variantId: item.product.variants[0]?.id,
        quantity: 1,
      });
    }
    clearWishlist();
    if (onOpenCart) {
      onClose();
      onOpenCart();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 999,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          height: '100%',
          background: 'var(--orb-surface, #161618)',
          color: 'var(--orb-text, #FFFFFF)',
          boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid var(--orb-border, rgba(255, 255, 255, 0.1))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--orb-border, rgba(255, 255, 255, 0.1))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconHeart size={20} filled color="#EF4444" />
            <span style={{ fontSize: '18px', fontWeight: 800 }}>Saved Wishlist</span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '999px',
                background: '#EF4444',
                color: '#FFF',
                fontSize: '11px',
                fontWeight: 800,
              }}
            >
              {count}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--orb-text, #FFFFFF)',
              cursor: 'pointer',
              opacity: 0.7,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
            }}
            title="Close"
          >
            <IconClose size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {items.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconHeart size={32} color="#EF4444" />
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>Your Wishlist is Empty</div>
              <p style={{ fontSize: '13px', color: 'var(--orb-text-muted, #888)', maxWidth: '240px', margin: 0 }}>
                Explore our handcrafted collection and tap the heart icon to save your favorites.
              </p>
              <Link
                href={`/store/${storeSlug}/shop`}
                onClick={onClose}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '8px',
                  padding: '10px 22px',
                  borderRadius: '9999px',
                  background: 'var(--orb-primary, #D4AF37)',
                  color: '#000',
                  fontWeight: 800,
                  fontSize: '12px',
                  textDecoration: 'none',
                }}
              >
                <span>Explore Collection</span>
                <IconArrowRight size={14} />
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.productId}
                style={{
                  display: 'flex',
                  gap: '14px',
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ width: '70px', height: '70px', borderRadius: '8px', overflow: 'hidden', background: '#222', flexShrink: 0 }}>
                  {item.product.media[0] && (
                    <img src={item.product.media[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, lineHeight: 1.3 }}>{item.product.title}</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--orb-primary, #D4AF37)' }}>
                    {formatPrice(item.product.price)}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '6px' }}>
                    <button
                      onClick={() => handleMoveToCart(item.productId, item.product)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: 'var(--orb-primary, #D4AF37)',
                        color: '#000',
                        fontWeight: 800,
                        fontSize: '11px',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <IconPlus size={12} />
                      <span>Move to Bag</span>
                    </button>
                    <button
                      onClick={() => removeItem(item.productId)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: '#EF4444',
                        fontWeight: 700,
                        fontSize: '11px',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <IconTrash size={12} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(0, 0, 0, 0.2)' }}>
            <button
              onClick={handleMoveAllToCart}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '14px',
                borderRadius: '8px',
                background: 'var(--orb-primary, #D4AF37)',
                color: '#000',
                fontWeight: 900,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(229, 169, 60, 0.4)',
              }}
            >
              <IconShoppingBag size={16} />
              <span>Move All ({items.length}) to Shopping Bag</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
