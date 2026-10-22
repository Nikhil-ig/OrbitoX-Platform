'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  CelebrationState,
  ViewportMode,
  THEME_PRESETS,
  OCCASION_PRESETS,
  buildLiveExperience,
  ItineraryItem,
} from './StudioData';
import { DEFAULT_THEMES, Theme } from '@orbitox-io/celebrations';

// Import the authentic luxury celebration universe templates
import { CelestialOdysseyExperience } from '../renderer/templates/celestial-odyssey/CelestialOdysseyExperience';
import { RoyalRegaliaExperience } from '../renderer/templates/regalia/RoyalRegaliaExperience';
import { CelestialParallaxExperience } from '../renderer/templates/celestial/CelestialParallaxExperience';
import { MinimalEditorialExperience } from '../renderer/templates/editorial/MinimalEditorialExperience';
import { EnchantedGlasshouseExperience } from '../renderer/templates/glasshouse/EnchantedGlasshouseExperience';
import { AmalfiRivieraExperience } from '../renderer/templates/amalfi/AmalfiRivieraExperience';
import { PartyNocturneExperience } from '../renderer/templates/nocturne/PartyNocturneExperience';
import { RomanticDoorsExperience } from '../renderer/templates/doors/RomanticDoorsExperience';
import { SurrealOrganimoExperience } from '../renderer/templates/organimo/SurrealOrganimoExperience';
import { WelcomeDoorDispatcher } from '../renderer/doors/WelcomeDoorDispatcher';

import {
  Sparkles,
  Eye,
  Key,
  RotateCcw,
  Maximize2,
  Users,
  Calendar,
  Feather,
  MapPin,
  HeartHandshake,
  Gift,
  PenTool,
  Check,
  X,
  Palette,
  Edit3,
  SlidersHorizontal,
} from 'lucide-react';

interface CelebrationLiveCanvasProps {
  state: CelebrationState;
  onChange: (patch: Partial<CelebrationState>) => void;
  viewport: ViewportMode;
  activeStep?: string;
  jumpTrigger?: string;
  onSelectStep?: (stepId: any) => void;
  onOpenSheet?: (sheetType: any) => void;
  onOpenFullPreview?: () => void;
}

export function CelebrationLiveCanvas({
  state,
  onChange,
  viewport,
  activeStep,
  jumpTrigger,
  onSelectStep,
  onOpenSheet,
  onOpenFullPreview,
}: CelebrationLiveCanvasProps) {
  const [previewDoorMode, setPreviewDoorMode] = useState<boolean>(false);
  const [activeSectionId, setActiveSectionId] = useState<string>('hero');
  const [activePopover, setActivePopover] = useState<'hero' | 'venue' | 'story' | 'itinerary' | 'rsvp' | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const themePreset = THEME_PRESETS[state.theme] || THEME_PRESETS['royal-regalia'];
  const occasionPreset = OCCASION_PRESETS[state.occasion] || OCCASION_PRESETS['wedding'];

  // Match platform theme object
  const platformTheme: Theme = useMemo(() => {
    return (
      DEFAULT_THEMES.find((t) => t.slug === state.theme) ||
      (DEFAULT_THEMES[0] as Theme)
    );
  }, [state.theme]);

  // Construct the live Experience object from current studio state
  const liveExperience = useMemo(() => {
    return buildLiveExperience(state);
  }, [state]);

  const hostTitle = state.protagonist2
    ? `${state.protagonist1 || 'Aarav'} & ${state.protagonist2 || 'Meera'}`
    : state.protagonist1 || 'Celebration Host';

  // Frame width constraints per viewport mode
  const viewportStyles: Record<ViewportMode, { width: string; resolution: string }> = {
    desktop: { width: '100%', resolution: 'Desktop 1280px' },
    tablet: { width: '768px', resolution: 'Tablet 768 × 1024' },
    mobile: { width: '420px', resolution: 'Mobile 420 × 896' },
  };

  // Section anchors configuration for bottom quick navigation dock
  const sectionAnchors = [
    { id: 'hero', label: 'Hero', icon: Sparkles, step: 'beginning' },
    { id: 'story', label: 'Story', icon: Feather, step: 'story' },
    { id: 'couple', label: 'People', icon: Users, step: 'people' },
    { id: 'itinerary', label: 'Itinerary', icon: Calendar, step: 'moments' },
    { id: 'venue', label: 'Venue', icon: MapPin, step: 'experience' },
    { id: 'rsvp', label: 'RSVP', icon: HeartHandshake, step: 'guests' },
    { id: 'shagun', label: 'Shagun', icon: Gift, step: 'guests' },
    { id: 'wishes', label: 'Blessings', icon: PenTool, step: 'guests' },
  ];

  // Scroll to section helper
  const scrollToSection = (sectionId: string, correspondingStep?: string) => {
    setActiveSectionId(sectionId);
    if (correspondingStep && onSelectStep) {
      onSelectStep(correspondingStep);
    }

    if (!scrollContainerRef.current) return;

    if (sectionId === 'hero') {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const container = scrollContainerRef.current;
    const targetEl =
      container.querySelector(`#sec-${sectionId}`) ||
      container.querySelector(`[data-section="${sectionId}"]`) ||
      container.querySelector(`[id*="${sectionId}"]`);

    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      const approximatePositions: Record<string, number> = {
        hero: 0,
        story: 620,
        couple: 1100,
        itinerary: 1650,
        venue: 2200,
        rsvp: 2750,
        shagun: 3200,
        wishes: 3600,
      };
      container.scrollTo({ top: approximatePositions[sectionId] || 0, behavior: 'smooth' });
    }
  };

  // Smoothly scroll when activeStep from left rail changes
  useEffect(() => {
    if (!activeStep) return;
    const stepToSectionMap: Record<string, string> = {
      beginning: 'hero',
      style: 'hero',
      people: 'couple',
      moments: 'itinerary',
      story: 'story',
      experience: 'venue',
      guests: 'rsvp',
    };
    const targetSection = stepToSectionMap[activeStep];
    if (targetSection) {
      scrollToSection(targetSection);
    }
  }, [activeStep]);

  // Smoothly scroll when explicit jumpTrigger fires
  useEffect(() => {
    if (!jumpTrigger) return;
    const step = jumpTrigger.split('-')[0] || 'hero';
    scrollToSection(step);
  }, [jumpTrigger]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: '#070709',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* ─── CANVAS SUBTLE CONTROL BAR ─── */}
      <div
        style={{
          width: '100%',
          padding: '10px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(11, 11, 14, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 8px #10b981',
            }}
          />
          <span style={{ fontWeight: 600, color: '#f4f4f5' }}>
            Live Celebration
          </span>
          <span style={{ color: '#52525b' }}>•</span>
          <button
            type="button"
            onClick={() => onOpenSheet?.('style')}
            style={{
              background: 'transparent',
              border: 'none',
              color: themePreset.accentColor,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: 0,
            }}
            title="Click to customize universe & style"
          >
            <span>{themePreset.name}</span>
            <Edit3 size={11} style={{ opacity: 0.7 }} />
          </button>
          <span style={{ color: '#52525b' }}>•</span>
          <span style={{ color: '#71717a', fontFamily: 'monospace', fontSize: 11 }}>
            {viewportStyles[viewport].resolution}
          </span>
        </div>

        {/* Right Canvas Actions: Door entrance test & Full Immersion Guest View */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#18181b', padding: 3, borderRadius: 8 }}>
            <button
              type="button"
              onClick={() => setPreviewDoorMode(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 12px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: !previewDoorMode ? 700 : 500,
                background: !previewDoorMode ? '#27272a' : 'transparent',
                color: !previewDoorMode ? '#ffffff' : '#a1a1aa',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <Eye size={13} />
              <span>Full Experience</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewDoorMode(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 12px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: previewDoorMode ? 700 : 500,
                background: previewDoorMode ? '#27272a' : 'transparent',
                color: previewDoorMode ? '#fbbf24' : '#a1a1aa',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <Key size={13} />
              <span>Door Reveal</span>
            </button>
          </div>

          {onOpenFullPreview && (
            <button
              type="button"
              onClick={onOpenFullPreview}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 14px',
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                color: '#f4f4f5',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              }}
              title="Open full immersion guest preview"
            >
              <Maximize2 size={12} />
              <span>Full Preview</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── PREVIEW STAGE CONTAINER ─── */}
      <div
        ref={scrollContainerRef}
        style={{
          flex: 1,
          width: '100%',
          overflowY: 'auto',
          display: 'flex',
          justifyContent: 'center',
          padding: viewport === 'desktop' ? '0' : '20px',
          boxSizing: 'border-box',
          background: 'radial-gradient(circle at 50% 20%, rgba(212, 175, 55, 0.04) 0%, #070709 70%)',
          scrollBehavior: 'smooth',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: viewportStyles[viewport].width,
            maxWidth: viewport === 'desktop' ? '100%' : viewportStyles[viewport].width,
            minHeight: '100%',
            borderRadius: viewport === 'desktop' ? '0' : '20px',
            border: viewport === 'desktop' ? 'none' : '1px solid rgba(255, 255, 255, 0.14)',
            boxShadow: viewport === 'desktop' ? 'none' : '0 25px 70px -15px rgba(0, 0, 0, 0.95)',
            overflow: 'visible',
            position: 'relative',
            backgroundColor: '#07090E',
            transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* ─── CONTEXTUAL EDITING HOTSPOTS OVER THE CELEBRATION ─── */}
          {!previewDoorMode && (
            <>
              {/* Hotspot 1: Hero Names Edit Trigger Pill */}
              <div
                style={{
                  position: 'absolute',
                  top: 24,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 25,
                }}
              >
                <button
                  type="button"
                  onClick={() => setActivePopover(activePopover === 'hero' ? null : 'hero')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 14px',
                    borderRadius: 9999,
                    background: activePopover === 'hero' ? '#fbbf24' : 'rgba(15, 15, 20, 0.85)',
                    border: '1px solid rgba(251, 191, 36, 0.4)',
                    color: activePopover === 'hero' ? '#000000' : '#fbbf24',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.15s ease',
                  }}
                  title="Click to edit names, roles, and title"
                >
                  <Edit3 size={12} />
                  <span>{activePopover === 'hero' ? 'Editing Hero' : 'Edit Names & Tagline'}</span>
                </button>
              </div>

              {/* Floating Toolbar for Hero Names */}
              {activePopover === 'hero' && (
                <div
                  style={{
                    position: 'absolute',
                    top: 60,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 35,
                    width: '90%',
                    maxWidth: 500,
                    padding: 16,
                    borderRadius: 14,
                    background: 'rgba(16, 16, 22, 0.96)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(251, 191, 36, 0.35)',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85)',
                    animation: 'csFadeInUp 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>
                      <Sparkles size={14} />
                      <span>Edit Celebrants & Tagline</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => onOpenSheet?.('style')}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: '#ffffff',
                          fontSize: 11,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Palette size={11} />
                        <span>Style</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePopover(null)}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          background: 'transparent',
                          border: 'none',
                          color: '#a1a1aa',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: '#a1a1aa', marginBottom: 4, fontWeight: 600 }}>
                        Partner 1 Name
                      </label>
                      <input
                        type="text"
                        value={state.protagonist1 || ''}
                        onChange={(e) => onChange({ protagonist1: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 7,
                          background: '#22222b',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: '#ffffff',
                          fontSize: 13,
                          fontWeight: 600,
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: '#a1a1aa', marginBottom: 4, fontWeight: 600 }}>
                        Partner 2 Name
                      </label>
                      <input
                        type="text"
                        value={state.protagonist2 || ''}
                        onChange={(e) => onChange({ protagonist2: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 7,
                          background: '#22222b',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: '#ffffff',
                          fontSize: 13,
                          fontWeight: 600,
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: '#a1a1aa', marginBottom: 4, fontWeight: 600 }}>
                      Ceremonial Subtitle / Tagline
                    </label>
                    <input
                      type="text"
                      value={state.tagline || ''}
                      onChange={(e) => onChange({ tagline: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 7,
                        background: '#22222b',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#ffffff',
                        fontSize: 12,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={() => setActivePopover(null)}
                      style={{
                        padding: '6px 16px',
                        borderRadius: 7,
                        background: '#fbbf24',
                        border: 'none',
                        color: '#000000',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Welcome Door Mode Overlay */}
          {previewDoorMode ? (
            <div style={{ position: 'relative', minHeight: '800px', width: '100%', overflow: 'hidden' }}>
              <div
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  zIndex: 100,
                  display: 'flex',
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => setPreviewDoorMode(false)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#ffffff',
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Exit Door Test</span>
                </button>
              </div>

              <WelcomeDoorDispatcher
                templateSlug={state.theme}
                themeSlug={state.theme}
                title={hostTitle}
                subtitle={state.tagline || 'A Sacred Gathering of Hearts'}
                date={state.date || 'Saturday, February 18, 2027'}
                venue={`${state.venueName || 'Umaid Bhawan Palace'}, ${state.city || 'Jodhpur'}`}
                primaryColor={themePreset.accentColor}
                monogramImage={state.monogramImage}
                monogramInitials={state.monogramInitials}
                onFinish={() => setPreviewDoorMode(false)}
              />
            </div>
          ) : (
            /* Direct Real Celebration Universe Rendering */
            <div>
              {state.theme === 'celestial-odyssey' ? (
                <CelestialOdysseyExperience
                  experience={liveExperience}
                  theme={platformTheme}
                />
              ) : state.theme === 'royal-regalia' ? (
                <RoyalRegaliaExperience
                  experience={liveExperience}
                  theme={platformTheme}
                />
              ) : state.theme === 'celestial-parallax' ? (
                <CelestialParallaxExperience
                  experience={liveExperience}
                  theme={platformTheme}
                />
              ) : state.theme === 'minimal-editorial' ? (
                <MinimalEditorialExperience
                  experience={liveExperience}
                  theme={platformTheme}
                />
              ) : state.theme === 'enchanted-glasshouse' ? (
                <EnchantedGlasshouseExperience
                  experience={liveExperience}
                  theme={platformTheme}
                />
              ) : state.theme === 'amalfi-riviera' ? (
                <AmalfiRivieraExperience
                  experience={liveExperience}
                  theme={platformTheme}
                />
              ) : state.theme === 'party-nocturne' ? (
                <PartyNocturneExperience
                  experience={liveExperience}
                  theme={platformTheme}
                />
              ) : state.theme === 'romantic-doors' ? (
                <RomanticDoorsExperience
                  experience={liveExperience}
                  theme={platformTheme}
                />
              ) : state.theme === 'surreal-organimo' ? (
                <SurrealOrganimoExperience
                  experience={liveExperience}
                  theme={platformTheme}
                />
              ) : (
                <RoyalRegaliaExperience
                  experience={liveExperience}
                  theme={platformTheme}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── FLOATING IN-CANVAS SECTION QUICK-NAVIGATOR ─── */}
      {!previewDoorMode && (
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(11, 11, 15, 0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 9999,
            padding: '4px 6px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
          }}
        >
          {sectionAnchors.map((item) => {
            const Icon = item.icon;
            const isCurrent = activeSectionId === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id, item.step)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 9999,
                  fontSize: 11,
                  fontWeight: isCurrent ? 600 : 500,
                  background: isCurrent ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  color: isCurrent ? '#ffffff' : '#a1a1aa',
                  border: isCurrent ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
                title={`Jump to ${item.label} section`}
              >
                <Icon size={12} />
                <span>{item.label}</span>
                {isCurrent && (
                  <span
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: '#fbbf24',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
