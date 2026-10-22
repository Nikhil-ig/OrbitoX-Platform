'use client';

import React, { useEffect } from 'react';
import {
  X,
  Zap,
  Activity,
  Smartphone,
  Image as ImageIcon,
  Film,
  Box,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import { ProjectPerformanceStats } from './types';

interface PerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: ProjectPerformanceStats;
}

export function PerformanceModal({ isOpen, onClose, stats }: PerformanceModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isOptimal = stats.score >= 90;
  const isGood = stats.score >= 75 && stats.score < 90;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        id="sz-performance-modal"
        style={{
          width: '100%',
          maxWidth: '680px',
          background: '#121317',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#16181D',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: isOptimal
                  ? 'rgba(16, 185, 129, 0.15)'
                  : 'rgba(245, 158, 11, 0.15)',
                color: isOptimal ? '#34D399' : '#FBBF24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Zap size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#FFFFFF' }}>
                Project Performance & Experience Health
              </h3>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#9CA3AF' }}>
                Real-time audit across DOM nodes, assets, 3D runtime overhead, and mobile cost
              </p>
            </div>
          </div>

          <button
            id="sz-perf-modal-close-btn"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9CA3AF',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Score Card Hero */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(180deg, #14161C 0%, #121317 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF' }}>
              Overall Health Rating
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '2.4rem', fontWeight: 800, color: isOptimal ? '#10B981' : '#F59E0B' }}>
                {stats.score}
              </span>
              <span style={{ fontSize: '1rem', color: '#6B7280' }}>/ 100</span>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '12px',
                  background: isOptimal ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: isOptimal ? '#34D399' : '#FBBF24',
                  marginLeft: '8px',
                }}
              >
                {stats.rating}
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '12px 18px',
              background: '#1A1C22',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.66rem', color: '#9CA3AF' }}>Estimated Mobile Target</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#38BDF8' }}>
                {stats.estimatedMobileFps} FPS
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.66rem', color: '#9CA3AF' }}>Scene Nodes</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F3F4F6' }}>
                {stats.totalNodes}
              </span>
            </div>
          </div>
        </div>

        {/* Audit Metrics Breakdown */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h4 style={{ margin: 0, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9CA3AF' }}>
            Resource Weight & Runtime Impact
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {/* Image Weight */}
            <div style={{ background: '#1A1C22', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3B82F6', marginBottom: '6px' }}>
                <ImageIcon size={14} />
                <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Images</span>
              </div>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#FFFFFF' }}>
                {(stats.imageWeightKb / 1024).toFixed(1)} MB
              </span>
            </div>

            {/* Video Weight */}
            <div style={{ background: '#1A1C22', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8B5CF6', marginBottom: '6px' }}>
                <Film size={14} />
                <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Video</span>
              </div>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#FFFFFF' }}>
                {(stats.videoWeightKb / 1024).toFixed(1)} MB
              </span>
            </div>

            {/* 3D Mesh Weight */}
            <div style={{ background: '#1A1C22', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#EC4899', marginBottom: '6px' }}>
                <Box size={14} />
                <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>3D Runtime</span>
              </div>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#FFFFFF' }}>
                {stats.meshWeightKb > 0 ? `${stats.meshWeightKb} KB` : 'Zero (Lazy)'}
              </span>
            </div>

            {/* Animation Tracks */}
            <div style={{ background: '#1A1C22', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#F59E0B', marginBottom: '6px' }}>
                <Sparkles size={14} />
                <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Keyframes</span>
              </div>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#FFFFFF' }}>
                {stats.animationTracksCount} Tracks
              </span>
            </div>
          </div>

          {/* Recommendations List */}
          <div style={{ marginTop: '10px' }}>
            <h5 style={{ margin: '0 0 8px 0', fontSize: '0.74rem', fontWeight: 600, color: '#D1D5DB' }}>
              Engine Performance Insights
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {stats.recommendations.map((rec, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: '#1A1C22',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    color: '#9CA3AF',
                  }}
                >
                  <CheckCircle2 size={13} style={{ color: '#10B981', flexShrink: 0 }} />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            background: '#16181D',
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: '#3B82F6',
              border: 'none',
              borderRadius: '6px',
              padding: '7px 18px',
              color: '#FFFFFF',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
