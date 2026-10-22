'use client';

import React, { useState } from 'react';
import {
  X,
  Search,
  Layers,
  Sparkles,
  ArrowRight,
  Eye,
  Check,
  Box,
  Compass,
  Zap,
  Globe,
  Smartphone,
  Database,
  Play,
  Bookmark,
} from 'lucide-react';
import { TemplateCategory, StudioTemplateMeta } from './types';
import { DesignUniverseEngine } from '@/components/template-studio/engine/DesignUniverses';

export const STUDIO_TEMPLATES: StudioTemplateMeta[] = [
  {
    id: 'tmpl-saas-cloudpulse',
    name: 'CloudPulse NextGen SaaS',
    category: 'saas',
    tagline: 'High-conversion developer platform & telemetry cockpit',
    description: 'Complete SaaS web application with interactive telemetry hero, 4-tier bento feature grid, multi-currency pricing matrix, and live code playground.',
    previewGradient: 'linear-gradient(135deg, #090D1A 0%, #172554 50%, #1E1B4B 100%)',
    accentColor: '#3B82F6',
    pagesCount: 8,
    componentsCount: 32,
    hasResponsive: true,
    hasCMS: true,
    hasMotion: true,
    has3D: false,
    hasParallax: true,
    initialTokens: DesignUniverseEngine.getById('cyber')?.tokens || {} as any,
  },
  {
    id: 'tmpl-business-apex',
    name: 'Apex Strategic Capital',
    category: 'business',
    tagline: 'Monumental institutional advisory & venture ecosystem',
    description: 'Corporate portal featuring split narrative typography, key leadership profiles, interactive portfolio timeline, and high-security client gateway.',
    previewGradient: 'linear-gradient(135deg, #18181B 0%, #27272A 50%, #09090B 100%)',
    accentColor: '#E2E8F0',
    pagesCount: 6,
    componentsCount: 24,
    hasResponsive: true,
    hasCMS: true,
    hasMotion: true,
    has3D: false,
    hasParallax: true,
    initialTokens: DesignUniverseEngine.getById('minimal')?.tokens || {} as any,
  },
  {
    id: 'tmpl-portfolio-mono',
    name: 'Atelier Vance Design Studio',
    category: 'portfolio',
    tagline: 'Editorial visual artist & architectural case study showcase',
    description: 'Award-winning portfolio layout featuring masonry media showcase, smooth depth reveal cards, dynamic project drawer, and typography specimen index.',
    previewGradient: 'linear-gradient(135deg, #1C1917 0%, #292524 50%, #0C0A09 100%)',
    accentColor: '#D97706',
    pagesCount: 5,
    componentsCount: 18,
    hasResponsive: true,
    hasCMS: true,
    hasMotion: true,
    has3D: false,
    hasParallax: true,
    initialTokens: DesignUniverseEngine.getById('editorial')?.tokens || {} as any,
  },
  {
    id: 'tmpl-agency-kinetic',
    name: 'Vanguard Kinetic Media',
    category: 'agency',
    tagline: 'Full-service digital agency with bold chromatic motion',
    description: 'High-energy studio showcase featuring dynamic horizontal reel, video client case studies, custom interactive inquiry builder, and client reviews.',
    previewGradient: 'linear-gradient(135deg, #111827 0%, #312E81 50%, #4C1D95 100%)',
    accentColor: '#8B5CF6',
    pagesCount: 7,
    componentsCount: 28,
    hasResponsive: true,
    hasCMS: true,
    hasMotion: true,
    has3D: true,
    hasParallax: true,
    initialTokens: DesignUniverseEngine.getById('aurora')?.tokens || {} as any,
  },
  {
    id: 'tmpl-ecommerce-lumina',
    name: 'Lumina Objects & Apparel',
    category: 'ecommerce',
    tagline: 'Minimalist luxury goods with spatial product inspect',
    description: 'Modern storefront with multi-angle gallery, floating quick-cart drawer, customer sentiment testimonials, and responsive lookbook grid.',
    previewGradient: 'linear-gradient(135deg, #172554 0%, #0F172A 50%, #020617 100%)',
    accentColor: '#38BDF8',
    pagesCount: 9,
    componentsCount: 36,
    hasResponsive: true,
    hasCMS: true,
    hasMotion: true,
    has3D: false,
    hasParallax: true,
    initialTokens: DesignUniverseEngine.getById('minimal')?.tokens || {} as any,
  },
  {
    id: 'tmpl-restaurant-letoile',
    name: 'L’Étoile Gastronomie',
    category: 'restaurant',
    tagline: 'Michelin-starred culinary sanctuary & tasting room',
    description: 'Immersive dining experience with seasonal degustation menu tabs, direct OpenTable integration, wine cellar showcase, and ambient chef video.',
    previewGradient: 'linear-gradient(135deg, #2A170F 0%, #1A0D08 50%, #0D0502 100%)',
    accentColor: '#F59E0B',
    pagesCount: 5,
    componentsCount: 20,
    hasResponsive: true,
    hasCMS: true,
    hasMotion: true,
    has3D: false,
    hasParallax: true,
    initialTokens: DesignUniverseEngine.getById('luxury')?.tokens || {} as any,
  },
  {
    id: 'tmpl-hotel-riviera',
    name: 'The Grand Riviera Palace',
    category: 'hotel',
    tagline: 'Coastal sanctuary of understated Mediterranean serenity',
    description: 'Hospitality experience featuring suite comparison slider, interactive amenity map, guest concierge reservation flow, and weather-aware header.',
    previewGradient: 'linear-gradient(135deg, #064E3B 0%, #022C22 50%, #0F172A 100%)',
    accentColor: '#10B981',
    pagesCount: 7,
    componentsCount: 26,
    hasResponsive: true,
    hasCMS: true,
    hasMotion: true,
    has3D: false,
    hasParallax: true,
    initialTokens: DesignUniverseEngine.getById('botanical')?.tokens || {} as any,
  },
  {
    id: 'tmpl-wedding-celestial',
    name: 'Celestial Odyssey Wedding',
    category: 'wedding',
    tagline: 'Eternal celestial union under royal starlight',
    description: 'The signature OrbitoX experience with astral portraits, interactive astrolabe countdown, constellation memory map, and Ed25519 guest decree.',
    previewGradient: 'linear-gradient(135deg, #090B14 0%, #131A2E 50%, #0D1120 100%)',
    accentColor: '#DFBA6B',
    pagesCount: 7,
    componentsCount: 30,
    hasResponsive: true,
    hasCMS: true,
    hasMotion: true,
    has3D: true,
    hasParallax: true,
    factoryKey: 'celestial',
    initialTokens: DesignUniverseEngine.getById('celestial')?.tokens || {} as any,
  },
  {
    id: 'tmpl-celebration-regalia',
    name: 'Royal Regalia Jubilee',
    category: 'celebration',
    tagline: 'Majestic celebration with gold filigree & royal ceremony',
    description: 'Opulent celebration template with ceremonial schedule, royal RSVP invitation, gilded memory archive, and starlight wishes board.',
    previewGradient: 'linear-gradient(135deg, #241A0B 0%, #150F05 50%, #0A0702 100%)',
    accentColor: '#EAB308',
    pagesCount: 6,
    componentsCount: 22,
    hasResponsive: true,
    hasCMS: true,
    hasMotion: true,
    has3D: false,
    hasParallax: true,
    initialTokens: DesignUniverseEngine.getById('luxury')?.tokens || {} as any,
  },
  {
    id: 'tmpl-event-summit',
    name: 'Global Spatial Tech Summit',
    category: 'event',
    tagline: 'World forum on artificial intelligence, spatial computing & Web3',
    description: 'Multi-track conference website with keynote speaker roster, live agenda chronograph, ticket tiers, sponsor showcase, and venue transit map.',
    previewGradient: 'linear-gradient(135deg, #022C22 0%, #064E3B 50%, #065F46 100%)',
    accentColor: '#34D399',
    pagesCount: 8,
    componentsCount: 34,
    hasResponsive: true,
    hasCMS: true,
    hasMotion: true,
    has3D: true,
    hasParallax: true,
    initialTokens: DesignUniverseEngine.getById('cyber')?.tokens || {} as any,
  },
  {
    id: 'tmpl-editorial-monocle',
    name: 'The Monocle Review',
    category: 'editorial',
    tagline: 'Contemporary cultural commentary & investigative journalism',
    description: 'Pure typography-led editorial publication with multi-column story layouts, pull quotes, reading progress indicator, and author dispatch bio.',
    previewGradient: 'linear-gradient(135deg, #262626 0%, #171717 50%, #0A0A0A 100%)',
    accentColor: '#FAFAFA',
    pagesCount: 6,
    componentsCount: 19,
    hasResponsive: true,
    hasCMS: true,
    hasMotion: true,
    has3D: false,
    hasParallax: false,
    initialTokens: DesignUniverseEngine.getById('editorial')?.tokens || {} as any,
  },
  {
    id: 'tmpl-experimental-void',
    name: 'Chromatic Void Laboratory',
    category: 'experimental',
    tagline: 'Anti-standard brutalist interface with generative distortion',
    description: 'High-concept creative laboratory featuring raw monospace scales, liquid chrome surface shaders, inverted contrast modes, and ASCII animations.',
    previewGradient: 'linear-gradient(135deg, #3B0764 0%, #581C87 50%, #1E1B4B 100%)',
    accentColor: '#C084FC',
    pagesCount: 5,
    componentsCount: 16,
    hasResponsive: true,
    hasCMS: false,
    hasMotion: true,
    has3D: true,
    hasParallax: true,
    initialTokens: DesignUniverseEngine.getById('brutalist')?.tokens || {} as any,
  },
  {
    id: 'tmpl-3d-spatial-horizon',
    name: 'Spatial Horizon 3D',
    category: '3d',
    tagline: 'Interactive WebGL spatial world with real-time orbit camera',
    description: 'Next-generation 3D spatial web experience with interactive orbital hero, volumetric lights, floating glass HUD elements, and procedural particle field.',
    previewGradient: 'linear-gradient(135deg, #030712 0%, #0F172A 50%, #1E1B4B 100%)',
    accentColor: '#6366F1',
    pagesCount: 6,
    componentsCount: 22,
    hasResponsive: true,
    hasCMS: false,
    hasMotion: true,
    has3D: true,
    hasParallax: true,
    initialTokens: DesignUniverseEngine.getById('celestial')?.tokens || {} as any,
  },
];

interface TemplateBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: StudioTemplateMeta) => void;
  onReplaceSite?: (template: StudioTemplateMeta, preserveContent?: boolean) => void;
  onAddTemplateSection?: (template: StudioTemplateMeta) => void;
  onApplyTemplateTheme?: (template: StudioTemplateMeta) => void;
  onNewFromTemplate?: (template: StudioTemplateMeta) => void;
}

export function TemplateBrowserModal({
  isOpen,
  onClose,
  onSelectTemplate,
  onReplaceSite,
  onAddTemplateSection,
  onApplyTemplateTheme,
  onNewFromTemplate,
}: TemplateBrowserModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activePreview, setActivePreview] = useState<StudioTemplateMeta | null>(null);
  const [templateToReplace, setTemplateToReplace] = useState<StudioTemplateMeta | null>(null);
  const [preserveContent, setPreserveContent] = useState<boolean>(false);

  if (!isOpen) return null;

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: 'All Categories' },
    { id: 'saas', label: 'SaaS & Tech' },
    { id: 'business', label: 'Business' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'agency', label: 'Agency' },
    { id: 'ecommerce', label: 'Ecommerce' },
    { id: 'restaurant', label: 'Restaurant' },
    { id: 'hotel', label: 'Hotel' },
    { id: 'wedding', label: 'Wedding' },
    { id: 'celebration', label: 'Celebration' },
    { id: 'event', label: 'Event' },
    { id: 'editorial', label: 'Editorial' },
    { id: 'experimental', label: 'Experimental' },
    { id: '3d', label: '3D Spatial' },
  ];

  const filteredTemplates = STUDIO_TEMPLATES.filter((tmpl) => {
    const matchesCat = selectedCategory === 'all' || tmpl.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      tmpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tmpl.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tmpl.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        id="sz-template-browser-modal"
        style={{
          width: '100%',
          maxWidth: '1160px',
          maxHeight: '90vh',
          background: '#121317',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          display: 'flex',
          flexDirection: 'column',
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
            background: '#16181D',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60A5FA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Compass size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                OrbitoX Template Universe
              </h2>
              <p style={{ margin: 0, fontSize: '0.76rem', color: '#9CA3AF' }}>
                Production-ready starting points with full Scenes, Sections, Themes, Motion, and CMS configurations
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            id="sz-close-template-modal-btn"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9CA3AF',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div
          style={{
            padding: '14px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            background: '#14151B',
          }}
        >
          {/* Search */}
          <div
            style={{
              flex: 1,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search size={15} style={{ position: 'absolute', left: '12px', color: '#6B7280' }} />
            <input
              type="text"
              id="sz-template-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by industry, keyword, layout style..."
              style={{
                width: '100%',
                background: '#1F2229',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '8px 12px 8px 36px',
                color: '#FFFFFF',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Template Count Pill */}
          <div style={{ fontSize: '0.76rem', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
            <span style={{ color: '#3B82F6', fontWeight: 700 }}>{filteredTemplates.length}</span> templates available
          </div>
        </div>

        {/* Categories Chips */}
        <div
          className="sz-custom-scrollbar"
          style={{
            padding: '10px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
            background: '#121317',
          }}
        >
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  background: isSelected ? '#3B82F6' : '#1A1C22',
                  border: isSelected ? '1px solid #60A5FA' : '1px solid rgba(255, 255, 255, 0.06)',
                  color: isSelected ? '#FFFFFF' : '#9CA3AF',
                  borderRadius: '20px',
                  padding: '5px 12px',
                  fontSize: '0.72rem',
                  fontWeight: isSelected ? 600 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Templates Grid */}
        <div
          className="sz-custom-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px',
          }}
        >
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              id={`sz-template-card-${template.id}`}
              className="sz-template-card"
              style={{
                background: '#16181D',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3B82F6';
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 12px 24px -6px rgba(0, 0, 0, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onClick={() => onSelectTemplate(template)}
            >
              {/* Preview Thumbnail Artboard */}
              <div
                style={{
                  height: '140px',
                  background: template.previewGradient,
                  padding: '16px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                {/* Category & Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      background: 'rgba(0, 0, 0, 0.6)',
                      backdropFilter: 'blur(6px)',
                      color: template.accentColor,
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      border: `1px solid ${template.accentColor}33`,
                    }}
                  >
                    {template.category}
                  </span>

                  {template.has3D && (
                    <span
                      style={{
                        background: 'rgba(99, 102, 241, 0.2)',
                        border: '1px solid #818CF8',
                        color: '#A5B4FC',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      3D Spatial
                    </span>
                  )}
                </div>

                {/* Card Title inside visual preview */}
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 700, color: '#FFFFFF' }}>
                    {template.name}
                  </h4>
                  <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.75)' }}>
                    {template.tagline}
                  </p>
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, gap: '12px' }}>
                <p style={{ margin: 0, fontSize: '0.74rem', color: '#9CA3AF', lineHeight: 1.45, flex: 1 }}>
                  {template.description}
                </p>

                {/* Feature Tags */}
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <span style={{ fontSize: '0.65rem', background: '#1F2229', color: '#D1D5DB', padding: '2px 6px', borderRadius: '4px' }}>
                    {template.pagesCount} Pages
                  </span>
                  <span style={{ fontSize: '0.65rem', background: '#1F2229', color: '#D1D5DB', padding: '2px 6px', borderRadius: '4px' }}>
                    {template.componentsCount} Components
                  </span>
                  {template.hasResponsive && (
                    <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.1)', color: '#34D399', padding: '2px 6px', borderRadius: '4px' }}>
                      Responsive
                    </span>
                  )}
                  {template.hasCMS && (
                    <span style={{ fontSize: '0.65rem', background: 'rgba(59, 130, 246, 0.1)', color: '#60A5FA', padding: '2px 6px', borderRadius: '4px' }}>
                      CMS Data
                    </span>
                  )}
                  {template.hasMotion && (
                    <span style={{ fontSize: '0.65rem', background: 'rgba(245, 158, 11, 0.1)', color: '#FBBF24', padding: '2px 6px', borderRadius: '4px' }}>
                      Motion
                    </span>
                  )}
                </div>

                {/* Card Action Buttons (Prompt #17, #19, #20, #21) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '6px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      id={`sz-replace-site-btn-${template.id}`}
                      title="Replace current site with this complete template"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTemplateToReplace(template);
                      }}
                      style={{
                        flex: 1,
                        background: '#2563EB',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        color: '#FFFFFF',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#1D4ED8')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#2563EB')}
                    >
                      <span>Replace Site</span>
                      <ArrowRight size={12} />
                    </button>

                    <button
                      id={`sz-add-section-tmpl-btn-${template.id}`}
                      title="Add this template's section into current site"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onAddTemplateSection) {
                          onAddTemplateSection(template);
                        } else {
                          onSelectTemplate(template);
                        }
                        onClose();
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        color: '#E5E7EB',
                        fontSize: '0.72rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      + Section
                    </button>

                    <button
                      id={`sz-apply-theme-tmpl-btn-${template.id}`}
                      title="Apply only colors, typography & tokens without modifying content"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onApplyTemplateTheme) {
                          onApplyTemplateTheme(template);
                        }
                        onClose();
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        color: '#E5E7EB',
                        fontSize: '0.72rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Theme
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Modal for Replace Current Site (Prompt #19) */}
      {templateToReplace && (
        <div
          id="sz-replace-site-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            id="sz-replace-site-modal"
            style={{
              background: '#1A1D24',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '460px',
              width: '90%',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
            }}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: '1.05rem', color: '#F3F4F6', fontWeight: 700 }}>
              Replace Current Site?
            </h3>
            <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: '#9CA3AF', lineHeight: 1.5 }}>
              Your current draft will be automatically backed up. Choose how you want to apply <strong>{templateToReplace.name}</strong>:
            </p>

            {/* Content Preservation Toggle */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                background: '#121418',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                cursor: 'pointer',
                marginBottom: '16px',
              }}
            >
              <input
                type="checkbox"
                checked={preserveContent}
                onChange={(e) => setPreserveContent(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.74rem', color: '#E5E7EB' }}>
                Migrate my current text copy into the new template
              </span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
              <button
                id="sz-cancel-replace-site-btn"
                onClick={() => setTemplateToReplace(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#D1D5DB',
                  borderRadius: '6px',
                  padding: '7px 14px',
                  fontSize: '0.76rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              {onNewFromTemplate && (
                <button
                  id="sz-new-project-tmpl-btn"
                  onClick={() => {
                    const tmpl = templateToReplace;
                    setTemplateToReplace(null);
                    onNewFromTemplate(tmpl);
                    onClose();
                  }}
                  style={{
                    background: '#1F2229',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#60A5FA',
                    borderRadius: '6px',
                    padding: '7px 14px',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Create New Project Instead
                </button>
              )}

              <button
                id="sz-confirm-replace-site-btn"
                onClick={() => {
                  const tmpl = templateToReplace;
                  setTemplateToReplace(null);
                  if (onReplaceSite) {
                    onReplaceSite(tmpl, preserveContent);
                  } else {
                    onSelectTemplate(tmpl);
                  }
                  onClose();
                }}
                style={{
                  background: '#2563EB',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  padding: '7px 16px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
                }}
              >
                Replace Site
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
