'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sparkles, Heart, ArrowRight, Crown } from 'lucide-react';
import { CoupleTitle } from './CoupleTitle';

interface WelcomeEntryDoorProps {
  title?: string;
  subtitle?: string;
  date?: string;
  venue?: string;
  primaryColor?: string;
  monogramImage?: string;
  monogramInitials?: string;
  onOpen?: () => void;
  onFinish?: () => void;
  isOpen?: boolean;
}

interface SparkleParticle {
  id: number;
  cls: 'g' | 'e' | 'i';
  tx: string;
  ty: string;
  left: string;
  top: string;
  delay: string;
}

// Multi-octave royal palace sound synthesizer (Web Audio API)
function playRoyalEntrySound() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // 1. Warm Resonant Palace Gong / Deep Sub-bass (D2 - 73.4Hz & D3 - 146.8Hz)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(73.4, ctx.currentTime);
    subGain.gain.setValueAtTime(0, ctx.currentTime);
    subGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.08);
    subGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.4);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(ctx.currentTime);
    subOsc.stop(ctx.currentTime + 2.45);

    // 2. Resonant Bell Overtones
    const bellOsc = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bellOsc.type = 'triangle';
    bellOsc.frequency.setValueAtTime(293.66, ctx.currentTime); // D4
    bellGain.gain.setValueAtTime(0, ctx.currentTime);
    bellGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.04);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.9);
    bellOsc.connect(bellGain);
    bellGain.connect(ctx.destination);
    bellOsc.start(ctx.currentTime);
    bellOsc.stop(ctx.currentTime + 1.95);

    // 3. Royal Celestial Harp Glissando (9 ascending harmonious notes: D4, F#4, A4, B4, D5, F#5, A5, B5, D6)
    const harpNotes = [293.66, 369.99, 440.0, 493.88, 587.33, 739.99, 880.0, 987.77, 1174.66];
    harpNotes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.065);

      gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.065);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + idx * 0.065 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.065 + 1.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.065);
      osc.stop(ctx.currentTime + idx * 0.065 + 1.65);
    });

    // 4. Ethereal High Sparkle Chime (crystalline shimmer)
    const chimeFreqs = [1760.0, 2349.32, 3520.0];
    chimeFreqs.forEach((freq, i) => {
      const cOsc = ctx.createOscillator();
      const cGain = ctx.createGain();
      cOsc.type = 'sine';
      cOsc.frequency.setValueAtTime(freq, ctx.currentTime + 0.35 + i * 0.09);
      cGain.gain.setValueAtTime(0, ctx.currentTime + 0.35 + i * 0.09);
      cGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.35 + i * 0.09 + 0.02);
      cGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35 + i * 0.09 + 1.2);
      cOsc.connect(cGain);
      cGain.connect(ctx.destination);
      cOsc.start(ctx.currentTime + 0.35 + i * 0.09);
      cOsc.stop(ctx.currentTime + 0.35 + i * 0.09 + 1.25);
    });
  } catch {
    // Silently degrade if audio is blocked by user policy
  }
}

export function WelcomeEntryDoor({
  title = 'Aarav & Meera',
  subtitle = 'Together with our families, we invite you to celebrate',
  date = 'December 18, 2026',
  venue = 'Udaipur, Rajasthan',
  primaryColor = '#f5c67b',
  monogramImage,
  monogramInitials,
  onOpen,
  onFinish,
  isOpen = false,
}: WelcomeEntryDoorProps) {
  const [doorLeftOpen, setDoorLeftOpen] = useState(isOpen);
  const [doorRightOpen, setDoorRightOpen] = useState(isOpen);
  const [triggerVanished, setTriggerVanished] = useState(isOpen);
  const [stageHidden, setStageHidden] = useState(isOpen);
  const [isDismissed, setIsDismissed] = useState(isOpen);
  const [sparkles, setSparkles] = useState<SparkleParticle[]>([]);
  const [countdownText, setCountdownText] = useState('00d 00h 00m 00s');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fireworksActiveRef = useRef(false);

  // Extract initials for the royal wax seal medallion (e.g. "A & M")
  const monogram = useMemo(() => {
    if (monogramInitials && monogramInitials.trim()) {
      return monogramInitials.trim();
    }
    if (!title) return 'A & M';
    const parts = title.split('&');
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0].trim().charAt(0).toUpperCase()} & ${parts[1].trim().charAt(0).toUpperCase()}`;
    }
    const words = title.split(' ').filter(Boolean);
    if (words.length >= 2 && words[0] && words[1]) {
      return `${words[0].charAt(0).toUpperCase()} & ${words[1].charAt(0).toUpperCase()}`;
    }
    return title.slice(0, 3).toUpperCase();
  }, [title, monogramInitials]);

  // Format event date gracefully (e.g. "2026-12-18" -> "December 18, 2026")
  const formattedDate = useMemo(() => {
    if (!date) return 'December 18, 2026';
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [date]);

  // Clean, gracefully balanced honor line and location text
  const { honorText, locationText } = useMemo(() => {
    let honor = (subtitle || 'Together with our families, we invite you to celebrate').trim();
    honor = honor.replace(/[•·\-–—]\s*$/, '').trim();
    const loc = (venue || 'Udaipur, Rajasthan').trim();
    return { honorText: honor, locationText: loc };
  }, [subtitle, venue]);

  // Target event date for live countdown
  const targetDate = useMemo(() => {
    if (!date) return new Date(Date.now() + 86400000 * 30);
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? new Date(Date.now() + 86400000 * 30) : parsed;
  }, [date]);

  // Live countdown timer ticker
  useEffect(() => {
    function updateCountdown() {
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) {
        setCountdownText('TODAY IS THE CELEBRATION');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdownText(
        `${days}d ${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`
      );
    }
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  // Ambient Floating Luxury Particles & Celebratory Fireworks Canvas
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

    const GOLD_COLORS = ['#f5c67b', '#ffd166', '#fff1c5', '#ff94b4', '#ffffff', '#e8b86d'];

    interface StarParticle {
      type: 'star';
      x: number;
      y: number;
      sz: number;
      color: string;
      alpha: number;
      vx: number;
      vy: number;
      life: number;
      dec: number;
    }

    interface FoilParticle {
      type: 'foil';
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
      alpha: number;
      vx: number;
      vy: number;
      angle: number;
      angVel: number;
      rotX: number;
      rotVel: number;
      life: number;
    }

    interface FireworkParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      sz: number;
      life: number;
      dec: number;
    }

    let stars: StarParticle[] = [];
    let foils: FoilParticle[] = [];
    let fwParts: FireworkParticle[] = [];

    function spawnStar(initialY?: number): StarParticle {
      return {
        type: 'star',
        x: Math.random() * w,
        y: initialY ?? h + 15,
        sz: 1.2 + Math.random() * 2.8,
        color: GOLD_COLORS[Math.floor(Math.random() * GOLD_COLORS.length)] || '#f5c67b',
        alpha: 0.2 + Math.random() * 0.65,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -(0.4 + Math.random() * 0.9),
        life: 1,
        dec: 0.0018 + Math.random() * 0.0025,
      };
    }

    function spawnFoil(initialY?: number): FoilParticle {
      return {
        type: 'foil',
        x: Math.random() * w,
        y: initialY ?? -20,
        w: 3.5 + Math.random() * 6,
        h: 2 + Math.random() * 3.5,
        color: GOLD_COLORS[Math.floor(Math.random() * 3)] || '#f5c67b',
        alpha: 0.35 + Math.random() * 0.5,
        vx: (Math.random() - 0.5) * 0.8,
        vy: 0.5 + Math.random() * 1.1,
        angle: Math.random() * Math.PI * 2,
        angVel: (Math.random() - 0.5) * 0.04,
        rotX: Math.random() * Math.PI * 2,
        rotVel: 0.03 + Math.random() * 0.05,
        life: 1,
      };
    }

    for (let i = 0; i < 26; i++) {
      const s = spawnStar(Math.random() * h);
      s.life = Math.random();
      stars.push(s);
    }
    for (let i = 0; i < 12; i++) {
      const f = spawnFoil(Math.random() * h);
      foils.push(f);
    }

    (window as unknown as { launchWelcomeFireworks?: () => void }).launchWelcomeFireworks = () => {
      fireworksActiveRef.current = true;
      const countBursts = 5;
      for (let b = 0; b < countBursts; b++) {
        setTimeout(() => {
          const bx = w * 0.15 + Math.random() * w * 0.7;
          const by = h * 0.18 + Math.random() * h * 0.4;
          const burstColor = GOLD_COLORS[b % GOLD_COLORS.length] || '#f5c67b';
          const sparkCount = 40 + Math.floor(Math.random() * 20);
          for (let i = 0; i < sparkCount; i++) {
            const angle = (i / sparkCount) * Math.PI * 2;
            const speed = 2.8 + Math.random() * 6.5;
            fwParts.push({
              x: bx,
              y: by,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              color: burstColor,
              sz: 2 + Math.random() * 3.5,
              life: 1,
              dec: 0.013 + Math.random() * 0.012,
            });
          }
        }, b * 200);
      }
    };

    function renderLoop() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      // 1. Rising Starlight Dust
      stars = stars.filter((s) => s.life > 0);
      if (Math.random() < 0.18 && stars.length < 40) {
        stars.push(spawnStar());
      }
      for (const s of stars) {
        s.x += s.vx + Math.sin(Date.now() * 0.0012 + s.y * 0.015) * 0.35;
        s.y += s.vy;
        s.life -= s.dec;
        ctx.save();
        ctx.globalAlpha = Math.max(0, s.alpha * s.life);
        ctx.fillStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.sz, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 2. Tumbling Golden Foil Flakes
      foils = foils.filter((f) => f.y < h + 30);
      if (Math.random() < 0.08 && foils.length < 20) {
        foils.push(spawnFoil());
      }
      for (const f of foils) {
        f.x += f.vx + Math.sin(Date.now() * 0.001 + f.y * 0.01) * 0.5;
        f.y += f.vy;
        f.angle += f.angVel;
        f.rotX += f.rotVel;

        const currentScaleY = Math.abs(Math.sin(f.rotX));

        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.angle);
        ctx.scale(1, currentScaleY);
        ctx.globalAlpha = f.alpha * (0.6 + 0.4 * currentScaleY);
        ctx.fillStyle = f.color;
        ctx.shadowColor = f.color;
        ctx.shadowBlur = 4;
        ctx.fillRect(-f.w / 2, -f.h / 2, f.w, f.h);
        ctx.restore();
      }

      // 3. Celebratory Fireworks
      if (fwParts.length > 0) {
        fwParts = fwParts.filter((p) => p.life > 0);
        for (const p of fwParts) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.075;
          p.vx *= 0.985;
          p.life -= p.dec;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.sz, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(renderLoop);
    }

    renderLoop();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      delete (window as unknown as { launchWelcomeFireworks?: () => void }).launchWelcomeFireworks;
    };
  }, []);

  // Sparkle ember burst physics
  const triggerEmbers = () => {
    const newSparkles: SparkleParticle[] = [];
    const configs: Array<{ cls: 'g' | 'e' | 'i'; count: number; speed: number }> = [
      { cls: 'g', count: 28, speed: 1.2 },
      { cls: 'e', count: 24, speed: 1.35 },
      { cls: 'i', count: 18, speed: 1.05 },
    ];

    let counter = 0;
    configs.forEach((cfg) => {
      for (let i = 0; i < cfg.count; i++) {
        counter++;
        const angle = Math.random() * Math.PI * 2;
        const dist = (85 + Math.random() * 155) * cfg.speed;
        const tx = `${Math.cos(angle) * dist + (Math.random() - 0.5) * 30}px`;
        const ty = `${Math.sin(angle) * dist - 50 - Math.random() * 40}px`;
        const left = `calc(50% + ${(Math.random() - 0.5) * 35}px)`;
        const top = `calc(50% + ${(Math.random() - 0.5) * 35}px)`;
        const delay = `${(Math.random() * 0.45).toFixed(2)}s`;

        newSparkles.push({
          id: counter,
          cls: cfg.cls,
          tx,
          ty,
          left,
          top,
          delay,
        });
      }
    });

    setSparkles(newSparkles);
  };

  // Door opening choreography (staggered 3D swing, royal chime, and celebration fireworks)
  const handleOpen = () => {
    if (triggerVanished) return;

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 70, 110]);
    }

    playRoyalEntrySound();
    onOpen?.();

    const win = window as unknown as { launchWelcomeFireworks?: () => void };
    win.launchWelcomeFireworks?.();

    setTriggerVanished(true);

    setTimeout(() => setDoorLeftOpen(true), 280);
    setTimeout(() => setDoorRightOpen(true), 460);

    setTimeout(() => triggerEmbers(), 650);

    setTimeout(() => setStageHidden(true), 2500);

    setTimeout(() => {
      setIsDismissed(true);
      onFinish?.();
    }, 3300);
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div
      className={`hb-stage ${stageHidden ? 'stage-hide' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome Door Entry"
    >
      <style>{`
        .hb-stage {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          width: 100vw;
          height: 100%;
          height: 100dvh;
          height: 100vh;
          max-width: 100vw;
          max-height: 100dvh;
          z-index: 9999;
          perspective: 1800px;
          perspective-origin: 50% 50%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background: radial-gradient(circle at center, #261528 0%, #130a16 55%, #050207 100%);
          transition: opacity 1.1s cubic-bezier(0.2, 1, 0.38, 1), visibility 1.1s;
          overflow: hidden;
          contain: strict;
          box-sizing: border-box;
          padding: 0;
          margin: 0;
          touch-action: manipulation;
          -webkit-user-select: none;
          user-select: none;
        }

        .hb-stage.stage-hide {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
        }

        /* Ambient Twinkling Stars */
        .hb-star {
          position: absolute;
          border-radius: 50%;
          background: #fff;
          pointer-events: none;
          z-index: 1;
          animation: hbTwinkle 3.5s ease-in-out infinite;
        }

        @keyframes hbTwinkle {
          0%, 100% { opacity: 0.15; transform: scale(0.8); }
          50% { opacity: 0.95; transform: scale(1.3); }
        }

        /* Canvas Particle Layer */
        .hb-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 2;
        }

        /* ─── ROTATING VOLUMETRIC GOD RAYS (Behind Doors) ─── */
        .hb-volumetric-rays {
          position: absolute;
          width: 100vmax;
          height: 100vmax;
          max-width: 1200px;
          max-height: 1200px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: conic-gradient(
            from 0deg at 50% 50%,
            transparent 0deg,
            rgba(245, 198, 123, 0.05) 15deg,
            transparent 30deg,
            rgba(255, 148, 180, 0.04) 45deg,
            transparent 60deg,
            rgba(245, 198, 123, 0.07) 75deg,
            transparent 90deg,
            rgba(255, 241, 197, 0.05) 105deg,
            transparent 120deg,
            rgba(245, 198, 123, 0.06) 135deg,
            transparent 150deg,
            rgba(255, 148, 180, 0.04) 165deg,
            transparent 180deg,
            rgba(245, 198, 123, 0.05) 195deg,
            transparent 210deg,
            rgba(255, 241, 197, 0.07) 225deg,
            transparent 240deg,
            rgba(245, 198, 123, 0.04) 255deg,
            transparent 270deg,
            rgba(255, 148, 180, 0.06) 285deg,
            transparent 300deg,
            rgba(245, 198, 123, 0.07) 315deg,
            transparent 330deg,
            rgba(255, 241, 197, 0.04) 345deg,
            transparent 360deg
          );
          animation: hbRaysSpin 45s linear infinite;
          pointer-events: none;
          z-index: 3;
          opacity: 0.8;
          mix-blend-mode: screen;
        }

        @keyframes hbRaysSpin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }

        /* ─── FULL BLEED 50% SPLIT DOORS ─── */
        .hb-doors-wrapper {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          cursor: pointer;
          z-index: 10;
        }

        .hb-door {
          position: absolute;
          top: 0;
          height: 100%;
          width: 50%;
          transform-origin: center;
          transform-style: preserve-3d;
          transition: transform 3.8s cubic-bezier(0.2, 1, 0.38, 1);
          will-change: transform;
          overflow: hidden;
          z-index: 10;
        }

        .hb-door.left {
          left: 0;
          transform-origin: left center;
        }

        .hb-door.right {
          right: 0;
          transform-origin: right center;
        }

        .hb-door.left.open {
          transform: rotateY(-155deg) translateZ(60px);
        }

        .hb-door.right.open {
          transform: rotateY(155deg) translateZ(60px);
        }

        /* Door Surface: Opulent Royal Aubergine & Emerald Noir with Embossed Gold Guilloché */
        .hb-door-face {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 18px 18px, rgba(245, 198, 123, 0.08) 1.5px, transparent 1.5px),
            radial-gradient(circle at 36px 36px, rgba(245, 198, 123, 0.05) 1.5px, transparent 1.5px),
            linear-gradient(150deg, #381e33 0%, #241322 35%, #140b15 85%, #080309 100%),
            repeating-linear-gradient(-45deg, transparent, transparent 18px, rgba(245, 198, 123, 0.03) 18px, rgba(245, 198, 123, 0.03) 19px);
          background-size: 36px 36px, 36px 36px, 100% 100%, 100% 100%;
          box-shadow: inset 0 0 120px rgba(0, 0, 0, 0.95);
          border: 1px solid rgba(245, 198, 123, 0.22);
        }

        /* Periodic Specular Light Shimmer Beam */
        .hb-door-shimmer {
          position: absolute;
          inset: -60%;
          background: linear-gradient(
            60deg,
            transparent 42%,
            rgba(245, 198, 123, 0.08) 48%,
            rgba(255, 245, 210, 0.25) 50%,
            rgba(245, 198, 123, 0.08) 52%,
            transparent 58%
          );
          transform: rotate(-25deg);
          animation: hbShimmerSweep 8s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes hbShimmerSweep {
          0% { transform: translateY(-130%) rotate(-25deg); opacity: 0; }
          15% { opacity: 1; }
          45% { transform: translateY(130%) rotate(-25deg); opacity: 0; }
          100% { transform: translateY(130%) rotate(-25deg); opacity: 0; }
        }

        /* Art Deco Geometric Gold Corners */
        .hb-geo-corner {
          position: absolute;
          width: clamp(28px, 6vw, 48px);
          height: clamp(28px, 6vw, 48px);
          opacity: 0.65;
          pointer-events: none;
        }

        .hb-geo-corner::before,
        .hb-geo-corner::after {
          content: '';
          position: absolute;
          border: 1.5px solid #f5c67b;
          box-shadow: 0 0 8px rgba(245, 198, 123, 0.35);
        }

        .hb-geo-corner.tl {
          top: clamp(8px, 2vh, 20px);
          left: clamp(8px, 2.5vw, 20px);
          border-top: 1.5px solid #f5c67b;
          border-left: 1.5px solid #f5c67b;
        }
        .hb-geo-corner.tl::before {
          top: 6px;
          left: 6px;
          width: 13px;
          height: 13px;
          border-top: 1.5px solid #f5c67b;
          border-left: 1.5px solid #f5c67b;
          transform: rotate(45deg);
          opacity: 0.8;
        }

        .hb-geo-corner.tr {
          top: clamp(8px, 2vh, 20px);
          right: clamp(8px, 2.5vw, 20px);
          border-top: 1.5px solid #f5c67b;
          border-right: 1.5px solid #f5c67b;
        }
        .hb-geo-corner.tr::before {
          top: 6px;
          right: 6px;
          width: 13px;
          height: 13px;
          border-top: 1.5px solid #f5c67b;
          border-right: 1.5px solid #f5c67b;
          transform: rotate(-45deg);
          opacity: 0.8;
        }

        .hb-geo-corner.bl {
          bottom: clamp(8px, 2vh, 20px);
          left: clamp(8px, 2.5vw, 20px);
          border-bottom: 1.5px solid #f5c67b;
          border-left: 1.5px solid #f5c67b;
        }
        .hb-geo-corner.bl::before {
          bottom: 6px;
          left: 6px;
          width: 13px;
          height: 13px;
          border-bottom: 1.5px solid #f5c67b;
          border-left: 1.5px solid #f5c67b;
          transform: rotate(-45deg);
          opacity: 0.8;
        }

        .hb-geo-corner.br {
          bottom: clamp(8px, 2vh, 20px);
          right: clamp(8px, 2.5vw, 20px);
          border-bottom: 1.5px solid #f5c67b;
          border-right: 1.5px solid #f5c67b;
        }
        .hb-geo-corner.br::before {
          bottom: 6px;
          right: 6px;
          width: 13px;
          height: 13px;
          border-bottom: 1.5px solid #f5c67b;
          border-right: 1.5px solid #f5c67b;
          transform: rotate(45deg);
          opacity: 0.8;
        }

        /* Inner Beveled Recessed Paneling */
        .hb-door-inset-panel {
          position: absolute;
          inset: clamp(10px, 2.4vw, 24px);
          border: 1px solid rgba(245, 198, 123, 0.28);
          border-radius: 8px;
          box-shadow: inset 0 0 45px rgba(0,0,0,0.8), 0 0 15px rgba(245, 198, 123, 0.12);
          pointer-events: none;
        }

        .hb-door-inset-inner-border {
          position: absolute;
          inset: 5px;
          border: 1px dashed rgba(245, 198, 123, 0.18);
          border-radius: 5px;
          pointer-events: none;
        }

        /* Antique Gold Rivets / Palace Portal Studs */
        .hb-door-studs {
          position: absolute;
          top: 14%;
          bottom: 14%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          pointer-events: none;
          opacity: 0.6;
        }
        .hb-door.left .hb-door-studs {
          right: 8px;
        }
        .hb-door.right .hb-door-studs {
          left: 8px;
        }
        .hb-stud {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #fff2c8 0%, #f5c67b 50%, #78350f 100%);
          box-shadow: 0 1px 2px rgba(0,0,0,0.9), 0 0 4px rgba(245, 198, 123, 0.4);
        }

        /* Antique Gold Drop Ring Knocker Handle */
        .hb-door-knocker {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          pointer-events: none;
          opacity: 0.8;
          filter: drop-shadow(0 3px 8px rgba(0,0,0,0.85));
        }
        .hb-door.left .hb-door-knocker {
          right: clamp(12px, 3.2vw, 26px);
        }
        .hb-door.right .hb-door-knocker {
          left: clamp(12px, 3.2vw, 26px);
        }
        .hb-knocker-plate {
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #fff5d6 0%, #f5c67b 45%, #854d0e 100%);
          box-shadow: 0 0 10px rgba(245, 198, 123, 0.8), 0 2px 4px rgba(0,0,0,0.85);
          border: 1px solid rgba(255, 245, 210, 0.5);
        }
        .hb-knocker-ring {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 2.5px solid #f5c67b;
          margin-top: -4px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.8), inset 0 1px 3px rgba(255,255,255,0.4);
        }

        /* Center Vertical Seam Glow & Luminous God Rays */
        .hb-seam-glow {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 50%;
          width: 3px;
          transform: translateX(-50%);
          background: linear-gradient(to bottom, transparent 0%, #ff94b4 25%, #f5c67b 50%, #ff94b4 75%, transparent 100%);
          opacity: 0.88;
          box-shadow: 0 0 35px rgba(255, 148, 180, 0.85), 0 0 16px rgba(245, 198, 123, 0.9);
          transition: opacity 0.8s ease;
          z-index: 15;
          pointer-events: none;
          animation: hbSeamPulse 2.8s ease-in-out infinite;
        }

        @keyframes hbSeamPulse {
          0%, 100% { opacity: 0.7; box-shadow: 0 0 25px rgba(255, 148, 180, 0.7); }
          50% { opacity: 1; box-shadow: 0 0 45px rgba(245, 198, 123, 0.95), 0 0 26px rgba(255, 148, 180, 0.85); }
        }

        .hb-seam-glow.vanish {
          opacity: 0;
        }

        /* Radiant Golden Sanctum Revealed Behind Parting Doors */
        .hb-inner-sanctum {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 50%, rgba(255, 235, 170, 0.35) 0%, rgba(245, 198, 123, 0.2) 40%, transparent 75%);
          z-index: 5;
          pointer-events: none;
        }

        /* ─── CENTRAL CONTENT PILLAR (Mathematically Centered & Responsive) ─── */
        .hb-content-column {
          position: relative;
          z-index: 30;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: min(520px, 92vw);
          padding: 0 clamp(8px, 2.5vw, 16px);
          margin: auto;
          box-sizing: border-box;
          pointer-events: none;
        }

        .hb-content-column > * {
          pointer-events: auto;
        }

        /* ─── ROYAL GILDED PLAQUE (Architectural Header) ─── */
        .hb-royal-plaque {
          position: relative;
          text-align: center;
          margin: 0 auto clamp(8px, 1.6vh, 14px) auto;
          padding: clamp(14px, 2.8vh, 24px) clamp(14px, 4.5vw, 32px);
          width: 100%;
          box-sizing: border-box;
          background: rgba(18, 9, 24, 0.88);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(245, 198, 123, 0.45);
          border-radius: 22px;
          box-shadow: 0 16px 42px rgba(0, 0, 0, 0.88),
                      0 0 28px rgba(245, 198, 123, 0.16),
                      inset 0 1px 2px rgba(255, 255, 255, 0.22),
                      inset 0 0 0 1px rgba(245, 198, 123, 0.15);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }

        .hb-royal-plaque.vanish {
          opacity: 0;
          transform: translateY(-15px) scale(0.96);
          pointer-events: none;
        }

        /* Art Deco Corner Diamonds on Plaque */
        .hb-plaque-corner {
          position: absolute;
          width: 8px;
          height: 8px;
          border: 1.5px solid #f5c67b;
        }
        .hb-plaque-corner.tl { top: 5px; left: 5px; border-right: none; border-bottom: none; }
        .hb-plaque-corner.tr { top: 5px; right: 5px; border-left: none; border-bottom: none; }
        .hb-plaque-corner.bl { bottom: 5px; left: 5px; border-right: none; border-top: none; }
        .hb-plaque-corner.br { bottom: 5px; right: 5px; border-left: none; border-top: none; }

        /* Royal Crown Crest in Plaque */
        .hb-plaque-crest {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 6px;
        }

        .hb-crest-line {
          flex: 1;
          max-width: 36px;
          height: 1px;
          background: linear-gradient(to left, #f5c67b, transparent);
        }
        .hb-crest-line.right {
          background: linear-gradient(to right, #f5c67b, transparent);
        }

        .hb-crest-crown-circle {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #fff2c8 0%, #f5c67b 50%, #92400e 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 12px rgba(245, 198, 123, 0.8), 0 2px 4px rgba(0,0,0,0.8);
          border: 1px solid rgba(255, 245, 210, 0.6);
        }

        /* Plaque Prelude */
        .hb-plaque-prelude {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          color: #f5c67b;
          font-size: clamp(0.55rem, 1.8vw, 0.68rem);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: clamp(1.2px, 0.4vw, 2.2px);
          font-family: 'Plus Jakarta Sans', sans-serif;
          margin-bottom: 4px;
          text-shadow: 0 0 8px rgba(245, 198, 123, 0.45);
          text-align: center;
        }

        /* Plaque Couple's Title in Gilded Gold Foil */
        .hb-plaque-title {
          font-size: clamp(1.4rem, 4.5vw, 2.5rem);
          font-weight: 600;
          font-family: 'Playfair Display', Georgia, serif;
          margin: 3px 0 7px 0;
          letter-spacing: 0.5px;
          line-height: 1.18;
          text-wrap: balance;
          background: linear-gradient(135deg, #FFFFFF 0%, #FFF4D4 22%, #F5C67B 52%, #FFDE9C 78%, #CA9339 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 2px 14px rgba(245, 198, 123, 0.45));
          word-break: keep-all;
        }

        .hb-plaque-title .couple-name {
          background: inherit;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hb-plaque-title .couple-ampersand-row {
          color: #F5C67B;
          -webkit-text-fill-color: initial;
        }

        /* Honor Phrasing */
        .hb-plaque-honor {
          font-size: clamp(0.85rem, 2.2vw, 1.02rem);
          color: rgba(255, 242, 246, 0.92);
          font-style: italic;
          font-weight: 500;
          margin: 0 auto 10px auto;
          line-height: 1.35;
          max-width: 440px;
          font-family: 'Cormorant Garamond', Georgia, serif;
          letter-spacing: 0.25px;
          text-wrap: balance;
        }

        /* Destination & Date VIP Capsule Badge */
        .hb-plaque-destination {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 4px 8px;
          padding: 3px 10px;
          background: rgba(245, 198, 123, 0.08);
          border: 1px solid rgba(245, 198, 123, 0.22);
          border-radius: 9999px;
          font-size: clamp(0.54rem, 1.6vw, 0.64rem);
          font-weight: 600;
          letter-spacing: clamp(0.8px, 0.35vw, 1.5px);
          text-transform: uppercase;
          color: #f5c67b;
          font-family: 'Plus Jakarta Sans', sans-serif;
          margin-top: 2px;
        }

        .hb-meta-diamond {
          color: rgba(245, 198, 123, 0.7);
          font-size: 0.5rem;
          line-height: 1;
        }

        /* ─── ROYAL WAX SEAL MEDALLION CONTAINER ─── */
        .hb-royal-seal-container {
          position: relative;
          z-index: 30;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: clamp(6px, 1.4vh, 10px);
        }

        /* Royal Silk Ribbon hanging beneath the seal */
        .hb-seal-ribbons {
          position: absolute;
          top: 65%;
          display: flex;
          gap: 8px;
          pointer-events: none;
          z-index: -1;
          transition: opacity 0.4s ease, transform 0.4s ease;
        }

        .hb-ribbon-tail {
          width: 12px;
          height: 32px;
          background: linear-gradient(to bottom, #5a1e36 0%, #3e1224 85%, transparent 100%);
          border-left: 1px solid rgba(245, 198, 123, 0.6);
          border-right: 1px solid rgba(245, 198, 123, 0.6);
          clip-path: polygon(0% 0%, 100% 0%, 100% 85%, 50% 100%, 0% 85%);
          box-shadow: 0 3px 8px rgba(0,0,0,0.6);
        }
        .hb-ribbon-tail.left {
          transform: rotate(-12deg);
        }
        .hb-ribbon-tail.right {
          transform: rotate(12deg);
        }

        /* ─── FLOATING CIRCLE TRIGGER MEDALLION ─── */
        .hb-circle-trigger {
          position: relative;
          z-index: 30;
          width: clamp(96px, 24vw, 120px);
          height: clamp(96px, 24vw, 120px);
          border-radius: 50%;
          cursor: pointer;
          background: transparent;
          border: none;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          animation: hbCircleFloat 6.5s ease-in-out infinite;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .hb-circle-trigger:active {
          transform: scale(0.96);
        }

        .hb-circle-trigger:hover {
          transform: scale(1.05);
        }

        .hb-circle-trigger.vanish {
          animation: none;
          opacity: 0;
          transform: scale(0.4) rotate(20deg);
          transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
        }

        /* Concentric Breathing Specular Halo */
        .hb-circle-halo {
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          border: 1px solid rgba(245, 198, 123, 0.5);
          animation: hbHaloBreathe 3s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes hbHaloBreathe {
          0%, 100% {
            transform: scale(1);
            opacity: 0.35;
            box-shadow: 0 0 14px rgba(245, 198, 123, 0.25);
          }
          50% {
            transform: scale(1.07);
            opacity: 0.85;
            box-shadow: 0 0 32px rgba(245, 198, 123, 0.65), 0 0 18px rgba(255, 148, 180, 0.4);
          }
        }

        /* Golden Coin-Edge Bevel Ring */
        .hb-seal-coin-edge {
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          border: 1.5px dashed rgba(245, 198, 123, 0.6);
          animation: hbCoinSpin 25s linear infinite;
          pointer-events: none;
        }

        @keyframes hbCoinSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .hb-circle-base {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: radial-gradient(circle at 36% 30%, #5d2b4b 0%, #35172b 45%, #180a18 100%);
          box-shadow: 0 14px 38px rgba(0, 0, 0, 0.9),
                      0 0 30px rgba(245, 198, 123, 0.45),
                      inset 0 2px 6px rgba(255, 255, 255, 0.35);
          border: 2px solid #f5c67b;
        }

        .hb-circle-ring {
          position: absolute;
          inset: 5px;
          border-radius: 50%;
          border: 1px dashed #f5c67b;
          opacity: 0.6;
          animation: hbCoinSpinReverse 35s linear infinite;
        }

        @keyframes hbCoinSpinReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        .hb-circle-content {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          pointer-events: none;
          color: #f5c67b;
        }

        .hb-circle-monogram {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(0.96rem, 3vw, 1.25rem);
          font-weight: 700;
          color: #FFF2C8;
          letter-spacing: 1.2px;
          text-shadow: 0 0 12px rgba(245, 198, 123, 0.75);
          margin-top: 1px;
        }

        .hb-circle-label {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: clamp(7.2px, 1.8vw, 8.5px);
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #f5c67b;
          margin-top: 2px;
          display: flex;
          align-items: center;
          gap: 3px;
        }

        @keyframes hbCircleFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        /* ─── LIVE COUNTDOWN PRE-TIMER PILL ─── */
        .hb-pre-timer {
          position: relative;
          z-index: 30;
          background: rgba(20, 11, 28, 0.88);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 9999px;
          padding: clamp(5px, 1.1vh, 8px) clamp(12px, 3.2vw, 18px);
          text-align: center;
          border: 1px solid rgba(245, 198, 123, 0.45);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), 0 0 22px rgba(245, 198, 123, 0.18);
          font-family: 'Plus Jakarta Sans', sans-serif;
          pointer-events: none;
          max-width: min(340px, 88vw);
          box-sizing: border-box;
          transition: opacity 0.5s ease, transform 0.5s ease;
        }

        .hb-pre-timer.vanish {
          opacity: 0;
          transform: translateY(10px) scale(0.95);
        }

        .hb-pre-timer-label {
          font-size: clamp(0.48rem, 1.5vw, 0.58rem);
          letter-spacing: 0.18em;
          color: #f5c67b;
          text-transform: uppercase;
          font-weight: 700;
          margin-bottom: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }

        .hb-pre-timer-value {
          font-size: clamp(0.82rem, 2.5vw, 0.98rem);
          font-weight: 700;
          font-family: 'Inter', monospace;
          color: #FFF2C8;
          letter-spacing: 1.4px;
          text-shadow: 0 0 12px rgba(245, 198, 123, 0.65);
        }

        /* ─── SPARKLE EMBER DRIFT PHYSICS ─── */
        .hb-sparkle-layer {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 250;
          overflow: hidden;
        }

        .hb-sparkle {
          position: absolute;
          width: clamp(4px, 0.8vw, 7px);
          height: clamp(4px, 0.8vw, 7px);
          border-radius: 50%;
          opacity: 0;
          animation: hbEmberDrift 3.2s cubic-bezier(0.2, 1, 0.38, 1) forwards;
        }

        .hb-sparkle.g {
          background: radial-gradient(circle, #fff 0%, #f5c67b 45%, transparent 80%);
          box-shadow: 0 0 18px #f5c67b;
        }

        .hb-sparkle.e {
          background: radial-gradient(circle, #fff 0%, #ff94b4 45%, transparent 80%);
          box-shadow: 0 0 18px #ff94b4;
        }

        .hb-sparkle.i {
          background: radial-gradient(circle, #fff 0%, #fff6f0 50%, transparent 85%);
          box-shadow: 0 0 14px #fff;
        }

        @keyframes hbEmberDrift {
          0% {
            opacity: 0.95;
            transform: translate(0, 0) scale(0.35);
          }
          35% {
            opacity: 1;
            transform: translate(var(--tx), var(--ty)) scale(1.3);
          }
          100% {
            opacity: 0;
            transform: translate(var(--tx), var(--ty)) scale(0);
          }
        }
      `}</style>

      {/* Volumetric Rotating Golden God Rays */}
      <div className="hb-volumetric-rays" />

      {/* Background Interactive Starlight & Tumbling Foil Canvas */}
      <canvas ref={canvasRef} className="hb-canvas" />

      {/* Ambient Twinkling Starlight Points */}
      <div className="hb-star" style={{ top: '14%', left: '10%', width: '3px', height: '3px' }} />
      <div className="hb-star" style={{ top: '24%', left: '88%', width: '2px', height: '2px', animationDelay: '1.2s' }} />
      <div className="hb-star" style={{ top: '72%', left: '18%', width: '3px', height: '3px', animationDelay: '2.1s' }} />
      <div className="hb-star" style={{ top: '78%', left: '82%', width: '2px', height: '2px', animationDelay: '0.8s' }} />
      <div className="hb-star" style={{ top: '42%', left: '94%', width: '3px', height: '3px', animationDelay: '1.6s' }} />
      <div className="hb-star" style={{ top: '58%', left: '6%', width: '2px', height: '2px', animationDelay: '2.5s' }} />

      {/* Skip Button (Top-Right Glassmorphism Pill) */}
      <button
        onClick={handleOpen}
        type="button"
        aria-label="Skip Door Animation"
        style={{
          position: 'absolute',
          top: 'max(12px, env(safe-area-inset-top, 12px))',
          right: 'max(12px, env(safe-area-inset-right, 12px))',
          zIndex: 50,
          background: 'rgba(24, 15, 34, 0.78)',
          border: '1px solid rgba(245, 198, 123, 0.45)',
          borderRadius: '9999px',
          padding: '4px 11px',
          color: 'rgba(255, 240, 245, 0.92)',
          fontSize: '0.62rem',
          fontWeight: 600,
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          cursor: 'pointer',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#fff';
          e.currentTarget.style.borderColor = '#f5c67b';
          e.currentTarget.style.boxShadow = '0 0 14px rgba(245, 198, 123, 0.55)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'rgba(255, 240, 245, 0.92)';
          e.currentTarget.style.borderColor = 'rgba(245, 198, 123, 0.45)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <span>Skip</span>
        <ArrowRight size={10} />
      </button>

      {/* ─── 50% LEFT & 50% RIGHT FULL-BLEED DOUBLE DOORS ─── */}
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
        aria-label="Click to Open Doors"
        className="hb-doors-wrapper"
      >
        {/* Warm Golden Inner Sanctum Backlight */}
        <div className="hb-inner-sanctum" />

        {/* LEFT DOOR */}
        <div className={`hb-door left ${doorLeftOpen ? 'open' : ''}`}>
          <div className="hb-door-face">
            <div className="hb-door-shimmer" />
            <div className="hb-door-inset-panel">
              <div className="hb-door-inset-inner-border" />
            </div>

            {/* Antique Studs Column */}
            <div className="hb-door-studs">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="hb-stud" />
              ))}
            </div>

            <div className="hb-door-knocker">
              <div className="hb-knocker-plate" />
              <div className="hb-knocker-ring" />
            </div>

            <div className="hb-geo-corner tl" />
            <div className="hb-geo-corner tr" />
            <div className="hb-geo-corner bl" />
            <div className="hb-geo-corner br" />
          </div>
        </div>

        {/* RIGHT DOOR */}
        <div className={`hb-door right ${doorRightOpen ? 'open' : ''}`}>
          <div className="hb-door-face">
            <div className="hb-door-shimmer" />
            <div className="hb-door-inset-panel">
              <div className="hb-door-inset-inner-border" />
            </div>

            {/* Antique Studs Column */}
            <div className="hb-door-studs">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="hb-stud" />
              ))}
            </div>

            <div className="hb-door-knocker">
              <div className="hb-knocker-plate" />
              <div className="hb-knocker-ring" />
            </div>

            <div className="hb-geo-corner tl" />
            <div className="hb-geo-corner tr" />
            <div className="hb-geo-corner bl" />
            <div className="hb-geo-corner br" />
          </div>
        </div>

        {/* CENTER VERTICAL SEAM GLOW */}
        <div className={`hb-seam-glow ${triggerVanished ? 'vanish' : ''}`} />
      </div>

      {/* ─── MATHEMATICALLY CENTERED CONTENT COLUMN ─── */}
      <div className="hb-content-column">
        {/* ─── ROYAL GILDED ARCHITRAVE PLAQUE ─── */}
        <div className={`hb-royal-plaque ${triggerVanished ? 'vanish' : ''}`}>
          {/* Art Deco Corner Diamonds */}
          <div className="hb-plaque-corner tl" />
          <div className="hb-plaque-corner tr" />
          <div className="hb-plaque-corner bl" />
          <div className="hb-plaque-corner br" />

          {/* Crown Crest & Filigree Accents */}
          <div className="hb-plaque-crest">
            <div className="hb-crest-line" />
            <div className="hb-crest-crown-circle">
              <Crown size={13} color="#180e1a" strokeWidth={2.4} />
            </div>
            <div className="hb-crest-line right" />
          </div>

          {/* Prelude */}
          <div className="hb-plaque-prelude">
            <Sparkles size={9} color="#f5c67b" />
            <span>You Are Cordially Invited</span>
            <Sparkles size={9} color="#f5c67b" />
          </div>

          {/* The Couple's Names in Gilded Gold Foil */}
          <CoupleTitle
            as="h1"
            className="hb-plaque-title"
            title={title}
            flourishColor="#F5C67B"
          />

          {/* Honor Phrasing */}
          {honorText && (
            <div className="hb-plaque-honor">
              &ldquo;{honorText}&rdquo;
            </div>
          )}

          {/* Date & Destination VIP Capsule Badge */}
          <div className="hb-plaque-destination">
            {formattedDate && <span>{formattedDate}</span>}
            {formattedDate && locationText && <span className="hb-meta-diamond">♦</span>}
            {locationText && <span>{locationText}</span>}
          </div>
        </div>

        {/* Decorative Gold Filigree Scroll Above Medallion */}
        <div
          style={{
            marginBottom: '4px',
            opacity: triggerVanished ? 0 : 0.65,
            transition: 'opacity 0.4s ease',
            pointerEvents: 'none',
          }}
        >
          <svg width="54" height="10" viewBox="0 0 60 12" fill="none">
            <path d="M4 9 C 20 2, 26 10, 30 4 C 34 10, 40 2, 56 9" stroke="#f5c67b" strokeWidth="1.3" />
            <circle cx="30" cy="3.5" r="1.8" fill="#f5c67b" />
          </svg>
        </div>

        {/* ─── ROYAL WAX SEAL MEDALLION CONTAINER ─── */}
        <div className="hb-royal-seal-container">
          {/* Silk Ribbons */}
          <div className={`hb-seal-ribbons ${triggerVanished ? 'vanish' : ''}`} style={{ opacity: triggerVanished ? 0 : 0.85 }}>
            <div className="hb-ribbon-tail left" />
            <div className="hb-ribbon-tail right" />
          </div>

          {/* Floating Medallion Trigger */}
          <button
            id="openMedallionTrigger"
            onClick={(e) => {
              e.stopPropagation();
              handleOpen();
            }}
            type="button"
            className={`hb-circle-trigger ${triggerVanished ? 'vanish' : ''}`}
            aria-label="Open Celebration Invitation"
          >
            <div className="hb-circle-halo" />
            <div className="hb-seal-coin-edge" />
            <div className="hb-circle-base" />
            <div className="hb-circle-ring" />
            <div className="hb-circle-content">
              {monogramImage ? (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    marginBottom: 2,
                    border: '1px solid rgba(245, 198, 123, 0.6)',
                  }}
                >
                  <img
                    src={monogramImage}
                    alt="Crest"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ) : (
                <>
                  <Crown size={14} color="#f5c67b" style={{ filter: 'drop-shadow(0 0 4px rgba(245, 198, 123, 0.8))' }} />
                  <span className="hb-circle-monogram">{monogram}</span>
                </>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                <Heart size={11} fill="#ff94b4" color="#ff94b4" style={{ filter: 'drop-shadow(0 0 5px #ff94b4)' }} />
              </div>
              <span className="hb-circle-label">
                <Sparkles size={7} />
                <span>touch to enter</span>
                <Sparkles size={7} />
              </span>
            </div>
          </button>
        </div>

        {/* Decorative Gold Filigree Scroll Below Medallion */}
        <div
          style={{
            marginTop: '-4px',
            marginBottom: '8px',
            opacity: triggerVanished ? 0 : 0.65,
            transition: 'opacity 0.4s ease',
            pointerEvents: 'none',
          }}
        >
          <svg width="54" height="10" viewBox="0 0 60 12" fill="none">
            <path d="M4 3 C 20 10, 26 2, 30 8 C 34 2, 40 10, 56 3" stroke="#f5c67b" strokeWidth="1.3" />
            <circle cx="30" cy="8.5" r="1.8" fill="#f5c67b" />
          </svg>
        </div>

        {/* ─── PREVIEW COUNTDOWN TIMER PILL ─── */}
        <div className={`hb-pre-timer ${triggerVanished ? 'vanish' : ''}`}>
          <div className="hb-pre-timer-label">
            <Sparkles size={8} color="#f5c67b" />
            <span>WAITS UNTIL YOUR CELEBRATION</span>
            <Sparkles size={8} color="#f5c67b" />
          </div>
          <div className="hb-pre-timer-value">{countdownText}</div>
        </div>
      </div>

      {/* ─── SPARKLE EMBER DRIFT PARTICLES ─── */}
      <div className="hb-sparkle-layer">
        {sparkles.map((sp) => (
          <div
            key={sp.id}
            className={`hb-sparkle ${sp.cls}`}
            style={
              {
                '--tx': sp.tx,
                '--ty': sp.ty,
                left: sp.left,
                top: sp.top,
                animationDelay: sp.delay,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
