'use client';

import React, { useState } from 'react';
import { PageSection } from '@orbitox/commerce';
import {
  IconSearch,
  IconStar,
  IconShieldCheck,
  IconTruck,
  IconRotateCcw,
  IconHeart,
  IconShoppingBag,
  IconArrowLeft,
  IconArrowRight,
} from '../storefront-icons';

interface SneakConnectProps {
  section: PageSection;
  onSelect?: () => void;
  isSelected?: boolean;
}

export function SneakConnectEditorialHeroSection({
  section,
  onSelect,
  isSelected,
}: SneakConnectProps) {
  const {
    title = 'SPORT FOOTWEAR FOR MOTION & STYLE',
    subtitle = 'Premium athletic footwear for every ambitious goal. Find your pair and move with velocity.',
    searchPlaceholder = 'Search by model, brand, or category...',
    trustCount = '10 000+ satisfied athletes',
    heroImageUrl = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&auto=format&fit=crop',
  } = section.settings || {};

  const [activeCategory, setActiveCategory] = useState('All');
  const [searchValue, setSearchValue] = useState('');

  const filterPills = ['All', 'Running', 'Basketball', 'Training', 'Lifestyle', 'New'];

  return (
    <section
      onClick={onSelect}
      style={{
        maxWidth: '1380px',
        margin: '16px auto',
        padding: '0 20px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        color: '#0F172A',
      }}
    >
      {/* ─── Hero Editorial Banner with High-Fashion Model & Search Bar ─── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #B8C7CE 0%, #9EB2BD 100%)',
          borderRadius: '24px',
          padding: '48px 40px',
          position: 'relative',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)',
          gap: '30px',
          alignItems: 'center',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.1)',
          border: isSelected ? '2px solid #2563EB' : '1px solid rgba(255, 255, 255, 0.6)',
        }}
      >
        {/* Left Column: Big Bold Cyrillic / English Title + Pill Search */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', zIndex: 2 }}>
          <h1
            style={{
              fontSize: 'clamp(32px, 4.5vw, 54px)',
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              textTransform: 'uppercase',
              color: '#FFFFFF',
              textShadow: '0 2px 20px rgba(0, 0, 0, 0.15)',
              margin: 0,
            }}
          >
            {title}
          </h1>

          <p
            style={{
              fontSize: '14px',
              lineHeight: 1.55,
              color: 'rgba(255, 255, 255, 0.9)',
              maxWidth: '480px',
              margin: 0,
            }}
          >
            {subtitle}
          </p>

          {/* Integrated Search Bar Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#FFFFFF',
              borderRadius: '9999px',
              padding: '4px 6px 4px 16px',
              maxWidth: '440px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
            }}
          >
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={searchPlaceholder}
              onClick={(e) => e.stopPropagation()}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: '13px',
                color: '#0F172A',
                background: 'transparent',
              }}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (searchValue) alert(`Searching for "${searchValue}" in catalog`);
              }}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#0F172A',
                border: 'none',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              🔍
            </button>
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFFFFF', alignSelf: 'center', marginRight: '4px' }}>
              Popular:
            </span>
            {filterPills.map((pill) => {
              const active = activeCategory === pill;
              return (
                <button
                  key={pill}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveCategory(pill);
                  }}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '9999px',
                    border: 'none',
                    background: active ? '#0F172A' : 'rgba(255, 255, 255, 0.45)',
                    color: active ? '#FFFFFF' : '#0F172A',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {pill}
                </button>
              );
            })}
          </div>

          {/* Social Proof Trust Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(10px)',
              padding: '8px 16px',
              borderRadius: '9999px',
              width: 'fit-content',
              marginTop: '10px',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.08)',
            }}
          >
            {/* Avatar Stack */}
            <div style={{ display: 'flex', marginLeft: '-4px' }}>
              {['#F97316', '#3B82F6', '#10B981', '#A855F7'].map((bg, idx) => (
                <div
                  key={idx}
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: bg,
                    border: '2px solid #FFFFFF',
                    marginLeft: idx > 0 ? '-6px' : 0,
                    fontSize: '9px',
                    fontWeight: 900,
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ★
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '11px', color: '#EAB308', fontWeight: 900 }}>★★★★★</div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A' }}>{trustCount}</div>
            </div>
          </div>
        </div>

        {/* Right Column: Model Image with Floating Feature Overlay */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <img
            src={heroImageUrl}
            alt="SneakConnect Athlete Model"
            style={{
              maxHeight: '440px',
              borderRadius: '20px',
              objectFit: 'cover',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            }}
          />

          {/* Floating Benefit Card Overlay */}
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              right: '-10px',
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '14px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
              fontSize: '11px',
              fontWeight: 700,
              color: '#0F172A',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconShieldCheck size={14} color="#10B981" />
              <span>100% Authentic Guaranteed</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconTruck size={14} color="#3B82F6" />
              <span>Fast 1-2 Day Express Delivery</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconRotateCcw size={14} color="#F59E0B" />
              <span>14-Day Free Doorstep Return</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SneakConnectPopularModelsSection({
  section,
  onSelect,
  isSelected,
}: SneakConnectProps) {
  const {
    title = 'POPULAR MODELS',
    subtitle = 'Top customer choices for supreme comfort and runway performance.',
  } = section.settings || {};

  const models = [
    {
      name: 'Nike Air Zoom Pegasus 41',
      tag: 'Men Running Shoes',
      price: '$149.99',
      badge: 'BEST SELLER',
      badgeColor: '#F97316',
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop',
    },
    {
      name: 'Jordan Luka 3 Volt',
      tag: 'Basketball Performance',
      price: '$169.99',
      badge: 'NEW',
      badgeColor: '#10B981',
      image: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?q=80&w=600&auto=format&fit=crop',
    },
    {
      name: 'Adidas Dropset 3 Trainer',
      tag: 'Strength & Cross-Training',
      price: '$129.99',
      badge: 'HIT',
      badgeColor: '#EF4444',
      image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?q=80&w=600&auto=format&fit=crop',
    },
    {
      name: 'New Balance 9060 Mineral',
      tag: 'Lifestyle Heritage',
      price: '$179.99',
      badge: 'LIMITED',
      badgeColor: '#8B5CF6',
      image: 'https://images.unsplash.com/photo-1539185441755-769473a23570?q=80&w=600&auto=format&fit=crop',
    },
  ];

  const [wishlist, setWishlist] = useState<Record<number, boolean>>({});

  return (
    <section
      onClick={onSelect}
      style={{
        maxWidth: '1380px',
        margin: '36px auto',
        padding: '0 20px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '24px',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              color: '#0F172A',
              margin: 0,
            }}
          >
            {title}
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>{subtitle}</p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              cursor: 'pointer',
              fontWeight: 900,
            }}
          >
            ←
          </button>
          <button
            type="button"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '1px solid #0F172A',
              background: '#0F172A',
              color: '#FFFFFF',
              cursor: 'pointer',
              fontWeight: 900,
            }}
          >
            →
          </button>
        </div>
      </div>

      {/* Grid of 4 Footwear Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '18px',
        }}
      >
        {models.map((m, idx) => {
          const isFavorited = !!wishlist[idx];
          return (
            <div
              key={idx}
              style={{
                background: '#FFFFFF',
                borderRadius: '18px',
                border: '1px solid #F1F5F9',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Top Badge & Heart Wishlist */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span
                  style={{
                    background: m.badgeColor,
                    color: '#FFFFFF',
                    fontSize: '9px',
                    fontWeight: 900,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    letterSpacing: '0.04em',
                  }}
                >
                  {m.badge}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setWishlist((prev) => ({ ...prev, [idx]: !prev[idx] }));
                  }}
                  style={{
                    background: isFavorited ? '#FEE2E2' : '#F8FAFC',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <IconHeart size={14} filled={isFavorited} color={isFavorited ? '#EF4444' : '#94A3B8'} />
                </button>
              </div>

              {/* Product Image */}
              <div
                style={{
                  height: '160px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '14px',
                }}
              >
                <img
                  src={m.image}
                  alt={m.name}
                  style={{
                    maxHeight: '140px',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.1))',
                  }}
                />
              </div>

              {/* Title & Tag */}
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>
                {m.name}
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px', marginBottom: '12px' }}>
                {m.tag}
              </div>

              {/* Bottom Price & Add to Bag */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#0F172A' }}>{m.price}</div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    alert(`Added ${m.name} to shopping cart`);
                  }}
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: '#0F172A',
                    border: 'none',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <IconShoppingBag size={15} color="#FFFFFF" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function SneakConnectFeatureGridSection({
  section,
  onSelect,
  isSelected,
}: SneakConnectProps) {
  const {
    title = 'COLLECTIONS & ADVANTAGES',
    subtitle = 'More than a store — your partner in sports and athletic culture.',
  } = section.settings || {};

  const disciplines = [
    { title: 'RUNNING', desc: 'Lightweight energy return and velocity for any marathon distance.', img: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?q=80&w=600&auto=format&fit=crop' },
    { title: 'BASKETBALL', desc: 'Max grip traction, ankle lockdown, and explosive vertical bounce.', img: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=600&auto=format&fit=crop' },
    { title: 'TRAINING', desc: 'Rock-solid heel stability and supreme versatility for lifting.', img: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop' },
    { title: 'LIFESTYLE', desc: 'Runway heritage silhouettes tailored for everyday metropolitan comfort.', img: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=600&auto=format&fit=crop' },
  ];

  return (
    <section
      onClick={onSelect}
      style={{
        maxWidth: '1380px',
        margin: '36px auto 60px',
        padding: '0 20px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <h2 style={{ fontSize: '22px', fontWeight: 900, textTransform: 'uppercase', color: '#0F172A', margin: 0 }}>
        {title}
      </h2>
      <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 20px 0' }}>{subtitle}</p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
        }}
      >
        {disciplines.map((d, i) => (
          <div
            key={i}
            style={{
              position: 'relative',
              borderRadius: '20px',
              overflow: 'hidden',
              height: '280px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
              cursor: 'pointer',
            }}
          >
            <img
              src={d.img}
              alt={d.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            {/* Dark Gradient Overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(15, 23, 42, 0.92) 0%, rgba(15, 23, 42, 0.2) 60%, transparent 100%)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: '20px',
                color: '#FFFFFF',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '0.04em' }}>{d.title}</div>
              <div style={{ fontSize: '11px', color: '#CBD5E1', marginTop: '4px', lineHeight: 1.4 }}>{d.desc}</div>
              <div style={{ marginTop: '10px', fontSize: '11px', fontWeight: 800, color: '#60A5FA', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span>Explore Collection</span>
                <IconArrowRight size={12} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
