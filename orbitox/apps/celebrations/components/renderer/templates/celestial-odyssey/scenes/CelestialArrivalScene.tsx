'use client';

import React, { useState } from 'react';
import { Volume2, VolumeX, Sparkles, ArrowDown } from 'lucide-react';
import { parseCoupleNames } from '../../../CoupleTitle';

import { SceneLayoutConfig, SceneMotionConfig, SceneInteractionConfig } from '@/components/studio/StudioData';

interface CelestialArrivalSceneProps {
  celebrationTitle: string;
  celebrationSubtitle?: string;
  eventDateStr: string;
  venueName?: string;
  venueCity?: string;
  primaryAccent?: string;
  isPlayingAudio: boolean;
  coverImage?: string;
  coverImageShape?: 'circle' | 'rounded' | 'editorial' | 'arch' | 'polaroid' | 'mask';
  coverImageFocalPoint?: { x: number; y: number };
  coverImageOverlay?: { color: string; opacity: number; blurPx: number };
  layout?: SceneLayoutConfig;
  motion?: SceneMotionConfig;
  interactions?: SceneInteractionConfig[];
  onToggleAudio: () => void;
  onBeginJourney: () => void;
}

export function CelestialArrivalScene({
  celebrationTitle,
  celebrationSubtitle = 'Under the Eternal Canopy of the Midnight Sky',
  eventDateStr,
  venueName = 'The Grand Lake Sanctuary',
  venueCity = 'Lake Como, Italy',
  primaryAccent = '#E5C07B',
  coverImage,
  coverImageShape = 'editorial',
  coverImageFocalPoint = { x: 50, y: 50 },
  coverImageOverlay = { color: '#040714', opacity: 0.35, blurPx: 0 },
  layout,
  motion,
  interactions,
  isPlayingAudio,
  onToggleAudio,
  onBeginJourney,
}: CelestialArrivalSceneProps) {
  const [monogramHovered, setMonogramHovered] = useState(false);

  // Parse couple names with optical balance
  const { isCouple, name1, name2 } = parseCoupleNames(celebrationTitle);
  const displayName1 = isCouple ? name1 : celebrationTitle;
  const displayName2 = isCouple ? name2 : '';

  // Monogram initials
  const initial1 = displayName1.charAt(0).toUpperCase();
  const initial2 = displayName2 ? displayName2.charAt(0).toUpperCase() : '✦';

  // Dynamic layout rules (P2-7)
  const composition = layout?.composition || 'centered';
  const paddingTop = layout?.paddingTopRem !== undefined ? `${layout.paddingTopRem}rem` : 'clamp(56px, 8vh, 80px)';
  const paddingBottom = layout?.paddingBottomRem !== undefined ? `${layout.paddingBottomRem}rem` : '0';
  const contentMaxWidth = layout?.contentMaxWidthPx !== undefined ? `${layout.contentMaxWidthPx}px` : '780px';

  // Interaction wiring (P3-10)
  const crestInteraction = interactions?.find(
    (int) => int.targetElementId === 'lay_arr_crest' || int.trigger === 'click' || int.trigger === 'tap'
  );

  const handleCrestClick = () => {
    if (crestInteraction) {
      if (crestInteraction.action === 'play_audio') {
        onToggleAudio();
      } else if (crestInteraction.action === 'trigger_transition') {
        onBeginJourney();
      } else {
        onBeginJourney();
      }
    } else {
      onBeginJourney();
    }
  };

  // Dynamic motion config (P2-8)
  const entryDuration = motion?.entryDuration !== undefined ? `${motion.entryDuration}s` : '1.2s';
  const motionEasing = motion?.easing || 'cubic-bezier(0.16, 1, 0.3, 1)';
  const parallaxDepth = motion?.parallaxDepth !== undefined ? motion.parallaxDepth : 0.4;
  const isReducedStatic = motion?.reducedMotionFallback === 'static' || motion?.reducedMotionFallback === 'instant';

  const isAlignStart = composition === 'split' || composition === 'editorial' || composition === 'asymmetric';

  return (
    <section
      id="moment-arrival"
      aria-label="Celestial Arrival & Prelude"
      data-editor-scene-id="scene_arrival"
      data-scene-id="scene_arrival"
      style={{
        position: 'relative',
        minHeight: 'min(100vh, 840px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: isAlignStart ? 'flex-start' : 'center',
        justifyContent: 'center',
        textAlign: isAlignStart ? 'left' : 'center',
        padding: `${paddingTop} 20px ${paddingBottom} 20px`,
        overflow: 'hidden',
        background: 'radial-gradient(ellipse 90% 60% at 50% 35%, rgba(14, 20, 42, 0.75) 0%, #06080F 85%)',
        transition: isReducedStatic ? 'none' : `padding ${entryDuration} ${motionEasing}`,
      }}
    >
      {/* 1. BACK LAYER: Subtle moving cosmic twilight texture & atmospheric starlight depth */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(1px 1px at 40px 60px, rgba(255,255,255,0.4), transparent), radial-gradient(1px 1px at 180px 220px, rgba(229,192,123,0.35), transparent), radial-gradient(1.5px 1.5px at 300px 100px, rgba(255,255,255,0.25), transparent)',
          backgroundSize: '360px 360px',
          opacity: 0.6,
          pointerEvents: 'none',
        }}
      />

      {/* Dynamic Cover Image Atmospheric Layer (P1 Media Slot ms_cover) */}
      {coverImage && (
        <div
          data-editor-node-id="lay_arr_atmo"
          data-binding-key="celebration.coverImage"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${coverImage})`,
            backgroundPosition: `${coverImageFocalPoint?.x ?? 50}% ${coverImageFocalPoint?.y ?? 50}%`,
            backgroundSize: 'cover',
            opacity: coverImageOverlay?.opacity ?? 0.35,
            filter: `blur(${coverImageOverlay?.blurPx ?? 0}px)`,
            pointerEvents: 'none',
            zIndex: 0,
            transition: 'opacity 0.4s ease, filter 0.4s ease',
          }}
        />
      )}

      {/* Gentle radiant aura behind the centerpiece */}
      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(500px, 80vw)',
          height: 'min(500px, 80vw)',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${primaryAccent}15 0%, rgba(136, 192, 208, 0.05) 45%, transparent 70%)`,
          filter: 'blur(50px)',
          pointerEvents: 'none',
          animation: 'celestialCosmicBreathe 9s ease-in-out infinite',
        }}
      />

      {/* 2. UI LAYER: Integrated whisper-quiet sound control in top-right corner */}
      <div
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          zIndex: 30,
        }}
      >
        <button
          type="button"
          onClick={onToggleAudio}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '9999px',
            background: 'rgba(255, 255, 255, 0.04)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: isPlayingAudio ? primaryAccent : 'rgba(255, 255, 255, 0.6)',
            fontSize: '0.78rem',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            minHeight: '40px',
          }}
          aria-label={isPlayingAudio ? 'Mute ambient soundscape' : 'Enable ambient soundscape'}
        >
          {isPlayingAudio ? (
            <>
              <Volume2 size={14} style={{ color: primaryAccent }} />
              <span style={{ letterSpacing: '0.08em' }}>sound on</span>
              <span
                style={{
                  display: 'inline-flex',
                  gap: '2px',
                  alignItems: 'center',
                  height: '10px',
                }}
              >
                <span style={{ width: '2px', height: '8px', background: primaryAccent, animation: 'pulse 1s infinite' }} />
                <span style={{ width: '2px', height: '12px', background: primaryAccent, animation: 'pulse 0.8s infinite 0.2s' }} />
                <span style={{ width: '2px', height: '6px', background: primaryAccent, animation: 'pulse 1.2s infinite 0.4s' }} />
              </span>
            </>
          ) : (
            <>
              <VolumeX size={14} />
              <span style={{ letterSpacing: '0.08em' }}>sound</span>
            </>
          )}
        </button>
      </div>

      {/* 3. FOCAL LAYER: Composed Celestial Monogram & Names (No Giant Billboards!) */}
      <div
        style={{
          maxWidth: contentMaxWidth,
          width: '100%',
          margin: isAlignStart ? '0 auto 0 clamp(16px, 5vw, 60px)' : '0 auto',
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: isAlignStart ? 'flex-start' : 'center',
          transition: isReducedStatic ? 'none' : `all ${entryDuration} ${motionEasing}`,
        }}
      >
        {/* Subtle, interactive Monogram Emblem with Orbiting Starlet */}
        <div
          onClick={handleCrestClick}
          onMouseEnter={() => setMonogramHovered(true)}
          onMouseLeave={() => setMonogramHovered(false)}
          data-layer-id="lay_arr_crest"
          title="Celestial Monogram Portal Crest"
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${monogramHovered ? primaryAccent : 'rgba(229, 192, 123, 0.25)'}`,
            boxShadow: monogramHovered ? `0 0 28px ${primaryAccent}55` : `0 0 12px ${primaryAccent}22`,
            marginBottom: '28px',
            cursor: 'pointer',
            transition: 'all 0.4s ease',
            transform: monogramHovered ? 'scale(1.06)' : 'scale(1)',
          }}
        >
          {/* Concentric orbiting micro-satellite starlet */}
          <div
            style={{
              position: 'absolute',
              inset: '-8px',
              borderRadius: '50%',
              border: `1px dashed ${primaryAccent}33`,
              animation: 'celestialMonogramSpin 16s linear infinite',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '-3px',
                left: 'calc(50% - 3px)',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#FFF9F5',
                boxShadow: `0 0 10px ${primaryAccent}, 0 0 4px #FFFFFF`,
              }}
            />
          </div>

          <span
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '0.85rem',
              letterSpacing: '0.18em',
              color: primaryAccent,
              fontWeight: 500,
            }}
          >
            {initial1}
            <span style={{ opacity: 0.4, margin: '0 2px' }}>•</span>
            {initial2}
          </span>
        </div>

        {/* Quiet Auspicious Kicker */}
        <p
          style={{
            fontSize: '0.76rem',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'rgba(229, 192, 123, 0.85)',
            fontWeight: 500,
            margin: '0 0 18px 0',
          }}
        >
          A Celebration Under The Stars
        </p>

        {/* Editorial Couple Typography: Balanced, refined scale (NOT 5rem!) */}
        <div
          data-editor-node-id="lay_arrival_title"
          data-editor-scene-id="scene_arrival"
          data-editor-kind="text"
          data-layer-id="lay_arrival_title"
          data-scene-id="scene_arrival"
          data-binding-key="celebration.title"
          style={{
            margin: '0 0 20px 0',
            lineHeight: 1.25,
            cursor: 'pointer',
          }}
        >
          {isCouple ? (
            <h1
              style={{
                fontFamily: "'Playfair Display', 'Cinzel', serif",
                fontSize: 'clamp(2rem, 4.5vw, 3.4rem)',
                fontWeight: 400,
                letterSpacing: '0.02em',
                color: '#FFF9F5',
                margin: 0,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'baseline',
                justifyContent: 'center',
                gap: 'clamp(8px, 1.8vw, 16px)',
              }}
            >
              <span>{displayName1}</span>
              <span
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontStyle: 'italic',
                  fontSize: 'clamp(1.4rem, 3vw, 2.2rem)',
                  color: primaryAccent,
                  fontWeight: 300,
                }}
              >
                &amp;
              </span>
              <span>{displayName2}</span>
            </h1>
          ) : (
            <h1
              style={{
                fontFamily: "'Playfair Display', 'Cinzel', serif",
                fontSize: 'clamp(2rem, 4.5vw, 3.4rem)',
                fontWeight: 400,
                letterSpacing: '0.02em',
                color: '#FFF9F5',
                margin: 0,
              }}
            >
              {displayName1}
            </h1>
          )}
        </div>

        {/* Poetic Invitation Narrative */}
        <p
          data-editor-node-id="lay_arrival_subtitle"
          data-editor-scene-id="scene_arrival"
          data-editor-kind="text"
          data-layer-id="lay_arrival_subtitle"
          data-scene-id="scene_arrival"
          data-binding-key="celebration.subtitle"
          style={{
            fontSize: 'clamp(0.92rem, 1.8vw, 1.05rem)',
            color: 'rgba(255, 249, 245, 0.72)',
            maxWidth: '520px',
            margin: '0 auto 32px auto',
            lineHeight: 1.65,
            fontWeight: 300,
            letterSpacing: '0.01em',
            cursor: 'pointer',
          }}
        >
          Together with their families, invite you to witness the beginning of forever as their orbits converge beneath the midnight sky.
        </p>

        {/* Date & Destination Coordinates */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 22px',
            borderRadius: '9999px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: 'rgba(255, 255, 255, 0.75)',
            fontSize: '0.86rem',
            marginBottom: '44px',
          }}
        >
          <span>{eventDateStr}</span>
          <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
          <span>{venueCity}</span>
        </div>

        {/* 4. INTERACTION LAYER: Single Compelling Tactile Invitation */}
        <button
          type="button"
          onClick={onBeginJourney}
          style={{
            position: 'relative',
            overflow: 'hidden',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 34px',
            borderRadius: '9999px',
            background: `linear-gradient(135deg, ${primaryAccent} 0%, #D4AF37 100%)`,
            color: '#07080D',
            fontWeight: 600,
            fontSize: '0.9rem',
            letterSpacing: '0.06em',
            border: 'none',
            cursor: 'pointer',
            boxShadow: `0 8px 28px ${primaryAccent}44`,
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            minHeight: '44px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
            e.currentTarget.style.boxShadow = `0 12px 36px ${primaryAccent}66`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = `0 8px 28px ${primaryAccent}44`;
          }}
        >
          {/* Starlight Sheen sweep */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)',
              animation: 'celestialButtonShimmer 5s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />
          <span style={{ position: 'relative', zIndex: 2 }}>Begin The Journey</span>
          <ArrowDown size={15} style={{ position: 'relative', zIndex: 2 }} />
        </button>

        {/* Scene Exit Bridge: Smooth downward celestial stream connecting to The Souls */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: 'clamp(20px, 3.5vh, 32px)',
            paddingBottom: '16px',
            opacity: 0.9,
          }}
        >
          {/* Top Filament with Traveling Starlight Photon */}
          <div
            className="celestial-photon-stream"
            style={{
              width: '1px',
              height: '28px',
              background: `linear-gradient(180deg, ${primaryAccent}44 0%, ${primaryAccent} 100%)`,
              boxShadow: `0 0 10px ${primaryAccent}44`,
            }}
          />
          {/* Perfectly concentric pulsing beacon */}
          <div
            style={{
              position: 'relative',
              width: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '6px 0',
            }}
          >
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#FFF9F5',
                boxShadow: `0 0 12px ${primaryAccent}, 0 0 4px #FFF`,
                animation: 'celestialBeaconBreathe 3s ease-in-out infinite',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: `1px solid ${primaryAccent}55`,
                animation: 'celestialBeaconRingPulse 3s cubic-bezier(0.16, 1, 0.3, 1) infinite',
                pointerEvents: 'none',
              }}
            />
          </div>
          <span
            style={{
              fontSize: '0.52rem',
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: `${primaryAccent}CC`,
              fontWeight: 500,
              marginTop: '2px',
            }}
          >
            CONTINUE
          </span>
          <div
            style={{
              width: '1px',
              height: '18px',
              background: `linear-gradient(180deg, ${primaryAccent} 0%, transparent 100%)`,
              marginTop: '5px',
            }}
          />
        </div>
      </div>
    </section>
  );
}
