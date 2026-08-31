'use client';

import React, { useState } from 'react';
import {
  IconRuler,
  IconClose,
  IconSparkles,
  IconShieldCheck,
} from '@/components/storefront/storefront-icons';

interface JuttiSizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  verticalId?: string;
}

export function JuttiSizeGuideModal({ isOpen, onClose, verticalId = 'punjabi-jutti' }: JuttiSizeGuideModalProps) {
  const [unit, setUnit] = useState<'cm' | 'inches'>('cm');

  if (!isOpen) return null;

  const sizeTable = [
    { ind: '36', uk: 'UK 3', us: 'US 5.5', eu: 'EU 36', cm: '23.0', inches: '9.06"' },
    { ind: '37', uk: 'UK 4', us: 'US 6.5', eu: 'EU 37', cm: '23.7', inches: '9.33"' },
    { ind: '38', uk: 'UK 5', us: 'US 7.5', eu: 'EU 38', cm: '24.3', inches: '9.57"' },
    { ind: '39', uk: 'UK 6', us: 'US 8.5', eu: 'EU 39', cm: '25.0', inches: '9.84"' },
    { ind: '40', uk: 'UK 7', us: 'US 9.5', eu: 'EU 40', cm: '25.7', inches: '10.12"' },
    { ind: '41', uk: 'UK 8', us: 'US 10.5', eu: 'EU 41', cm: '26.3', inches: '10.35"' },
    { ind: '42', uk: 'UK 9', us: 'US 11.5', eu: 'EU 42', cm: '27.0', inches: '10.63"' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 3, 4, 0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          background: 'linear-gradient(180deg, #181114 0%, #0D080B 100%)',
          border: '1px solid rgba(229, 169, 60, 0.4)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(229, 169, 60, 0.2)',
          color: '#FFF',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(229, 169, 60, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconRuler size={20} color="#E5A93C" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#F9E4B7' }}>
                Artisanal Foot Measurement & Size Guide
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                Patiala handcrafted juttis are designed for a snug, bite-free silhouette
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#FFF',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconClose size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Unit Toggle */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              onClick={() => setUnit('cm')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                background: unit === 'cm' ? '#E5A93C' : 'rgba(255,255,255,0.06)',
                color: unit === 'cm' ? '#000' : '#FFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Centimeters (CM)
            </button>
            <button
              onClick={() => setUnit('inches')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                background: unit === 'inches' ? '#E5A93C' : 'rgba(255,255,255,0.06)',
                color: unit === 'inches' ? '#000' : '#FFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Inches
            </button>
          </div>

          {/* Size Chart Table */}
          <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(229, 169, 60, 0.15)', color: '#F9E4B7' }}>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>IND / UK Size</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>US Size</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>EU Size</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    Foot Length ({unit.toUpperCase()})
                  </th>
                </tr>
              </thead>
              <tbody>
                {sizeTable.map((row, idx) => (
                  <tr
                    key={row.ind}
                    style={{
                      background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <td style={{ padding: '10px 16px', fontWeight: 800, color: '#E5A93C' }}>
                      Size {row.ind} ({row.uk})
                    </td>
                    <td style={{ padding: '10px 16px' }}>{row.us}</td>
                    <td style={{ padding: '10px 16px' }}>{row.eu}</td>
                    <td style={{ padding: '10px 16px', fontWeight: 700 }}>
                      {unit === 'cm' ? `${row.cm} cm` : row.inches}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bite-Free & Fit Advice Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(229, 169, 60, 0.08)', border: '1px solid rgba(229, 169, 60, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 800, color: '#E5A93C', marginBottom: '4px' }}>
                <IconSparkles size={14} color="#E5A93C" />
                <span>100% Bite-Free Tip</span>
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.45 }}>
                Our vegetable-tanned leather moulds to your foot shape after 1-2 wears. If broad-footed, we recommend ordering one size up.
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 800, color: '#10B981', marginBottom: '4px' }}>
                <IconShieldCheck size={14} color="#10B981" />
                <span>Bespoke Concierge Fitting</span>
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.45 }}>
                Connect directly with our master mochi artisans for custom measurements and bespoke wedding party fittings.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
