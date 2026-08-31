'use client';

import React, { useState } from 'react';

export interface CustomButtonConfig {
  id: string;
  label: string;
  link: string;
  action?: 'link' | 'cart' | 'wishlist' | 'whatsapp' | 'scroll';
  variant?: 'solid-gold' | 'solid-crimson' | 'outline-gold' | 'glass-frost' | 'gradient-sunset' | 'whatsapp-green';
  size?: 'sm' | 'md' | 'lg' | 'full';
  radius?: 'sharp' | 'subtle' | 'rounded' | 'pill';
  icon?: string;
  animation?: 'none' | 'pulse' | 'float' | 'shimmer';
  newTab?: boolean;
}

export interface CustomButtonsManagerProps {
  buttons: CustomButtonConfig[];
  onChange: (updatedButtons: CustomButtonConfig[]) => void;
  defaultLabel?: string;
}

export function CustomButtonsManager({
  buttons = [],
  onChange,
  defaultLabel = 'Shop Now',
}: CustomButtonsManagerProps) {
  const [editingButtonId, setEditingButtonId] = useState<string | null>(null);

  const handleAddButton = () => {
    const newBtn: CustomButtonConfig = {
      id: `btn_${Date.now()}`,
      label: buttons.length === 0 ? defaultLabel : 'Explore Collection',
      link: '/shop',
      action: 'link',
      variant: buttons.length === 0 ? 'solid-gold' : 'outline-gold',
      size: 'md',
      radius: 'rounded',
      icon: '→',
      animation: 'none',
      newTab: false,
    };
    const updated = [...buttons, newBtn];
    onChange(updated);
    setEditingButtonId(newBtn.id);
  };

  const handleRemoveButton = (id: string) => {
    const updated = buttons.filter((b) => b.id !== id);
    onChange(updated);
    if (editingButtonId === id) setEditingButtonId(null);
  };

  const handleUpdateButton = (id: string, updates: Partial<CustomButtonConfig>) => {
    const updated = buttons.map((b) => (b.id === id ? { ...b, ...updates } : b));
    onChange(updated);
  };

  const iconOptions = [
    { label: 'None', val: '' },
    { label: '→ Arrow', val: '→' },
    { label: '👑 Crown', val: '👑' },
    { label: '🛍️ Bag', val: '🛍️' },
    { label: '💬 WhatsApp', val: '💬' },
    { label: '⚡ Flash', val: '⚡' },
    { label: '✨ Sparkle', val: '✨' },
    { label: '♥ Heart', val: '♥' },
    { label: '📞 Phone', val: '📞' },
  ];

  const variantOptions = [
    { label: 'Imperial Gold (Solid)', val: 'solid-gold' },
    { label: 'Crimson Velvet (Solid)', val: 'solid-crimson' },
    { label: 'Gold Wire (Outline)', val: 'outline-gold' },
    { label: 'Glassmorphic Frost', val: 'glass-frost' },
    { label: 'Royal Sunset Gradient', val: 'gradient-sunset' },
    { label: 'WhatsApp Concierge', val: 'whatsapp-green' },
  ];

  return (
    <div
      style={{
        padding: '12px',
        borderRadius: '10px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            🔘 Action Buttons & CTAs
          </span>
          <span
            style={{
              padding: '1px 6px',
              borderRadius: '999px',
              background: 'rgba(212, 175, 55, 0.2)',
              color: '#D4AF37',
              fontSize: '10px',
              fontWeight: 800,
            }}
          >
            {buttons.length}
          </span>
        </div>

        <button
          type="button"
          onClick={handleAddButton}
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #D4AF37, #F59E0B)',
            color: '#000',
            fontWeight: 800,
            fontSize: '11px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 0 10px rgba(212, 175, 55, 0.3)',
          }}
        >
          <span>+</span>
          <span>Add Button</span>
        </button>
      </div>

      {buttons.length === 0 ? (
        <div style={{ padding: '12px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)', fontSize: '11px' }}>
          No custom action buttons configured. Tap "+ Add Button" to create CTA triggers.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {buttons.map((btn, idx) => {
            const isEditing = editingButtonId === btn.id;

            return (
              <div
                key={btn.id}
                style={{
                  borderRadius: '8px',
                  background: isEditing ? 'rgba(212, 175, 55, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                  border: isEditing ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                }}
              >
                {/* Button Summary Row */}
                <div
                  style={{
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                  onClick={() => setEditingButtonId(isEditing ? null : btn.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>#{idx + 1}</span>
                    <span style={{ fontSize: '13px' }}>{btn.icon || '🔘'}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFF' }}>{btn.label || 'Untitled Button'}</span>
                    <span style={{ fontSize: '10px', color: '#D4AF37', background: 'rgba(212,175,55,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                      {btn.variant || 'solid-gold'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>{isEditing ? '▲ Close' : '▼ Edit'}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveButton(btn.id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#EF4444',
                        fontSize: '12px',
                        cursor: 'pointer',
                        padding: '2px 6px',
                      }}
                      title="Remove Button"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Expanded Button Editor Form */}
                {isEditing && (
                  <div
                    style={{
                      padding: '12px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      background: 'rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    {/* Button Label */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase' }}>
                        Button Label / Text
                      </label>
                      <input
                        type="text"
                        value={btn.label}
                        onChange={(e) => handleUpdateButton(btn.id, { label: e.target.value })}
                        placeholder="e.g. Explore Royal Bridal"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#FFF',
                          fontSize: '12px',
                        }}
                      />
                    </div>

                    {/* Action & Target Link */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase' }}>
                          Action Type
                        </label>
                        <select
                          value={btn.action || 'link'}
                          onChange={(e) => handleUpdateButton(btn.id, { action: e.target.value as any })}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            background: '#0D0D0E',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#FFF',
                            fontSize: '11px',
                          }}
                        >
                          <option value="link">🔗 Open URL / Route</option>
                          <option value="cart">🛍️ Open Shopping Bag</option>
                          <option value="wishlist">♥ Open Wishlist</option>
                          <option value="whatsapp">💬 WhatsApp Direct</option>
                          <option value="scroll">⬇️ Scroll to Catalog</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase' }}>
                          Target Link / URL
                        </label>
                        <input
                          type="text"
                          value={btn.link}
                          onChange={(e) => handleUpdateButton(btn.id, { link: e.target.value })}
                          placeholder="/shop or https://..."
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#FFF',
                            fontSize: '11px',
                          }}
                        />
                      </div>
                    </div>

                    {/* Style Variant & Size */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase' }}>
                          Visual Style Variant
                        </label>
                        <select
                          value={btn.variant || 'solid-gold'}
                          onChange={(e) => handleUpdateButton(btn.id, { variant: e.target.value as any })}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            background: '#0D0D0E',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#FFF',
                            fontSize: '11px',
                          }}
                        >
                          {variantOptions.map((opt) => (
                            <option key={opt.val} value={opt.val}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase' }}>
                          Button Size
                        </label>
                        <select
                          value={btn.size || 'md'}
                          onChange={(e) => handleUpdateButton(btn.id, { size: e.target.value as any })}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            background: '#0D0D0E',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#FFF',
                            fontSize: '11px',
                          }}
                        >
                          <option value="sm">Small / Compact</option>
                          <option value="md">Standard / Medium</option>
                          <option value="lg">Large / Prominent</option>
                          <option value="full">Full Width</option>
                        </select>
                      </div>
                    </div>

                    {/* Corner Radius, Icon & Animation */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase' }}>
                          Corner Radius
                        </label>
                        <select
                          value={btn.radius || 'rounded'}
                          onChange={(e) => handleUpdateButton(btn.id, { radius: e.target.value as any })}
                          style={{
                            padding: '6px 4px',
                            borderRadius: '6px',
                            background: '#0D0D0E',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#FFF',
                            fontSize: '10px',
                          }}
                        >
                          <option value="sharp">Sharp (0px)</option>
                          <option value="subtle">Subtle (6px)</option>
                          <option value="rounded">Rounded (12px)</option>
                          <option value="pill">Pill (999px)</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase' }}>
                          Button Icon
                        </label>
                        <select
                          value={btn.icon || ''}
                          onChange={(e) => handleUpdateButton(btn.id, { icon: e.target.value })}
                          style={{
                            padding: '6px 4px',
                            borderRadius: '6px',
                            background: '#0D0D0E',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#FFF',
                            fontSize: '10px',
                          }}
                        >
                          {iconOptions.map((opt) => (
                            <option key={opt.val} value={opt.val}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase' }}>
                          Animation
                        </label>
                        <select
                          value={btn.animation || 'none'}
                          onChange={(e) => handleUpdateButton(btn.id, { animation: e.target.value as any })}
                          style={{
                            padding: '6px 4px',
                            borderRadius: '6px',
                            background: '#0D0D0E',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#FFF',
                            fontSize: '10px',
                          }}
                        >
                          <option value="none">None</option>
                          <option value="pulse">Pulse Glow</option>
                          <option value="float">Floating</option>
                          <option value="shimmer">Shimmer</option>
                        </select>
                      </div>
                    </div>

                    {/* Live Button Preview Chip */}
                    <div style={{ marginTop: '6px', padding: '8px', background: 'rgba(0,0,0,0.5)', borderRadius: '6px', textAlign: 'center' }}>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px' }}>
                        LIVE PREVIEW
                      </span>
                      <button
                        type="button"
                        style={{
                          padding: btn.size === 'sm' ? '6px 12px' : btn.size === 'lg' ? '12px 24px' : '8px 18px',
                          borderRadius: btn.radius === 'sharp' ? '0px' : btn.radius === 'subtle' ? '6px' : btn.radius === 'pill' ? '999px' : '12px',
                          background:
                            btn.variant === 'solid-crimson'
                              ? '#7A1113'
                              : btn.variant === 'outline-gold'
                              ? 'transparent'
                              : btn.variant === 'glass-frost'
                              ? 'rgba(255,255,255,0.1)'
                              : btn.variant === 'whatsapp-green'
                              ? '#25D366'
                              : btn.variant === 'gradient-sunset'
                              ? 'linear-gradient(135deg, #D4AF37, #E5A93C, #7A1113)'
                              : 'var(--orb-primary, #D4AF37)',
                          color:
                            btn.variant === 'outline-gold'
                              ? '#D4AF37'
                              : btn.variant === 'glass-frost'
                              ? '#FFF'
                              : btn.variant === 'solid-crimson'
                              ? '#FFF'
                              : '#000',
                          border:
                            btn.variant === 'outline-gold'
                              ? '1px solid #D4AF37'
                              : btn.variant === 'glass-frost'
                              ? '1px solid rgba(255,255,255,0.3)'
                              : 'none',
                          fontWeight: 800,
                          fontSize: btn.size === 'sm' ? '11px' : btn.size === 'lg' ? '14px' : '12px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          width: btn.size === 'full' ? '100%' : 'auto',
                          justifyContent: 'center',
                        }}
                      >
                        {btn.icon && <span>{btn.icon}</span>}
                        <span>{btn.label || 'Button Preview'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
