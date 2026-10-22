'use client';

import React, { useEffect, useRef } from 'react';
import { Theme, DEFAULT_THEMES } from '@orbitox-io/celebrations';
import { Sparkles, Music, Check, Compass, ArrowRight, Disc } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { atelierSoundscape } from '@/lib/atelier-soundscape';
import { UNIVERSE_DEFINITIONS, UniverseDef } from '@/components/atelier/UniverseMoodSelector';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface Scene03Props {
  selectedTheme: Theme;
  onSelectTheme: (theme: Theme) => void;
  onNextScene: () => void;
  isCalmMode?: boolean;
}

export const Scene03_Atmosphere: React.FC<Scene03Props> = ({
  selectedTheme,
  onSelectTheme,
  onNextScene,
  isCalmMode = false,
}) => {
  const pinContainerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  // Horizontal Scroll Orchestration with GSAP ScrollTrigger
  useEffect(() => {
    if (typeof window === 'undefined' || isCalmMode) return;
    const container = pinContainerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    // Check if on small mobile screen — if so, keep natural horizontal overflow scroll
    if (window.innerWidth < 768) return;

    const ctx = gsap.context(() => {
      const scrollWidth = track.scrollWidth - window.innerWidth + 200;

      gsap.to(track, {
        x: -scrollWidth,
        ease: 'none',
        scrollTrigger: {
          trigger: container,
          start: 'top top',
          end: () => `+=${scrollWidth * 1.2}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
    }, container);

    return () => ctx.revert();
  }, [isCalmMode]);

  const themes = DEFAULT_THEMES.slice(0, 6);

  return (
    <section
      id="scene-3"
      ref={pinContainerRef}
      className="horizontal-scroll-container"
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        background: '#07090D',
        zIndex: 15,
        paddingTop: 40,
      }}
    >
      {/* Pinned Title Bar */}
      <div
        style={{
          padding: '0 48px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: 20,
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
              color: '#D4AF37',
              fontSize: 12,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            <span>Scene 03</span>
            <span>—</span>
            <span>The Atmosphere & Worlds</span>
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4vw, 3.5rem)',
              fontWeight: 800,
              color: '#FAF8F5',
              lineHeight: 1.15,
            }}
          >
            Choose the World Your Celebration Lives In
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span
            style={{
              fontSize: 12,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'rgba(245, 247, 251, 0.6)',
            }}
          >
            Scroll to Traverse Worlds
          </span>
          <button
            onClick={() => {
              atelierSoundscape.playPaperWhisper();
              onNextScene();
            }}
            data-cursor="PROCEED"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 22px',
              borderRadius: 999,
              background: 'linear-gradient(135deg, #D4AF37 0%, #AA8222 100%)',
              color: '#07090D',
              border: 'none',
              fontFamily: 'var(--font-display)',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            <span>Lock Atmosphere</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Horizontal Track of Worlds */}
      <div
        ref={trackRef}
        className="horizontal-scroll-track"
        style={{
          paddingLeft: '48px',
          paddingRight: '120px',
          overflowX: isCalmMode ? 'auto' : undefined,
        }}
      >
        {themes.map((theme, idx) => {
          const isSelected = selectedTheme.slug === theme.slug;
          const uDef = UNIVERSE_DEFINITIONS[idx] ?? UNIVERSE_DEFINITIONS[0]!;

          return (
            <div
              key={theme.slug}
              onClick={() => {
                atelierSoundscape.playHarpArpeggio();
                onSelectTheme(theme);
              }}
              data-cursor="SELECT"
              className="theme-world-card"
              style={{
                background: uDef.bgTexture,
                border: isSelected ? '2px solid #D4AF37' : '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: isSelected
                  ? '0 30px 90px rgba(212, 175, 55, 0.35), inset 0 0 30px rgba(212, 175, 55, 0.1)'
                  : '0 25px 60px rgba(0, 0, 0, 0.7)',
              }}
            >
              {/* Universe Top Header */}
              <div
                style={{
                  position: 'absolute',
                  top: 32,
                  left: 32,
                  right: 32,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: uDef.palette[1],
                      boxShadow: `0 0 12px ${uDef.palette[1]}`,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: 'var(--font-display)',
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      color: uDef.palette[1],
                      fontWeight: 700,
                    }}
                  >
                    World 0{idx + 1}
                  </span>
                </div>

                {isSelected ? (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 14px',
                      borderRadius: 999,
                      background: '#D4AF37',
                      color: '#07090D',
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}
                  >
                    <Check size={14} strokeWidth={3} />
                    <span>Active World</span>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 14px',
                      borderRadius: 999,
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FAF8F5',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    <span>Click to Enter</span>
                  </div>
                )}
              </div>

              {/* Large Specimen Typography in Background */}
              <div
                style={{
                  position: 'absolute',
                  top: '25%',
                  left: '5%',
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(3rem, 7vw, 6rem)',
                  fontWeight: 800,
                  opacity: 0.12,
                  color: uDef.palette[1],
                  pointerEvents: 'none',
                  textTransform: 'uppercase',
                  lineHeight: 0.9,
                }}
              >
                {theme.name}
              </div>

              {/* Bottom Card Content */}
              <div style={{ position: 'relative', zIndex: 5, maxWidth: 640 }}>
                {/* Audio Vibe Indicator */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 14px',
                    borderRadius: 999,
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    marginBottom: 16,
                  }}
                >
                  <Music size={13} color={uDef.palette[1]} />
                  <span style={{ fontSize: 11, color: 'rgba(245, 247, 251, 0.85)' }}>
                    Acoustic Atmosphere: <strong>{uDef.audioVibe}</strong>
                  </span>
                </div>

                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
                    fontWeight: 800,
                    color: '#FAF8F5',
                    marginBottom: 10,
                  }}
                >
                  {theme.name}
                </h3>

                <p
                  style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: 'rgba(245, 247, 251, 0.8)',
                    marginBottom: 24,
                  }}
                >
                  {uDef.tagline}
                </p>

                {/* Swatches & Specimen */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Swatches */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(245,247,251,0.5)' }}>
                      Palette:
                    </span>
                    {uDef.palette.map((color, cIdx) => (
                      <span
                        key={cIdx}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: color,
                          border: '1.5px solid rgba(255,255,255,0.2)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                        }}
                      />
                    ))}
                  </div>

                  {/* Typography Specimen Badge */}
                  <div
                    style={{
                      padding: '4px 12px',
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: 11,
                      color: 'rgba(245, 247, 251, 0.7)',
                    }}
                  >
                    Typography: <strong style={{ color: '#FAF8F5' }}>{uDef.fontSpecimen}</strong>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
