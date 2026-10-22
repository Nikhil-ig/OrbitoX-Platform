'use client';

import React from 'react';
import { Sparkles, Volume2, VolumeX, Eye, ShieldCheck, Feather } from 'lucide-react';
import { atelierSoundscape } from '@/lib/atelier-soundscape';

export interface Chapter {
  id: number;
  label: string;
  subtitle: string;
}

export const ATELIER_CHAPTERS: Chapter[] = [
  { id: 1, label: 'Threshold', subtitle: 'The Invitation' },
  { id: 2, label: 'Occasion', subtitle: 'The Sacred Milestone' },
  { id: 3, label: 'Atmosphere', subtitle: 'The Visual World' },
  { id: 4, label: 'Protagonists', subtitle: 'Whom We Celebrate' },
  { id: 5, label: 'Horizon', subtitle: 'The Sanctuary & Date' },
  { id: 6, label: 'Narrative', subtitle: 'Their Story & Heart' },
  { id: 7, label: 'Reveal', subtitle: 'The Living Experience' },
  { id: 8, label: 'Seal & Launch', subtitle: 'Share With Loved Ones' },
];

interface AtelierChapterBarProps {
  currentChapter: number;
  totalChapters?: number;
  onSelectChapter: (chapter: number) => void;
  onToggleGuestPreview: () => void;
  isGuestPreviewActive: boolean;
  isAudioMuted: boolean;
  onToggleAudio: () => void;
  isCalmMode: boolean;
  onToggleCalmMode: () => void;
}

export const AtelierChapterBar: React.FC<AtelierChapterBarProps> = ({
  currentChapter,
  onSelectChapter,
  onToggleGuestPreview,
  isGuestPreviewActive,
  isAudioMuted,
  onToggleAudio,
  isCalmMode,
  onToggleCalmMode,
}) => {
  const currentChapterObj = ATELIER_CHAPTERS.find((c) => c.id === currentChapter) || ATELIER_CHAPTERS[0];

  return (
    <nav
      className="chapter-compass"
      aria-label="Story chapter progression"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
      }}
    >
      {/* Chapter Details & Micro-Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.3), rgba(212, 175, 55, 0.05))',
            border: '1px solid rgba(212, 175, 55, 0.5)',
            color: '#F5D061',
            fontSize: 12,
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
          }}
        >
          0{currentChapter}
        </span>
        <div className="hide-on-mobile" style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(245, 247, 251, 0.5)' }}>
            Scene 0{currentChapter} of 08
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#FAF8F5' }}>
            {currentChapterObj?.label ?? 'Scene'}
          </span>
        </div>
      </div>

      {/* Chapter Dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {ATELIER_CHAPTERS.map((chapter) => {
          const isActive = chapter.id === currentChapter;
          const isPassed = chapter.id < currentChapter;

          return (
            <button
              key={chapter.id}
              type="button"
              onClick={() => {
                atelierSoundscape.playTactileTick();
                onSelectChapter(chapter.id);
              }}
              aria-label={`Jump to Scene 0${chapter.id}: ${chapter.label}`}
              className={`chapter-compass-dot ${isActive ? 'active' : ''}`}
              style={{
                background: isActive
                  ? undefined
                  : isPassed
                  ? 'rgba(212, 175, 55, 0.55)'
                  : 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                padding: 0,
                outline: 'none',
              }}
              title={`Scene 0${chapter.id}: ${chapter.label} - ${chapter.subtitle}`}
            />
          );
        })}
      </div>

      {/* Controls: Sound, Calm Mode & Full Guest View */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          onClick={onToggleAudio}
          aria-label={isAudioMuted ? 'Unmute atmospheric audio' : 'Mute atmospheric audio'}
          title={isAudioMuted ? 'Enable tactile audio' : 'Mute tactile audio'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: isAudioMuted ? 'rgba(255, 255, 255, 0.05)' : 'rgba(212, 175, 55, 0.18)',
            border: isAudioMuted ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(212, 175, 55, 0.4)',
            color: isAudioMuted ? 'rgba(245, 247, 251, 0.45)' : '#F5D061',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
          }}
        >
          {isAudioMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>

        <button
          type="button"
          onClick={onToggleCalmMode}
          aria-label={isCalmMode ? 'Calm Mode Active (Reduced Motion)' : 'Enable Calm Mode'}
          title={isCalmMode ? 'Calm Mode is Active' : 'Switch to Calm Mode (Reduced Motion)'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: isCalmMode ? 'rgba(143, 214, 178, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            border: isCalmMode ? '1px solid rgba(143, 214, 178, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
            color: isCalmMode ? '#9CE5C4' : 'rgba(245, 247, 251, 0.45)',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
          }}
        >
          <Feather size={14} />
        </button>

        <button
          type="button"
          onClick={() => {
            atelierSoundscape.playHarpArpeggio();
            onToggleGuestPreview();
          }}
          aria-label="Toggle Full Guest Experience Preview"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            borderRadius: 999,
            background: isGuestPreviewActive
              ? 'linear-gradient(135deg, #FAF4E1 0%, #D4AF37 100%)'
              : 'rgba(255, 255, 255, 0.08)',
            border: isGuestPreviewActive
              ? '1px solid rgba(255, 255, 255, 0.6)'
              : '1px solid rgba(255, 255, 255, 0.12)',
            color: isGuestPreviewActive ? '#090B10' : '#FAF8F5',
            fontSize: 12,
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
          }}
        >
          <Eye size={13} />
          <span>{isGuestPreviewActive ? 'Atelier Studio' : 'Guest View'}</span>
        </button>
      </div>
    </nav>
  );
};
