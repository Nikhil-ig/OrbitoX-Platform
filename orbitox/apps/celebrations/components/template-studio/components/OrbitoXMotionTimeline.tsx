'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock, Sparkles, ChevronRight, Sliders, Zap, Layers, Activity } from 'lucide-react';
import { SceneGraphNode } from '../engine/SceneGraphTypes';

export interface MotionTrack {
  id: string;
  nodeId: string;
  nodeName: string;
  property: string;
  startTime: number; // in seconds
  duration: number; // in seconds
  easing: string;
  startValue: string | number;
  endValue: string | number;
}

interface Props {
  selectedNode: SceneGraphNode | null;
  sceneName: string;
  onApplyPreset?: (presetName: string) => void;
  onClose?: () => void;
}

export function OrbitoXMotionTimeline({
  selectedNode,
  sceneName,
  onApplyPreset,
  onClose,
}: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0.8);
  const [timelineMode, setTimelineMode] = useState<'time' | 'scroll'>('time');
  const [scrollProgress, setScrollProgress] = useState(35);
  const [activeProperty, setActiveProperty] = useState<string>('opacity');

  // Motion presets
  const presets = [
    { id: 'cinematic', label: 'Cinematic Entrance', icon: '🎬' },
    { id: 'elegant', label: 'Elegant Reveal', icon: '✨' },
    { id: 'text-stagger', label: 'Text Stagger', icon: '🔤' },
    { id: 'depth-zoom', label: 'Depth Zoom', icon: '🔍' },
    { id: 'float', label: 'Soft Float', icon: '🎈' },
    { id: 'spring', label: 'Magnetic Spring', icon: '🧲' },
    { id: 'shimmer', label: 'Glass Shimmer', icon: '💎' },
    { id: 'particle-drift', label: 'Particle Drift', icon: '🌌' },
  ];

  // Animated elements tracks in active scene
  const [tracks, setTracks] = useState<MotionTrack[]>([
    {
      id: 'track-1',
      nodeId: 'heading',
      nodeName: 'Monumental Heading',
      property: 'opacity & y-offset',
      startTime: 0.2,
      duration: 1.0,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      startValue: 'y: 40px, op: 0',
      endValue: 'y: 0px, op: 1',
    },
    {
      id: 'track-2',
      nodeId: 'tagline',
      nodeName: 'Subhead / Tagline',
      property: 'text-split words',
      startTime: 0.5,
      duration: 1.2,
      easing: 'easeOutExpo',
      startValue: 'stagger: 0.05s',
      endValue: 'opacity: 1',
    },
    {
      id: 'track-3',
      nodeId: 'hero-media',
      nodeName: 'Primary Visual Media',
      property: 'scale & blur',
      startTime: 0.4,
      duration: 1.4,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
      startValue: 'scale: 0.92, blur: 12px',
      endValue: 'scale: 1.0, blur: 0px',
    },
    {
      id: 'track-4',
      nodeId: 'cta-button',
      nodeName: 'Action Button / RSVP',
      property: 'spring pop',
      startTime: 1.1,
      duration: 0.9,
      easing: 'spring(stiffness: 180, damping: 14)',
      startValue: 'scale: 0.8, op: 0',
      endValue: 'scale: 1.0, op: 1',
    },
    {
      id: 'track-5',
      nodeId: 'atmosphere',
      nodeName: 'Cosmic Stardust Field',
      property: 'infinite drift',
      startTime: 0.0,
      duration: 3.0,
      easing: 'linear',
      startValue: 'drift: 0px',
      endValue: 'drift: 60px',
    },
  ]);

  // Play animation loop
  useEffect(() => {
    let animId: number;
    if (isPlaying) {
      const start = performance.now();
      const initial = currentTime;
      const step = (now: number) => {
        const elapsed = (now - start) / 1000;
        const nextTime = (initial + elapsed) % 3.0;
        setCurrentTime(nextTime);
        animId = requestAnimationFrame(step);
      };
      animId = requestAnimationFrame(step);
    }
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, currentTime]);

  const maxTime = 3.0;

  return (
    <div
      style={{
        height: '240px',
        width: '100%',
        background: '#070A14',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 45,
        boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.6)',
        userSelect: 'none',
        color: '#FFFFFF',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* ── TOP CONTROL BAR ── */}
      <div
        style={{
          height: '42px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          background: 'rgba(255, 255, 255, 0.02)',
        }}
      >
        {/* Left: Playhead Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: isPlaying ? 'rgba(239, 68, 68, 0.2)' : 'rgba(223, 186, 107, 0.2)',
              border: isPlaying ? '1px solid #EF4444' : '1px solid #DFBA6B',
              color: isPlaying ? '#EF4444' : '#DFBA6B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title={isPlaying ? 'Pause Timeline' : 'Play Timeline'}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} style={{ marginLeft: '2px' }} />}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentTime(0);
            }}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Reset to 0.0s"
          >
            <RotateCcw size={13} />
          </button>

          {/* Time Readout */}
          <div
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#DFBA6B',
              background: 'rgba(0, 0, 0, 0.4)',
              padding: '3px 8px',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {timelineMode === 'time' ? `${currentTime.toFixed(2)}s / ${maxTime.toFixed(2)}s` : `Scroll: ${scrollProgress}%`}
          </div>

          <div style={{ width: '1px', height: '16px', background: 'rgba(255, 255, 255, 0.1)' }} />

          {/* Mode switch: Time vs Scroll */}
          <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '6px', padding: '2px' }}>
            <button
              onClick={() => setTimelineMode('time')}
              style={{
                border: 'none',
                background: timelineMode === 'time' ? 'rgba(223, 186, 107, 0.25)' : 'transparent',
                color: timelineMode === 'time' ? '#DFBA6B' : 'rgba(255, 255, 255, 0.5)',
                padding: '3px 10px',
                borderRadius: '4px',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Time Timeline
            </button>
            <button
              onClick={() => setTimelineMode('scroll')}
              style={{
                border: 'none',
                background: timelineMode === 'scroll' ? 'rgba(223, 186, 107, 0.25)' : 'transparent',
                color: timelineMode === 'scroll' ? '#DFBA6B' : 'rgba(255, 255, 255, 0.5)',
                padding: '3px 10px',
                borderRadius: '4px',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Scroll Progress
            </button>
          </div>
        </div>

        {/* Center: Presets Quick Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', maxWidth: '50%' }}>
          <span style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Presets:
          </span>
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => onApplyPreset?.(p.id)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '9999px',
                padding: '3px 8px',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.68rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#DFBA6B')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)')}
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>

        {/* Right: Scene Badge & FPS indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
            <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.5)' }}>60 FPS Spring Driver</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#DFBA6B', fontWeight: 600 }}>{sceneName}</span>
        </div>
      </div>

      {/* ── TIMELINE TRACKS & CANVAS ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Track Headers (Left column) */}
        <div
          style={{
            width: '240px',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              height: '24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '0 12px',
              fontSize: '0.65rem',
              color: 'rgba(255, 255, 255, 0.4)',
              fontWeight: 700,
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            Layer / Element Track
          </div>

          {/* Track items */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {tracks.map((track) => (
              <div
                key={track.id}
                style={{
                  height: '32px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                  padding: '0 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: selectedNode?.id === track.nodeId ? 'rgba(223, 186, 107, 0.1)' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#FFFFFF', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {track.nodeName}
                  </span>
                </div>
                <span style={{ fontSize: '0.62rem', color: '#DFBA6B', opacity: 0.8 }}>
                  {track.property}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Ruler & Keyframe Area (Right column) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          {/* Time Ruler */}
          <div
            style={{
              height: '24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              position: 'relative',
              background: 'rgba(0, 0, 0, 0.15)',
            }}
          >
            {[0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0].map((t) => {
              const leftPercent = (t / maxTime) * 100;
              return (
                <div
                  key={t}
                  style={{
                    position: 'absolute',
                    left: `${leftPercent}%`,
                    top: 0,
                    bottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '2px 0 2px 4px',
                    borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <span style={{ fontSize: '0.62rem', color: 'rgba(255, 255, 255, 0.4)', fontFamily: 'ui-monospace, monospace' }}>
                    {timelineMode === 'time' ? `${t.toFixed(1)}s` : `${Math.round((t / maxTime) * 100)}%`}
                  </span>
                </div>
              );
            })}

            {/* Scrub Playhead Line on Ruler */}
            <div
              style={{
                position: 'absolute',
                left: `${(currentTime / maxTime) * 100}%`,
                top: 0,
                bottom: 0,
                width: '1px',
                background: '#DFBA6B',
                zIndex: 20,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '-2px',
                  left: '-5px',
                  width: '11px',
                  height: '11px',
                  background: '#DFBA6B',
                  borderRadius: '2px',
                  transform: 'rotate(45deg)',
                }}
              />
            </div>
          </div>

          {/* Keyframe Track Bars */}
          <div
            style={{ flex: 1, position: 'relative', overflowY: 'auto' }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, clickX / rect.width));
              setCurrentTime(ratio * maxTime);
            }}
          >
            {/* Playhead vertical needle across all tracks */}
            <div
              style={{
                position: 'absolute',
                left: `${(currentTime / maxTime) * 100}%`,
                top: 0,
                bottom: 0,
                width: '1px',
                background: 'rgba(223, 186, 107, 0.8)',
                pointerEvents: 'none',
                zIndex: 15,
                boxShadow: '0 0 8px rgba(223, 186, 107, 0.5)',
              }}
            />

            {tracks.map((track) => {
              const leftPercent = (track.startTime / maxTime) * 100;
              const widthPercent = (track.duration / maxTime) * 100;

              return (
                <div
                  key={track.id}
                  style={{
                    height: '32px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {/* Track Block Capsule */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                      height: '20px',
                      borderRadius: '6px',
                      background: 'linear-gradient(90deg, rgba(223, 186, 107, 0.25) 0%, rgba(139, 92, 246, 0.35) 100%)',
                      border: '1px solid rgba(223, 186, 107, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 6px',
                      cursor: 'grab',
                    }}
                  >
                    {/* Left Keyframe Diamond */}
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        background: '#DFBA6B',
                        transform: 'rotate(45deg)',
                        borderRadius: '1px',
                        boxShadow: '0 0 6px rgba(223, 186, 107, 0.8)',
                      }}
                      title={`Start keyframe: ${track.startValue}`}
                    />

                    <span style={{ fontSize: '0.62rem', color: '#FFFFFF', fontWeight: 600, opacity: 0.9 }}>
                      {track.duration}s
                    </span>

                    {/* Right Keyframe Diamond */}
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        background: '#A855F7',
                        transform: 'rotate(45deg)',
                        borderRadius: '1px',
                        boxShadow: '0 0 6px rgba(168, 85, 247, 0.8)',
                      }}
                      title={`End keyframe: ${track.endValue}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
