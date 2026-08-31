'use client';

import React, { useState } from 'react';
import {
  IconPlus,
  IconClose,
  IconSelect,
  IconLego,
  IconSparkles,
  IconCrown,
  IconShoppingBag,
  IconShieldCheck,
  IconMessageCircle,
  IconLayers,
} from './studio-icons';

export interface StudioFloatingDockProps {
  activeTool: 'select' | 'add' | 'logic' | 'autopilot' | 'theme' | 'launchpad';
  onSelectTool: (tool: 'select' | 'add' | 'logic' | 'autopilot' | 'theme' | 'launchpad') => void;
  onOpenAddSection: () => void;
  onOpenComposer: () => void;
  onOpenAutopilot: () => void;
  onOpenLaunchpad: () => void;
  onOpenTemplates?: () => void;
  onQuickInsertSection?: (type: string) => void;
}

export function StudioFloatingDock({
  activeTool,
  onSelectTool,
  onOpenAddSection,
  onOpenComposer,
  onOpenAutopilot,
  onOpenLaunchpad,
  onOpenTemplates,
  onQuickInsertSection,
}: StudioFloatingDockProps) {
  const [popupOpen, setPopupOpen] = useState<boolean>(false);

  const blockPresets = [
    { id: 'hero', name: 'Hero Runway Showcase', icon: <IconCrown size={14} />, checked: true },
    { id: 'bite_free_guarantee', name: '100% Bite-Free Guarantee', icon: <IconShieldCheck size={14} />, checked: true },
    { id: 'featured_products', name: 'Royal Product Grid', icon: <IconShoppingBag size={14} />, checked: true },
    { id: 'whatsapp_cta', name: 'WhatsApp Direct Checkout', icon: <IconMessageCircle size={14} />, checked: true },
    { id: 'craft_story', name: 'Artisan Heritage Story', icon: <IconLayers size={14} />, checked: false },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Popover Menu above the + button (Reference 4) */}
      {popupOpen && (
        <div
          style={{
            marginBottom: '10px',
            width: '240px',
            background: 'rgba(18, 20, 32, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '14px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85), 0 0 30px rgba(59, 130, 246, 0.2)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: '#94A3B8',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '4px 8px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '4px',
            }}
          >
            Add Components
          </div>
          {blockPresets.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (onQuickInsertSection) onQuickInsertSection(item.id);
                setPopupOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderRadius: '8px',
                background: 'transparent',
                border: 'none',
                color: '#FFF',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#60A5FA', display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                <span>{item.name}</span>
              </div>
              <input
                type="checkbox"
                checked={item.checked}
                readOnly
                style={{
                  accentColor: '#3B82F6',
                  cursor: 'pointer',
                  borderRadius: '4px',
                }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Floating Pill Dock (Reference 4) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 8px',
          borderRadius: '16px',
          background: 'rgba(15, 18, 28, 0.94)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 25px rgba(59, 130, 246, 0.25)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Blue Squircle '+' Button (Reference 4) */}
        <button
          type="button"
          title="Add Block"
          onClick={() => setPopupOpen(!popupOpen)}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            border: '1px solid rgba(59, 130, 246, 0.8)',
            background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
            boxShadow: '0 0 16px rgba(59, 130, 246, 0.6)',
            color: '#FFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {popupOpen ? <IconClose size={16} /> : <IconPlus size={18} />}
        </button>

        {/* Tool: Select / Move */}
        <button
          type="button"
          title="Select / Move Mode"
          onClick={() => onSelectTool('select')}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            border: activeTool === 'select' ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid transparent',
            background: activeTool === 'select' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
            color: activeTool === 'select' ? '#FFF' : '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <IconSelect size={16} />
        </button>

        {/* Tool: LEGO Composer */}
        <button
          type="button"
          title="LEGO Component Composer"
          onClick={onOpenComposer}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            border: '1px solid transparent',
            background: 'transparent',
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <IconLego size={16} />
        </button>

        {/* Tool: AI Autopilot */}
        <button
          type="button"
          title="AI Autopilot Generation"
          onClick={onOpenAutopilot}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            border: '1px solid transparent',
            background: 'transparent',
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <IconSparkles size={16} />
        </button>

        {/* Tool: Templates & Themes Library */}
        {onOpenTemplates && (
          <button
            type="button"
            title="Website Templates & Themes Library"
            onClick={onOpenTemplates}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              border: '1px solid rgba(229, 169, 60, 0.4)',
              background: 'rgba(229, 169, 60, 0.15)',
              color: '#FCD34D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 0 12px rgba(229, 169, 60, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ fontSize: '15px' }}>🎨</span>
          </button>
        )}

        {/* Tool: Launchpad Wizard */}
        <button
          type="button"
          title="Traditional Fashion Launchpad Wizard"
          onClick={onOpenLaunchpad}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            border: '1px solid transparent',
            background: 'transparent',
            color: '#E5A93C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <IconCrown size={16} />
        </button>
      </div>
    </div>
  );
}
