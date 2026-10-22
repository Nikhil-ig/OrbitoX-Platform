'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Sliders,
  ChevronRight,
  Clock,
  Layers,
  Zap,
  X,
  Activity,
  Check,
} from 'lucide-react';
import { SceneGraphNode } from '@/components/template-studio/engine/SceneGraphTypes';
import { WAAPIMotionDriver } from './services/WAAPIMotionDriver';

interface MotionWorkspaceProps {
  selectedNode: SceneGraphNode | null;
  sceneName: string;
  onApplyPreset?: (preset: string) => void;
  onUpdateNode?: (nodeId: string, patch: Partial<SceneGraphNode>) => void;
  onClose?: () => void;
}

export function MotionWorkspace({
  selectedNode,
  sceneName,
  onApplyPreset,
  onUpdateNode,
  onClose,
}: MotionWorkspaceProps) {
  // Navigation & View Mode
  const [workspaceView, setWorkspaceView] = useState<'timeline' | 'physics'>('timeline');
  const [physicsMode, setPhysicsMode] = useState<'spring' | 'curve'>('spring');

  // Timeline State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // 0 to 3 seconds
  const [duration, setDuration] = useState(1.5);
  const [activeProperty, setActiveProperty] = useState<string>('opacity');
  const [driverMode, setDriverMode] = useState<'time' | 'scroll'>('time');
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Synchronize playhead with Canvas element using WAAPIMotionDriver (Bug 09 fix)
  useEffect(() => {
    if (selectedNode?.id) {
      WAAPIMotionDriver.syncPlayhead(
        selectedNode.id,
        currentTime,
        duration,
        selectedNode.motion?.in?.type || 'fade'
      );
    }
  }, [currentTime, duration, selectedNode?.id, selectedNode?.motion?.in?.type]);

  useEffect(() => {
    return () => {
      if (selectedNode?.id) {
        WAAPIMotionDriver.resetNode(selectedNode.id);
      }
    };
  }, [selectedNode?.id]);

  const handleScrubPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsScrubbing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left - 20;
    const fraction = Math.max(0, Math.min(1, clickX / 360));
    setCurrentTime(fraction * 3.0);
  };

  const handleScrubPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left - 20;
    const fraction = Math.max(0, Math.min(1, clickX / 360));
    setCurrentTime(fraction * 3.0);
  };

  const handleScrubPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsScrubbing(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  // Spring Physics State (damping, stiffness, mass)
  const [damping, setDamping] = useState<number>(selectedNode?.motion?.in?.spring?.damping ?? 20);
  const [stiffness, setStiffness] = useState<number>(selectedNode?.motion?.in?.spring?.stiffness ?? 180);
  const [mass, setMass] = useState<number>(selectedNode?.motion?.in?.spring?.mass ?? 1.0);
  const [isSimulatingSpring, setIsSimulatingSpring] = useState(false);
  const [hasAppliedFeedback, setHasAppliedFeedback] = useState(false);

  // Cubic Bezier Visual Curve Coordinates (P1, P2)
  const initialCurve = selectedNode?.motion?.in?.cubicBezier || [0.16, 1.0, 0.3, 1.0];
  const [p1, setP1] = useState<{ x: number; y: number }>({ x: initialCurve[0], y: initialCurve[1] });
  const [p2, setP2] = useState<{ x: number; y: number }>({ x: initialCurve[2], y: initialCurve[3] });
  const [draggingHandle, setDraggingHandle] = useState<'p1' | 'p2' | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Sync state if selectedNode changes
  useEffect(() => {
    if (selectedNode?.motion?.in?.spring) {
      setDamping(selectedNode.motion.in.spring.damping);
      setStiffness(selectedNode.motion.in.spring.stiffness);
      setMass(selectedNode.motion.in.spring.mass);
    }
    if (selectedNode?.motion?.in?.cubicBezier) {
      const cb = selectedNode.motion.in.cubicBezier;
      setP1({ x: cb[0], y: cb[1] });
      setP2({ x: cb[2], y: cb[3] });
    }
  }, [selectedNode?.id]);

  // Playhead loop for timeline
  useEffect(() => {
    if (isPlaying) {
      const startTime = performance.now() - currentTime * 1000;
      const step = (now: number) => {
        const elapsed = (now - startTime) / 1000;
        if (elapsed >= duration) {
          setCurrentTime(0);
          setIsPlaying(false);
        } else {
          setCurrentTime(elapsed);
          animationFrameRef.current = requestAnimationFrame(step);
        }
      };
      animationFrameRef.current = requestAnimationFrame(step);
    } else {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, duration]);

  // Dragging interaction for Cubic-Bezier handles
  const handleSvgPointerDown = (handle: 'p1' | 'p2', e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingHandle(handle);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handleSvgPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingHandle || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const startX = 20;
      const startY = 110;
      const spanX = 180;
      const spanY = 90;

      const normX = Math.max(0, Math.min(1, (e.clientX - rect.left - startX) / spanX));
      const normY = (startY - (e.clientY - rect.top)) / spanY;
      const roundedX = Number(normX.toFixed(2));
      const roundedY = Number(normY.toFixed(2));

      if (draggingHandle === 'p1') {
        setP1({ x: roundedX, y: roundedY });
      } else {
        setP2({ x: roundedX, y: roundedY });
      }
    },
    [draggingHandle]
  );

  const handleSvgPointerUp = (e: React.PointerEvent) => {
    if (draggingHandle) {
      setDraggingHandle(null);
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch {
        // Safe ignore
      }
    }
  };

  // Trigger Spring Simulation Preview
  const triggerSpringSimulation = () => {
    setIsSimulatingSpring(false);
    requestAnimationFrame(() => {
      setIsSimulatingSpring(true);
      setTimeout(() => setIsSimulatingSpring(false), 1400);
    });
  };

  // Apply Spring Physics to Selected Node
  const handleApplySpring = () => {
    if (selectedNode && onUpdateNode) {
      onUpdateNode(selectedNode.id, {
        motion: {
          ...(selectedNode.motion || {}),
          in: {
            ...(selectedNode.motion?.in || { type: 'fade', duration: Math.round(duration * 1000), delay: 0 }),
            easing: 'spring',
            spring: { damping, stiffness, mass },
          },
        },
      });
      triggerSpringSimulation();
      setHasAppliedFeedback(true);
      setTimeout(() => setHasAppliedFeedback(false), 1500);
    }
  };

  // Apply Cubic-Bezier to Selected Node
  const handleApplyCurve = () => {
    if (selectedNode && onUpdateNode) {
      const curveStr = `cubic-bezier(${p1.x}, ${p1.y}, ${p2.x}, ${p2.y})`;
      onUpdateNode(selectedNode.id, {
        motion: {
          ...(selectedNode.motion || {}),
          in: {
            ...(selectedNode.motion?.in || { type: 'fade', duration: Math.round(duration * 1000), delay: 0 }),
            easing: curveStr as any,
            cubicBezier: [p1.x, p1.y, p2.x, p2.y],
          },
        },
      });
      setHasAppliedFeedback(true);
      setTimeout(() => setHasAppliedFeedback(false), 1500);
    }
  };

  // Tracks for standard Timeline
  const tracks = [
    { id: 'opacity', label: 'Opacity', keyframes: [0, 1] },
    { id: 'transformY', label: 'Position Y', keyframes: [30, 0] },
    { id: 'scale', label: 'Scale', keyframes: [0.95, 1] },
    { id: 'blur', label: 'Blur Filter', keyframes: [10, 0] },
    { id: 'rotation', label: 'Rotation', keyframes: [-2, 0] },
    { id: 'depthZ', label: '3D Depth Z', keyframes: [-50, 0] },
  ];

  const presets = [
    { id: 'elegant-reveal', label: 'Elegant Reveal', dur: 1.2 },
    { id: 'cinematic-reveal', label: 'Cinematic Reveal', dur: 1.8 },
    { id: 'depth-zoom', label: 'Depth Zoom', dur: 1.4 },
    { id: 'text-stagger', label: 'Text Stagger', dur: 1.0 },
    { id: 'floating', label: 'Floating', dur: 2.5 },
    { id: 'spring', label: 'Spring', dur: 0.8 },
    { id: 'parallax', label: 'Parallax Scroll', dur: 2.0 },
    { id: 'image-reveal', label: 'Image Reveal', dur: 1.5 },
  ];

  // SVG Geometry Constants for Curve Visualizer
  const svgStartX = 20;
  const svgStartY = 110;
  const svgSpanX = 180;
  const svgSpanY = 90;
  const cp1ScreenX = svgStartX + p1.x * svgSpanX;
  const cp1ScreenY = svgStartY - p1.y * svgSpanY;
  const cp2ScreenX = svgStartX + p2.x * svgSpanX;
  const cp2ScreenY = svgStartY - p2.y * svgSpanY;
  const endScreenX = svgStartX + svgSpanX;
  const endScreenY = svgStartY - svgSpanY;
  const curvePath = `M ${svgStartX},${svgStartY} C ${cp1ScreenX},${cp1ScreenY} ${cp2ScreenX},${cp2ScreenY} ${endScreenX},${endScreenY}`;

  return (
    <div
      id="sz-motion-workspace"
      style={{
        height: '240px',
        background: '#121317',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
        userSelect: 'none',
        color: '#F3F4F6',
      }}
    >
      {/* ── TOP TRANSPORT TOOLBAR ── */}
      <div
        style={{
          height: '42px',
          background: '#16181D',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          overflowX: 'auto',
          gap: '12px',
        }}
      >
        {/* Left: Playback controls & View Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            id="sz-motion-play-btn"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: '#2563EB',
              border: 'none',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            onClick={() => setCurrentTime(0)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9CA3AF',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <RotateCcw size={14} />
          </button>

          {/* Timecode */}
          <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#60A5FA', marginLeft: '4px' }}>
            00:0{currentTime.toFixed(2)}s / 00:0{duration.toFixed(2)}s
          </div>

          {/* View Mode Toggle: Timeline vs Physics Curves */}
          <div style={{ display: 'flex', background: '#1F2229', borderRadius: '5px', padding: '2px', marginLeft: '6px' }}>
            <button
              id="sz-motion-view-timeline"
              onClick={() => setWorkspaceView('timeline')}
              style={{
                background: workspaceView === 'timeline' ? '#2A2D37' : 'transparent',
                border: 'none',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '0.68rem',
                color: workspaceView === 'timeline' ? '#FFFFFF' : '#9CA3AF',
                cursor: 'pointer',
                fontWeight: workspaceView === 'timeline' ? 600 : 400,
              }}
            >
              Timeline Tracks
            </button>
            <button
              id="sz-motion-view-physics"
              onClick={() => setWorkspaceView('physics')}
              style={{
                background: workspaceView === 'physics' ? '#2563EB' : 'transparent',
                border: 'none',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '0.68rem',
                color: workspaceView === 'physics' ? '#FFFFFF' : '#9CA3AF',
                cursor: 'pointer',
                fontWeight: workspaceView === 'physics' ? 600 : 400,
              }}
            >
              ✦ Spring & Curves
            </button>
          </div>
        </div>

        {/* Center: Presets */}
        <div className="sz-custom-scrollbar" style={{ display: 'flex', alignItems: 'center', gap: '5px', overflowX: 'auto' }}>
          <span style={{ fontSize: '0.68rem', color: '#6B7280', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Presets:</span>
          {presets.slice(0, 5).map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setDuration(p.dur);
                setCurrentTime(0);
                if (onApplyPreset) onApplyPreset(p.id);
              }}
              style={{
                background: '#1F2229',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '0.7rem',
                color: '#D1D5DB',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Right: Selected target & close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
            Target: <strong style={{ color: '#FFFFFF' }}>{selectedNode?.name || sceneName}</strong>
          </span>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#6B7280',
                cursor: 'pointer',
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ── WORKSPACE BODY: TIMELINE TRACKS OR SPRING & CURVES ── */}
      {workspaceView === 'timeline' ? (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Track Headers (Left column) */}
          <div
            style={{
              width: '180px',
              background: '#16181D',
              borderRight: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {tracks.map((track) => (
              <div
                key={track.id}
                onClick={() => setActiveProperty(track.id)}
                style={{
                  height: '32px',
                  padding: '0 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: activeProperty === track.id ? '#21242D' : 'transparent',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                  cursor: 'pointer',
                  fontSize: '0.74rem',
                  color: activeProperty === track.id ? '#60A5FA' : '#9CA3AF',
                  fontWeight: activeProperty === track.id ? 600 : 400,
                }}
              >
                <span>{track.label}</span>
                <span style={{ fontSize: '0.65rem', color: '#6B7280' }}>2 keys</span>
              </div>
            ))}
          </div>

          {/* Keyframe Track Canvas (Right area) */}
          <div
            id="sz-motion-timeline-track"
            onPointerDown={handleScrubPointerDown}
            onPointerMove={handleScrubPointerMove}
            onPointerUp={handleScrubPointerUp}
            style={{
              flex: 1,
              position: 'relative',
              background: '#0F1014',
              overflow: 'hidden',
              cursor: 'ew-resize',
            }}
          >
            {/* Time Ruler Ticks */}
            <div
              style={{
                height: '20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: '20px',
                fontSize: '0.65rem',
                color: '#6B7280',
                fontFamily: 'monospace',
                gap: '60px',
              }}
            >
              <span>0.0s</span>
              <span>0.5s</span>
              <span>1.0s</span>
              <span>1.5s</span>
              <span>2.0s</span>
              <span>2.5s</span>
              <span>3.0s</span>
            </div>

            {/* Tracks Horizontal Lines */}
            {tracks.map((track) => (
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
                <div
                  style={{
                    position: 'absolute',
                    left: '20px',
                    width: '8px',
                    height: '8px',
                    background: '#3B82F6',
                    transform: 'rotate(45deg)',
                    boxShadow: '0 0 6px rgba(59, 130, 246, 0.6)',
                    cursor: 'ew-resize',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: '24px',
                    width: '180px',
                    height: '2px',
                    background: 'rgba(59, 130, 246, 0.4)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: '204px',
                    width: '8px',
                    height: '8px',
                    background: '#60A5FA',
                    transform: 'rotate(45deg)',
                    boxShadow: '0 0 6px rgba(96, 165, 250, 0.6)',
                    cursor: 'ew-resize',
                  }}
                />
              </div>
            ))}

            {/* Scrubbing Playhead Red Needle */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${20 + (currentTime / 3.0) * 360}px`,
                width: '2px',
                background: '#EF4444',
                zIndex: 10,
                pointerEvents: 'none',
                boxShadow: '0 0 8px rgba(239, 68, 68, 0.8)',
              }}
            >
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  background: '#EF4444',
                  transform: 'translateX(-4px) rotate(45deg)',
                  borderRadius: '1px',
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        /* ── SPRING PHYSICS & CUBIC-BEZIER VISUAL CURVE EDITOR ── */
        <div id="sz-motion-physics-panel" style={{ flex: 1, display: 'flex', background: '#0F1014', overflow: 'hidden' }}>
          {/* Left Sub-Nav / Mode Switcher */}
          <div
            style={{
              width: '180px',
              background: '#16181D',
              borderRight: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '0.66rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Physics Engine
            </span>

            <button
              id="sz-mode-spring-btn"
              onClick={() => setPhysicsMode('spring')}
              style={{
                background: physicsMode === 'spring' ? 'rgba(59, 130, 246, 0.15)' : '#1F2229',
                border: physicsMode === 'spring' ? '1px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '6px',
                padding: '8px 10px',
                color: physicsMode === 'spring' ? '#60A5FA' : '#9CA3AF',
                fontSize: '0.74rem',
                fontWeight: 600,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Zap size={14} />
              <span>Spring Physics</span>
            </button>

            <button
              id="sz-mode-curve-btn"
              onClick={() => setPhysicsMode('curve')}
              style={{
                background: physicsMode === 'curve' ? 'rgba(168, 85, 247, 0.15)' : '#1F2229',
                border: physicsMode === 'curve' ? '1px solid #A855F7' : '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '6px',
                padding: '8px 10px',
                color: physicsMode === 'curve' ? '#C084FC' : '#9CA3AF',
                fontSize: '0.74rem',
                fontWeight: 600,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Activity size={14} />
              <span>Cubic-Bezier</span>
            </button>

            {/* Quick Simulation Trigger */}
            <button
              id="sz-spring-test-btn"
              onClick={triggerSpringSimulation}
              style={{
                marginTop: 'auto',
                background: '#2563EB',
                border: 'none',
                borderRadius: '6px',
                padding: '8px',
                color: '#FFFFFF',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Play size={12} />
              <span>Test Bounce</span>
            </button>
          </div>

          {/* Right Content Area: Either Spring Sliders or SVG Curve Editor */}
          <div style={{ flex: 1, padding: '14px 20px', overflowY: 'auto', display: 'flex', gap: '24px' }}>
            {physicsMode === 'spring' ? (
              /* ── SPRING PHYSICS CONTROLS ── */
              <div style={{ flex: 1, display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF' }}>
                      Spring Dynamics
                    </span>
                    <button
                      id="sz-motion-apply-spring-btn"
                      onClick={handleApplySpring}
                      style={{
                        background: hasAppliedFeedback ? '#10B981' : '#2563EB',
                        border: 'none',
                        borderRadius: '5px',
                        padding: '4px 10px',
                        color: '#FFFFFF',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.2s',
                      }}
                    >
                      {hasAppliedFeedback ? <Check size={12} /> : null}
                      <span>{hasAppliedFeedback ? 'Applied to Layer' : 'Apply Spring'}</span>
                    </button>
                  </div>

                  {/* Damping Slider */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                      <span style={{ color: '#9CA3AF' }}>Damping (Friction)</span>
                      <strong id="sz-damping-val" style={{ color: '#60A5FA' }}>{damping}</strong>
                    </div>
                    <input
                      id="sz-spring-damping"
                      type="range"
                      min="1"
                      max="100"
                      value={damping}
                      onChange={(e) => setDamping(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#3B82F6' }}
                    />
                  </div>

                  {/* Stiffness Slider */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                      <span style={{ color: '#9CA3AF' }}>Stiffness (Tension)</span>
                      <strong id="sz-stiffness-val" style={{ color: '#60A5FA' }}>{stiffness}</strong>
                    </div>
                    <input
                      id="sz-spring-stiffness"
                      type="range"
                      min="10"
                      max="500"
                      value={stiffness}
                      onChange={(e) => setStiffness(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#3B82F6' }}
                    />
                  </div>

                  {/* Mass Slider */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                      <span style={{ color: '#9CA3AF' }}>Mass (Inertia)</span>
                      <strong id="sz-mass-val" style={{ color: '#60A5FA' }}>{mass.toFixed(1)}</strong>
                    </div>
                    <input
                      id="sz-spring-mass"
                      type="range"
                      min="0.1"
                      max="10.0"
                      step="0.1"
                      value={mass}
                      onChange={(e) => setMass(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#3B82F6' }}
                    />
                  </div>

                  {/* Spring Quick Presets */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                    {[
                      { label: 'Gentle', d: 30, s: 120, m: 1 },
                      { label: 'Snappy', d: 22, s: 260, m: 1 },
                      { label: 'Bouncy', d: 10, s: 180, m: 1 },
                      { label: 'Heavy', d: 40, s: 100, m: 3 },
                    ].map((sp) => (
                      <button
                        key={sp.label}
                        onClick={() => {
                          setDamping(sp.d);
                          setStiffness(sp.s);
                          setMass(sp.m);
                          triggerSpringSimulation();
                        }}
                        style={{
                          background: '#1F2229',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '4px',
                          padding: '3px 8px',
                          color: '#E5E7EB',
                          fontSize: '0.66rem',
                          cursor: 'pointer',
                        }}
                      >
                        {sp.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Spring Simulation Visual Ball Track */}
                <div
                  style={{
                    width: '200px',
                    background: '#16181D',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    height: '145px',
                  }}
                >
                  <span style={{ fontSize: '0.66rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Physics Response
                  </span>

                  {/* Ball Movement Track */}
                  <div
                    style={{
                      height: '36px',
                      background: '#1F2229',
                      borderRadius: '18px',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 6px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      id="sz-spring-preview-ball"
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, #60A5FA 0%, #2563EB 100%)',
                        boxShadow: '0 0 10px rgba(59, 130, 246, 0.8)',
                        transform: isSimulatingSpring ? 'translateX(140px)' : 'translateX(0px)',
                        transition: isSimulatingSpring
                          ? `transform 1s cubic-bezier(0.175, 0.885, 0.32, ${1 + Math.max(0.1, (100 - damping) / 60) * 0.3})`
                          : 'transform 0.1s ease',
                      }}
                    />
                  </div>

                  <div style={{ fontSize: '0.62rem', color: '#6B7280', textAlign: 'center' }}>
                    Click "Test Bounce" or drag sliders to preview reaction.
                  </div>
                </div>
              </div>
            ) : (
              /* ── CUBIC-BEZIER INTERACTIVE VISUAL CURVE EDITOR ── */
              <div style={{ flex: 1, display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF' }}>
                      Cubic-Bezier Visualizer
                    </span>
                    <button
                      id="sz-motion-apply-curve-btn"
                      onClick={handleApplyCurve}
                      style={{
                        background: hasAppliedFeedback ? '#10B981' : '#A855F7',
                        border: 'none',
                        borderRadius: '5px',
                        padding: '4px 10px',
                        color: '#FFFFFF',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.2s',
                      }}
                    >
                      {hasAppliedFeedback ? <Check size={12} /> : null}
                      <span>{hasAppliedFeedback ? 'Applied to Layer' : 'Apply Curve'}</span>
                    </button>
                  </div>

                  {/* CSS Code readout */}
                  <div
                    id="sz-bezier-css-code"
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.74rem',
                      background: '#1F2229',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      color: '#C084FC',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                    }}
                  >
                    cubic-bezier({p1.x}, {p1.y}, {p2.x}, {p2.y})
                  </div>

                  {/* Coordinate numeric inputs */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    <div>
                      <span style={{ fontSize: '0.58rem', color: '#06B6D4' }}>X1</span>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        value={p1.x}
                        onChange={(e) => setP1({ ...p1, x: Number(e.target.value) })}
                        style={{ width: '100%', background: '#1F2229', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', borderRadius: '4px', padding: '2px 4px', fontSize: '0.68rem' }}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.58rem', color: '#06B6D4' }}>Y1</span>
                      <input
                        type="number"
                        step="0.05"
                        value={p1.y}
                        onChange={(e) => setP1({ ...p1, y: Number(e.target.value) })}
                        style={{ width: '100%', background: '#1F2229', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', borderRadius: '4px', padding: '2px 4px', fontSize: '0.68rem' }}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.58rem', color: '#A855F7' }}>X2</span>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        value={p2.x}
                        onChange={(e) => setP2({ ...p2, x: Number(e.target.value) })}
                        style={{ width: '100%', background: '#1F2229', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', borderRadius: '4px', padding: '2px 4px', fontSize: '0.68rem' }}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.58rem', color: '#A855F7' }}>Y2</span>
                      <input
                        type="number"
                        step="0.05"
                        value={p2.y}
                        onChange={(e) => setP2({ ...p2, y: Number(e.target.value) })}
                        style={{ width: '100%', background: '#1F2229', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', borderRadius: '4px', padding: '2px 4px', fontSize: '0.68rem' }}
                      />
                    </div>
                  </div>

                  {/* Curve Presets */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                    {[
                      { label: 'Ease-Out', x1: 0, y1: 0, x2: 0.2, y2: 1 },
                      { label: 'Snappy', x1: 0.16, y1: 1, x2: 0.3, y2: 1 },
                      { label: 'Bouncy', x1: 0.34, y1: 1.56, x2: 0.64, y2: 1 },
                      { label: 'Anticipate', x1: 0.36, y1: 0, x2: 0.66, y2: -0.56 },
                    ].map((cp) => (
                      <button
                        key={cp.label}
                        onClick={() => {
                          setP1({ x: cp.x1, y: cp.y1 });
                          setP2({ x: cp.x2, y: cp.y2 });
                        }}
                        style={{
                          background: '#1F2229',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '4px',
                          padding: '3px 8px',
                          color: '#E5E7EB',
                          fontSize: '0.66rem',
                          cursor: 'pointer',
                        }}
                      >
                        {cp.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SVG Curve Diagram with Draggable Control Handles */}
                <div
                  style={{
                    background: '#16181D',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '8px',
                  }}
                >
                  <svg
                    id="sz-bezier-svg-canvas"
                    ref={svgRef}
                    width="220"
                    height="140"
                    viewBox="0 0 220 140"
                    onPointerMove={handleSvgPointerMove}
                    onPointerUp={handleSvgPointerUp}
                    style={{ background: '#0B0C0E', borderRadius: '6px', cursor: draggingHandle ? 'grabbing' : 'default' }}
                  >
                    {/* Grid guidelines */}
                    <line x1="20" y1="20" x2="200" y2="20" stroke="rgba(255,255,255,0.06)" strokeDasharray="2,2" />
                    <line x1="20" y1="65" x2="200" y2="65" stroke="rgba(255,255,255,0.04)" strokeDasharray="2,2" />
                    <line x1="20" y1="110" x2="200" y2="110" stroke="rgba(255,255,255,0.06)" strokeDasharray="2,2" />
                    <line x1="110" y1="20" x2="110" y2="110" stroke="rgba(255,255,255,0.04)" strokeDasharray="2,2" />

                    {/* Diagonal guide */}
                    <line x1={svgStartX} y1={svgStartY} x2={endScreenX} y2={endScreenY} stroke="rgba(255,255,255,0.12)" strokeDasharray="3,3" />

                    {/* Connection Handle Lines */}
                    <line x1={svgStartX} y1={svgStartY} x2={cp1ScreenX} y2={cp1ScreenY} stroke="#06B6D4" strokeWidth="1.5" />
                    <line x1={endScreenX} y1={endScreenY} x2={cp2ScreenX} y2={cp2ScreenY} stroke="#A855F7" strokeWidth="1.5" />

                    {/* Bezier Path */}
                    <path d={curvePath} fill="none" stroke="#F59E0B" strokeWidth="2.5" />

                    {/* Start and End Anchor dots */}
                    <circle cx={svgStartX} cy={svgStartY} r="4" fill="#6B7280" />
                    <circle cx={endScreenX} cy={endScreenY} r="4" fill="#6B7280" />

                    {/* Control Point 1 Circle (Cyan) */}
                    <circle
                      id="sz-bezier-cp1"
                      cx={cp1ScreenX}
                      cy={cp1ScreenY}
                      r="6"
                      fill="#06B6D4"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                      style={{ cursor: 'grab', filter: 'drop-shadow(0 0 4px #06B6D4)' }}
                      onPointerDown={(e) => handleSvgPointerDown('p1', e)}
                    />

                    {/* Control Point 2 Circle (Purple) */}
                    <circle
                      id="sz-bezier-cp2"
                      cx={cp2ScreenX}
                      cy={cp2ScreenY}
                      r="6"
                      fill="#A855F7"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                      style={{ cursor: 'grab', filter: 'drop-shadow(0 0 4px #A855F7)' }}
                      onPointerDown={(e) => handleSvgPointerDown('p2', e)}
                    />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
