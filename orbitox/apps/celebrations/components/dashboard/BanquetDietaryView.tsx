'use client';

import React, { useState } from 'react';
import { useResponsiveDevice } from '../../hooks/useResponsiveDevice';
import { Download, Utensils, CheckCircle2, AlertCircle, FileSpreadsheet, ShieldCheck } from 'lucide-react';

interface DietaryCategory {
  type: string;
  count: number;
  tables: string;
  chefNotes: string;
  color: string;
}

const DIETARY_CATEGORIES: DietaryCategory[] = [
  { type: 'Jain Vegetarian', count: 42, tables: 'Tables 1, 2, 3, 4 (East Terrace)', chefNotes: 'No root vegetables (potatoes, onions, garlic). Pure ghee preparation.', color: '#F59E0B' },
  { type: 'Strict Vegan', count: 28, tables: 'Tables 5, 6 (Courtyard)', chefNotes: 'Zero dairy, paneer, honey, or animal derivatives. Almond/oat alternatives.', color: '#10B981' },
  { type: 'Gluten-Free Coeliac', count: 14, tables: 'Table 7 (North Verandah)', chefNotes: 'Separate dedicated cookware to prevent cross-contamination.', color: '#EF4444' },
  { type: 'Halal Gourmet', count: 36, tables: 'Tables 8, 9, 10 (Main Hall)', chefNotes: '100% Halal certified meats with dedicated prep counter.', color: '#60A5FA' },
  { type: 'Nut Allergy Protocol', count: 8, tables: 'Table 11 (Private Dining)', chefNotes: 'Severe peanut and tree nut allergy alert. EpiPen kit verified on standby.', color: '#EC4899' },
  { type: 'Standard Royal Multi-Cuisine', count: 380, tables: 'Tables 12-40 (Grand Ballroom)', chefNotes: 'Signature Rajasthani, Awadhi, and Continental grand banquet buffet.', color: 'var(--cel-gold)' },
];

export function BanquetDietaryView() {
  const [downloaded, setDownloaded] = useState(false);
  const { isMobile } = useResponsiveDevice();

  const totalExactPlates = DIETARY_CATEGORIES.reduce((sum, d) => sum + d.count, 0);
  const bufferPlates = Math.round(totalExactPlates * 0.1);
  const totalBanquetPlates = totalExactPlates + bufferPlates;

  const handleExportCsv = () => {
    const headers = ['Dietary Type', 'Headcount', 'Table Assignment', 'Chef Preparation Guidelines'];
    const rows = DIETARY_CATEGORIES.map((d) => [d.type, d.count, d.tables, d.chefNotes]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Banquet_Dietary_Manifest_OrbitoX.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge-gold">Banquet &amp; Catering Operations</span>
            <span className="badge-purple">Zero Cross-Contamination Protocol</span>
          </div>
          <h2 style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>
            Banquet Catering Dietary Intelligence
          </h2>
          <p style={{ color: 'var(--cel-text-secondary)', fontSize: '0.86rem', marginTop: '4px' }}>
            Table-by-table dietary breakdown and executive chef manifests for high-volume celebrations.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="btn-maison-primary touch-target"
          style={{ width: isMobile ? '100%' : 'auto', padding: '11px 22px', fontSize: '0.86rem', justifyContent: 'center' }}
        >
          <FileSpreadsheet size={15} />
          <span>{downloaded ? 'Manifest Downloaded! ✓' : 'Export Chef Manifest (CSV)'}</span>
        </button>
      </div>

      {/* Headcount Breakdown Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
        }}
      >
        <div className="glass-panel" style={{ padding: isMobile ? '16px' : '20px' }}>
          <span style={{ fontSize: '0.70rem', color: 'var(--cel-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            RSVP Headcount
          </span>
          <div style={{ fontSize: isMobile ? '1.8rem' : '2.2rem', fontWeight: 900, color: '#FFFFFF', marginTop: '4px' }}>
            {totalExactPlates}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--cel-text-dim)' }}>Confirmed guests</span>
        </div>

        <div className="glass-panel" style={{ padding: isMobile ? '16px' : '20px' }}>
          <span style={{ fontSize: '0.70rem', color: 'var(--cel-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Buffer (+10%)
          </span>
          <div style={{ fontSize: isMobile ? '1.8rem' : '2.2rem', fontWeight: 900, color: '#38BDF8', marginTop: '4px' }}>
            +{bufferPlates}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#10B981' }}>VIP safety margin</span>
        </div>

        <div className="glass-panel" style={{ padding: isMobile ? '16px' : '20px' }}>
          <span style={{ fontSize: '0.70rem', color: 'var(--cel-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Total Production
          </span>
          <div style={{ fontSize: isMobile ? '1.8rem' : '2.2rem', fontWeight: 900, color: 'var(--cel-gold)', marginTop: '4px' }}>
            {totalBanquetPlates}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--cel-text-secondary)' }}>Kitchen Order</span>
        </div>

        <div className="glass-panel" style={{ padding: isMobile ? '16px' : '20px' }}>
          <span style={{ fontSize: '0.70rem', color: 'var(--cel-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Special Dietary
          </span>
          <div style={{ fontSize: isMobile ? '1.8rem' : '2.2rem', fontWeight: 900, color: '#EC4899', marginTop: '4px' }}>
            {totalExactPlates - 380}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#EC4899' }}>Custom requirements</span>
        </div>
      </div>

      {/* Dietary Manifest List */}
      <div className="glass-panel" style={{ padding: isMobile ? '18px' : '28px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginBottom: '18px' }}>
          Dietary Segregation &amp; Seating Matrix
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {DIETARY_CATEGORIES.map((diet, idx) => (
            <div
              key={idx}
              style={{
                padding: isMobile ? '16px' : '18px 22px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--cel-border-subtle)',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'flex-start' : 'center',
                justifyContent: 'space-between',
                gap: isMobile ? '12px' : '16px',
              }}
            >
              <div style={{ flex: isMobile ? 'none' : '1 1 300px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: diet.color }} />
                  <strong style={{ fontSize: '1.05rem', color: '#FFFFFF' }}>{diet.type}</strong>
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--cel-text-secondary)', margin: 0 }}>
                  {diet.chefNotes}
                </p>
                <div style={{ fontSize: '0.78rem', color: 'var(--cel-gold)', marginTop: '4px' }}>
                  Seating: {diet.tables}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isMobile ? 'space-between' : 'flex-end',
                  width: isMobile ? '100%' : 'auto',
                  borderTop: isMobile ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                  paddingTop: isMobile ? '8px' : '0',
                }}
              >
                <span style={{ fontSize: '0.74rem', color: 'var(--cel-text-dim)' }}>Requirement:</span>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 900, color: diet.color }}>
                    {diet.count}
                  </span>
                  <span style={{ display: 'inline', fontSize: '0.74rem', color: 'var(--cel-text-dim)', marginLeft: '4px' }}>
                    plates
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
