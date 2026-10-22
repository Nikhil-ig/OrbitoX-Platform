'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Sun, Moon, Orbit, ChevronDown } from 'lucide-react';
import {
  prefersReducedMotion,
  calculateNormalizedPointer,
} from '@/lib/motion-system';

import { SceneLayoutConfig, SceneMotionConfig, SceneInteractionConfig } from '@/components/studio/StudioData';

// Phase 12 Graph Renderer Imports
import { SceneGraphRenderer } from '../../../SceneGraphRenderer';
import { CelestialSoulsGraph } from '../../../../template-studio/engine/CelestialSoulsGraph';
import type { SceneGraph } from '../../../../template-studio/engine/SceneGraphTypes';

// ─────────────────────────────────────────────────────────────
// INTERFACE
// ─────────────────────────────────────────────────────────────
interface CelestialSoulsSceneProps {
  partner1Name?: string;
  partner1Role?: string;
  partner1Bio?: string;
  partner1Image?: string;
  partner1Vow?: string;
  partner1Shape?: 'circle' | 'rounded' | 'editorial' | 'arch' | 'polaroid' | 'mask';
  partner1FocalPoint?: { x: number; y: number };
  partner1CropBehavior?: 'fit' | 'fill' | 'editorial_zoom';
  partner2Name?: string;
  partner2Role?: string;
  partner2Bio?: string;
  partner2Image?: string;
  partner2Vow?: string;
  partner2Shape?: 'circle' | 'rounded' | 'editorial' | 'arch' | 'polaroid' | 'mask';
  partner2FocalPoint?: { x: number; y: number };
  partner2CropBehavior?: 'fit' | 'fill' | 'editorial_zoom';
  unionDeclaration?: string;
  primaryAccent?: string;
  layout?: SceneLayoutConfig;
  motion?: SceneMotionConfig;
  interactions?: SceneInteractionConfig[];
  sceneGraph?: SceneGraph;
}

const getPortraitRadius = (shape?: string): string => {
  switch (shape) {
    case 'circle':
      return '50%';
    case 'rounded':
      return '24px';
    case 'arch':
      return '999px 999px 8px 8px';
    case 'polaroid':
      return '4px';
    case 'editorial':
    default:
      return '14px';
  }
};

export function CelestialSoulsScene({
  partner1Name = 'Aarav Sharma',
  partner1Role = 'The Groom',
  partner1Bio = 'An architect with a passion for heritage structures, quiet contemplation, and slow mornings.',
  partner1Image = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=85',
  partner1Vow,
  partner1Shape = 'editorial',
  partner1FocalPoint = { x: 50, y: 35 },
  partner1CropBehavior = 'editorial_zoom',
  partner2Name = 'Meera Patel',
  partner2Role = 'The Bride',
  partner2Bio = 'A wildlife photographer captivated by mountain mist, enduring literature, and storytelling.',
  partner2Image = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=85',
  partner2Vow,
  partner2Shape = 'editorial',
  partner2FocalPoint = { x: 50, y: 35 },
  partner2CropBehavior = 'editorial_zoom',
  unionDeclaration: customUnionDeclaration,
  primaryAccent = '#E5C07B',
  layout,
  motion,
  interactions,
  sceneGraph,
}: CelestialSoulsSceneProps) {
  // ─── Shared State ───
  const [isRevealed, setIsRevealed] = useState(false);
  const containerRef = useRef<HTMLElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // ─── Mobile-Specific State ───
  const [focusedSoul, setFocusedSoul] = useState<'none' | 'p1' | 'p2'>('none');
  const [rippleSoul, setRippleSoul] = useState<'p1' | 'p2' | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [covenantVisible, setCovenantVisible] = useState(false);
  const [vowsVisible, setVowsVisible] = useState(false);
  const [expandedVow, setExpandedVow] = useState<'none' | 'p1' | 'p2'>('none');
  const covenantRef = useRef<HTMLDivElement>(null);
  const vowsRef = useRef<HTMLDivElement>(null);

  // ─── Desktop-Specific State ───
  const [activeTab, setActiveTab] = useState<'union' | 'p1' | 'p2'>('union');
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // ─── Data ───
  const p1First = partner1Name.split(' ')[0] || partner1Name;
  const p2First = partner2Name.split(' ')[0] || partner2Name;
  const p1Vow =
    partner1Vow ||
    '\u201CIn you, I discovered the steadfast constellation that guides every horizon I will ever seek.\u201D';
  const p2Vow =
    partner2Vow ||
    '\u201CBeside you, silence feels like music and the future feels like returning home.\u201D';
  const unionDeclaration =
    customUnionDeclaration ||
    'Two independent trajectories drawn across infinite space by gravitational destiny \u2014 merging into one eternal, harmonic constellation.';

  // ─────────────────────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────────────────────

  // Section entrance
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) setIsRevealed(true); },
      { threshold: 0.06 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Mobile: scroll-linked portrait convergence
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const el = containerRef.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          const vh = window.innerHeight;
          const raw = (vh - rect.top) / (vh * 1.1);
          setScrollProgress(Math.max(0, Math.min(1, raw)));
        }
        ticking = false;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Mobile: progressive disclosure observers
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === covenantRef.current && entry.isIntersecting) setCovenantVisible(true);
          if (entry.target === vowsRef.current && entry.isIntersecting) setVowsVisible(true);
        });
      },
      { threshold: 0.25 }
    );
    if (covenantRef.current) observer.observe(covenantRef.current);
    if (vowsRef.current) observer.observe(vowsRef.current);
    return () => observer.disconnect();
  }, []);

  // Desktop: pointer parallax
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === 'undefined') return;
    const handleMouseMove = (e: MouseEvent) => {
      if (prefersReducedMotion()) return;
      setPointer(calculateNormalizedPointer(e, container));
    };
    container.addEventListener('mousemove', handleMouseMove);
    return () => container.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // AUDIO
  // ─────────────────────────────────────────────────────────────
  const playChime = useCallback((type: 'union' | 'p1' | 'p2') => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      const freqs = type === 'union' ? [528, 660, 792] : type === 'p1' ? [440, 554.37] : [493.88, 587.33];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.04);
        gain.gain.setValueAtTime(0.0001, now + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.016, now + i * 0.04 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.00001, now + i * 0.04 + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.04);
        osc.stop(now + i * 0.04 + 0.9);
      });
    } catch { /* silent */ }
  }, []);

  // ─────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handlePortraitTouch = useCallback((soul: 'p1' | 'p2') => {
    const targetLayer = soul === 'p1' ? 'lay_souls_p1' : 'lay_souls_p2';
    const matchingInt = interactions?.find((i) => i.targetElementId === targetLayer);
    if (matchingInt && (matchingInt.action === 'reveal_content' || matchingInt.action === 'expand_modal')) {
      setExpandedVow((prev) => prev === soul ? 'none' : soul);
    } else {
      setFocusedSoul((prev) => prev === soul ? 'none' : soul);
    }
    setRippleSoul(soul);
    setTimeout(() => setRippleSoul(null), 700);
    playChime(soul);
  }, [playChime, interactions]);

  const handleVowToggle = useCallback((soul: 'p1' | 'p2') => {
    setExpandedVow((prev) => prev === soul ? 'none' : soul);
  }, []);

  const handleTabChange = useCallback((tab: 'union' | 'p1' | 'p2') => {
    setActiveTab(tab);
    playChime(tab);
  }, [playChime]);

  // ─── Computed ───
  const reducedMotion = typeof window !== 'undefined' && prefersReducedMotion();

  // Dynamic layout rules (P2-7)
  const composition = layout?.composition || 'split';
  const paddingTop = layout?.paddingTopRem !== undefined ? `${layout.paddingTopRem}rem` : undefined;
  const paddingBottom = layout?.paddingBottomRem !== undefined ? `${layout.paddingBottomRem}rem` : undefined;
  const contentMaxWidth = layout?.contentMaxWidthPx !== undefined ? `${layout.contentMaxWidthPx}px` : undefined;

  // Dynamic motion config (P2-8)
  const entryDuration = motion?.entryDuration !== undefined ? `${motion.entryDuration}s` : '0.8s';
  const staggerDelay = motion?.staggerDelay !== undefined ? `${motion.staggerDelay}s` : '0.2s';
  const parallaxDepth = motion?.parallaxDepth !== undefined ? motion.parallaxDepth : 1.0;
  const motionEasing = motion?.easing || 'cubic-bezier(0.16, 1, 0.3, 1)';
  const isReducedStatic = motion?.reducedMotionFallback === 'static' || motion?.reducedMotionFallback === 'instant' || reducedMotion;

  const portraitGap = reducedMotion ? -24 : Math.round(28 - scrollProgress * 52);

  // ─────────────────────────────────────────────────────────────
  // PHASE 12: GRAPH-NATIVE RENDERING
  // ─────────────────────────────────────────────────────────────
  const USE_GRAPH_RENDERER = true;

  if (USE_GRAPH_RENDERER) {
    const sourceGraph = sceneGraph || CelestialSoulsGraph;
    const boundGraph = JSON.parse(JSON.stringify(sourceGraph));
    
    if (boundGraph.nodes['name_a']) boundGraph.nodes['name_a'].name = p1First;
    if (boundGraph.nodes['name_b']) boundGraph.nodes['name_b'].name = p2First;
    if (boundGraph.nodes['vow_a']) boundGraph.nodes['vow_a'].name = p1Vow;
    if (boundGraph.nodes['vow_b']) boundGraph.nodes['vow_b'].name = p2Vow;
    if (boundGraph.nodes['union_dec']) boundGraph.nodes['union_dec'].name = unionDeclaration;
    
    if (boundGraph.nodes['portrait_a']) {
      boundGraph.nodes['portrait_a'].style.background = {
        type: 'image',
        image: partner1Image,
        size: partner1CropBehavior === 'fill' ? 'cover' : 'contain',
        position: partner1FocalPoint ? `${partner1FocalPoint.x}% ${partner1FocalPoint.y}%` : 'center',
      };
      if (partner1Shape && boundGraph.nodes['portrait_a'].style.border) {
        boundGraph.nodes['portrait_a'].style.border.radius = getPortraitRadius(partner1Shape);
      }
    }
    
    if (boundGraph.nodes['portrait_b']) {
      boundGraph.nodes['portrait_b'].style.background = {
        type: 'image',
        image: partner2Image,
        size: partner2CropBehavior === 'fill' ? 'cover' : 'contain',
        position: partner2FocalPoint ? `${partner2FocalPoint.x}% ${partner2FocalPoint.y}%` : 'center',
      };
      if (partner2Shape && boundGraph.nodes['portrait_b'].style.border) {
        boundGraph.nodes['portrait_b'].style.border.radius = getPortraitRadius(partner2Shape);
      }
    }

    return (
      <section ref={containerRef} className="w-full relative overflow-hidden bg-slate-900" style={{ minHeight: '100vh' }}>
        <SceneGraphRenderer
          sceneGraph={boundGraph}
          device="desktop"
          tokens={{
             colors: {
               textPrimary: '#ffffff',
               textSecondary: '#94a3b8',
               accentPrimary: primaryAccent || '#a78bfa',
               background: '#0f172a'
             }
          } as any}
          isEditorMode={false}
        />
      </section>
    );
  }

  return (
    <section
      ref={containerRef}
      id="moment-souls"
      aria-label="The Souls & Their Celestial Union"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setPointer({ x: 0, y: 0 }); }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        paddingTop: paddingTop,
        paddingBottom: paddingBottom,
        background: 'radial-gradient(ellipse 90% 60% at 50% 45%, rgba(14, 20, 42, 0.7) 0%, #06080F 85%)',
        transition: isReducedStatic ? 'none' : `padding ${entryDuration} ${motionEasing}`,
      }}
    >
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SHARED: ATMOSPHERIC LAYERS (lightweight, GPU-composited)   */}
      {/* ═══════════════════════════════════════════════════════════ */}

      {/* Ambient Nebula Glow — responds to focused soul on mobile */}
      <div
        style={{
          position: 'absolute',
          top: '38%',
          left: '50%',
          transform: isReducedStatic
            ? 'translate(-50%, -50%)'
            : `translate(-50%, -50%) translate3d(${pointer.x * 10 * parallaxDepth}px, ${pointer.y * 8 * parallaxDepth}px, 0)`,
          width: 'min(800px, 120vw)',
          height: 'min(800px, 120vw)',
          borderRadius: '50%',
          background:
            focusedSoul === 'p1' || activeTab === 'p1'
              ? `radial-gradient(circle, ${primaryAccent}1A 0%, transparent 60%)`
              : focusedSoul === 'p2' || activeTab === 'p2'
                ? 'radial-gradient(circle, rgba(136, 192, 208, 0.12) 0%, transparent 60%)'
                : `radial-gradient(circle, ${primaryAccent}12 0%, rgba(30, 42, 90, 0.15) 40%, transparent 65%)`,
          transition: 'background 1s ease',
          pointerEvents: 'none',
          willChange: 'transform',
        }}
      />

      {/* Starfield (CSS-only, no GPU cost) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(1px 1px at 42px 78px, rgba(255,255,255,0.7), transparent), radial-gradient(1.5px 1.5px at 188px 235px, rgba(229, 192, 123, 0.6), transparent), radial-gradient(1px 1px at 315px 138px, rgba(136, 192, 208, 0.5), transparent), radial-gradient(0.8px 0.8px at 92px 310px, rgba(255,255,255,0.4), transparent)',
          backgroundSize: '350px 400px',
          opacity: 0.45,
          pointerEvents: 'none',
        }}
      />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MOBILE EXPERIENCE (≤ 640px)                                */}
      {/* Art-directed editorial continuity, zero dead space.         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div
        className="souls-exp-mobile"
        style={{
          width: '100%',
          position: 'relative',
          zIndex: 2,
          padding: '16px 20px clamp(40px, 6vh, 56px)',
        }}
      >
        {/* ─── ACT 1: THE PORTRAIT MOMENT (Self-contained in first viewport) ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%' }}>
          {/* Subtle scene entry filament from previous section */}
          <div
            style={{
              width: '1px',
              height: '18px',
              background: `linear-gradient(180deg, transparent 0%, ${primaryAccent}55 100%)`,
              marginBottom: '10px',
              opacity: isRevealed ? 1 : 0,
              transition: 'opacity 0.8s ease',
            }}
          />

          {/* Quiet Chapter Cue */}
          <span
            style={{
              fontSize: '0.56rem',
              letterSpacing: '0.26em',
              textTransform: 'uppercase',
              color: `${primaryAccent}CC`,
              fontWeight: 500,
              marginBottom: '12px',
              opacity: isRevealed ? 1 : 0,
              transform: isRevealed ? 'none' : 'translateY(8px)',
              transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
            }}
          >
            CHAPTER II &ensp;·&ensp; THE UNION
          </span>

          {/* Couple Names — Restrained display serif, unified pairing */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'center',
              gap: '10px',
              marginBottom: '18px',
              opacity: isRevealed ? 1 : 0,
              transform: isRevealed ? 'none' : 'translateY(12px)',
              transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.15s',
            }}
          >
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 'clamp(1.85rem, 7vw, 2.25rem)',
                fontWeight: 400,
                color: '#FFF9F5',
                lineHeight: 1,
                margin: 0,
                letterSpacing: '0.01em',
              }}
            >
              {p1First}
            </h2>
            <span
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '1.25rem',
                fontStyle: 'italic',
                color: primaryAccent,
                lineHeight: 1,
                opacity: 0.85,
              }}
            >
              &amp;
            </span>
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 'clamp(1.85rem, 7vw, 2.25rem)',
                fontWeight: 400,
                color: '#FFF9F5',
                lineHeight: 1,
                margin: 0,
                letterSpacing: '0.01em',
              }}
            >
              {p2First}
            </h2>
          </div>

          {/* Interlocking Portrait Composition with shared orbital glow */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isRevealed ? 1 : 0,
              transform: isRevealed ? 'none' : 'translateY(14px) scale(0.97)',
              transition: 'all 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.25s',
            }}
          >
            {/* Shared atmospheric halo behind portraits */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'calc(100% + 28px)',
                height: 'calc(100% + 28px)',
                borderRadius: '50%',
                background: `radial-gradient(ellipse 90% 70% at 50% 50%, ${primaryAccent}18 0%, rgba(136, 192, 208, 0.1) 45%, transparent 70%)`,
                filter: 'blur(16px)',
                pointerEvents: 'none',
              }}
            />

            {/* Aarav Portrait (Slightly elevated, warm gold rim) */}
            <div
              onClick={() => handlePortraitTouch('p1')}
              role="button"
              tabIndex={0}
              aria-label={`Focus on ${partner1Name}`}
              style={{
                position: 'relative',
                cursor: 'pointer',
                zIndex: focusedSoul === 'p1' ? 4 : 2,
                transform: focusedSoul === 'p1' ? 'translateY(-4px) scale(1.06)' : focusedSoul === 'p2' ? 'translateY(-4px) scale(0.95)' : 'translateY(-4px) scale(1)',
                opacity: focusedSoul === 'p2' ? 0.72 : 1,
                transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {rippleSoul === 'p1' && (
                <div
                  style={{
                    position: 'absolute',
                    inset: '0',
                    borderRadius: '50%',
                    border: `2px solid ${primaryAccent}`,
                    animation: 'celestialTouchRipple 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                    pointerEvents: 'none',
                  }}
                />
              )}
              <div
                data-editor-node-id="lay_souls_p1"
                data-editor-scene-id="scene_souls"
                data-editor-kind="portrait"
                data-layer-id="lay_souls_p1"
                data-scene-id="scene_souls"
                data-binding-key="celebrants[0].portrait"
                style={{
                  width: 'clamp(128px, 36vw, 150px)',
                  height: 'clamp(128px, 36vw, 150px)',
                  borderRadius: getPortraitRadius(partner1Shape),
                  padding: partner1Shape === 'polaroid' ? '5px 5px 18px 5px' : '2.5px',
                  background: partner1Shape === 'polaroid' ? '#FFFFFF' : `linear-gradient(135deg, ${primaryAccent} 0%, rgba(229, 192, 123, 0.3) 100%)`,
                  boxShadow: focusedSoul === 'p1' ? `0 0 32px ${primaryAccent}99, 0 10px 28px rgba(0,0,0,0.6)` : `0 6px 22px rgba(0,0,0,0.55), 0 0 16px ${primaryAccent}26`,
                  transition: 'all 0.45s ease',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={partner1Image}
                  alt={partner1Name}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: partner1Shape === 'polaroid' ? '2px' : getPortraitRadius(partner1Shape),
                    objectFit: partner1CropBehavior === 'fit' ? 'contain' : 'cover',
                    objectPosition: `${partner1FocalPoint.x}% ${partner1FocalPoint.y}%`,
                    transform: partner1CropBehavior === 'editorial_zoom' ? 'scale(1.08)' : 'none',
                    display: 'block',
                    transition: 'all 0.4s ease',
                  }}
                />
              </div>
            </div>

            {/* Meera Portrait (Slightly offset, cool starlight blue rim, overlapping) */}
            <div
              onClick={() => handlePortraitTouch('p2')}
              role="button"
              tabIndex={0}
              aria-label={`Focus on ${partner2Name}`}
              style={{
                position: 'relative',
                cursor: 'pointer',
                zIndex: focusedSoul === 'p2' ? 4 : 3,
                marginLeft: '-22px',
                transform: focusedSoul === 'p2' ? 'translateY(4px) scale(1.06)' : focusedSoul === 'p1' ? 'translateY(4px) scale(0.95)' : 'translateY(4px) scale(1)',
                opacity: focusedSoul === 'p1' ? 0.72 : 1,
                transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {rippleSoul === 'p2' && (
                <div
                  style={{
                    position: 'absolute',
                    inset: '0',
                    borderRadius: '50%',
                    border: '2px solid #88C0D0',
                    animation: 'celestialTouchRipple 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                    pointerEvents: 'none',
                  }}
                />
              )}
              <div
                data-editor-node-id="lay_souls_p2"
                data-editor-scene-id="scene_souls"
                data-editor-kind="portrait"
                data-layer-id="lay_souls_p2"
                data-scene-id="scene_souls"
                data-binding-key="celebrants[1].portrait"
                style={{
                  width: 'clamp(122px, 34vw, 142px)',
                  height: 'clamp(122px, 34vw, 142px)',
                  borderRadius: getPortraitRadius(partner2Shape),
                  padding: partner2Shape === 'polaroid' ? '5px 5px 18px 5px' : '2.5px',
                  background: partner2Shape === 'polaroid' ? '#FFFFFF' : 'linear-gradient(135deg, #88C0D0 0%, rgba(136, 192, 208, 0.3) 100%)',
                  boxShadow: focusedSoul === 'p2' ? '0 0 32px rgba(136, 192, 208, 0.7), 0 10px 28px rgba(0,0,0,0.6)' : '0 6px 22px rgba(0,0,0,0.55), 0 0 16px rgba(136, 192, 208, 0.25)',
                  transition: 'all 0.45s ease',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={partner2Image}
                  alt={partner2Name}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: partner2Shape === 'polaroid' ? '2px' : getPortraitRadius(partner2Shape),
                    objectFit: partner2CropBehavior === 'fit' ? 'contain' : 'cover',
                    objectPosition: `${partner2FocalPoint.x}% ${partner2FocalPoint.y}%`,
                    transform: partner2CropBehavior === 'editorial_zoom' ? 'scale(1.08)' : 'none',
                    display: 'block',
                    transition: 'all 0.4s ease',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Emotional Statement — Natural intimate connector */}
          <p
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontStyle: 'italic',
              fontSize: '0.82rem',
              color: 'rgba(255, 249, 245, 0.75)',
              letterSpacing: '0.02em',
              lineHeight: 1.4,
              margin: '16px 0 0',
              opacity: isRevealed ? 1 : 0,
              transform: isRevealed ? 'none' : 'translateY(8px)',
              transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.35s',
            }}
          >
            Bound by gravitational harmony
          </p>

          {/* Continuation Indicator (Completes first viewport) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginTop: '16px',
              gap: '6px',
              opacity: isRevealed ? 0.65 : 0,
              transition: 'opacity 1s ease 0.45s',
            }}
          >
            <div
              style={{
                width: '1px',
                height: '20px',
                background: `linear-gradient(180deg, ${primaryAccent}66 0%, transparent 100%)`,
              }}
            />
            <span
              style={{
                fontSize: '0.52rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: `${primaryAccent}B3`,
              }}
            >
              Scroll to explore
            </span>
          </div>
        </div>

        {/* ─── ACT 2: THE COVENANT & THE VOWS (Rhythmic story discovery) ─── */}
        <div
          ref={covenantRef}
          style={{
            width: '100%',
            maxWidth: '340px',
            margin: '48px auto 0',
            textAlign: 'center',
            opacity: isRevealed ? 1 : 0,
            transform: isRevealed ? 'none' : 'translateY(14px)',
            transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.4s',
          }}
        >
          {/* Subtle editorial framing lines */}
          <div
            style={{
              width: '28px',
              height: '1px',
              background: `linear-gradient(90deg, transparent, ${primaryAccent}55, transparent)`,
              margin: '0 auto 16px',
            }}
          />

          <p
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontStyle: 'italic',
              fontSize: 'clamp(0.94rem, 3.8vw, 1.06rem)',
              color: 'rgba(255, 249, 245, 0.95)',
              lineHeight: 1.65,
              margin: '0 0 16px',
            }}
          >
            &ldquo;{unionDeclaration}&rdquo;
          </p>

          <div
            style={{
              width: '28px',
              height: '1px',
              background: `linear-gradient(90deg, transparent, ${primaryAccent}55, transparent)`,
              margin: '0 auto',
            }}
          />
        </div>

        {/* Dual Vows Editorial Flow */}
        <div
          ref={vowsRef}
          style={{
            width: '100%',
            maxWidth: '320px',
            margin: '36px auto 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '22px',
            textAlign: 'center',
            opacity: isRevealed ? 1 : 0,
            transform: isRevealed ? 'none' : 'translateY(14px)',
            transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.5s',
          }}
        >
          {/* Aarav Vow */}
          <div
            onClick={() => handleVowToggle('p1')}
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer', WebkitTapHighlightColor: 'transparent', outline: 'none' }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Sun size={11} style={{ color: primaryAccent }} />
              <span style={{ fontSize: '0.58rem', letterSpacing: '0.22em', color: primaryAccent, fontWeight: 600, textTransform: 'uppercase' }}>
                {partner1Name}
              </span>
            </div>

            <p style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontStyle: 'italic',
              fontSize: '0.88rem',
              color: 'rgba(255, 249, 245, 0.92)',
              lineHeight: 1.55,
              margin: 0,
            }}>
              {p1Vow}
            </p>

            <div style={{ maxHeight: expandedVow === 'p1' ? '120px' : '0', overflow: 'hidden', opacity: expandedVow === 'p1' ? 1 : 0, transition: 'all 0.4s ease' }}>
              <p style={{ fontSize: '0.74rem', color: 'rgba(255, 249, 245, 0.65)', lineHeight: 1.45, margin: '12px auto 0', maxWidth: '280px' }}>
                {partner1Bio}
              </p>
            </div>
          </div>

          {/* Celestial Divider Glyph */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', opacity: 0.4 }}>
            <span style={{ width: '20px', height: '1px', background: `linear-gradient(90deg, transparent, ${primaryAccent})` }} />
            <span style={{ fontSize: '0.62rem', color: primaryAccent }}>✦</span>
            <span style={{ width: '20px', height: '1px', background: `linear-gradient(90deg, ${primaryAccent}, transparent)` }} />
          </div>

          {/* Meera Vow */}
          <div
            onClick={() => handleVowToggle('p2')}
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer', WebkitTapHighlightColor: 'transparent', outline: 'none' }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Moon size={11} style={{ color: '#88C0D0' }} />
              <span style={{ fontSize: '0.58rem', letterSpacing: '0.22em', color: '#88C0D0', fontWeight: 600, textTransform: 'uppercase' }}>
                {partner2Name}
              </span>
            </div>

            <p style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontStyle: 'italic',
              fontSize: '0.88rem',
              color: 'rgba(255, 249, 245, 0.92)',
              lineHeight: 1.55,
              margin: 0,
            }}>
              {p2Vow}
            </p>

            <div style={{ maxHeight: expandedVow === 'p2' ? '120px' : '0', overflow: 'hidden', opacity: expandedVow === 'p2' ? 1 : 0, transition: 'all 0.4s ease' }}>
              <p style={{ fontSize: '0.74rem', color: 'rgba(255, 249, 245, 0.65)', lineHeight: 1.45, margin: '12px auto 0', maxWidth: '280px' }}>
                {partner2Bio}
              </p>
            </div>
          </div>
        </div>

        {/* ─── ACT 3: SCENE EXIT / VISUAL BRIDGE INTO CONSTELLATION ─── */}
        <div
          style={{
            marginTop: '44px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            opacity: isRevealed ? 1 : 0,
            transition: 'opacity 1s ease 0.5s',
          }}
        >
          {/* Vertical light thread carrying the union's trajectory with Traveling Photon */}
          <div
            className="celestial-photon-stream"
            style={{
              width: '1px',
              height: '36px',
              background: `linear-gradient(180deg, ${primaryAccent}26 0%, ${primaryAccent} 100%)`,
              boxShadow: `0 0 10px ${primaryAccent}55`,
            }}
          />

          {/* Activating star beacon with concentric ripple */}
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
              fontSize: '0.54rem',
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: `${primaryAccent}CC`,
              fontWeight: 500,
              marginTop: '4px',
            }}
          >
            INTO THE CONSTELLATION
          </span>

          <div
            style={{
              width: '1px',
              height: '24px',
              background: `linear-gradient(180deg, ${primaryAccent} 0%, transparent 100%)`,
              marginTop: '6px',
            }}
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TABLET EXPERIENCE (641px – 1024px)                         */}
      {/* Balanced editorial wings, touch-friendly.                  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="souls-exp-tablet">
        <div
          style={{
            maxWidth: '920px',
            margin: '0 auto',
            padding: 'clamp(28px, 4vh, 44px) 32px clamp(48px, 6vh, 64px)',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* Header */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: 'clamp(24px, 4vh, 36px)',
              opacity: isRevealed ? 1 : 0,
              transform: isRevealed ? 'none' : 'translateY(16px)',
              transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Subtle scene entry filament from previous section (Tablet) */}
            <div
              style={{
                width: '1px',
                height: '18px',
                background: `linear-gradient(180deg, transparent 0%, ${primaryAccent}55 100%)`,
                margin: '0 auto 10px',
                opacity: isRevealed ? 1 : 0,
                transition: 'opacity 0.8s ease',
              }}
            />
            <span style={{ fontSize: '0.62rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: `${primaryAccent}CC`, marginBottom: '8px', display: 'block' }}>
              ✦&ensp;The Union&ensp;✦
            </span>
            <h2 style={{ fontFamily: "'Playfair Display', 'Cinzel', serif", fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)', fontWeight: 400, color: '#FFF9F5', margin: '0 0 6px', lineHeight: 1.1, background: 'linear-gradient(180deg, #FFFFFF 20%, #E8DFD8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Two Souls, Bound By Gravity
            </h2>
          </div>

          {/* Dual Editorial Portrait Wings */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              marginBottom: '24px',
              opacity: isRevealed ? 1 : 0,
              transform: isRevealed ? 'none' : 'translateY(20px)',
              transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.15s',
            }}
          >
            {/* Aarav Wing */}
            <div
              onClick={() => handleTabChange('p1')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: 'clamp(20px, 3vh, 28px) 20px',
                borderRadius: '20px',
                background: activeTab === 'p1' ? `linear-gradient(180deg, rgba(229, 192, 123, 0.1) 0%, rgba(10, 14, 28, 0.85) 100%)` : 'rgba(10, 14, 28, 0.5)',
                border: `1.5px solid ${activeTab === 'p1' ? `${primaryAccent}66` : `${primaryAccent}22`}`,
                cursor: 'pointer',
                transition: 'all 0.4s ease',
              }}
            >
              <div
                data-editor-node-id="lay_souls_p1"
                data-editor-scene-id="scene_souls"
                data-editor-kind="portrait"
                data-layer-id="lay_souls_p1"
                data-scene-id="scene_souls"
                data-binding-key="celebrants[0].portrait"
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: getPortraitRadius(partner1Shape),
                  overflow: 'hidden',
                  border: `2px solid ${primaryAccent}`,
                  boxShadow: `0 0 20px ${primaryAccent}44`,
                  marginBottom: '14px',
                  padding: partner1Shape === 'polaroid' ? '4px 4px 14px 4px' : undefined,
                  background: partner1Shape === 'polaroid' ? '#FFFFFF' : undefined,
                  transition: 'all 0.4s ease',
                }}
              >
                <img
                  src={partner1Image}
                  alt={partner1Name}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: partner1Shape === 'polaroid' ? '2px' : getPortraitRadius(partner1Shape),
                    objectFit: partner1CropBehavior === 'fit' ? 'contain' : 'cover',
                    objectPosition: `${partner1FocalPoint.x}% ${partner1FocalPoint.y}%`,
                    transform: partner1CropBehavior === 'editorial_zoom' ? 'scale(1.08)' : 'none',
                    transition: 'all 0.4s ease',
                  }}
                />
              </div>
              <span style={{ fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: primaryAccent, fontWeight: 600, marginBottom: '4px' }}>{partner1Role}</span>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.35rem', color: '#FFF9F5', margin: '0 0 8px', lineHeight: 1.1 }}>{partner1Name}</h3>
              <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: '0.78rem', color: 'rgba(255,249,245,0.88)', lineHeight: 1.4, margin: '0 0 6px', textAlign: 'center' }}>{p1Vow}</p>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,249,245,0.5)', lineHeight: 1.35, margin: 0, textAlign: 'center' }}>{partner1Bio}</p>
            </div>

            {/* Meera Wing */}
            <div
              onClick={() => handleTabChange('p2')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: 'clamp(20px, 3vh, 28px) 20px',
                borderRadius: '20px',
                background: activeTab === 'p2' ? 'linear-gradient(180deg, rgba(136, 192, 208, 0.1) 0%, rgba(10, 14, 28, 0.85) 100%)' : 'rgba(10, 14, 28, 0.5)',
                border: `1.5px solid ${activeTab === 'p2' ? 'rgba(136, 192, 208, 0.5)' : 'rgba(136, 192, 208, 0.18)'}`,
                cursor: 'pointer',
                transition: 'all 0.4s ease',
              }}
            >
              <div
                data-editor-node-id="lay_souls_p2"
                data-editor-scene-id="scene_souls"
                data-editor-kind="portrait"
                data-layer-id="lay_souls_p2"
                data-scene-id="scene_souls"
                data-binding-key="celebrants[1].portrait"
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: getPortraitRadius(partner2Shape),
                  overflow: 'hidden',
                  border: '2px solid #88C0D0',
                  boxShadow: '0 0 20px rgba(136, 192, 208, 0.35)',
                  marginBottom: '14px',
                  padding: partner2Shape === 'polaroid' ? '4px 4px 14px 4px' : undefined,
                  background: partner2Shape === 'polaroid' ? '#FFFFFF' : undefined,
                  transition: 'all 0.4s ease',
                }}
              >
                <img
                  src={partner2Image}
                  alt={partner2Name}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: partner2Shape === 'polaroid' ? '2px' : getPortraitRadius(partner2Shape),
                    objectFit: partner2CropBehavior === 'fit' ? 'contain' : 'cover',
                    objectPosition: `${partner2FocalPoint.x}% ${partner2FocalPoint.y}%`,
                    transform: partner2CropBehavior === 'editorial_zoom' ? 'scale(1.08)' : 'none',
                    transition: 'all 0.4s ease',
                  }}
                />
              </div>
              <span style={{ fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#88C0D0', fontWeight: 600, marginBottom: '4px' }}>{partner2Role}</span>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.35rem', color: '#FFF9F5', margin: '0 0 8px', lineHeight: 1.1 }}>{partner2Name}</h3>
              <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: '0.78rem', color: 'rgba(255,249,245,0.88)', lineHeight: 1.4, margin: '0 0 6px', textAlign: 'center' }}>{p2Vow}</p>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,249,245,0.5)', lineHeight: 1.35, margin: 0, textAlign: 'center' }}>{partner2Bio}</p>
            </div>
          </div>

          {/* Covenant */}
          <div
            data-editor-node-id="lay_souls_title"
            data-editor-scene-id="scene_souls"
            data-editor-kind="text"
            data-layer-id="lay_souls_title"
            data-scene-id="scene_souls"
            data-binding-key="celebration.unionDeclaration"
            style={{
              textAlign: 'center',
              padding: '18px 24px',
              borderRadius: '16px',
              background: 'rgba(229, 192, 123, 0.04)',
              border: `1px solid ${primaryAccent}22`,
              marginBottom: '28px',
              opacity: isRevealed ? 1 : 0,
              transition: 'opacity 1s ease 0.4s',
            }}
          >
            <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: '0.86rem', color: 'rgba(255,249,245,0.88)', lineHeight: 1.5, maxWidth: '600px', margin: '0 auto' }}>
              &ldquo;{unionDeclaration}&rdquo;
            </p>
          </div>

          {/* Transition Bridge to Constellation (Tablet) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: isRevealed ? 1 : 0, transition: 'opacity 1s ease 0.5s' }}>
            <div className="celestial-photon-stream" style={{ width: '1px', height: '32px', background: `linear-gradient(180deg, ${primaryAccent}26 0%, ${primaryAccent} 100%)` }} />
            <div style={{ position: 'relative', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '6px 0' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FFF9F5', boxShadow: `0 0 12px ${primaryAccent}, 0 0 4px #FFF`, animation: 'celestialBeaconBreathe 3s ease-in-out infinite' }} />
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1px solid ${primaryAccent}55`, animation: 'celestialBeaconRingPulse 3s cubic-bezier(0.16, 1, 0.3, 1) infinite', pointerEvents: 'none' }} />
            </div>
            <span style={{ fontSize: '0.54rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: `${primaryAccent}CC`, fontWeight: 500, marginTop: '2px' }}>
              INTO THE CONSTELLATION
            </span>
            <div style={{ width: '1px', height: '24px', background: `linear-gradient(180deg, ${primaryAccent} 0%, transparent 100%)`, marginTop: '6px' }} />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* DESKTOP EXPERIENCE (> 1024px)                              */}
      {/* 3-column orrery with pointer parallax and tab selector.    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="souls-exp-desktop">
        <div
          style={{
            maxWidth: contentMaxWidth || '1240px',
            margin: '0 auto',
            padding: 'clamp(28px, 4vh, 44px) clamp(20px, 3vw, 36px) clamp(48px, 6vh, 64px)',
            position: 'relative',
            zIndex: 2,
            transition: isReducedStatic ? 'none' : `max-width ${entryDuration} ${motionEasing}`,
          }}
        >
          {/* Header + Tab Selector */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: 'clamp(16px, 2.5vh, 24px)',
              opacity: isRevealed ? 1 : 0,
              transform: isRevealed ? 'none' : 'translateY(18px)',
              transition: isReducedStatic ? 'none' : `all ${entryDuration} ${motionEasing}`,
            }}
          >
            {/* Subtle scene entry filament from previous section (Desktop) */}
            <div
              style={{
                width: '1px',
                height: '18px',
                background: `linear-gradient(180deg, transparent 0%, ${primaryAccent}55 100%)`,
                margin: '0 auto 10px',
                opacity: isRevealed ? 1 : 0,
                transition: 'opacity 0.8s ease',
              }}
            />
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 14px', borderRadius: '9999px', background: `${primaryAccent}14`, border: `1px solid ${primaryAccent}33`, color: primaryAccent, fontSize: '0.66rem', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: '8px', backdropFilter: 'blur(8px)' }}>
              <Sparkles size={11} />
              <span>The Union · Gravitational Harmony</span>
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', 'Cinzel', serif", fontSize: 'clamp(1.8rem, 2.8vw, 2.4rem)', fontWeight: 400, letterSpacing: '0.02em', margin: '0 0 4px', lineHeight: 1.15, background: 'linear-gradient(180deg, #FFFFFF 20%, #E8DFD8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Two Souls, Bound By Gravity
            </h2>
            <p style={{ fontSize: 'clamp(0.8rem, 1.1vw, 0.92rem)', color: 'rgba(255,249,245,0.6)', maxWidth: '480px', margin: '0 auto 12px', lineHeight: 1.45, fontWeight: 300 }}>
              Two independent orbits drawn by destiny into one shared gravitational harmony.
            </p>

            {/* Tab Selector (desktop only) */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(10,14,28,0.75)', border: `1px solid ${primaryAccent}33`, borderRadius: '9999px', padding: '3px', backdropFilter: 'blur(16px)', boxShadow: '0 6px 24px rgba(0,0,0,0.5)' }}>
              {(['p1', 'union', 'p2'] as const).map((tab) => {
                const isActive = activeTab === tab;
                const color = tab === 'p2' ? '#88C0D0' : primaryAccent;
                const label = tab === 'p1' ? p1First : tab === 'p2' ? p2First : 'Harmonic Union';
                const Icon = tab === 'p1' ? Sun : tab === 'p2' ? Moon : Orbit;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => handleTabChange(tab)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px', padding: tab === 'union' ? '5px 16px' : '5px 14px',
                      borderRadius: '9999px', border: tab === 'union' && isActive ? `1px solid ${primaryAccent}` : '1px solid transparent',
                      cursor: 'pointer', outline: 'none',
                      background: isActive ? (tab === 'p2' ? 'rgba(136,192,208,0.2)' : `${primaryAccent}33`) : 'transparent',
                      color: isActive ? (tab === 'p2' ? '#88C0D0' : tab === 'union' ? '#FFF9F5' : primaryAccent) : 'rgba(255,249,245,0.6)',
                      boxShadow: isActive ? `0 0 14px ${tab === 'p2' ? 'rgba(136,192,208,0.3)' : `${primaryAccent}33`}` : 'none',
                      fontSize: '0.72rem', letterSpacing: tab === 'union' ? '0.12em' : '0.1em', fontWeight: isActive ? 600 : 400,
                      textTransform: tab === 'union' ? 'uppercase' : undefined,
                      transition: 'all 0.25s ease',
                    }}
                  >
                    <Icon size={12} style={{ color }} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3-Column Orrery Grid with Dynamic Composition */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                composition === 'centered'
                  ? '1fr'
                  : composition === 'editorial'
                    ? '1.1fr auto 0.9fr'
                    : composition === 'asymmetric'
                      ? '1.25fr auto 0.75fr'
                      : '1fr auto 1fr',
              maxWidth: composition === 'centered' ? '640px' : undefined,
              margin: composition === 'centered' ? '0 auto' : undefined,
              alignItems: 'center',
              gap: 'clamp(20px, 3vw, 40px)',
              position: 'relative',
              padding: '8px 0',
              transform: isReducedStatic
                ? 'none'
                : `perspective(1000px) rotateX(${pointer.y * -1.5 * parallaxDepth}deg) rotateY(${pointer.x * 1.5 * parallaxDepth}deg)`,
              transition: isHovered ? 'transform 0.15s ease-out' : `transform ${entryDuration} ${motionEasing}`,
              opacity: isRevealed ? 1 : 0,
              transitionProperty: isHovered ? 'transform' : 'transform, opacity',
              transitionDuration: isHovered ? '0.15s' : entryDuration,
              transitionDelay: isRevealed ? staggerDelay : '0s',
            }}
          >
            {/* Aarav Card */}
            <div
              onClick={() => handleTabChange('p1')}
              style={{
                display: 'flex', alignItems: 'center', gap: 'clamp(16px, 2.2vw, 26px)',
                background: activeTab === 'p1' ? `linear-gradient(135deg, ${primaryAccent}1A 0%, rgba(14,20,42,0.85) 100%)` : 'linear-gradient(135deg, rgba(14,20,42,0.45) 0%, rgba(8,11,24,0.75) 100%)',
                border: `1.5px solid ${activeTab === 'p1' ? primaryAccent : `${primaryAccent}33`}`,
                borderRadius: '24px', padding: 'clamp(16px, 2.2vw, 24px)', cursor: 'pointer',
                transition: `all 0.4s ${motionEasing}`,
                boxShadow: activeTab === 'p1' ? `0 16px 40px -10px ${primaryAccent}33` : '0 8px 30px rgba(0,0,0,0.5)',
                transform: activeTab === 'p1' ? 'scale(1.015)' : composition === 'editorial' ? 'translateY(-10px)' : 'scale(1)',
              }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ position: 'absolute', inset: '-8px', borderRadius: '50%', border: `1.5px dashed ${activeTab === 'p1' ? primaryAccent : `${primaryAccent}44`}`, animation: isReducedStatic ? 'none' : 'soulsAstrolabeSpin 32s linear infinite', pointerEvents: 'none' }} />
                <div style={{ width: 'clamp(100px, 11vw, 130px)', height: 'clamp(100px, 11vw, 130px)', borderRadius: getPortraitRadius(partner1Shape), overflow: 'hidden', border: `2px solid ${primaryAccent}`, boxShadow: activeTab === 'p1' ? `0 0 28px ${primaryAccent}66` : `0 0 16px ${primaryAccent}33`, background: '#070914' }}>
                  <img src={partner1Image} alt={partner1Name} style={{ width: '100%', height: '100%', objectFit: partner1CropBehavior === 'fit' ? 'contain' : 'cover', objectPosition: `${partner1FocalPoint.x}% ${partner1FocalPoint.y}%`, transform: partner1CropBehavior === 'editorial_zoom' ? 'scale(1.08)' : 'none', filter: activeTab === 'p2' ? 'grayscale(20%) brightness(0.85)' : 'contrast(104%)', transition: 'all 0.4s ease' }} />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.64rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: primaryAccent, fontWeight: 600, marginBottom: '2px' }}><Sun size={10} />{partner1Role}</span>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.25rem, 1.8vw, 1.55rem)', fontWeight: 400, color: '#FFF9F5', margin: '0 0 6px', lineHeight: 1.15 }}>{partner1Name}</h3>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.78rem', fontStyle: 'italic', color: 'rgba(255,249,245,0.9)', lineHeight: 1.4, margin: '0 0 6px' }}>{p1Vow}</p>
                <p style={{ fontSize: '0.72rem', color: 'rgba(255,249,245,0.55)', lineHeight: 1.35, margin: 0 }}>{partner1Bio}</p>
              </div>
            </div>

            {/* Central Node */}
            <div onClick={() => handleTabChange('union')} title="Activate Sacred Union" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, padding: '0 6px', zIndex: 5, margin: composition === 'centered' ? '12px 0' : undefined }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: activeTab === 'union' ? `linear-gradient(135deg, ${primaryAccent}33 0%, rgba(10,15,30,0.95) 100%)` : 'rgba(8,12,26,0.9)', border: `1.5px solid ${activeTab === 'union' ? primaryAccent : `${primaryAccent}55`}`, boxShadow: activeTab === 'union' ? `0 0 30px ${primaryAccent}55, inset 0 0 16px ${primaryAccent}33` : '0 6px 20px rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)', transform: activeTab === 'union' ? 'scale(1.08)' : 'scale(1)', transition: `all 0.35s ${motionEasing}` }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontStyle: 'italic', color: primaryAccent, lineHeight: 1 }}>&amp;</span>
              </div>
              <span style={{ fontSize: '0.56rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: activeTab === 'union' ? primaryAccent : 'rgba(255,249,245,0.5)', marginTop: '6px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {activeTab === 'union' ? 'HARMONIC UNION' : 'TAP TO MERGE'}
              </span>
            </div>

            {/* Meera Card */}
            <div
              onClick={() => handleTabChange('p2')}
              style={{
                display: 'flex', alignItems: 'center', gap: 'clamp(16px, 2.2vw, 26px)',
                background: activeTab === 'p2' ? 'linear-gradient(135deg, rgba(136,192,208,0.12) 0%, rgba(14,20,42,0.85) 100%)' : 'linear-gradient(135deg, rgba(14,20,42,0.45) 0%, rgba(8,11,24,0.75) 100%)',
                border: `1.5px solid ${activeTab === 'p2' ? '#88C0D0' : 'rgba(136,192,208,0.25)'}`,
                borderRadius: '24px', padding: 'clamp(16px, 2.2vw, 24px)', cursor: 'pointer',
                transition: `all 0.4s ${motionEasing}`,
                boxShadow: activeTab === 'p2' ? '0 16px 40px -10px rgba(136,192,208,0.3)' : '0 8px 30px rgba(0,0,0,0.5)',
                transform: activeTab === 'p2' ? 'scale(1.015)' : composition === 'editorial' ? 'translateY(10px)' : 'scale(1)',
              }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ position: 'absolute', inset: '-8px', borderRadius: '50%', border: `1.5px dashed ${activeTab === 'p2' ? '#88C0D0' : 'rgba(136,192,208,0.35)'}`, animation: isReducedStatic ? 'none' : 'soulsAstrolabeSpinReverse 32s linear infinite', pointerEvents: 'none' }} />
                <div style={{ width: 'clamp(100px, 11vw, 130px)', height: 'clamp(100px, 11vw, 130px)', borderRadius: getPortraitRadius(partner2Shape), overflow: 'hidden', border: '2px solid #88C0D0', boxShadow: activeTab === 'p2' ? '0 0 28px rgba(136,192,208,0.6)' : '0 0 16px rgba(136,192,208,0.3)', background: '#070914' }}>
                  <img src={partner2Image} alt={partner2Name} style={{ width: '100%', height: '100%', objectFit: partner2CropBehavior === 'fit' ? 'contain' : 'cover', objectPosition: `${partner2FocalPoint.x}% ${partner2FocalPoint.y}%`, transform: partner2CropBehavior === 'editorial_zoom' ? 'scale(1.08)' : 'none', filter: activeTab === 'p1' ? 'grayscale(20%) brightness(0.85)' : 'contrast(104%)', transition: 'filter 0.4s ease' }} />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.64rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#88C0D0', fontWeight: 600, marginBottom: '2px' }}><Moon size={10} />{partner2Role}</span>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.25rem, 1.8vw, 1.55rem)', fontWeight: 400, color: '#FFF9F5', margin: '0 0 6px', lineHeight: 1.15 }}>{partner2Name}</h3>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.78rem', fontStyle: 'italic', color: 'rgba(255,249,245,0.9)', lineHeight: 1.4, margin: '0 0 6px' }}>{p2Vow}</p>
                <p style={{ fontSize: '0.72rem', color: 'rgba(255,249,245,0.55)', lineHeight: 1.35, margin: 0 }}>{partner2Bio}</p>
              </div>
            </div>
          </div>

          {/* Desktop Covenant */}
          {activeTab === 'union' && (
            <div style={{ marginTop: '16px', textAlign: 'center', padding: '16px 28px', borderRadius: '18px', background: `${primaryAccent}0A`, border: `1px solid ${primaryAccent}22`, backdropFilter: 'blur(12px)', animation: 'soulsRevealUp 0.5s ease' }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: '0.88rem', color: 'rgba(255,249,245,0.9)', lineHeight: 1.5, maxWidth: '700px', margin: '0 auto' }}>
                &ldquo;{unionDeclaration}&rdquo;
              </p>
            </div>
          )}

          {/* Desktop Transition Bridge */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 'clamp(24px, 4vh, 36px)', opacity: isRevealed ? 1 : 0, transition: 'opacity 1s ease 0.6s' }}>
            <div className="celestial-photon-stream" style={{ width: '1px', height: '28px', background: `linear-gradient(180deg, ${primaryAccent}55 0%, ${primaryAccent} 100%)` }} />
            <div style={{ position: 'relative', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FFF9F5', boxShadow: `0 0 12px ${primaryAccent}`, animation: 'celestialBeaconBreathe 3s ease-in-out infinite' }} />
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1px solid ${primaryAccent}55`, animation: 'celestialBeaconRingPulse 3s cubic-bezier(0.16, 1, 0.3, 1) infinite', pointerEvents: 'none' }} />
            </div>
            <span style={{ fontSize: '0.54rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: `${primaryAccent}CC`, fontWeight: 500, marginTop: '2px' }}>
              INTO THE CONSTELLATION
            </span>
            <div style={{ width: '1px', height: '24px', background: `linear-gradient(180deg, ${primaryAccent} 0%, transparent 100%)`, marginTop: '6px' }} />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* STYLES & KEYFRAMES                                         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <style jsx>{`
        /* ── Layout Switching ── */
        .souls-exp-mobile { display: none !important; }
        .souls-exp-tablet { display: none !important; }
        .souls-exp-desktop { display: block !important; }

        @media (min-width: 641px) and (max-width: 1024px) {
          .souls-exp-mobile { display: none !important; }
          .souls-exp-tablet { display: block !important; }
          .souls-exp-desktop { display: none !important; }
        }

        @media (max-width: 640px) {
          .souls-exp-mobile {
            display: flex !important;
            flex-direction: column;
            align-items: center;
          }
          .souls-exp-tablet { display: none !important; }
          .souls-exp-desktop { display: none !important; }
        }

        /* ── Mobile Keyframes ── */
        @keyframes soulsRevealUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes soulsScrollPulse {
          0%, 100% {
            transform: translateY(0);
            opacity: 0.5;
          }
          50% {
            transform: translateY(4px);
            opacity: 0.9;
          }
        }

        /* ── Desktop Keyframes ── */
        @keyframes soulsAstrolabeSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes soulsAstrolabeSpinReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        /* ── Reduced Motion ── */
        @media (prefers-reduced-motion: reduce) {
          .souls-exp-mobile *,
          .souls-exp-tablet *,
          .souls-exp-desktop * {
            animation-duration: 0.01ms !important;
            transition-duration: 0.2s !important;
          }
        }
      `}</style>
    </section>
  );
}
