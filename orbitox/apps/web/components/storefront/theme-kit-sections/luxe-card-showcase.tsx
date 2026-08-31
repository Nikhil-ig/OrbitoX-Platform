'use client';

import React, { useState } from 'react';
import { PageSection } from '@orbitox/commerce';

interface LuxeCardShowcaseProps {
  section: PageSection;
  onSelect?: () => void;
  isSelected?: boolean;
}

export function LuxeCardShowcaseSection({
  section,
  onSelect,
  isSelected,
}: LuxeCardShowcaseProps) {
  const {
    title = 'Card I like',
    subtitle = 'Minimalist squircle product cards with poetic storytelling, floating price pills, and micro-interactions.',
  } = section.settings || {};

  const [activeImageIndexLight, setActiveImageIndexLight] = useState(0);
  const [activeImageIndexDark, setActiveImageIndexDark] = useState(0);
  const [cartFeedback, setCartFeedback] = useState<string | null>(null);

  const images = [
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800&auto=format&fit=crop',
  ];

  const handleAddToCart = (mode: string) => {
    setCartFeedback(`Added "Deep Blue Nights" (${mode}) to Bag!`);
    setTimeout(() => setCartFeedback(null), 2500);
  };

  return (
    <section
      onClick={onSelect}
      style={{
        maxWidth: '1280px',
        margin: '40px auto',
        padding: '40px 20px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        border: isSelected ? '2px solid #38BDF8' : 'none',
        borderRadius: '32px',
        position: 'relative',
      }}
    >
      {/* Toast */}
      {cartFeedback && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#10B981',
            color: '#FFFFFF',
            padding: '10px 20px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 800,
            zIndex: 9999,
            boxShadow: '0 10px 30px rgba(16, 185, 129, 0.4)',
          }}
        >
          {cartFeedback}
        </div>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2
          style={{
            fontSize: 'clamp(28px, 4vw, 42px)',
            fontWeight: 900,
            letterSpacing: '-0.03em',
            margin: '0 0 8px 0',
            color: '#0F172A',
          }}
        >
          {title}
        </h2>
        <p style={{ fontSize: '14px', color: '#64748B', maxWidth: '520px', margin: '0 auto' }}>
          {subtitle}
        </p>
      </div>

      {/* Side-by-side Dual Cards Showcase (Matching User Reference Image 2 & 3) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '40px',
          flexWrap: 'wrap',
          background: '#EAEAEA',
          padding: '60px 30px',
          borderRadius: '36px',
        }}
      >
        {/* ─── 1. LIGHT MODE CARD ─── */}
        <div
          style={{
            width: '340px',
            background: '#FFFFFF',
            borderRadius: '32px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.25s ease',
          }}
        >
          {/* Card Image Area with Rounded Corners & Carousel Dots */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '320px',
              borderRadius: '24px',
              overflow: 'hidden',
              background: '#1A2930',
            }}
          >
            <img
              src={images[activeImageIndexLight]}
              alt="Deep Blue Nights"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'all 0.3s ease',
              }}
            />

            {/* Subtle Carousel Indicator Dots */}
            <div
              style={{
                position: 'absolute',
                bottom: '14px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '5px',
                background: 'rgba(0, 0, 0, 0.3)',
                backdropFilter: 'blur(8px)',
                padding: '4px 8px',
                borderRadius: '9999px',
                zIndex: 3,
              }}
            >
              {images.map((_, i) => (
                <div
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndexLight(i);
                  }}
                  style={{
                    width: activeImageIndexLight === i ? '14px' : '4px',
                    height: '4px',
                    borderRadius: '9999px',
                    background: activeImageIndexLight === i ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Card Content */}
          <div style={{ padding: '16px 8px 6px', display: 'flex', flexDirection: 'column' }}>
            {/* Title & Floating Dark Price Pill */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                Deep Blue Nights
              </h3>
              <span
                style={{
                  background: '#1E293B',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  letterSpacing: '0.02em',
                }}
              >
                $2,999
              </span>
            </div>

            {/* Poetic Description */}
            <p
              style={{
                fontSize: '12px',
                color: '#64748B',
                lineHeight: 1.45,
                margin: '0 0 14px 0',
              }}
            >
              For those who crave peace louder than the city. This view isn&apos;t just scenery, it&apos;s a whole reset.
            </p>

            {/* Badges Pill Tags */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#475569',
                  background: '#F1F5F9',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  border: '1px solid #E2E8F0',
                }}
              >
                Top Pick
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#475569',
                  background: '#F1F5F9',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  border: '1px solid #E2E8F0',
                }}
              >
                Only 9 vibes left
              </span>
            </div>

            {/* Full-width Dark Teal Pill Add to Cart Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAddToCart('Light');
              }}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '9999px',
                background: '#1C3D47',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(28, 61, 71, 0.25)',
              }}
            >
              Add to Cart
            </button>
          </div>
        </div>

        {/* ─── 2. DARK MODE CARD ─── */}
        <div
          style={{
            width: '340px',
            background: '#121E23',
            borderRadius: '32px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.06)',
            transition: 'all 0.25s ease',
          }}
        >
          {/* Card Image Area with Rounded Corners & Carousel Dots */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '320px',
              borderRadius: '24px',
              overflow: 'hidden',
              background: '#091014',
            }}
          >
            <img
              src={images[activeImageIndexDark]}
              alt="Deep Blue Nights Dark"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'all 0.3s ease',
              }}
            />

            {/* Subtle Carousel Indicator Dots */}
            <div
              style={{
                position: 'absolute',
                bottom: '14px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '5px',
                background: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(8px)',
                padding: '4px 8px',
                borderRadius: '9999px',
                zIndex: 3,
              }}
            >
              {images.map((_, i) => (
                <div
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndexDark(i);
                  }}
                  style={{
                    width: activeImageIndexDark === i ? '14px' : '4px',
                    height: '4px',
                    borderRadius: '9999px',
                    background: activeImageIndexDark === i ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Card Content */}
          <div style={{ padding: '16px 8px 6px', display: 'flex', flexDirection: 'column' }}>
            {/* Title & Floating Dark Price Pill */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
                Deep Blue Nights
              </h3>
              <span
                style={{
                  background: '#1A333B',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  letterSpacing: '0.02em',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                $2,999
              </span>
            </div>

            {/* Poetic Description */}
            <p
              style={{
                fontSize: '12px',
                color: '#94A3B8',
                lineHeight: 1.45,
                margin: '0 0 14px 0',
              }}
            >
              For those who crave peace louder than the city. This view isn&apos;t just scenery, it&apos;s a whole reset.
            </p>

            {/* Badges Pill Tags */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#CBD5E1',
                  background: 'rgba(255, 255, 255, 0.08)',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
              >
                Top Pick
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#CBD5E1',
                  background: 'rgba(255, 255, 255, 0.08)',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
              >
                Only 9 vibes left
              </span>
            </div>

            {/* Full-width High-Contrast White Pill Add to Cart Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAddToCart('Dark');
              }}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '9999px',
                background: '#FFFFFF',
                color: '#091014',
                border: 'none',
                fontSize: '13px',
                fontWeight: 900,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(255, 255, 255, 0.2)',
              }}
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
