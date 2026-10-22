'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

/**
 * Intricate Mughal / Rajasthani Royal Archway (Jharokha Motif)
 */
export function RoyalArchwaySvg({ size = 48, color = '#D4AF37' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size * 0.7}
      viewBox="0 0 100 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block' }}
    >
      <path
        d="M10 65 V 35 Q 10 15 50 5 Q 90 15 90 35 V 65"
        stroke={color}
        strokeWidth="1.8"
        fill="none"
      />
      <path
        d="M18 65 V 36 Q 18 20 50 12 Q 82 20 82 36 V 65"
        stroke={color}
        strokeWidth="1"
        strokeDasharray="2 2"
        fill="none"
      />
      {/* Central Ornamental Keystones */}
      <circle cx="50" cy="5" r="3" fill={color} />
      <circle cx="50" cy="12" r="2" fill={color} />
      {/* Decorative Finials */}
      <path d="M50 0 L 52 4 L 50 5 L 48 4 Z" fill={color} />
    </svg>
  );
}

/**
 * Imperial 24K Gold Crown Motif (Cartier / Haute Joaillerie Heritage)
 */
export function RoyalCrownMotif({ size = 28, color = '#FFDF73' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size * 0.75}
      viewBox="0 0 40 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', filter: 'drop-shadow(0 2px 8px rgba(212, 175, 55, 0.45))' }}
    >
      {/* Crown Base Rim */}
      <path d="M6 25 H34" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M8 27 H32" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      
      {/* Crown Spikes */}
      <path
        d="M6 23 L9 12 L15 18 L20 6 L25 18 L31 12 L34 23 Z"
        stroke={color}
        strokeWidth="1.6"
        fill={`${color}1A`}
        strokeLinejoin="round"
      />
      {/* Jewels on peaks */}
      <circle cx="20" cy="5" r="2" fill={color} />
      <circle cx="9" cy="11" r="1.5" fill={color} />
      <circle cx="31" cy="11" r="1.5" fill={color} />
      <circle cx="20" cy="17" r="1.5" fill={color} opacity="0.8" />
    </svg>
  );
}

/**
 * Authentic Etched Baroque Corner Flourish SVG
 */
export function RoyalCornerFlourish({
  position = 'top-left',
  size = 44,
  color = '#D4AF37',
}: {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size?: number;
  color?: string;
}) {
  const getTransform = () => {
    switch (position) {
      case 'top-right':
        return 'scaleX(-1)';
      case 'bottom-left':
        return 'scaleY(-1)';
      case 'bottom-right':
        return 'scale(-1, -1)';
      default:
        return 'none';
    }
  };

  const getPositionStyles = (): React.CSSProperties => {
    const offset = 6;
    switch (position) {
      case 'top-left':
        return { top: offset, left: offset };
      case 'top-right':
        return { top: offset, right: offset };
      case 'bottom-left':
        return { bottom: offset, left: offset };
      case 'bottom-right':
        return { bottom: offset, right: offset };
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        width: `${size}px`,
        height: `${size}px`,
        pointerEvents: 'none',
        transform: getTransform(),
        ...getPositionStyles(),
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 50 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.85 }}
      >
        {/* Outer Corner Frame */}
        <path d="M2 28 V6 C2 3.79086 3.79086 2 6 2 H28" stroke={color} strokeWidth="1.2" fill="none" />
        {/* Inner Accent Line */}
        <path d="M6 22 V9 C6 7.34315 7.34315 6 9 6 H22" stroke={color} strokeWidth="0.8" strokeDasharray="1.5 1.5" fill="none" />
        {/* Ornate Scroll Curls */}
        <path d="M3 3 C10 10, 14 14, 18 18" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="18" cy="18" r="2" fill={color} />
        <circle cx="6" cy="6" r="1.5" fill={color} />
      </svg>
    </div>
  );
}

/**
 * Imperial Wax-Seal Medallion with Gold-Embossed Crest
 */
export function RoyalWaxSeal({
  size = 64,
  sealColor = '#991B1B',
  crestColor = '#FFDF73',
  initials = 'OM',
}: {
  size?: number;
  sealColor?: string;
  crestColor?: string;
  initials?: string;
}) {
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: 'drop-shadow(0 8px 24px rgba(0, 0, 0, 0.65)) drop-shadow(0 2px 8px rgba(185, 28, 28, 0.4))',
        }}
      >
        {/* Organic scalloped wax edge */}
        <path
          d="M50 5 C62 5, 68 12, 78 15 C88 18, 93 28, 95 38 C97 48, 92 58, 89 68 C86 78, 77 86, 68 90 C59 94, 49 96, 39 93 C29 90, 20 84, 15 75 C10 66, 6 56, 7 46 C8 36, 14 26, 22 19 C30 12, 38 5, 50 5 Z"
          fill={sealColor}
        />
        {/* Subtle wax relief highlight */}
        <circle cx="50" cy="50" r="38" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" fill="none" />
        {/* Embossed inner circle */}
        <circle cx="50" cy="50" r="34" stroke={crestColor} strokeWidth="1.5" strokeDasharray="3 2" fill="none" opacity="0.8" />
        <circle cx="50" cy="50" r="30" stroke={crestColor} strokeWidth="2" fill="none" opacity="0.9" />
        {/* Crown & Royal Flourish */}
        <path
          d="M38 40 L 42 34 L 50 38 L 58 34 L 62 40 Z"
          fill={crestColor}
        />
        <text
          x="50"
          y="62"
          fill={crestColor}
          fontSize="18"
          fontWeight="700"
          fontFamily="'Cinzel', 'Playfair Display', serif"
          textAnchor="middle"
          letterSpacing="2"
        >
          {initials}
        </text>
      </svg>
    </div>
  );
}

/**
 * Royal Gold Filigree Horizontal Divider with Central Diamond
 */
export function RoyalFiligreeDivider({ color = '#D4AF37', maxWidth = 480 }: { color?: string; maxWidth?: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        maxWidth: `${maxWidth}px`,
        margin: '32px auto',
        width: '90%',
      }}
    >
      <div
        style={{
          flex: 1,
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${color} 70%, ${color})`,
          opacity: 0.6,
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: color,
        }}
      >
        <span style={{ fontSize: '10px', opacity: 0.8 }}>♦</span>
        <div
          style={{
            width: '8px',
            height: '8px',
            transform: 'rotate(45deg)',
            border: `1.5px solid ${color}`,
            backgroundColor: `${color}33`,
            boxShadow: `0 0 10px ${color}88`,
          }}
        />
        <span style={{ fontSize: '10px', opacity: 0.8 }}>♦</span>
      </div>
      <div
        style={{
          flex: 1,
          height: '1px',
          background: `linear-gradient(90deg, ${color}, ${color} 30%, transparent)`,
          opacity: 0.6,
        }}
      />
    </div>
  );
}

/**
 * Jeweled Countdown Pedestal (Haute Horlogerie Timepiece)
 */
export function RoyalCountdownPills({
  targetDate,
  accentColor = '#D4AF37',
}: {
  targetDate: string;
  accentColor?: string;
}) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    function calculate() {
      // Parse flexible date strings safely
      let parsedDate = Date.parse(targetDate);
      if (isNaN(parsedDate)) {
        // Fallback to safe future date if string is human formatted like 'February 18, 2027'
        parsedDate = new Date('2027-02-18T18:00:00Z').getTime();
      }
      const diff = parsedDate - Date.now();
      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    }

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const units = [
    { label: 'DAYS', val: timeLeft.days },
    { label: 'HOURS', val: timeLeft.hours },
    { label: 'MINS', val: timeLeft.minutes },
    { label: 'SECS', val: timeLeft.seconds },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'clamp(8px, 2.5vw, 18px)',
        margin: '28px auto 36px auto',
        flexWrap: 'wrap',
      }}
    >
      {units.map((unit) => (
        <div
          key={unit.label}
          style={{
            minWidth: 'clamp(68px, 18vw, 88px)',
            padding: '14px 10px',
            borderRadius: '16px',
            background: 'linear-gradient(180deg, rgba(20, 26, 56, 0.85) 0%, rgba(10, 14, 32, 0.95) 100%)',
            border: `1px solid ${accentColor}55`,
            boxShadow: `0 10px 30px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.15), 0 0 15px ${accentColor}1A`,
            backdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          {/* Subtle jewel highlight at top */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '20%',
              right: '20%',
              height: '1px',
              background: `linear-gradient(90deg, transparent, #FFFFFF, transparent)`,
              opacity: 0.5,
            }}
          />
          <span
            style={{
              fontFamily: "'Cinzel', 'Playfair Display', serif",
              fontSize: 'clamp(1.5rem, 4vw, 2.1rem)',
              fontWeight: 700,
              lineHeight: 1.1,
              background: 'linear-gradient(180deg, #FFFFFF 0%, #FFDF73 60%, #D4AF37 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: `drop-shadow(0 2px 8px ${accentColor}44)`,
            }}
          >
            {String(unit.val).padStart(2, '0')}
          </span>
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '0.62rem',
              fontWeight: 700,
              letterSpacing: '1.8px',
              color: 'rgba(250, 245, 238, 0.65)',
              marginTop: '4px',
            }}
          >
            {unit.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Floating Luxury Audio Soundscape Pill
 */
export function RoyalAudioPlayerPill({
  isPlaying,
  onToggle,
  trackName = 'Palace Baroque Waltz',
}: {
  isPlaying: boolean;
  onToggle: () => void;
  trackName?: string;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 16px',
        borderRadius: '9999px',
        background: 'rgba(6, 8, 20, 0.82)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(212, 175, 55, 0.4)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(212, 175, 55, 0.25)',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
      }}
      onClick={onToggle}
      title={isPlaying ? 'Mute Palace Atmosphere' : 'Play Palace Atmosphere'}
    >
      {/* Animated Equalizer Soundwave Bars */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '14px', width: '16px' }}>
        {[0.6, 1.0, 0.7, 0.9].map((heightFrac, idx) => (
          <span
            key={idx}
            style={{
              width: '2.5px',
              height: isPlaying ? `${heightFrac * 14}px` : '3px',
              backgroundColor: '#FFDF73',
              borderRadius: '2px',
              transition: 'height 0.2s ease',
            }}
          />
        ))}
      </div>

      <span
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: '0.75rem',
          letterSpacing: '1px',
          color: '#FFDF73',
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        {isPlaying ? trackName : 'Muted'}
      </span>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#D4AF37',
          marginLeft: '2px',
        }}
      >
        {isPlaying ? <Volume2 size={15} /> : <VolumeX size={15} />}
      </div>
    </div>
  );
}

/**
 * Concentric Radiant Imperial Union Medallion
 */
export function RoyalUnionMedallion({ size = 56, color = '#D4AF37' }: { size?: number; color?: string }) {
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: 'rgba(13, 18, 43, 0.9)',
        border: `1.5px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFDF73',
        boxShadow: `0 0 25px ${color}55, inset 0 0 12px ${color}33`,
        position: 'relative',
      }}
    >
      {/* Radiant concentric ring */}
      <div
        style={{
          position: 'absolute',
          inset: '-5px',
          borderRadius: '50%',
          border: `1px dashed ${color}66`,
          pointerEvents: 'none',
        }}
      />
      <span
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: `${size * 0.44}px`,
          fontWeight: 700,
          color: '#FFDF73',
          lineHeight: 1,
          textShadow: `0 0 10px ${color}88`,
        }}
      >
        &amp;
      </span>
    </div>
  );
}

