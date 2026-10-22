'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronDown, Sparkles } from 'lucide-react';
import { useMagneticElement } from '@/hooks/useMagneticElement';
import { atelierSoundscape } from '@/lib/atelier-soundscape';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface Scene01Props {
  onBeginClick: () => void;
  isCalmMode?: boolean;
}

export const Scene01_Threshold: React.FC<Scene01Props> = ({ onBeginClick, isCalmMode = false }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const subtitleRef = useRef<HTMLParagraphElement | null>(null);
  const tagRef = useRef<HTMLDivElement | null>(null);
  const ctaRef = useRef<HTMLButtonElement | null>(null);
  const scrollPromptRef = useRef<HTMLDivElement | null>(null);

  useMagneticElement(ctaRef, { strength: 0.4, radius: 100 });

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    const ctx = gsap.context(() => {
      // Opening entrance timeline
      const tl = gsap.timeline();

      tl.fromTo(
        tagRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', delay: 0.2 }
      )
        .fromTo(
          titleRef.current,
          { opacity: 0, scale: 0.9, letterSpacing: '0.3em' },
          { opacity: 1, scale: 1, letterSpacing: '0.14em', duration: 1.6, ease: 'power2.out' },
          '-=0.8'
        )
        .fromTo(
          subtitleRef.current,
          { opacity: 0, y: 25 },
          { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' },
          '-=0.8'
        )
        .fromTo(
          [ctaRef.current, scrollPromptRef.current],
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.8, stagger: 0.2, ease: 'power2.out' },
          '-=0.4'
        );

      // Scroll-driven exit transformation
      if (!isCalmMode) {
        gsap.to(containerRef.current, {
          opacity: 0,
          scale: 0.92,
          y: -100,
          ease: 'power2.inOut',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'center center',
            end: 'bottom top',
            scrub: 1,
          },
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, [isCalmMode]);

  return (
    <section
      id="scene-1"
      ref={containerRef}
      className="cinematic-scene cinematic-scene-pinned"
      style={{
        minHeight: '100vh',
        position: 'relative',
        zIndex: 10,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          padding: '0 24px',
        }}
      >
        {/* Kicker Badge */}
        <div
          ref={tagRef}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 18px',
            borderRadius: 999,
            background: 'rgba(212, 175, 55, 0.1)',
            border: '1px solid rgba(212, 175, 55, 0.35)',
            boxShadow: '0 0 25px rgba(212, 175, 55, 0.15)',
          }}
        >
          <Sparkles size={13} color="#F5D061" />
          <span
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-sans)',
              fontWeight: 800,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#F5D061',
            }}
          >
            OrbitoX Haute Celebrations
          </span>
        </div>

        {/* Hero Title */}
        <h1 ref={titleRef} className="cinematic-title-giant">
          CELEBRATIONS
        </h1>

        {/* Editorial Subtitle */}
        <p ref={subtitleRef} className="cinematic-subtitle">
          Every monumental memory begins with an intention. Step inside the haute digital atelier to
          compose invitations of rare elegance and living depth.
        </p>

        {/* Primary Action Button */}
        <div style={{ marginTop: 16 }}>
          <button
            ref={ctaRef}
            onClick={() => {
              atelierSoundscape.playHarpArpeggio();
              onBeginClick();
            }}
            data-cursor="BEGIN"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              padding: '16px 36px',
              borderRadius: 999,
              background: 'linear-gradient(135deg, #FAF8F5 0%, #E6C875 50%, #D4AF37 100%)',
              color: '#07090D',
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              border: 'none',
              boxShadow: '0 15px 40px rgba(212, 175, 55, 0.45)',
              cursor: 'pointer',
            }}
          >
            <span>Begin Your Story</span>
            <Sparkles size={16} />
          </button>
        </div>

        {/* Ambient Scroll Cue */}
        <div
          ref={scrollPromptRef}
          style={{
            marginTop: 40,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            opacity: 0.7,
          }}
        >
          <span
            style={{
              fontSize: 10,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(245, 247, 251, 0.6)',
            }}
          >
            Scroll or Enter to Awaken
          </span>
          <div style={{ animation: 'bounce 2s infinite' }}>
            <ChevronDown size={18} color="#D4AF37" />
          </div>
        </div>
      </div>
    </section>
  );
};
