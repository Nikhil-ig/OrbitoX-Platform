'use client';

import React, { useState } from 'react';
import { ComponentSettingField, ComponentDefinition } from '@orbitox/commerce';
import { MediaPickerModal } from './media-picker-modal';
import { CustomButtonsManager, CustomButtonConfig } from './custom-buttons-manager';
import { ComponentStyleCustomizer, ComponentStyleConfig } from './component-style-customizer';

export interface SchemaInspectorProps {
  componentDef?: ComponentDefinition;
  settings: Record<string, any>;
  onChange: (updates: Record<string, any>) => void;
  storeId?: string;
  onAiGenerateCopy?: () => void;
  isAiGenerating?: boolean;
}

export function SchemaInspector({
  componentDef,
  settings,
  onChange,
  storeId = 'store_aura_luxury',
  onAiGenerateCopy,
  isAiGenerating = false,
}: SchemaInspectorProps) {
  const [mediaPickerOpen, setMediaPickerOpen] = useState<boolean>(false);
  const [activeMediaField, setActiveMediaField] = useState<string>('');

  if (!componentDef) {
    return (
      <div style={{ padding: '24px 16px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px' }}>
        No component definition found for this section.
      </div>
    );
  }

  const schema = componentDef.schema;
  const fields = Object.entries(schema);

  const handleFieldChange = (key: string, value: any) => {
    onChange({ [key]: value });
  };

  const handleOpenMediaPicker = (fieldKey: string) => {
    setActiveMediaField(fieldKey);
    setMediaPickerOpen(true);
  };

  const handleSelectMedia = (media: { url: string; altText?: string }) => {
    if (activeMediaField) {
      onChange({
        [activeMediaField]: media.url,
        ...(media.altText ? { imageAlt: media.altText } : {}),
      });
    }
    setMediaPickerOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Component Header Badge */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 12px',
          borderRadius: '8px',
          background: 'rgba(212, 175, 55, 0.08)',
          border: '1px solid rgba(212, 175, 55, 0.2)',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#D4AF37' }}>
            {componentDef.name}
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)' }}>
            {componentDef.description}
          </div>
        </div>

        {onAiGenerateCopy && (
          <button
            onClick={onAiGenerateCopy}
            disabled={isAiGenerating}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #D4AF37, #F3E5AB)',
              color: '#000',
              fontWeight: 800,
              fontSize: '11px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>✨</span>
            <span>{isAiGenerating ? 'Writing...' : 'AI Copy'}</span>
          </button>
        )}
      </div>

      {/* Schema-Driven Dynamic Fields Loop */}
      {fields.map(([key, field]) => {
        const value = settings[key] !== undefined ? settings[key] : field.defaultValue;

        return (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Field Label & Description */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                {field.label}
              </label>
              {field.type === 'range' && (
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#D4AF37' }}>
                  {value}%
                </span>
              )}
            </div>

            {/* ── Control Type: TEXT ── */}
            {field.type === 'text' && (
              <input
                type="text"
                placeholder={field.placeholder || ''}
                value={value || ''}
                onChange={(e) => handleFieldChange(key, e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FFF',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            )}

            {/* ── Control Type: TEXTAREA ── */}
            {field.type === 'textarea' && (
              <textarea
                rows={3}
                placeholder={field.placeholder || ''}
                value={value || ''}
                onChange={(e) => handleFieldChange(key, e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FFF',
                  fontSize: '12px',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            )}

            {/* ── Control Type: NUMBER ── */}
            {field.type === 'number' && (
              <input
                type="number"
                min={field.min}
                max={field.max}
                step={field.step || 1}
                value={value !== undefined ? value : ''}
                onChange={(e) => handleFieldChange(key, Number(e.target.value))}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FFF',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            )}

            {/* ── Control Type: BOOLEAN ── */}
            {field.type === 'boolean' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)' }}>
                  {value ? 'Enabled' : 'Disabled'}
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(e) => handleFieldChange(key, e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
              </div>
            )}

            {/* ── Control Type: SELECT ── */}
            {field.type === 'select' && (
              <select
                value={value !== undefined ? value : ''}
                onChange={(e) => handleFieldChange(key, e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: '#0D0D0E',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFF',
                  fontSize: '12px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {field.options?.map((opt) => (
                  <option key={String(opt.value)} value={String(opt.value)}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}

            {/* ── Control Type: COLOR ── */}
            {field.type === 'color' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={value || '#000000'}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
                <input
                  type="text"
                  value={value || ''}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFF',
                    fontSize: '12px',
                  }}
                />
              </div>
            )}

            {/* ── Control Type: MEDIA ── */}
            {field.type === 'media' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  style={{
                    position: 'relative',
                    height: '100px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: '#000',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                  }}
                >
                  {value ? (
                    <>
                      <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0, 0, 0, 0.45)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleOpenMediaPicker(key)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '5px',
                            background: '#D4AF37',
                            color: '#000',
                            fontWeight: 800,
                            fontSize: '11px',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFieldChange(key, '')}
                          style={{
                            padding: '5px 8px',
                            borderRadius: '5px',
                            background: 'rgba(239, 68, 68, 0.8)',
                            color: '#FFF',
                            fontWeight: 700,
                            fontSize: '11px',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </>
                  ) : (
                    <div
                      onClick={() => handleOpenMediaPicker(key)}
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        color: 'rgba(255, 255, 255, 0.5)',
                        fontSize: '11px',
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>🖼️</span>
                      <span>Click to choose media</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    placeholder="Or paste image URL..."
                    value={value || ''}
                    onChange={(e) => handleFieldChange(key, e.target.value)}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFF',
                      fontSize: '11px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleOpenMediaPicker(key)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      background: 'rgba(212, 175, 55, 0.15)',
                      color: '#D4AF37',
                      border: '1px solid #D4AF37',
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Browse
                  </button>
                </div>
              </div>
            )}

            {/* ── Control Type: RANGE ── */}
            {field.type === 'range' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="range"
                    min={field.min !== undefined ? field.min : 0}
                    max={field.max !== undefined ? field.max : 100}
                    step={field.step || 1}
                    value={value !== undefined ? value : field.defaultValue || 0}
                    onChange={(e) => handleFieldChange(key, Number(e.target.value))}
                    style={{ flex: 1, cursor: 'pointer', accentColor: '#D4AF37' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      min={field.min !== undefined ? field.min : 0}
                      max={field.max !== undefined ? field.max : 100}
                      value={value !== undefined ? value : field.defaultValue || 0}
                      onChange={(e) => handleFieldChange(key, Number(e.target.value))}
                      style={{
                        width: '54px',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        background: '#000',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#D4AF37',
                        fontWeight: 800,
                        fontSize: '12px',
                        textAlign: 'center',
                      }}
                    />
                    <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)' }}>%</span>
                  </div>
                </div>

                {/* Quick Presets for Overlay Opacity & Range */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { label: '0% Clear', val: 0 },
                    { label: '25% Subtle', val: 25 },
                    { label: '40% Default', val: 40 },
                    { label: '60% Deep', val: 60 },
                    { label: '80% Dramatic', val: 80 },
                  ].map((chip) => (
                    <button
                      key={chip.val}
                      type="button"
                      onClick={() => handleFieldChange(key, chip.val)}
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: value === chip.val ? 'rgba(212, 175, 55, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                        border: value === chip.val ? '1px solid #D4AF37' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: value === chip.val ? '#D4AF37' : 'rgba(255, 255, 255, 0.7)',
                        fontSize: '10px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {field.description && (
              <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)' }}>
                {field.description}
              </span>
            )}
          </div>
        );
      })}

      {/* ─── CUSTOM ACTION BUTTONS MANAGER (ADD / REMOVE / UPDATE) ─── */}
      <CustomButtonsManager
        buttons={settings.customButtons || []}
        onChange={(updatedButtons) => handleFieldChange('customButtons', updatedButtons)}
        defaultLabel={settings.primaryButtonText || settings.buttonText || 'Shop Now'}
      />

      {/* ─── COMPONENT STYLE & LAYOUT CUSTOMIZER ─── */}
      <ComponentStyleCustomizer
        styleConfig={settings.styleConfig || {}}
        onChange={(updatedStyle) => handleFieldChange('styleConfig', updatedStyle)}
      />

      {/* Universal Media Picker Modal */}
      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelectMedia={handleSelectMedia}
        storeId={storeId}
        targetFolder="banners"
      />
    </div>
  );
}
