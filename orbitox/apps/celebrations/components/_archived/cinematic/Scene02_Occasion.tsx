'use client';

import React, { useEffect, useRef } from 'react';
import { Occasion, DEFAULT_OCCASIONS } from '@orbitox-io/celebrations';
import { Sparkles, Check, ArrowRight, Heart, Cake, CalendarHeart, Baby, Flame, Building2 } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { atelierSoundscape } from '@/lib/atelier-soundscape';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface Scene02Props {
  selectedOccasion: Occasion;
  onSelectOccasion: (occasion: Occasion) => void;
  onNextScene: () => void;
  isCalmMode?: boolean;
}

const OCCASION_ICONS: Record<string, React.ReactNode> = {
  wedding: <Heart size={20} />,
  birthday: <Cake size={20} />,
  anniversary: <CalendarHeart size={20} />,
  'baby-shower': <Baby size={20} />,
  festival: <Flame size={20} />,
  corporate: <Building2 size={20} />,
};

const OCCASION_CINEMATICS: Record<string, { image: string; moodTagline: string; vibeBadge: string }> = {
  wedding: {
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
    moodTagline: 'Two souls, a timeless promise, an eternal gathering.',
    vibeBadge: 'Imperial Romantic',
  },
  birthday: {
    image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1200&q=80',
    moodTagline: 'An electric milestone celebrating another triumphant orbit.',
    vibeBadge: 'Joyful & Chic',
  },
  anniversary: {
    image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80',
    moodTagline: 'Honoring devotion, golden memories, and the years ahead.',
    vibeBadge: 'Timeless Devotion',
  },
  'baby-shower': {
    image: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=1200&q=80',
    moodTagline: 'Welcoming the gentle arrival of life’s purest miracle.',
    vibeBadge: 'Botanical Grace',
  },
  festival: {
    image: 'https://images.unsplash.com/photo-1543807535-eceef0bc6599?auto=format&fit=crop&w=1200&q=80',
    moodTagline: 'Sacred traditions, communal radiance, and festive illumination.',
    vibeBadge: 'Sacred Splendor',
  },
  corporate: {
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
    moodTagline: 'Prestigious award galas, executive summits, and visionary launches.',
    vibeBadge: 'Black Tie Gala',
  },
};

export const Scene02_Occasion: React.FC<Scene02Props> = ({
  selectedOccasion,
  onSelectOccasion,
  onNextScene,
  isCalmMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    const ctx = gsap.context(() => {
      // Staggered card emergence animation
      gsap.fromTo(
        cardsRef.current.filter(Boolean),
        { opacity: 0, y: 50, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.9,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 75%',
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const occasions = DEFAULT_OCCASIONS.slice(0, 6);

  return (
    <section
      id="scene-2"
      ref={containerRef}
      className="cinematic-scene"
      style={{
        minHeight: '100vh',
        justifyContent: 'center',
        padding: '100px 24px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
              color: '#D4AF37',
              fontSize: 12,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            <span>Scene 02</span>
            <span>—</span>
            <span>The Milestone</span>
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.2rem, 5vw, 4rem)',
              fontWeight: 800,
              color: '#FAF8F5',
              lineHeight: 1.15,
              marginBottom: 16,
            }}
          >
            What Are We Celebrating?
          </h2>
          <p
            style={{
              color: 'rgba(245, 247, 251, 0.7)',
              fontSize: 'clamp(1rem, 1.8vw, 1.25rem)',
              maxWidth: 620,
              margin: '0 auto',
            }}
          >
            Select the sacred occasion. Each portal unlocks a bespoke aesthetic universe and
            storytelling rhythm.
          </p>
        </div>

        {/* Portals Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24,
          }}
        >
          {occasions.map((occ, idx) => {
            const isSelected = selectedOccasion.slug === occ.slug;
            const meta = OCCASION_CINEMATICS[occ.slug] || {
              image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
              moodTagline: occ.description,
              vibeBadge: 'Haute Experience',
            };

            return (
              <div
                key={occ.slug}
                ref={(el) => {
                  cardsRef.current[idx] = el;
                }}
                onClick={() => {
                  atelierSoundscape.playHarpArpeggio();
                  onSelectOccasion(occ);
                }}
                data-cursor="SELECT"
                style={{
                  height: 380,
                  borderRadius: 28,
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: isSelected
                    ? '2px solid #D4AF37'
                    : '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: isSelected
                    ? '0 25px 60px rgba(212, 175, 55, 0.35), 0 0 30px rgba(212, 175, 55, 0.2)'
                    : '0 20px 40px rgba(0, 0, 0, 0.5)',
                  transform: isSelected ? 'scale(1.02)' : 'none',
                  transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  padding: 28,
                }}
              >
                {/* Background Image with Zoom on Hover */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url(${meta.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                    transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />

                {/* Dark Gradient Overlay */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(180deg, rgba(7,9,13,0.2) 0%, rgba(7,9,13,0.85) 60%, rgba(7,9,13,0.98) 100%)',
                  }}
                />

                {/* Content */}
                <div style={{ position: 'relative', zIndex: 2 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 12px',
                        borderRadius: 999,
                        background: 'rgba(212, 175, 55, 0.2)',
                        border: '1px solid rgba(212, 175, 55, 0.4)',
                        color: '#F5D061',
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {OCCASION_ICONS[occ.slug] || <Sparkles size={12} />}
                      {meta.vibeBadge}
                    </span>

                    {isSelected && (
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: '#D4AF37',
                          color: '#07090D',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Check size={16} strokeWidth={3} />
                      </span>
                    )}
                  </div>

                  <h3
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 26,
                      color: '#FAF8F5',
                      marginBottom: 8,
                    }}
                  >
                    {occ.name}
                  </h3>

                  <p
                    style={{
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: 'rgba(245, 247, 251, 0.75)',
                      marginBottom: 16,
                    }}
                  >
                    {meta.moodTagline}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: isSelected ? '#F5D061' : 'rgba(245, 247, 251, 0.5)',
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    <span>{isSelected ? 'Occasion Selected' : 'Choose This Portal'}</span>
                    <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Step Forward Action */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
          <button
            onClick={() => {
              atelierSoundscape.playPaperWhisper();
              onNextScene();
            }}
            data-cursor="CONTINUE"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              padding: '16px 36px',
              borderRadius: 999,
              background: 'rgba(212, 175, 55, 0.15)',
              border: '1.5px solid #D4AF37',
              color: '#FAF8F5',
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            <span>Proceed to Theme Worlds ({selectedOccasion.name})</span>
            <ArrowRight size={16} color="#D4AF37" />
          </button>
        </div>
      </div>
    </section>
  );
};
