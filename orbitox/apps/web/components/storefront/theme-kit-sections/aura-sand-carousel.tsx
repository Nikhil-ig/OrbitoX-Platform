'use client';

import React, { useState } from 'react';
import { PageSection } from '@orbitox/commerce';

interface AuraSandProps {
  section: PageSection;
  onSelect?: () => void;
  isSelected?: boolean;
}

export function AuraSandCarouselSection({
  section,
  onSelect,
  isSelected,
}: AuraSandProps) {
  const {
    collectionLabel = 'OUR COLLECTION',
    title = 'Featured Products',
    subtitle = 'Explore our most popular items loved by customers worldwide.',
  } = section.settings || {};

  const products = [
    {
      name: 'Smart Watch',
      desc: 'Track your fitness and stay connected all day.',
      price: '$89.99',
      rating: '4.6 (89)',
      badge: 'NEW',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop',
    },
    {
      name: 'Running Shoes',
      desc: 'Lightweight and comfortable for everyday active run.',
      price: '$99.99',
      rating: '4.7 (98)',
      badge: 'TRENDING',
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop',
    },
    {
      name: 'Wireless Headphones',
      desc: 'High quality spatial sound with supreme comfort.',
      price: '$129.99',
      rating: '4.8 (120)',
      badge: 'BEST SELLER',
      isCenter: true,
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop',
    },
    {
      name: 'DSLR Camera',
      desc: 'Capture everyday moments with perfect clarity.',
      price: '$699.99',
      rating: '4.9 (60)',
      badge: 'POPULAR',
      image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=600&auto=format&fit=crop',
    },
    {
      name: 'Travel Backpack',
      desc: 'Spacious, durable and water-resistant.',
      price: '$59.99',
      rating: '4.5 (75)',
      badge: 'NEW',
      image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=600&auto=format&fit=crop',
    },
  ];

  const [activeDot, setActiveDot] = useState(2);

  return (
    <section
      onClick={onSelect}
      style={{
        maxWidth: '1320px',
        margin: '24px auto 48px',
        padding: '30px 20px',
        background: '#FAF6F0',
        borderRadius: '28px',
        fontFamily: "'Playfair Display', serif",
        color: '#292524',
        border: isSelected ? '2px solid #A37D4E' : '1px solid #EAE1D5',
        boxShadow: '0 20px 50px rgba(163, 125, 78, 0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ─── Header: Collection Label, Heading, Subtitle ─── */}
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#A37D4E',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            marginBottom: '6px',
          }}
        >
          {collectionLabel}
        </div>
        <h2
          style={{
            fontSize: 'clamp(28px, 4vw, 42px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            margin: '0 0 8px 0',
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: '14px',
            color: '#78716C',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            margin: 0,
          }}
        >
          {subtitle}
        </p>
      </div>

      {/* ─── 5-Card Product Carousel with Center Elevated Card ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '14px',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        {products.map((p, idx) => {
          const isElevated = p.isCenter;
          return (
            <div
              key={idx}
              style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                padding: isElevated ? '28px 20px' : '20px 16px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: isElevated
                  ? '0 25px 50px rgba(163, 125, 78, 0.2), 0 0 0 1px rgba(163, 125, 78, 0.2)'
                  : '0 8px 24px rgba(0, 0, 0, 0.04)',
                transform: isElevated ? 'scale(1.06) translateY(-8px)' : 'none',
                zIndex: isElevated ? 3 : 1,
                transition: 'all 0.25s ease',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {/* Badge & Wishlist Heart */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#F5EFEB',
                    color: '#A37D4E',
                  }}
                >
                  {p.badge}
                </span>
                <span style={{ fontSize: '13px', color: '#A8A29E', cursor: 'pointer' }}>♡</span>
              </div>

              {/* Product Image */}
              <div
                style={{
                  height: isElevated ? '170px' : '130px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                }}
              >
                <img
                  src={p.image}
                  alt={p.name}
                  style={{
                    maxHeight: '100%',
                    maxWidth: '100%',
                    objectFit: 'contain',
                  }}
                />
              </div>

              {/* Title & Desc */}
              <div style={{ fontSize: isElevated ? '15px' : '13px', fontWeight: 800, color: '#292524' }}>
                {p.name}
              </div>
              <div style={{ fontSize: '11px', color: '#78716C', margin: '4px 0 10px', lineHeight: 1.4 }}>
                {p.desc}
              </div>

              {/* Star Rating */}
              <div style={{ fontSize: '11px', color: '#D97706', fontWeight: 700, marginBottom: '12px' }}>
                ★ {p.rating}
              </div>

              {/* Bottom Price & Add to Cart */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <div style={{ fontSize: isElevated ? '18px' : '14px', fontWeight: 900, color: '#292524' }}>
                  {p.price}
                </div>

                {isElevated ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      alert(`Added ${p.name} to cart!`);
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      background: '#A37D4E',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 4px 12px rgba(163, 125, 78, 0.3)',
                    }}
                  >
                    <span>🛒</span>
                    <span>Add to Cart</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      alert(`Added ${p.name} to cart!`);
                    }}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: '#F5EFEB',
                      color: '#A37D4E',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    🛒
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Pagination Dots ─── */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '24px' }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              setActiveDot(i);
            }}
            style={{
              width: activeDot === i ? '18px' : '8px',
              height: '8px',
              borderRadius: '999px',
              background: activeDot === i ? '#A37D4E' : '#E5DDD0',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          />
        ))}
      </div>
    </section>
  );
}
