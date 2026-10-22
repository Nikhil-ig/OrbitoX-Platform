import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Sparkles, X } from 'lucide-react';
import { NodeRenderContext } from '../NodeRendererRegistry';
import { prefersReducedMotion, calculateNormalizedPointer } from '@/lib/motion-system';

export function CelestialConstellationMap({ node, resolvedStyle, resolvedState }: NodeRenderContext) {
  const milestones = node.smartProps?.milestones || resolvedState?.milestones || [];
  const primaryAccent = node.smartProps?.primaryAccent || resolvedState?.primaryColorOverride || '#DFBA6B';
  const parallaxDepth = node.smartProps?.parallaxDepth || 1.0;
  
  const [activeStarIndex, setActiveStarIndex] = useState(0);
  const [discoveredStars, setDiscoveredStars] = useState<number[]>([0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setIsRevealed(true);
      },
      { threshold: 0.1 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
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

  const handleSelectStar = (index: number) => {
    setActiveStarIndex(index);
    if (!discoveredStars.includes(index)) {
      setDiscoveredStars(prev => [...prev, index]);
    }
  };

  const handleNext = () => handleSelectStar((activeStarIndex + 1) % Math.max(1, milestones.length));
  const handlePrev = () => handleSelectStar((activeStarIndex - 1 + milestones.length) % Math.max(1, milestones.length));

  if (!milestones.length) return null;

  const activeMilestone = milestones[activeStarIndex];
  const isReducedStatic = prefersReducedMotion();

  // Procedural star coordinates based on number of milestones
  const starCoordinates = milestones.map((m: any, i: number) => {
    const parsed = m.coords ? m.coords.split(',').map(Number) : null;
    if (parsed && parsed.length === 2 && !isNaN(parsed[0]) && !isNaN(parsed[1])) {
      return { x: parsed[0], y: parsed[1] };
    }
    const t = i / Math.max(1, milestones.length - 1);
    return {
      x: 15 + t * 70,
      y: 50 + Math.sin(t * Math.PI * 2) * 25
    };
  });

  return (
    <div
      ref={containerRef}
      id={node.id}
      style={{
        ...resolvedStyle,
        position: resolvedStyle.position || 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isRevealed ? (resolvedStyle.opacity ?? 1) : 0,
        transform: `${resolvedStyle.transform || ''} ${isRevealed ? 'translateY(0)' : 'translateY(24px)'}`.trim(),
        transition: 'all 0.9s ease-out'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setPointer({ x: 0, y: 0 }); }}
    >
      <div style={{ position: 'relative', width: '100%', height: '400px', margin: '20px 0' }}>
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', filter: 'drop-shadow(0 0 12px rgba(229,192,123,0.15))' }}>
          <defs>
            <linearGradient id="activeConstellationGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={primaryAccent} stopOpacity="0.4" />
              <stop offset="100%" stopColor={primaryAccent} stopOpacity="0.9" />
            </linearGradient>
          </defs>
          {starCoordinates.map((p1: any, idx: number) => {
            if (idx === starCoordinates.length - 1) return null;
            const p2 = starCoordinates[idx + 1];
            const isPastOrActive = activeStarIndex >= idx;
            const x1 = p1.x * 10;
            const y1 = p1.y * 10;
            const x2 = p2.x * 10;
            const y2 = p2.y * 10;

            return (
              <g key={idx}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} vectorEffect="non-scaling-stroke" stroke={isPastOrActive ? 'url(#activeConstellationGradient)' : 'rgba(229, 192, 123, 0.2)'} strokeWidth={isPastOrActive ? '2' : '1'} strokeDasharray={isPastOrActive ? 'none' : '4 6'} style={{ transition: 'all 0.5s ease' }} />
                {isPastOrActive && (
                  <circle r="4" fill="#FFFFFF" filter={`drop-shadow(0 0 6px ${primaryAccent})`}>
                    <animateMotion path={`M ${x1} ${y1} L ${x2} ${y2}`} dur="3s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>

        {milestones.map((m: any, idx: number) => {
          const coord = starCoordinates[idx];
          const isActive = activeStarIndex === idx;
          const isDiscovered = discoveredStars.includes(idx);

          return (
            <div key={m.id || idx} style={{ position: 'absolute', left: `${coord.x}%`, top: `${coord.y}%`, transform: 'translate(-50%, -50%)', zIndex: isActive ? 10 : 5 }}>
              <button
                type="button" onClick={() => handleSelectStar(idx)}
                style={{ position: 'relative', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none' }}
              >
                {isActive && (
                  <div style={{ position: 'absolute', inset: '-5px', borderRadius: '50%', border: `1px dashed ${primaryAccent}88` }} />
                )}
                <div style={{ width: isActive ? '24px' : '16px', height: isActive ? '24px' : '16px', borderRadius: '50%', background: isActive ? `radial-gradient(circle, #FFFFFF 0%, ${primaryAccent} 80%)` : isDiscovered ? 'radial-gradient(circle, #FFF9F5 0%, rgba(229, 192, 123, 0.8) 100%)' : 'rgba(255, 255, 255, 0.3)', transition: 'all 0.35s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isActive && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#07080D' }} />}
                </div>
                <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '6px', whiteSpace: 'nowrap', pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.74rem', fontWeight: isActive ? 600 : 400, color: isActive ? primaryAccent : 'rgba(255, 249, 245, 0.75)', letterSpacing: '0.12em' }}>{m.year}</span>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'center', background: 'linear-gradient(135deg, rgba(20, 25, 46, 0.45) 0%, rgba(8, 10, 18, 0.85) 100%)', borderRadius: '24px', padding: '30px', border: '1px solid rgba(229, 192, 123, 0.18)' }}>
        <div style={{ position: 'relative', borderRadius: '18px', overflow: 'hidden', aspectRatio: '4/3' }}>
          <img src={activeMilestone.image} alt={activeMilestone.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontFamily: "'Playfair Display', 'Cinzel', serif", fontSize: '2rem', color: '#FFF9F5', margin: 0 }}>{activeMilestone.title}</h3>
          <p style={{ color: 'rgba(255, 249, 245, 0.78)', margin: '4px 0 12px 0' }}>{activeMilestone.description}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
            <button type="button" onClick={handlePrev} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #fff', color: '#fff', borderRadius: '20px' }}>Prev</button>
            <button type="button" onClick={handleNext} style={{ padding: '8px 16px', background: primaryAccent, border: 'none', color: '#fff', borderRadius: '20px' }}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
