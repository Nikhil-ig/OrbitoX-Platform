'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { DEFAULT_OCCASIONS, DEFAULT_OCCASION_CATEGORIES } from '@orbitox-io/celebrations';
import { ArrowRight, Baby, Building2, Cake, Flame, Gem, Heart, Search, Sparkles } from 'lucide-react';

function getOccasionIcon(slug: string, size = 24) {
  switch (slug) {
    case 'wedding':
      return <Heart size={size} color="#ff8ab1" />;
    case 'birthday':
      return <Cake size={size} color="#f8c86d" />;
    case 'engagement':
      return <Gem size={size} color="#a9d0ff" />;
    case 'anniversary':
      return <Heart size={size} color="#ffc0d9" fill="#ffc0d9" />;
    case 'baby-shower':
      return <Baby size={size} color="#d8b4fe" />;
    case 'festival':
      return <Flame size={size} color="#ffb26b" />;
    default:
      return <Building2 size={size} color="#b7c8d5" />;
  }
}

export default function ExploreOccasionsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOccasions = useMemo(() => {
    return DEFAULT_OCCASIONS.filter((occasion) => {
      if (selectedCategory !== 'all' && occasion.category !== selectedCategory) return false;
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        occasion.name.toLowerCase().includes(query) ||
        occasion.description.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, selectedCategory]);

  return (
    <main style={{ minHeight: '100vh', background: 'radial-gradient(circle at top, rgba(216,179,106,0.12), transparent 18%), linear-gradient(180deg, #0a0d12 0%, #0d1118 100%)', color: '#f5f7fb' }}>
      <div className="container" style={{ padding: '32px 0 80px' }}>
        <header style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 999, background: 'rgba(216,179,106,0.12)', border: '1px solid rgba(216,179,106,0.36)', color: '#f5e5bf', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 800 }}>
            <Sparkles size={14} /> Occasion catalog
          </div>
          <h1 style={{ marginTop: 18, fontSize: 'clamp(2.4rem, 4vw, 4rem)', letterSpacing: '-0.08em' }}>Every milestone deserves a beautiful story.</h1>
          <p style={{ margin: '14px auto 0', maxWidth: 680, color: 'rgba(245,247,251,0.7)', lineHeight: 1.7 }}>
            Start with the right occasion, then shape the flow, tone, and guest experience around what matters most.
          </p>
        </header>

        <div className="surface-panel" style={{ padding: 18, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '10px 14px', maxWidth: 620, margin: '0 auto' }}>
            <Search size={16} color="#f5e5bf" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search wedding, birthday, anniversary, festival..."
              style={{ flex: 1, background: 'transparent', border: 0, outline: 'none', color: '#f5f7fb', fontSize: 14 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 26 }}>
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            style={{
              borderRadius: 999,
              padding: '10px 16px',
              background: selectedCategory === 'all' ? 'rgba(216,179,106,0.14)' : 'rgba(255,255,255,0.02)',
              border: selectedCategory === 'all' ? '1px solid rgba(216,179,106,0.42)' : '1px solid rgba(255,255,255,0.08)',
              color: selectedCategory === 'all' ? '#f5e5bf' : 'rgba(245,247,251,0.72)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            All occasions ({DEFAULT_OCCASIONS.length})
          </button>
          {DEFAULT_OCCASION_CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategory(category.slug)}
              style={{
                borderRadius: 999,
                padding: '10px 16px',
                background: selectedCategory === category.slug ? 'rgba(216,179,106,0.14)' : 'rgba(255,255,255,0.02)',
                border: selectedCategory === category.slug ? '1px solid rgba(216,179,106,0.42)' : '1px solid rgba(255,255,255,0.08)',
                color: selectedCategory === category.slug ? '#f5e5bf' : 'rgba(245,247,251,0.72)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
          {filteredOccasions.map((occasion) => (
            <article key={occasion.id} className="surface-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(216,179,106,0.12)', border: '1px solid rgba(216,179,106,0.22)', display: 'grid', placeItems: 'center' }}>
                    {getOccasionIcon(occasion.slug, 22)}
                  </div>
                  <span style={{ padding: '6px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(245,247,251,0.7)' }}>
                    {occasion.category}
                  </span>
                </div>

                <div style={{ marginBottom: 10, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,247,251,0.5)' }}>
                  Occasion
                </div>
                <h2 style={{ margin: 0, fontSize: '1.7rem', letterSpacing: '-0.06em' }}>{occasion.name}</h2>
                <p style={{ margin: '10px 0 18px', color: 'rgba(245,247,251,0.7)', lineHeight: 1.7 }}>{occasion.description}</p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(occasion.defaultSections ?? []).slice(0, 4).map((section) => (
                    <span key={section} style={{ padding: '6px 9px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', color: 'rgba(245,247,251,0.72)', fontSize: 11, fontWeight: 600 }}>
                      {section.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>

              <Link href={`/create?occasion=${occasion.slug}`} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 22, padding: '12px 16px', fontWeight: 800 }}>
                Build {occasion.name} <ArrowRight size={16} />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
