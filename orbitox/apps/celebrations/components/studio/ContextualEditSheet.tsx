'use client';

import React, { useState, useRef } from 'react';
import {
  CelebrationState,
  THEME_PRESETS,
  OCCASION_PRESETS,
  OccasionType,
  ItineraryItem,
} from './StudioData';
import {
  X,
  Sparkles,
  Palette,
  Users,
  Calendar,
  Feather,
  MapPin,
  HeartHandshake,
  Play,
  Pause,
  Check,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Key,
  Lock,
  Unlock,
  ShieldCheck,
} from 'lucide-react';

export type SheetType =
  | 'beginning'
  | 'style'
  | 'people'
  | 'moments'
  | 'story'
  | 'experience'
  | 'guests';

interface ContextualEditSheetProps {
  isOpen: boolean;
  onClose: () => void;
  sheetType: SheetType | null;
  state: CelebrationState;
  onChange: (patch: Partial<CelebrationState>) => void;
  onJumpToSection?: (sectionId: string) => void;
}

export function ContextualEditSheet({
  isOpen,
  onClose,
  sheetType,
  state,
  onChange,
  onJumpToSection,
}: ContextualEditSheetProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // VIP PIN unlock tester state
  const [testPin, setTestPin] = useState('');
  const [testUnlockResult, setTestUnlockResult] = useState<'idle' | 'success' | 'fail'>('idle');

  if (!isOpen || !sheetType) return null;

  const currentTheme = THEME_PRESETS[state.theme] || THEME_PRESETS['royal-regalia'];

  const titles: Record<SheetType, { title: string; subtitle: string; icon: React.ElementType }> = {
    beginning: { title: 'Celebration Beginning', subtitle: 'Occasion & Concept', icon: Sparkles },
    style: { title: 'Aesthetic Universes & Sound', subtitle: 'Art Direction & Mood', icon: Palette },
    people: { title: 'Celebrants & Monogram Crest', subtitle: 'Honored Protagonists', icon: Users },
    moments: { title: 'Ceremony Schedule', subtitle: 'Timeline & Attire', icon: Calendar },
    story: { title: 'Story & Proclamation', subtitle: 'Narrative Writing Room', icon: Feather },
    experience: { title: 'Palace Venue & Details', subtitle: 'Location & Arrival', icon: MapPin },
    guests: { title: 'RSVP & VIP Security', subtitle: 'Passcode & Digital Shagun', icon: HeartHandshake },
  };

  const currentMeta = titles[sheetType];
  const Icon = currentMeta.icon;

  const luxuryPaletteSwatches = [
    { name: 'Royal Gold', hex: '#eab308' },
    { name: 'Imperial Burgundy', hex: '#991b1b' },
    { name: 'Emerald Royale', hex: '#065f46' },
    { name: 'Celestial Sapphire', hex: '#1e40af' },
    { name: 'Rose Blush', hex: '#f43f5e' },
    { name: 'Obsidian Noir', hex: '#18181b' },
    { name: 'Champagne Bronze', hex: '#d97706' },
    { name: 'Amethyst Velvet', hex: '#7e22ce' },
  ];

  const palatialVenues = [
    {
      name: 'Umaid Bhawan Palace',
      city: 'Jodhpur',
      stateCountry: 'Rajasthan, India',
      address: 'Circuit House Rd, Cantt Area, Jodhpur 342006',
    },
    {
      name: 'The Taj Lake Palace',
      city: 'Udaipur',
      stateCountry: 'Rajasthan, India',
      address: 'Pichola, Udaipur, Rajasthan 313001',
    },
    {
      name: 'The St. Regis Mumbai',
      city: 'Mumbai',
      stateCountry: 'Maharashtra, India',
      address: '462 Senapati Bapat Marg, Lower Parel, Mumbai 400013',
    },
    {
      name: 'Palace of Versailles',
      city: 'Versailles',
      stateCountry: 'Île-de-France, France',
      address: 'Place d’Armes, 78000 Versailles, France',
    },
    {
      name: 'Villa d’Este',
      city: 'Lake Como',
      stateCountry: 'Lombardy, Italy',
      address: 'Via Regina, 40, 22012 Cernobbio CO, Italy',
    },
  ];

  // Itinerary helper handlers
  const handleAddCeremony = (presetTitle?: string) => {
    const newCeremony: ItineraryItem = {
      id: `ceremony-${Date.now()}`,
      title: presetTitle || 'Evening Soirée',
      time: '07:00 PM',
      venue: state.venueName || 'Palace Courtyard',
      desc: 'An enchanting gathering of loved ones under starlight.',
      dressCode: 'Black Tie / Royal Formal',
    };
    onChange({ itinerary: [...(state.itinerary || []), newCeremony] });
  };

  const handleRemoveCeremony = (id: string) => {
    onChange({ itinerary: (state.itinerary || []).filter((c) => c.id !== id) });
  };

  const handleMoveCeremony = (index: number, direction: 'up' | 'down') => {
    const list = [...(state.itinerary || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index]!;
    list[index] = list[targetIndex]!;
    list[targetIndex] = temp;
    onChange({ itinerary: list });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      {/* Slide-in Sheet Container */}
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          height: '100%',
          background: '#0e0e12',
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '-20px 0 60px rgba(0, 0, 0, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'csSlideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sheet Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 15, 20, 0.95)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(251, 191, 36, 0.12)',
                color: '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f4f4f5' }}>
                {currentMeta.title}
              </h3>
              <p style={{ margin: 0, fontSize: 11, color: '#71717a' }}>{currentMeta.subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.07)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
            }}
          >
            <span>Done</span>
            <X size={14} />
          </button>
        </div>

        {/* Sheet Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* ────────────────── BEGINNING / OCCASION ────────────────── */}
          {sheetType === 'beginning' && (
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                Select Celebration Occasion
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                {Object.entries(OCCASION_PRESETS).map(([key, occ]) => {
                  const isCurrent = state.occasion === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        onChange({
                          occasion: key as OccasionType,
                          title: `${occ.defaultProtagonist1} & ${occ.defaultProtagonist2 || 'Loved Ones'} ${occ.name}`,
                          protagonist1: occ.defaultProtagonist1,
                          protagonist1Role: occ.defaultProtagonist1Role,
                          protagonist2: occ.defaultProtagonist2,
                          protagonist2Role: occ.defaultProtagonist2Role,
                          tagline: occ.defaultTagline,
                          storyQuote: occ.defaultQuote,
                          storyBody: occ.defaultStory,
                          itinerary: occ.itinerary,
                        });
                      }}
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        background: isCurrent ? 'rgba(251, 191, 36, 0.08)' : '#141418',
                        border: isCurrent ? '1.5px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          background: '#1f1f26',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20,
                          flexShrink: 0,
                        }}
                      >
                        {key === 'wedding' ? '💍' : key === 'anniversary' ? '🥂' : key === 'jubilee' ? '👑' : key === 'birthday' ? '🎂' : '✨'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>{occ.name}</span>
                          {isCurrent && <span style={{ fontSize: 10, color: '#fbbf24', fontWeight: 700, background: 'rgba(251,191,36,0.15)', padding: '2px 8px', borderRadius: 9999 }}>Active</span>}
                        </div>
                        <span style={{ display: 'block', fontSize: 11, color: '#71717a', marginTop: 3 }}>
                          {occ.defaultTagline}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ────────────────── STYLE & AESTHETIC UNIVERSES ────────────────── */}
          {sheetType === 'style' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Universe Cards */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                  Aesthetic Universe
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                  {Object.entries(THEME_PRESETS).map(([key, theme]) => {
                    const isSelected = state.theme === key;
                    return (
                      <div
                        key={key}
                        onClick={() => onChange({ theme: key as any })}
                        style={{
                          borderRadius: 14,
                          border: isSelected ? '2px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.08)',
                          background: isSelected ? 'rgba(251, 191, 36, 0.06)' : '#141418',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ height: 110, position: 'relative', overflow: 'hidden' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={theme.previewImage}
                            alt={theme.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #141418 0%, transparent 80%)' }} />
                          <div style={{ position: 'absolute', bottom: 10, left: 14, right: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>{theme.name}</span>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {theme.palette.map((c, i) => (
                                <span key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.4)' }} />
                              ))}
                            </div>
                          </div>
                        </div>
                        <div style={{ padding: '10px 14px 12px' }}>
                          <p style={{ margin: 0, fontSize: 11, color: '#a1a1aa', lineHeight: 1.4 }}>{theme.universeDescription}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bespoke Color Override Swatches */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                  Luxury Color Accent
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {luxuryPaletteSwatches.map((swatch) => {
                    const isSelected = (state.primaryColorOverride || currentTheme.accentColor).toLowerCase() === swatch.hex.toLowerCase();
                    return (
                      <button
                        key={swatch.hex}
                        type="button"
                        onClick={() => onChange({ primaryColorOverride: swatch.hex })}
                        style={{
                          padding: '8px 6px',
                          borderRadius: 8,
                          background: isSelected ? 'rgba(255, 255, 255, 0.12)' : '#18181f',
                          border: isSelected ? `2px solid ${swatch.hex}` : '1px solid rgba(255, 255, 255, 0.06)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ width: 22, height: 22, borderRadius: '50%', background: swatch.hex, border: '1px solid rgba(255,255,255,0.2)' }} />
                        <span style={{ fontSize: 9, color: isSelected ? '#ffffff' : '#a1a1aa', fontWeight: 600 }}>{swatch.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Soundscape Audio Preview Dock */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: '#141418',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Atmospheric Soundscape
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>{currentTheme.audioTrackName}</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (isPlayingAudio) {
                      audioRef.current?.pause();
                      setIsPlayingAudio(false);
                    } else {
                      if (!audioRef.current) {
                        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2874/2874-preview.mp3');
                        audioRef.current.loop = true;
                      }
                      audioRef.current.play().catch(() => {});
                      setIsPlayingAudio(true);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 8,
                    background: isPlayingAudio ? '#fbbf24' : 'rgba(255, 255, 255, 0.08)',
                    color: isPlayingAudio ? '#000000' : '#ffffff',
                    border: 'none',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isPlayingAudio ? <Pause size={13} /> : <Play size={13} />}
                  <span>{isPlayingAudio ? 'Pause Sound' : 'Play Track'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ────────────────── PEOPLE & MONOGRAM CREST ────────────────── */}
          {sheetType === 'people' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Monogram Crest Designer */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                  Monogram Crest Style
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
                  {[
                    { id: 'arch', label: 'Archway Crest', desc: 'Imperial palace framing' },
                    { id: 'wax', label: 'Wax Seal', desc: 'Royal golden medallion' },
                    { id: 'crest', label: 'Heraldic Crest', desc: 'Sovereign filigree' },
                    { id: 'rings', label: 'Entwined Rings', desc: 'Romantic infinity' },
                  ].map((styleOption) => {
                    const isSelected = (state.monogramStyle || 'arch') === styleOption.id;
                    return (
                      <button
                        key={styleOption.id}
                        type="button"
                        onClick={() => onChange({ monogramStyle: styleOption.id as any })}
                        style={{
                          padding: 12,
                          borderRadius: 10,
                          background: isSelected ? 'rgba(251, 191, 36, 0.1)' : '#141418',
                          border: isSelected ? '1.5px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.07)',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#ffffff' }}>{styleOption.label}</span>
                        <span style={{ display: 'block', fontSize: 10, color: '#71717a', marginTop: 2 }}>{styleOption.desc}</span>
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#a1a1aa', marginBottom: 6 }}>
                    Monogram Initials
                  </label>
                  <input
                    type="text"
                    value={state.monogramInitials || 'A & M'}
                    onChange={(e) => onChange({ monogramInitials: e.target.value })}
                    placeholder="e.g. A & M"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      background: '#141418',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Celebrant 1 */}
              <div style={{ padding: 16, borderRadius: 12, background: '#141418', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                  Primary Celebrant
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    type="text"
                    value={state.protagonist1 || ''}
                    onChange={(e) => onChange({ protagonist1: e.target.value })}
                    placeholder="Celebrant Full Name"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      background: '#1e1e24',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                  <input
                    type="text"
                    value={state.protagonist1Role || ''}
                    onChange={(e) => onChange({ protagonist1Role: e.target.value })}
                    placeholder="Role (e.g. The Groom, Host, Birthday Star)"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      background: '#1e1e24',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Celebrant 2 (Partners / Couple) */}
              <div style={{ padding: 16, borderRadius: 12, background: '#141418', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                  Partner / Co-Host
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    type="text"
                    value={state.protagonist2 || ''}
                    onChange={(e) => onChange({ protagonist2: e.target.value })}
                    placeholder="Partner Full Name"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      background: '#1e1e24',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                  <input
                    type="text"
                    value={state.protagonist2Role || ''}
                    onChange={(e) => onChange({ protagonist2Role: e.target.value })}
                    placeholder="Role (e.g. The Bride, Partner)"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      background: '#1e1e24',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ────────────────── MOMENTS & CEREMONY TIMELINE ────────────────── */}
          {sheetType === 'moments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Quick Preset Buttons */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                  Quick Add Ceremony
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['Haldi Ceremony', 'Sangeet Soirée', 'Sacred Vows', 'Imperial Reception', 'Cocktail Gala'].map((ceremonyTitle) => (
                    <button
                      key={ceremonyTitle}
                      type="button"
                      onClick={() => handleAddCeremony(ceremonyTitle)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        background: '#18181f',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#d4d4d8',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <Plus size={12} />
                      <span>{ceremonyTitle}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeline Items List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(state.itinerary || []).map((ceremony, index) => (
                  <div
                    key={ceremony.id}
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      background: '#141418',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>
                        {ceremony.title}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => handleMoveCeremony(index, 'up')}
                          disabled={index === 0}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            background: '#22222a',
                            border: 'none',
                            color: index === 0 ? '#52525b' : '#ffffff',
                            cursor: index === 0 ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveCeremony(index, 'down')}
                          disabled={index === (state.itinerary || []).length - 1}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            background: '#22222a',
                            border: 'none',
                            color: index === (state.itinerary || []).length - 1 ? '#52525b' : '#ffffff',
                            cursor: index === (state.itinerary || []).length - 1 ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveCeremony(ceremony.id)}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <input
                        type="text"
                        value={ceremony.time}
                        onChange={(e) => {
                          const updated = (state.itinerary || []).map((c) =>
                            c.id === ceremony.id ? { ...c, time: e.target.value } : c
                          );
                          onChange({ itinerary: updated });
                        }}
                        placeholder="Time (e.g. 07:00 PM)"
                        style={{
                          padding: '8px 10px',
                          borderRadius: 8,
                          background: '#1c1c22',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: '#ffffff',
                          fontSize: 12,
                        }}
                      />
                      <input
                        type="text"
                        value={ceremony.venue}
                        onChange={(e) => {
                          const updated = (state.itinerary || []).map((c) =>
                            c.id === ceremony.id ? { ...c, venue: e.target.value } : c
                          );
                          onChange({ itinerary: updated });
                        }}
                        placeholder="Location within venue"
                        style={{
                          padding: '8px 10px',
                          borderRadius: 8,
                          background: '#1c1c22',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: '#ffffff',
                          fontSize: 12,
                        }}
                      />
                    </div>

                    <input
                      type="text"
                      value={ceremony.dressCode || ''}
                      onChange={(e) => {
                        const updated = (state.itinerary || []).map((c) =>
                          c.id === ceremony.id ? { ...c, dressCode: e.target.value } : c
                        );
                        onChange({ itinerary: updated });
                      }}
                      placeholder="Dress Code / Attire (e.g. Regal Traditional)"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: '#1c1c22',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: '#ffffff',
                        fontSize: 12,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ────────────────── STORY & WRITING ROOM ────────────────── */}
          {sheetType === 'story' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                  Narrative Tone of Voice
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {[
                    { id: 'royal', label: '👑 Poetic Royal' },
                    { id: 'modern', label: '✨ Modern Romance' },
                    { id: 'warm', label: '🥂 Warm & Personal' },
                    { id: 'minimal', label: '⚡ Crisp & Minimal' },
                  ].map((tone) => {
                    const isSelected = (state.toneOfVoice || 'royal') === tone.id;
                    return (
                      <button
                        key={tone.id}
                        type="button"
                        onClick={() => onChange({ toneOfVoice: tone.id as any })}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 8,
                          background: isSelected ? 'rgba(251, 191, 36, 0.12)' : '#141418',
                          border: isSelected ? '1.5px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.08)',
                          color: isSelected ? '#fbbf24' : '#d4d4d8',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        {tone.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Ceremonial Proclamation Quote
                </label>
                <textarea
                  rows={2}
                  value={state.storyQuote || ''}
                  onChange={(e) => onChange({ storyQuote: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: '#141418',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    fontSize: 13,
                    fontFamily: 'serif',
                    fontStyle: 'italic',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Narrative Story Farman
                </label>
                <textarea
                  rows={6}
                  value={state.storyBody || ''}
                  onChange={(e) => onChange({ storyBody: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: '#141418',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    fontSize: 13,
                    lineHeight: 1.6,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}

          {/* ────────────────── EXPERIENCE & PALACE VENUE ────────────────── */}
          {sheetType === 'experience' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Palatial Presets */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                  Iconic Palatial Venue Presets
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                  {palatialVenues.map((venue) => {
                    const isSelected = state.venueName === venue.name;
                    return (
                      <button
                        key={venue.name}
                        type="button"
                        onClick={() => {
                          onChange({
                            venueName: venue.name,
                            city: venue.city,
                            stateCountry: venue.stateCountry,
                            venueAddress: venue.address,
                          });
                        }}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 10,
                          background: isSelected ? 'rgba(251, 191, 36, 0.08)' : '#141418',
                          border: isSelected ? '1.5px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.06)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#ffffff' }}>{venue.name}</span>
                          <span style={{ fontSize: 10, color: '#71717a' }}>{venue.city}, {venue.stateCountry}</span>
                        </div>
                        {isSelected && <Check size={14} style={{ color: '#fbbf24' }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Venue Inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#a1a1aa', marginBottom: 5 }}>
                    Venue Name
                  </label>
                  <input
                    type="text"
                    value={state.venueName || ''}
                    onChange={(e) => onChange({ venueName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      background: '#141418',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#a1a1aa', marginBottom: 5 }}>
                      Date
                    </label>
                    <input
                      type="date"
                      value={state.date || '2027-02-18'}
                      onChange={(e) => onChange({ date: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 8,
                        background: '#141418',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#ffffff',
                        fontSize: 12,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#a1a1aa', marginBottom: 5 }}>
                      Start Time
                    </label>
                    <input
                      type="text"
                      value={state.time || '06:00 PM IST'}
                      onChange={(e) => onChange({ time: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 8,
                        background: '#141418',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#ffffff',
                        fontSize: 12,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ────────────────── GUESTS & VIP SECURITY ────────────────── */}
          {sheetType === 'guests' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* VIP 4-Digit Passcode Gate */}
              <div style={{ padding: 16, borderRadius: 12, background: '#141418', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#ffffff' }}>VIP 4-Digit Passcode Lock</span>
                    <span style={{ fontSize: 10, color: '#71717a' }}>Restrict invitation access to verified invitees</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={state.hasPasscodeProtection}
                    onChange={(e) => onChange({ hasPasscodeProtection: e.target.checked })}
                    style={{ width: 18, height: 18, accentColor: '#fbbf24', cursor: 'pointer' }}
                  />
                </div>

                {state.hasPasscodeProtection && (
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#a1a1aa', marginBottom: 6 }}>
                      Set 4-Digit Passcode
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={state.passcode || '2027'}
                      onChange={(e) => onChange({ passcode: e.target.value })}
                      style={{
                        width: 120,
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: '#1f1f26',
                        border: '1px solid rgba(251, 191, 36, 0.3)',
                        color: '#fbbf24',
                        fontSize: 18,
                        fontWeight: 700,
                        letterSpacing: '0.25em',
                        textAlign: 'center',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* 0% Fee UPI Digital Shagun */}
              <div style={{ padding: 16, borderRadius: 12, background: '#141418', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>
                  0% Fee UPI Digital Shagun
                </span>
                <span style={{ display: 'block', fontSize: 10, color: '#71717a', marginBottom: 12 }}>
                  Direct host settlement with 0% platform fee
                </span>

                <input
                  type="text"
                  value={state.upiId || ''}
                  onChange={(e) => onChange({ upiId: e.target.value })}
                  placeholder="e.g. host@okhdfcbank"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    background: '#1e1e24',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    marginBottom: 10,
                  }}
                />

                <div style={{ display: 'flex', gap: 6 }}>
                  {[1001, 2100, 5100, 11000].map((amt) => (
                    <span
                      key={amt}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: 'rgba(251, 191, 36, 0.1)',
                        color: '#fbbf24',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      ₹{amt.toLocaleString('en-IN')}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
