'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Product, ProductVariant, useCommerceCart, useCommerceCurrency, useCommerceWishlist } from '@orbitox/commerce';
import {
  IconClose,
  IconHeart,
  IconCrown,
  IconFlame,
  IconSparkles,
  IconMinus,
  IconPlus,
  IconShoppingBag,
  IconCheck,
  IconArrowRight,
} from './storefront-icons';

export interface QuickViewModalProps {
  product: Product | null;
  storeSlug: string;
  storeId: string;
  isOpen: boolean;
  onClose: () => void;
  onAddedToCart?: () => void;
}

export function StorefrontQuickViewModal({
  product,
  storeSlug,
  storeId,
  isOpen,
  onClose,
  onAddedToCart,
}: QuickViewModalProps) {
  const { addItem } = useCommerceCart(storeId);
  const baseCurrency = storeSlug === 'punjabi-jutti' ? 'INR' : 'USD';
  const { formatPrice } = useCommerceCurrency(baseCurrency, storeSlug);
  const { isInWishlist, toggleWishlist } = useCommerceWishlist(storeSlug);

  const [selectedImgIdx, setSelectedImgIdx] = useState<number>(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(product?.variants[0] || null);
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdded, setIsAdded] = useState<boolean>(false);

  if (!isOpen || !product) return null;

  const inWish = isInWishlist(product.id);
  const currentVariant = selectedVariant || product.variants[0];

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      variantId: currentVariant?.id,
      quantity,
    });
    setIsAdded(true);
    if (onAddedToCart) onAddedToCart();
    setTimeout(() => setIsAdded(false), 2500);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(10px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '90vh',
          background: 'var(--orb-surface, #161618)',
          borderRadius: '24px',
          border: '1px solid var(--orb-border, rgba(255, 255, 255, 0.15))',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.9)',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          position: 'relative',
          color: 'var(--orb-text, #FFFFFF)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#FFF',
            cursor: 'pointer',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Close"
        >
          <IconClose size={18} />
        </button>

        {/* Left: Media Gallery */}
        <div style={{ background: '#111', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ position: 'relative', flex: 1, minHeight: '380px' }}>
            {product.media[selectedImgIdx] ? (
              <img
                src={product.media[selectedImgIdx].url}
                alt={product.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : null}

            {/* Wishlist Heart Button */}
            <button
              onClick={() => toggleWishlist(product)}
              style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: inWish ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0,0,0,0.6)',
                border: inWish ? '1px solid #EF4444' : '1px solid rgba(255, 255, 255, 0.2)',
                color: inWish ? '#EF4444' : '#FFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={inWish ? 'Remove from Wishlist' : 'Add to Wishlist'}
            >
              <IconHeart size={18} filled={inWish} color={inWish ? '#EF4444' : '#FFF'} />
            </button>
          </div>

          {/* Thumbnails */}
          {product.media.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', padding: '12px', background: 'rgba(0,0,0,0.4)', overflowX: 'auto' }}>
              {product.media.map((m, idx) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedImgIdx(idx)}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: selectedImgIdx === idx ? '2px solid var(--orb-primary, #D4AF37)' : '1px solid rgba(255,255,255,0.1)',
                    background: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <img src={m.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Details & Actions */}
        <div style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--orb-primary, #D4AF37)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <IconCrown size={14} color="var(--orb-primary, #D4AF37)" />
              <span>{product.categoryName || 'ROYAL COLLECTION'}</span>
            </div>
            <h2 style={{ fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)', fontSize: '24px', fontWeight: 900, margin: '4px 0 8px 0', lineHeight: 1.2 }}>
              {product.title}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px', fontWeight: 900, color: 'var(--orb-primary, #D4AF37)' }}>
                {formatPrice(currentVariant?.price || product.price)}
              </span>
              {product.compareAtPrice && (
                <span style={{ fontSize: '16px', color: 'var(--orb-text-muted, #888)', textDecoration: 'line-through' }}>
                  {formatPrice(product.compareAtPrice)}
                </span>
              )}
            </div>
          </div>

          {/* Urgency Scarcity Box */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#F87171',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <IconFlame size={15} color="#EF4444" />
            <span>Only 3 pairs remaining in Patiala Atelier — order soon!</span>
          </div>

          <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.5, margin: 0 }}>
            {product.description}
          </p>

          {/* Size Variants */}
          {product.variants && product.variants.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                <span style={{ fontWeight: 800 }}>Select Size (EU / IND)</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--orb-primary, #D4AF37)', fontSize: '11px', fontWeight: 700 }}>
                  <IconSparkles size={12} color="var(--orb-primary, #D4AF37)" />
                  <span>100% Bite-Free Double Padded</span>
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {product.variants.map((v) => {
                  const isSel = (selectedVariant?.id || product.variants[0]?.id) === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        background: isSel ? 'var(--orb-primary, #D4AF37)' : 'rgba(255, 255, 255, 0.05)',
                        border: isSel ? '1px solid var(--orb-primary, #D4AF37)' : '1px solid rgba(255, 255, 255, 0.15)',
                        color: isSel ? '#000' : '#FFF',
                        fontWeight: 800,
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      {v.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity & CTA */}
          <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', paddingTop: '10px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '0 4px',
              }}
            >
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                style={{ width: '32px', height: '36px', background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <IconMinus size={12} />
              </button>
              <span style={{ width: '28px', textAlign: 'center', fontWeight: 800, fontSize: '13px' }}>{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                style={{ width: '32px', height: '36px', background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <IconPlus size={12} />
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              style={{
                flex: 1,
                padding: '14px 20px',
                borderRadius: '8px',
                background: isAdded ? '#10B981' : 'var(--orb-primary, #D4AF37)',
                color: '#000000',
                fontWeight: 900,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(229, 169, 60, 0.4)',
                letterSpacing: '0.04em',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isAdded ? (
                <>
                  <IconCheck size={16} />
                  <span>Added to Bag</span>
                </>
              ) : (
                <>
                  <IconShoppingBag size={16} />
                  <span>Add to Bag • 1-Click</span>
                </>
              )}
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: '4px' }}>
            <Link
              href={`/store/${storeSlug}/product/${product.slug}`}
              onClick={onClose}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--orb-text-muted, #888)', textDecoration: 'underline' }}
            >
              <span>View Full Product Details & Artisan Notes</span>
              <IconArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
