'use client';

import React, { useRef, useEffect } from 'react';
import { Occasion, Theme } from '@orbitox-io/celebrations';
import { Sparkles, Eye, ArrowRight, ShieldCheck } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { LiveInvitationCanvas } from '@/components/atelier/LiveInvitationCanvas';
import { useMagneticElement } from '@/hooks/useMagneticElement';
import { atelierSoundscape } from '@/lib/atelier-soundscape';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface Scene07Props {
  names: string;
  occasion: Occasion;
  theme: Theme;
  eventDate: string;
  venueName: string;
  storyQuote: string;
  heroImage: string;
  onOpenGuestPreview: () => void;
  onNextScene: () => void;
  isCalmMode?: boolean;
}

export const Scene07_Reveal: React.FC<Scene07Props> = ({
  names,
  occasion,
  theme,
  eventDate,
  venueName,
  storyQuote,
  heroImage,
  onOpenGuestPreview,
  onNextScene,
  isCalmMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const ctaRef = useRef<HTMLButtonElement | null>(null);

  useMagneticElement(ctaRef, { strength: 0.35, radius: 90 });

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    const ctx = gsap.context(() => {
      // Circular or scale expansion reveal
      gsap.fromTo(
        cardRef.current,
        { scale: 0.88, opacity: 0, y: 60 },
        {
          scale: 1,
          opacity: 1,
          y: 0,
          duration: 1.4,
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
      id="scene-7"
      ref={containerRef}
      className="cinematic-scene"
      style={{
        minHeight: '100vh',
        justifyContent: 'center',
        padding: '100px 24px',
        position: 'relative',
        zIndex: 30,
      }}
    >
      <div style={{ maxWidth: 860, margin: '0 auto', width: '100%', textAlign: 'center' }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
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
            <Sparkles size={14} color="#F5D061" />
            <span>Scene 07</span>
            <span>—</span>
            <span>The Living Awakening</span>
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.4rem, 5.5vw, 4.5rem)',
              fontWeight: 800,
              color: '#FAF8F5',
              lineHeight: 1.15,
            }}
          >
            Your Celebration Has Awakened
          </h2>
          <p
            style={{
              color: 'rgba(245, 247, 251, 0.75)',
              fontSize: 'clamp(1rem, 1.8vw, 1.25rem)',
              maxWidth: 640,
              margin: '12px auto 0',
            }}
          >
            The typography, coordinates, acoustic atmosphere, and prose have merged into one living
            tapestry.
          </p>
        </div>

        {/* Floating Live Canvas Card */}
        <div
          ref={cardRef}
          style={{
            position: 'relative',
            marginBottom: 44,
          }}
        >
          <LiveInvitationCanvas
            names={names}
            occasion={occasion}
            theme={theme}
            eventDate={eventDate}
            venueName={venueName}
            storyQuote={storyQuote}
            heroImage={heroImage}
            isInteractive={true}
          />
        </div>

        {/* Action Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          {/* Guest View Modal Button */}
          <button
            ref={ctaRef}
            onClick={() => {
              atelierSoundscape.playPaperWhisper();
              onOpenGuestPreview();
            }}
            data-cursor="IMMERSION"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '16px 32px',
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1.5px solid rgba(212, 175, 55, 0.5)',
              color: '#FAF8F5',
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            <Eye size={16} color="#D4AF37" />
            <span>Full Guest Immersion View</span>
          </button>

          {/* Proceed to Wax Seal */}
          <button
            onClick={() => {
              atelierSoundscape.playResonantBell();
              onNextScene();
            }}
            data-cursor="SEAL"
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
            <span>Affix Imperial Seal & Share</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
};
