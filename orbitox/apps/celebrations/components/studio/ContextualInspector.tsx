'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  WorkflowArea,
  CelebrationState,
  OccasionType,
  ThemeType,
  OCCASION_PRESETS,
  THEME_PRESETS,
  ItineraryItem,
} from './StudioData';
import {
  Sparkles,
  Check,
  Plus,
  Trash2,
  Lock,
  Volume2,
  VolumeX,
  Calendar,
  Clock,
  MapPin,
  Gift,
  Users,
  Feather,
  LayoutGrid,
  HeartHandshake,
  CheckCircle2,
  Compass,
  ArrowRight,
  ShieldCheck,
  Music,
  Camera,
  Layers,
  Palette,
  Eye,
  Sliders,
  Maximize2,
  RotateCcw,
  ChevronDown,
  Wand2,
  SlidersHorizontal,
  Type,
  FileText,
  Copy,
  ExternalLink,
  ChevronUp,
} from 'lucide-react';

interface ContextualInspectorProps {
  activeArea: WorkflowArea;
  state: CelebrationState;
  onChange: (patch: Partial<CelebrationState>) => void;
  onSelectArea: (area: WorkflowArea) => void;
  onJumpToCanvas?: (area: WorkflowArea) => void;
}

export function ContextualInspector({
  activeArea,
  state,
  onChange,
  onSelectArea,
  onJumpToCanvas,
}: ContextualInspectorProps) {
  // Dual-mode tab: 'essentials' vs 'pro'
  const [activeTab, setActiveTab] = useState<'essentials' | 'pro'>('essentials');

  // Interactive context switcher dropdown open state
  const [isContextDropdownOpen, setIsContextDropdownOpen] = useState(false);

  // Audio preview playback state for Pro Style Customizer
  const [isAudioPreviewPlaying, setIsAudioPreviewPlaying] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Passcode test unlock input state
  const [testPin, setTestPin] = useState('');
  const [testUnlockResult, setTestUnlockResult] = useState<'idle' | 'success' | 'fail'>('idle');

  // Toggle for single celebrant vs couple mode
  const isCoupleMode = Boolean(
    state.protagonist2 ||
    state.occasion === 'wedding' ||
    state.occasion === 'anniversary' ||
    state.occasion === 'engagement'
  );

  // Context metadata configuration
  const CONTEXT_LIST: { id: WorkflowArea; label: string; icon: string; badge: string }[] = [
    { id: 'overview', label: 'Studio Overview', icon: '🧭', badge: 'Health & Readiness' },
    { id: 'occasion', label: 'Celebration Occasion', icon: '💍', badge: 'Mood & Concept' },
    { id: 'style', label: 'Aesthetic Universes', icon: '🎨', badge: 'Art Direction & Sound' },
    { id: 'people', label: 'Protagonists & Monogram', icon: '👥', badge: 'Celebrants & Crest' },
    { id: 'event', label: 'Venue & Schedule', icon: '🗓️', badge: 'Palace & Itinerary' },
    { id: 'story', label: 'Story & Proclamation', icon: '📜', badge: 'Writing Room' },
    { id: 'content', label: 'Content Modules', icon: '🧩', badge: 'Module Sequence' },
    { id: 'guests', label: 'RSVP & VIP Security', icon: '🛡️', badge: 'Passcode & Shagun' },
  ];

  const currentContextMeta = CONTEXT_LIST.find((c) => c.id === activeArea) || CONTEXT_LIST[0]!;

  // Occasion switch handler (also intelligently sets defaults)
  const handleSelectOccasion = (occId: OccasionType) => {
    const preset = OCCASION_PRESETS[occId];
    const coupleOccasions: OccasionType[] = ['wedding', 'anniversary', 'engagement'];
    const isCouple = coupleOccasions.includes(occId);

    onChange({
      occasion: occId,
      theme: preset.defaultTheme,
      protagonist1: preset.defaultProtagonist1,
      protagonist1Role: preset.defaultProtagonist1Role,
      protagonist2: isCouple ? preset.defaultProtagonist2 : '',
      protagonist2Role: isCouple ? preset.defaultProtagonist2Role : '',
      tagline: preset.defaultTagline,
      venueName: preset.defaultVenue,
      city: preset.defaultCity,
      storyQuote: preset.defaultQuote,
      storyBody: preset.defaultStory,
      itinerary: preset.itinerary,
    });
  };

  // Itinerary item handlers
  const handleAddItineraryEvent = (customPreset?: { title: string; time: string; dressCode: string; desc: string }) => {
    const newEvent: ItineraryItem = {
      id: Date.now().toString(),
      time: customPreset?.time || '07:00 PM',
      title: customPreset?.title || 'Celebration Banquet & Toast',
      desc: customPreset?.desc || 'An exquisite evening of toasts, acoustic sitar melodies, and fine dining.',
      dressCode: customPreset?.dressCode || 'Evening Festive & Chic',
      venue: state.venueName,
    };
    onChange({ itinerary: [...state.itinerary, newEvent] });
  };

  const handleUpdateItinerary = (index: number, patch: Partial<ItineraryItem>) => {
    const next = [...state.itinerary];
    next[index] = { ...next[index]!, ...patch };
    onChange({ itinerary: next });
  };

  const handleDeleteItinerary = (index: number) => {
    const next = state.itinerary.filter((_, i) => i !== index);
    onChange({ itinerary: next });
  };

  const handleMoveItinerary = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === state.itinerary.length - 1) return;
    const next = [...state.itinerary];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = next[index]!;
    next[index] = next[targetIndex]!;
    next[targetIndex] = temp;
    onChange({ itinerary: next });
  };

  // Story tone sculptor
  const applyStoryTone = (tone: 'royal' | 'modern' | 'warm' | 'concise') => {
    onChange({ toneOfVoice: tone });
    if (tone === 'royal') {
      onChange({
        storyQuote: 'Two noble souls united under auspicious royal stars, weaving a timeless legacy of devotion and grace.',
        storyBody: 'With the divine blessings of our revered elders and the celestial grace of the Almighty, we embark upon an imperial voyage. Our journey began amidst the timeless courtyards of Rajasthan, culminating in a celebration of two illustrious lineages.',
      });
    } else if (tone === 'modern') {
      onChange({
        storyQuote: 'From coffee shop sparks to globe-trotting milestones — building our favorite life together.',
        storyBody: 'A chance conversation across a crowded room turned into unforgettable late-night chats, shared passions, and an easy laughter that made forever feel like the easiest choice in the world.',
      });
    } else if (tone === 'warm') {
      onChange({
        storyQuote: 'Surrounded by the people who mean everything to us, we celebrate love, laughter, and new beginnings.',
        storyBody: 'Every memory we treasure has been enriched by your warmth and friendship. As we make our sacred vows, we are overjoyed to share this sacred milestone with our dearest family and friends.',
      });
    } else {
      onChange({
        storyQuote: 'Together in love, steadfast in joy, forever in unity.',
        storyBody: 'Two lives, two hearts, joined in friendship and united forever in love. We welcome you to celebrate this joyous union.',
      });
    }
  };

  // Landmark palatial venue autofill presets
  const applyVenuePreset = (venue: { name: string; city: string; address: string }) => {
    onChange({
      venueName: venue.name,
      city: venue.city,
      venueAddress: venue.address,
    });
  };

  // Curated luxury portrait presets
  const applyPortraitPreset = (person: 1 | 2, imageUrl: string) => {
    if (person === 1) {
      onChange({ protagonist1Image: imageUrl });
    } else {
      onChange({ protagonist2Image: imageUrl });
    }
  };

  // Audio preview toggle in Style Pro Customizer
  const toggleSoundscapePreview = () => {
    if (!audioPreviewRef.current) return;
    if (isAudioPreviewPlaying) {
      audioPreviewRef.current.pause();
      setIsAudioPreviewPlaying(false);
    } else {
      audioPreviewRef.current.play().catch(() => {});
      setIsAudioPreviewPlaying(true);
    }
  };

  // Calculate readiness percentage dynamically
  const calculateReadiness = () => {
    let score = 30;
    if (state.occasion) score += 10;
    if (state.theme) score += 10;
    if (state.protagonist1) score += 15;
    if (state.date && state.venueName) score += 15;
    if (state.storyQuote || state.storyBody) score += 10;
    if (state.enableRsvp) score += 10;
    return Math.min(100, score);
  };

  // Reset active context defaults
  const handleResetContextDefaults = () => {
    const preset = OCCASION_PRESETS[state.occasion] || OCCASION_PRESETS['wedding'];
    if (activeArea === 'occasion') {
      handleSelectOccasion('wedding');
    } else if (activeArea === 'style') {
      onChange({
        theme: preset.defaultTheme,
        primaryColorOverride: undefined,
        secondaryColorOverride: undefined,
        fontDisplayOverride: undefined,
      });
    } else if (activeArea === 'people') {
      onChange({
        protagonist1: preset.defaultProtagonist1,
        protagonist1Role: preset.defaultProtagonist1Role,
        protagonist2: preset.defaultProtagonist2,
        protagonist2Role: preset.defaultProtagonist2Role,
        tagline: preset.defaultTagline,
      });
    } else if (activeArea === 'event') {
      onChange({
        venueName: preset.defaultVenue,
        city: preset.defaultCity,
        itinerary: preset.itinerary,
      });
    } else if (activeArea === 'story') {
      onChange({
        storyQuote: preset.defaultQuote,
        storyBody: preset.defaultStory,
      });
    }
  };

  const currentThemePreset = THEME_PRESETS[state.theme] || THEME_PRESETS['royal-regalia'];

  return (
    <aside className="cs-inspector">
      {/* ─── ADVANCED ACTIVE CONTEXT HEADER ─── */}
      <div className="cs-inspector-header" style={{ position: 'relative' }}>
        {/* Top Meta Line: Active Context Tag + Live Binding Status + Quick Jump */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fbbf24', fontWeight: 700 }}>
              Active Context
            </span>
            <span style={{ color: '#52525b' }}>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#10b981', fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
              <span>Live Bound</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Jump in Canvas Button */}
            <button
              type="button"
              onClick={() => onJumpToCanvas && onJumpToCanvas(activeArea)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                borderRadius: 6,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#d4d4d8',
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Smoothly scroll live canvas to this section"
            >
              <Eye size={11} />
              <span>Jump in Canvas</span>
            </button>

            {/* Reset Context Defaults */}
            <button
              type="button"
              onClick={handleResetContextDefaults}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#71717a',
                padding: 4,
                cursor: 'pointer',
                borderRadius: 4,
              }}
              title="Reset this context to authentic defaults"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>

        {/* Interactive Context Switcher Selector */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => setIsContextDropdownOpen(!isContextDropdownOpen)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: 8,
              background: '#18181c',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'border-color 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>{currentContextMeta.icon}</span>
              <div>
                <span style={{ display: 'block', lineHeight: 1.2 }}>{currentContextMeta.label}</span>
                <span style={{ fontSize: 10, color: '#a1a1aa', fontWeight: 500 }}>{currentContextMeta.badge}</span>
              </div>
            </div>
            <ChevronDown size={14} style={{ color: '#a1a1aa', transform: isContextDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {/* Context Selector Dropdown Menu */}
          {isContextDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 4,
                background: '#141418',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: 10,
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.9)',
                zIndex: 100,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {CONTEXT_LIST.map((ctx) => (
                <button
                  key={ctx.id}
                  type="button"
                  onClick={() => {
                    onSelectArea(ctx.id);
                    setIsContextDropdownOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: activeArea === ctx.id ? 'rgba(251, 191, 36, 0.12)' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    color: activeArea === ctx.id ? '#fbbf24' : '#f4f4f5',
                    fontSize: 12,
                    fontWeight: activeArea === ctx.id ? 700 : 500,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{ctx.icon}</span>
                    <span>{ctx.label}</span>
                  </div>
                  {activeArea === ctx.id && <Check size={13} style={{ color: '#fbbf24' }} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dual-Layer Tabs: Essentials vs Pro Customizer (When available) */}
        {['style', 'people', 'event', 'story', 'guests'].includes(activeArea) && (
          <div
            style={{
              display: 'flex',
              background: '#141418',
              padding: 3,
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('essentials')}
              style={{
                flex: 1,
                padding: '5px 0',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: activeTab === 'essentials' ? 700 : 500,
                background: activeTab === 'essentials' ? '#27272a' : 'transparent',
                color: activeTab === 'essentials' ? '#ffffff' : '#a1a1aa',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              ⚡ Essentials
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pro')}
              style={{
                flex: 1,
                padding: '5px 0',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: activeTab === 'pro' ? 700 : 500,
                background: activeTab === 'pro' ? '#fbbf24' : 'transparent',
                color: activeTab === 'pro' ? '#090b10' : '#a1a1aa',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              🎨 Pro Customizer
            </button>
          </div>
        )}
      </div>

      {/* ─── INSPECTOR SCROLLABLE BODY ─── */}
      <div className="cs-inspector-body">
        {/* ─── 1. OVERVIEW AREA ─── */}
        {activeArea === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Readiness Card */}
            <div style={{ padding: 16, borderRadius: 12, background: '#141418', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a1a1aa' }}>
                  Studio Readiness
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#10b981' }}>
                  {calculateReadiness()}% Ready
                </span>
              </div>
              <div style={{ width: '100%', height: 6, borderRadius: 9999, background: '#27272a', overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ width: `${calculateReadiness()}%`, height: '100%', background: 'linear-gradient(90deg, #fbbf24 0%, #10b981 100%)', transition: 'width 0.4s ease' }} />
              </div>
              <p style={{ fontSize: 12, color: '#a1a1aa', margin: 0, lineHeight: 1.5 }}>
                Hero details, royal palace venue, narrative vows, multi-event schedule, and RSVP channels are active.
              </p>
            </div>

            {/* Quick-Jump Configuration Grid */}
            <div>
              <span style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#71717a', marginBottom: 10 }}>
                Live Studio Modules
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Occasion', val: state.occasion, target: 'occasion' as WorkflowArea },
                  { label: 'Theme', val: state.theme, target: 'style' as WorkflowArea },
                  { label: 'Hosts', val: state.protagonist1, target: 'people' as WorkflowArea },
                  { label: 'Venue', val: state.venueName, target: 'event' as WorkflowArea },
                  { label: 'Schedule', val: `${state.itinerary.length} Events`, target: 'event' as WorkflowArea },
                  { label: 'Security', val: state.hasPasscodeProtection ? 'Passcode' : 'Open VIP', target: 'guests' as WorkflowArea },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectArea(item.target)}
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      background: '#141418',
                      border: '1px solid rgba(255,255,255,0.06)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.4)';
                      e.currentTarget.style.background = '#18181f';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                      e.currentTarget.style.background = '#141418';
                    }}
                  >
                    <span style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#71717a' }}>
                      {item.label}
                    </span>
                    <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#ffffff', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.val}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Philosophy Tip */}
            <div style={{ padding: 14, borderRadius: 12, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', fontSize: 12, color: '#fef3c7', lineHeight: 1.5 }}>
              <strong style={{ display: 'block', marginBottom: 2 }}>💡 Live Studio Binding</strong>
              Every parameter configured here immediately morphs the center canvas in real time. Use "Jump in Canvas" to test how each section renders for your guests!
            </div>
          </div>
        )}

        {/* ─── 2. OCCASION AREA (VISUAL SELECTION & MOOD SCULPTOR) ─── */}
        {activeArea === 'occasion' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Tone of Voice / Mood Sculptor Chips */}
            <div style={{ padding: 12, background: '#141418', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#fbbf24', marginBottom: 8 }}>
                Occasion Tone & Vibe
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[
                  { id: 'royal', label: '👑 Auspicious & Royal' },
                  { id: 'modern', label: '✨ Modern & Playful' },
                  { id: 'warm', label: '🥂 Intimate & Warm' },
                  { id: 'concise', label: '🕊️ Classic Editorial' },
                ].map((tone) => (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => applyStoryTone(tone.id as any)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: state.toneOfVoice === tone.id ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                      border: state.toneOfVoice === tone.id ? '1px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: state.toneOfVoice === tone.id ? '#fbbf24' : '#d4d4d8',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {tone.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 7 Visual Occasion Cards */}
            {(Object.keys(OCCASION_PRESETS) as OccasionType[]).map((occId) => {
              const preset = OCCASION_PRESETS[occId];
              const isSelected = state.occasion === occId;

              return (
                <button
                  key={occId}
                  type="button"
                  onClick={() => handleSelectOccasion(occId)}
                  style={{
                    position: 'relative',
                    borderRadius: 14,
                    overflow: 'hidden',
                    border: isSelected ? `2px solid ${preset.accentColor}` : '1px solid rgba(255, 255, 255, 0.1)',
                    background: '#0e0e12',
                    cursor: 'pointer',
                    textAlign: 'left',
                    padding: 0,
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: isSelected ? `0 8px 24px -4px ${preset.accentColor}44` : 'none',
                    transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                  }}
                >
                  <div
                    style={{
                      height: 95,
                      width: '100%',
                      backgroundImage: `url(${preset.heroImage})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(180deg, rgba(7, 7, 9, 0.2) 0%, rgba(7, 7, 9, 0.85) 65%, #0e0e12 100%)',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 10,
                        left: 12,
                        right: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '3px 9px',
                          borderRadius: 999,
                          background: 'rgba(0, 0, 0, 0.7)',
                          backdropFilter: 'blur(8px)',
                          border: `1px solid ${preset.accentColor}55`,
                          fontSize: 10,
                          fontWeight: 700,
                          color: preset.accentColor,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}
                      >
                        <span>{preset.icon}</span>
                        <span>{preset.badge}</span>
                      </span>

                      {isSelected && (
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: preset.accentColor,
                            color: '#07090e',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: `0 0 10px ${preset.accentColor}`,
                          }}
                        >
                          <Check size={13} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ padding: '12px 14px' }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', margin: '0 0 3px' }}>
                      {preset.name}
                    </h3>
                    <p style={{ fontSize: 11, color: '#d4d4d8', margin: '0 0 4px', fontWeight: 500, lineHeight: 1.4 }}>
                      {preset.headline}
                    </p>
                    <p style={{ fontSize: 11, color: '#71717a', margin: 0, lineHeight: 1.3 }}>
                      {preset.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ─── 3. STYLE & THEME (8 LUXURY UNIVERSES + PRO CUSTOMIZER) ─── */}
        {activeArea === 'style' && (
          <>
            {activeTab === 'essentials' ? (
              /* ESSENTIALS: Visual Universes Gallery */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(Object.keys(THEME_PRESETS) as ThemeType[]).map((themeId) => {
                  const preset = THEME_PRESETS[themeId];
                  const isSelected = state.theme === themeId;

                  return (
                    <button
                      key={themeId}
                      type="button"
                      onClick={() => onChange({ theme: themeId })}
                      style={{
                        borderRadius: 14,
                        overflow: 'hidden',
                        border: isSelected ? `2px solid ${preset.accentColor}` : '1px solid rgba(255, 255, 255, 0.1)',
                        background: '#0e0e12',
                        cursor: 'pointer',
                        textAlign: 'left',
                        padding: 0,
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: isSelected ? `0 8px 24px -4px ${preset.accentColor}44` : 'none',
                        transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                      }}
                    >
                      <div
                        style={{
                          height: 90,
                          width: '100%',
                          backgroundImage: `url(${preset.previewImage})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(180deg, rgba(7, 7, 9, 0.3) 0%, rgba(7, 7, 9, 0.85) 65%, #0e0e12 100%)',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: 10,
                            left: 12,
                            right: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: 999,
                              background: 'rgba(0, 0, 0, 0.7)',
                              backdropFilter: 'blur(8px)',
                              border: `1px solid ${preset.accentColor}55`,
                              fontSize: 10,
                              fontWeight: 700,
                              color: preset.accentColor,
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                            }}
                          >
                            {preset.badge}
                          </span>

                          {isSelected && (
                            <div
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: '50%',
                                background: preset.accentColor,
                                color: '#07090e',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: `0 0 10px ${preset.accentColor}`,
                              }}
                            >
                              <Check size={13} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', margin: 0 }}>
                            {preset.name}
                          </h3>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {preset.palette.map((color, i) => (
                              <span
                                key={i}
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  backgroundColor: color,
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                }}
                                title={color}
                              />
                            ))}
                          </div>
                        </div>

                        <p style={{ fontSize: 11, color: '#a1a1aa', margin: '0 0 8px', lineHeight: 1.4 }}>
                          {preset.tagline}
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10, color: '#71717a', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: 4 }}>
                            ✍️ {preset.fontDisplay.split(',')[0]}
                          </span>
                          <span style={{ fontSize: 10, color: '#fbbf24', background: 'rgba(251, 191, 36, 0.08)', padding: '2px 8px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Volume2 size={10} />
                            <span>{preset.audioTrackName.split(' ')[0]}</span>
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* PRO CUSTOMIZER: Color Overrides, Typography & Live Soundscape Dock */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* 1. Primary Luxury Color Overrides */}
                <div style={{ padding: 14, background: '#141418', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#fbbf24', marginBottom: 10 }}>
                    Primary Accent Color
                  </span>

                  {/* 8 Preset Luxury Color Swatches */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                    {[
                      { hex: '#D4AF37', label: 'Imperial Gold' },
                      { hex: '#E8A598', label: 'Rose Gold' },
                      { hex: '#F4F4F5', label: 'Minimalist' },
                      { hex: '#10B981', label: 'Emerald' },
                      { hex: '#E8B86D', label: 'Terracotta' },
                      { hex: '#F43F5E', label: 'Neon Velvet' },
                      { hex: '#831843', label: 'Burgundy' },
                      { hex: '#2DD4BF', label: 'Bioluminescent' },
                    ].map((swatch) => (
                      <button
                        key={swatch.hex}
                        type="button"
                        onClick={() => onChange({ primaryColorOverride: swatch.hex })}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4,
                          padding: '8px 4px',
                          borderRadius: 8,
                          background: state.primaryColorOverride === swatch.hex ? 'rgba(255,255,255,0.1)' : 'transparent',
                          border: state.primaryColorOverride === swatch.hex ? `1.5px solid ${swatch.hex}` : '1px solid rgba(255,255,255,0.08)',
                          cursor: 'pointer',
                        }}
                      >
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            backgroundColor: swatch.hex,
                            boxShadow: `0 0 8px ${swatch.hex}66`,
                          }}
                        />
                        <span style={{ fontSize: 9, color: '#a1a1aa' }}>{swatch.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Custom Hex Input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="color"
                      value={state.primaryColorOverride || currentThemePreset.accentColor}
                      onChange={(e) => onChange({ primaryColorOverride: e.target.value })}
                      style={{ width: 36, height: 36, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 6 }}
                    />
                    <input
                      type="text"
                      value={state.primaryColorOverride || currentThemePreset.accentColor}
                      onChange={(e) => onChange({ primaryColorOverride: e.target.value })}
                      placeholder="#D4AF37"
                      className="cs-input"
                      style={{ fontFamily: 'monospace', fontSize: 12 }}
                    />
                  </div>
                </div>

                {/* 2. Typography Engine Pairing */}
                <div style={{ padding: 14, background: '#141418', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#fbbf24', marginBottom: 10 }}>
                    Headline Typeface Engine
                  </span>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      { font: 'Cinzel, serif', name: 'Cinzel', genre: 'Classical Monumental Roman' },
                      { font: 'Playfair Display, serif', name: 'Playfair Display', genre: 'High-Fashion Editorial Serif' },
                      { font: 'Cormorant Garamond, serif', name: 'Cormorant Garamond', genre: 'Literary Classical European' },
                      { font: 'Syne, sans-serif', name: 'Syne', genre: 'Avant-Garde Architectural' },
                      { font: 'Great Vibes, cursive', name: 'Great Vibes', genre: 'Château Romance Calligraphy' },
                    ].map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => onChange({ fontDisplayOverride: item.font })}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: 8,
                          background: state.fontDisplayOverride === item.font ? 'rgba(251,191,36,0.15)' : '#18181c',
                          border: state.fontDisplayOverride === item.font ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.06)',
                          color: '#ffffff',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div>
                          <span style={{ fontFamily: item.font, fontSize: 14, fontWeight: 700, display: 'block' }}>
                            {item.name}
                          </span>
                          <span style={{ fontSize: 10, color: '#71717a' }}>{item.genre}</span>
                        </div>
                        {state.fontDisplayOverride === item.font && <Check size={14} style={{ color: '#fbbf24' }} />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Integrated Soundscape Audio Dock */}
                <div style={{ padding: 14, background: '#141418', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#fbbf24', marginBottom: 10 }}>
                    Universe Ambient Soundscape
                  </span>

                  <audio
                    ref={audioPreviewRef}
                    loop
                    src="https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3"
                  />

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: '#0a0d14', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(251,191,36,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
                        <Music size={18} />
                      </div>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', display: 'block' }}>
                          {currentThemePreset.audioTrackName}
                        </span>
                        <span style={{ fontSize: 10, color: '#a1a1aa' }}>High-Definition Orchestral Stream</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={toggleSoundscapePreview}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 14px',
                        borderRadius: 999,
                        background: isAudioPreviewPlaying ? '#ef4444' : '#fbbf24',
                        color: isAudioPreviewPlaying ? '#fff' : '#000',
                        fontSize: 11,
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {isAudioPreviewPlaying ? <VolumeX size={13} /> : <Volume2 size={13} />}
                      <span>{isAudioPreviewPlaying ? 'Stop' : 'Preview Audio'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── 4. PEOPLE / PROTAGONISTS & MONOGRAM STUDIO ─── */}
        {activeArea === 'people' && (
          <>
            {activeTab === 'essentials' ? (
              /* ESSENTIALS: Names, Roles, Tagline */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Mode Toggle: Single Celebrant vs Couple */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, background: '#141418', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#f4f4f5' }}>Celebration Format</span>
                  <div style={{ display: 'flex', gap: 4, background: '#27272a', padding: 2, borderRadius: 8 }}>
                    <button
                      type="button"
                      onClick={() => onChange({ protagonist2: '', protagonist2Role: '' })}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: !isCoupleMode ? 700 : 500,
                        background: !isCoupleMode ? '#fbbf24' : 'transparent',
                        color: !isCoupleMode ? '#000' : '#a1a1aa',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Single Host
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!state.protagonist2) {
                          onChange({ protagonist2: 'Meera Singhania', protagonist2Role: 'The Bride' });
                        }
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: isCoupleMode ? 700 : 500,
                        background: isCoupleMode ? '#fbbf24' : 'transparent',
                        color: isCoupleMode ? '#000' : '#a1a1aa',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Couple / Partners
                    </button>
                  </div>
                </div>

                {/* Protagonist 1 */}
                <div style={{ padding: 14, background: '#141418', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#fbbf24', marginBottom: 10 }}>
                    {isCoupleMode ? 'First Celebrant / Partner' : 'Primary Celebrant / Host'}
                  </span>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label className="cs-label">Full Name</label>
                      <input
                        type="text"
                        value={state.protagonist1}
                        onChange={(e) => onChange({ protagonist1: e.target.value })}
                        placeholder="e.g. Aarav Sharma"
                        className="cs-input"
                      />
                    </div>

                    <div>
                      <label className="cs-label">Ceremony Role / Designation</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                        {['The Groom', 'Celebrant', 'Birthday Star', 'Host', 'Keynote'].map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => onChange({ protagonist1Role: r })}
                            style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: state.protagonist1Role === r ? '#fbbf24' : 'rgba(255,255,255,0.06)',
                              color: state.protagonist1Role === r ? '#000' : '#a1a1aa',
                              fontSize: 10,
                              fontWeight: 600,
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={state.protagonist1Role}
                        onChange={(e) => onChange({ protagonist1Role: e.target.value })}
                        placeholder="e.g. The Groom"
                        className="cs-input"
                      />
                    </div>

                    <div>
                      <label className="cs-label">Short Bio / Story Note</label>
                      <input
                        type="text"
                        value={state.protagonist1Bio}
                        onChange={(e) => onChange({ protagonist1Bio: e.target.value })}
                        placeholder="e.g. Architect, heritage enthusiast, classical guitarist."
                        className="cs-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Protagonist 2 (if couple) */}
                {isCoupleMode && (
                  <div style={{ padding: 14, background: '#141418', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#fbbf24', marginBottom: 10 }}>
                      Second Celebrant / Partner
                    </span>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <label className="cs-label">Full Name</label>
                        <input
                          type="text"
                          value={state.protagonist2}
                          onChange={(e) => onChange({ protagonist2: e.target.value })}
                          placeholder="e.g. Meera Singhania"
                          className="cs-input"
                        />
                      </div>

                      <div>
                        <label className="cs-label">Ceremony Role / Designation</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                          {['The Bride', 'Partner', 'Celebrant', 'Host'].map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => onChange({ protagonist2Role: r })}
                              style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                background: state.protagonist2Role === r ? '#fbbf24' : 'rgba(255,255,255,0.06)',
                                color: state.protagonist2Role === r ? '#000' : '#a1a1aa',
                                fontSize: 10,
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          value={state.protagonist2Role}
                          onChange={(e) => onChange({ protagonist2Role: e.target.value })}
                          placeholder="e.g. The Bride"
                          className="cs-input"
                        />
                      </div>

                      <div>
                        <label className="cs-label">Short Bio / Story Note</label>
                        <input
                          type="text"
                          value={state.protagonist2Bio}
                          onChange={(e) => onChange({ protagonist2Bio: e.target.value })}
                          placeholder="e.g. Classical Kathak dancer, wildlife conservationist."
                          className="cs-input"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* PRO CUSTOMIZER: Monogram Seal Designer & Curated Portrait Presets */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Monogram Seal Designer */}
                <div style={{ padding: 14, background: '#141418', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#fbbf24', marginBottom: 10 }}>
                    Monogram Crest Designer
                  </span>

                  {/* Live Monogram Preview Display */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#0a0d14', borderRadius: 12, marginBottom: 12 }}>
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: state.monogramStyle === 'arch' ? '36px 36px 8px 8px' : '50%',
                        border: '2px solid #D4AF37',
                        background: 'radial-gradient(circle at 30% 30%, rgba(212, 175, 55, 0.25), #0a0d14 80%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: "'Cinzel', serif",
                        fontSize: 20,
                        fontWeight: 700,
                        color: '#FFDF73',
                        boxShadow: '0 0 20px rgba(212, 175, 55, 0.3)',
                        letterSpacing: '1px',
                      }}
                    >
                      {state.monogramInitials || (state.protagonist2 ? `${state.protagonist1.charAt(0)} & ${state.protagonist2.charAt(0)}` : state.protagonist1.charAt(0) || 'A')}
                    </div>
                  </div>

                  {/* Monogram Style Options */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {[
                      { id: 'arch', label: 'Royal Arch' },
                      { id: 'wax', label: 'Wax Seal' },
                      { id: 'ring', label: 'Modern Ring' },
                    ].map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => onChange({ monogramStyle: style.id as any })}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 6,
                          background: (state.monogramStyle || 'arch') === style.id ? 'rgba(251,191,36,0.2)' : '#18181c',
                          border: (state.monogramStyle || 'arch') === style.id ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.06)',
                          color: (state.monogramStyle || 'arch') === style.id ? '#fbbf24' : '#a1a1aa',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Curated Portrait Presets */}
                <div style={{ padding: 14, background: '#141418', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#fbbf24', marginBottom: 10 }}>
                    Curated Portrait Presets
                  </span>

                  <span style={{ fontSize: 11, color: '#a1a1aa', display: 'block', marginBottom: 6 }}>Celebrant 1 Portrait</span>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {[
                      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=85',
                      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=85',
                      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&q=85',
                    ].map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => applyPortraitPreset(1, img)}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 8,
                          backgroundImage: `url(${img})`,
                          backgroundSize: 'cover',
                          border: state.protagonist1Image === img ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.2)',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </div>

                  {isCoupleMode && (
                    <>
                      <span style={{ fontSize: 11, color: '#a1a1aa', display: 'block', marginBottom: 6 }}>Celebrant 2 Portrait</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[
                          'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=85',
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=85',
                          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&q=85',
                        ].map((img, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => applyPortraitPreset(2, img)}
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 8,
                              backgroundImage: `url(${img})`,
                              backgroundSize: 'cover',
                              border: state.protagonist2Image === img ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.2)',
                              cursor: 'pointer',
                            }}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── 5. EVENT DETAILS & PALATIAL VENUES PRO ─── */}
        {activeArea === 'event' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Landmark Venue Autofill Presets */}
            <div style={{ padding: 12, background: '#141418', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#fbbf24', marginBottom: 8 }}>
                Palatial Venue Presets
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[
                  { name: 'Umaid Bhawan Palace', city: 'Jodhpur, Rajasthan', address: 'Palace Road, Cantt Area, Jodhpur 342006' },
                  { name: 'Jagmandir Island Palace', city: 'Udaipur, Rajasthan', address: 'Pichola, Udaipur 313001' },
                  { name: 'The Oberoi Udaivilas', city: 'Udaipur, Rajasthan', address: 'Badi-Gorela-Mulla Talai Rd, Haridas Ji Ki Magri' },
                  { name: 'The St. Regis Mumbai', city: 'Mumbai, Maharashtra', address: '462 Senapati Bapat Marg, Lower Parel' },
                  { name: 'Villa d’Este', city: 'Lake Como, Italy', address: 'Via Regina, 40, 22012 Cernobbio' },
                ].map((venue) => (
                  <button
                    key={venue.name}
                    type="button"
                    onClick={() => applyVenuePreset(venue)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: state.venueName === venue.name ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                      border: state.venueName === venue.name ? '1px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: state.venueName === venue.name ? '#fbbf24' : '#d4d4d8',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    🏛️ {venue.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Date & Venue Inputs */}
            <div style={{ padding: 14, background: '#141418', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label className="cs-label">Celebration Date</label>
                    <input
                      type="date"
                      value={state.date}
                      onChange={(e) => onChange({ date: e.target.value })}
                      className="cs-input"
                    />
                  </div>
                  <div>
                    <label className="cs-label">Start Time</label>
                    <input
                      type="text"
                      value={state.time}
                      onChange={(e) => onChange({ time: e.target.value })}
                      placeholder="06:00 PM IST"
                      className="cs-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="cs-label">Palace / Venue Name</label>
                  <input
                    type="text"
                    value={state.venueName}
                    onChange={(e) => onChange({ venueName: e.target.value })}
                    placeholder="e.g. Umaid Bhawan Palace"
                    className="cs-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label className="cs-label">City & State</label>
                    <input
                      type="text"
                      value={state.city}
                      onChange={(e) => onChange({ city: e.target.value })}
                      placeholder="e.g. Jodhpur, Rajasthan"
                      className="cs-input"
                    />
                  </div>
                  <div>
                    <label className="cs-label">Target Guests</label>
                    <input
                      type="number"
                      value={state.guestCountTarget}
                      onChange={(e) => onChange({ guestCountTarget: parseInt(e.target.value) || 100 })}
                      className="cs-input"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Multi-Event Ceremony Itinerary Builder with Quick Presets */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#f4f4f5' }}>
                  Ceremony Itinerary ({state.itinerary.length})
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['+ Haldi', '+ Sangeet', '+ Pheras', '+ Reception'].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleAddItineraryEvent({
                        title: item.replace('+ ', ''),
                        time: '06:00 PM',
                        dressCode: 'Royal Festive',
                        desc: 'Sacred ceremonial celebration with close family and honored guests.',
                      })}
                      style={{
                        padding: '2px 7px',
                        borderRadius: 4,
                        background: 'rgba(251,191,36,0.12)',
                        border: '1px solid rgba(251,191,36,0.25)',
                        color: '#fbbf24',
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {state.itinerary.map((event, idx) => (
                  <div
                    key={event.id}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      background: '#141418',
                      border: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24' }}>
                        Ceremony {idx + 1}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => handleMoveItinerary(idx, 'up')}
                          disabled={idx === 0}
                          style={{ background: 'transparent', border: 'none', color: idx === 0 ? '#3f3f46' : '#a1a1aa', cursor: idx === 0 ? 'default' : 'pointer' }}
                          title="Move up"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveItinerary(idx, 'down')}
                          disabled={idx === state.itinerary.length - 1}
                          style={{ background: 'transparent', border: 'none', color: idx === state.itinerary.length - 1 ? '#3f3f46' : '#a1a1aa', cursor: idx === state.itinerary.length - 1 ? 'default' : 'pointer' }}
                          title="Move down"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItinerary(idx)}
                          style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer' }}
                          title="Delete ceremony"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <input
                        type="text"
                        value={event.title}
                        onChange={(e) => handleUpdateItinerary(idx, { title: e.target.value })}
                        placeholder="Ceremony Title"
                        className="cs-input"
                        style={{ fontSize: 12 }}
                      />
                      <input
                        type="text"
                        value={event.time}
                        onChange={(e) => handleUpdateItinerary(idx, { time: e.target.value })}
                        placeholder="Time (e.g. 07:30 PM)"
                        className="cs-input"
                        style={{ fontSize: 12 }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <input
                        type="text"
                        value={event.venue || ''}
                        onChange={(e) => handleUpdateItinerary(idx, { venue: e.target.value })}
                        placeholder="Venue room (e.g. Courtyard)"
                        className="cs-input"
                        style={{ fontSize: 12 }}
                      />
                      <input
                        type="text"
                        value={event.dressCode}
                        onChange={(e) => handleUpdateItinerary(idx, { dressCode: e.target.value })}
                        placeholder="Dress code attire"
                        className="cs-input"
                        style={{ fontSize: 12 }}
                      />
                    </div>

                    <input
                      type="text"
                      value={event.desc}
                      onChange={(e) => handleUpdateItinerary(idx, { desc: e.target.value })}
                      placeholder="Ceremony narrative description..."
                      className="cs-input"
                      style={{ fontSize: 12 }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── 6. STORY WRITING ROOM WITH TONE SCULPTOR ─── */}
        {activeArea === 'story' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Tone Sculptor Chips */}
            <div>
              <span style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#71717a', marginBottom: 8 }}>
                Writing Tone Sculptor
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[
                  { id: 'royal', label: '👑 Poetic Royal' },
                  { id: 'modern', label: '✨ Modern Romance' },
                  { id: 'warm', label: '💌 Warm & Personal' },
                  { id: 'concise', label: '🕊️ Concise' },
                ].map((tone) => (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => applyStoryTone(tone.id as any)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#d4d4d8',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    {tone.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sacred Proclamation / Quote */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <label className="cs-label" style={{ margin: 0 }}>Ceremonial Proclamation / Sacred Quote</label>
                <span style={{ fontSize: 10, color: '#71717a' }}>{state.storyQuote.length} chars</span>
              </div>
              <textarea
                value={state.storyQuote}
                onChange={(e) => onChange({ storyQuote: e.target.value })}
                rows={3}
                placeholder="Two souls, one destiny, beginning our timeless journey under the royal stars..."
                className="cs-textarea"
                style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 13, fontStyle: 'italic', lineHeight: 1.6 }}
              />
            </div>

            {/* Narrative Story Body */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <label className="cs-label" style={{ margin: 0 }}>Narrative Story Body</label>
                <span style={{ fontSize: 10, color: '#71717a' }}>
                  {state.storyBody.split(/\s+/).filter(Boolean).length} words • ~1 min read
                </span>
              </div>
              <textarea
                value={state.storyBody}
                onChange={(e) => onChange({ storyBody: e.target.value })}
                rows={6}
                placeholder="From a chance encounter during monsoon season in Jaipur to a quiet sunset proposal along Lake Pichola..."
                className="cs-textarea"
                style={{ lineHeight: 1.6, fontSize: 13 }}
              />
            </div>
          </div>
        )}

        {/* ─── 7. CONTENT MODULES DRAWER ─── */}
        {activeArea === 'content' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#71717a' }}>
                Active Celebration Modules
              </span>
              <button
                type="button"
                onClick={() => {
                  onChange({
                    enableCountdown: true,
                    enableCoupleProfile: true,
                    enableItinerary: true,
                    enableStory: true,
                    enableVenueMap: true,
                    enableDressCode: true,
                    enableGallery: true,
                    enableRsvp: true,
                    enableShagun: true,
                    enableGuestbook: true,
                    enableMusic: true,
                  });
                }}
                style={{ background: 'transparent', border: 'none', color: '#fbbf24', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >
                Enable All
              </button>
            </div>

            {[
              { id: 'enableCountdown', label: 'Celebration Countdown Clock', desc: 'Real-time countdown days, hours, and minutes', val: state.enableCountdown },
              { id: 'enableCoupleProfile', label: 'Celebrants / Protagonists Profile', desc: 'Gilded portraits, bios, and royal roles', val: state.enableCoupleProfile },
              { id: 'enableItinerary', label: 'Multi-Event Ceremony Itinerary', desc: 'Sangeet, Haldi, Vows & Reception schedule', val: state.enableItinerary },
              { id: 'enableStory', label: 'Love Story & Proclamation', desc: 'Personal story, quotes, and memories', val: state.enableStory },
              { id: 'enableVenueMap', label: 'Palace Venue & Directions', desc: 'Google Map directions and arrival guides', val: state.enableVenueMap },
              { id: 'enableDressCode', label: 'Attire & Dress Code Guidelines', desc: 'Haute couture color recommendations', val: state.enableDressCode },
              { id: 'enableGallery', label: 'Memory Photo Showcase', desc: 'Curated editorial photo gallery', val: state.enableGallery },
              { id: 'enableRsvp', label: 'Guest RSVP Portal', desc: 'Attendance confirmation with deadline tracking', val: state.enableRsvp },
              { id: 'enableShagun', label: '0% Fee UPI Digital Shagun', desc: 'Direct UPI blessings with customized chips', val: state.enableShagun },
              { id: 'enableGuestbook', label: 'Blessings & Wishes Wall', desc: 'Interactive guestbook for heartwarming blessings', val: state.enableGuestbook },
              { id: 'enableMusic', label: 'Ambient Palace Soundscape', desc: 'High-definition orchestral audio per universe', val: state.enableMusic },
            ].map((mod) => (
              <div
                key={mod.id}
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: '#141418',
                  border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: '#ffffff', margin: '0 0 2px' }}>
                    {mod.label}
                  </h4>
                  <p style={{ fontSize: 11, color: '#71717a', margin: 0 }}>
                    {mod.desc}
                  </p>
                </div>

                <label
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: 38,
                    height: 22,
                    flexShrink: 0,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={mod.val}
                    onChange={(e) => onChange({ [mod.id]: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      inset: 0,
                      backgroundColor: mod.val ? '#fbbf24' : '#27272a',
                      borderRadius: 34,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        content: '""',
                        height: 16,
                        width: 16,
                        left: mod.val ? 19 : 3,
                        bottom: 3,
                        backgroundColor: mod.val ? '#090b10' : '#a1a1aa',
                        borderRadius: '50%',
                        transition: 'all 0.2s ease',
                      }}
                    />
                  </span>
                </label>
              </div>
            ))}
          </div>
        )}

        {/* ─── 8. GUEST EXPERIENCE, RSVP & VIP SECURITY PRO ─── */}
        {activeArea === 'guests' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* VIP Passcode Gate with Live Tester */}
            <div style={{ padding: 14, background: '#141418', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Lock size={15} style={{ color: '#fbbf24' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>
                    VIP 4-Digit Passcode Lock
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={state.hasPasscodeProtection}
                  onChange={(e) => onChange({ hasPasscodeProtection: e.target.checked })}
                  style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#fbbf24' }}
                />
              </div>

              {state.hasPasscodeProtection ? (
                <div>
                  <label className="cs-label">Secret Invitation Passcode</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={state.passcode}
                    onChange={(e) => onChange({ passcode: e.target.value })}
                    placeholder="2027"
                    className="cs-input"
                    style={{ letterSpacing: '4px', textAlign: 'center', fontWeight: 700, fontSize: 14, marginBottom: 8 }}
                  />

                  {/* Interactive Passcode Tester */}
                  <div style={{ padding: 10, background: '#0a0d14', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: 10, color: '#a1a1aa', display: 'block', marginBottom: 6 }}>
                      Test Guest Unlock Verification
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="password"
                        value={testPin}
                        onChange={(e) => setTestPin(e.target.value)}
                        placeholder="Enter PIN"
                        className="cs-input"
                        style={{ fontSize: 12, textAlign: 'center', letterSpacing: '2px' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (testPin === state.passcode) {
                            setTestUnlockResult('success');
                          } else {
                            setTestUnlockResult('fail');
                          }
                          setTimeout(() => setTestUnlockResult('idle'), 2500);
                        }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 8,
                          background: testUnlockResult === 'success' ? '#10b981' : testUnlockResult === 'fail' ? '#ef4444' : '#fbbf24',
                          color: '#000',
                          fontSize: 11,
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {testUnlockResult === 'success' ? '✓ Unlocked' : testUnlockResult === 'fail' ? '✕ Invalid' : 'Test'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: 11, color: '#71717a' }}>
                  Open VIP celebration (anyone with your guest link can view without a passcode).
                </span>
              )}
            </div>

            {/* RSVP Form Controls */}
            <div style={{ padding: 14, background: '#141418', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#fbbf24', marginBottom: 10 }}>
                RSVP Settings
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label className="cs-label">RSVP Confirmation Deadline</label>
                  <input
                    type="text"
                    value={state.rsvpDeadline}
                    onChange={(e) => onChange({ rsvpDeadline: e.target.value })}
                    placeholder="e.g. 10 January 2027"
                    className="cs-input"
                  />
                </div>

                <div>
                  <label className="cs-label">Party Size Allowance Policy</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                    {[
                      { id: 'single', label: 'Single Pass' },
                      { id: 'plus_one', label: '+1 Allowed' },
                      { id: 'family', label: 'Family (4)' },
                    ].map((policy) => (
                      <button
                        key={policy.id}
                        type="button"
                        onClick={() => onChange({ partySizeAllowance: policy.id as any })}
                        style={{
                          padding: '6px 4px',
                          borderRadius: 6,
                          background: (state.partySizeAllowance || 'plus_one') === policy.id ? 'rgba(251,191,36,0.2)' : '#18181c',
                          border: (state.partySizeAllowance || 'plus_one') === policy.id ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.08)',
                          color: (state.partySizeAllowance || 'plus_one') === policy.id ? '#fbbf24' : '#a1a1aa',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {policy.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                  <span style={{ fontSize: 12, color: '#d4d4d8' }}>Collect Dietary & Allergy Info</span>
                  <input
                    type="checkbox"
                    checked={state.enableDietary}
                    onChange={(e) => onChange({ enableDietary: e.target.checked })}
                    style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#fbbf24' }}
                  />
                </div>
              </div>
            </div>

            {/* 0% Fee UPI Digital Shagun Pro */}
            <div style={{ padding: 14, background: '#141418', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#fbbf24' }}>
                  0% Fee UPI Digital Shagun
                </span>
                <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: 4 }}>
                  Verified VPA
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label className="cs-label">Host UPI ID / VPA</label>
                  <input
                    type="text"
                    value={state.upiId}
                    onChange={(e) => onChange({ upiId: e.target.value })}
                    placeholder="e.g. aarav.meera@okhdfcbank"
                    className="cs-input"
                  />
                </div>

                <div>
                  <label className="cs-label">Denomination Chips (₹)</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {state.shagunAmounts.map((amt, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          background: '#27272a',
                          border: '1px solid rgba(255,255,255,0.1)',
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#fbbf24',
                        }}
                      >
                        ₹{amt.toLocaleString()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
