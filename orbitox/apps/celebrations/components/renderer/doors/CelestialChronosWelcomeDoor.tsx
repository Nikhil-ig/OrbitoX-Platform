'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, Compass, Clock, Disc } from 'lucide-react';
import { CoupleTitle } from '../CoupleTitle';

interface CelestialChronosWelcomeDoorProps {
  title: string;
  subtitle?: string;
  date?: string;
  venue?: string;
  primaryColor?: string;
  onFinish?: () => void;
}

// Synthesize precision mechanical chronograph escapement ticks and celestial chord
function playChronoEscapementAndChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;

    // 1. Rapid mechanical escapement gear clicks (10 micro-ticks)
    for (let i = 0; i < 10; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const tickTime = now + i * 0.055;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400 + (i % 2 === 0 ? 350 : -200), tickTime);

      gain.gain.setValueAtTime(0, tickTime);
      gain.gain.linearRampToValueAtTime(0.18, tickTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, tickTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(tickTime);
      osc.stop(tickTime + 0.045);
    }

    // 2. Resonant celestial harp chord after unlocking
    const chordNotes = [329.63, 392.0, 493.88, 659.25, 987.77]; // E4, G4, B4, E5, B5 (E minor 9 / celestial)
    chordNotes.forEach((freq, idx) => {
      const chordOsc = ctx.createOscillator();
      const chordGain = ctx.createGain();
      const startTime = now + 0.6 + idx * 0.08;

      chordOsc.type = 'sine';
      chordOsc.frequency.setValueAtTime(freq, startTime);

      chordGain.gain.setValueAtTime(0, startTime);
      chordGain.gain.linearRampToValueAtTime(0.2, startTime + 0.06);
      chordGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 2.8);

      chordOsc.connect(chordGain);
      chordGain.connect(ctx.destination);

      chordOsc.start(startTime);
      chordOsc.stop(startTime + 3.0);
    });
  } catch {
    // Gracefully ignore autoplay restrictions
  }
}

export function CelestialChronosWelcomeDoor({
  title,
  subtitle = 'The Celestial Convergence Under the Midnight Stars',
  date = 'December 18, 2026',
  venue = "Villa d'Este & Grand Lake View, Lake Como",
  primaryColor = '#E8A598',
  onFinish,
}: CelestialChronosWelcomeDoorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [astrolabeAngle, setAstrolabeAngle] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Background floating stars & rose-gold stardust
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

    const particles = Array.from({ length: 65 }).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.8 + Math.random() * 2.2,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -(0.15 + Math.random() * 0.4),
      alpha: 0.2 + Math.random() * 0.7,
      pulse: Math.random() * Math.PI * 2,
      color: Math.random() > 0.4 ? '#E8A598' : '#FFF5EA',
    }));

    const render = () => {
      ctx.clearRect(0, 0, w, h);

      particles.forEach((p) => {
        p.pulse += 0.025;
        p.x += p.vx;
        p.y += p.vy;

        if (p.y < -10) p.y = h + 10;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;

        const currentAlpha = Math.max(0.1, Math.min(1, p.alpha + Math.sin(p.pulse) * 0.25));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = currentAlpha;
        ctx.fill();

        // Subtle glow halo on larger motes
        if (p.r > 1.8) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = '#E8A598';
          ctx.globalAlpha = currentAlpha * 0.25;
          ctx.fill();
        }
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Idle continuous slow rotation of astrolabe
  useEffect(() => {
    if (isOpen || isUnlocking) return;
    const interval = setInterval(() => {
      setAstrolabeAngle((prev) => (prev + 0.4) % 360);
    }, 40);
    return () => clearInterval(interval);
  }, [isOpen, isUnlocking]);

  const handleOpen = () => {
    if (isUnlocking || isOpen) return;
    setIsUnlocking(true);
    playChronoEscapementAndChime();

    // Fast spin astrolabe during unlock
    setAstrolabeAngle((prev) => prev + 720);

    setTimeout(() => {
      setIsOpen(true);
      setIsUnlocking(false);

      setTimeout(() => {
        setIsFadingOut(true);
        setTimeout(() => {
          setIsDismissed(true);
          onFinish?.();
        }, 800);
      }, 1600);
    }, 900);
  };

  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      setIsDismissed(true);
      onFinish?.();
    }, 400);
  };

  if (isDismissed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#07080D',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        perspective: '1800px',
        overflow: 'hidden',
        opacity: isFadingOut ? 0 : 1,
        transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Background Starfield & Rose-Gold Dust Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Atmospheric Radial Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          pointerEvents: 'none',
          background:
            'radial-gradient(circle at center, rgba(232, 165, 152, 0.08) 0%, rgba(7, 8, 13, 0.75) 50%, #07080D 90%)',
        }}
      />

      {/* Skip Button */}
      <button
        type="button"
        onClick={handleSkip}
        className="celestial-btn-tactile"
        style={{
          position: 'absolute',
          top: 'calc(clamp(12px, 2vh, 24px) + env(safe-area-inset-top, 0px))',
          right: 'calc(clamp(12px, 2vw, 24px) + env(safe-area-inset-right, 0px))',
          zIndex: 50,
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(232, 165, 152, 0.35)',
          color: '#E8A598',
          fontSize: 'clamp(0.7rem, 1.8vw, 0.8rem)',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          padding: '8px 16px',
          borderRadius: '9999px',
          cursor: 'pointer',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          touchAction: 'manipulation',
          minHeight: '38px',
        }}
      >
        <span>Enter Directly</span>
        <ArrowRight size={12} />
      </button>

      {/* 3D GATES STAGE CONTAINER */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '1200px',
          height: '100%',
          maxHeight: '940px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transformStyle: 'preserve-3d',
          zIndex: 10,
          padding: 'clamp(10px, 2vw, 20px)',
        }}
      >
        {/* LEFT GATE WING (Titanium, Iso-Grid & Rose Gold Guilloché) */}
        <div
          style={{
            position: 'absolute',
            left: '2%',
            width: '48%',
            height: '88%',
            top: '6%',
            transformOrigin: 'left center',
            transform: isOpen ? 'rotateY(-92deg)' : 'rotateY(0deg)',
            transition: 'transform 1.8s cubic-bezier(0.16, 1, 0.3, 1)',
            borderRadius: '24px 0 0 24px',
            background: 'linear-gradient(135deg, #181B26 0%, #10121A 60%, #0A0C12 100%)',
            border: '2px solid rgba(232, 165, 152, 0.45)',
            borderRight: '1px solid rgba(232, 165, 152, 0.2)',
            boxShadow: isOpen
              ? 'none'
              : '-15px 25px 60px rgba(0, 0, 0, 0.9), inset 0 0 30px rgba(232, 165, 152, 0.1)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 'clamp(16px, 3vw, 40px)',
          }}
        >
          {/* Iso-Grid Aerospace Lattice Overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.12,
              backgroundImage: `repeating-linear-gradient(60deg, rgba(232, 165, 152, 0.4) 0, rgba(232, 165, 152, 0.4) 1px, transparent 0, transparent 40px),
                repeating-linear-gradient(120deg, rgba(232, 165, 152, 0.4) 0, rgba(232, 165, 152, 0.4) 1px, transparent 0, transparent 40px),
                repeating-linear-gradient(0deg, rgba(232, 165, 152, 0.4) 0, rgba(232, 165, 152, 0.4) 1px, transparent 0, transparent 40px)`,
              pointerEvents: 'none',
            }}
          />

          {/* Rose Gold Filigree Arch Trim */}
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              right: '16px',
              height: '60px',
              borderTop: '2px solid rgba(232, 165, 152, 0.6)',
              borderLeft: '2px solid rgba(232, 165, 152, 0.6)',
              borderRadius: '20px 0 0 0',
              pointerEvents: 'none',
            }}
          />

          {/* Left Wing Upper Roman Numerals */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <span
              style={{
                fontFamily: 'serif',
                fontSize: 'clamp(0.58rem, 1.4vw, 0.75rem)',
                letterSpacing: '2.5px',
                color: 'rgba(232, 165, 152, 0.65)',
                textTransform: 'uppercase',
                display: 'block',
              }}
            >
              CHRONOS • MMXXVI
            </span>
          </div>

          {/* Left Gate Center Decorative Medallion Half */}
          <div
            style={{
              position: 'absolute',
              right: '-30px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '60px',
              height: '120px',
              borderRadius: '0 60px 60px 0',
              border: '2px solid rgba(232, 165, 152, 0.5)',
              borderLeft: 'none',
              background: 'radial-gradient(circle at left center, #242938 0%, #10121A 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingLeft: '8px',
            }}
          >
            <Disc size={22} color="#E8A598" style={{ opacity: 0.7 }} />
          </div>

          {/* Left Wing Base Motto */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <p
              style={{
                fontFamily: 'sans-serif',
                fontSize: 'clamp(0.52rem, 1.2vw, 0.65rem)',
                letterSpacing: '1.5px',
                color: 'rgba(255, 255, 255, 0.35)',
                textTransform: 'uppercase',
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              NULLA TENACI INVIA EST VIA
            </p>
          </div>
        </div>

        {/* RIGHT GATE WING (Titanium, Iso-Grid & Rose Gold Guilloché) */}
        <div
          style={{
            position: 'absolute',
            right: '2%',
            width: '48%',
            height: '88%',
            top: '6%',
            transformOrigin: 'right center',
            transform: isOpen ? 'rotateY(92deg)' : 'rotateY(0deg)',
            transition: 'transform 1.8s cubic-bezier(0.16, 1, 0.3, 1)',
            borderRadius: '0 24px 24px 0',
            background: 'linear-gradient(225deg, #181B26 0%, #10121A 60%, #0A0C12 100%)',
            border: '2px solid rgba(232, 165, 152, 0.45)',
            borderLeft: '1px solid rgba(232, 165, 152, 0.2)',
            boxShadow: isOpen
              ? 'none'
              : '15px 25px 60px rgba(0, 0, 0, 0.9), inset 0 0 30px rgba(232, 165, 152, 0.1)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            padding: 'clamp(16px, 3vw, 40px)',
          }}
        >
          {/* Iso-Grid Aerospace Lattice Overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.12,
              backgroundImage: `repeating-linear-gradient(60deg, rgba(232, 165, 152, 0.4) 0, rgba(232, 165, 152, 0.4) 1px, transparent 0, transparent 40px),
                repeating-linear-gradient(120deg, rgba(232, 165, 152, 0.4) 0, rgba(232, 165, 152, 0.4) 1px, transparent 0, transparent 40px),
                repeating-linear-gradient(0deg, rgba(232, 165, 152, 0.4) 0, rgba(232, 165, 152, 0.4) 1px, transparent 0, transparent 40px)`,
              pointerEvents: 'none',
            }}
          />

          {/* Rose Gold Filigree Arch Trim */}
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              right: '16px',
              height: '60px',
              borderTop: '2px solid rgba(232, 165, 152, 0.6)',
              borderRight: '2px solid rgba(232, 165, 152, 0.6)',
              borderRadius: '0 20px 0 0',
              pointerEvents: 'none',
            }}
          />

          {/* Right Wing Upper Astrological Indicator */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <span
              style={{
                fontFamily: 'serif',
                fontSize: 'clamp(0.58rem, 1.4vw, 0.75rem)',
                letterSpacing: '2.5px',
                color: 'rgba(232, 165, 152, 0.65)',
                textTransform: 'uppercase',
                display: 'block',
              }}
            >
              L&#39;AMOUR INFINI
            </span>
          </div>

          {/* Right Gate Center Decorative Medallion Half */}
          <div
            style={{
              position: 'absolute',
              left: '-30px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '60px',
              height: '120px',
              borderRadius: '60px 0 0 60px',
              border: '2px solid rgba(232, 165, 152, 0.5)',
              borderRight: 'none',
              background: 'radial-gradient(circle at right center, #242938 0%, #10121A 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: '8px',
            }}
          >
            <Clock size={22} color="#E8A598" style={{ opacity: 0.7 }} />
          </div>

          {/* Right Wing Base Coordinates */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <p
              style={{
                fontFamily: 'sans-serif',
                fontSize: 'clamp(0.52rem, 1.2vw, 0.65rem)',
                letterSpacing: '1.5px',
                color: 'rgba(255, 255, 255, 0.35)',
                textTransform: 'uppercase',
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              45° 59&#39; N • 9° 16&#39; E
            </p>
          </div>
        </div>

        {/* CENTER MONUMENTAL CARTOUCHE & ASTROLABE LOCK (Floats in 3D center) */}
        <div
          style={{
            position: 'relative',
            zIndex: 30,
            maxWidth: '540px',
            width: 'min(94%, 540px)',
            maxHeight: 'min(90dvh, 840px)',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: 'clamp(18px, 2.5vh, 36px) clamp(16px, 3.5vw, 36px)',
            borderRadius: 'clamp(18px, 3vw, 28px)',
            background: 'rgba(12, 14, 22, 0.94)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: '2px solid rgba(232, 165, 152, 0.6)',
            boxShadow:
              '0 30px 80px rgba(0, 0, 0, 0.95), 0 0 40px rgba(232, 165, 152, 0.2), inset 0 0 30px rgba(232, 165, 152, 0.08)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transform: isOpen ? 'scale(0.8) translateZ(-200px)' : 'scale(1) translateZ(0px)',
            opacity: isOpen ? 0 : 1,
            transition: 'all 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: isOpen ? 'none' : 'auto',
          }}
        >
          {/* Top Aerospace Emblem Header */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '5px 14px',
              borderRadius: '9999px',
              background: 'rgba(232, 165, 152, 0.12)',
              border: '1px solid rgba(232, 165, 152, 0.35)',
              marginBottom: 'clamp(10px, 1.8vh, 18px)',
            }}
          >
            <Compass size={13} color="#E8A598" />
            <span
              style={{
                fontFamily: 'sans-serif',
                fontSize: 'clamp(0.62rem, 1.8vw, 0.72rem)',
                fontWeight: 600,
                letterSpacing: '2px',
                color: '#FFF5EA',
                textTransform: 'uppercase',
              }}
            >
              Haute Horlogerie • Celestial Gateway
            </span>
          </div>

          {/* Central Rotating Astrolabe Lock Dial */}
          <div
            onClick={handleOpen}
            className="celestial-btn-tactile"
            style={{
              position: 'relative',
              width: 'clamp(76px, 16vw, 110px)',
              height: 'clamp(76px, 16vw, 110px)',
              margin: '0 auto clamp(10px, 1.8vh, 18px) auto',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              touchAction: 'manipulation',
            }}
            title="Click to turn the astrolabe lock and open gates"
          >
            {/* Outer Concentric Graduated Ring */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '2px dashed rgba(232, 165, 152, 0.65)',
                transform: `rotate(${astrolabeAngle}deg)`,
                transition: isUnlocking ? 'transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
              }}
            />

            {/* Middle Reverse Ring */}
            <div
              style={{
                position: 'absolute',
                inset: '8px',
                borderRadius: '50%',
                border: '1px solid rgba(232, 184, 109, 0.5)',
                transform: `rotate(${-astrolabeAngle * 1.5}deg)`,
                transition: isUnlocking ? 'transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
              }}
            />

            {/* Core Golden Ratio Medallion */}
            <div
              style={{
                position: 'relative',
                width: 'clamp(44px, 9vw, 62px)',
                height: 'clamp(44px, 9vw, 62px)',
                borderRadius: '50%',
                background:
                  'radial-gradient(circle at 35% 35%, #F3B2A6 0%, #C48275 50%, #603B34 100%)',
                boxShadow:
                  '0 0 25px rgba(232, 165, 152, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                transform: isUnlocking ? 'scale(1.12)' : 'scale(1)',
                transition: 'transform 0.3s ease',
              }}
            >
              {isUnlocking ? (
                <Sparkles size={22} className="animate-spin" />
              ) : (
                <Disc size={22} style={{ transform: `rotate(${astrolabeAngle * 2}deg)` }} />
              )}
            </div>
          </div>

          {/* Authenticated 3-Line Couple Title with Centered & Middle Line */}
          <div style={{ width: '100%', marginBottom: 'clamp(6px, 1vh, 10px)' }}>
            <CoupleTitle
              title={title}
              as="h1"
              style={{
                fontFamily: 'Playfair Display, Cormorant Garamond, serif',
                fontSize: 'clamp(1.35rem, 4vw, 2.2rem)',
                fontWeight: 600,
                color: '#FFF9F5',
                letterSpacing: '0.5px',
                lineHeight: 1.15,
                margin: 0,
              }}
            />
          </div>

          {/* Subtitle & Occasion Narrative */}
          <p
            style={{
              fontFamily: 'sans-serif',
              fontSize: 'clamp(0.74rem, 1.8vw, 0.84rem)',
              color: 'rgba(255, 245, 234, 0.75)',
              letterSpacing: '0.5px',
              lineHeight: 1.5,
              maxWidth: '420px',
              margin: '0 0 clamp(8px, 1.4vh, 14px) 0',
            }}
          >
            {subtitle}
          </p>

          {/* Date & Destination Coordinate Pill */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px 12px',
              padding: '6px 14px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(232, 165, 152, 0.25)',
              marginBottom: 'clamp(12px, 2vh, 20px)',
              width: '100%',
            }}
          >
            <span style={{ fontSize: 'clamp(0.72rem, 1.9vw, 0.8rem)', color: '#E8A598', fontWeight: 600 }}>{date}</span>
            <span style={{ color: 'rgba(232, 165, 152, 0.4)' }}>•</span>
            <span style={{ fontSize: 'clamp(0.72rem, 1.9vw, 0.8rem)', color: '#FFF5EA' }}>{venue}</span>
          </div>

          {/* Main Action Button */}
          <button
            type="button"
            onClick={handleOpen}
            disabled={isUnlocking}
            className="celestial-btn-tactile"
            style={{
              width: '100%',
              padding: 'clamp(12px, 1.8vh, 16px) clamp(16px, 3.5vw, 26px)',
              borderRadius: '9999px',
              background:
                'linear-gradient(135deg, #E8A598 0%, #D48B7E 50%, #B86E61 100%)',
              border: 'none',
              color: '#07080D',
              fontFamily: 'sans-serif',
              fontSize: 'clamp(0.74rem, 2vw, 0.84rem)',
              fontWeight: 700,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              cursor: isUnlocking ? 'wait' : 'pointer',
              boxShadow: '0 12px 35px rgba(232, 165, 152, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              minHeight: '50px',
              touchAction: 'manipulation',
            }}
          >
            {isUnlocking ? (
              <>
                <Sparkles size={15} />
                <span>Aligning Astrolabe...</span>
              </>
            ) : (
              <>
                <span>Turn Astrolabe & Enter</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
