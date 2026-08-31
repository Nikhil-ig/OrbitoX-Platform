'use client';

import React, { useState } from 'react';
import { PageSection } from '@orbitox/commerce';

interface PegasusProps {
  section: PageSection;
  onSelect?: () => void;
  isSelected?: boolean;
}

export function PegasusSplitBannerSection({
  section,
  onSelect,
  isSelected,
}: PegasusProps) {
  const {
    title = 'NIKE PEGASUS',
    subtitle = 'Engineered for responsive cushioning with dual Air Zoom units and breathable engineered mesh for everyday runners.',
    slogan = 'JUST DO IT',
    shoeImage = 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?q=80&w=1200&auto=format&fit=crop',
  } = section.settings || {};

  const [activeSize, setActiveSize] = useState('2');

  return (
    <section
      onClick={onSelect}
      style={{
        maxWidth: '1320px',
        margin: '20px auto',
        padding: '0 20px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* ─── Frosted Glass Split Banner ─── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #B5CAD4 0%, #9EB8C5 100%)',
          borderRadius: '24px',
          minHeight: '440px',
          position: 'relative',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
          border: isSelected ? '2px solid #0F766E' : '1px solid rgba(255, 255, 255, 0.6)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.12)',
        }}
      >
        {/* Left Side: Frosted Glass Overlay Card with Brand Typography */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRight: '1px solid rgba(255, 255, 255, 0.4)',
            padding: '40px 36px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* Top Nav Brand / Gender */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>✔</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>Men</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>Women</span>
          </div>

          {/* Big Title & Specs */}
          <div style={{ margin: '30px 0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '2px', height: '50px', background: '#0F172A', marginTop: '6px' }} />
              <h1
                style={{
                  fontSize: 'clamp(32px, 4vw, 48px)',
                  fontWeight: 900,
                  letterSpacing: '-0.02em',
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  margin: 0,
                  textShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
                }}
              >
                {title}
              </h1>
            </div>

            <p
              style={{
                fontSize: '13px',
                color: '#1E293B',
                lineHeight: 1.6,
                maxWidth: '380px',
                marginTop: '16px',
                marginLeft: '14px',
              }}
            >
              {subtitle}
            </p>
          </div>

          {/* Slogan & Socials Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 900,
                letterSpacing: '0.15em',
                color: '#0F172A',
                textTransform: 'uppercase',
              }}
            >
              {slogan}
            </div>

            <div style={{ display: 'flex', gap: '10px', fontSize: '13px', color: '#0F172A' }}>
              <span>📷</span>
              <span>🐦</span>
              <span>📘</span>
            </div>
          </div>
        </div>

        {/* Right Side: Deep Slate Green Card with Floating Pegasus Sneaker & Vertical Size Pills */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '30px 20px',
          }}
        >
          {/* Deep Forest Green Accent Card Backdrop */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              bottom: '20px',
              left: '20px',
              background: '#235953',
              borderRadius: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '20px',
            }}
          >
            {/* Top Badge: Model Number (e.g. 40) */}
            <div style={{ fontSize: '32px', fontWeight: 900, color: '#FFFFFF', lineHeight: 1 }}>
              40
            </div>

            {/* Floating Pegasus Shoe */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={shoeImage}
                alt="Nike Pegasus"
                style={{
                  maxHeight: '260px',
                  maxWidth: '120%',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 25px 35px rgba(0, 0, 0, 0.6))',
                  transform: 'scale(1.15) rotate(-5deg)',
                  zIndex: 3,
                }}
              />
            </div>

            <div style={{ fontSize: '11px', color: '#99F6E4', fontWeight: 700 }}>
              Zoom Air Responsive Stride
            </div>
          </div>

          {/* Vertical Size Selector Pills on Far Right Margin */}
          <div
            style={{
              position: 'absolute',
              right: '32px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              zIndex: 4,
            }}
          >
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#FFFFFF', textAlign: 'center', marginBottom: '2px' }}>
              Size
            </div>
            {['1', '2', '3', '4', '+'].map((sz) => {
              const active = activeSize === sz;
              return (
                <button
                  key={sz}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSize(sz);
                  }}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    border: active ? '2px solid #FFFFFF' : '1px solid rgba(255, 255, 255, 0.4)',
                    background: active ? '#0F172A' : 'rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  {sz}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
