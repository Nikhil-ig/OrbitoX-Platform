'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  CelebrationState,
  ViewportMode,
  ThemeType,
  OCCASION_PRESETS,
  THEME_PRESETS,
  buildLiveExperience,
  experienceToCelebrationState,
} from './StudioData';
import { CreativeJourneyRail, JourneyStepId } from './CreativeJourneyRail';
import { CelebrationLiveCanvas } from './CelebrationLiveCanvas';
import { StudioEditorSidebar } from './StudioEditorSidebar';
import { PublishCelebrationModal } from './PublishCelebrationModal';
import { FullGuestPreviewModal } from './FullGuestPreviewModal';
import {
  Monitor,
  Tablet,
  Smartphone,
  Eye,
  Rocket,
  Sparkles,
  Maximize,
  Minimize,
  Edit3,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export function CelebrationStudio() {
  const searchParams = useSearchParams();
  const initialFocus = searchParams.get('focus') === 'true';
  const initialStep = (searchParams.get('step') as JourneyStepId) || 'beginning';
  const editSlugOrId = searchParams.get('edit') || searchParams.get('slug') || searchParams.get('id');
  const themeParam = searchParams.get('theme') || searchParams.get('template');
  const occasionParam = searchParams.get('occasion');

  const weddingPreset = OCCASION_PRESETS['wedding'];

  const [state, setState] = useState<CelebrationState>({
    occasion: 'wedding',
    theme: (themeParam && themeParam in THEME_PRESETS ? themeParam : 'royal-regalia') as ThemeType,
    title: 'Aarav & Meera Wedding Celebration',
    protagonist1: weddingPreset.defaultProtagonist1,
    protagonist1Role: weddingPreset.defaultProtagonist1Role,
    protagonist1Bio: 'Architect, heritage enthusiast, and classical guitarist.',
    protagonist1Image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=85',
    protagonist1Vow: '“In you, I discovered the steadfast constellation that guides every horizon I will ever seek.”',
    protagonist2: weddingPreset.defaultProtagonist2,
    protagonist2Role: weddingPreset.defaultProtagonist2Role,
    protagonist2Bio: 'Classical Kathak dancer, wildlife conservationist, and book lover.',
    protagonist2Image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=85',
    protagonist2Vow: '“Beside you, silence feels like music and the future feels like returning home.”',
    unionDeclaration: 'Two independent trajectories drawn across infinite space by gravitational destiny — merging into one eternal, harmonic constellation.',
    tagline: weddingPreset.defaultTagline,
    date: '2027-02-18',
    time: '06:00 PM IST',
    venueName: weddingPreset.defaultVenue,
    venueAddress: 'Circuit House Rd, Cantt Area, Jodhpur, Rajasthan 342006',
    city: weddingPreset.defaultCity,
    stateCountry: 'Rajasthan, India',
    guestCountTarget: 150,
    additionalLocations: [
      {
        id: 'loc-1',
        name: 'Baradari Lawns & Pavilion',
        address: 'Palace Central Gardens, East Wing',
        note: 'Golf cart shuttles from main portico',
      },
      {
        id: 'loc-2',
        name: 'Zenana Courtyard & Stepwell',
        address: 'Inner Heritage Courtyard',
        note: 'Valet parking available at Gate 2',
      },
    ],
    storyQuote: weddingPreset.defaultQuote,
    storyBody: weddingPreset.defaultStory,
    itinerary: weddingPreset.itinerary,
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
    rsvpDeadline: '10 January 2027',
    allowPlusOnes: 'yes',
    enableDietary: true,
    upiId: 'aarav.meera@okhdfcbank',
    shagunAmounts: [1001, 2100, 5100, 11000],
    hasPasscodeProtection: false,
    passcode: '2027',
    previewMode: 'experience',
    monogramInitials: 'A & M',
    monogramStyle: 'arch',
    monogramImage: '',
    coverImage: 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=1200&q=80',
    isSingleCelebrant: false,
    editingExperienceId: editSlugOrId || undefined,
    editingSlug: editSlugOrId || undefined,
  });

  const [activeStep, setActiveStep] = useState<JourneyStepId>(initialStep);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(initialFocus);
  const [viewport, setViewport] = useState<ViewportMode>('desktop');
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [jumpTrigger, setJumpTrigger] = useState<string | undefined>(undefined);
  const [isLoadingExisting, setIsLoadingExisting] = useState<boolean>(!!editSlugOrId);

  // Load existing experience when editSlugOrId is passed in URL
  useEffect(() => {
    if (editSlugOrId && typeof window !== 'undefined') {
      setIsLoadingExisting(true);
      // 1. Try local storage cache
      const cached = localStorage.getItem(`orbitox_exp_${editSlugOrId}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.title) {
            setState(experienceToCelebrationState(parsed));
            setIsLoadingExisting(false);
          }
        } catch (e) {
          console.warn('Could not parse cached experience:', e);
        }
      }

      // 2. Query API for source of truth
      fetch(`/api/experiences?slug=${encodeURIComponent(editSlugOrId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.experience) {
            setState(experienceToCelebrationState(data.experience));
          }
        })
        .catch((err) => {
          console.warn('Failed to load experience for edit:', err);
        })
        .finally(() => {
          setIsLoadingExisting(false);
        });
    } else if (themeParam && themeParam in THEME_PRESETS) {
      setState((prev) => ({ ...prev, theme: themeParam as ThemeType }));
    }
  }, [editSlugOrId, themeParam]);

  // Construct live experience object
  const liveExperience = useMemo(() => {
    return buildLiveExperience(state);
  }, [state]);

  // Real-time synchronization to localStorage so /e/preview works instantly
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const payload = JSON.stringify(liveExperience);
        localStorage.setItem('orbitox_exp_preview', payload);
        localStorage.setItem('orbitox_exp_live-studio-preview', payload);
        if (state.editingSlug) {
          localStorage.setItem(`orbitox_exp_${state.editingSlug}`, payload);
        }
      } catch (e) {
        console.warn('Could not sync draft to localStorage:', e);
      }
    }
  }, [liveExperience, state.editingSlug]);

  // Auto-save feedback loop simulation
  const handleStateChange = (patch: Partial<CelebrationState>) => {
    setSaveStatus('saving');
    setState((prev) => ({ ...prev, ...patch }));
    setTimeout(() => {
      setSaveStatus('saved');
    }, 200);
  };

  // Keyboard shortcuts (Cmd+S to save, Esc to exit full preview or close sheet, F for focus mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        setSaveStatus('saving');
        setTimeout(() => setSaveStatus('saved'), 200);
      }
      if (e.key === 'Escape') {
        if (isFullPreviewOpen) {
          setIsFullPreviewOpen(false);
        }
      }
      // 'f' key shortcut for focus mode when not inside an input
      if (e.key === 'f' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        setIsFocusMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullPreviewOpen]);

  return (
    <div className="cs-workspace">
      {/* ─── QUIET PROFESSIONAL TOP BAR ─── */}
      <header className="cs-topbar">
        {/* Left: Brand & Active Celebration Title */}
        <div className="cs-topbar-left">
          <Link href="/" className="cs-brand-link" title="Return to Celebrations platform">
            <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.02em', color: '#ffffff' }}>Celebrations</span>
          </Link>

          <span className="cs-topbar-sep" />

          <div className="cs-celebration-title-group">
            <span className="cs-celebration-name">
              {state.protagonist1} {state.protagonist2 && `& ${state.protagonist2}`}
            </span>
            <span className="cs-celebration-tag">• {state.occasion} Atelier</span>
            {state.editingSlug && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: 'rgba(251, 191, 36, 0.15)',
                  color: '#fbbf24',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  marginLeft: 4,
                }}
              >
                <Edit3 size={10} />
                <span>Editing: {state.editingSlug}</span>
              </span>
            )}
            {state.editingSlug && (
              <Link
                href="/create"
                style={{
                  fontSize: 10,
                  color: '#a1a1aa',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  textDecoration: 'none',
                  marginLeft: 6,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: 'rgba(255, 255, 255, 0.05)',
                }}
                title="Start a new celebration"
              >
                <Plus size={10} />
                <span>New</span>
              </Link>
            )}
          </div>

          <div className="cs-save-status">
            <span
              className={`cs-save-indicator ${saveStatus === 'saving' ? 'saving' : ''}`}
            />
            <span>{saveStatus === 'saving' ? 'Saving...' : 'Saved'}</span>
          </div>
        </div>

        {/* Center: Viewport Mode Switcher */}
        <div className="cs-viewport-switcher">
          <button
            type="button"
            onClick={() => setViewport('desktop')}
            className={`cs-viewport-btn ${viewport === 'desktop' ? 'active' : ''}`}
            title="Desktop Viewport"
          >
            <Monitor size={13} />
            <span>Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setViewport('tablet')}
            className={`cs-viewport-btn ${viewport === 'tablet' ? 'active' : ''}`}
            title="Tablet Viewport"
          >
            <Tablet size={13} />
            <span>Tablet</span>
          </button>
          <button
            type="button"
            onClick={() => setViewport('mobile')}
            className={`cs-viewport-btn ${viewport === 'mobile' ? 'active' : ''}`}
            title="Mobile Viewport"
          >
            <Smartphone size={13} />
            <span>Mobile</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="cs-topbar-right">
          {/* Focus Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsFocusMode(!isFocusMode)}
            style={{
              background: isFocusMode ? 'rgba(251, 191, 36, 0.12)' : 'rgba(255, 255, 255, 0.04)',
              color: isFocusMode ? '#fbbf24' : '#a1a1aa',
              border: isFocusMode ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
              padding: '6px 11px',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
            title={isFocusMode ? 'Exit Focus Mode (F)' : 'Enter Canvas Focus Mode (F)'}
          >
            {isFocusMode ? <Minimize size={13} /> : <Maximize size={13} />}
            <span>{isFocusMode ? 'Exit Focus' : 'Focus Mode'}</span>
          </button>

          {/* Full Immersion Guest View Button */}
          <button
            type="button"
            onClick={() => setIsFullPreviewOpen(true)}
            className="cs-btn-ghost"
            title="Open Full Immersion Guest View"
          >
            <Eye size={13} />
            <span>Guest View</span>
          </button>

          {/* Publish Button */}
          <button
            type="button"
            onClick={() => setIsPublishModalOpen(true)}
            className="cs-btn-publish-milestone"
          >
            <Rocket size={13} />
            <span>Publish</span>
          </button>
        </div>
      </header>

      {/* ─── ATELIER 3-ZONE WORKSPACE BODY ─── */}
      <div className="cs-workspace-body">
        {/* Left: Creative Journey Navigation (Collapsible in Focus Mode) */}
        <CreativeJourneyRail
          activeStep={activeStep}
          onSelectStep={(stepId) => {
            setActiveStep(stepId);
            setJumpTrigger(`${stepId}-${Date.now()}`);
          }}
          state={state}
          isCollapsed={isFocusMode}
          onToggleCollapse={() => setIsFocusMode(!isFocusMode)}
          onOpenPreview={() => setIsFullPreviewOpen(true)}
          onOpenPublish={() => setIsPublishModalOpen(true)}
        />

        {/* Center: Dominant Live Celebration Canvas */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden',
            position: 'relative',
            width: '100%',
          }}
        >
          <CelebrationLiveCanvas
            state={state}
            onChange={handleStateChange}
            viewport={viewport}
            activeStep={activeStep}
            jumpTrigger={jumpTrigger}
            onSelectStep={(step) => setActiveStep(step)}
            onOpenFullPreview={() => setIsFullPreviewOpen(true)}
          />
        </main>

        {/* Right: Beautiful Professional Editor Sidebar */}
        {!isFocusMode && (
          <StudioEditorSidebar
            activeStep={activeStep}
            onSelectStep={(stepId) => {
              setActiveStep(stepId);
              setJumpTrigger(`${stepId}-${Date.now()}`);
            }}
            state={state}
            onChange={handleStateChange}
            saveStatus={saveStatus}
          />
        )}
      </div>

      {/* Full Immersion Guest Preview Modal */}
      <FullGuestPreviewModal
        isOpen={isFullPreviewOpen}
        onClose={() => setIsFullPreviewOpen(false)}
        experience={liveExperience}
        themeSlug={state.theme}
      />

      {/* Publish Celebration Launch Modal */}
      <PublishCelebrationModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        state={state}
      />
    </div>
  );
}
