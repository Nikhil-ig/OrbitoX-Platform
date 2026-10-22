import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NodeRenderContext } from '../NodeRendererRegistry';
import { prefersReducedMotion, calculateNormalizedPointer } from '@/lib/motion-system';
import { Sparkles, Play, Pause } from 'lucide-react';

export function CelestialParallaxPortrait({ node, resolvedStyle, resolvedState }: NodeRenderContext) {
  const isP1 = node.id.includes('portrait_a') || node.id.includes('p1') || node.binding?.fieldKey?.includes('[0]');
  const defaultP1Img = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=85';
  const defaultP2Img = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=85';

  const partnerName = node.smartProps?.partnerName || (isP1 ? resolvedState?.protagonist1 : resolvedState?.protagonist2) || (isP1 ? 'Aarav' : 'Meera');
  const partnerRole = node.smartProps?.partnerRole || (isP1 ? resolvedState?.protagonist1Role : resolvedState?.protagonist2Role) || (isP1 ? 'The Groom' : 'The Bride');
  const partnerImage = node.smartProps?.partnerImage || (isP1 ? resolvedState?.protagonist1Image : resolvedState?.protagonist2Image) || (isP1 ? defaultP1Img : defaultP2Img);
  const primaryAccent = node.smartProps?.primaryAccent || resolvedState?.primaryColorOverride || '#DFBA6B';
  const parallaxDepth = node.smartProps?.parallaxDepth || 1.0;
  const isAudioEnabled = node.smartProps?.isAudioEnabled !== false;

  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<any>(null);

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

  const playChime = useCallback(() => {
    if (!isAudioEnabled) return;
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      const freqs = [440, 554.37];
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
  }, [isAudioEnabled]);

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
      }}
      onMouseEnter={() => { setIsHovered(true); playChime(); }}
      onMouseLeave={() => { setIsHovered(false); setPointer({ x: 0, y: 0 }); }}
    >
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: isHovered ? `0 24px 60px -10px rgba(0,0,0,0.8), 0 0 30px ${primaryAccent}44` : '0 16px 40px -10px rgba(0,0,0,0.6)',
        transform: isReducedStatic ? 'none' : `perspective(1000px) rotateX(${pointer.y * -5 * parallaxDepth}deg) rotateY(${pointer.x * 5 * parallaxDepth}deg) scale(${isHovered ? 1.02 : 1})`,
        transition: isHovered ? 'transform 0.2s ease-out, box-shadow 0.4s ease' : `transform ${entryDuration} ${motionEasing}, box-shadow 0.8s ease`,
      }}>
        <img src={partnerImage} alt={partnerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)' }} />
        
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ color: primaryAccent, fontSize: '0.8rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>{partnerRole}</span>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#fff', margin: 0, letterSpacing: '0.05em' }}>{partnerName}</h3>
        </div>

        {isHovered && (
          <div style={{ position: 'absolute', top: '16px', right: '16px', animation: 'fadeIn 0.3s ease' }}>
            <Sparkles size={20} color={primaryAccent} />
          </div>
        )}
      </div>
    </div>
  );
}
