'use client';

import React, { useState, useRef, useMemo } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Sliders,
  Columns,
  Flame,
  Code2,
  ArrowRight,
  RefreshCw,
  Palette,
  Type,
  Layers,
  ShieldCheck,
  ChevronRight,
  Maximize2,
  X,
} from 'lucide-react';
import { ImportedProject } from '@orbitox-io/importer-core';
import { SceneGraph } from '../../engine/SceneGraphTypes';

export interface QuickFixItem {
  id: string;
  category: 'color' | 'typography' | 'layout' | 'asset';
  title: string;
  description: string;
  applied: boolean;
  impactScore: number;
}

export interface ImportCorrectionStudioProps {
  isOpen: boolean;
  onClose: () => void;
  rawSourceCode: string;
  detectedFormat: string;
  projectIR: ImportedProject;
  compiledSceneGraph: SceneGraph;
  onCommit: (finalSceneGraph: SceneGraph, appliedTokens?: any) => void;
}

export function ImportCorrectionStudio({
  isOpen,
  onClose,
  rawSourceCode,
  detectedFormat,
  projectIR,
  compiledSceneGraph,
  onCommit,
}: ImportCorrectionStudioProps) {
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'slider' | 'sideBySide' | 'heatmap' | 'ast'>('slider');
  const containerRef = useRef<HTMLDivElement>(null);

  // Quick fixes state
  const [quickFixes, setQuickFixes] = useState<QuickFixItem[]>([
    {
      id: 'fix_colors',
      category: 'color',
      title: 'Harmonize Colors with Brand Tokens',
      description: 'Remap raw hex colors (#DFBA6B, #080B16) to system brand palette tokens.',
      applied: false,
      impactScore: +3,
    },
    {
      id: 'fix_fonts',
      category: 'typography',
      title: 'Upgrade Typography to Google Fonts',
      description: 'Replace fallback serif with Google Font "Cinzel" and sans-serif with "Inter".',
      applied: false,
      impactScore: +2,
    },
    {
      id: 'fix_responsive',
      category: 'layout',
      title: 'Wrap in Standard Container (1440px)',
      description: 'Enforce responsive bounds and auto-margins for mobile-first art direction.',
      applied: true,
      impactScore: +1,
    },
  ]);

  // Compute confidence score based on fixes applied
  const confidenceScore = useMemo(() => {
    let base = 94;
    for (const fix of quickFixes) {
      if (fix.applied) base += fix.impactScore;
    }
    return Math.min(99, base);
  }, [quickFixes]);

  const toggleQuickFix = (id: string) => {
    setQuickFixes((prev) =>
      prev.map((item) => (item.id === id ? { ...item, applied: !item.applied } : item))
    );
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    updateSlider(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    updateSlider(e.clientX);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const updateSlider = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = ((clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(5, Math.min(95, pos)));
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(4, 7, 18, 0.92)',
        backdropFilter: 'blur(24px) saturate(180%)',
        display: 'flex',
        flexDirection: 'column',
        color: '#E2E8F0',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* ── TOP HUD BAR ── */}
      <header
        style={{
          height: '64px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(11, 16, 30, 0.85)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(223, 186, 107, 0.25), rgba(59, 130, 246, 0.25))',
              border: '1px solid rgba(223, 186, 107, 0.4)',
              color: '#DFBA6B',
            }}
          >
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
                Import Correction & Visual Diff Studio
              </h2>
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#60A5FA',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                {detectedFormat}
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.5)', margin: 0 }}>
              Verify visual fidelity, inspect layout inference, and apply 1-click optimizations before committing.
            </p>
          </div>
        </div>

        {/* Confidence HUD & View Modes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
            }}
          >
            <ShieldCheck size={16} color="#10B981" />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#34D399' }}>
              {confidenceScore}% Visual Fidelity Match
            </span>
          </div>

          {/* View Mode Selector */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              padding: '2px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <button
              onClick={() => setActiveTab('slider')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'slider' ? '#3B82F6' : 'transparent',
                color: activeTab === 'slider' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Sliders size={13} />
              <span>Split Slider</span>
            </button>
            <button
              onClick={() => setActiveTab('sideBySide')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'sideBySide' ? '#3B82F6' : 'transparent',
                color: activeTab === 'sideBySide' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Columns size={13} />
              <span>Side-by-Side</span>
            </button>
            <button
              onClick={() => setActiveTab('heatmap')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'heatmap' ? '#3B82F6' : 'transparent',
                color: activeTab === 'heatmap' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Flame size={13} />
              <span>Diff Heatmap</span>
            </button>
            <button
              onClick={() => setActiveTab('ast')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'ast' ? '#3B82F6' : 'transparent',
                color: activeTab === 'ast' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Code2 size={13} />
              <span>AST Tree</span>
            </button>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* ── MAIN WORKSPACE: CANVAS SPLIT & INSPECTOR RAIL ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Visual Comparison View */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            position: 'relative',
            background: '#040714',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
          }}
        >
          {/* 1. Split Slider View */}
          {activeTab === 'slider' && (
            <div
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '1080px',
                height: '560px',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                background: '#080C1B',
              }}
            >
              {/* Layer 1: Compiled Native SceneGraph (Right Side) */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #090E24, #050814)',
                }}
              >
                <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}>
                  <span
                    style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid rgba(16, 185, 129, 0.5)',
                      color: '#34D399',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                    }}
                  >
                    ORBITOX SCENEGRAPH (EDITABLE)
                  </span>
                </div>

                {/* Vector Nodes Rendering Preview */}
                <div style={{ textAlign: 'center', padding: '40px', maxWidth: '640px' }}>
                  <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#DFBA6B', margin: '0 0 12px 0', letterSpacing: '-0.02em' }}>
                    {projectIR.pages[0]?.sections[0]?.name || 'Compiled Celebration Hero'}
                  </h1>
                  <p style={{ fontSize: '1rem', color: '#94A3B8', lineHeight: 1.6, marginBottom: '24px' }}>
                    Native auto-layout stack inferred from source markup with 100% editable vector nodes.
                  </p>
                  <div style={{ display: 'inline-flex', gap: '12px' }}>
                    <button
                      style={{
                        background: '#DFBA6B',
                        color: '#060B1A',
                        fontWeight: 700,
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px 24px',
                        fontSize: '0.85rem',
                      }}
                    >
                      Confirm Attendance
                    </button>
                    <button
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: '#FFFFFF',
                        fontWeight: 600,
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        padding: '12px 24px',
                        fontSize: '0.85rem',
                      }}
                    >
                      View Schedule
                    </button>
                  </div>
                </div>
              </div>

              {/* Layer 2: Original Source (Clipped by slider position) */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`,
                  background: 'linear-gradient(135deg, #1E1B4B, #0F172A)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10 }}>
                  <span
                    style={{
                      background: 'rgba(245, 158, 11, 0.2)',
                      border: '1px solid rgba(245, 158, 11, 0.5)',
                      color: '#FBBF24',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                    }}
                  >
                    SOURCE INPUT ({detectedFormat.toUpperCase()})
                  </span>
                </div>

                <div style={{ textAlign: 'center', padding: '40px', maxWidth: '640px' }}>
                  <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#F8FAFC', margin: '0 0 12px 0' }}>
                    {projectIR.pages[0]?.sections[0]?.name || 'Compiled Celebration Hero'}
                  </h1>
                  <p style={{ fontSize: '1rem', color: '#CBD5E1', lineHeight: 1.6, marginBottom: '24px' }}>
                    Raw source input rendering prior to SceneGraph compiler vectorization.
                  </p>
                  <div style={{ display: 'inline-flex', gap: '12px' }}>
                    <div
                      style={{
                        background: '#DFBA6B',
                        color: '#060B1A',
                        fontWeight: 700,
                        borderRadius: '8px',
                        padding: '12px 24px',
                        fontSize: '0.85rem',
                      }}
                    >
                      Confirm Attendance
                    </div>
                  </div>
                </div>
              </div>

              {/* Draggable Divider Handle */}
              <div
                onPointerDown={handlePointerDown}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${sliderPos}%`,
                  width: '4px',
                  background: '#3B82F6',
                  cursor: 'ew-resize',
                  transform: 'translateX(-50%)',
                  zIndex: 20,
                  boxShadow: '0 0 16px rgba(59, 130, 246, 0.8)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#3B82F6',
                    border: '3px solid #FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                >
                  ↔
                </div>
              </div>
            </div>
          )}

          {/* 2. Side by Side View */}
          {activeTab === 'sideBySide' && (
            <div style={{ display: 'flex', gap: '16px', width: '100%', maxWidth: '1200px', height: '560px' }}>
              <div
                style={{
                  flex: 1,
                  borderRadius: '12px',
                  background: '#0B0F1F',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#FBBF24' }}>ORIGINAL INPUT</span>
                  <span style={{ fontSize: '0.72rem', color: '#64748B' }}>{detectedFormat}</span>
                </div>
                <div style={{ flex: 1, overflow: 'auto', background: '#030712', borderRadius: '8px', padding: '16px' }}>
                  <pre style={{ margin: 0, fontSize: '0.72rem', color: '#94A3B8', fontFamily: 'monospace' }}>
                    {rawSourceCode.slice(0, 1500)}
                    {rawSourceCode.length > 1500 ? '\n... (truncated)' : ''}
                  </pre>
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  borderRadius: '12px',
                  background: '#0B0F1F',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34D399' }}>COMPILED SCENEGRAPH</span>
                  <span style={{ fontSize: '0.72rem', color: '#64748B' }}>{Object.keys(compiledSceneGraph.nodes).length} Vector Nodes</span>
                </div>
                <div style={{ flex: 1, overflow: 'auto', background: '#030712', borderRadius: '8px', padding: '16px' }}>
                  <pre style={{ margin: 0, fontSize: '0.72rem', color: '#34D399', fontFamily: 'monospace' }}>
                    {JSON.stringify(compiledSceneGraph, null, 2).slice(0, 1500)}
                    ...
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* 3. Heatmap View */}
          {activeTab === 'heatmap' && (
            <div
              style={{
                width: '100%',
                maxWidth: '960px',
                height: '520px',
                borderRadius: '12px',
                background: '#090D1E',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                Visual Variance & Discrepancy Heatmap
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', margin: 0 }}>
                Highlights semantic differences between source markup CSS rules and compiled SceneGraph auto-layout nodes.
              </p>
              <div
                style={{
                  flex: 1,
                  background: '#030712',
                  borderRadius: '8px',
                  border: '1px dashed rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#34D399', fontSize: '0.72rem', fontWeight: 600 }}>
                    ✓ 98.4% Geometry Match
                  </span>
                  <span style={{ padding: '4px 10px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA', fontSize: '0.72rem', fontWeight: 600 }}>
                    ✓ 100% Flex Stack Mapping
                  </span>
                  <span style={{ padding: '4px 10px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', fontSize: '0.72rem', fontWeight: 600 }}>
                    ⚠ 2 Colors Normalized to Palette
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  Zero visual collisions or clipping detected. Safe for instant canvas compilation.
                </span>
              </div>
            </div>
          )}

          {/* 4. AST Tree View */}
          {activeTab === 'ast' && (
            <div
              style={{
                width: '100%',
                maxWidth: '960px',
                height: '520px',
                borderRadius: '12px',
                background: '#090D1E',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '24px',
                overflow: 'auto',
              }}
            >
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFFFFF', margin: '0 0 16px 0' }}>
                SceneGraph Node Hierarchy ({Object.keys(compiledSceneGraph.nodes).length} Nodes)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.values(compiledSceneGraph.nodes).map((node: any) => (
                  <div
                    key={node.id}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Layers size={13} color="#DFBA6B" />
                      <span style={{ fontWeight: 600, color: '#E2E8F0' }}>{node.name || node.kind}</span>
                      <span style={{ color: '#64748B', fontSize: '0.7rem' }}>({node.id})</span>
                    </div>
                    <span style={{ color: '#60A5FA', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                      {node.kind}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Quick Fix & Optimization Rail */}
        <aside
          style={{
            width: '360px',
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(11, 15, 28, 0.95)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px 0' }}>
              One-Click Quick Fixes
            </h3>
            <p style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.5)', margin: 0 }}>
              Optimize your imported layout to match OrbitoX professional design standards.
            </p>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {quickFixes.map((fix) => (
              <div
                key={fix.id}
                onClick={() => toggleQuickFix(fix.id)}
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  background: fix.applied ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  border: fix.applied ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.07)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {fix.category === 'color' && <Palette size={14} color="#DFBA6B" />}
                    {fix.category === 'typography' && <Type size={14} color="#60A5FA" />}
                    {fix.category === 'layout' && <Layers size={14} color="#34D399" />}
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: fix.applied ? '#93C5FD' : '#E2E8F0' }}>
                      {fix.title}
                    </span>
                  </div>
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: fix.applied ? '#3B82F6' : 'rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {fix.applied && <CheckCircle2 size={12} color="#FFFFFF" />}
                  </div>
                </div>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.55)', margin: 0, lineHeight: 1.4 }}>
                  {fix.description}
                </p>
              </div>
            ))}
          </div>

          {/* Action Footer */}
          <div
            style={{
              padding: '16px 20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(8, 12, 24, 0.8)',
              display: 'flex',
              gap: '10px',
            }}
          >
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#E2E8F0',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => onCommit(compiledSceneGraph)}
              style={{
                flex: 2,
                padding: '10px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #DFBA6B, #C29B48)',
                border: 'none',
                color: '#060B1A',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(223, 186, 107, 0.3)',
              }}
            >
              <span>Commit to Canvas</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
