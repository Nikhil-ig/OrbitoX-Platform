'use client';

import React, { useRef, useState } from 'react';
import { Upload, Camera, Trash2, Check } from 'lucide-react';

interface StudioImageUploaderProps {
  label: string;
  value?: string;
  onChange: (imageUrl: string) => void;
  helperText?: string;
  shape?: 'circle' | 'rounded' | 'banner';
}

export function StudioImageUploader({
  label,
  value,
  onChange,
  helperText = 'JPG, PNG or WEBP · up to 10MB',
  shape = 'circle',
}: StudioImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onChange(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onChange(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {value ? (
        /* ─── FILLED STATE: ELEGANT INTEGRATED MEDIA ROW ─── */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          style={{
            padding: '8px 12px',
            borderRadius: 10,
            background: isDragging ? 'rgba(251, 191, 36, 0.06)' : 'rgba(255, 255, 255, 0.025)',
            border: isDragging
              ? '1px solid rgba(251, 191, 36, 0.5)'
              : '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            transition: 'all 0.15s ease',
          }}
        >
          {/* Preview Thumbnail (clickable to change) */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
              width: shape === 'banner' ? 88 : 50,
              height: 50,
              borderRadius: shape === 'circle' ? '50%' : shape === 'banner' ? 6 : 8,
              overflow: 'hidden',
              flexShrink: 0,
              border: '1.5px solid rgba(251, 191, 36, 0.4)',
              background: '#09090d',
              position: 'relative',
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
            }}
            title="Click to change photo"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt={label}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                transition: 'opacity 0.15s ease',
                opacity: isHovered ? 0.65 : 1,
              }}
            />
            {/* Hover Camera Icon Overlay */}
            {isHovered && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0, 0, 0, 0.5)',
                  color: '#fbbf24',
                }}
              >
                <Camera size={14} />
              </div>
            )}
          </div>

          {/* Context Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {label}
              </span>
              <Check size={11} style={{ color: '#10b981', flexShrink: 0 }} />
            </div>
            <span
              style={{
                display: 'block',
                fontSize: 10,
                color: '#71717a',
                marginTop: 1,
              }}
            >
              Uploaded & active on canvas
            </span>
          </div>

          {/* Action Buttons: Change & Remove */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '5px 10px',
                borderRadius: 6,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.09)',
                color: '#e4e4e7',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(251, 191, 36, 0.12)';
                e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.35)';
                e.currentTarget.style.color = '#fbbf24';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.09)';
                e.currentTarget.style.color = '#e4e4e7';
              }}
            >
              <Camera size={11} />
              <span>Change</span>
            </button>

            <button
              type="button"
              onClick={() => onChange('')}
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: 'transparent',
                border: 'none',
                color: '#71717a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Remove photo"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                e.currentTarget.style.color = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#71717a';
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ) : (
        /* ─── EMPTY STATE: SLEEK MINIMAL DROPZONE ─── */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '12px 14px',
            borderRadius: 10,
            background: isDragging ? 'rgba(251, 191, 36, 0.06)' : 'rgba(255, 255, 255, 0.02)',
            border: isDragging
              ? '1.5px dashed #fbbf24'
              : '1px dashed rgba(255, 255, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!isDragging) {
              e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.35)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.035)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isDragging) {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
            }
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: shape === 'circle' ? '50%' : 7,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbbf24',
                flexShrink: 0,
              }}
            >
              <Upload size={13} />
            </div>
            <div style={{ minWidth: 0 }}>
              <span
                style={{
                  display: 'block',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Upload {label}
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: 10,
                  color: '#71717a',
                  marginTop: 1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {helperText}
              </span>
            </div>
          </div>

          <button
            type="button"
            style={{
              padding: '5px 11px',
              borderRadius: 6,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              color: '#d4d4d8',
              fontSize: 10.5,
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
              pointerEvents: 'none',
            }}
          >
            Browse
          </button>
        </div>
      )}
    </div>
  );
}
