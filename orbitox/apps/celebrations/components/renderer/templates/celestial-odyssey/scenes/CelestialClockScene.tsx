'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Compass, Download, Sparkles } from 'lucide-react';
import {
  prefersReducedMotion,
  calculateNormalizedPointer,
} from '@/lib/motion-system';

import { SceneLayoutConfig, SceneMotionConfig, SceneInteractionConfig } from '@/components/studio/StudioData';
import { SceneGraphRenderer } from '@/components/renderer/SceneGraphRenderer';
import { CelestialCountdownGraph } from '@/components/template-studio/engine/CelestialCountdownGraph';
import type { SceneGraph } from '@/components/template-studio/engine/SceneGraphTypes';

interface CelestialClockSceneProps {
  eventDateStr: string;
  celebrationTitle: string;
  celebrationSubtitle?: string;
  venueName?: string;
  venueCity?: string;
  primaryAccent?: string;
  speedTier?: string;
  layout?: SceneLayoutConfig;
  motion?: SceneMotionConfig;
  interactions?: SceneInteractionConfig[];
  sceneGraph?: SceneGraph;
  onAddToCalendar: () => void;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

interface AstrolabeGraphicProps {
  activeOrbit: 'days' | 'hours' | 'minutes' | 'seconds' | null;
  daysAngle: number;
  hoursAngle: number;
  minutesAngle: number;
  secondsAngle: number;
  secondsPulse: boolean;
  primaryAccent: string;
  speedTier?: string;
}

function AstrolabeGraphic({
  activeOrbit,
  daysAngle,
  hoursAngle,
  minutesAngle,
  secondsAngle,
  secondsPulse,
  primaryAccent,
  speedTier = 'celestial',
}: AstrolabeGraphicProps) {
  const rotationDuration =
    speedTier === 'dynamic' ? '60s' : speedTier === 'quiet' ? '360s' : '180s';

  return (
    <svg viewBox="0 0 400 400" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      {/* Slow decorative outer astrolabe ring with exact center origin */}
      <g>
        <circle cx="200" cy="200" r="192" fill="none" stroke="rgba(229, 192, 123, 0.15)" strokeWidth="1" strokeDasharray="2, 6" />
        <circle cx="200" cy="200" r="184" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
        <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur={rotationDuration} repeatCount="indefinite" />
      </g>
      <circle cx="200" cy="200" r="160" fill="none" stroke={activeOrbit === 'days' ? primaryAccent : 'rgba(229, 192, 123, 0.22)'} strokeWidth={activeOrbit === 'days' ? '2.5' : '1.5'} strokeDasharray="4 8" style={{ transition: 'all 0.4s ease' }} />
      <g transform={`rotate(${daysAngle} 200 200)`} style={{ transition: 'transform 1s linear' }}>
        <circle cx="200" cy="40" r="7" fill={primaryAccent} filter="drop-shadow(0 0 8px #E5C07B)" />
        <circle cx="200" cy="40" r="12" fill="none" stroke={primaryAccent} strokeWidth="1" opacity="0.5" />
      </g>
      <circle cx="200" cy="200" r="125" fill="none" stroke={activeOrbit === 'hours' ? primaryAccent : 'rgba(255, 255, 255, 0.18)'} strokeWidth={activeOrbit === 'hours' ? '2.5' : '1.2'} strokeDasharray="3 6" style={{ transition: 'all 0.4s ease' }} />
      <g transform={`rotate(${hoursAngle} 200 200)`} style={{ transition: 'transform 1s linear' }}>
        <circle cx="200" cy="75" r="5.5" fill="#A8C0FF" filter="drop-shadow(0 0 6px #A8C0FF)" />
      </g>
      <circle cx="200" cy="200" r="90" fill="none" stroke={activeOrbit === 'minutes' ? primaryAccent : 'rgba(229, 192, 123, 0.28)'} strokeWidth={activeOrbit === 'minutes' ? '2.5' : '1.2'} strokeDasharray="2 4" style={{ transition: 'all 0.4s ease' }} />
      <g transform={`rotate(${minutesAngle} 200 200)`} style={{ transition: 'transform 1s linear' }}>
        <circle cx="200" cy="110" r="4.5" fill="#FFEAA7" filter="drop-shadow(0 0 5px #FFEAA7)" />
      </g>
      <circle cx="200" cy="200" r="60" fill="none" stroke={activeOrbit === 'seconds' || secondsPulse ? primaryAccent : 'rgba(255, 255, 255, 0.25)'} strokeWidth={activeOrbit === 'seconds' || secondsPulse ? '2' : '1'} style={{ transition: 'all 0.2s ease' }} />
      <g transform={`rotate(${secondsAngle} 200 200)`} style={{ transition: 'transform 0.5s ease-out' }}>
        <circle cx="200" cy="140" r={secondsPulse ? '4.5' : '3.5'} fill="#FFFFFF" filter="drop-shadow(0 0 8px #FFF)" style={{ transition: 'r 0.2s ease' }} />
        <line x1="200" y1="140" x2="200" y2="150" stroke="#FFFFFF" strokeWidth="1" opacity="0.6" />
      </g>
      <circle cx="200" cy="200" r="36" fill="url(#clockCoreGradient)" stroke={primaryAccent} strokeWidth="1.5" filter="drop-shadow(0 0 16px rgba(229, 192, 123, 0.35))" />
      {/* Concentric shockwave ripple on second tick */}
      {secondsPulse && (
        <circle cx="200" cy="200" r="36" fill="none" stroke={primaryAccent} strokeWidth="1.5">
          <animate attributeName="r" from="36" to="58" dur="0.5s" begin="0s" repeatCount="1" fill="freeze" />
          <animate attributeName="opacity" from="0.85" to="0" dur="0.5s" begin="0s" repeatCount="1" fill="freeze" />
        </circle>
      )}
      <defs>
        <radialGradient id="clockCoreGradient" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#252038" />
          <stop offset="100%" stopColor="#0B0D18" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export function CelestialClockScene({
  eventDateStr,
  celebrationTitle,
  celebrationSubtitle = 'The Cosmic Convergence',
  venueName = 'Our Sanctuary',
  venueCity = 'Under The Stars',
  primaryAccent = '#E5C07B',
  speedTier = 'celestial',
  layout,
  motion,
  interactions,
  sceneGraph,
  onAddToCalendar,
}: CelestialClockSceneProps) {
  const [activeOrbit, setActiveOrbit] = useState<'days' | 'hours' | 'minutes' | 'seconds' | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const containerRef = useRef<HTMLElement>(null);

  // Dynamic layout rules (P2-7)
  const composition = layout?.composition || 'centered';
  const paddingTop = layout?.paddingTopRem !== undefined ? `${layout.paddingTopRem}rem` : undefined;
  const paddingBottom = layout?.paddingBottomRem !== undefined ? `${layout.paddingBottomRem}rem` : undefined;
  const contentMaxWidth = layout?.contentMaxWidthPx !== undefined ? `${layout.contentMaxWidthPx}px` : '1100px';

  // Dynamic motion config (P2-8)
  const entryDuration = motion?.entryDuration !== undefined ? `${motion.entryDuration}s` : '0.9s';
  const parallaxDepth = motion?.parallaxDepth !== undefined ? motion.parallaxDepth : 1.0;
  const motionEasing = motion?.easing || 'cubic-bezier(0.16, 1, 0.3, 1)';
  const isReducedStatic = motion?.reducedMotionFallback === 'static' || motion?.reducedMotionFallback === 'instant';

  // Time remaining state
  const [time, setTime] = useState<TimeRemaining>(() => {
    const target = new Date(eventDateStr).getTime() || new Date('2026-12-18T16:00:00').getTime();
    const now = Date.now();
    const diff = Math.max(0, target - now);
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
      totalMs: diff,
    };
  });

  const [secondsPulse, setSecondsPulse] = useState(false);

  useEffect(() => {
    const target = new Date(eventDateStr).getTime() || new Date('2026-12-18T16:00:00').getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, target - now);
      const newSec = Math.floor((diff % (1000 * 60)) / 1000);
      setTime({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: newSec,
        totalMs: diff,
      });
      setSecondsPulse(true);
      setTimeout(() => setSecondsPulse(false), 280);
    }, 1000);
    return () => clearInterval(interval);
  }, [eventDateStr]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsRevealed(true);
        }
      },
      { threshold: 0.1 }
    );
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === 'undefined') return;
    const handleMouseMove = (e: MouseEvent) => {
      if (prefersReducedMotion()) return;
      const normalized = calculateNormalizedPointer(e, container);
      setPointer(normalized);
    };
    container.addEventListener('mousemove', handleMouseMove);
    return () => container.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // PHASE 10: GRAPH-NATIVE RENDERING
  // ─────────────────────────────────────────────────────────────
  if (sceneGraph) {
    const boundGraph = JSON.parse(JSON.stringify(sceneGraph));
    if (boundGraph.nodes['cd_title']) boundGraph.nodes['cd_title'].name = celebrationTitle;
    if (boundGraph.nodes['cd_date_proclamation']) boundGraph.nodes['cd_date_proclamation'].name = `${eventDateStr} • ${venueName || ''}`;

    return (
      <section ref={containerRef} className="w-full relative overflow-hidden bg-[#05070E]" style={{ minHeight: '850px' }}>
        <SceneGraphRenderer
          sceneGraph={boundGraph}
          device="desktop"
          tokens={{
            colors: {
              textPrimary: '#ffffff',
              textSecondary: '#94a3b8',
              accentPrimary: primaryAccent || '#DFBA6B',
              background: '#05070E',
            }
          } as any}
          isEditorMode={false}
        />
      </section>
    );
  }

  const secondsAngle = (time.seconds / 60) * 360;
  const minutesAngle = ((time.minutes + time.seconds / 60) / 60) * 360;
  const hoursAngle = ((time.hours + time.minutes / 60) / 24) * 360;
  const daysAngle = ((time.days % 30) / 30) * 360;

  const TIME_UNITS = [
    { key: 'days' as const, label: 'DAYS', sublabel: 'Planetary Cycles', value: time.days, accent: primaryAccent },
    { key: 'hours' as const, label: 'HOURS', sublabel: 'Solar Revolutions', value: time.hours, accent: '#A8C0FF' },
    { key: 'minutes' as const, label: 'MINUTES', sublabel: 'Lunar Phases', value: time.minutes, accent: '#FFEAA7' },
    { key: 'seconds' as const, label: 'SECONDS', sublabel: 'Starlight Pulses', value: time.seconds, accent: '#FFFFFF' },
  ];

  return (
    <section
      ref={containerRef}
      id="moment-convergence"
      aria-label="Celestial Alignment Countdown"
      data-editor-scene-id="scene_clock"
      data-scene-id="scene_clock"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setPointer({ x: 0, y: 0 });
      }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        paddingTop: paddingTop,
        paddingBottom: paddingBottom,
        background: 'radial-gradient(ellipse 85% 55% at 50% 40%, rgba(16, 22, 45, 0.55) 0%, rgba(6, 8, 15, 0.99) 100%)',
        transition: isReducedStatic ? 'none' : `padding ${entryDuration} ${motionEasing}`,
      }}
    >
      {/* LAYER 01 & 02: Space Backgrounds */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', width: 'min(750px, 95vw)', height: 'min(750px, 95vw)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(229, 192, 123, 0.04) 0%, rgba(20, 26, 55, 0.15) 50%, transparent 70%)', transform: `translate(-50%, -50%) translate3d(${pointer.x * -6}px, ${pointer.y * -6}px, 0)`, transition: isHovered ? 'transform 0.2s ease-out' : 'transform 1s ease-out', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(1px 1px at 50px 70px, #ffffff, rgba(0,0,0,0)), radial-gradient(1.5px 1.5px at 200px 240px, #E5C07B, rgba(0,0,0,0)), radial-gradient(1px 1px at 380px 140px, #ffffff, rgba(0,0,0,0))', backgroundRepeat: 'repeat', backgroundSize: '360px 360px', opacity: 0.3, transform: `translate3d(${pointer.x * 3}px, ${pointer.y * 3}px, 0)`, pointerEvents: 'none' }} />

      {/* ========================================================================= */}
      {/* MOBILE EXPERIENCE (≤ 768px)                                              */}
      {/* Editorial stack, 2x2 grid to save vertical space and avoid collisions.   */}
      {/* ========================================================================= */}
      <div className="clock-exp-mobile">
        <div style={{ padding: 'clamp(28px, 4vh, 44px) 24px clamp(40px, 6vh, 60px)', position: 'relative', zIndex: 2 }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px', opacity: isRevealed ? 1 : 0, transform: isRevealed ? 'translateY(0)' : 'translateY(16px)', transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            {/* Incoming continuity light beam from Constellation */}
            <div
              style={{
                width: '1px',
                height: '24px',
                background: `linear-gradient(180deg, transparent 0%, ${primaryAccent}66 100%)`,
                margin: '0 auto 12px',
                opacity: 0.8,
              }}
            />

            <span style={{ fontSize: '0.6rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: `${primaryAccent}CC`, marginBottom: '10px', display: 'block' }}>
              ✦&ensp;The Alignment&ensp;✦
            </span>
            <h2 style={{ fontFamily: "'Playfair Display', 'Cinzel', serif", fontSize: 'clamp(2rem, 8vw, 2.4rem)', fontWeight: 400, color: '#FFF9F5', margin: '0 0 12px 0', lineHeight: 1.1 }}>
              {celebrationTitle || 'Convergence'}
            </h2>
            <p style={{ fontSize: '0.86rem', color: 'rgba(255, 249, 245, 0.65)', maxWidth: '300px', margin: '0 auto', lineHeight: 1.45 }}>
              Every second brings our orbits closer.
            </p>
          </div>

          {/* Core Visual */}
          <div
            data-editor-node-id="lay_clock_gears"
            data-binding-key="countdown.speedTier"
            style={{ position: 'relative', width: '240px', height: '240px', margin: '0 auto 32px', opacity: isRevealed ? 1 : 0, transform: isRevealed ? 'scale(1)' : 'scale(0.95)', transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.1s' }}
          >
            <AstrolabeGraphic
              activeOrbit={activeOrbit}
              daysAngle={daysAngle}
              hoursAngle={hoursAngle}
              minutesAngle={minutesAngle}
              secondsAngle={secondsAngle}
              secondsPulse={secondsPulse}
              primaryAccent={primaryAccent}
              speedTier={speedTier}
            />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={16} style={{ color: primaryAccent, filter: 'drop-shadow(0 0 6px rgba(229, 192, 123, 0.8))' }} />
            </div>
          </div>

          {/* 2x2 Time Grid (Solves the bottom squash problem) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '340px', margin: '0 auto 32px', opacity: isRevealed ? 1 : 0, transform: isRevealed ? 'translateY(0)' : 'translateY(20px)', transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s' }}>
            {TIME_UNITS.map((unit) => (
              <div key={unit.key} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(229, 192, 123, 0.15)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 400, color: unit.accent, lineHeight: 1, marginBottom: '6px', fontVariantNumeric: 'tabular-nums' }}>
                  {String(unit.value).padStart(2, '0')}
                </span>
                <span style={{ fontSize: '0.65rem', letterSpacing: '0.18em', color: 'rgba(229, 192, 123, 0.8)', textTransform: 'uppercase' }}>
                  {unit.label}
                </span>
              </div>
            ))}
          </div>

          {/* Calendar Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', opacity: isRevealed ? 1 : 0, transform: isRevealed ? 'translateY(0)' : 'translateY(20px)', transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.3s' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#FFF9F5', fontSize: '0.8rem' }}>
              <Calendar size={14} style={{ color: primaryAccent }} />
              <span>{eventDateStr}</span>
              <span style={{ color: 'rgba(255, 255, 255, 0.25)' }}>•</span>
              <span style={{ color: 'rgba(255, 249, 245, 0.7)' }}>{venueCity}</span>
            </div>
            <button type="button" onClick={onAddToCalendar} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '9999px', background: `linear-gradient(135deg, ${primaryAccent}26 0%, ${primaryAccent}4D 100%)`, border: `1px solid ${primaryAccent}66`, color: primaryAccent, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
              <Download size={14} />
              <span>Add to Calendar</span>
            </button>
          </div>

          {/* Transition Bridge to Gathering (Mobile) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: 'clamp(28px, 5vh, 40px)', opacity: isRevealed ? 1 : 0, transition: 'opacity 1.2s ease 0.5s' }}>
            <div className="celestial-photon-stream" style={{ width: '1px', height: '32px', background: `linear-gradient(180deg, ${primaryAccent}66 0%, ${primaryAccent} 100%)` }} />
            <div style={{ position: 'relative', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '6px 0' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FFF9F5', boxShadow: `0 0 12px ${primaryAccent}, 0 0 4px #FFF`, animation: 'celestialBeaconBreathe 3s ease-in-out infinite' }} />
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1px solid ${primaryAccent}55`, animation: 'celestialBeaconRingPulse 3s cubic-bezier(0.16, 1, 0.3, 1) infinite', pointerEvents: 'none' }} />
            </div>
            <span style={{ fontSize: '0.54rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: `${primaryAccent}CC`, fontWeight: 500 }}>
              ENTERING SANCTUARY &amp; GATHERING
            </span>
            <div style={{ width: '1px', height: '24px', background: `linear-gradient(180deg, ${primaryAccent} 0%, transparent 100%)`, marginTop: '6px' }} />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP EXPERIENCE (> 768px)                                              */}
      {/* Preserves the large interactive astrolabe and horizontal pedestal dock.    */}
      {/* ========================================================================= */}
      <div className="clock-exp-desktop">
        <div style={{ maxWidth: contentMaxWidth, margin: '0 auto', padding: 'clamp(36px, 5vh, 56px) clamp(20px, 3vw, 40px) clamp(50px, 7vh, 70px)', position: 'relative', zIndex: 2 }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 'clamp(24px, 4vh, 36px)', opacity: isRevealed ? 1 : 0, transform: isRevealed ? 'translateY(0)' : 'translateY(24px)', transition: isReducedStatic ? 'none' : `all ${entryDuration} ${motionEasing}` }}>
            {/* Incoming continuity light beam from Constellation (Desktop) */}
            <div
              style={{
                width: '1px',
                height: '24px',
                background: `linear-gradient(180deg, transparent 0%, ${primaryAccent}66 100%)`,
                margin: '0 auto 12px',
                opacity: 0.8,
              }}
            />
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 14px', borderRadius: '9999px', background: 'rgba(229, 192, 123, 0.06)', border: `1px solid ${primaryAccent}26`, color: primaryAccent, fontSize: '0.7rem', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: '10px' }}>
              <Compass size={12} /><span>Astronomical Timekeeper</span>
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', 'Cinzel', serif", fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', fontWeight: 400, letterSpacing: '0.02em', color: '#FFF9F5', margin: '0 0 6px 0', lineHeight: 1.15 }}>
              Celestial Alignment Countdown
            </h2>
            <p style={{ fontSize: 'clamp(0.85rem, 1.2vw, 0.95rem)', color: 'rgba(255, 249, 245, 0.65)', maxWidth: '580px', margin: '0 auto', lineHeight: 1.45 }}>
              Every second brings our orbits closer to convergence. Tap the celestial rings to explore each dimension of time.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: composition === 'split' ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: composition === 'split' ? 'clamp(36px, 5vw, 64px)' : 'clamp(32px, 4vh, 48px)' }}>
            {/* Interactive Astrolabe */}
            <div
              data-editor-node-id="lay_clock_gears"
              data-binding-key="countdown.speedTier"
              style={{ position: 'relative', width: 'min(340px, 40vw)', height: 'min(340px, 40vw)', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: isReducedStatic ? 'none' : `perspective(1000px) rotateX(${pointer.y * -3 * parallaxDepth}deg) rotateY(${pointer.x * 3 * parallaxDepth}deg)`, transition: isHovered ? 'transform 0.18s ease-out' : `transform ${entryDuration} ${motionEasing}` }}
            >
              <AstrolabeGraphic
                activeOrbit={activeOrbit}
                daysAngle={daysAngle}
                hoursAngle={hoursAngle}
                minutesAngle={minutesAngle}
                secondsAngle={secondsAngle}
                secondsPulse={secondsPulse}
                primaryAccent={primaryAccent}
                speedTier={speedTier}
              />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={20} style={{ color: primaryAccent, filter: 'drop-shadow(0 0 6px rgba(229, 192, 123, 0.8))' }} />
                <span style={{ fontSize: '0.62rem', fontFamily: "'Playfair Display', serif", letterSpacing: '0.15em', color: primaryAccent, marginTop: '2px' }}>ORBIT</span>
              </div>
            </div>

            {/* Interactive Numerical Pedestals */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))', gap: 'clamp(16px, 2vw, 24px)', width: '100%', maxWidth: '800px' }}>
              {TIME_UNITS.map((unit) => {
                const isSelected = activeOrbit === unit.key;
                return (
                  <button
                    key={unit.key}
                    type="button"
                    onClick={() => setActiveOrbit(isSelected ? null : unit.key)}
                    onMouseEnter={() => setActiveOrbit(unit.key)}
                    onMouseLeave={() => setActiveOrbit(null)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      padding: 'clamp(16px, 2vw, 24px) clamp(12px, 1.5vw, 16px)', borderRadius: '20px',
                      background: isSelected ? 'linear-gradient(180deg, rgba(229, 192, 123, 0.16) 0%, rgba(18, 22, 40, 0.9) 100%)' : 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(8, 10, 18, 0.8) 100%)',
                      border: isSelected ? `1.5px solid ${unit.accent}` : '1px solid rgba(229, 192, 123, 0.18)',
                      boxShadow: isSelected ? `0 12px 28px -4px ${unit.accent}44, inset 0 0 14px ${unit.accent}22` : '0 8px 24px rgba(0, 0, 0, 0.5)',
                      cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                      transform: isSelected ? 'translateY(-4px)' : 'translateY(0)', outline: 'none',
                    }}
                  >
                    <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2rem, 3vw, 2.8rem)', fontWeight: 400, color: isSelected ? unit.accent : '#FFF9F5', lineHeight: 1, marginBottom: '6px', textShadow: isSelected ? `0 0 16px ${unit.accent}` : 'none', fontVariantNumeric: 'tabular-nums' }}>
                      {String(unit.value).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: '0.72rem', letterSpacing: '0.2em', fontWeight: 600, color: isSelected ? unit.accent : 'rgba(229, 192, 123, 0.85)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      {unit.label}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '0.04em' }}>
                      {unit.sublabel}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Calendar Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '12px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '9999px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(229, 192, 123, 0.2)', color: '#FFF9F5', fontSize: '0.9rem' }}>
                <Calendar size={16} style={{ color: primaryAccent }} />
                <span>{eventDateStr}</span>
                <span style={{ color: 'rgba(255, 255, 255, 0.25)' }}>•</span>
                <span style={{ color: 'rgba(255, 249, 245, 0.7)' }}>{venueCity}</span>
              </div>
              <button type="button" onClick={onAddToCalendar} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: '9999px', background: `linear-gradient(135deg, ${primaryAccent}26 0%, ${primaryAccent}4D 100%)`, border: `1px solid ${primaryAccent}66`, color: primaryAccent, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' }}>
                <Download size={16} />
                <span>+ Add to Calendar (.ics)</span>
              </button>
            </div>
          </div>

          {/* Transition Bridge to Gathering */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: 'clamp(32px, 6vw, 60px)', opacity: isRevealed ? 1 : 0, transition: 'opacity 1.2s ease 0.6s' }}>
            <div className="celestial-photon-stream" style={{ width: '1px', height: '36px', background: `linear-gradient(180deg, ${primaryAccent}66 0%, ${primaryAccent} 100%)` }} />
            <div style={{ position: 'relative', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '6px 0' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FFF9F5', boxShadow: `0 0 12px ${primaryAccent}, 0 0 4px #FFF`, animation: 'celestialBeaconBreathe 3s ease-in-out infinite' }} />
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1px solid ${primaryAccent}55`, animation: 'celestialBeaconRingPulse 3s cubic-bezier(0.16, 1, 0.3, 1) infinite', pointerEvents: 'none' }} />
            </div>
            <span style={{ fontSize: '0.54rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: `${primaryAccent}CC`, fontWeight: 500 }}>
              ENTERING SANCTUARY &amp; GATHERING
            </span>
            <div style={{ width: '1px', height: '24px', background: `linear-gradient(180deg, ${primaryAccent} 0%, transparent 100%)`, marginTop: '6px' }} />
          </div>
        </div>
      </div>

      <style jsx>{`
        .clock-exp-mobile { display: none; }
        .clock-exp-desktop { display: block; }

        @media (max-width: 768px) {
          .clock-exp-mobile { display: block; }
          .clock-exp-desktop { display: none !important; }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            transition-duration: 0.2s !important;
          }
        }
      `}</style>
    </section>
  );
}
