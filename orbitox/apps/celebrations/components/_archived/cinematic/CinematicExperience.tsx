'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  DEFAULT_OCCASIONS,
  DEFAULT_THEMES,
  Occasion,
  Theme,
  Experience,
  ExperienceSection,
} from '@orbitox-io/celebrations';
import { Sparkles, Eye, Volume2, VolumeX, Feather } from 'lucide-react';
import { atelierSoundscape } from '@/lib/atelier-soundscape';
import { useScrollEngine } from '@/hooks/useScrollEngine';
import { ParallaxAtmosphere } from './ParallaxAtmosphere';
import { CursorFollower } from './CursorFollower';
import { ChapterCompass } from './ChapterCompass';
import { Scene01_Threshold } from './Scene01_Threshold';
import { Scene02_Occasion } from './Scene02_Occasion';
import { Scene03_Atmosphere } from './Scene03_Atmosphere';
import { Scene04_Protagonists } from './Scene04_Protagonists';
import { Scene05_Horizon } from './Scene05_Horizon';
import { Scene06_Narrative } from './Scene06_Narrative';
import { Scene07_Reveal } from './Scene07_Reveal';
import { Scene08_Seal } from './Scene08_Seal';
import { ExperienceView } from '@/components/renderer/ExperienceView';

interface CinematicExperienceProps {
  initialOccasionSlug?: string;
  initialThemeSlug?: string;
}

export const CinematicExperience: React.FC<CinematicExperienceProps> = ({
  initialOccasionSlug,
  initialThemeSlug,
}) => {
  const scrollEngine = useScrollEngine();

  // 1. Initial Occasions & Themes
  const fallbackOccasion = DEFAULT_OCCASIONS[0]!;
  const fallbackTheme = DEFAULT_THEMES[0]!;

  const resolvedOccasion: Occasion = useMemo(() => {
    if (initialOccasionSlug) {
      const found = DEFAULT_OCCASIONS.find((o) => o.slug === initialOccasionSlug);
      if (found) return found;
    }
    return fallbackOccasion;
  }, [initialOccasionSlug, fallbackOccasion]);

  const resolvedTheme: Theme = useMemo(() => {
    if (initialThemeSlug) {
      const found = DEFAULT_THEMES.find((t) => t.slug === initialThemeSlug);
      if (found) return found;
    }
    const matched = DEFAULT_THEMES.find((t) => t.occasionSlug === resolvedOccasion.slug);
    return matched || fallbackTheme;
  }, [initialThemeSlug, resolvedOccasion.slug, fallbackTheme]);

  // 2. Atelier Live State
  const [selectedOccasion, setSelectedOccasion] = useState<Occasion>(resolvedOccasion);
  const [selectedTheme, setSelectedTheme] = useState<Theme>(resolvedTheme);
  const [names, setNames] = useState<string>('Vikram & Ananya');
  const [eventDate, setEventDate] = useState<string>('2027-02-18');
  const [venueName, setVenueName] = useState<string>('Lake Palace, Udaipur');
  const [storyQuote, setStoryQuote] = useState<string>(
    'Two lives, two hearts, joined together in friendship and united forever in love.'
  );
  const [heroImage, setHeroImage] = useState<string>(
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80'
  );

  // Experience & UI Controls
  const [isGuestPreviewActive, setIsGuestPreviewActive] = useState<boolean>(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isCalmMode, setIsCalmMode] = useState<boolean>(false);
  const [isWaxSealed, setIsWaxSealed] = useState<boolean>(false);

  // Audio mute handler
  const handleToggleAudio = () => {
    const nextMuted = atelierSoundscape.toggleMute();
    setIsAudioMuted(nextMuted);
  };

  // Construct full experience for live guest immersion view
  const fullExperience: Experience = useMemo(() => {
    const slugName = names
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'celebration';
    const slug = `${slugName}-${selectedOccasion.slug}`;

    const sections: ExperienceSection[] = [
      {
        id: 'sec_hero',
        sectionType: 'hero',
        title: names,
        subtitle: `${selectedOccasion.name} Celebration`,
        order: 1,
        isEnabled: true,
        config: {
          backgroundImageUrl: heroImage,
          tagline: storyQuote,
        },
      },
      {
        id: 'sec_countdown',
        sectionType: 'countdown',
        title: 'Until We Gather',
        order: 2,
        isEnabled: true,
        config: {
          targetDate: eventDate,
        },
      },
      {
        id: 'sec_story',
        sectionType: 'story',
        title: 'Our Journey',
        order: 3,
        isEnabled: true,
        config: {
          narrative: storyQuote,
        },
      },
      {
        id: 'sec_venue',
        sectionType: 'venue_map',
        title: 'Sanctuary & Coordinates',
        order: 4,
        isEnabled: true,
        config: {
          venueName: venueName,
          address: venueName,
        },
      },
      {
        id: 'sec_rsvp',
        sectionType: 'rsvp',
        title: 'Kindly Respond',
        order: 5,
        isEnabled: true,
        config: {
          deadlineDate: eventDate,
        },
      },
      {
        id: 'sec_wishes',
        sectionType: 'wishes_guestbook',
        title: 'Blessings & Warm Wishes',
        order: 6,
        isEnabled: true,
        config: {},
      },
    ];

    return {
      id: 'exp_live_atelier',
      tenantId: 'tenant_default',
      title: `${names} — ${selectedOccasion.name}`,
      slug: slug,
      occasionId: selectedOccasion.id,
      occasionSlug: selectedOccasion.slug,
      themeId: selectedTheme.id,
      themeSlug: selectedTheme.slug,
      templateSlug: selectedTheme.slug,
      status: 'PUBLISHED',
      eventDate: eventDate,
      sections,
      featuresEnabled: selectedOccasion.allowedFeatures,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [names, selectedOccasion, selectedTheme, eventDate, venueName, storyQuote, heroImage]);

  return (
    <div className="cinematic-stage">
      {/* 1. Multi-layer Fixed Parallax Atmosphere */}
      <ParallaxAtmosphere
        activeScene={scrollEngine.activeScene}
        selectedTheme={selectedTheme}
        selectedOccasion={selectedOccasion}
        isCalmMode={isCalmMode || scrollEngine.prefersReducedMotion}
      />

      {/* 2. Magnetic Cursor Follower (Desktop Only) */}
      <CursorFollower />

      {/* 3. Haute Luxury Top Navigation */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 72,
          padding: '0 clamp(16px, 4vw, 36px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 90,
          background: 'linear-gradient(180deg, rgba(6,7,10,0.85) 0%, rgba(6,7,10,0) 100%)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #F5D061, #D4AF37 60%, #997B24 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#07090D',
              boxShadow: '0 0 15px rgba(212, 175, 55, 0.4)',
            }}
          >
            <Sparkles size={16} />
          </span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: '0.12em',
                color: '#FAF8F5',
                textTransform: 'uppercase',
              }}
            >
              Celebrations
            </span>
            <span
              style={{
                fontSize: 9,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: '#D4AF37',
                fontWeight: 700,
              }}
            >
              Cinematic Motion Atelier
            </span>
          </div>
        </div>

        {/* Top Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            href="/dashboard"
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'rgba(245, 247, 251, 0.7)',
              padding: '6px 14px',
              borderRadius: 8,
              transition: 'color 0.2s ease',
            }}
          >
            Dashboard
          </Link>

          <button
            type="button"
            onClick={() => {
              atelierSoundscape.playHarpArpeggio();
              setIsGuestPreviewActive(!isGuestPreviewActive);
            }}
            data-cursor="PREVIEW"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 16px',
              borderRadius: 999,
              background: isGuestPreviewActive ? '#FAF8F5' : 'rgba(212, 175, 55, 0.16)',
              border: isGuestPreviewActive
                ? '1px solid #FAF8F5'
                : '1px solid rgba(212, 175, 55, 0.35)',
              color: isGuestPreviewActive ? '#090B10' : '#F5D061',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.25s ease',
            }}
          >
            <Eye size={13} />
            <span className="hide-on-mobile">
              {isGuestPreviewActive ? 'Exit Preview' : 'Live Guest View'}
            </span>
          </button>
        </div>
      </header>

      {/* 4. Sequential Scroll Journey (Scenes 1 - 8) */}
      <main>
        {/* Scene 01: Threshold (QUIET → CURIOUS) */}
        <Scene01_Threshold
          onBeginClick={() => scrollEngine.scrollToScene(2)}
          isCalmMode={isCalmMode || scrollEngine.prefersReducedMotion}
        />

        {/* Scene 02: Occasion Discovery (CURIOUS → ACTIVE) */}
        <Scene02_Occasion
          selectedOccasion={selectedOccasion}
          onSelectOccasion={(occ) => setSelectedOccasion(occ)}
          onNextScene={() => scrollEngine.scrollToScene(3)}
          isCalmMode={isCalmMode || scrollEngine.prefersReducedMotion}
        />

        {/* Scene 03: Atmosphere Worlds (ACTIVE → WOW) */}
        <Scene03_Atmosphere
          selectedTheme={selectedTheme}
          onSelectTheme={(t) => setSelectedTheme(t)}
          onNextScene={() => scrollEngine.scrollToScene(4)}
          isCalmMode={isCalmMode || scrollEngine.prefersReducedMotion}
        />

        {/* Scene 04: Protagonists (WOW → QUIET) */}
        <Scene04_Protagonists
          names={names}
          onNamesChange={(val) => setNames(val)}
          onNextScene={() => scrollEngine.scrollToScene(5)}
          isCalmMode={isCalmMode || scrollEngine.prefersReducedMotion}
        />

        {/* Scene 05: Horizon (QUIET → EMOTIONAL) */}
        <Scene05_Horizon
          names={names}
          eventDate={eventDate}
          venueName={venueName}
          onEventDateChange={(val) => setEventDate(val)}
          onVenueNameChange={(val) => setVenueName(val)}
          onNextScene={() => scrollEngine.scrollToScene(6)}
          isCalmMode={isCalmMode || scrollEngine.prefersReducedMotion}
        />

        {/* Scene 06: Narrative (EMOTIONAL sustained) */}
        <Scene06_Narrative
          storyQuote={storyQuote}
          heroImage={heroImage}
          onStoryQuoteChange={(val) => setStoryQuote(val)}
          onHeroImageChange={(val) => setHeroImage(val)}
          onNextScene={() => scrollEngine.scrollToScene(7)}
          isCalmMode={isCalmMode || scrollEngine.prefersReducedMotion}
        />

        {/* Scene 07: The Reveal (QUIET → WOW) */}
        <Scene07_Reveal
          names={names}
          occasion={selectedOccasion}
          theme={selectedTheme}
          eventDate={eventDate}
          venueName={venueName}
          storyQuote={storyQuote}
          heroImage={heroImage}
          onOpenGuestPreview={() => setIsGuestPreviewActive(true)}
          onNextScene={() => scrollEngine.scrollToScene(8)}
          isCalmMode={isCalmMode || scrollEngine.prefersReducedMotion}
        />

        {/* Scene 08: Seal & Launch (WOW → FINAL) */}
        <Scene08_Seal
          names={names}
          isWaxSealed={isWaxSealed}
          onAffixSeal={() => setIsWaxSealed(true)}
          onResetExperience={() => {
            setIsWaxSealed(false);
            scrollEngine.scrollToScene(1);
          }}
          isCalmMode={isCalmMode || scrollEngine.prefersReducedMotion}
        />
      </main>

      {/* 5. Scroll-Aware Chapter Compass */}
      <ChapterCompass
        activeScene={scrollEngine.activeScene}
        scrollProgress={scrollEngine.scrollProgress}
        onScrollToScene={(sceneNum) => scrollEngine.scrollToScene(sceneNum)}
        onToggleGuestPreview={() => setIsGuestPreviewActive(!isGuestPreviewActive)}
        isGuestPreviewActive={isGuestPreviewActive}
        isAudioMuted={isAudioMuted}
        onToggleAudio={handleToggleAudio}
        isCalmMode={isCalmMode}
        onToggleCalmMode={() => setIsCalmMode(!isCalmMode)}
      />

      {/* 6. Full Guest Experience Immersion Modal */}
      {isGuestPreviewActive && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: '#07090E',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              position: 'fixed',
              top: 20,
              right: 20,
              zIndex: 1010,
            }}
          >
            <button
              type="button"
              onClick={() => setIsGuestPreviewActive(false)}
              style={{
                padding: '10px 22px',
                borderRadius: 999,
                background: '#090B10',
                border: '1.5px solid #D4AF37',
                color: '#F5D061',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8)',
              }}
            >
              ← Return to Cinematic Atelier
            </button>
          </div>
          <ExperienceView experience={fullExperience} theme={selectedTheme} />
        </div>
      )}
    </div>
  );
};
