'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { DEFAULT_THEMES } from '@orbitox-io/celebrations';
import { useEcosystem } from '../../lib/ecosystem-context';
import { ArrowRight, Check, Palette, Search, Sparkles } from 'lucide-react';

const tiers = ['ALL', 'FREE', 'PRO', 'PREMIUM'];

export default function ThemesGalleryPage() {
  const { getTemplateBySlug } = useEcosystem();
  const [selectedTier, setSelectedTier] = useState('ALL');
  const [query, setQuery] = useState('');

  const filteredThemes = useMemo(() => {
    return DEFAULT_THEMES.filter((theme) => {
      const template = getTemplateBySlug(theme.slug);
      if (template && template.status === 'HIDDEN') return false;
      if (selectedTier !== 'ALL' && theme.tier !== selectedTier) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      const tags = theme.tags ?? [];
      return (
        theme.name.toLowerCase().includes(q) ||
        theme.description.toLowerCase().includes(q) ||
        tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [getTemplateBySlug, query, selectedTier]);

  return (
    <main style={{ minHeight: '100vh', background: 'radial-gradient(circle at top, rgba(216,179,106,0.12), transparent 18%), linear-gradient(180deg, #0a0d12 0%, #0d1118 100%)', color: '#f5f7fb' }}>
      <div className="container" style={{ padding: '32px 0 80px' }}>
        <header style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 999, background: 'rgba(216,179,106,0.12)', border: '1px solid rgba(216,179,106,0.28)', color: '#f5e5bf', fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            <Sparkles size={14} /> curated themes
          </div>
          <h1 style={{ marginTop: 16, fontSize: 'clamp(2.2rem, 4vw, 3.6rem)', letterSpacing: '-0.08em' }}>Design for the feeling you want.</h1>
          <p style={{ margin: '14px auto 0', maxWidth: 660, color: 'rgba(245,247,251,0.7)', lineHeight: 1.7 }}>
            Each look is built to feel cinematic, elegant, and unmistakably premium, with custom typography, palette, and atmosphere tuned for the mood of your event.
          </p>
        </header>

        <div className="surface-panel" style={{ padding: 18, marginBottom: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 220, flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '10px 12px' }}>
              <Search size={16} color="#f5e5bf" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search theme, mood, or style" style={{ flex: 1, border: 0, outline: 'none', background: 'transparent', color: '#f5f7fb', fontSize: 14 }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {tiers.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setSelectedTier(tier)}
                  style={{
                    borderRadius: 999,
                    padding: '9px 14px',
                    border: selectedTier === tier ? '1px solid rgba(216,179,106,0.45)' : '1px solid rgba(255,255,255,0.08)',
                    background: selectedTier === tier ? 'rgba(216,179,106,0.14)' : 'rgba(255,255,255,0.02)',
                    color: selectedTier === tier ? '#f5e5bf' : 'rgba(245,247,251,0.72)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 18 }}>
          {filteredThemes.map((theme) => (
            <article key={theme.id} className="surface-panel" style={{ overflow: 'hidden' }}>
              <div style={{ height: 200, background: `linear-gradient(135deg, ${theme.styleConfig.primaryColor}, ${theme.styleConfig.backgroundColor})`, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 18%, rgba(8,11,17,0.5) 100%)' }} />
                <div style={{ position: 'absolute', left: 14, top: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ padding: '6px 10px', borderRadius: 999, background: 'rgba(9,11,16,0.52)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{theme.tier}</span>
                </div>
              </div>

              <div style={{ padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', letterSpacing: '-0.05em' }}>{theme.name}</h2>
                  <Palette size={16} color="#f5e5bf" />
                </div>

                <p style={{ margin: '0 0 16px', color: 'rgba(245,247,251,0.7)', lineHeight: 1.6 }}>{theme.description}</p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                  {[theme.styleConfig.primaryColor, theme.styleConfig.secondaryColor, theme.styleConfig.accentColor || '#ffffff'].map((color, index) => (
                    <span key={`${theme.slug}-${color}-${index}`} style={{ width: 16, height: 16, borderRadius: '50%', background: color, border: '1px solid rgba(255,255,255,0.18)' }} />
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(245,247,251,0.62)' }}>
                    <Check size={15} color="#8fd6b2" /> {(theme.tags ?? [])[0] ?? 'Signature look'}
                  </div>
                  <Link href={`/create?theme=${theme.slug}`} className="btn-primary" style={{ padding: '10px 14px', fontWeight: 800 }}>
                    Use theme <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
