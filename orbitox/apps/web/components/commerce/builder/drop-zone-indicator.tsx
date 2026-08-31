'use client';

import React, { useState } from 'react';
import { ComponentType } from '@orbitox/commerce';
import { useBuilderDnd } from './dnd-context';

export interface DropZoneIndicatorProps {
  index: number;
  onQuickInsert?: (type: ComponentType | string, index: number) => void;
}

export function DropZoneIndicator({ index, onQuickInsert }: DropZoneIndicatorProps) {
  const { isDragging, dropTargetIndex, updateDropTarget, dragItem } = useBuilderDnd();
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [quickPaletteOpen, setQuickPaletteOpen] = useState<boolean>(false);

  const isTarget = isDragging && dropTargetIndex === index;

  const quickItems = [
    { type: 'hero', icon: '👑', label: 'Hero Banner' },
    { type: 'product-grid', icon: '🛍️', label: 'Product Grid' },
    { type: 'banner', icon: '🖼️', label: 'Promo Banner' },
    { type: 'testimonials', icon: '⭐', label: 'Reviews' },
    { type: 'custom_vip_club_card', icon: '👑', label: 'VIP Card' },
    { type: 'custom_flash_sale_banner', icon: '⏱️', label: '24H Timer' },
  ];

  // If dragging something over this zone
  if (isDragging) {
    return (
      <div
        onPointerEnter={() => updateDropTarget(index)}
        onPointerOver={() => updateDropTarget(index)}
        style={{
          position: 'relative',
          height: isTarget ? '48px' : '16px',
          margin: isTarget ? '8px 0' : '2px 0',
          transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }}
      >
        {/* Animated Drop Line */}
        <div
          style={{
            width: '100%',
            height: isTarget ? '3px' : '2px',
            background: isTarget
              ? 'linear-gradient(90deg, transparent, #D4AF37, #F3E5AB, #D4AF37, transparent)'
              : 'rgba(212, 175, 55, 0.2)',
            boxShadow: isTarget ? '0 0 16px rgba(212, 175, 55, 0.8)' : 'none',
            transition: 'all 0.2s ease',
          }}
        />

        {/* Floating Center Drop Capsule */}
        {isTarget && (
          <div
            style={{
              position: 'absolute',
              padding: '4px 14px',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #D4AF37, #F59E0B)',
              color: '#000',
              fontWeight: 800,
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 16px rgba(212, 175, 55, 0.5)',
              transform: 'scale(1.05)',
              animation: 'pulse 1.5s infinite',
            }}
          >
            <span>➕</span>
            <span>
              {dragItem?.name ? `Insert ${dragItem.name} Here` : `Drop at Position #${index + 1}`}
            </span>
          </div>
        )}
      </div>
    );
  }

  // If not dragging: Show Magic Hover "+" Insert Button
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setQuickPaletteOpen(false);
      }}
      style={{
        position: 'relative',
        height: isHovered || quickPaletteOpen ? '32px' : '10px',
        margin: '2px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'height 0.2s ease',
        zIndex: 50,
      }}
    >
      {(isHovered || quickPaletteOpen) && (
        <>
          <div
            style={{
              width: '100%',
              height: '1px',
              background: 'rgba(212, 175, 55, 0.3)',
            }}
          />

          {!quickPaletteOpen ? (
            <button
              type="button"
              onClick={() => setQuickPaletteOpen(true)}
              style={{
                position: 'absolute',
                padding: '3px 12px',
                borderRadius: '999px',
                background: '#161619',
                border: '1px solid #D4AF37',
                color: '#D4AF37',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
              }}
            >
              <span>+</span>
              <span>Insert Block</span>
            </button>
          ) : (
            <div
              style={{
                position: 'absolute',
                top: '-8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(20, 20, 24, 0.95)',
                padding: '4px 8px',
                borderRadius: '8px',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(12px)',
                zIndex: 60,
              }}
            >
              <span style={{ fontSize: '10px', color: '#AAA', fontWeight: 700, paddingRight: '4px' }}>
                Quick Insert:
              </span>
              {quickItems.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => {
                    if (onQuickInsert) onQuickInsert(item.type, index);
                    setQuickPaletteOpen(false);
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFF',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setQuickPaletteOpen(false)}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '11px', padding: '2px 4px' }}
              >
                ✕
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
