'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Product, ThemeConfig } from '@orbitox/commerce';
import { IconHeart, IconEye, IconPlus, IconCheck, IconShoppingBag } from './storefront-icons';

export type ProductCardVariant =
  | 'auto'
  | 'luxe-squircle'
  | 'oddaworld-cyber'
  | 'sneakconnect-editorial'
  | 'pegasus-athletic'
  | 'aura-sand'
  | 'punjabi-royal'
  | 'neumorphic-gold';

export interface UniversalProductCardProps {
  product: Product;
  storeSlug: string;
  theme?: ThemeConfig;
  variant?: ProductCardVariant;
  inWishlist?: boolean;
  onToggleWishlist?: (product: Product) => void;
  onQuickAdd?: (product: Product) => void;
  onQuickView?: (product: Product) => void;
  formatPrice?: (cents: number) => string;
  accentColor?: string;
  isQuickAdded?: boolean;
}

export function UniversalProductCard({
  product,
  storeSlug,
  theme,
  variant = 'auto',
  inWishlist = false,
  onToggleWishlist,
  onQuickAdd,
  onQuickView,
  formatPrice = (c) => `$${(c / 100).toFixed(2)}`,
  accentColor,
  isQuickAdded = false,
}: UniversalProductCardProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState('8');

  // Auto-resolve card style from active theme preset if variant is 'auto'
  const resolvedVariant: ProductCardVariant =
    variant !== 'auto'
      ? variant
      : theme?.presetId === 'oddaworld-emerald-tech'
      ? 'oddaworld-cyber'
      : theme?.presetId === 'sneakconnect-editorial-luxe'
      ? 'sneakconnect-editorial'
      : theme?.presetId === 'pegasus-mint-glass'
      ? 'pegasus-athletic'
      : theme?.presetId === 'aura-sand-organic'
      ? 'aura-sand'
      : theme?.presetId === 'nova-luxe-dark-gold'
      ? 'neumorphic-gold'
      : theme?.presetId === 'punjabi-jutti-royal'
      ? 'punjabi-royal'
      : 'luxe-squircle';

  const images =
    product.media && product.media.length > 0
      ? product.media.map((m) => m.url)
      : ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=800&auto=format&fit=crop'];

  const currentImg = images[activeImageIndex] || images[0];

  // ─────────────────────────────────────────────────────────────
  // 1. LUXE SQUIRCLE / DEEP BLUE NIGHTS (User Reference Image 2 & 3)
  // ─────────────────────────────────────────────────────────────
  if (resolvedVariant === 'luxe-squircle') {
    const isDark = theme?.isDark ?? true;
    return (
      <div
        style={{
          background: isDark ? '#121E23' : '#FFFFFF',
          borderRadius: '32px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isDark
            ? '0 25px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)'
            : '0 20px 45px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
          position: 'relative',
          transition: 'transform 0.25s ease, box-shadow 0.25s ease',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {/* Full Bleed Squircle Media Preview with Dots Indicator */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '290px',
            borderRadius: '24px',
            overflow: 'hidden',
            background: isDark ? '#091014' : '#E2E8F0',
          }}
        >
          <Link href={`/store/${storeSlug}/product/${product.slug}`} style={{ display: 'block', width: '100%', height: '100%' }}>
            <img
              src={currentImg}
              alt={product.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Link>

          {/* Floating Wishlist Heart */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleWishlist?.(product);
            }}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: inWishlist ? 'rgba(239, 68, 68, 0.25)' : 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(8px)',
              border: inWishlist ? '1px solid #EF4444' : '1px solid rgba(255,255,255,0.2)',
              color: inWishlist ? '#EF4444' : '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 3,
            }}
          >
            <IconHeart size={16} filled={inWishlist} color={inWishlist ? '#EF4444' : '#FFFFFF'} />
          </button>

          {/* Carousel Dots */}
          {images.length > 1 && (
            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '5px',
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(8px)',
                padding: '4px 8px',
                borderRadius: '9999px',
                zIndex: 2,
              }}
            >
              {images.map((_, i) => (
                <div
                  key={i}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveImageIndex(i);
                  }}
                  style={{
                    width: activeImageIndex === i ? '14px' : '4px',
                    height: '4px',
                    borderRadius: '9999px',
                    background: activeImageIndex === i ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '16px 6px 4px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <Link
              href={`/store/${storeSlug}/product/${product.slug}`}
              style={{
                fontSize: '17px',
                fontWeight: 900,
                color: isDark ? '#FFFFFF' : '#0F172A',
                textDecoration: 'none',
                lineHeight: 1.2,
              }}
            >
              {product.title}
            </Link>

            <span
              style={{
                background: isDark ? '#1A333B' : '#1E293B',
                color: '#FFFFFF',
                fontSize: '11px',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '9999px',
                whiteSpace: 'nowrap',
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : 'none',
              }}
            >
              {formatPrice(product.price)}
            </span>
          </div>

          <p
            style={{
              fontSize: '12px',
              color: isDark ? '#94A3B8' : '#64748B',
              lineHeight: 1.45,
              margin: '0 0 12px 0',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {product.description || "For those who crave peace louder than the city. This view isn't just scenery, it's a whole reset."}
          </p>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', marginTop: 'auto' }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: isDark ? '#CBD5E1' : '#475569',
                background: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                padding: '3px 9px',
                borderRadius: '9999px',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E2E8F0',
              }}
            >
              Top Pick
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: isDark ? '#CBD5E1' : '#475569',
                background: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                padding: '3px 9px',
                borderRadius: '9999px',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E2E8F0',
              }}
            >
              Only 9 vibes left
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onQuickAdd?.(product);
            }}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '9999px',
              background: isDark ? '#FFFFFF' : '#1C3D47',
              color: isDark ? '#091014' : '#FFFFFF',
              border: 'none',
              fontSize: '13px',
              fontWeight: 900,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isDark
                ? '0 4px 16px rgba(255,255,255,0.2)'
                : '0 4px 14px rgba(28,61,71,0.25)',
            }}
          >
            {isQuickAdded ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <IconCheck size={14} />
                <span>Added to Bag</span>
              </span>
            ) : (
              'Add to Cart'
            )}
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. ODDAWORLD CYBERTECH (User Reference Image 5)
  // ─────────────────────────────────────────────────────────────
  if (resolvedVariant === 'oddaworld-cyber') {
    return (
      <div
        style={{
          background: '#091512',
          borderRadius: '24px',
          padding: '16px',
          border: '1px solid rgba(52, 211, 153, 0.25)',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(52, 211, 153, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {/* Glow Ring Halo Backdrop */}
        <div
          style={{
            position: 'relative',
            height: '260px',
            borderRadius: '18px',
            overflow: 'hidden',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, #040A08 80%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Link href={`/store/${storeSlug}/product/${product.slug}`} style={{ display: 'block', width: '100%', height: '100%' }}>
            <img
              src={currentImg}
              alt={product.title}
              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '16px' }}
            />
          </Link>

          {/* Cyber Spec Chip */}
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              background: 'rgba(5, 150, 105, 0.3)',
              border: '1px solid #10B981',
              color: '#6EE7B7',
              fontSize: '9px',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: '6px',
              letterSpacing: '0.05em',
            }}
          >
            50mm TITANIUM DRIVER
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleWishlist?.(product);
            }}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(0,0,0,0.6)',
              border: inWishlist ? '1px solid #EF4444' : '1px solid rgba(52, 211, 153, 0.4)',
              color: inWishlist ? '#EF4444' : '#34D399',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconHeart size={16} filled={inWishlist} color={inWishlist ? '#EF4444' : '#34D399'} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '14px 4px 4px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontSize: '10px', color: '#10B981', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {product.categoryName || 'BINAURAL AUDIO'}
          </div>
          <Link
            href={`/store/${storeSlug}/product/${product.slug}`}
            style={{ fontSize: '16px', fontWeight: 900, color: '#FFFFFF', textDecoration: 'none', margin: '4px 0 10px 0' }}
          >
            {product.title}
          </Link>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '10px' }}>
            <span style={{ fontSize: '18px', fontWeight: 900, color: '#34D399' }}>
              {formatPrice(product.price)}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickAdd?.(product);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                background: '#10B981',
                color: '#000000',
                border: 'none',
                fontSize: '11px',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 0 14px rgba(16, 185, 129, 0.4)',
              }}
            >
              {isQuickAdded ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <IconCheck size={13} />
                  <span>EQUIPPED</span>
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <IconPlus size={13} />
                  <span>EQUIP</span>
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. SNEAKCONNECT EDITORIAL (User Reference Image 4)
  // ─────────────────────────────────────────────────────────────
  if (resolvedVariant === 'sneakconnect-editorial') {
    return (
      <div
        style={{
          background: '#0D0D10',
          borderRadius: '0px',
          borderBottom: '2px solid rgba(255,255,255,0.1)',
          padding: '16px 12px 24px',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Cinzel', serif",
        }}
      >
        <div style={{ position: 'relative', height: '300px', background: '#141419', overflow: 'hidden' }}>
          <Link href={`/store/${storeSlug}/product/${product.slug}`} style={{ display: 'block', width: '100%', height: '100%' }}>
            <img
              src={currentImg}
              alt={product.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Link>

          <span
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '9px',
              fontWeight: 900,
              background: '#FFFFFF',
              color: '#000000',
              padding: '3px 8px',
              letterSpacing: '0.1em',
            }}
          >
            LIMITED RUN
          </span>
        </div>

        <div style={{ padding: '16px 0 0', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '10px', color: '#9CA3AF', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {product.categoryName || 'COLLECTION / N° 04'}
          </span>
          <Link
            href={`/store/${storeSlug}/product/${product.slug}`}
            style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', textDecoration: 'none', margin: '4px 0 8px 0', letterSpacing: '0.03em' }}
          >
            {product.title}
          </Link>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {formatPrice(product.price)}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickAdd?.(product);
              }}
              style={{
                padding: '9px 18px',
                borderRadius: '9999px',
                background: '#FFFFFF',
                color: '#000000',
                border: 'none',
                fontSize: '11px',
                fontWeight: 900,
                cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                letterSpacing: '0.04em',
              }}
            >
              {isQuickAdded ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <IconCheck size={13} />
                  <span>ACQUIRED</span>
                </span>
              ) : (
                'ACQUIRE'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 4. NEUMORPHIC GOLD (User Reference Image 1)
  // ─────────────────────────────────────────────────────────────
  if (resolvedVariant === 'neumorphic-gold') {
    return (
      <div
        style={{
          background: '#15161B',
          borderRadius: '30px',
          padding: '16px',
          color: '#FFFFFF',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        <div style={{ position: 'relative', height: '220px', borderRadius: '22px', overflow: 'hidden' }}>
          <Link href={`/store/${storeSlug}/product/${product.slug}`} style={{ display: 'block', width: '100%', height: '100%' }}>
            <img src={currentImg} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </Link>

          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleWishlist?.(product);
            }}
            style={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              background: 'rgba(20, 21, 26, 0.8)',
              backdropFilter: 'blur(8px)',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: inWishlist ? '#EAB308' : '#FFF',
            }}
          >
            <IconHeart size={13} filled={inWishlist} color={inWishlist ? '#EAB308' : '#FFFFFF'} />
            <span>32.1 K</span>
          </div>
        </div>

        <div style={{ padding: '14px 4px 4px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <Link
            href={`/store/${storeSlug}/product/${product.slug}`}
            style={{ fontSize: '17px', fontWeight: 900, color: '#FFF', textDecoration: 'none', margin: '2px 0 6px 0' }}
          >
            {product.title}
          </Link>
          <p style={{ fontSize: '11px', color: '#9CA3AF', lineHeight: 1.4, margin: '0 0 12px 0' }}>
            {product.description || 'Exclusive handcrafted luxury artifact tuned for discerning collectors.'}
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
            <span style={{ fontSize: '18px', fontWeight: 900, color: '#EAB308' }}>
              {formatPrice(product.price)}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickAdd?.(product);
              }}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '16px',
                background: '#232530',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#EAB308',
                fontSize: '13px',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 14px rgba(0,0,0,0.3)',
              }}
            >
              {isQuickAdded ? <IconCheck size={16} /> : <IconShoppingBag size={16} />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 5. PEGASUS ATHLETIC (User Reference Image 2)
  // ─────────────────────────────────────────────────────────────
  if (resolvedVariant === 'pegasus-athletic') {
    return (
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '24px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Oswald', sans-serif",
          color: '#FFFFFF',
        }}
      >
        <div style={{ position: 'relative', height: '240px', background: '#111', borderRadius: '18px', overflow: 'hidden' }}>
          <Link href={`/store/${storeSlug}/product/${product.slug}`} style={{ display: 'block', width: '100%', height: '100%' }}>
            <img src={currentImg} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </Link>
          <span
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              background: '#000000',
              color: '#FFFFFF',
              fontSize: '10px',
              fontWeight: 900,
              padding: '3px 8px',
              borderRadius: '4px',
              letterSpacing: '0.08em',
            }}
          >
            JUST DO IT
          </span>
        </div>

        <div style={{ padding: '14px 4px 0', display: 'flex', flexDirection: 'column' }}>
          <Link
            href={`/store/${storeSlug}/product/${product.slug}`}
            style={{ fontSize: '20px', fontWeight: 800, color: '#FFF', textDecoration: 'none', textTransform: 'uppercase' }}
          >
            {product.title}
          </Link>

          {/* Size Selectors */}
          <div style={{ display: 'flex', gap: '6px', margin: '10px 0 14px' }}>
            {['1', '2', '3', '4', '+'].map((sz) => (
              <div
                key={sz}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSize(sz);
                }}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: selectedSize === sz ? '#FFFFFF' : 'rgba(255,255,255,0.1)',
                  color: selectedSize === sz ? '#000' : '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                {sz}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '20px', fontWeight: 900 }}>{formatPrice(product.price)}</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickAdd?.(product);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#FFFFFF',
                color: '#000000',
                border: 'none',
                fontSize: '12px',
                fontWeight: 900,
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              {isQuickAdded ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <IconCheck size={13} />
                  <span>ADDED</span>
                </span>
              ) : (
                'BAG IT'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 6. DEFAULT ROYAL ATELIER (PUNJABI JUTTI & LUXURY GOLD)
  // ─────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        background: 'var(--orb-surface, #161618)',
        borderRadius: 'var(--orb-radius-card, 16px)',
        border: '1px solid var(--orb-border, rgba(212, 175, 55, 0.2))',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
    >
      <div style={{ position: 'relative', height: '300px', background: '#222' }}>
        <Link href={`/store/${storeSlug}/product/${product.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', width: '100%', height: '100%' }}>
          <img src={currentImg} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </Link>

        {/* Wishlist Heart Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleWishlist?.(product);
          }}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: inWishlist ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0,0,0,0.6)',
            border: inWishlist ? '1px solid #EF4444' : '1px solid rgba(255, 255, 255, 0.2)',
            color: inWishlist ? '#EF4444' : '#FFF',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            zIndex: 5,
          }}
          title={inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <IconHeart size={16} filled={inWishlist} color={inWishlist ? '#D4AF37' : '#FFFFFF'} />
        </button>

        {product.compareAtPrice && (
          <span
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              padding: '4px 8px',
              borderRadius: '4px',
              background: '#EF4444',
              color: '#FFF',
              fontSize: '10px',
              fontWeight: 800,
            }}
          >
            SALE
          </span>
        )}

        {/* Quick View Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onQuickView?.(product);
          }}
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '6px 14px',
            borderRadius: '20px',
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#FFF',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
          }}
        >
          <IconEye size={13} />
          <span>Quick View</span>
        </button>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <span style={{ fontSize: '11px', color: 'var(--orb-text-muted, #888)', textTransform: 'uppercase', fontWeight: 700 }}>
          {product.categoryName}
        </span>
        <Link href={`/store/${storeSlug}/product/${product.slug}`} style={{ fontSize: '15px', fontWeight: 700, textDecoration: 'none', color: 'inherit' }}>
          {product.title}
        </Link>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '10px' }}>
          <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--orb-primary, #D4AF37)' }}>
            {formatPrice(product.price)}
          </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onQuickAdd?.(product);
            }}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--orb-radius-btn, 8px)',
              background: isQuickAdded ? '#10B981' : (accentColor || 'var(--orb-primary, #D4AF37)'),
              color: '#000000',
              border: 'none',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {isQuickAdded ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <IconCheck size={13} />
                <span>Added</span>
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <IconPlus size={13} />
                <span>Quick Add</span>
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
