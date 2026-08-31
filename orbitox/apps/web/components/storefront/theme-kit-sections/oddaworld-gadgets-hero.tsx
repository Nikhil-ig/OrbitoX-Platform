'use client';

import React, { useState } from 'react';
import { PageSection } from '@orbitox/commerce';
import {
  IconShoppingBag,
  IconPlay,
  IconHeadphones,
  IconHourglass,
  IconGlobe,
  IconZap,
  IconSliders,
  IconArrowRight,
} from '../storefront-icons';

interface OddaWorldHeroProps {
  section: PageSection;
  onSelect?: () => void;
  isSelected?: boolean;
  onOpenCart?: () => void;
  cartItemCount?: number;
}

export function OddaWorldGadgetsHeroSection({
  section,
  onSelect,
  isSelected,
  onOpenCart,
  cartItemCount = 0,
}: OddaWorldHeroProps) {
  const {
    tagline = 'NEXT-GEN GADGETS',
    title = 'Power Up Your World.',
    subtitle = 'Smart. Sleek. Reliable. Gadgets that keep you ahead.',
    primaryCtaText = 'SHOP NOW',
    primaryCtaLink = '/shop',
    secondaryCtaText = 'Watch Collection',
    productImageUrl = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1200&auto=format&fit=crop',
  } = section.settings || {};

  const [activeTab, setActiveTab] = useState('Home');

  return (
    <section
      onClick={onSelect}
      style={{
        position: 'relative',
        background: 'radial-gradient(ellipse at 50% 30%, #0A1C14 0%, #040C07 70%, #020604 100%)',
        color: '#FFFFFF',
        padding: '24px 20px 60px',
        overflow: 'hidden',
        border: isSelected ? '2px solid #A3E635' : '1px solid rgba(163, 230, 53, 0.1)',
        borderRadius: '24px',
        margin: '12px auto',
        maxWidth: '1360px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* ─── Top Brand Logo & Floating Navigation Pill ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '40px',
        }}
      >
        {/* Brand Logo with Neon Green Accents */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#A3E635',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              color: '#000000',
              fontSize: '18px',
            }}
          >
            Ω
          </div>
          <span
            style={{
              fontSize: '18px',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: '#FFFFFF',
            }}
          >
            ODDAWORLD
          </span>
        </div>

        {/* Floating Frosted Navigation Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '9999px',
            padding: '4px 6px',
          }}
        >
          {['Home', 'Products', 'Explore', 'About'].map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: active ? '#A3E635' : 'transparent',
                  color: active ? '#000000' : '#86EFAC',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {tab}
              </button>
            );
          })}

          {/* Mini Cart Button */}
          <button
            type="button"
            onClick={onOpenCart}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              border: 'none',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'transparent',
              color: '#86EFAC',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <IconShoppingBag size={14} color="#86EFAC" />
            <span
              style={{
                background: '#A3E635',
                color: '#000000',
                fontSize: '9px',
                fontWeight: 900,
                borderRadius: '999px',
                padding: '1px 6px',
              }}
            >
              {cartItemCount}
            </span>
          </button>
        </div>
      </div>

      {/* ─── Center Hero Content & Glowing Ambient Ring ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)',
          alignItems: 'center',
          gap: '40px',
          position: 'relative',
        }}
      >
        {/* Left Column: Headlines & Call to Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', zIndex: 2 }}>
          {/* Subtle Tagline */}
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.15em',
              color: '#A3E635',
              textTransform: 'uppercase',
            }}
          >
            {tagline}
          </span>

          {/* Main Headline */}
          <h1
            style={{
              fontSize: 'clamp(36px, 5vw, 56px)',
              fontWeight: 900,
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              margin: 0,
              background: 'linear-gradient(180deg, #FFFFFF 40%, #A3E635 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {title}
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: '14px',
              lineHeight: 1.6,
              color: '#86EFAC',
              maxWidth: '420px',
              margin: 0,
            }}
          >
            {subtitle}
          </p>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '10px' }}>
            <a
              href={primaryCtaLink}
              style={{
                background: '#A3E635',
                color: '#000000',
                fontWeight: 900,
                fontSize: '13px',
                padding: '14px 28px',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '0.05em',
                boxShadow: '0 0 24px rgba(163, 230, 53, 0.45)',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
              }}
            >
              <span>{primaryCtaText}</span>
              <IconArrowRight size={14} color="#000" />
            </a>

            <button
              type="button"
              style={{
                background: 'transparent',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '13px',
                padding: '12px 20px',
                borderRadius: '9999px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconPlay size={10} color="#A3E635" />
              </div>
              <span>{secondaryCtaText}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Glowing Neon Ring & Matte Audio Product Showcase */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '380px',
          }}
        >
          {/* Ambient Glowing Green Ring Background */}
          <div
            style={{
              position: 'absolute',
              width: '320px',
              height: '320px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(163, 230, 53, 0.25) 0%, rgba(163, 230, 53, 0.05) 50%, transparent 70%)',
              filter: 'blur(30px)',
            }}
          />

          {/* Neon Ring Outline */}
          <div
            style={{
              position: 'absolute',
              width: '300px',
              height: '300px',
              borderRadius: '50%',
              border: '2px solid rgba(163, 230, 53, 0.35)',
              boxShadow: '0 0 40px rgba(163, 230, 53, 0.25), inset 0 0 40px rgba(163, 230, 53, 0.15)',
            }}
          />

          {/* Product Image */}
          <img
            src={productImageUrl}
            alt="OddaWorld Flagship Audio Gear"
            style={{
              position: 'relative',
              maxHeight: '340px',
              maxWidth: '100%',
              objectFit: 'contain',
              zIndex: 3,
              filter: 'drop-shadow(0 25px 30px rgba(0, 0, 0, 0.7))',
            }}
          />
        </div>
      </div>
    </section>
  );
}

export function OddaWorldCategoriesSection({
  section,
  onSelect,
  isSelected,
}: OddaWorldHeroProps) {
  const {
    title = 'Shop By Category',
    spotlightBadge = 'NEW ARRIVAL',
    spotlightTitle = 'Small Size. Big Performance.',
    spotlightSubtitle = 'Experience spatial sound like never before with active noise cancellation.',
    spotlightCtaText = 'SHOP NOW',
  } = section.settings || {};

  const categories = [
    { name: 'Audio', icon: <IconHeadphones size={28} color="#A3E635" />, count: '14 Models' },
    { name: 'Smartwatches', icon: <IconHourglass size={28} color="#A3E635" />, count: '8 Models' },
    { name: 'Phones', icon: <IconGlobe size={28} color="#A3E635" />, count: '6 Models' },
    { name: 'Accessories', icon: <IconZap size={28} color="#A3E635" />, count: '24 Items' },
    { name: 'Gaming', icon: <IconSliders size={28} color="#A3E635" />, count: '12 Items' },
  ];

  return (
    <section
      onClick={onSelect}
      style={{
        maxWidth: '1360px',
        margin: '20px auto',
        padding: '0 20px',
        color: '#FFFFFF',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Category Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>{title}</h2>
        <span style={{ fontSize: '12px', color: '#A3E635', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span>View All Categories</span>
          <IconArrowRight size={12} />
        </span>
      </div>

      {/* 5-Item Category Matrix */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          marginBottom: '28px',
        }}
      >
        {categories.map((c, i) => (
          <div
            key={i}
            style={{
              background: 'linear-gradient(135deg, rgba(11, 35, 22, 0.8), rgba(4, 12, 7, 0.9))',
              border: '1px solid rgba(163, 230, 53, 0.2)',
              borderRadius: '16px',
              padding: '20px 16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(163, 230, 53, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {c.icon}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>{c.name}</div>
            <div style={{ fontSize: '11px', color: '#86EFAC' }}>{c.count}</div>
          </div>
        ))}
      </div>

      {/* Wide New Arrival Earbuds Spotlight Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0B2316 0%, #05110B 100%)',
          border: '1px solid rgba(163, 230, 53, 0.3)',
          borderRadius: '20px',
          padding: '30px 40px',
          display: 'grid',
          gridTemplateColumns: '180px minmax(0, 1fr)',
          alignItems: 'center',
          gap: '30px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(163, 230, 53, 0.15)',
        }}
      >
        <div style={{ width: '96px', height: '96px', borderRadius: '24px', background: 'rgba(163, 230, 53, 0.15)', border: '1px solid rgba(163, 230, 53, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
          <IconHeadphones size={52} color="#A3E635" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 900,
              letterSpacing: '0.1em',
              color: '#A3E635',
            }}
          >
            {spotlightBadge}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#FFFFFF' }}>
            {spotlightTitle}
          </div>
          <div style={{ fontSize: '13px', color: '#86EFAC', maxWidth: '500px' }}>
            {spotlightSubtitle}
          </div>
          <div style={{ marginTop: '12px' }}>
            <button
              type="button"
              style={{
                background: '#A3E635',
                color: '#000000',
                fontWeight: 900,
                fontSize: '12px',
                padding: '10px 22px',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '0.04em',
                boxShadow: '0 0 20px rgba(163, 230, 53, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{spotlightCtaText}</span>
              <IconArrowRight size={12} color="#000" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
