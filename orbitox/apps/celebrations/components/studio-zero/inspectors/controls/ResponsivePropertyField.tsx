'use client';

import React from 'react';
import { DeviceBreakpoint } from '@/components/template-studio/types/TemplateSchema';
import { RotateCcw } from 'lucide-react';

interface ResponsivePropertyFieldProps {
  label: string;
  propName?: string;
  activeViewport: DeviceBreakpoint;
  isOverridden?: boolean;
  onResetOverride?: (propName: string) => void;
  children: React.ReactNode;
}

export function ResponsivePropertyField({
  label,
  propName,
  activeViewport,
  isOverridden = false,
  onResetOverride,
  children,
}: ResponsivePropertyFieldProps) {
  const isResponsiveMode = activeViewport !== 'desktop';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9CA3AF' }}>{label}</label>
          {isResponsiveMode && (
            <span
              title={
                isOverridden
                  ? `Overridden on ${activeViewport}. Click to reset to desktop value.`
                  : `Inherited from desktop value`
              }
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: isOverridden ? '#3B82F6' : '#6B7280',
                display: 'inline-block',
              }}
            />
          )}
        </div>

        {isResponsiveMode && isOverridden && propName && onResetOverride && (
          <button
            onClick={() => onResetOverride(propName)}
            title="Reset to inherited desktop value"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#3B82F6',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              fontSize: '0.65rem',
              padding: '1px 4px',
            }}
          >
            <RotateCcw size={10} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {children}
    </div>
  );
}
