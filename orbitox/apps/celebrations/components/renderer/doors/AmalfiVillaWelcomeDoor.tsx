'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sun, ArrowRight, Heart } from 'lucide-react';
import { CoupleTitle } from '../CoupleTitle';

interface AmalfiVillaWelcomeDoorProps {
  title: string;
  subtitle?: string;
  date?: string;
  venue?: string;
  primaryColor?: string;
  onFinish?: () => void;
}

// Synthesize warm Mediterranean acoustic bell & guitar chord chime
function playAmalfiChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    // Italian Major Chord arpeggio (A maj: A3, C#4, E4, A4, C#5, E5)
    const freqs = [220.0, 277.18, 329.63, 440.0, 554.37, 659.25];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, ctx.currentTime + idx * 0.1);

      gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.1);
      gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + idx * 0.1 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.1 + 2.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.1);
      osc.stop(ctx.currentTime + idx * 0.1 + 2.6);
    });
  } catch {
    // Silently proceed
  }
}

export function AmalfiVillaWelcomeDoor({
  title,
  subtitle = 'Benvenuti alla nostra celebrazione sul mare',
  date = 'February 14, 2027',
  venue = 'Villa Belmondo, Positano',
  primaryColor = '#E8B86D',
  onFinish,
}: AmalfiVillaWelcomeDoorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Background floating sun motes and bougainvillea petals
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

    const particles = Array.from({ length: 45 }).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      size: 1.5 + Math.random() * 3,
      vx: (Math.random() - 0.4) * 0.6,
      vy: 0.3 + Math.random() * 0.6,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      isPetal: Math.random() > 0.4,
      alpha: 0.3 + Math.random() * 0.6,
    }));

    const render = () => {
      ctx.clearRect(0, 0, w, h);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rotSpeed;

        if (p.y > h + 20) {
          p.y = -20;
          p.x = Math.random() * w;
        }
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);

        if (p.isPetal) {
          ctx.fillStyle = `rgba(216, 74, 117, ${p.alpha})`;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 2, p.size, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(245, 215, 160, ${p.alpha})`;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
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
    playAmalfiChime();
    setIsOpen(true);

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
        backgroundColor: '#0E0604',
        backgroundImage:
          'radial-gradient(circle at 50% 40%, rgba(216, 74, 117, 0.35) 0%, rgba(14, 6, 4, 0.98) 78%)',
        overflow: 'hidden',
        fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif",
        perspective: '1800px',
        perspectiveOrigin: '50% 50%',
        opacity: isFadingOut ? 0 : 1,
        transition: 'opacity 0.7s cubic-bezier(0.2, 1, 0.38, 1)',
      }}
    >
      {/* Background Interactive Canvas */}
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

      {/* Rotating Volumetric Sunset God Rays */}
      <div
        style={{
          position: 'absolute',
          width: '120vmax',
          height: '120vmax',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background:
            'conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(232, 184, 109, 0.06) 25deg, transparent 50deg, rgba(216, 74, 117, 0.06) 75deg, transparent 100deg, rgba(232, 184, 109, 0.05) 150deg, transparent 200deg, rgba(216, 74, 117, 0.05) 250deg, transparent 300deg, rgba(232, 184, 109, 0.06) 330deg, transparent 360deg)',
          animation: 'amalfiSpin 65s linear infinite',
          pointerEvents: 'none',
          zIndex: 2,
          opacity: 0.75,
        }}
      />
      <style>{`
        @keyframes amalfiSpin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes bougainvilleaSway {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(1.4deg); }
        }
        @keyframes amalfiSeamGlow {
          0%, 100% { opacity: 0.65; box-shadow: 0 0 20px rgba(232, 184, 109, 0.6); }
          50% { opacity: 1; box-shadow: 0 0 40px rgba(232, 184, 109, 0.95), 0 0 25px rgba(216, 74, 117, 0.9); }
        }
      `}</style>

      {/* Skip Button */}
      <button
        onClick={handleSkip}
        type="button"
        aria-label="Skip Gate Animation"
        className="celestial-btn-tactile"
        style={{
          position: 'absolute',
          top: 'max(16px, env(safe-area-inset-top, 16px))',
          right: 'max(16px, env(safe-area-inset-right, 16px))',
          zIndex: 60,
          background: 'rgba(32, 14, 10, 0.85)',
          border: `1px solid ${primaryColor}77`,
          borderRadius: '9999px',
          padding: '8px 16px',
          color: '#FFF2DD',
          fontSize: '0.68rem',
          fontWeight: 700,
          letterSpacing: '1px',
          textTransform: 'uppercase',
          cursor: 'pointer',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          touchAction: 'manipulation',
          minHeight: '38px',
        }}
      >
        <span>Skip</span>
        <ArrowRight size={12} />
      </button>

      {/* ─── FULL-BLEED ARCHITECTURAL TERRACOTTA PERGOLA & BOUGAINVILLEA ─── */}

      {/* Top Stone Cornice & Majolica Frieze with Bougainvillea Canopy */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 'clamp(95px, 15vh, 150px)',
          zIndex: 40,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Full-width Garland SVG */}
        <svg
          viewBox="0 0 1440 150"
          preserveAspectRatio="none"
          style={{
            width: '100%',
            height: '100%',
            animation: 'bougainvilleaSway 7s ease-in-out infinite',
            transformOrigin: 'top center',
          }}
        >
          <defs>
            <linearGradient id="amPergolaStone" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2D1510" />
              <stop offset="100%" stopColor="#1B0B07" />
            </linearGradient>
            <linearGradient id="amBougPetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF70A6" />
              <stop offset="50%" stopColor="#E6396E" />
              <stop offset="100%" stopColor="#A81845" />
            </linearGradient>
            <linearGradient id="amTileGold" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(232, 184, 109, 0.3)" />
              <stop offset="50%" stopColor="#E8B86D" />
              <stop offset="100%" stopColor="rgba(232, 184, 109, 0.3)" />
            </linearGradient>
          </defs>

          {/* Heavy Stone Pergola Archway Beam */}
          <path
            d="M 0 0 L 1440 0 L 1440 32 Q 720 76 0 32 Z"
            fill="url(#amPergolaStone)"
            stroke="url(#amTileGold)"
            strokeWidth="2.5"
          />

          {/* Majolica Ceramic Tile Emblem Dots along Arch Beam */}
          {[100, 220, 340, 460, 580, 700, 740, 860, 980, 1100, 1220, 1340].map((x, i) => (
            <g key={i} transform={`translate(${x}, ${24 + Math.sin((x / 1440) * Math.PI) * 20})`}>
              <circle cx="0" cy="0" r="5" fill="#E8B86D" />
              <circle cx="0" cy="0" r="2.5" fill="#1B0B07" />
            </g>
          ))}

          {/* Dense Blooming Magenta Bougainvillea Clusters spanning edge-to-edge */}
          {[50, 130, 210, 290, 370, 450, 530, 610, 690, 720, 750, 830, 910, 990, 1070, 1150, 1230, 1310, 1390].map(
            (x, i) => {
              const baseY = 28 + Math.sin((x / 1440) * Math.PI) * 36;
              return (
                <g key={i} transform={`translate(${x}, ${baseY})`}>
                  {/* Stem & Leaves */}
                  <line x1="0" y1="-12" x2="0" y2="16" stroke="#4A2E1A" strokeWidth="1.8" />
                  <ellipse cx="-4" cy="8" rx="4" ry="7" fill="#3D5A34" opacity="0.8" />
                  <ellipse cx="5" cy="12" rx="4" ry="7" fill="#3D5A34" opacity="0.8" />

                  {/* 3-Bract Bougainvillea Florets */}
                  <ellipse cx="-5" cy="18" rx="6" ry="11" fill="url(#amBougPetal)" />
                  <ellipse cx="5" cy="18" rx="6" ry="11" fill="url(#amBougPetal)" />
                  <ellipse cx="0" cy="24" rx="6" ry="11" fill="url(#amBougPetal)" />
                  <circle cx="0" cy="18" r="2" fill="#FFF7DE" />
                </g>
              );
            }
          )}
        </svg>
      </div>

      {/* Left Terracotta Masonry Pillar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: 'clamp(20px, 3.2vw, 42px)',
          zIndex: 35,
          background: 'linear-gradient(90deg, #2A140F 0%, #442218 50%, #200E0A 100%)',
          borderRight: `2px solid ${primaryColor}77`,
          boxShadow: '4px 0 22px rgba(0,0,0,0.88), inset 0 0 12px rgba(232, 184, 109, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-around',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: '65%',
              height: '24px',
              border: `1px solid ${primaryColor}44`,
              borderRadius: '2px',
              background: 'rgba(232, 184, 109, 0.08)',
            }}
          />
        ))}
      </div>

      {/* Right Terracotta Masonry Pillar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: 'clamp(20px, 3.2vw, 42px)',
          zIndex: 35,
          background: 'linear-gradient(270deg, #2A140F 0%, #442218 50%, #200E0A 100%)',
          borderLeft: `2px solid ${primaryColor}77`,
          boxShadow: '-4px 0 22px rgba(0,0,0,0.88), inset 0 0 12px rgba(232, 184, 109, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-around',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: '65%',
              height: '24px',
              border: `1px solid ${primaryColor}44`,
              borderRadius: '2px',
              background: 'rgba(232, 184, 109, 0.08)',
            }}
          />
        ))}
      </div>

      {/* ─── 50VW LEFT & 50VW RIGHT FULL-SCREEN ITALIAN VILLA GATES ─── */}
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
        aria-label="Click to Unlatch Villa Gates"
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
              background: `linear-gradient(to bottom, transparent 0%, ${primaryColor} 25%, #FF70A6 50%, ${primaryColor} 75%, transparent 100%)`,
              zIndex: 28,
              pointerEvents: 'none',
              animation: 'amalfiSeamGlow 3s ease-in-out infinite',
            }}
          />
        )}

        {/* ─── LEFT FULL-SCREEN WROUGHT-IRON GATE ─── */}
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
            borderRight: '1px solid rgba(232, 184, 109, 0.65)',
            background:
              'linear-gradient(135deg, rgba(38, 18, 14, 0.95) 0%, rgba(24, 11, 8, 0.97) 50%, rgba(14, 6, 4, 0.99) 100%)',
            boxShadow: 'inset 0 0 90px rgba(0,0,0,0.92), inset 0 0 35px rgba(232, 184, 109, 0.15)',
            boxSizing: 'border-box',
            padding: 'clamp(24px, 4.5vh, 56px) clamp(16px, 2.5vw, 36px)',
          }}
        >
          {/* Authentic Italian Wrought-Iron Grillework */}
          <div
            style={{
              width: '100%',
              height: '100%',
              border: `2px solid ${primaryColor}55`,
              borderRadius: '6px',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
              background: 'rgba(255, 255, 255, 0.015)',
              boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.75)',
            }}
          >
            {/* Top Arched Wrought-Iron Scrolls */}
            <div
              style={{
                height: '24%',
                borderBottom: `1.5px solid ${primaryColor}44`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                padding: '4px',
              }}
            >
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    width: '22%',
                    height: '80%',
                    border: `1.5px solid ${primaryColor}55`,
                    borderRadius: '50% 50% 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: primaryColor,
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Middle Vertical Iron Bars with Rosettes */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                padding: '12px 0',
              }}
            >
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  style={{
                    width: '3px',
                    height: '100%',
                    background: `linear-gradient(180deg, ${primaryColor} 0%, rgba(232, 184, 109, 0.3) 50%, ${primaryColor} 100%)`,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* Rosette Stud at Center */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      background: '#FFF2DD',
                      border: `1px solid ${primaryColor}`,
                      boxShadow: '0 0 6px rgba(232, 184, 109, 0.8)',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Bottom Wrought-Iron Scrolls Base */}
            <div
              style={{
                height: '24%',
                borderTop: `1.5px solid ${primaryColor}44`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                padding: '4px',
              }}
            >
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    width: '22%',
                    height: '80%',
                    border: `1.5px solid ${primaryColor}55`,
                    borderRadius: '0 0 50% 50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: primaryColor,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Left Door Heavy Bronze Center Handle */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              right: '8px',
              transform: 'translateY(-50%)',
              width: 'clamp(14px, 1.6vw, 22px)',
              height: 'clamp(80px, 14vh, 120px)',
              background: `linear-gradient(180deg, #FFF2DD 0%, ${primaryColor} 45%, #6E381E 100%)`,
              borderRadius: '9999px',
              boxShadow: '0 0 18px rgba(232, 184, 109, 0.9), 0 4px 12px rgba(0,0,0,0.85)',
              border: '1px solid #3E1E10',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 25,
            }}
          >
            {/* Center Terracotta Core */}
            <div
              style={{
                width: '6px',
                height: '40%',
                borderRadius: '9999px',
                background: '#D84A75',
                boxShadow: '0 0 8px #D84A75',
              }}
            />
          </div>
        </div>

        {/* ─── RIGHT FULL-SCREEN WROUGHT-IRON GATE ─── */}
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
            borderLeft: '1px solid rgba(232, 184, 109, 0.65)',
            background:
              'linear-gradient(225deg, rgba(38, 18, 14, 0.95) 0%, rgba(24, 11, 8, 0.97) 50%, rgba(14, 6, 4, 0.99) 100%)',
            boxShadow: 'inset 0 0 90px rgba(0,0,0,0.92), inset 0 0 35px rgba(232, 184, 109, 0.15)',
            boxSizing: 'border-box',
            padding: 'clamp(24px, 4.5vh, 56px) clamp(16px, 2.5vw, 36px)',
          }}
        >
          {/* Authentic Italian Wrought-Iron Grillework */}
          <div
            style={{
              width: '100%',
              height: '100%',
              border: `2px solid ${primaryColor}55`,
              borderRadius: '6px',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
              background: 'rgba(255, 255, 255, 0.015)',
              boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.75)',
            }}
          >
            {/* Top Arched Wrought-Iron Scrolls */}
            <div
              style={{
                height: '24%',
                borderBottom: `1.5px solid ${primaryColor}44`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                padding: '4px',
              }}
            >
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    width: '22%',
                    height: '80%',
                    border: `1.5px solid ${primaryColor}55`,
                    borderRadius: '50% 50% 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: primaryColor,
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Middle Vertical Iron Bars with Rosettes */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                padding: '12px 0',
              }}
            >
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  style={{
                    width: '3px',
                    height: '100%',
                    background: `linear-gradient(180deg, ${primaryColor} 0%, rgba(232, 184, 109, 0.3) 50%, ${primaryColor} 100%)`,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* Rosette Stud at Center */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      background: '#FFF2DD',
                      border: `1px solid ${primaryColor}`,
                      boxShadow: '0 0 6px rgba(232, 184, 109, 0.8)',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Bottom Wrought-Iron Scrolls Base */}
            <div
              style={{
                height: '24%',
                borderTop: `1.5px solid ${primaryColor}44`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                padding: '4px',
              }}
            >
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    width: '22%',
                    height: '80%',
                    border: `1.5px solid ${primaryColor}55`,
                    borderRadius: '0 0 50% 50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: primaryColor,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Right Door Heavy Bronze Center Handle */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '8px',
              transform: 'translateY(-50%)',
              width: 'clamp(14px, 1.6vw, 22px)',
              height: 'clamp(80px, 14vh, 120px)',
              background: `linear-gradient(180deg, #FFF2DD 0%, ${primaryColor} 45%, #6E381E 100%)`,
              borderRadius: '9999px',
              boxShadow: '0 0 18px rgba(232, 184, 109, 0.9), 0 4px 12px rgba(0,0,0,0.85)',
              border: '1px solid #3E1E10',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 25,
            }}
          >
            {/* Center Terracotta Core */}
            <div
              style={{
                width: '6px',
                height: '40%',
                borderRadius: '9999px',
                background: '#D84A75',
                boxShadow: '0 0 8px #D84A75',
              }}
            />
          </div>
        </div>
      </div>

      {/* ─── CENTRAL GILDED ITALIAN PLAQUE (Full Screen Focal Point) ─── */}
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
        {/* Terracotta and Gilded Medallion Plaque */}
        <div
          style={{
            width: '100%',
            maxHeight: 'min(90dvh, 840px)',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            background: 'rgba(24, 11, 8, 0.88)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: `1.5px solid ${primaryColor}`,
            borderRadius: '24px',
            padding: 'clamp(20px, 3.5vh, 36px) clamp(18px, 4vw, 36px)',
            boxShadow:
              '0 24px 60px rgba(0,0,0,0.92), 0 0 45px rgba(232, 184, 109, 0.25), inset 0 1px 2px rgba(255,255,255,0.22)',
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
            <Sun size={14} color={primaryColor} />
            <span>Villa Belmondo • Costiera Amalfitana</span>
            <Sun size={14} color={primaryColor} />
          </div>

          {/* Couple Names */}
          <CoupleTitle
            as="h1"
            title={title}
            flourishColor="#E8B86D"
            style={{
              fontSize: 'clamp(1.7rem, 4.2vw, 2.7rem)',
              color: '#FFF2DD',
              lineHeight: 1.18,
              fontWeight: 700,
              textShadow:
                '0 4px 24px rgba(0,0,0,0.85), 0 0 28px rgba(232, 184, 109, 0.45)',
              margin: '0 0 12px 0',
              fontFamily: "'Playfair Display', Georgia, serif",
            }}
          />

          {/* Subtitle */}
          <p
            style={{
              fontSize: 'clamp(0.85rem, 1.8vw, 0.98rem)',
              color: '#F0C2A0',
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
              border: '1px solid rgba(232, 184, 109, 0.3)',
              color: '#FFF2DD',
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
              className="celestial-btn-tactile"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: 'clamp(12px, 2vh, 16px) clamp(24px, 4vw, 36px)',
                borderRadius: '9999px',
                background: `linear-gradient(135deg, ${primaryColor} 0%, #D84A75 100%)`,
                border: 'none',
                color: '#160805',
                fontWeight: 800,
                fontSize: 'clamp(0.82rem, 1.8vw, 0.95rem)',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: `0 8px 30px ${primaryColor}66, 0 0 20px #D84A7566`,
                width: '100%',
                minHeight: '48px',
                touchAction: 'manipulation',
              }}
            >
              <Heart size={16} fill="#160805" />
              <span>Unlatch Villa Belmondo Gates</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
