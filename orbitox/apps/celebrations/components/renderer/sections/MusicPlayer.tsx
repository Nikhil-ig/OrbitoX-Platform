'use client';

import React, { useState, useRef } from 'react';
import { Theme } from '@orbitox-io/celebrations';

interface Props {
  theme: Theme;
  audioUrl?: string;
  trackTitle?: string;
  artistName?: string;
}

export function MusicPlayer({
  theme,
  audioUrl = 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
  trackTitle = 'Ethereal Romance Piano',
  artistName = 'OrbitoX Ambient',
}: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          // Autoplay policy or error
          setIsPlaying(false);
        });
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 18px',
        borderRadius: '9999px',
        background: 'rgba(10, 13, 20, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${theme.styleConfig.primaryColor}55`,
        boxShadow: `0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px ${theme.styleConfig.primaryColor}33`,
        transition: 'all 0.3s ease',
      }}
    >
      <audio ref={audioRef} src={audioUrl} loop preload="none" />

      {/* Disc / Play Icon Button */}
      <button
        onClick={togglePlay}
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          background: theme.styleConfig.primaryColor,
          color: '#07090E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1rem',
          fontWeight: 800,
          border: 'none',
          cursor: 'pointer',
          boxShadow: `0 0 14px ${theme.styleConfig.primaryColor}88`,
          animation: isPlaying ? 'spin 6s linear infinite' : 'none',
        }}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '140px', overflow: 'hidden' }}>
        <span
          style={{
            fontSize: '0.82rem',
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {trackTitle}
        </span>
        <span
          style={{
            fontSize: '0.7rem',
            color: theme.styleConfig.primaryColor,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {isPlaying ? 'Now Playing ♫' : artistName}
        </span>
      </div>

      <style jsx>{`
        @keyframes spin {
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
