'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  CelebrationState,
  THEME_PRESETS,
  OCCASION_PRESETS,
  OccasionType,
  ItineraryItem,
  EventLocationItem,
} from './StudioData';
import { JourneyStepId } from './CreativeJourneyRail';
import {
  Sparkles,
  Palette,
  Users,
  User,
  Crown,
  Calendar,
  Feather,
  MapPin,
  HeartHandshake,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  Trash2,
  RotateCcw,
  ArrowRight,
  Shield,
  Gift,
  ExternalLink,
  Plane,
  Train,
  Car,
  Navigation,
  Compass,
  Link2,
} from 'lucide-react';
import { StudioImageUploader } from './StudioImageUploader';

interface StudioEditorSidebarProps {
  activeStep: JourneyStepId;
  onSelectStep: (stepId: JourneyStepId) => void;
  state: CelebrationState;
  onChange: (patch: Partial<CelebrationState>) => void;
  saveStatus?: 'saved' | 'saving';
}

export function StudioEditorSidebar({
  activeStep,
  onSelectStep,
  state,
  onChange,
  saveStatus = 'saved',
}: StudioEditorSidebarProps) {
  // Progressive disclosure accordion states
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [expandedCeremonyId, setExpandedCeremonyId] = useState<string | null>(null);
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);

  // Date & Time picker popover states
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date(2027, 1, 1)); // Feb 2027

  // Close pickers on outside click
  const datePickerRef = useRef<HTMLDivElement | null>(null);
  const timePickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setIsDatePickerOpen(false);
      }
      if (timePickerRef.current && !timePickerRef.current.contains(e.target as Node)) {
        setIsTimePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const currentTheme = THEME_PRESETS[state.theme] || THEME_PRESETS['royal-regalia'];

  // Step ordering for the "Continue" button in the footer
  const stepSequence: JourneyStepId[] = [
    'beginning',
    'style',
    'people',
    'moments',
    'story',
    'experience',
    'guests',
  ];
  const currentStepIndex = stepSequence.indexOf(activeStep);
  const nextStep = currentStepIndex < stepSequence.length - 1 ? stepSequence[currentStepIndex + 1] : null;

  // Human, purpose-built header metadata per step
  const stepMeta: Record<
    JourneyStepId,
    { title: string; subtitle: string; icon: React.ElementType }
  > = {
    beginning: {
      title: 'Celebration type',
      subtitle: 'Choose your occasion & concept',
      icon: Sparkles,
    },
    style: {
      title: 'Your style',
      subtitle: 'Set the visual mood',
      icon: Palette,
    },
    people: {
      title: 'People',
      subtitle: 'Set up who is being honored',
      icon: Users,
    },
    moments: {
      title: 'Moments',
      subtitle: 'Plan your ceremony schedule',
      icon: Calendar,
    },
    story: {
      title: 'Your story',
      subtitle: 'Tell guests what makes this special',
      icon: Feather,
    },
    experience: {
      title: 'Event details & locations',
      subtitle: 'Primary venue, wayfinding & celebration spots',
      icon: MapPin,
    },
    guests: {
      title: 'Guest experience',
      subtitle: 'How guests will respond',
      icon: HeartHandshake,
    },
  };

  const currentMeta = stepMeta[activeStep];
  const StepIcon = currentMeta.icon;

  // Curated venue suggestions
  const suggestedVenues = [
    {
      name: 'Umaid Bhawan Palace',
      city: 'Jodhpur, Rajasthan',
      image: 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=400&q=80',
      address: 'Circuit House Rd, Cantt Area, Jodhpur 342006',
    },
    {
      name: 'The Taj Lake Palace',
      city: 'Udaipur, Rajasthan',
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80',
      address: 'Pichola, Udaipur, Rajasthan 313001',
    },
    {
      name: 'The St. Regis Mumbai',
      city: 'Mumbai, Maharashtra',
      image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&q=80',
      address: '462 Senapati Bapat Marg, Lower Parel, Mumbai 400013',
    },
    {
      name: 'Villa d’Este',
      city: 'Lake Como, Italy',
      image: 'https://images.unsplash.com/photo-1542314831-c6a4d2752174?w=400&q=80',
      address: 'Via Regina, 40, 22012 Cernobbio CO, Italy',
    },
  ];

  // Curated color palettes
  const curatedPalettes = [
    { name: 'Celestial Gold', hex: '#E5C07B' },
    { name: 'Royal Gold', hex: '#eab308' },
    { name: 'Champagne', hex: '#d97706' },
    { name: 'Rose Blush', hex: '#f43f5e' },
    { name: 'Obsidian Noir', hex: '#18181b' },
    { name: 'Emerald Royale', hex: '#065f46' },
    { name: 'Celestial Blue', hex: '#1e40af' },
  ];

  // Itinerary helper handlers
  const handleAddCeremony = () => {
    const newCeremony: ItineraryItem = {
      id: `ceremony-${Date.now()}`,
      title: 'Evening Soirée',
      time: '07:00 PM',
      venue: state.venueName || 'Palace Courtyard',
      desc: 'An enchanting gathering of loved ones under starlight.',
      dressCode: 'Black Tie / Royal Formal',
    };
    onChange({ itinerary: [...(state.itinerary || []), newCeremony] });
    setExpandedCeremonyId(newCeremony.id);
  };

  const handleRemoveCeremony = (id: string) => {
    onChange({ itinerary: (state.itinerary || []).filter((c) => c.id !== id) });
    if (expandedCeremonyId === id) setExpandedCeremonyId(null);
  };

  // Location helper handlers
  const handleAddLocation = () => {
    const newLocation: EventLocationItem = {
      id: `loc-${Date.now()}`,
      name: '',
      address: '',
      note: '',
    };
    onChange({ additionalLocations: [...(state.additionalLocations || []), newLocation] });
  };

  const handleUpdateLocation = (id: string, patch: Partial<EventLocationItem>) => {
    const list = (state.additionalLocations || []).map((loc) =>
      loc.id === id ? { ...loc, ...patch } : loc
    );
    onChange({ additionalLocations: list });
  };

  const handleRemoveLocation = (id: string) => {
    onChange({
      additionalLocations: (state.additionalLocations || []).filter((loc) => loc.id !== id),
    });
    if (expandedLocationId === id) setExpandedLocationId(null);
  };

  // Calendar generation helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <aside
      style={{
        width: 360,
        minWidth: 360,
        maxWidth: 360,
        height: '100%',
        background: '#0d0d12',
        borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        zIndex: 20,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* ─── STICKY EDITOR HEADER ─── */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          background: 'rgba(13, 13, 18, 0.98)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(251, 191, 36, 0.1)',
              color: '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <StepIcon size={16} />
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '-0.01em',
              }}
            >
              {currentMeta.title}
            </h3>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: 11,
                color: '#71717a',
                lineHeight: 1.3,
              }}
            >
              {currentMeta.subtitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            const occ = OCCASION_PRESETS[state.occasion];
            if (occ) {
              onChange({
                title: `${occ.defaultProtagonist1} & ${occ.defaultProtagonist2 || 'Loved Ones'} ${occ.name}`,
                tagline: occ.defaultTagline,
                storyQuote: occ.defaultQuote,
                storyBody: occ.defaultStory,
              });
            }
          }}
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
            transition: 'all 0.15s',
          }}
          title="Reset section defaults"
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#71717a';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <RotateCcw size={12} />
        </button>
      </div>

      {/* ─── SCROLLABLE EDITOR CONTENT ─── */}
      <div
        className="studio-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* ═════════════════════════════════════════════════════════
            STEP 01: EVENT DETAILS (OCCASION SELECTION)
        ═════════════════════════════════════════════════════════ */}
        {activeStep === 'beginning' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <span className="studio-label" style={{ marginBottom: 10 }}>
                Celebration Type
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(OCCASION_PRESETS).map(([key, occ]) => {
                  const isSelected = state.occasion === key;
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
                        position: 'relative',
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: isSelected ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                        border: isSelected
                          ? '1px solid rgba(255, 255, 255, 0.15)'
                          : '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Quiet gold left accent bar on selected */}
                      {isSelected && (
                        <span
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 10,
                            bottom: 10,
                            width: 3,
                            background: '#fbbf24',
                            borderRadius: '0 2px 2px 0',
                          }}
                        />
                      )}
                      <span style={{ fontSize: 20 }}>{occ.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 600, color: '#ffffff' }}>
                            {occ.name}
                          </span>
                          {isSelected && <Check size={13} style={{ color: '#fbbf24' }} />}
                        </div>
                        <span
                          style={{
                            display: 'block',
                            fontSize: 11,
                            color: '#71717a',
                            marginTop: 2,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {occ.headline}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            STEP 02: YOUR STYLE (UNIVERSE & PALETTE)
        ═════════════════════════════════════════════════════════ */}
        {activeStep === 'style' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Current Universe Hero Card */}
            <div>
              <span className="studio-label" style={{ marginBottom: 8 }}>
                Your Style
              </span>
              <div
                style={{
                  borderRadius: 10,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ height: 110, position: 'relative' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentTheme.previewImage}
                    alt={currentTheme.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(13, 13, 18, 0.95) 0%, transparent 70%)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      left: 12,
                      right: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                      {currentTheme.name}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#fbbf24',
                        background: 'rgba(0,0,0,0.6)',
                        padding: '2px 8px',
                        borderRadius: 9999,
                        border: '1px solid rgba(251, 191, 36, 0.25)',
                      }}
                    >
                      {currentTheme.badge}
                    </span>
                  </div>
                </div>
                <div style={{ padding: '10px 14px' }}>
                  <p style={{ margin: 0, fontSize: 11, color: '#a1a1aa', lineHeight: 1.45 }}>
                    {currentTheme.universeDescription}
                  </p>
                </div>
              </div>
            </div>

            {/* Curated Color Swatches */}
            <div>
              <span className="studio-label" style={{ marginBottom: 8 }}>
                Color Accent
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {curatedPalettes.map((swatch) => {
                  const isSelected =
                    (state.primaryColorOverride || currentTheme.accentColor).toLowerCase() ===
                    swatch.hex.toLowerCase();
                  return (
                    <button
                      key={swatch.hex}
                      type="button"
                      onClick={() => onChange({ primaryColorOverride: swatch.hex })}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        border: isSelected
                          ? '1px solid rgba(255, 255, 255, 0.2)'
                          : '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          background: swatch.hex,
                          flexShrink: 0,
                          boxShadow: isSelected ? `0 0 0 2px rgba(255, 255, 255, 0.2), 0 0 6px ${swatch.hex}` : 'none',
                        }}
                      />
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? '#ffffff' : '#a1a1aa',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {swatch.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Typography Pairing */}
            <div>
              <span className="studio-label" style={{ marginBottom: 8 }}>
                Display Font
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { id: 'Cinzel', label: 'Cinzel (Royal)' },
                  { id: 'Playfair Display', label: 'Playfair (Serif)' },
                  { id: 'Cormorant Garamond', label: 'Garamond (Luxury)' },
                  { id: 'Prata', label: 'Prata (Imperial)' },
                ].map((font) => {
                  const isSelected = (state.fontDisplayOverride || currentTheme.fontDisplay) === font.id;
                  return (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => onChange({ fontDisplayOverride: font.id })}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: isSelected ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                        border: isSelected ? '1px solid rgba(251, 191, 36, 0.35)' : '1px solid rgba(255, 255, 255, 0.06)',
                        color: isSelected ? '#fbbf24' : '#d4d4d8',
                        fontSize: 11,
                        fontWeight: isSelected ? 600 : 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {font.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Explore Other Themes */}
            <div>
              <span className="studio-label" style={{ marginBottom: 8 }}>
                Other Styles
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(THEME_PRESETS)
                  .filter(([k]) => k !== state.theme)
                  .map(([key, theme]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onChange({ theme: key as any })}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.16)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                      }}
                    >
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#ffffff' }}>
                          {theme.name}
                        </span>
                        <span style={{ display: 'block', fontSize: 10, color: '#71717a', marginTop: 1 }}>
                          {theme.tagline}
                        </span>
                      </div>
                      <ArrowRight size={13} style={{ color: '#71717a' }} />
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            STEP 03: PEOPLE (HONORED HOSTS & CREST)
        ═════════════════════════════════════════════════════════ */}
        {activeStep === 'people' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Format Switcher: Clean Segmented Control */}
            <div>
              <span className="studio-label" style={{ marginBottom: 8 }}>
                Celebration Format
              </span>
              <div className="studio-segmented-container">
                <button
                  type="button"
                  onClick={() => onChange({ isSingleCelebrant: false })}
                  className={`studio-segmented-btn ${!state.isSingleCelebrant ? 'active' : ''}`}
                >
                  <Users size={13} />
                  <span>Couple / Duo</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ isSingleCelebrant: true })}
                  className={`studio-segmented-btn ${state.isSingleCelebrant ? 'active' : ''}`}
                >
                  <User size={13} />
                  <span>Single Host</span>
                </button>
              </div>
              <span className="studio-helper" style={{ display: 'block', marginTop: 4 }}>
                {state.isSingleCelebrant
                  ? 'Single celebrant mode: birthdays, jubilees & solo honors'
                  : 'Couple mode: weddings, engagements & anniversaries'}
              </span>
            </div>

            {/* Celebrant 1 */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                paddingBottom: 16,
                borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
              }}
            >
              <span className="studio-section-title">
                {state.isSingleCelebrant ? 'Primary Host / Celebrant' : 'Celebrant 1 (Groom / Host)'}
              </span>

              {/* Photo Uploader */}
              <StudioImageUploader
                label={state.isSingleCelebrant ? 'Host Photo' : 'Celebrant 1 Portrait'}
                value={state.protagonist1Image}
                onChange={(url) => onChange({ protagonist1Image: url })}
                shape="circle"
                helperText="Square or portrait photo"
              />

              {/* Name & Role */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <span className="studio-label" style={{ marginBottom: 4 }}>Full Name</span>
                  <input
                    type="text"
                    className="studio-input"
                    value={state.protagonist1 || ''}
                    onChange={(e) => onChange({ protagonist1: e.target.value })}
                    placeholder="e.g. Aarav Sharma"
                  />
                </div>
                <div>
                  <span className="studio-label" style={{ marginBottom: 4 }}>Role</span>
                  <input
                    type="text"
                    className="studio-input"
                    value={state.protagonist1Role || ''}
                    onChange={(e) => onChange({ protagonist1Role: e.target.value })}
                    placeholder="e.g. The Groom, Birthday Honoree, Host"
                  />
                </div>
              </div>

              {/* Personal Note */}
              <div>
                <span className="studio-label" style={{ marginBottom: 4 }}>Personal Note or Bio</span>
                <textarea
                  rows={2}
                  className="studio-textarea"
                  value={state.protagonist1Bio || ''}
                  onChange={(e) => onChange({ protagonist1Bio: e.target.value })}
                  placeholder="A short reflection, quote or note..."
                />
              </div>

              {/* Partner 1 Vow / Promise */}
              <div>
                <span className="studio-label" style={{ marginBottom: 4 }}>
                  {state.isSingleCelebrant ? 'Personal Declaration / Promise' : 'Partner 1 Vow / Sacred Promise'}
                </span>
                <textarea
                  rows={2}
                  className="studio-textarea"
                  value={state.protagonist1Vow || ''}
                  onChange={(e) => onChange({ protagonist1Vow: e.target.value })}
                  placeholder="e.g. “In you, I discovered the steadfast constellation that guides every horizon I will ever seek.”"
                  style={{ fontStyle: 'italic' }}
                />
              </div>
            </div>

            {/* Celebrant 2 (Partner / Co-host) */}
            {!state.isSingleCelebrant && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  paddingBottom: 16,
                  borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
                }}
              >
                <span className="studio-section-title">
                  Celebrant 2 (Bride / Partner)
                </span>

                {/* Photo Uploader */}
                <StudioImageUploader
                  label="Celebrant 2 Portrait"
                  value={state.protagonist2Image}
                  onChange={(url) => onChange({ protagonist2Image: url })}
                  shape="circle"
                  helperText="Square or portrait photo"
                />

                {/* Name & Role */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <span className="studio-label" style={{ marginBottom: 4 }}>Partner Full Name</span>
                    <input
                      type="text"
                      className="studio-input"
                      value={state.protagonist2 || ''}
                      onChange={(e) => onChange({ protagonist2: e.target.value })}
                      placeholder="e.g. Meera Singhania"
                    />
                  </div>
                  <div>
                    <span className="studio-label" style={{ marginBottom: 4 }}>Role</span>
                    <input
                      type="text"
                      className="studio-input"
                      value={state.protagonist2Role || ''}
                      onChange={(e) => onChange({ protagonist2Role: e.target.value })}
                      placeholder="e.g. The Bride, Partner, Co-Host"
                    />
                  </div>
                </div>

                {/* Personal Note */}
                <div>
                  <span className="studio-label" style={{ marginBottom: 4 }}>Partner Note or Bio</span>
                  <textarea
                    rows={2}
                    className="studio-textarea"
                    value={state.protagonist2Bio || ''}
                    onChange={(e) => onChange({ protagonist2Bio: e.target.value })}
                    placeholder="A short reflection, quote or note..."
                  />
                </div>

                {/* Partner 2 Vow / Promise */}
                <div>
                  <span className="studio-label" style={{ marginBottom: 4 }}>Partner 2 Vow / Sacred Promise</span>
                  <textarea
                    rows={2}
                    className="studio-textarea"
                    value={state.protagonist2Vow || ''}
                    onChange={(e) => onChange({ protagonist2Vow: e.target.value })}
                    placeholder="e.g. “Beside you, silence feels like music and the future feels like returning home.”"
                    style={{ fontStyle: 'italic' }}
                  />
                </div>
              </div>
            )}

            {/* Monogram & Crest */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="studio-section-title">
                  Monogram & Crest
                </span>
                <span className="studio-helper">Wax seal & crest</span>
              </div>

              {/* Upload Custom Crest Insignia */}
              <StudioImageUploader
                label="Royal Crest Insignia"
                value={state.monogramImage}
                onChange={(url) => onChange({ monogramImage: url })}
                shape="rounded"
                helperText="PNG, SVG or WEBP (transparent recommended)"
              />

              {/* Monogram Initials */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="studio-label">Monogram Initials</span>
                  <button
                    type="button"
                    onClick={() => {
                      const p1 = state.protagonist1?.trim() || '';
                      const p2 = state.protagonist2?.trim() || '';
                      if (state.isSingleCelebrant || !p2) {
                        onChange({ monogramInitials: p1 ? p1.charAt(0).toUpperCase() : 'A' });
                      } else {
                        onChange({ monogramInitials: `${p1 ? p1.charAt(0).toUpperCase() : 'A'} & ${p2 ? p2.charAt(0).toUpperCase() : 'M'}` });
                      }
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#fbbf24',
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Auto-Generate
                  </button>
                </div>
                <input
                  type="text"
                  className="studio-input"
                  value={state.monogramInitials || (state.isSingleCelebrant ? 'A' : 'A & M')}
                  onChange={(e) => onChange({ monogramInitials: e.target.value })}
                  placeholder={state.isSingleCelebrant ? 'e.g. A' : 'e.g. A & M'}
                  style={{
                    color: '#fbbf24',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                  }}
                />
              </div>

              {/* Crest Style Selector */}
              <div>
                <span className="studio-label" style={{ marginBottom: 6 }}>
                  Crest Style
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {[
                    { id: 'arch', label: 'Archway', icon: '🏛️' },
                    { id: 'wax', label: 'Wax Seal', icon: '🏵️' },
                    { id: 'heraldic', label: 'Heraldic', icon: '🛡️' },
                    { id: 'ring', label: 'Rings', icon: '💍' },
                  ].map((styleOpt) => {
                    const isSelected = (state.monogramStyle || 'arch') === styleOpt.id;
                    return (
                      <button
                        key={styleOpt.id}
                        type="button"
                        onClick={() => onChange({ monogramStyle: styleOpt.id as any })}
                        style={{
                          padding: '8px 4px',
                          borderRadius: 8,
                          background: isSelected ? 'rgba(251, 191, 36, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                          border: isSelected ? '1px solid rgba(251, 191, 36, 0.35)' : '1px solid rgba(255, 255, 255, 0.06)',
                          color: isSelected ? '#fbbf24' : '#a1a1aa',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span style={{ fontSize: 16 }}>{styleOpt.icon}</span>
                        <span style={{ fontSize: 10, fontWeight: isSelected ? 700 : 500 }}>{styleOpt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            STEP 04: MOMENTS (CEREMONY SCHEDULE)
        ═════════════════════════════════════════════════════════ */}
        {activeStep === 'moments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="studio-label">
                Ceremony Timeline
              </span>
              <button
                type="button"
                onClick={handleAddCeremony}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: 'rgba(251, 191, 36, 0.12)',
                  border: '1px solid rgba(251, 191, 36, 0.25)',
                  color: '#fbbf24',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Plus size={12} />
                <span>Add moment</span>
              </button>
            </div>

            {/* Compact Ceremony Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(state.itinerary || []).map((ceremony) => {
                const isExpanded = expandedCeremonyId === ceremony.id;
                return (
                  <div
                    key={ceremony.id}
                    style={{
                      borderRadius: 9,
                      background: isExpanded ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.02)',
                      border: isExpanded
                        ? '1px solid rgba(255, 255, 255, 0.14)'
                        : '1px solid rgba(255, 255, 255, 0.06)',
                      overflow: 'hidden',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Compact Row Header */}
                    <div
                      onClick={() => setExpandedCeremonyId(isExpanded ? null : ceremony.id)}
                      style={{
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Clock size={13} style={{ color: '#fbbf24', flexShrink: 0 }} />
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#ffffff' }}>
                            {ceremony.title}
                          </span>
                          <span style={{ display: 'block', fontSize: 10, color: '#71717a' }}>
                            {ceremony.time} · {ceremony.venue || 'Palace'}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isExpanded ? (
                          <ChevronUp size={14} style={{ color: '#a1a1aa' }} />
                        ) : (
                          <ChevronDown size={14} style={{ color: '#71717a' }} />
                        )}
                      </div>
                    </div>

                    {/* Expanded Edit Form */}
                    {isExpanded && (
                      <div
                        style={{
                          padding: '12px 14px 14px',
                          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                          background: 'rgba(0, 0, 0, 0.25)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        <div>
                          <span className="studio-label" style={{ marginBottom: 4 }}>Moment Title</span>
                          <input
                            type="text"
                            className="studio-input"
                            value={ceremony.title}
                            onChange={(e) => {
                              const updated = (state.itinerary || []).map((c) =>
                                c.id === ceremony.id ? { ...c, title: e.target.value } : c
                              );
                              onChange({ itinerary: updated });
                            }}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div>
                            <span className="studio-label" style={{ marginBottom: 4 }}>Time</span>
                            <input
                              type="text"
                              className="studio-input"
                              value={ceremony.time}
                              onChange={(e) => {
                                const updated = (state.itinerary || []).map((c) =>
                                  c.id === ceremony.id ? { ...c, time: e.target.value } : c
                                );
                                onChange({ itinerary: updated });
                              }}
                            />
                          </div>

                          <div>
                            <span className="studio-label" style={{ marginBottom: 4 }}>Location</span>
                            <input
                              type="text"
                              className="studio-input"
                              value={ceremony.venue || ''}
                              onChange={(e) => {
                                const updated = (state.itinerary || []).map((c) =>
                                  c.id === ceremony.id ? { ...c, venue: e.target.value } : c
                                );
                                onChange({ itinerary: updated });
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <span className="studio-label" style={{ marginBottom: 4 }}>Dress Code / Attire</span>
                          <input
                            type="text"
                            className="studio-input"
                            value={ceremony.dressCode}
                            onChange={(e) => {
                              const updated = (state.itinerary || []).map((c) =>
                                c.id === ceremony.id ? { ...c, dressCode: e.target.value } : c
                              );
                              onChange({ itinerary: updated });
                            }}
                            placeholder="e.g. Royal Formal / Pastel Festive"
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveCeremony(ceremony.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              fontSize: 11,
                              cursor: 'pointer',
                              padding: '4px 6px',
                            }}
                          >
                            <Trash2 size={12} />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            STEP 05: YOUR STORY (NARRATIVE & WORDS)
        ═════════════════════════════════════════════════════════ */}
        {activeStep === 'story' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <span className="studio-label" style={{ marginBottom: 6 }}>
                Opening Words
              </span>
              <textarea
                rows={2}
                className="studio-textarea"
                value={state.storyQuote || ''}
                onChange={(e) => onChange({ storyQuote: e.target.value })}
                placeholder="Inspirational words or sacred verse"
                style={{
                  fontFamily: 'serif',
                  fontStyle: 'italic',
                }}
              />
            </div>

            <div>
              <span className="studio-label" style={{ marginBottom: 6 }}>
                Sacred Covenant / Union Declaration
              </span>
              <textarea
                rows={2}
                className="studio-textarea"
                value={state.unionDeclaration || ''}
                onChange={(e) => onChange({ unionDeclaration: e.target.value })}
                placeholder="Two independent trajectories drawn across infinite space by gravitational destiny — merging into one eternal, harmonic constellation."
                style={{
                  fontFamily: 'serif',
                }}
              />
              <span className="studio-helper" style={{ display: 'block', marginTop: 4 }}>
                Featured in Celestial Odyssey souls convergence and story crests.
              </span>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span className="studio-label">
                  Your Story
                </span>
                <span className="studio-helper">
                  {(state.storyBody || '').length} characters
                </span>
              </div>
              <textarea
                rows={6}
                className="studio-textarea"
                value={state.storyBody || ''}
                onChange={(e) => onChange({ storyBody: e.target.value })}
                placeholder="Tell your guests the journey of how this celebration came to be..."
              />
            </div>

            {/* Inspiration Prompt Chips */}
            <div>
              <span className="studio-helper" style={{ display: 'block', marginBottom: 6 }}>
                💡 Need inspiration?
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[
                  { label: '💫 How We Met', text: 'Our paths first crossed in the quiet avenues of university...' },
                  { label: '💍 The Proposal', text: 'Beneath the twilight constellations of Udaipur...' },
                  { label: '🕊️ Our Journey', text: 'Seven seasons of shared laughter, travel, and devotion...' },
                ].map((prompt) => (
                  <button
                    key={prompt.label}
                    type="button"
                    onClick={() => {
                      const current = state.storyBody ? `${state.storyBody}\n\n` : '';
                      onChange({ storyBody: `${current}${prompt.text}` });
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 9999,
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#d4d4d8',
                      fontSize: 10,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      e.currentTarget.style.color = '#d4d4d8';
                    }}
                  >
                    {prompt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Constellation Milestones */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="studio-section-title">Constellation Milestones</span>
                <span className="studio-helper">4 star chapters</span>
              </div>
              <p style={{ fontSize: 11, color: '#71717a', margin: '0 0 6px 0', lineHeight: 1.4 }}>
                Customize the journey chapters displayed across the interactive constellation and timeline.
              </p>

              {[0, 1, 2, 3].map((idx) => {
                const defaultChapters = [
                  { label: 'FIRST MET', title: 'When Paths Aligned', year: '01', desc: 'A serendipitous encounter that quietly altered our destiny.' },
                  { label: 'JOURNEY', title: 'Building Our Shared World', year: '02', desc: 'Countless late-night conversations and shared travels.' },
                  { label: 'PROPOSAL', title: 'A Question & Whispered Yes', year: '03', desc: 'With quiet reverence beneath an open canopy of stars.' },
                  { label: 'THE BIG DAY', title: 'The Eternal Convergence', year: state.date ? new Date(state.date).getFullYear().toString() : '2027', desc: 'Surrounded by our beloved families, stepping across the threshold.' },
                ];
                const def = defaultChapters[idx]!;
                const currentMilestones = state.milestones || [];
                const current = currentMilestones[idx] || {};

                return (
                  <div
                    key={idx}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.07)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', letterSpacing: '0.04em' }}>
                        CHAPTER 0{idx + 1} • {current.label || def.label}
                      </span>
                      <span style={{ fontSize: 10, color: '#71717a', fontFamily: 'monospace' }}>
                        {current.year || def.year}
                      </span>
                    </div>

                    <div>
                      <span className="studio-label" style={{ marginBottom: 4 }}>Chapter Title</span>
                      <input
                        type="text"
                        className="studio-input"
                        value={current.title ?? def.title}
                        onChange={(e) => {
                          const updated = [...(state.milestones || defaultChapters.map((d, i) => ({
                            id: i + 1,
                            year: d.year,
                            label: d.label,
                            chapter: `CHAPTER 0${i + 1}`,
                            location: 'Our Sacred Space',
                            coords: `0${i + 1} • ALIGNMENT`,
                            title: d.title,
                            description: d.desc,
                            image: '',
                          })))];
                          updated[idx] = { ...updated[idx], title: e.target.value };
                          onChange({ milestones: updated });
                        }}
                      />
                    </div>

                    <div>
                      <span className="studio-label" style={{ marginBottom: 4 }}>Description</span>
                      <textarea
                        rows={2}
                        className="studio-textarea"
                        value={current.description ?? def.desc}
                        onChange={(e) => {
                          const updated = [...(state.milestones || defaultChapters.map((d, i) => ({
                            id: i + 1,
                            year: d.year,
                            label: d.label,
                            chapter: `CHAPTER 0${i + 1}`,
                            location: 'Our Sacred Space',
                            coords: `0${i + 1} • ALIGNMENT`,
                            title: d.title,
                            description: d.desc,
                            image: '',
                          })))];
                          updated[idx] = { ...updated[idx], description: e.target.value };
                          onChange({ milestones: updated });
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            STEP 06: VENUE & DATE (WHEN AND WHERE)
        ═════════════════════════════════════════════════════════ */}
        {activeStep === 'experience' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Unified When: Date & Time */}
            <div>
              <span className="studio-label" style={{ marginBottom: 8 }}>
                Date & Time
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 }}>
                {/* Date Trigger */}
                <div style={{ position: 'relative' }} ref={datePickerRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDatePickerOpen(!isDatePickerOpen);
                      setIsTimePickerOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: '#131318',
                      border: isDatePickerOpen
                        ? '1px solid rgba(251, 191, 36, 0.5)'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{state.date || '18 Feb 2027'}</span>
                    <Calendar size={13} style={{ color: '#fbbf24' }} />
                  </button>

                  {/* Date Picker Popover */}
                  {isDatePickerOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: 6,
                        width: 260,
                        padding: 14,
                        borderRadius: 12,
                        background: '#14141a',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        boxShadow: '0 15px 40px rgba(0, 0, 0, 0.8)',
                        zIndex: 40,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#ffffff' }}>
                          {calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            type="button"
                            onClick={handlePrevMonth}
                            style={{ background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: 2 }}
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={handleNextMonth}
                            style={{ background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: 2 }}
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Day Headers */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center', marginBottom: 6 }}>
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                          <span key={d} style={{ fontSize: 9, color: '#71717a', fontWeight: 600 }}>{d}</span>
                        ))}
                      </div>

                      {/* Day Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
                        {Array.from({ length: getFirstDayOfMonth(calendarMonth.getFullYear(), calendarMonth.getMonth()) }).map((_, i) => (
                          <span key={`empty-${i}`} />
                        ))}
                        {Array.from({ length: getDaysInMonth(calendarMonth.getFullYear(), calendarMonth.getMonth()) }).map((_, i) => {
                          const dayNum = i + 1;
                          const monthStr = String(calendarMonth.getMonth() + 1).padStart(2, '0');
                          const dayStr = String(dayNum).padStart(2, '0');
                          const dateVal = `${calendarMonth.getFullYear()}-${monthStr}-${dayStr}`;
                          const isSelected = state.date === dateVal;

                          return (
                            <button
                              key={dayNum}
                              type="button"
                              onClick={() => {
                                onChange({ date: dateVal });
                                setIsDatePickerOpen(false);
                              }}
                              style={{
                                padding: '5px 0',
                                borderRadius: 6,
                                background: isSelected ? '#fbbf24' : 'transparent',
                                color: isSelected ? '#000000' : '#ffffff',
                                border: 'none',
                                fontSize: 11,
                                fontWeight: isSelected ? 700 : 500,
                                cursor: 'pointer',
                              }}
                            >
                              {dayNum}
                            </button>
                          );
                        })}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <button
                          type="button"
                          onClick={() => {
                            onChange({ date: '2027-02-18' });
                            setIsDatePickerOpen(false);
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#fbbf24', fontSize: 11, cursor: 'pointer' }}
                        >
                          Default (18 Feb)
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsDatePickerOpen(false)}
                          style={{ background: 'transparent', border: 'none', color: '#a1a1aa', fontSize: 11, cursor: 'pointer' }}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Time Trigger */}
                <div style={{ position: 'relative' }} ref={timePickerRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTimePickerOpen(!isTimePickerOpen);
                      setIsDatePickerOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: '#131318',
                      border: isTimePickerOpen
                        ? '1px solid rgba(251, 191, 36, 0.5)'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{state.time || '06:00 PM'}</span>
                    <Clock size={13} style={{ color: '#fbbf24' }} />
                  </button>

                  {/* Time Picker Popover */}
                  {isTimePickerOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: 6,
                        width: 200,
                        padding: 12,
                        borderRadius: 12,
                        background: '#14141a',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        boxShadow: '0 15px 40px rgba(0, 0, 0, 0.8)',
                        zIndex: 40,
                      }}
                    >
                      <span className="studio-label" style={{ marginBottom: 8 }}>
                        Quick Select
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {[
                          { label: 'Morning (09:00 AM)', val: '09:00 AM IST' },
                          { label: 'Afternoon (02:00 PM)', val: '02:00 PM IST' },
                          { label: 'Sunset / Evening (06:00 PM)', val: '06:00 PM IST' },
                          { label: 'Night Soirée (08:30 PM)', val: '08:30 PM IST' },
                        ].map((t) => (
                          <button
                            key={t.val}
                            type="button"
                            onClick={() => {
                              onChange({ time: t.val });
                              setIsTimePickerOpen(false);
                            }}
                            style={{
                              padding: '7px 10px',
                              borderRadius: 6,
                              background: state.time === t.val ? 'rgba(251, 191, 36, 0.15)' : 'transparent',
                              color: state.time === t.val ? '#fbbf24' : '#d4d4d8',
                              border: 'none',
                              fontSize: 11,
                              textAlign: 'left',
                              cursor: 'pointer',
                            }}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Main Venue */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <span className="studio-label" style={{ marginBottom: 4 }}>Venue Name</span>
                <input
                  type="text"
                  className="studio-input"
                  value={state.venueName || ''}
                  onChange={(e) => onChange({ venueName: e.target.value })}
                  placeholder="e.g. Umaid Bhawan Palace"
                />
              </div>

              <div>
                <span className="studio-label" style={{ marginBottom: 4 }}>Address / Location</span>
                <input
                  type="text"
                  className="studio-input"
                  value={state.venueAddress || ''}
                  onChange={(e) => onChange({ venueAddress: e.target.value })}
                  placeholder="e.g. Circuit House Rd, Jodhpur, Rajasthan"
                />
                <span className="studio-helper" style={{ display: 'block', marginTop: 4 }}>
                  Guests will be able to get 1-click directions on Google Maps
                </span>
              </div>
            </div>

            {/* Additional Locations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="studio-label">Additional Locations</span>
                <button
                  type="button"
                  onClick={handleAddLocation}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: 'rgba(251, 191, 36, 0.12)',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    color: '#fbbf24',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Plus size={12} />
                  <span>Add Location</span>
                </button>
              </div>

              {/* Locations List */}
              {(!state.additionalLocations || state.additionalLocations.length === 0) ? (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: 10,
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px dashed rgba(255, 255, 255, 0.1)',
                    textAlign: 'center',
                  }}
                >
                  <span style={{ fontSize: 11, color: '#71717a' }}>
                    Having ceremonies or guest stay across different spots? Add them here.
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {state.additionalLocations.map((loc, idx) => (
                    <div
                      key={loc.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: '#131318',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24' }}>
                          Location 0{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveLocation(loc.id)}
                          title="Remove location"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#71717a',
                            cursor: 'pointer',
                            padding: 2,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#71717a')}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div>
                        <input
                          type="text"
                          className="studio-input"
                          value={loc.name}
                          onChange={(e) => handleUpdateLocation(loc.id, { name: e.target.value })}
                          placeholder="e.g. Baradari Lawns (Sangeet)"
                          style={{ fontWeight: 600 }}
                        />
                      </div>

                      <div>
                        <input
                          type="text"
                          className="studio-input"
                          value={loc.address}
                          onChange={(e) => handleUpdateLocation(loc.id, { address: e.target.value })}
                          placeholder="Address or landmark"
                        />
                      </div>

                      <div>
                        <input
                          type="text"
                          className="studio-input"
                          value={loc.note || ''}
                          onChange={(e) => handleUpdateLocation(loc.id, { note: e.target.value })}
                          placeholder="Note for guests (optional, e.g. Valet at Gate 2)"
                          style={{ fontSize: 11, color: '#a1a1aa' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Venue Cover Photo */}
            <div>
              <StudioImageUploader
                label="Venue Photo"
                value={state.coverImage}
                onChange={(url) => onChange({ coverImage: url })}
                shape="banner"
                helperText="Landscape photography · 16:9 recommended"
              />
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            STEP 07: GUEST EXPERIENCE (RSVP & GIFTS)
        ═════════════════════════════════════════════════════════ */}
        {activeStep === 'guests' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* VIP Passcode Gate */}
            <div className="studio-card-surface">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#ffffff' }}>
                    VIP 4-Digit Passcode Gate
                  </span>
                  <span className="studio-helper">
                    Require PIN lock before entering invitation
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ hasPasscodeProtection: !state.hasPasscodeProtection })}
                  className={`studio-toggle-switch ${state.hasPasscodeProtection ? 'active' : ''}`}
                  title="Toggle VIP Passcode"
                >
                  <span className="studio-toggle-knob" />
                </button>
              </div>

              {state.hasPasscodeProtection && (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <span className="studio-label" style={{ marginBottom: 4 }}>Passcode PIN</span>
                  <input
                    type="text"
                    maxLength={4}
                    value={state.passcode || '2027'}
                    onChange={(e) => onChange({ passcode: e.target.value })}
                    style={{
                      width: 90,
                      padding: '7px 10px',
                      borderRadius: 6,
                      background: '#131318',
                      border: '1px solid rgba(251, 191, 36, 0.4)',
                      color: '#fbbf24',
                      fontSize: 16,
                      fontWeight: 700,
                      letterSpacing: '0.2em',
                      textAlign: 'center',
                    }}
                  />
                </div>
              )}
            </div>

            {/* RSVP Response Management */}
            <div className="studio-card-surface">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#ffffff' }}>
                    RSVP Confirmation
                  </span>
                  <span className="studio-helper">
                    Collect guest attendances, party size & dietary preferences
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ enableRsvp: !state.enableRsvp })}
                  className={`studio-toggle-switch ${state.enableRsvp ? 'active' : ''}`}
                  title="Toggle RSVP"
                >
                  <span className="studio-toggle-knob" />
                </button>
              </div>
            </div>

            {/* Digital Gifting (UPI Digital Shagun) */}
            <div className="studio-card-surface">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div>
                  <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#ffffff' }}>
                    Digital Gifting
                  </span>
                  <span className="studio-helper">
                    0% platform fee UPI transfer directly to host
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ enableShagun: !state.enableShagun })}
                  className={`studio-toggle-switch ${state.enableShagun ? 'active' : ''}`}
                  title="Toggle Digital Gifting"
                >
                  <span className="studio-toggle-knob" />
                </button>
              </div>

              {state.enableShagun && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <span className="studio-label" style={{ marginBottom: 4 }}>Host UPI ID</span>
                  <input
                    type="text"
                    className="studio-input"
                    value={state.upiId || ''}
                    onChange={(e) => onChange({ upiId: e.target.value })}
                    placeholder="e.g. host@okhdfcbank"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── STICKY EDITOR FOOTER ─── */}
      <div
        style={{
          padding: '12px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.07)',
          background: 'rgba(13, 13, 18, 0.98)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#71717a' }}>
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: saveStatus === 'saving' ? '#fbbf24' : '#10b981',
            }}
          />
          <span>{saveStatus === 'saving' ? 'Saving...' : 'Saved'}</span>
        </div>

        {nextStep ? (
          <button
            type="button"
            onClick={() => onSelectStep(nextStep)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 16px',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
              border: 'none',
              color: '#000000',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(217, 119, 6, 0.25)',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
            }}
          >
            <span>Continue</span>
            <ArrowRight size={13} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSelectStep('beginning')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 16px',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span>Back to Start</span>
          </button>
        )}
      </div>
    </aside>
  );
}
