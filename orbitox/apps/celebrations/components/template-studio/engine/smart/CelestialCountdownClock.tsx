import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Compass, Download, Sparkles } from 'lucide-react';
import { NodeRenderContext } from '../NodeRendererRegistry';
import {
  prefersReducedMotion,
  calculateNormalizedPointer,
} from '@/lib/motion-system';

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

export function CelestialCountdownClock({ node, resolvedStyle, resolvedState }: NodeRenderContext) {
  const [activeOrbit, setActiveOrbit] = useState<'days' | 'hours' | 'minutes' | 'seconds' | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract from smartProps or fallback to state
  const speedTier = node.smartProps?.speedTier || resolvedState?.speedTier || 'celestial';
  const primaryAccent = node.smartProps?.primaryAccent || resolvedState?.primaryColorOverride || '#E5C07B';
  const eventDateStr = node.smartProps?.eventDate || resolvedState?.date || '2026-12-18T16:00:00';
  const venueCity = node.smartProps?.venueCity || resolvedState?.city || 'Under The Stars';
  const celebrationTitle = node.smartProps?.celebrationTitle || resolvedState?.title || 'Celestial Convergence';
  const parallaxDepth = node.smartProps?.parallaxDepth || 1.0;

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

  const rotationDuration =
    speedTier === 'dynamic' ? '60s' : speedTier === 'quiet' ? '360s' : '180s';

  const isReducedStatic = prefersReducedMotion();
  const entryDuration = '0.9s';
  const motionEasing = 'cubic-bezier(0.16, 1, 0.3, 1)';

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
        transition: isReducedStatic ? 'none' : `all ${entryDuration} ${motionEasing}`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setPointer({ x: 0, y: 0 });
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '48px', width: '100%', flexWrap: 'wrap' }}>
        {/* Astrolabe */}
        <div
          style={{
            position: 'relative', width: '340px', height: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: isReducedStatic ? 'none' : `perspective(1000px) rotateX(${pointer.y * -3 * parallaxDepth}deg) rotateY(${pointer.x * 3 * parallaxDepth}deg)`,
            transition: isHovered ? 'transform 0.18s ease-out' : `transform ${entryDuration} ${motionEasing}`
          }}
        >
          <svg viewBox="0 0 400 400" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
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
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={20} style={{ color: primaryAccent, filter: 'drop-shadow(0 0 6px rgba(229, 192, 123, 0.8))' }} />
            <span style={{ fontSize: '0.62rem', fontFamily: "'Playfair Display', serif", letterSpacing: '0.15em', color: primaryAccent, marginTop: '2px' }}>ORBIT</span>
          </div>
        </div>

        {/* Pedestals */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(100px, 1fr))', gap: '20px' }}>
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
                  padding: '20px 16px', borderRadius: '20px',
                  background: isSelected ? `linear-gradient(180deg, ${primaryAccent}26 0%, rgba(18, 22, 40, 0.9) 100%)` : 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(8, 10, 18, 0.8) 100%)',
                  border: isSelected ? `1.5px solid ${unit.accent}` : '1px solid rgba(229, 192, 123, 0.18)',
                  boxShadow: isSelected ? `0 12px 28px -4px ${unit.accent}44, inset 0 0 14px ${unit.accent}22` : '0 8px 24px rgba(0, 0, 0, 0.5)',
                  cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: isSelected ? 'translateY(-4px)' : 'translateY(0)', outline: 'none',
                }}
              >
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.4rem', fontWeight: 400, color: isSelected ? unit.accent : '#FFF9F5', lineHeight: 1, marginBottom: '6px', fontVariantNumeric: 'tabular-nums' }}>
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
      </div>
    </div>
  );
}
