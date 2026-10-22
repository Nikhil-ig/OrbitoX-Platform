'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { CoupleTitle } from '../CoupleTitle';

interface GlasshouseWelcomeDoorProps {
  title: string;
  subtitle?: string;
  date?: string;
  venue?: string;
  primaryColor?: string;
  onFinish?: () => void;
}

// Synthesize crystal harp glissando chime using Web Audio API
function playGlasshouseChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C5, E5, G5, C6, E6, G6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.09);

      gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.09);
      gain.gain.linearRampToValueAtTime(0.24, ctx.currentTime + idx * 0.09 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.09 + 2.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.09);
      osc.stop(ctx.currentTime + idx * 0.09 + 2.4);
    });
  } catch {
    // Silently continue if audio policy blocks autoplay
  }
}

export function GlasshouseWelcomeDoor({
  title,
  subtitle = 'Step into the starlight botanical conservatory',
  date = 'December 18, 2026',
  venue = 'The Crystal Palace & Palm Court',
  primaryColor = '#E2C889',
  onFinish,
}: GlasshouseWelcomeDoorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Background floating fireflies & starlight particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const motes = Array.from({ length: 45 }).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 1 + Math.random() * 2.2,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -(0.2 + Math.random() * 0.5),
      alpha: 0.2 + Math.random() * 0.7,
      pulse: Math.random() * Math.PI * 2,
    }));

    const render = () => {
      ctx.clearRect(0, 0, w, h);

      motes.forEach((m) => {
        m.pulse += 0.03;
        m.x += m.vx;
        m.y += m.vy;

        if (m.y < -10) m.y = h + 10;
        if (m.x < -10) m.x = w + 10;
        if (m.x > w + 10) m.x = -10;

        const currentAlpha = m.alpha * (0.6 + 0.4 * Math.sin(m.pulse));
        ctx.fillStyle = `rgba(245, 230, 200, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();

        // Soft glow halo
        ctx.fillStyle = `rgba(212, 184, 232, ${currentAlpha * 0.35})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r * 3, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleOpen = () => {
    if (isOpen) return;
    playGlasshouseChime();
    setIsOpen(true);

    // Auto-transition into celebration after grand swing
    setTimeout(() => {
      setIsFadingOut(true);
    }, 1500);

    setTimeout(() => {
      setIsDismissed(true);
      if (onFinish) onFinish();
    }, 2200);
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    if (onFinish) onFinish();
  };

  if (isDismissed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        backgroundColor: '#07040C',
        backgroundImage:
          'radial-gradient(circle at 50% 45%, rgba(68, 38, 105, 0.45) 0%, rgba(7, 4, 12, 0.98) 80%)',
        overflow: 'hidden',
        fontFamily: "'Cinzel', 'Cormorant Garamond', Georgia, serif",
        perspective: '1800px',
        perspectiveOrigin: '50% 50%',
        opacity: isFadingOut ? 0 : 1,
        transition: 'opacity 0.7s cubic-bezier(0.2, 1, 0.38, 1)',
      }}
    >
      {/* Background Interactive Starlight Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Rotating Volumetric God Rays */}
      <div
        style={{
          position: 'absolute',
          width: '120vmax',
          height: '120vmax',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background:
            'conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(226, 200, 137, 0.05) 20deg, transparent 40deg, rgba(212, 184, 232, 0.06) 60deg, transparent 80deg, rgba(226, 200, 137, 0.05) 120deg, transparent 150deg, rgba(212, 184, 232, 0.06) 180deg, transparent 220deg, rgba(226, 200, 137, 0.05) 260deg, transparent 300deg, rgba(212, 184, 232, 0.06) 330deg, transparent 360deg)',
          animation: 'glasshouseSpin 60s linear infinite',
          pointerEvents: 'none',
          zIndex: 2,
          opacity: 0.7,
        }}
      />
      <style>{`
        @keyframes glasshouseSpin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes wisteriaSway {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(1.2deg); }
        }
        @keyframes seamPulse {
          0%, 100% { opacity: 0.6; box-shadow: 0 0 20px rgba(226, 200, 137, 0.5); }
          50% { opacity: 1; box-shadow: 0 0 38px rgba(226, 200, 137, 0.95), 0 0 24px rgba(212, 184, 232, 0.85); }
        }
      `}</style>

      {/* Skip Button */}
      <button
        onClick={handleSkip}
        type="button"
        aria-label="Skip Door Animation"
        style={{
          position: 'absolute',
          top: 'max(16px, env(safe-area-inset-top, 16px))',
          right: 'max(16px, env(safe-area-inset-right, 16px))',
          zIndex: 60,
          background: 'rgba(24, 12, 38, 0.85)',
          border: `1px solid ${primaryColor}66`,
          borderRadius: '9999px',
          padding: '6px 14px',
          color: '#FFF1C5',
          fontSize: '0.68rem',
          fontWeight: 700,
          letterSpacing: '1px',
          textTransform: 'uppercase',
          cursor: 'pointer',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span>Skip</span>
        <ArrowRight size={12} />
      </button>

      {/* ─── FULL-SCREEN ARCHITECTURAL VICTORIAN CASING ─── */}

      {/* Top Conservatory Transom Arch & Hanging Wisteria Canopy (Full Bleed 100vw) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 'clamp(90px, 14vh, 140px)',
          zIndex: 40,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Wisteria Garland Drapery */}
        <svg
          viewBox="0 0 1440 140"
          preserveAspectRatio="none"
          style={{
            width: '100%',
            height: '100%',
            animation: 'wisteriaSway 6s ease-in-out infinite',
            transformOrigin: 'top center',
          }}
        >
          <defs>
            <linearGradient id="ghWisteriaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="40%" stopColor="#F2E6FC" />
              <stop offset="80%" stopColor="#D4B8E8" />
              <stop offset="100%" stopColor="#A881C8" />
            </linearGradient>
            <linearGradient id="ghGoldBeam" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(226, 200, 137, 0.2)" />
              <stop offset="50%" stopColor="#E2C889" />
              <stop offset="100%" stopColor="rgba(226, 200, 137, 0.2)" />
            </linearGradient>
          </defs>

          {/* Heavy Conservatory Head Arch Beam */}
          <path
            d="M 0 0 L 1440 0 L 1440 28 Q 720 70 0 28 Z"
            fill="#12081E"
            stroke="url(#ghGoldBeam)"
            strokeWidth="2"
          />

          {/* Arched Fanlight Iron Bars */}
          {[120, 240, 360, 480, 600, 720, 840, 960, 1080, 1200, 1320].map((x, i) => (
            <line
              key={i}
              x1={x}
              y1="0"
              x2={x}
              y2={30 + Math.sin((x / 1440) * Math.PI) * 25}
              stroke="rgba(226, 200, 137, 0.35)"
              strokeWidth="1.5"
            />
          ))}

          {/* Cascading Wisteria Flower Clusters across the full top edge */}
          {[60, 140, 220, 300, 380, 460, 540, 620, 700, 720, 780, 860, 940, 1020, 1100, 1180, 1260, 1340, 1400].map(
            (x, i) => {
              const baseDepth = 25 + Math.sin((x / 1440) * Math.PI) * 35;
              return (
                <g key={i} transform={`translate(${x}, ${baseDepth})`}>
                  {/* Stem */}
                  <line x1="0" y1="-15" x2="0" y2="15" stroke="#4A355A" strokeWidth="1.5" />
                  {/* Petal Droplets */}
                  <ellipse cx="0" cy="8" rx="6" ry="12" fill="url(#ghWisteriaGrad)" opacity="0.9" />
                  <ellipse cx="0" cy="24" rx="5" ry="10" fill="url(#ghWisteriaGrad)" opacity="0.8" />
                  <ellipse cx="0" cy="38" rx="4" ry="8" fill="url(#ghWisteriaGrad)" opacity="0.7" />
                  <ellipse cx="0" cy="50" rx="3" ry="6" fill="url(#ghWisteriaGrad)" opacity="0.6" />
                </g>
              );
            }
          )}
        </svg>
      </div>

      {/* Left Cast-Iron Fluted Conservatory Column */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: 'clamp(18px, 2.8vw, 38px)',
          zIndex: 35,
          background: 'linear-gradient(90deg, #1C0F2B 0%, #301B46 50%, #150A21 100%)',
          borderRight: `2px solid ${primaryColor}77`,
          boxShadow: '4px 0 20px rgba(0,0,0,0.85), inset 0 0 10px rgba(226, 200, 137, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-around',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: '60%',
              height: '30px',
              border: `1px solid ${primaryColor}44`,
              borderRadius: '3px',
              background: 'rgba(226, 200, 137, 0.08)',
            }}
          />
        ))}
      </div>

      {/* Right Cast-Iron Fluted Conservatory Column */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: 'clamp(18px, 2.8vw, 38px)',
          zIndex: 35,
          background: 'linear-gradient(270deg, #1C0F2B 0%, #301B46 50%, #150A21 100%)',
          borderLeft: `2px solid ${primaryColor}77`,
          boxShadow: '-4px 0 20px rgba(0,0,0,0.85), inset 0 0 10px rgba(226, 200, 137, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-around',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: '60%',
              height: '30px',
              border: `1px solid ${primaryColor}44`,
              borderRadius: '3px',
              background: 'rgba(226, 200, 137, 0.08)',
            }}
          />
        ))}
      </div>

      {/* ─── 50VW LEFT & 50VW RIGHT FULL-SCREEN CRYSTAL DOUBLE DOORS ─── */}
      <div
        onClick={handleOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpen();
          }
        }}
        aria-label="Click to Open Conservatory Doors"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          cursor: isOpen ? 'default' : 'pointer',
          zIndex: 10,
        }}
      >
        {/* Center Vertical Seam Luminous Ray */}
        {!isOpen && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: '50%',
              width: '2px',
              transform: 'translateX(-50%)',
              background: `linear-gradient(to bottom, transparent 0%, ${primaryColor} 30%, #FFF1C5 50%, ${primaryColor} 70%, transparent 100%)`,
              zIndex: 28,
              pointerEvents: 'none',
              animation: 'seamPulse 3s ease-in-out infinite',
            }}
          />
        )}

        {/* ─── LEFT FULL-SCREEN CRYSTAL DOOR ─── */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '50%',
            height: '100%',
            transformOrigin: 'left center',
            transformStyle: 'preserve-3d',
            transform: isOpen ? 'rotateY(-108deg) translateZ(30px)' : 'rotateY(0deg)',
            transition: 'transform 1.8s cubic-bezier(0.2, 1, 0.38, 1)',
            willChange: 'transform',
            overflow: 'hidden',
            zIndex: 10,
            borderRight: '1px solid rgba(226, 200, 137, 0.55)',
            background:
              'linear-gradient(135deg, rgba(32, 18, 52, 0.94) 0%, rgba(18, 9, 32, 0.96) 60%, rgba(9, 4, 16, 0.98) 100%)',
            boxShadow: 'inset 0 0 80px rgba(0,0,0,0.9), inset 0 0 30px rgba(226, 200, 137, 0.15)',
            boxSizing: 'border-box',
            padding: 'clamp(20px, 4vh, 50px) clamp(16px, 2.5vw, 36px)',
          }}
        >
          {/* Victorian Multi-Pane Crystal Grid (Spans Full Height) */}
          <div
            style={{
              width: '100%',
              height: '100%',
              border: `2px solid ${primaryColor}55`,
              borderRadius: '6px',
              padding: '6px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gridTemplateRows: 'repeat(6, 1fr)',
              gap: '6px',
              boxSizing: 'border-box',
              background: 'rgba(255, 255, 255, 0.02)',
              boxShadow: 'inset 0 0 35px rgba(0, 0, 0, 0.7)',
            }}
          >
            {Array.from({ length: 18 }).map((_, i) => (
              <div
                key={i}
                style={{
                  position: 'relative',
                  border: '1px solid rgba(226, 200, 137, 0.22)',
                  borderRadius: '3px',
                  background:
                    'radial-gradient(circle at 35% 35%, rgba(226, 200, 137, 0.08) 0%, rgba(255, 255, 255, 0.02) 60%, transparent 100%)',
                  boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.1)',
                  overflow: 'hidden',
                }}
              >
                {/* Diagonal Specular Facet Line */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-30%',
                    left: '-30%',
                    width: '160%',
                    height: '160%',
                    background:
                      'linear-gradient(45deg, transparent 40%, rgba(255, 245, 220, 0.09) 48%, rgba(255, 255, 255, 0.18) 50%, transparent 52%)',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Left Door Antique Brass Center Handle */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              right: '8px',
              transform: 'translateY(-50%)',
              width: 'clamp(14px, 1.6vw, 22px)',
              height: 'clamp(80px, 14vh, 120px)',
              background: `linear-gradient(180deg, #FFF1C5 0%, ${primaryColor} 45%, #7A5D18 100%)`,
              borderRadius: '9999px',
              boxShadow: '0 0 18px rgba(226, 200, 137, 0.9), 0 4px 12px rgba(0,0,0,0.85)',
              border: '1px solid #4A380C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 25,
            }}
          >
            {/* Center Crystal Gem Inset */}
            <div
              style={{
                width: '6px',
                height: '40%',
                borderRadius: '9999px',
                background: '#FFF8EA',
                boxShadow: '0 0 8px #FFF8EA',
              }}
            />
          </div>
        </div>

        {/* ─── RIGHT FULL-SCREEN CRYSTAL DOOR ─── */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '50%',
            height: '100%',
            transformOrigin: 'right center',
            transformStyle: 'preserve-3d',
            transform: isOpen ? 'rotateY(108deg) translateZ(30px)' : 'rotateY(0deg)',
            transition: 'transform 1.8s cubic-bezier(0.2, 1, 0.38, 1)',
            willChange: 'transform',
            overflow: 'hidden',
            zIndex: 10,
            borderLeft: '1px solid rgba(226, 200, 137, 0.55)',
            background:
              'linear-gradient(225deg, rgba(32, 18, 52, 0.94) 0%, rgba(18, 9, 32, 0.96) 60%, rgba(9, 4, 16, 0.98) 100%)',
            boxShadow: 'inset 0 0 80px rgba(0,0,0,0.9), inset 0 0 30px rgba(226, 200, 137, 0.15)',
            boxSizing: 'border-box',
            padding: 'clamp(20px, 4vh, 50px) clamp(16px, 2.5vw, 36px)',
          }}
        >
          {/* Victorian Multi-Pane Crystal Grid (Spans Full Height) */}
          <div
            style={{
              width: '100%',
              height: '100%',
              border: `2px solid ${primaryColor}55`,
              borderRadius: '6px',
              padding: '6px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gridTemplateRows: 'repeat(6, 1fr)',
              gap: '6px',
              boxSizing: 'border-box',
              background: 'rgba(255, 255, 255, 0.02)',
              boxShadow: 'inset 0 0 35px rgba(0, 0, 0, 0.7)',
            }}
          >
            {Array.from({ length: 18 }).map((_, i) => (
              <div
                key={i}
                style={{
                  position: 'relative',
                  border: '1px solid rgba(226, 200, 137, 0.22)',
                  borderRadius: '3px',
                  background:
                    'radial-gradient(circle at 35% 35%, rgba(226, 200, 137, 0.08) 0%, rgba(255, 255, 255, 0.02) 60%, transparent 100%)',
                  boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.1)',
                  overflow: 'hidden',
                }}
              >
                {/* Diagonal Specular Facet Line */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-30%',
                    left: '-30%',
                    width: '160%',
                    height: '160%',
                    background:
                      'linear-gradient(45deg, transparent 40%, rgba(255, 245, 220, 0.09) 48%, rgba(255, 255, 255, 0.18) 50%, transparent 52%)',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Right Door Antique Brass Center Handle */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '8px',
              transform: 'translateY(-50%)',
              width: 'clamp(14px, 1.6vw, 22px)',
              height: 'clamp(80px, 14vh, 120px)',
              background: `linear-gradient(180deg, #FFF1C5 0%, ${primaryColor} 45%, #7A5D18 100%)`,
              borderRadius: '9999px',
              boxShadow: '0 0 18px rgba(226, 200, 137, 0.9), 0 4px 12px rgba(0,0,0,0.85)',
              border: '1px solid #4A380C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 25,
            }}
          >
            {/* Center Crystal Gem Inset */}
            <div
              style={{
                width: '6px',
                height: '40%',
                borderRadius: '9999px',
                background: '#FFF8EA',
                boxShadow: '0 0 8px #FFF8EA',
              }}
            />
          </div>
        </div>
      </div>

      {/* ─── CENTRAL HERALDIC INVITATION CARTOUCHE (Full Screen Focal Point) ─── */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: isOpen
            ? 'translate(-50%, -50%) scale(1.08)'
            : 'translate(-50%, -50%) scale(1)',
          opacity: isOpen ? 0 : 1,
          transition: 'all 0.8s cubic-bezier(0.2, 1, 0.38, 1)',
          pointerEvents: isOpen ? 'none' : 'auto',
          zIndex: 30,
          width: '100%',
          maxWidth: 'min(520px, 90vw)',
          padding: '0 16px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* Frosted Crystal Medallion Card */}
        <div
          style={{
            width: '100%',
            background: 'rgba(16, 8, 28, 0.86)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: `1.5px solid ${primaryColor}`,
            borderRadius: '24px',
            padding: 'clamp(20px, 3.5vh, 36px) clamp(18px, 4vw, 36px)',
            boxShadow:
              '0 24px 60px rgba(0,0,0,0.92), 0 0 45px rgba(226, 200, 137, 0.25), inset 0 1px 2px rgba(255,255,255,0.25)',
            position: 'relative',
          }}
        >
          {/* Header Tag */}
          <div
            style={{
              textTransform: 'uppercase',
              letterSpacing: '3px',
              fontSize: 'clamp(0.65rem, 1.6vw, 0.75rem)',
              color: primaryColor,
              marginBottom: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 700,
            }}
          >
            <Sparkles size={14} color={primaryColor} />
            <span>The Crystal Conservatory Celebration</span>
            <Sparkles size={14} color={primaryColor} />
          </div>

          {/* Couple Names */}
          <CoupleTitle
            as="h1"
            title={title}
            flourishColor="#E2C889"
            style={{
              fontSize: 'clamp(1.7rem, 4.2vw, 2.7rem)',
              color: '#FFF6E9',
              lineHeight: 1.18,
              fontWeight: 700,
              textShadow:
                '0 4px 24px rgba(0,0,0,0.85), 0 0 28px rgba(226, 200, 137, 0.45)',
              margin: '0 0 12px 0',
              fontFamily: "'Cinzel', serif",
            }}
          />

          {/* Subtitle */}
          <p
            style={{
              fontSize: 'clamp(0.85rem, 1.8vw, 0.98rem)',
              color: '#D4B8E8',
              fontStyle: 'italic',
              lineHeight: 1.5,
              margin: '0 0 18px 0',
              fontFamily: "'Cormorant Garamond', Georgia, serif",
            }}
          >
            "{subtitle}"
          </p>

          {/* Date and Venue Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 16px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(226, 200, 137, 0.3)',
              color: '#FFF1C5',
              fontSize: 'clamp(0.75rem, 1.6vw, 0.85rem)',
              marginBottom: '22px',
            }}
          >
            <span>{date}</span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span>{venue}</span>
          </div>

          {/* Glowing Unlatch Button */}
          <div>
            <button
              type="button"
              onClick={handleOpen}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: 'clamp(10px, 2vh, 14px) clamp(24px, 4vw, 36px)',
                borderRadius: '9999px',
                background: `linear-gradient(135deg, ${primaryColor} 0%, #B686DB 100%)`,
                border: 'none',
                color: '#0E0518',
                fontWeight: 800,
                fontSize: 'clamp(0.82rem, 1.8vw, 0.95rem)',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: `0 8px 30px ${primaryColor}66, 0 0 20px #B686DB55`,
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.04)';
                e.currentTarget.style.boxShadow = `0 12px 36px ${primaryColor}99, 0 0 28px #B686DB88`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = `0 8px 30px ${primaryColor}66, 0 0 20px #B686DB55`;
              }}
            >
              <Sparkles size={16} />
              <span>Open Crystal Conservatory</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
