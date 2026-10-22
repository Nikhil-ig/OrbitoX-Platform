'use client';

import React, { useRef } from 'react';
import { Heart, Sparkles, ArrowRight, Camera, Image as ImageIcon } from 'lucide-react';
import { atelierSoundscape } from '@/lib/atelier-soundscape';

interface Scene06Props {
  storyQuote: string;
  heroImage: string;
  onStoryQuoteChange: (quote: string) => void;
  onHeroImageChange: (imageUrl: string) => void;
  onNextScene: () => void;
  isCalmMode?: boolean;
}

const QUOTE_INSPIRATIONS = [
  'Two lives, two hearts, joined together in friendship and united forever in love.',
  'Under sacred stars and timeless skies, we invite you to bear witness as our chapters unite.',
  'A milestone marked with laughter, cherished company, and unconditional joy.',
  'From this day forward, surrounded by those who have shaped our past and illuminate our future.',
];

const CURATED_HERO_PHOTOS = [
  {
    title: 'Imperial Regalia',
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Golden Sunset Palace',
    url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Candlelit Nocturne',
    url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Botanical Glasshouse',
    url: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80',
  },
];

export const Scene06_Narrative: React.FC<Scene06Props> = ({
  storyQuote,
  heroImage,
  onStoryQuoteChange,
  onHeroImageChange,
  onNextScene,
  isCalmMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  return (
    <section
      id="scene-6"
      ref={containerRef}
      className="cinematic-scene"
      style={{
        minHeight: '100vh',
        justifyContent: 'center',
        padding: '100px 24px',
        position: 'relative',
        zIndex: 25,
      }}
    >
      <div style={{ maxWidth: 1050, margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
              color: '#D4AF37',
              fontSize: 12,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            <span>Scene 06</span>
            <span>—</span>
            <span>The Narrative & Heart</span>
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.2rem, 5vw, 4rem)',
              fontWeight: 800,
              color: '#FAF8F5',
              lineHeight: 1.15,
            }}
          >
            Dedication & Visual Memory
          </h2>
          <p
            style={{
              color: 'rgba(245, 247, 251, 0.7)',
              fontSize: 'clamp(1rem, 1.8vw, 1.25rem)',
              maxWidth: 620,
              margin: '12px auto 0',
            }}
          >
            Imbue your gathering with heartfelt prose and select the portrait that anchors your
            invitation.
          </p>
        </div>

        {/* Narrative Box */}
        <div
          className="cinematic-glass-card"
          style={{
            padding: 'clamp(24px, 5vw, 40px)',
            marginBottom: 36,
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#D4AF37',
              marginBottom: 12,
            }}
          >
            <Heart size={16} />
            <span>Dedication & Story</span>
          </label>
          <textarea
            rows={3}
            value={storyQuote}
            onChange={(e) => onStoryQuoteChange(e.target.value)}
            className="atelier-input"
            data-cursor="DEDICATE"
            style={{
              fontSize: 'clamp(1.1rem, 2vw, 1.35rem)',
              lineHeight: 1.6,
              resize: 'vertical',
            }}
          />

          {/* Quote Inspirations */}
          <div style={{ marginTop: 20 }}>
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(245, 247, 251, 0.45)' }}>
              Prose Presets:
            </span>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
              {QUOTE_INSPIRATIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    atelierSoundscape.playPaperWhisper();
                    onStoryQuoteChange(q);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 999,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: storyQuote === q ? '#F5D061' : 'rgba(245, 247, 251, 0.75)',
                    fontSize: 12,
                    textAlign: 'left',
                    cursor: 'pointer',
                    maxWidth: '100%',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  &ldquo;{q.slice(0, 48)}...&rdquo;
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Hero Photo Selection */}
        <div
          className="cinematic-glass-card"
          style={{
            padding: 'clamp(24px, 5vw, 40px)',
            marginBottom: 44,
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#D4AF37',
              marginBottom: 16,
            }}
          >
            <Camera size={16} />
            <span>Hero Image for Invitation</span>
          </label>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
              marginBottom: 20,
            }}
          >
            {CURATED_HERO_PHOTOS.map((photo, pIdx) => {
              const isSelected = heroImage === photo.url;
              return (
                <div
                  key={pIdx}
                  onClick={() => {
                    atelierSoundscape.playPaperWhisper();
                    onHeroImageChange(photo.url);
                  }}
                  data-cursor="PHOTO"
                  style={{
                    height: 140,
                    borderRadius: 18,
                    overflow: 'hidden',
                    position: 'relative',
                    cursor: 'pointer',
                    border: isSelected ? '2px solid #D4AF37' : '1px solid rgba(255, 255, 255, 0.12)',
                    boxShadow: isSelected ? '0 10px 30px rgba(212, 175, 55, 0.4)' : 'none',
                    transform: isSelected ? 'scale(1.03)' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: `url(${photo.url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, transparent 40%, rgba(7,9,13,0.9) 100%)',
                      display: 'flex',
                      alignItems: 'flex-end',
                      padding: 12,
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#FAF8F5' }}>
                      {photo.title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <input
            type="url"
            value={heroImage}
            onChange={(e) => onHeroImageChange(e.target.value)}
            placeholder="Or enter custom image URL (Unsplash or direct image link)"
            className="atelier-input"
            data-cursor="URL"
            style={{ fontSize: 13, padding: '12px 18px' }}
          />
        </div>

        {/* Proceed to Grand Reveal */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => {
              atelierSoundscape.playHarpArpeggio();
              onNextScene();
            }}
            data-cursor="REVEAL"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              padding: '18px 42px',
              borderRadius: 999,
              background: 'linear-gradient(135deg, #FAF8F5 0%, #F5D061 50%, #D4AF37 100%)',
              color: '#07090D',
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              fontWeight: 900,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              border: 'none',
              boxShadow: '0 20px 50px rgba(212, 175, 55, 0.45)',
              cursor: 'pointer',
            }}
          >
            <span>Awaken The Grand Reveal</span>
            <Sparkles size={18} />
          </button>
        </div>
      </div>
    </section>
  );
};
