'use client';

import React from 'react';
import { SnapGuide, SpacingBadge } from '@/components/template-studio/engine/AlignmentEngine';

export interface SmartGuidesOverlayProps {
  guides: SnapGuide[];
  spacingBadges?: SpacingBadge[];
  flowInsertionLine?: {
    x: number;
    y: number;
    width: number;
    height: number;
    axis: 'horizontal' | 'vertical';
  } | null;
  artboardWidth?: number;
  artboardHeight?: number;
}

export function SmartGuidesOverlay({
  guides,
  spacingBadges = [],
  flowInsertionLine = null,
  artboardWidth = 1200,
  artboardHeight = 800,
}: SmartGuidesOverlayProps) {
  if (guides.length === 0 && spacingBadges.length === 0 && !flowInsertionLine) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        overflow: 'visible',
      }}
    >
      {/* ── ALIGNMENT GUIDES (MAGENTA SNAP LINES) ── */}
      {guides.map((guide, idx) => {
        const isVertical = guide.axis === 'x';
        return (
          <div
            key={`guide-${idx}-${guide.axis}-${guide.position}`}
            style={{
              position: 'absolute',
              background: '#EC4899',
              boxShadow: '0 0 4px rgba(236, 72, 153, 0.7)',
              zIndex: 10000,
              ...(isVertical
                ? {
                    left: `${guide.position}px`,
                    top: 0,
                    bottom: 0,
                    width: '1px',
                  }
                : {
                    top: `${guide.position}px`,
                    left: 0,
                    right: 0,
                    height: '1px',
                  }),
            }}
          >
            {/* Guide Type Indicator Chip */}
            <span
              style={{
                position: 'absolute',
                ...(isVertical
                  ? { top: '8px', left: '4px' }
                  : { left: '8px', top: '4px' }),
                background: '#EC4899',
                color: '#FFFFFF',
                fontSize: '0.58rem',
                fontWeight: 700,
                padding: '1px 3px',
                borderRadius: '2px',
                letterSpacing: '0.04em',
                lineHeight: 1,
                boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }}
            >
              {guide.type}
            </span>
          </div>
        );
      })}

      {/* ── SPACING PILL BADGES ── */}
      {spacingBadges.map((badge, idx) => (
        <div
          key={`badge-${idx}-${badge.x}-${badge.y}`}
          style={{
            position: 'absolute',
            left: `${badge.x}px`,
            top: `${badge.y}px`,
            transform: 'translate(-50%, -50%)',
            background: '#EC4899',
            color: '#FFFFFF',
            fontSize: '0.62rem',
            fontWeight: 700,
            padding: '2px 5px',
            borderRadius: '10px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.4)',
            zIndex: 10001,
            whiteSpace: 'nowrap',
            lineHeight: 1.2,
          }}
        >
          {badge.label || `${Math.round(badge.distance)}px`}
        </div>
      ))}

      {/* ── FLOW INSERTION / DROP INDICATOR LINE ── */}
      {flowInsertionLine && (
        <div
          style={{
            position: 'absolute',
            left: `${flowInsertionLine.x}px`,
            top: `${flowInsertionLine.y}px`,
            width: `${Math.max(flowInsertionLine.width, 2)}px`,
            height: `${Math.max(flowInsertionLine.height, 2)}px`,
            background: '#3B82F6',
            boxShadow: '0 0 8px rgba(59, 130, 246, 0.9)',
            borderRadius: '2px',
            zIndex: 10002,
            transition: 'all 0.05s ease-out',
          }}
        >
          {/* Pulsing endpoint pill */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#3B82F6',
              border: '2px solid #FFFFFF',
              boxShadow: '0 0 6px rgba(59, 130, 246, 1)',
            }}
          />
        </div>
      )}
    </div>
  );
}
