'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';
import { MilestoneChapter } from '../CelestialOdysseyExperience';
import {
  prefersReducedMotion,
  calculateNormalizedPointer,
} from '@/lib/motion-system';

import { SceneLayoutConfig, SceneMotionConfig, SceneInteractionConfig } from '@/components/studio/StudioData';
import { SceneGraphRenderer } from '@/components/renderer/SceneGraphRenderer';
import { CelestialConstellationGraph } from '@/components/template-studio/engine/CelestialConstellationGraph';
import type { SceneGraph } from '@/components/template-studio/engine/SceneGraphTypes';

interface CelestialConstellationSceneProps {
  milestones: MilestoneChapter[];
  primaryAccent?: string;
  layout?: SceneLayoutConfig;
  motion?: SceneMotionConfig;
  interactions?: SceneInteractionConfig[];
  sceneGraph?: SceneGraph;
}

export function CelestialConstellationScene({
  milestones,
  primaryAccent = '#E5C07B',
  layout,
  motion,
  interactions,
  sceneGraph,
}: CelestialConstellationSceneProps) {
  const [activeStarIndex, setActiveStarIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [discoveredStars, setDiscoveredStars] = useState<number[]>([0]);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const containerRef = useRef<HTMLElement>(null);

  const activeMilestone = milestones[activeStarIndex] || milestones[0]!;

  // Dynamic layout rules (P2-7)
  const composition = layout?.composition || 'editorial';
  const paddingTop = layout?.paddingTopRem !== undefined ? `${layout.paddingTopRem}rem` : '0';
  const paddingBottom = layout?.paddingBottomRem !== undefined ? `${layout.paddingBottomRem}rem` : 'clamp(44px, 6vh, 64px)';
  const contentMaxWidth = layout?.contentMaxWidthPx !== undefined ? `${layout.contentMaxWidthPx}px` : '1200px';

  // Dynamic motion config (P2-8)
  const entryDuration = motion?.entryDuration !== undefined ? `${motion.entryDuration}s` : '0.9s';
  const parallaxDepth = motion?.parallaxDepth !== undefined ? motion.parallaxDepth : 1.0;
  const motionEasing = motion?.easing || 'cubic-bezier(0.16, 1, 0.3, 1)';
  const isReducedStatic = motion?.reducedMotionFallback === 'static' || motion?.reducedMotionFallback === 'instant';

  // Scroll entrance choreography
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

  // Desktop Pointer Parallax Tracking
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
    milestones.forEach((m, idx) => {
      const nodeId = `star_m${idx + 1}`;
      if (boundGraph.nodes[nodeId]) {
        boundGraph.nodes[nodeId].name = `${m.year}: ${m.title}`;
      }
    });

    return (
      <section ref={containerRef} className="w-full relative overflow-hidden bg-[#06080F]" style={{ minHeight: '900px' }}>
        <SceneGraphRenderer
          sceneGraph={boundGraph}
          device="desktop"
          tokens={{
            colors: {
              textPrimary: '#ffffff',
              textSecondary: '#94a3b8',
              accentPrimary: primaryAccent || '#DFBA6B',
              background: '#06080F',
            }
          } as any}
          isEditorMode={false}
        />
      </section>
    );
  }

  const handleSelectStar = (index: number) => {
    setActiveStarIndex(index);
    if (!discoveredStars.includes(index)) {
      setDiscoveredStars((prev) => [...prev, index]);
    }
    // Check if interaction triggers modal expansion (P3-10)
    const starInt = interactions?.find(
      (int) => int.targetElementId === 'lay_const_stars' || int.action === 'expand_modal'
    );
    if (starInt && starInt.action === 'expand_modal') {
      setIsModalOpen(true);
    }
  };

  const handleNext = () => {
    const nextIdx = (activeStarIndex + 1) % milestones.length;
    handleSelectStar(nextIdx);
  };

  const handlePrev = () => {
    const prevIdx = (activeStarIndex - 1 + milestones.length) % milestones.length;
    handleSelectStar(prevIdx);
  };

  // Constellation coordinates in percentage (x%, y%)
  const starCoordinates = [
    { x: 18, y: 35, label: 'Origin' },
    { x: 40, y: 65, label: 'Journey' },
    { x: 65, y: 30, label: 'Promise' },
    { x: 86, y: 55, label: 'Convergence' },
  ];

  return (
    <section
      ref={containerRef}
      id="moment-story"
      aria-label="The Constellation of Our Story"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setPointer({ x: 0, y: 0 });
      }}
      style={{
        position: 'relative',
        padding: `${paddingTop} 0 ${paddingBottom} 0`,
        overflow: 'hidden',
        background: 'radial-gradient(ellipse 90% 65% at 50% 40%, rgba(13, 18, 38, 0.72) 0%, rgba(6, 8, 15, 0.99) 100%)',
        transition: isReducedStatic ? 'none' : `padding ${entryDuration} ${motionEasing}`,
      }}
    >
      {/* LAYER 1: Deep-space background nebula with slow parallax */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          right: '15%',
          width: '50vw',
          height: '50vw',
          maxWidth: '650px',
          maxHeight: '650px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${primaryAccent}0A 0%, rgba(20, 30, 65, 0.2) 50%, transparent 75%)`,
          filter: 'blur(70px)',
          transform: isReducedStatic ? 'none' : `translate3d(${pointer.x * -10 * parallaxDepth}px, ${pointer.y * -10 * parallaxDepth}px, 0)`,
          transition: isHovered ? 'transform 0.2s ease-out' : 'transform 1s ease-out',
          pointerEvents: 'none',
        }}
      />

      {/* LAYER 2: Distant star field */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(1px 1px at 30px 40px, #ffffff, rgba(0,0,0,0)), radial-gradient(1.5px 1.5px at 140px 170px, #E5C07B, rgba(0,0,0,0)), radial-gradient(1px 1px at 300px 90px, #ffffff, rgba(0,0,0,0))',
          backgroundRepeat: 'repeat',
          backgroundSize: '380px 380px',
          opacity: 0.32,
          transform: isReducedStatic ? 'none' : `translate3d(${pointer.x * 4 * parallaxDepth}px, ${pointer.y * 4 * parallaxDepth}px, 0)`,
          transition: 'transform 0.35s ease-out',
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: contentMaxWidth, margin: '0 auto', position: 'relative', zIndex: 2 }}>
        
        {/* ========================================================================= */}
        {/* MOBILE EXPERIENCE (≤ 768px)                                              */}
        {/* Vertical, edge-to-edge, immersive photography with overlaid text.        */}
        {/* ========================================================================= */}
        <div className="constellation-exp-mobile">
          <div
            style={{
              textAlign: 'center',
              padding: 'clamp(28px, 4vh, 44px) 24px 20px',
              opacity: isRevealed ? 1 : 0,
              transform: isRevealed ? 'translateY(0)' : 'translateY(16px)',
              transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Incoming continuity light beam from The Souls */}
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
              ✦&ensp;The Story&ensp;✦
            </span>
            <h2 style={{ fontFamily: "'Playfair Display', 'Cinzel', serif", fontSize: '2rem', fontWeight: 400, color: '#FFF9F5', margin: '0 0 12px 0', lineHeight: 1.1 }}>
              Our Constellation
            </h2>
          </div>

          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '65vh',
              minHeight: '480px',
              maxHeight: '700px',
              opacity: isRevealed ? 1 : 0,
              transform: isRevealed ? 'none' : 'scale(0.98)',
              transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
            }}
          >
            {/* Full-bleed Image */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
              {milestones.map((m, idx) => (
                <img
                  key={m.id}
                  src={m.image}
                  alt={m.title}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    opacity: activeStarIndex === idx ? 1 : 0,
                    transform: activeStarIndex === idx ? 'scale(1)' : 'scale(1.05)',
                    transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                    zIndex: activeStarIndex === idx ? 2 : 1,
                  }}
                />
              ))}
              
              {/* Deep immersive vignette for text readability */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(6, 8, 15, 0) 0%, rgba(6, 8, 15, 0.2) 40%, rgba(6, 8, 15, 0.95) 90%, rgba(6, 8, 15, 1) 100%)',
                  zIndex: 3,
                }}
              />
            </div>

            {/* Overlaid Content */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '0 24px 32px',
                zIndex: 4,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
              }}
            >
              {/* Chapter Tag */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '9999px', background: 'rgba(7, 8, 13, 0.6)', backdropFilter: 'blur(8px)', border: `1px solid ${primaryAccent}44`, color: primaryAccent, fontSize: '0.64rem', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '16px', width: 'fit-content' }}>
                <Sparkles size={10} />
                <span>{activeMilestone.chapter} • {activeMilestone.year}</span>
              </div>

              {/* Title & Description with Crossfade */}
              <div style={{ position: 'relative', minHeight: '140px' }}>
                {milestones.map((m, idx) => (
                  <div
                    key={m.id}
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      opacity: activeStarIndex === idx ? 1 : 0,
                      transform: activeStarIndex === idx ? 'translateY(0)' : 'translateY(12px)',
                      transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                      pointerEvents: activeStarIndex === idx ? 'auto' : 'none',
                    }}
                  >
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.75rem', color: '#FFF9F5', margin: '0 0 10px 0', lineHeight: 1.1 }}>
                      {m.title}
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: 'rgba(255,249,245,0.85)', lineHeight: 1.5, margin: '0 0 16px 0', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                      {m.description}
                    </p>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: primaryAccent }}/>
                      {m.location}
                    </div>
                  </div>
                ))}
              </div>

              {/* Minimal Dot Navigation Overlay */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <button
                  type="button"
                  onClick={handlePrev}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <ChevronLeft size={16} />
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {milestones.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectStar(idx)}
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: idx === activeStarIndex ? primaryAccent : 'rgba(255,255,255,0.2)',
                        boxShadow: idx === activeStarIndex ? `0 0 10px ${primaryAccent}` : 'none',
                        border: 'none',
                        padding: 0,
                        transition: 'all 0.3s ease',
                      }}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', background: `linear-gradient(135deg, ${primaryAccent}33 0%, ${primaryAccent}66 100%)`, border: `1px solid ${primaryAccent}88`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DESKTOP & TABLET EXPERIENCE (> 768px)                                     */}
        {/* Preserves the interactive constellation map and editorial layout.         */}
        {/* ========================================================================= */}
        <div className="constellation-exp-desktop">
          <div style={{ padding: 'clamp(36px, 5vh, 56px) clamp(24px, 4vw, 48px) 20px' }}>
            {/* Section Header: Staged entrance */}
            <div
              style={{
                textAlign: 'center',
                marginBottom: 'clamp(24px, 4vh, 32px)',
                opacity: isRevealed ? 1 : 0,
                transform: isRevealed ? 'translateY(0)' : 'translateY(24px)',
                transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 14px',
                  borderRadius: '9999px',
                  background: 'rgba(229, 192, 123, 0.06)',
                  border: `1px solid ${primaryAccent}26`,
                  color: primaryAccent,
                  fontSize: '0.7rem',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  marginBottom: '10px',
                }}
              >
                <Sparkles size={12} />
                <span>Interactive Constellation Map</span>
              </div>

              <h2
                style={{
                  fontFamily: "'Playfair Display', 'Cinzel', serif",
                  fontSize: 'clamp(2rem, 3.5vw, 2.8rem)',
                  fontWeight: 400,
                  letterSpacing: '0.02em',
                  color: '#FFF9F5',
                  margin: '0 0 6px 0',
                  lineHeight: 1.15,
                }}
              >
                The Constellation of Our Story
              </h2>

              <p
                style={{
                  fontSize: 'clamp(0.85rem, 1.2vw, 0.95rem)',
                  color: 'rgba(255, 249, 245, 0.65)',
                  maxWidth: '580px',
                  margin: '0 auto',
                  lineHeight: 1.45,
                }}
              >
                Every memory along our trajectory forms an enduring celestial alignment. Tap any star along the astral path to explore each chapter.
              </p>

              {/* Discovery Progress Tracker */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '16px',
                  padding: '4px 14px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '0.75rem',
                }}
              >
                <span>Aligned Memories:</span>
                <strong style={{ color: primaryAccent }}>
                  {discoveredStars.length} of {milestones.length} Stars Revealed
                </strong>
              </div>
            </div>

            {/* Desktop Map (LAYERS 4 & 5) */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: 'clamp(220px, 25vw, 280px)',
                borderRadius: '24px',
                background: 'linear-gradient(180deg, rgba(18, 22, 42, 0.45) 0%, rgba(9, 11, 20, 0.75) 100%)',
                border: '1px solid rgba(229, 192, 123, 0.15)',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
                marginBottom: '32px',
                overflow: 'hidden',
                transform: `perspective(1000px) rotateX(${pointer.y * -2}deg) rotateY(${pointer.x * 2}deg)`,
                transition: isHovered ? 'transform 0.18s ease-out' : 'transform 0.9s ease-out',
                opacity: isRevealed ? 1 : 0,
              }}
            >
              {/* LAYER 4: Constellation Vector Lines SVG */}
              <svg
                viewBox="0 0 1000 1000"
                preserveAspectRatio="none"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
              >
                <defs>
                  <linearGradient id="activeConstellationGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={primaryAccent} stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#FFF9F5" stopOpacity="0.9" />
                  </linearGradient>
                </defs>

                {milestones.map((_, idx) => {
                  if (idx === milestones.length - 1) return null;
                  const p1 = starCoordinates[idx] || { x: 20 * (idx + 1), y: 50 };
                  const p2 = starCoordinates[idx + 1] || { x: 20 * (idx + 2), y: 50 };
                  const isPastOrActive = activeStarIndex >= idx;

                  const x1 = p1.x * 10;
                  const y1 = p1.y * 10;
                  const x2 = p2.x * 10;
                  const y2 = p2.y * 10;

                  return (
                    <g key={idx}>
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        vectorEffect="non-scaling-stroke"
                        stroke={isPastOrActive ? 'url(#activeConstellationGradient)' : 'rgba(229, 192, 123, 0.2)'}
                        strokeWidth={isPastOrActive ? '2' : '1'}
                        strokeDasharray={isPastOrActive ? 'none' : '4 6'}
                        style={{ transition: 'all 0.5s ease' }}
                      />
                      {/* Traveling energy photon packet along the line */}
                      {isPastOrActive && (
                        <circle r="4" fill="#FFFFFF" filter={`drop-shadow(0 0 6px ${primaryAccent})`}>
                          <animateMotion path={`M ${x1} ${y1} L ${x2} ${y2}`} dur="3s" repeatCount="indefinite" />
                        </circle>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* LAYER 5: Interactive Star Nodes */}
              {milestones.map((m, idx) => {
                const coord = starCoordinates[idx] || { x: 25 * idx, y: 50, label: m.label };
                const isActive = activeStarIndex === idx;
                const isDiscovered = discoveredStars.includes(idx);

                return (
                  <div
                    key={m.id}
                    style={{ position: 'absolute', left: `${coord.x}%`, top: `${coord.y}%`, transform: 'translate(-50%, -50%)', zIndex: isActive ? 10 : 5 }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectStar(idx)}
                      style={{ position: 'relative', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none' }}
                      aria-label={`Open memory: ${m.title}`}
                    >
                      {isActive && (
                        <div style={{ position: 'absolute', inset: '-5px', borderRadius: '50%', border: `1px dashed ${primaryAccent}88`, animation: 'celestialSatelliteOrbit 7s linear infinite' }}>
                          <div style={{ position: 'absolute', top: '-3px', left: '50%', width: '6px', height: '6px', borderRadius: '50%', background: primaryAccent, boxShadow: `0 0 8px ${primaryAccent}`, transform: 'translateX(-50%)' }} />
                        </div>
                      )}
                      <div style={{ width: isActive ? '24px' : '16px', height: isActive ? '24px' : '16px', borderRadius: '50%', background: isActive ? `radial-gradient(circle, #FFFFFF 0%, ${primaryAccent} 80%)` : isDiscovered ? 'radial-gradient(circle, #FFF9F5 0%, rgba(229, 192, 123, 0.8) 100%)' : 'rgba(255, 255, 255, 0.3)', boxShadow: isActive ? `0 0 18px 3px ${primaryAccent}, 0 0 32px ${primaryAccent}66` : isDiscovered ? `0 0 10px 2px ${primaryAccent}44` : 'none', transition: 'all 0.35s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isActive && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#07080D' }} />}
                      </div>
                      <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '6px', whiteSpace: 'nowrap', pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.74rem', fontWeight: isActive ? 600 : 400, color: isActive ? primaryAccent : 'rgba(255, 249, 245, 0.75)', letterSpacing: '0.12em' }}>{m.year}</span>
                        <span style={{ fontSize: '0.62rem', letterSpacing: '0.16em', color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.45)', textTransform: 'uppercase' }}>{m.label}</span>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* LAYER 6: UNFOLDED MEMORY STAGE (EDITORIAL REVEAL) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'clamp(24px, 4vw, 48px)',
                alignItems: 'center',
                background: 'linear-gradient(135deg, rgba(20, 25, 46, 0.45) 0%, rgba(8, 10, 18, 0.85) 100%)',
                border: '1px solid rgba(229, 192, 123, 0.18)',
                borderRadius: '24px',
                padding: 'clamp(20px, 3vw, 36px)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(20px)',
                opacity: isRevealed ? 1 : 0,
                transform: isRevealed ? 'translateY(0)' : 'translateY(24px)',
                transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
              }}
            >
              {/* Left Column: Archival Photo Frame */}
              <div style={{ position: 'relative', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 14px 32px rgba(0,0,0,0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', aspectRatio: '4 / 3' }}>
                <img key={activeMilestone.id} src={activeMilestone.image} alt={activeMilestone.title} style={{ width: '100%', height: '100%', objectFit: 'cover', animation: 'celestialImageReveal 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(7, 8, 13, 0.8) 100%)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '14px', left: '14px', padding: '6px 14px', borderRadius: '9999px', background: 'rgba(7, 8, 13, 0.75)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#FFF9F5', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={12} style={{ color: primaryAccent }} />
                  <span>{activeMilestone.location}</span>
                </div>
                <button type="button" onClick={() => setIsModalOpen(true)} style={{ position: 'absolute', top: '14px', right: '14px', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(7, 8, 13, 0.65)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Maximize2 size={15} />
                </button>
              </div>

              {/* Right Column: Narrative */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: primaryAccent, fontSize: '0.8rem', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 600 }}>
                  <span>{activeMilestone.chapter}</span>
                  <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
                  <span>{activeMilestone.year}</span>
                </div>
                <h3 style={{ fontFamily: "'Playfair Display', 'Cinzel', serif", fontSize: 'clamp(1.6rem, 2.8vw, 2.2rem)', fontWeight: 400, color: '#FFF9F5', margin: 0, lineHeight: 1.25 }}>{activeMilestone.title}</h3>
                <p style={{ fontSize: '1rem', color: 'rgba(255, 249, 245, 0.78)', lineHeight: 1.65, margin: '4px 0 12px 0' }}>{activeMilestone.description}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <button type="button" onClick={handlePrev} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '9999px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#FFF9F5', fontSize: '0.84rem', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                    <ChevronLeft size={15} /><span>Previous Star</span>
                  </button>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {milestones.map((_, dotIdx) => (
                      <button key={dotIdx} type="button" onClick={() => handleSelectStar(dotIdx)} style={{ width: dotIdx === activeStarIndex ? '20px' : '7px', height: '7px', borderRadius: '4px', background: dotIdx === activeStarIndex ? primaryAccent : 'rgba(255, 255, 255, 0.2)', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', padding: 0 }} />
                    ))}
                  </div>
                  <button type="button" onClick={handleNext} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '9999px', background: `linear-gradient(135deg, ${primaryAccent}22 0%, ${primaryAccent}44 100%)`, border: `1px solid ${primaryAccent}66`, color: primaryAccent, fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' }}>
                    <span>Next Star</span><ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transition Bridge to Countdown Clock */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: 'clamp(20px, 4vw, 40px)', opacity: isRevealed ? 1 : 0, transition: 'opacity 1.2s ease 0.6s' }}>
          <div className="celestial-photon-stream" style={{ width: '1px', height: '36px', background: `linear-gradient(180deg, ${primaryAccent}66 0%, ${primaryAccent} 100%)` }} />
          <div style={{ position: 'relative', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '6px 0' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FFF9F5', boxShadow: `0 0 12px ${primaryAccent}, 0 0 4px #FFF`, animation: 'celestialBeaconBreathe 3s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1px solid ${primaryAccent}55`, animation: 'celestialBeaconRingPulse 3s cubic-bezier(0.16, 1, 0.3, 1) infinite', pointerEvents: 'none' }} />
          </div>
          <span style={{ fontSize: '0.54rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: `${primaryAccent}CC`, fontWeight: 500 }}>
            ENTERING TEMPORAL ALIGNMENT
          </span>
          <div style={{ width: '1px', height: '24px', background: `linear-gradient(180deg, ${primaryAccent} 0%, transparent 100%)`, marginTop: '6px' }} />
        </div>
      </div>

      {/* Expanded Modal Overlay (Desktop only) */}
      {isModalOpen && (
        <div className="constellation-exp-desktop" role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(6, 8, 15, 0.95)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={() => setIsModalOpen(false)}>
          <div style={{ position: 'relative', maxWidth: '850px', width: '100%', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0, 0, 0, 0.9)', border: `1px solid ${primaryAccent}44`, background: '#0B0D18' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10, width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(7, 8, 13, 0.8)', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={18} />
            </button>
            <img src={activeMilestone.image} alt={activeMilestone.title} style={{ width: '100%', maxHeight: '65vh', objectFit: 'contain', background: '#000' }} />
            <div style={{ padding: '24px 30px' }}>
              <div style={{ color: primaryAccent, fontSize: '0.78rem', letterSpacing: '0.2em' }}>{activeMilestone.chapter}</div>
              <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', color: '#FFF9F5', margin: '6px 0 10px 0' }}>{activeMilestone.title}</h4>
              <p style={{ color: 'rgba(255, 249, 245, 0.8)', lineHeight: 1.6, margin: 0, fontSize: '0.94rem' }}>{activeMilestone.description}</p>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .constellation-exp-mobile { display: none; }
        .constellation-exp-desktop { display: block; }

        @media (max-width: 768px) {
          .constellation-exp-mobile { display: block; }
          .constellation-exp-desktop { display: none !important; }
        }

        @keyframes celestialSatelliteOrbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes celestialImageReveal {
          from { opacity: 0.6; transform: scale(1.02); filter: blur(4px); }
          to { opacity: 1; transform: scale(1); filter: blur(0px); }
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
