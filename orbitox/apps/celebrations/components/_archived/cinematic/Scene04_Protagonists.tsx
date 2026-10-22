'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { ArrowRight, Heart, Sparkles, UserCheck } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { atelierSoundscape } from '@/lib/atelier-soundscape';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface Scene04Props {
  names: string;
  onNamesChange: (names: string) => void;
  onNextScene: () => void;
  isCalmMode?: boolean;
}

const NAME_PRESETS = [
  'Vikram & Ananya',
  'Rohit & Shanaya',
  'Kabir & Meera',
  'Dev & Tara',
  'Aria & Julian',
  'Advait Sharma',
];

export const Scene04_Protagonists: React.FC<Scene04Props> = ({
  names,
  onNamesChange,
  onNextScene,
  isCalmMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const monogramRef = useRef<HTMLDivElement | null>(null);

  // Derive Monogram initials
  const monogram = useMemo(() => {
    const parts = names
      .split(/&|and|\+/i)
      .map((s) => s.trim().charAt(0).toUpperCase())
      .filter(Boolean);
    if (parts.length >= 2) return `${parts[0]} & ${parts[1]}`;
    if (parts.length === 1) return parts[0];
    return 'C';
  }, [names]);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    const ctx = gsap.context(() => {
      // Entrance reveal
      gsap.fromTo(
        monogramRef.current,
        { scale: 0.8, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 1.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 70%',
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="scene-4"
      ref={containerRef}
      className="cinematic-scene cinematic-scene-pinned"
      style={{
        minHeight: '100vh',
        position: 'relative',
        zIndex: 20,
        textAlign: 'center',
        padding: '80px 24px',
      }}
    >
      {/* Massive Background Display Typography (Depth Layer) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          textAlign: 'center',
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(4rem, 12vw, 11rem)',
          fontWeight: 900,
          color: 'rgba(212, 175, 55, 0.05)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        {names || 'PROTAGONISTS'}
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: 850,
          margin: '0 auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 28,
        }}
      >
        {/* Monogram Seal */}
        <div
          ref={monogramRef}
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, rgba(212, 175, 55, 0.35), rgba(7, 9, 13, 0.95))',
            border: '2px solid #D4AF37',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 35px rgba(212, 175, 55, 0.3)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 800,
              color: '#F5D061',
              letterSpacing: '0.1em',
            }}
          >
            {monogram}
          </span>
        </div>

        {/* Scene Kicker */}
        <div>
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
            <span>Scene 04</span>
            <span>—</span>
            <span>The Protagonists</span>
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.2rem, 5vw, 4.2rem)',
              fontWeight: 800,
              color: '#FAF8F5',
              lineHeight: 1.15,
            }}
          >
            Whom Are We Honoring?
          </h2>
          <p
            style={{
              color: 'rgba(245, 247, 251, 0.7)',
              fontSize: 'clamp(1rem, 1.8vw, 1.25rem)',
              marginTop: 12,
            }}
          >
            Type the names of the protagonists. Watch the typography awaken into living composition.
          </p>
        </div>

        {/* Huge Interactive Name Input */}
        <div style={{ width: '100%', maxWidth: 700 }}>
          <input
            ref={inputRef}
            type="text"
            value={names}
            onChange={(e) => onNamesChange(e.target.value)}
            placeholder="e.g. Vikram & Ananya"
            className="cinematic-input-huge"
            aria-label="Names of the protagonists"
            data-cursor="NAME"
          />
        </div>

        {/* Quick Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(245, 247, 251, 0.45)' }}>
            Inspirations:
          </span>
          {NAME_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => {
                atelierSoundscape.playPaperWhisper();
                onNamesChange(preset);
              }}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: names === preset ? '#F5D061' : 'rgba(245, 247, 251, 0.75)',
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
              }}
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Action Button */}
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => {
              atelierSoundscape.playResonantBell();
              onNextScene();
            }}
            data-cursor="PROCEED"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              padding: '16px 36px',
              borderRadius: 999,
              background: 'linear-gradient(135deg, #FAF8F5 0%, #D4AF37 100%)',
              color: '#07090D',
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              border: 'none',
              boxShadow: '0 15px 35px rgba(212, 175, 55, 0.4)',
              cursor: 'pointer',
            }}
          >
            <span>Affirm Names & Choose Horizon</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
};
