'use client';

import React from 'react';
import { Volume2, VolumeX, Eye, ShieldCheck, Feather, Sparkles } from 'lucide-react';
import { atelierSoundscape } from '@/lib/atelier-soundscape';

export interface SceneMeta {
  id: number;
  label: string;
  subtitle: string;
}

export const SCENE_METAS: SceneMeta[] = [
  { id: 1, label: 'Threshold', subtitle: 'The Awakening' },
  { id: 2, label: 'Occasion', subtitle: 'The Sacred Milestone' },
  { id: 3, label: 'Atmosphere', subtitle: 'The Visual Worlds' },
  { id: 4, label: 'Protagonists', subtitle: 'Whom We Celebrate' },
  { id: 5, label: 'Horizon', subtitle: 'The Sanctuary & Date' },
  { id: 6, label: 'Narrative', subtitle: 'Their Story & Dedication' },
  { id: 7, label: 'The Reveal', subtitle: 'The Living Experience' },
  { id: 8, label: 'Seal & Launch', subtitle: 'Affix Seal & Share' },
];

interface ChapterCompassProps {
  activeScene: number;
  scrollProgress: number;
  onScrollToScene: (sceneNumber: number) => void;
  onToggleGuestPreview: () => void;
  isGuestPreviewActive: boolean;
  isAudioMuted: boolean;
  onToggleAudio: () => void;
  isCalmMode: boolean;
  onToggleCalmMode: () => void;
}

export const ChapterCompass: React.FC<ChapterCompassProps> = ({
  activeScene,
  scrollProgress,
  onScrollToScene,
  onToggleGuestPreview,
  isGuestPreviewActive,
  isAudioMuted,
  onToggleAudio,
  isCalmMode,
  onToggleCalmMode,
}) => {
  const currentScene = SCENE_METAS.find((s) => s.id === activeScene) || SCENE_METAS[0]!;

  return (
    <nav
      className="chapter-compass"
      aria-label="Cinematic Story Navigation"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '10px 20px',
        borderRadius: 999,
        background: 'rgba(12, 16, 24, 0.82)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(212, 175, 55, 0.28)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 20px rgba(212, 175, 55, 0.1)',
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      {/* Active Scene Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.35), rgba(212, 175, 55, 0.1))',
            border: '1px solid rgba(212, 175, 55, 0.5)',
            color: '#F5D061',
            fontSize: 11,
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
          }}
        >
          0{activeScene}
        </span>
        <div className="hide-on-mobile" style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(245, 247, 251, 0.5)' }}>
            Scene 0{activeScene} of 08
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#FAF8F5' }}>
            {currentScene?.label ?? 'Scene'}
          </span>
        </div>
      </div>

      {/* Progress Dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {SCENE_METAS.map((scene) => {
          const isActive = scene.id === activeScene;
          const isPast = scene.id < activeScene;

          return (
            <button
              key={scene.id}
              onClick={() => {
                atelierSoundscape.playPaperWhisper();
                onScrollToScene(scene.id);
              }}
              title={`Jump to ${scene.label}`}
              aria-label={`Jump to Scene 0${scene.id}: ${scene.label}`}
              style={{
                width: isActive ? 24 : 8,
                height: 8,
                borderRadius: 999,
                background: isActive
                  ? 'linear-gradient(90deg, #D4AF37 0%, #F5D061 100%)'
                  : isPast
                  ? 'rgba(212, 175, 55, 0.45)'
                  : 'rgba(255, 255, 255, 0.2)',
                boxShadow: isActive ? '0 0 10px rgba(212, 175, 55, 0.6)' : 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'all 0.35s cubic-bezier(0.19, 1, 0.22, 1)',
              }}
            />
          );
        })}
      </div>

      {/* Auxiliary Controls (Audio, Calm Mode, Guest View) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 10 }}>
        {/* Audio Toggle */}
        <button
          onClick={onToggleAudio}
          title={isAudioMuted ? 'Unmute Soundscape' : 'Mute Soundscape'}
          aria-label="Toggle Soundscape"
          style={{
            background: 'none',
            border: 'none',
            color: isAudioMuted ? 'rgba(255,255,255,0.4)' : '#D4AF37',
            padding: 6,
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isAudioMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>

        {/* Calm Mode / Motion toggle */}
        <button
          onClick={onToggleCalmMode}
          title={isCalmMode ? 'Calm Mode Active (Reduced Motion)' : 'Active Motion Experience'}
          aria-label="Toggle Calm Mode"
          style={{
            background: isCalmMode ? 'rgba(212, 175, 55, 0.2)' : 'none',
            border: 'none',
            color: isCalmMode ? '#F5D061' : 'rgba(255,255,255,0.5)',
            padding: 6,
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Feather size={15} />
        </button>

        {/* Live Guest Preview button */}
        <button
          onClick={onToggleGuestPreview}
          data-cursor="PREVIEW"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.05))',
            border: '1px solid rgba(212, 175, 55, 0.45)',
            borderRadius: 999,
            padding: '5px 12px',
            color: '#FAF8F5',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.05em',
          }}
        >
          <Eye size={12} color="#D4AF37" />
          <span className="hide-on-mobile">Preview</span>
        </button>
      </div>
    </nav>
  );
};
