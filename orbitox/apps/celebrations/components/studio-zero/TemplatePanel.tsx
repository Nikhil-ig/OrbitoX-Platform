'use client';

import React, { useState } from 'react';
import {
  Compass,
  Search,
  X,
  ExternalLink,
  Sparkles,
  Layers,
  ArrowRight,
  Bookmark,
} from 'lucide-react';
import { STUDIO_TEMPLATES } from './TemplateBrowserModal';
import { StudioTemplateMeta } from './types';

interface TemplatePanelProps {
  onClose: () => void;
  onSelectTemplate: (template: StudioTemplateMeta) => void;
  onOpenFullBrowser: () => void;
}

export function TemplatePanel({
  onClose,
  onSelectTemplate,
  onOpenFullBrowser,
}: TemplatePanelProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'popular' | 'saas' | 'portfolio'>('all');
  const [search, setSearch] = useState('');

  const filtered = STUDIO_TEMPLATES.filter((t) => {
    if (activeTab === 'saas' && t.category !== 'saas') return false;
    if (activeTab === 'portfolio' && t.category !== 'portfolio') return false;
    if (search.trim()) {
      return (
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase())
      );
    }
    return true;
  });

  return (
    <div
      id="sz-template-drawer"
      style={{
        width: '320px',
        background: '#16181D',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        zIndex: 35,
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Compass size={16} style={{ color: '#3B82F6' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F3F4F6' }}>
            Site Templates
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={onOpenFullBrowser}
            title="Open Full Template Universe"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#3B82F6',
              cursor: 'pointer',
              padding: '4px',
              fontSize: '0.72rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>Explore</span>
            <ExternalLink size={12} />
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#6B7280',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={13} style={{ position: 'absolute', left: '10px', color: '#6B7280' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            style={{
              width: '100%',
              background: '#1F2229',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '6px',
              padding: '6px 10px 6px 30px',
              color: '#FFFFFF',
              fontSize: '0.76rem',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '4px', padding: '8px 14px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
        {[
          { id: 'all', label: 'All' },
          { id: 'popular', label: 'Popular' },
          { id: 'saas', label: 'SaaS' },
          { id: 'portfolio', label: 'Portfolio' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              flex: 1,
              background: activeTab === tab.id ? '#2A2D37' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              padding: '4px',
              fontSize: '0.7rem',
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? '#FFFFFF' : '#9CA3AF',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Template Cards List */}
      <div
        className="sz-custom-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {filtered.map((t) => (
          <div
            key={t.id}
            style={{
              background: '#1F2229',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onClick={() => onSelectTemplate(t)}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#3B82F6';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {/* Miniature Preview Banner */}
            <div
              style={{
                height: '70px',
                background: t.previewGradient,
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  alignSelf: 'flex-start',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: t.accentColor,
                  background: 'rgba(0, 0, 0, 0.6)',
                  padding: '2px 6px',
                  borderRadius: '3px',
                }}
              >
                {t.category}
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FFFFFF' }}>{t.name}</span>
            </div>

            <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.7rem', color: '#9CA3AF', lineHeight: 1.35 }}>{t.tagline}</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                <span style={{ fontSize: '0.65rem', color: '#6B7280' }}>{t.pagesCount} Pages • {t.componentsCount} Components</span>
                <span style={{ fontSize: '0.7rem', color: '#3B82F6', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span>Preview & Insert</span>
                  <ArrowRight size={11} />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
