'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Experience,
  Theme,
  DEFAULT_THEMES,
  DEFAULT_OCCASIONS,
} from '@orbitox-io/celebrations';
import { Lock, Crown, Loader2, ShieldAlert } from 'lucide-react';
import { MusicPlayer } from './sections/MusicPlayer';
import { SectionRenderer } from './SectionRenderer';
import { SurrealOrganimoExperience } from './templates/organimo/SurrealOrganimoExperience';
import { RoyalRegaliaExperience } from './templates/regalia/RoyalRegaliaExperience';
import { MinimalEditorialExperience } from './templates/editorial/MinimalEditorialExperience';
import { PartyNocturneExperience } from './templates/nocturne/PartyNocturneExperience';
import { RomanticDoorsExperience } from './templates/doors/RomanticDoorsExperience';
import { EnchantedGlasshouseExperience } from './templates/glasshouse/EnchantedGlasshouseExperience';
import { AmalfiRivieraExperience } from './templates/amalfi/AmalfiRivieraExperience';
import { CelestialParallaxExperience } from './templates/celestial/CelestialParallaxExperience';
import { CelestialOdysseyExperience } from './templates/celestial-odyssey/CelestialOdysseyExperience';
import { WelcomeDoorDispatcher } from './doors/WelcomeDoorDispatcher';
import { UnifiedSceneRenderer } from './UnifiedSceneRenderer';
import { BUILTIN_SCHEMAS } from '../template-studio/schema/builtin-schemas';
import { DeviceBreakpoint } from '../template-studio/types/TemplateSchema';
import type { CelebrationState } from '../studio/StudioData';

interface Props {
  experience: Experience;
  theme?: Theme;
}

/**
 * Normalizes template slugs strictly based on universe keywords.
 * Never matches against host names or venue locations.
 */
export function normalizeTemplateSlug(slug?: string): string {
  if (!slug) return 'celestial-parallax';
  const s = slug.toLowerCase().trim();

  if (s === 'celestial-odyssey' || s.includes('odyssey') || s === 'celestial-world' || s.includes('constellation')) {
    return 'celestial-odyssey';
  }
  if (s === 'celestial-parallax' || s.includes('celestial') || s.includes('parallax')) {
    return 'celestial-parallax';
  }
  if (s === 'amalfi-riviera' || s.includes('amalfi') || s.includes('riviera')) {
    return 'amalfi-riviera';
  }
  if (s === 'royal-regalia' || s.includes('regalia') || s.includes('royal')) {
    return 'royal-regalia';
  }
  if (s === 'enchanted-glasshouse' || s.includes('glasshouse') || s.includes('botanical')) {
    return 'enchanted-glasshouse';
  }
  if (s === 'party-nocturne' || s.includes('nocturne') || s.includes('party')) {
    return 'party-nocturne';
  }
  if (s === 'minimal-editorial' || s.includes('editorial') || s.includes('minimal')) {
    return 'minimal-editorial';
  }
  if (s === 'romantic-doors' || s.includes('doors') || s.includes('romantic')) {
    return 'romantic-doors';
  }
  if (s === 'surreal-organimo' || s.includes('organimo') || s.includes('surreal')) {
    return 'surreal-organimo';
  }
  return s;
}

/**
 * High-definition luxury ambient audio streams tailored per universe.
 */
const TEMPLATE_AUDIO_PRESETS: Record<string, { url: string; title: string; artist: string }> = {
  'celestial-odyssey': {
    url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=celestial-ambient-110241.mp3',
    title: 'Celestial Odyssey Orchestral Symphony',
    artist: 'Symphonic Strings & Harp',
  },
  'celestial-parallax': {
    url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=celestial-ambient-110241.mp3',
    title: 'Celestial Orchestral Symphony',
    artist: 'Symphonic Strings & Harp',
  },
  'amalfi-riviera': {
    url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=romantic-acoustic-guitar-11059.mp3',
    title: 'Italian Riviera Acoustic',
    artist: 'Nylon Guitar & Coastal Breeze',
  },
  'royal-regalia': {
    url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=baroque-coffee-112191.mp3',
    title: 'Versailles Baroque Waltz',
    artist: 'Chamber Harpsichord & Cello',
  },
  'enchanted-glasshouse': {
    url: 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_22e7d363d6.mp3?filename=relaxing-piano-music-ambient-11456.mp3',
    title: 'Botanical Sanctuary Morning',
    artist: 'Kew Garden Acoustic Suite',
  },
  'party-nocturne': {
    url: 'https://cdn.pixabay.com/download/audio/2022/11/06/audio_c97693cf76.mp3?filename=lounge-relax-126248.mp3',
    title: 'Monaco Midnight Lounge',
    artist: 'Deep Sunset Lounge Beats',
  },
  'minimal-editorial': {
    url: 'https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3?filename=calm-ambient-116035.mp3',
    title: 'Minimalist Editorial Etude',
    artist: 'Contemporary Acoustic Suite',
  },
  'romantic-doors': {
    url: 'https://cdn.pixabay.com/download/audio/2022/05/16/audio_db607a9e04.mp3?filename=warm-memories-111648.mp3',
    title: 'Château de Chantilly Romance',
    artist: 'Classical Strings & Piano',
  },
  'surreal-organimo': {
    url: 'https://cdn.pixabay.com/download/audio/2022/01/26/audio_d0c6ff1101.mp3?filename=ambient-piano-amp-strings-10711.mp3',
    title: 'Surreal Eden Atmosphere',
    artist: 'Bio-Acoustic Harp & Ambient Drone',
  },
};

/**
 * Signature luxury primary accent colors per universe.
 */
const TEMPLATE_ACCENT_COLORS: Record<string, string> = {
  'celestial-parallax': '#E8A598',
  'amalfi-riviera': '#E8B86D',
  'royal-regalia': '#D4AF37',
  'enchanted-glasshouse': '#E2C889',
  'party-nocturne': '#F687B3',
  'minimal-editorial': '#E2E8F0',
  'romantic-doors': '#D69E2E',
  'surreal-organimo': '#4FD1C5',
};

export function ExperienceView({ experience, theme }: Props) {
  // 1. Resolve active template (URL query param takes precedence for live preview testing)
  const resolvedTemplateSlug = useMemo(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTmpl = urlParams.get('template');
      if (urlTmpl) return normalizeTemplateSlug(urlTmpl);
    }
    return normalizeTemplateSlug(experience.templateSlug || 'celestial-parallax');
  }, [experience.templateSlug]);

  // 2. Resolve primary accent color and effective styling tokens
  const primaryAccent =
    experience.styleOverrides?.primaryColor ||
    theme?.styleConfig?.primaryColor ||
    TEMPLATE_ACCENT_COLORS[resolvedTemplateSlug] ||
    '#D4AF37';

  const baseTheme = theme || (DEFAULT_THEMES[0] as Theme);

  const effectiveTheme: Theme = useMemo(() => {
    return {
      ...baseTheme,
      id: `theme_${resolvedTemplateSlug}`,
      name: `${resolvedTemplateSlug} Aesthetic`,
      slug: resolvedTemplateSlug,
      tier: 'PRO',
      styleConfig: {
        ...baseTheme.styleConfig,
        primaryColor: primaryAccent,
        secondaryColor: '#FFFFFF',
        backgroundColor: '#07090E',
        textColor: '#FFFFFF',
        cardBackgroundColor: 'rgba(255, 255, 255, 0.05)',
        accentColor: primaryAccent,
        fontHeading: "'Cinzel', serif",
        fontBody: "'Outfit', sans-serif",
        ...(theme?.styleConfig || {}),
        ...(experience.styleOverrides || {}),
      },
    };
  }, [baseTheme, resolvedTemplateSlug, primaryAccent, theme, experience.styleOverrides]);

  // Responsive Device Breakpoint Detection (P14-F)
  const [device, setDevice] = useState<DeviceBreakpoint>('desktop');
  useEffect(() => {
    const updateDevice = () => {
      const width = window.innerWidth;
      if (width < 640) setDevice('mobile');
      else if (width < 1024) setDevice('tablet');
      else setDevice('desktop');
    };
    updateDevice();
    window.addEventListener('resize', updateDevice);
    return () => window.removeEventListener('resize', updateDevice);
  }, []);

  // 3. Security / Passcode Gate State
  const [unlocked, setUnlocked] = useState(!experience.passwordProtection);
  const [enteredPasscode, setEnteredPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number>(0);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // 4. Welcome Door Entry State (Respects featuresEnabled and ?door=false)
  const isDoorFeatureEnabled = (experience.featuresEnabled
    ? experience.featuresEnabled.includes('welcome_door_entry')
    : true) && (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('door') !== 'false');
  const [showWelcomeDoor, setShowWelcomeDoor] = useState(isDoorFeatureEnabled);

  // Rate-limiting countdown timer for brute-force protection
  useEffect(() => {
    if (lockoutUntil <= Date.now()) {
      setCooldownSeconds(0);
      return;
    }

    setCooldownSeconds(Math.ceil((lockoutUntil - Date.now()) / 1000));
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockoutUntil(0);
        setCooldownSeconds(0);
        setErrorMsg('');
        clearInterval(interval);
      } else {
        setCooldownSeconds(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutUntil]);

  // Sort sections by sequence order
  const sortedSections = useMemo(() => {
    return [...(experience.sections || [])].sort((a, b) => a.order - b.order);
  }, [experience.sections]);

  // Extract individual sections
  const heroSection = sortedSections.find((s) => s.sectionType === 'hero');
  const heroConfig = (heroSection?.config || {}) as Record<string, any>;

  const coupleSection = sortedSections.find(
    (s) => s.sectionType === 'couple_profile' || s.sectionType === 'person_profile'
  );
  const coupleConfig = (coupleSection?.config || {}) as Record<string, any>;

  const venueSection = sortedSections.find((s) => s.sectionType === 'venue_map');
  const venueConfig = (venueSection?.config || {}) as Record<string, any>;

  const storySection = sortedSections.find((s) => s.sectionType === 'story');
  const storyConfig = (storySection?.config || {}) as Record<string, any>;

  const eventsSection = sortedSections.find((s) => s.sectionType === 'events_schedule');
  const eventsConfig = (eventsSection?.config || {}) as Record<string, any>;

  const countdownSection = sortedSections.find((s) => s.sectionType === 'countdown');
  const countdownConfig = (countdownSection?.config || {}) as Record<string, any>;

  const musicSection = sortedSections.find((s) => s.sectionType === 'music_player' && s.isEnabled);
  const musicConfig = (musicSection?.config || {}) as Record<string, any>;

  // ─────────────────────────────────────────────────────────────
  // 5. DEEP CELEBRATION DATA EXTRACTION
  // ─────────────────────────────────────────────────────────────

  // A. Host & Couple Names (checks couple_profile, heroConfig, and cleaned title)
  const p1 = (coupleConfig.partner1Name as string)?.trim();
  const p2 = (coupleConfig.partner2Name as string)?.trim();
  const coupleProfileNames = p1 && p2 ? `${p1} & ${p2}` : p1 || undefined;

  const heroHostNames =
    (heroConfig.hostNames as string)?.trim() ||
    (heroConfig.coupleNames as string)?.trim();

  const titleExtractedNames = experience.title
    ? experience.title
        .replace(/\s*(Wedding|Celebration|Anniversary|Birthday|Gala|Reception|Soirée|Party|Ceremony).*$/i, '')
        .trim()
    : undefined;

  const doorTitle =
    coupleProfileNames ||
    heroHostNames ||
    titleExtractedNames ||
    experience.title ||
    'Guest of Honor';

  // B. Occasion & Subtitle
  const occasionDef = DEFAULT_OCCASIONS.find((o) => o.slug === experience.occasionSlug);
  const occasionDisplayName =
    occasionDef?.name ||
    (experience.occasionSlug
      ? experience.occasionSlug.charAt(0).toUpperCase() + experience.occasionSlug.slice(1)
      : undefined) ||
    experience.occasionType;

  const doorSubtitle =
    (heroConfig.subheadline as string)?.trim() ||
    (heroConfig.headline as string)?.trim() ||
    (storyConfig.subtitle as string)?.trim() ||
    (occasionDisplayName ? `${occasionDisplayName} Celebration` : undefined) ||
    'An Exclusive Celebration Experience';

  // C. Event Date (Formatted)
  const rawEventDate =
    (heroConfig.eventDate as string)?.trim() ||
    (countdownConfig.targetDate as string)?.split('T')[0]?.trim() ||
    (experience.eventDate as string)?.trim();

  let doorDate = rawEventDate || 'Special Date';
  if (rawEventDate && /^\d{4}-\d{2}-\d{2}/.test(rawEventDate)) {
    try {
      const d = new Date(rawEventDate);
      if (!isNaN(d.getTime())) {
        doorDate = d.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      }
    } catch {
      doorDate = rawEventDate;
    }
  }

  // D. Event Venue (checks venue_map, hero, first event, then signature universe destination)
  const venueMapName = (venueConfig.venueName as string)?.trim();
  const venueMapCity = (venueConfig.venueCity as string)?.trim();
  const venueMapAddress = (venueConfig.address as string)?.trim();

  const heroVenueName = (heroConfig.venueName as string)?.trim();
  const heroVenueCity = (heroConfig.venueCity as string)?.trim();

  const firstEventVenue = (eventsConfig.events as Array<{ venue?: string }>)?.[0]?.venue?.trim();

  let doorVenue = '';
  if (venueMapName && venueMapCity) {
    doorVenue = `${venueMapName}, ${venueMapCity}`;
  } else if (venueMapName || venueMapCity || venueMapAddress) {
    doorVenue = venueMapName || venueMapCity || venueMapAddress || '';
  } else if (heroVenueName && heroVenueCity) {
    doorVenue = `${heroVenueName}, ${heroVenueCity}`;
  } else if (heroVenueName || heroVenueCity) {
    doorVenue = heroVenueName || heroVenueCity || '';
  } else if (firstEventVenue) {
    doorVenue = firstEventVenue;
  } else {
    doorVenue =
      resolvedTemplateSlug === 'amalfi-riviera' ? 'Ravello, Amalfi Coast, Italy' :
      resolvedTemplateSlug === 'celestial-parallax' ? 'Lake Como, Italy' :
      resolvedTemplateSlug === 'enchanted-glasshouse' ? 'Kew Gardens, London' :
      resolvedTemplateSlug === 'royal-regalia' ? 'Château de Versailles, Paris' :
      resolvedTemplateSlug === 'party-nocturne' ? 'Hotel de Paris, Monaco' :
      resolvedTemplateSlug === 'romantic-doors' ? 'Château de Chantilly, France' :
      'Grand Destination';
  }

  // E. Soundtrack Resolution
  const fallbackAudio = TEMPLATE_AUDIO_PRESETS['celestial-parallax']!;
  const universeAudioPreset =
    TEMPLATE_AUDIO_PRESETS[resolvedTemplateSlug] || fallbackAudio;

  const audioUrl =
    (musicConfig.audioUrl as string)?.trim() ||
    (experience.metadata?.audioUrl as string)?.trim() ||
    universeAudioPreset.url;

  const trackTitle =
    (musicConfig.trackTitle as string)?.trim() ||
    (experience.metadata?.trackTitle as string)?.trim() ||
    universeAudioPreset.title;

  const artistName =
    (musicConfig.artistName as string)?.trim() ||
    (experience.metadata?.artistName as string)?.trim() ||
    universeAudioPreset.artist;

  const hasMusic =
    experience.featuresEnabled?.includes('background_music') ||
    Boolean(musicSection) ||
    Boolean((experience.metadata?.audioUrl as string)?.trim());

  // F. Watermark Badge (hidden for VIP / no_watermark tier)
  const hasWatermark = !experience.featuresEnabled?.includes('no_watermark');

  // Strict passcode verification
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying) return;
    if (lockoutUntil > Date.now()) {
      setErrorMsg(`Security lockout active. Please wait ${cooldownSeconds}s.`);
      return;
    }

    const trimmedInput = enteredPasscode.trim();
    if (!trimmedInput) {
      setErrorMsg('Please enter the celebration passcode.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    await new Promise((res) => setTimeout(res, 300));

    const targetPass = experience.passwordHash?.trim();
    const isMatch = Boolean(targetPass && trimmedInput === targetPass);

    if (isMatch) {
      setUnlocked(true);
      setErrorMsg('');
      setFailedAttempts(0);
      setIsVerifying(false);
    } else {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      setIsVerifying(false);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);

      if (nextAttempts >= 5) {
        const lockoutEnd = Date.now() + 30000;
        setLockoutUntil(lockoutEnd);
        setCooldownSeconds(30);
        setErrorMsg('Too many failed attempts. Security lockout active for 30s.');
        setEnteredPasscode('');
      } else {
        const remaining = 5 - nextAttempts;
        setErrorMsg(`Incorrect passcode. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining.`);
      }
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 6. PASSWORD LOCK SCREEN
  // ─────────────────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#07090E',
          color: '#FFFFFF',
          padding: '24px',
        }}
      >
        <div
          className={isShaking ? 'shake-animation' : ''}
          style={{
            maxWidth: '420px',
            width: '100%',
            background: 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${primaryAccent}44`,
            borderRadius: '24px',
            padding: '44px 32px',
            textAlign: 'center',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            transition: 'border-color 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: cooldownSeconds > 0 ? 'rgba(239, 68, 68, 0.15)' : `${primaryAccent}22`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: cooldownSeconds > 0 ? '#EF4444' : primaryAccent,
                transition: 'all 0.3s ease',
              }}
            >
              {cooldownSeconds > 0 ? <ShieldAlert size={28} /> : <Lock size={28} />}
            </div>
          </div>
          <h2
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '1.75rem',
              color: primaryAccent,
              marginBottom: '10px',
              letterSpacing: '1px',
            }}
          >
            Private Celebration
          </h2>
          <p
            style={{
              fontSize: '0.9rem',
              color: '#94A3B8',
              marginBottom: '28px',
              lineHeight: 1.6,
            }}
          >
            This celebration is protected by the hosts. Please enter your invitation passcode to proceed.
          </p>

          <form
            onSubmit={handleUnlock}
            aria-label="Celebration passcode entry form"
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <input
              type="password"
              aria-label="Celebration Passcode"
              aria-invalid={Boolean(errorMsg)}
              aria-describedby={errorMsg ? 'passcode-error' : undefined}
              placeholder="Enter passcode"
              value={enteredPasscode}
              disabled={cooldownSeconds > 0 || isVerifying}
              onChange={(e) => setEnteredPasscode(e.target.value)}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: errorMsg ? '1px solid #EF4444' : '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(0, 0, 0, 0.45)',
                color: '#fff',
                textAlign: 'center',
                letterSpacing: '4px',
                fontSize: '1.1rem',
                opacity: cooldownSeconds > 0 ? 0.5 : 1,
                outline: 'none',
              }}
            />

            {errorMsg && (
              <span
                id="passcode-error"
                role="alert"
                aria-live="assertive"
                style={{
                  color: '#EF4444',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {errorMsg}
              </span>
            )}

            <button
              type="submit"
              disabled={cooldownSeconds > 0 || isVerifying}
              style={{
                padding: '13px',
                borderRadius: '12px',
                background: cooldownSeconds > 0 ? 'rgba(255, 255, 255, 0.1)' : primaryAccent,
                color: cooldownSeconds > 0 ? '#94A3B8' : '#07090E',
                fontWeight: 700,
                fontSize: '0.95rem',
                border: 'none',
                cursor: cooldownSeconds > 0 || isVerifying ? 'not-allowed' : 'pointer',
                boxShadow: cooldownSeconds > 0 ? 'none' : `0 4px 16px ${primaryAccent}55`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
            >
              {isVerifying ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Verifying Passcode...</span>
                </>
              ) : cooldownSeconds > 0 ? (
                `Locked (${cooldownSeconds}s)`
              ) : (
                'Enter Celebration →'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 7. BESPOKE UNIVERSES DISPATCHER
  // ─────────────────────────────────────────────────────────────
  // Build complete celebration state for graph-native rendering
  const effectiveCelebrationState: CelebrationState = useMemo(() => {
    return {
      occasion: (experience.occasionSlug || 'wedding') as any,
      theme: resolvedTemplateSlug as any,
      title: experience.title || 'Celebration',
      tagline: doorSubtitle,
      protagonist1: p1 || 'Aarav',
      protagonist1Role: (coupleConfig.partner1Role as string) || 'The Groom',
      protagonist1Bio: (coupleConfig.partner1Bio as string) || '',
      protagonist1Image: (coupleConfig.partner1Image as string) || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=85',
      protagonist1Vow: (coupleConfig.partner1Vow as string) || '',
      protagonist2: p2 || 'Meera',
      protagonist2Role: (coupleConfig.partner2Role as string) || 'The Bride',
      protagonist2Bio: (coupleConfig.partner2Bio as string) || '',
      protagonist2Image: (coupleConfig.partner2Image as string) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=85',
      protagonist2Vow: (coupleConfig.partner2Vow as string) || '',
      unionDeclaration: (coupleConfig.unionDeclaration as string) || (storyConfig.quote as string) || '',
      date: doorDate,
      time: (heroConfig.eventTime as string) || '06:00 PM',
      venueName: doorVenue,
      venueAddress: (venueConfig.address as string) || doorVenue,
      city: venueMapCity || '',
      stateCountry: '',
      guestCountTarget: 150,
      storyQuote: (storyConfig.quote as string) || '',
      storyBody: (storyConfig.storyText as string) || '',
      itinerary: (eventsConfig.events as any[]) || [],
      enableCountdown: Boolean(countdownSection),
      enableCoupleProfile: Boolean(coupleSection),
      enableItinerary: Boolean(eventsSection),
      enableStory: Boolean(storySection),
      enableVenueMap: Boolean(venueSection),
      enableDressCode: true,
      enableGallery: true,
      enableRsvp: true,
      enableShagun: false,
      enableGuestbook: true,
      enableMusic: hasMusic,
      rsvpDeadline: 'December 1, 2026',
      allowPlusOnes: 'yes' as const,
      enableDietary: true,
      upiId: '',
      shagunAmounts: [500, 1100, 2100, 5100],
      hasPasscodeProtection: false,
      passcode: '2026',
      previewMode: 'experience' as const,
      primaryColorOverride: primaryAccent,
    };
  }, [
    experience,
    resolvedTemplateSlug,
    doorSubtitle,
    p1,
    p2,
    coupleConfig,
    storyConfig,
    doorDate,
    heroConfig,
    doorVenue,
    venueConfig,
    venueMapCity,
    eventsConfig,
    countdownSection,
    coupleSection,
    eventsSection,
    storySection,
    venueSection,
    hasMusic,
    primaryAccent,
  ]);

  const isKnownUniverse = [
    'celestial-odyssey',
    'celestial-parallax',
    'amalfi-riviera',
    'royal-regalia',
    'enchanted-glasshouse',
    'party-nocturne',
    'minimal-editorial',
    'romantic-doors',
    'surreal-organimo',
  ].includes(resolvedTemplateSlug);

  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
        backgroundColor: '#07090E',
      }}
    >
      {/* Bespoke Architectural Welcome Door Entry */}
      {showWelcomeDoor && (
        <WelcomeDoorDispatcher
          templateSlug={resolvedTemplateSlug}
          title={doorTitle}
          subtitle={doorSubtitle}
          date={doorDate}
          venue={doorVenue}
          primaryColor={primaryAccent}
          onFinish={() => setShowWelcomeDoor(false)}
        />
      )}

      {/* Dynamic Universe Dispatcher */}
      {(() => {
        const graphSchema = BUILTIN_SCHEMAS[resolvedTemplateSlug];

        // If it's a registered pure Graph-Native template (created without React)
        if (graphSchema && resolvedTemplateSlug !== 'celestial-odyssey') {
          return (
            <main
              className="graph-native-universe"
              style={{
                width: '100%',
                minHeight: '100vh',
                backgroundColor: graphSchema.designTokens?.colors?.backgroundPrimary || '#07090E',
                position: 'relative',
              }}
            >
              {graphSchema.scenes.map((scn) => (
                <div key={scn.id} id={`sec-${scn.id}`} data-scene-id={scn.id}>
                  {scn.sceneGraph ? (
                    <UnifiedSceneRenderer
                      sceneGraph={scn.sceneGraph}
                      device={device}
                      tokens={graphSchema.designTokens!}
                      celebrationState={effectiveCelebrationState}
                    />
                  ) : null}
                </div>
              ))}
            </main>
          );
        }

        if (resolvedTemplateSlug === 'celestial-odyssey') {
          return <CelestialOdysseyExperience experience={experience} theme={effectiveTheme} />;
        }
        if (resolvedTemplateSlug === 'surreal-organimo') {
          return <SurrealOrganimoExperience experience={experience} theme={effectiveTheme} />;
        }
        if (resolvedTemplateSlug === 'royal-regalia') {
          return <RoyalRegaliaExperience experience={experience} theme={effectiveTheme} />;
        }
        if (resolvedTemplateSlug === 'minimal-editorial') {
          return <MinimalEditorialExperience experience={experience} theme={effectiveTheme} />;
        }
        if (resolvedTemplateSlug === 'party-nocturne') {
          return <PartyNocturneExperience experience={experience} theme={effectiveTheme} />;
        }
        if (resolvedTemplateSlug === 'romantic-doors') {
          return <RomanticDoorsExperience experience={experience} theme={effectiveTheme} />;
        }
        if (resolvedTemplateSlug === 'enchanted-glasshouse') {
          return <EnchantedGlasshouseExperience experience={experience} theme={effectiveTheme} />;
        }
        if (resolvedTemplateSlug === 'amalfi-riviera') {
          return <AmalfiRivieraExperience experience={experience} theme={effectiveTheme} />;
        }
        return <CelestialParallaxExperience experience={experience} theme={effectiveTheme} />;
      })()}

      {/* Floating Ambient Music Player (Suppressed for integrated audio worlds like celestial-odyssey) */}
      {hasMusic && resolvedTemplateSlug !== 'celestial-odyssey' && (
        <MusicPlayer
          theme={effectiveTheme}
          audioUrl={audioUrl}
          trackTitle={trackTitle}
          artistName={artistName}
        />
      )}

      {/* Powered by OrbitoX Watermark Badge (hidden for VIP / no_watermark tier, or integrated worlds) */}
      {hasWatermark && resolvedTemplateSlug !== 'celestial-odyssey' && (
        <aside
          aria-label="OrbitoX Platform branding"
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '24px',
            zIndex: 85,
            pointerEvents: 'auto',
          }}
        >
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '9999px',
              background: 'rgba(10, 13, 20, 0.75)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.72rem',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
            }}
          >
            <Crown size={12} style={{ color: primaryAccent }} />
            <span>
              Crafted with <strong style={{ color: '#fff', fontWeight: 600 }}>OrbitoX Celebrations</strong>
            </span>
          </Link>
        </aside>
      )}
    </div>
  );
}
