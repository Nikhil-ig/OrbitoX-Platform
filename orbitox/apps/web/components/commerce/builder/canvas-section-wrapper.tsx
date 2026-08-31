'use client';

import React, { useState } from 'react';
import { PageSection } from '@orbitox/commerce';
import { useBuilderDnd } from './dnd-context';
import {
  IconChevronUp,
  IconChevronDown,
  IconEye,
  IconEyeOff,
  IconCopy,
  IconTrash,
  IconDragGrip,
  IconBolt,
} from './studio-icons';

export interface CanvasSectionWrapperProps {
  section: PageSection;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onToggle?: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  children: React.ReactNode;
}

export function CanvasSectionWrapper({
  section,
  index,
  isSelected,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onToggle,
  canMoveUp,
  canMoveDown,
  children,
}: CanvasSectionWrapperProps) {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const { startDrag } = useBuilderDnd();

  const handlePointerDownGrip = (e: React.PointerEvent) => {
    e.stopPropagation();
    startDrag(
      {
        type: 'existing-section',
        sectionId: section.id,
        name: section.name || section.type,
        icon: '↕',
      },
      e
    );
  };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        borderRadius: '12px',
        border: isSelected
          ? '2px solid #E5A93C'
          : isHovered
          ? '1px dashed rgba(229, 169, 60, 0.45)'
          : '1px solid transparent',
        boxShadow: isSelected
          ? '0 0 24px rgba(229, 169, 60, 0.2), inset 0 0 12px rgba(229, 169, 60, 0.05)'
          : isHovered
          ? '0 6px 20px rgba(0, 0, 0, 0.4)'
          : 'none',
        transition: 'border 0.15s ease, box-shadow 0.15s ease',
        cursor: 'pointer',
      }}
    >
      {/* Top Floating Action Bar on Hover or Select (Clean Storefront Visual Badge) */}
      {(isSelected || isHovered) && (
        <div
          style={{
            position: 'absolute',
            top: '-14px',
            left: '18px',
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#121420',
            padding: '3px 10px',
            borderRadius: '8px',
            border: '1px solid rgba(229, 169, 60, 0.5)',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.7)',
          }}
        >
          {/* Drag Handle Grip */}
          <div
            onPointerDown={handlePointerDownGrip}
            title="Drag to reorder section"
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'grab',
              padding: '2px',
              color: '#E5A93C',
            }}
          >
            <IconDragGrip size={12} />
          </div>

          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: '#FFF',
              marginRight: '4px',
              letterSpacing: '-0.01em',
            }}
          >
            {section.name || section.type.replace(/_/g, ' ')}
          </span>

          {/* Logic Active Indicator Badge */}
          {section.logic?.enabled && (
            <span
              style={{
                fontSize: '9px',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                color: '#FFF',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                marginRight: '4px',
              }}
            >
              <IconBolt size={9} />
              <span>Logic</span>
            </span>
          )}

          {/* Move Up */}
          {canMoveUp && onMoveUp && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp();
              }}
              title="Move Up"
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <IconChevronUp size={12} />
            </button>
          )}

          {/* Move Down */}
          {canMoveDown && onMoveDown && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown();
              }}
              title="Move Down"
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <IconChevronDown size={12} />
            </button>
          )}

          {/* Toggle Visibility */}
          {onToggle && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              title={section.enabled ? 'Hide Section' : 'Show Section'}
              style={{
                background: 'none',
                border: 'none',
                color: section.enabled ? '#94A3B8' : '#EF4444',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {section.enabled ? <IconEye size={12} /> : <IconEyeOff size={12} />}
            </button>
          )}

          {/* Duplicate */}
          {onDuplicate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              title="Duplicate Section"
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <IconCopy size={12} />
            </button>
          )}

          {/* Delete */}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete Section"
              style={{
                background: 'none',
                border: 'none',
                color: '#EF4444',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <IconTrash size={12} />
            </button>
          )}
        </div>
      )}

      {/* Rendered Storefront Section Content */}
      <div style={{ opacity: section.enabled ? 1 : 0.4 }}>{children}</div>
    </div>
  );
}
