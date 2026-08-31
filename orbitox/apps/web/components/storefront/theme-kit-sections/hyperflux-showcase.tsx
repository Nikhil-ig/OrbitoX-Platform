'use client';

import React, { useState } from 'react';
import { PageSection } from '@orbitox/commerce';

interface HyperFluxProps {
  section: PageSection;
  onSelect?: () => void;
  isSelected?: boolean;
}

export function HyperFluxShowcaseSection({
  section,
  onSelect,
  isSelected,
}: HyperFluxProps) {
  const {
    brandTag = 'NIKE HYPERFLUX 90+',
    edition = 'ULTRA ESSENTIAL',
    price = '£120',
    mainShoeImage = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1200&auto=format&fit=crop',
  } = section.settings || {};

  const [selectedSize, setSelectedSize] = useState('9.5');
  const [selectedColor, setSelectedColor] = useState(0);

  const colors = [
    { bg: 'linear-gradient(135deg, #F97316, #3B82F6)', label: 'Sunset Cyan' },
    { bg: '#8B5CF6', label: 'Neon Violet' },
    { bg: '#0D9488', label: 'Dark Teal' },
    { bg: '#E5A93C', label: 'Amber Gold' },
  ];

  const sizes = ['7', '7.5', '8', '8.5', '9', '9.5'];

  return (
    <section
      onClick={onSelect}
      style={{
        maxWidth: '1280px',
        margin: '20px auto',
        padding: '0 20px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* ─── 3-Column Sunset Burgundy/Violet Showcase ─── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1C0A1A 0%, #351028 40%, #1A0D2E 100%)',
          borderRadius: '28px',
          padding: '40px 30px',
          display: 'grid',
          gridTemplateColumns: '220px minmax(0, 1.2fr) 240px',
          gap: '24px',
          alignItems: 'center',
          border: isSelected ? '2px solid #F43F5E' : '1px solid rgba(244, 63, 94, 0.25)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          color: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Left Column: "PEOPLE ALSO VIEWS" Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#FBCFE8', textTransform: 'uppercase' }}>
            People Also Views
          </div>
          <div style={{ fontSize: '10px', color: '#FDA4AF', marginTop: '-10px' }}>&lt; 1 OF 2 &gt;</div>

          {/* Mini Cards */}
          {[
            'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?q=80&w=400&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1608231387042-66d1773070a5?q=80&w=400&auto=format&fit=crop',
          ].map((img, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100px',
                backdropFilter: 'blur(10px)',
                cursor: 'pointer',
              }}
            >
              <img src={img} alt="Related Shoe" style={{ maxHeight: '80px', objectFit: 'contain' }} />
            </div>
          ))}
        </div>

        {/* Center Column: Big Floating 3D Sneaker Card */}
        <div
          style={{
            background: 'linear-gradient(180deg, #FFFFFF 0%, #FEE2E2 100%)',
            borderRadius: '24px',
            padding: '30px 24px',
            color: '#1C0A1A',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            position: 'relative',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Header Title */}
          <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.02em', fontStyle: 'italic' }}>
            {brandTag}
          </div>
          <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.15em', color: '#E11D48', textTransform: 'uppercase', marginTop: '2px' }}>
            {edition}
          </div>

          {/* Central Sneaker Image */}
          <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '14px 0' }}>
            <img
              src={mainShoeImage}
              alt={brandTag}
              style={{
                maxHeight: '200px',
                maxWidth: '100%',
                objectFit: 'contain',
                filter: 'drop-shadow(0 20px 25px rgba(225, 29, 72, 0.35))',
                transform: 'rotate(-10deg)',
              }}
            />
          </div>

          {/* Mini 3-Perspective Thumbnails */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {[1, 2, 3].map((_, i) => (
              <div
                key={i}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(28, 10, 26, 0.06)',
                  border: '1px solid rgba(28, 10, 26, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                }}
              >
                👟
              </div>
            ))}
          </div>

          {/* Big Add to Cart Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              alert(`Added ${brandTag} (Size ${selectedSize}) to cart!`);
            }}
            style={{
              padding: '12px 36px',
              borderRadius: '10px',
              background: '#E11D48',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '12px',
              fontWeight: 900,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(225, 29, 72, 0.5)',
            }}
          >
            ADD TO CART
          </button>
        </div>

        {/* Right Column: Price, Color Swatches & Size Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#FDA4AF', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              PRICE
            </div>
            <div style={{ fontSize: '36px', fontWeight: 900, color: '#FFFFFF', lineHeight: 1 }}>
              {price}
            </div>
          </div>

          {/* Color Pickers */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#FDA4AF', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
              SELECT COLORWAY
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {colors.map((c, idx) => (
                <div
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedColor(idx);
                  }}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: c.bg,
                    border: selectedColor === idx ? '2px solid #FFFFFF' : '2px solid transparent',
                    cursor: 'pointer',
                    boxShadow: selectedColor === idx ? '0 0 10px rgba(255, 255, 255, 0.8)' : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Size Selector Grid */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#FDA4AF', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
              SELECT SIZE (UK)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {sizes.map((sz) => {
                const isSelectedSize = selectedSize === sz;
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSize(sz);
                    }}
                    style={{
                      padding: '10px 0',
                      borderRadius: '10px',
                      border: isSelectedSize ? '2px solid #FFFFFF' : '1px solid rgba(255, 255, 255, 0.15)',
                      background: isSelectedSize ? '#FFFFFF' : 'rgba(255, 255, 255, 0.1)',
                      color: isSelectedSize ? '#1C0A1A' : '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 900,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {sz}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
