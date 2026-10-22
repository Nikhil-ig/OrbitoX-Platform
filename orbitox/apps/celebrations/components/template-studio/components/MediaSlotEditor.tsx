'use client';

import React, { useState, useRef } from 'react';
import {
  MediaSlotDefinition,
  MediaShapeVariant,
  ContentFieldDefinition,
  DeviceBreakpoint,
} from '../types/TemplateSchema';
import {
  Crop,
  Upload,
  Crosshair,
  Sliders,
  Layers,
  Sparkles,
  Smartphone,
  Tablet,
  Monitor,
  Check,
  RotateCcw,
  Image as ImageIcon,
  AlertCircle,
  Eye,
} from 'lucide-react';

export interface MediaSlotEditorProps {
  slot: MediaSlotDefinition;
  contentField?: ContentFieldDefinition | null;
  onUpdateSlot: (slotId: string, patch: Partial<MediaSlotDefinition>) => void;
  onUpdateField?: (fieldId: string, patch: Partial<ContentFieldDefinition>) => void;
}

const PRESET_PORTRAITS = [
  {
    name: 'Groom (Aarav)',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=85',
  },
  {
    name: 'Bride (Meera)',
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=85',
  },
  {
    name: 'Palace Cover',
    url: 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=1200&q=80',
  },
  {
    name: 'Starlight Sanctuary',
    url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&q=85',
  },
];

const SHAPE_DEFINITIONS: { id: MediaShapeVariant; label: string; icon: string; previewRadius: string }[] = [
  { id: 'editorial', label: 'Editorial', icon: '▭', previewRadius: '8px' },
  { id: 'circle', label: 'Circle', icon: '○', previewRadius: '50%' },
  { id: 'arch', label: 'Sanctum Arch', icon: '⌂', previewRadius: '999px 999px 6px 6px' },
  { id: 'rounded', label: 'Pill Rounded', icon: '▢', previewRadius: '24px' },
  { id: 'polaroid', label: 'Polaroid', icon: '❏', previewRadius: '4px' },
];

const ASPECT_RATIOS = ['1:1', '4:5', '3:4', '16:9', '9:16'];

export function MediaSlotEditor({
  slot,
  contentField,
  onUpdateSlot,
  onUpdateField,
}: MediaSlotEditorProps) {
  const [activeDevice, setActiveDevice] = useState<DeviceBreakpoint>('desktop');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Current image source
  const currentImageUrl =
    contentField?.defaultValue ||
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=85';

  // Responsive focal point based on active tab
  const activeFocal =
    slot.responsiveCrops?.[activeDevice]?.focalPoint || slot.focalPointDefault || { x: 50, y: 50 };

  // Handle click / drag on focal canvas
  const handleFocalCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
    const y = Math.round(Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)));

    const newFocal = { x, y };

    // Update both default and the active device responsive crop
    const currentResponsive = slot.responsiveCrops || {
      desktop: { aspect: slot.aspectRatio, focalPoint: newFocal },
      tablet: { aspect: slot.aspectRatio, focalPoint: newFocal },
      mobile: { aspect: slot.aspectRatio, focalPoint: newFocal },
    };

    onUpdateSlot(slot.id, {
      focalPointDefault: activeDevice === 'desktop' ? newFocal : slot.focalPointDefault,
      responsiveCrops: {
        ...currentResponsive,
        [activeDevice]: {
          ...currentResponsive[activeDevice],
          focalPoint: newFocal,
        },
      },
    });
  };

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > slot.maxFileSizeMb) {
      setUploadError(`File is ${sizeMb.toFixed(1)}MB. Max limit is ${slot.maxFileSizeMb}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl && contentField && onUpdateField) {
        onUpdateField(contentField.id, { defaultValue: dataUrl });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        background: 'rgba(9, 14, 28, 0.95)',
        border: '1px solid rgba(223, 186, 107, 0.25)',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
      }}
    >
      {/* 1. Header / Slot Identity */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38BDF8',
            }}
          >
            <Crop size={15} />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFF9F5' }}>
              {slot.label}
            </div>
            <code style={{ fontSize: '0.68rem', color: '#94A3B8' }}>{slot.slotKey}</code>
          </div>
        </div>

        <span
          style={{
            fontSize: '0.68rem',
            padding: '2px 8px',
            borderRadius: '999px',
            background: 'rgba(223, 186, 107, 0.15)',
            border: '1px solid rgba(223, 186, 107, 0.4)',
            color: '#DFBA6B',
            fontWeight: 700,
          }}
        >
          {slot.aspectRatio}
        </span>
      </div>

      {/* 2. Interactive Focal Point Canvas */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label style={{ fontSize: '0.74rem', color: 'var(--cel-text-muted, #94A3B8)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Crosshair size={13} color="#DFBA6B" />
            <span>Interactive Focal Point</span>
          </label>
          <span style={{ fontSize: '0.7rem', color: '#DFBA6B', fontFamily: 'monospace', fontWeight: 600 }}>
            X: {activeFocal.x}% • Y: {activeFocal.y}%
          </span>
        </div>

        <div
          onClick={handleFocalCanvasClick}
          title="Click to set focal target"
          style={{
            position: 'relative',
            width: '100%',
            height: '180px',
            borderRadius: '12px',
            overflow: 'hidden',
            cursor: 'crosshair',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            background: '#040711',
          }}
        >
          {/* Background image preview */}
          <img
            src={currentImageUrl}
            alt="Focal Preview"
            style={{
              width: '100%',
              height: '100%',
              objectFit: slot.cropBehavior === 'fit' ? 'contain' : 'cover',
              objectPosition: `${activeFocal.x}% ${activeFocal.y}%`,
              opacity: 0.85,
              filter: `blur(${slot.overlayDefault?.blurPx || 0}px)`,
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />

          {/* Starlight color overlay preview */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: slot.overlayDefault?.color || '#040714',
              opacity: slot.overlayDefault?.opacity || 0.15,
              pointerEvents: 'none',
            }}
          />

          {/* Rule of thirds grid lines */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gridTemplateRows: '1fr 1fr 1fr',
              pointerEvents: 'none',
              border: '1px dashed rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ borderRight: '1px dashed rgba(255,255,255,0.08)', borderBottom: '1px dashed rgba(255,255,255,0.08)' }} />
            <div style={{ borderRight: '1px dashed rgba(255,255,255,0.08)', borderBottom: '1px dashed rgba(255,255,255,0.08)' }} />
            <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.08)' }} />
            <div style={{ borderRight: '1px dashed rgba(255,255,255,0.08)', borderBottom: '1px dashed rgba(255,255,255,0.08)' }} />
            <div style={{ borderRight: '1px dashed rgba(255,255,255,0.08)', borderBottom: '1px dashed rgba(255,255,255,0.08)' }} />
            <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.08)' }} />
          </div>

          {/* Focal Crosshair Pin */}
          <div
            style={{
              position: 'absolute',
              left: `${activeFocal.x}%`,
              top: `${activeFocal.y}%`,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: '2px solid #DFBA6B',
                boxShadow: '0 0 12px #DFBA6B, inset 0 0 6px rgba(223, 186, 107, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.4)',
              }}
            >
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#FFF9F5' }} />
            </div>
          </div>
        </div>

        {/* Quick alignment shortcuts */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
          {[
            { label: 'Face Top', x: 50, y: 25 },
            { label: 'Center', x: 50, y: 50 },
            { label: 'Lower', x: 50, y: 75 },
          ].map((pos) => (
            <button
              key={pos.label}
              onClick={() => {
                const newFocal = { x: pos.x, y: pos.y };
                onUpdateSlot(slot.id, {
                  focalPointDefault: newFocal,
                  responsiveCrops: {
                    ...slot.responsiveCrops,
                    [activeDevice]: {
                      ...slot.responsiveCrops?.[activeDevice],
                      focalPoint: newFocal,
                    },
                  },
                });
              }}
              style={{
                flex: 1,
                padding: '4px',
                borderRadius: '4px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#CBD5E1',
                fontSize: '0.68rem',
                cursor: 'pointer',
              }}
            >
              {pos.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Shape Variant Selector */}
      <div>
        <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--cel-text-muted, #94A3B8)', marginBottom: '6px', fontWeight: 600 }}>
          Architectural Shape
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(68px, 1fr))', gap: '6px' }}>
          {SHAPE_DEFINITIONS.filter((sd) => !slot.shapeOptions || slot.shapeOptions.includes(sd.id)).map((shape) => {
            const isSelected = slot.defaultShape === shape.id;
            return (
              <button
                key={shape.id}
                onClick={() => onUpdateSlot(slot.id, { defaultShape: shape.id })}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 4px',
                  borderRadius: '8px',
                  border: isSelected ? '1.5px solid #DFBA6B' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isSelected ? 'rgba(223, 186, 107, 0.18)' : 'rgba(255, 255, 255, 0.02)',
                  color: isSelected ? '#DFBA6B' : '#CBD5E1',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: shape.previewRadius,
                    border: isSelected ? '1.5px solid #DFBA6B' : '1px solid rgba(255, 255, 255, 0.25)',
                    background: isSelected ? 'rgba(223, 186, 107, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                  }}
                />
                <span style={{ fontSize: '0.66rem', fontWeight: isSelected ? 700 : 500 }}>
                  {shape.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Aspect Ratio & Framing Behavior */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--cel-text-muted, #94A3B8)', marginBottom: '4px', fontWeight: 600 }}>
            Aspect Ratio
          </label>
          <select
            value={slot.aspectRatio}
            onChange={(e) => onUpdateSlot(slot.id, { aspectRatio: e.target.value })}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '6px',
              background: '#0B1120',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#fff',
              fontSize: '0.74rem',
              fontWeight: 600,
            }}
          >
            {ASPECT_RATIOS.map((ar) => (
              <option key={ar} value={ar}>
                {ar}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--cel-text-muted, #94A3B8)', marginBottom: '4px', fontWeight: 600 }}>
            Crop Behavior
          </label>
          <select
            value={slot.cropBehavior}
            onChange={(e) => onUpdateSlot(slot.id, { cropBehavior: e.target.value as any })}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '6px',
              background: '#0B1120',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#fff',
              fontSize: '0.74rem',
              fontWeight: 600,
            }}
          >
            <option value="editorial_zoom">Editorial Zoom</option>
            <option value="fill">Fill / Cover</option>
            <option value="fit">Fit / Contain</option>
          </select>
        </div>
      </div>

      {/* 5. Direct Upload & Presets */}
      <div>
        <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--cel-text-muted, #94A3B8)', marginBottom: '6px', fontWeight: 600 }}>
          Media Source & Upload
        </label>

        {uploadError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444', fontSize: '0.72rem', marginBottom: '8px' }}>
            <AlertCircle size={13} />
            <span>{uploadError}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '6px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              color: '#38BDF8',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Upload size={13} />
            <span>Upload New Image</span>
          </button>
        </div>

        {/* Quick Presets */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {PRESET_PORTRAITS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => {
                if (contentField && onUpdateField) {
                  onUpdateField(contentField.id, { defaultValue: p.url });
                }
              }}
              style={{
                flexShrink: 0,
                padding: '4px 8px',
                borderRadius: '6px',
                background: currentImageUrl === p.url ? 'rgba(223, 186, 107, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                border: currentImageUrl === p.url ? '1px solid #DFBA6B' : '1px solid rgba(255, 255, 255, 0.08)',
                color: currentImageUrl === p.url ? '#DFBA6B' : '#94A3B8',
                fontSize: '0.68rem',
                cursor: 'pointer',
              }}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* 6. Overlay & Starlight Vignette */}
      <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '10px', borderRadius: '10px' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--cel-text-muted, #94A3B8)', marginBottom: '8px', fontWeight: 600 }}>
          Atmospheric Starlight Overlay
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94A3B8', marginBottom: '2px' }}>
              <span>Opacity</span>
              <span>{Math.round((slot.overlayDefault?.opacity || 0.15) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={slot.overlayDefault?.opacity ?? 0.15}
              onChange={(e) =>
                onUpdateSlot(slot.id, {
                  overlayDefault: {
                    ...slot.overlayDefault,
                    color: slot.overlayDefault?.color || '#040714',
                    blurPx: slot.overlayDefault?.blurPx || 0,
                    opacity: parseFloat(e.target.value),
                  },
                })
              }
              style={{ width: '100%', accentColor: '#DFBA6B', height: '4px' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94A3B8', marginBottom: '2px' }}>
              <span>Vignette Blur</span>
              <span>{slot.overlayDefault?.blurPx || 0}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={slot.overlayDefault?.blurPx ?? 0}
              onChange={(e) =>
                onUpdateSlot(slot.id, {
                  overlayDefault: {
                    ...slot.overlayDefault,
                    color: slot.overlayDefault?.color || '#040714',
                    opacity: slot.overlayDefault?.opacity ?? 0.15,
                    blurPx: parseInt(e.target.value, 10),
                  },
                })
              }
              style={{ width: '100%', accentColor: '#DFBA6B', height: '4px' }}
            />
          </div>
        </div>
      </div>

      {/* 7. Per-device Responsive Crop Tabs */}
      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--cel-text-muted, #94A3B8)', fontWeight: 600 }}>
            Responsive Breakpoint
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['desktop', 'tablet', 'mobile'] as const).map((dev) => (
              <button
                key={dev}
                onClick={() => setActiveDevice(dev)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: activeDevice === dev ? 'rgba(223, 186, 107, 0.25)' : 'transparent',
                  border: activeDevice === dev ? '1px solid #DFBA6B' : '1px solid transparent',
                  color: activeDevice === dev ? '#DFBA6B' : '#94A3B8',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {dev}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
