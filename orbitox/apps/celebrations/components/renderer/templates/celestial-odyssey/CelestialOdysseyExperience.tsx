'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Experience, Theme } from '@orbitox-io/celebrations';
import { CelestialArrivalScene } from './scenes/CelestialArrivalScene';
import { CelestialSoulsScene } from './scenes/CelestialSoulsScene';
import { CelestialConstellationScene } from './scenes/CelestialConstellationScene';
import { CelestialClockScene } from './scenes/CelestialClockScene';
import { CelestialGatheringScene } from './scenes/CelestialGatheringScene';
import { CelestialRsvpScene } from './scenes/CelestialRsvpScene';
import { CelestialBlessingsScene, CelestialWishItem } from './scenes/CelestialBlessingsScene';
import { CelestialDepartureScene } from './scenes/CelestialDepartureScene';
import { CelestialContextualNav } from './scenes/CelestialContextualNav';
import { SceneLayoutConfig, SceneMotionConfig, SceneInteractionConfig, CelebrationState } from '@/components/studio/StudioData';
import type { SceneGraph } from '@/components/template-studio/engine/SceneGraphTypes';
import { CelestialSoulsGraph } from '@/components/template-studio/engine/CelestialSoulsGraph';
import { CelestialConstellationGraph } from '@/components/template-studio/engine/CelestialConstellationGraph';
import { CelestialCountdownGraph } from '@/components/template-studio/engine/CelestialCountdownGraph';
import { CELESTIAL_ODYSSEY_SCHEMA } from '@/components/template-studio/schema/builtin-schemas';
import { UnifiedSceneRenderer } from '../../UnifiedSceneRenderer';

interface CelestialOdysseyExperienceProps {
  experience: Experience;
  theme: Theme;
}

export interface MilestoneChapter {
  id: number;
  year: string;
  label: string;
  chapter: string;
  location: string;
  coords: string;
  title: string;
  description: string;
  image: string;
}

export const getUniversalMilestones = (
  venueName?: string,
  venueCity?: string,
  eventDateStr?: string
): MilestoneChapter[] => {
  const currentVenue = venueName
    ? `${venueName}${venueCity ? `, ${venueCity}` : ''}`
    : venueCity || 'Our Eternal Sanctuary';

  const celebrationYear = eventDateStr
    ? new Date(eventDateStr).getFullYear().toString()
    : '2026';

  return [
    {
      id: 1,
      year: '01',
      label: 'FIRST MET',
      chapter: 'CHAPTER I • FIRST ENCOUNTER',
      location: 'Where Paths Aligned',
      coords: '01 • THE SPARK',
      title: 'When Paths Aligned',
      description:
        'A serendipitous encounter that quietly altered our destiny. Two independent trajectories pulled into an undeniable, gravitationally bound celestial alignment.',
      image:
        'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&q=85',
    },
    {
      id: 2,
      year: '02',
      label: 'JOURNEY',
      chapter: 'CHAPTER II • THE JOURNEY',
      location: 'Growing Together',
      coords: '02 • THE HARMONY',
      title: 'Building Our Shared World',
      description:
        'Countless late-night conversations, shared travels, and learning each other’s unspoken languages. Building a steadfast love designed to outlast time itself.',
      image:
        'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&q=85',
    },
    {
      id: 3,
      year: '03',
      label: 'PROPOSAL',
      chapter: 'CHAPTER III • A SACRED PROMISE',
      location: 'Under the Starlit Sky',
      coords: '03 • THE PROMISE',
      title: 'A Question & A Whispered Yes',
      description:
        'With quiet reverence beneath an open canopy of stars, the sacred question was asked. A breathless, whispered yes that sealed our tomorrows forever.',
      image:
        'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=85',
    },
    {
      id: 4,
      year: celebrationYear !== 'NaN' && celebrationYear ? celebrationYear : '04',
      label: 'THE BIG DAY',
      chapter: 'CHAPTER IV • SACRED UNION',
      location: currentVenue,
      coords: '04 • SACRED VOW',
      title: 'The Eternal Convergence',
      description:
        'Surrounded by our beloved families, lifelong friends, and everyone who helped write our story, we step together across the threshold into our forever.',
      image:
        'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1200&q=85',
    },
  ];
};

export function CelestialOdysseyExperience({
  experience,
  theme,
}: CelestialOdysseyExperienceProps) {
  // Audio state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // RSVP state
  const [rsvpStatus, setRsvpStatus] = useState<'IDLE' | 'ATTENDING' | 'DECLINING'>('IDLE');
  const [rsvpName, setRsvpName] = useState('');
  const [guestCount, setGuestCount] = useState('1');
  const [dietary, setDietary] = useState('');
  const [rsvpNote, setRsvpNote] = useState('');
  const [isRsvpSubmitted, setIsRsvpSubmitted] = useState(false);

  // Guestbook wishes state
  const [wishes, setWishes] = useState<CelestialWishItem[]>([
    {
      id: 1,
      author: 'Lord & Lady Mountbatten',
      text: 'May your union reflect the enduring beauty and celestial precision of the stars above.',
      time: 'Yesterday',
    },
    {
      id: 2,
      author: 'Eleanor & Harrison Ward',
      text: 'An extraordinary love story. We cannot wait to celebrate this historic day with you both!',
      time: '2 days ago',
    },
    {
      id: 3,
      author: 'Marcus & Sophia Chen',
      text: 'Wishing you both a lifetime of breathtaking adventures and unyielding happiness.',
      time: '3 days ago',
    },
  ]);
  const [newWishAuthor, setNewWishAuthor] = useState('');
  const [newWishText, setNewWishText] = useState('');
  const [wishSentNotification, setWishSentNotification] = useState(false);

  // Section extractions
  const heroSection = experience.sections?.find((s) => s.sectionType === 'hero');
  const heroConfig = (heroSection?.config || {}) as Record<string, any>;
  const coupleSection = experience.sections?.find(
    (s) => s.sectionType === 'couple_profile' || s.sectionType === 'person_profile'
  );
  const coupleConfig = (coupleSection?.config || {}) as Record<string, any>;
  const venueSection = experience.sections?.find((s) => s.sectionType === 'venue_map');
  const venueConfig = (venueSection?.config || {}) as Record<string, any>;
  const storySection = experience.sections?.find((s) => s.sectionType === 'story');
  const storyConfig = (storySection?.config || {}) as Record<string, any>;
  const countdownSection = experience.sections?.find((s) => s.sectionType === 'countdown');
  const countdownConfig = (countdownSection?.config || {}) as Record<string, any>;
  const eventsSection = experience.sections?.find((s) => s.sectionType === 'events_schedule');
  const eventsConfig = (eventsSection?.config || {}) as Record<string, any>;
  const rsvpSection = experience.sections?.find((s) => s.sectionType === 'rsvp');
  const rsvpConfig = (rsvpSection?.config || {}) as Record<string, any>;
  const wishesSection = experience.sections?.find((s) => s.sectionType === 'wishes_guestbook');
  const wishesConfig = (wishesSection?.config || {}) as Record<string, any>;
  const shagunSection = experience.sections?.find((s) => s.sectionType === 'gift_registry');
  const shagunConfig = (shagunSection?.config || {}) as Record<string, any>;
  const dressCodeSection = experience.sections?.find((s) => s.sectionType === 'dress_code');

  // P2 Layout & Motion Config extraction
  const arrivalLayout = heroConfig.layout as SceneLayoutConfig | undefined;
  const arrivalMotion = heroConfig.motion as SceneMotionConfig | undefined;

  const soulsLayout = coupleConfig.layout as SceneLayoutConfig | undefined;
  const soulsMotion = coupleConfig.motion as SceneMotionConfig | undefined;

  const storyLayout = storyConfig.layout as SceneLayoutConfig | undefined;
  const storyMotion = storyConfig.motion as SceneMotionConfig | undefined;

  const countdownLayout = countdownConfig.layout as SceneLayoutConfig | undefined;
  const countdownMotion = countdownConfig.motion as SceneMotionConfig | undefined;

  const gatheringLayout = (eventsConfig.layout || venueConfig.layout) as SceneLayoutConfig | undefined;
  const gatheringMotion = (eventsConfig.motion || venueConfig.motion) as SceneMotionConfig | undefined;

  const rsvpLayout = rsvpConfig.layout as SceneLayoutConfig | undefined;
  const rsvpMotion = rsvpConfig.motion as SceneMotionConfig | undefined;

  const blessingsLayout = (wishesConfig.layout || shagunConfig.layout) as SceneLayoutConfig | undefined;
  const blessingsMotion = (wishesConfig.motion || shagunConfig.motion) as SceneMotionConfig | undefined;

  // P3 Interaction Config extraction
  const arrivalInteractions = heroConfig.interactions as SceneInteractionConfig[] | undefined;
  const soulsInteractions = coupleConfig.interactions as SceneInteractionConfig[] | undefined;
  const storyInteractions = storyConfig.interactions as SceneInteractionConfig[] | undefined;
  const countdownInteractions = countdownConfig.interactions as SceneInteractionConfig[] | undefined;
  const gatheringInteractions = (eventsConfig.interactions || venueConfig.interactions) as SceneInteractionConfig[] | undefined;
  const rsvpInteractions = rsvpConfig.interactions as SceneInteractionConfig[] | undefined;
  const blessingsInteractions = (wishesConfig.interactions || shagunConfig.interactions) as SceneInteractionConfig[] | undefined;

  // P10 Visual Authoring SceneGraph extraction
  const soulsSceneGraph = coupleConfig.sceneGraph as SceneGraph | undefined;
  const storySceneGraph = storyConfig.sceneGraph as SceneGraph | undefined;
  const countdownSceneGraph = countdownConfig.sceneGraph as SceneGraph | undefined;

  // P11 Authoritative Render Mode extraction (graph-native scenes default to 'graph')
  const soulsRenderMode = (coupleConfig.renderMode as 'legacy' | 'hybrid' | 'graph') || 'graph';
  const storyRenderMode = (storyConfig.renderMode as 'legacy' | 'hybrid' | 'graph') || 'graph';
  const countdownRenderMode = (countdownConfig.renderMode as 'legacy' | 'hybrid' | 'graph') || 'graph';

  // Module and scene enablement checks
  const isArrivalEnabled = heroSection ? heroSection.isEnabled !== false : true;
  const isSoulsEnabled = coupleSection ? coupleSection.isEnabled !== false : true;
  const isStoryEnabled = storySection ? storySection.isEnabled !== false : true;
  const isCountdownEnabled = countdownSection ? countdownSection.isEnabled !== false : true;
  const isGatheringEnabled =
    (eventsSection ? eventsSection.isEnabled !== false : true) ||
    (venueSection ? venueSection.isEnabled !== false : true);
  const isRsvpEnabled = rsvpSection ? rsvpSection.isEnabled !== false : true;
  const isBlessingsEnabled =
    (wishesSection ? wishesSection.isEnabled !== false : true) ||
    (shagunSection ? shagunSection.isEnabled !== false : true);

  const enableGuestbook = wishesSection ? wishesSection.isEnabled !== false : true;
  const enableShagun = shagunSection ? shagunSection.isEnabled !== false : true;
  const speedTier = (countdownConfig.speedTier as string) || 'celestial';
  const rsvpDeadline = (rsvpConfig.deadline as string) || '10 January 2027';
  const upiId = (shagunConfig.upiId as string) || 'aarav.meera@okhdfcbank';
  const shagunAmounts = (shagunConfig.denominations as number[]) || [1001, 2100, 5100, 11000];

  // Media slot styling extraction (P1 Media Authoring)
  const coverImage = (heroConfig.coverImage as string) || (heroConfig.heroImage as string) || undefined;
  const coverImageShape = (heroConfig.coverImageShape as any) || 'editorial';
  const coverImageFocalPoint = (heroConfig.coverImageFocalPoint as any) || { x: 50, y: 50 };
  const coverImageOverlay = (heroConfig.coverImageOverlay as any) || { color: '#040714', opacity: 0.35, blurPx: 0 };

  const partner1Shape = (coupleConfig.partner1Shape as any) || 'editorial';
  const partner1FocalPoint = (coupleConfig.partner1FocalPoint as any) || { x: 50, y: 35 };
  const partner1CropBehavior = (coupleConfig.partner1CropBehavior as any) || 'editorial_zoom';
  const partner2Shape = (coupleConfig.partner2Shape as any) || 'editorial';
  const partner2FocalPoint = (coupleConfig.partner2FocalPoint as any) || { x: 50, y: 35 };
  const partner2CropBehavior = (coupleConfig.partner2CropBehavior as any) || 'editorial_zoom';

  const enabledMomentIds = useMemo(() => {
    const ids: string[] = [];
    if (isArrivalEnabled) ids.push('moment-arrival');
    if (isSoulsEnabled) ids.push('moment-souls');
    if (isStoryEnabled) ids.push('moment-story');
    if (isCountdownEnabled) ids.push('moment-convergence');
    if (isGatheringEnabled) ids.push('moment-gathering');
    if (isRsvpEnabled) ids.push('moment-rsvp');
    if (isBlessingsEnabled) ids.push('moment-blessings');
    return ids;
  }, [
    isArrivalEnabled,
    isSoulsEnabled,
    isStoryEnabled,
    isCountdownEnabled,
    isGatheringEnabled,
    isRsvpEnabled,
    isBlessingsEnabled,
  ]);

  // Resolved text variables
  const celebrationTitle =
    (heroConfig.headline as string) ||
    (coupleConfig.partner1Name && coupleConfig.partner2Name
      ? `${coupleConfig.partner1Name} & ${coupleConfig.partner2Name}`
      : '') ||
    experience.title ||
    'Vikramaditya & Ananya';

  const celebrationSubtitle =
    (heroConfig.subheadline as string) ||
    (heroConfig.headline as string) ||
    'Under the Eternal Canopy of the Midnight Sky';

  const eventDateStr =
    (heroConfig.eventDate as string) || (experience.eventDate as string) || 'December 18, 2026';

  const venueName =
    (heroConfig.venueName as string) ||
    (venueConfig.venueName as string) ||
    'The Grand Lake Sanctuary';

  const venueCity =
    (heroConfig.venueCity as string) ||
    (venueConfig.venueCity as string) ||
    'Lake Como, Italy';

  const venueAddress =
    (venueConfig.address as string) ||
    (venueConfig.location as string) ||
    'Via Regina 24, 22010 Tremezzina CO, Italy';

  const primaryAccent = experience.styleOverrides?.primaryColor || theme.styleConfig?.accentColor || '#E5C07B';

  // Story Milestones resolution
  const customMilestones = (storySection?.config?.milestones as Array<any>) || [];
  const milestones: MilestoneChapter[] = useMemo(() => {
    const defaults = getUniversalMilestones(venueName, venueCity, eventDateStr);
    if (!customMilestones || customMilestones.length === 0) {
      return defaults;
    }
    return customMilestones.map((m, idx) => {
      const def = defaults[idx] || defaults[0]!;
      return {
        id: m.id || idx + 1,
        year: m.year ? String(m.year) : def.year,
        label: m.label || def.label,
        chapter: m.chapter || def.chapter,
        location: m.location || def.location,
        coords: m.coords || def.coords,
        title: m.title || def.title,
        description: m.description || def.description,
        image: m.image || def.image,
      };
    });
  }, [customMilestones, venueName, venueCity, eventDateStr]);

  // Itinerary Events resolution
  const userEvents = (eventsSection?.config?.events as Array<{
    id?: string;
    name?: string;
    title?: string;
    time?: string;
    venue?: string;
    dressCode?: string;
    description?: string;
  }>) || [];

  const itineraryEvents = useMemo(() => {
    if (userEvents.length > 0) {
      return userEvents.map((ev, idx) => ({
        time: ev.time || '17:00',
        title: ev.name || ev.title || `Ceremony 0${idx + 1}`,
        venue: ev.venue || venueName,
        dressCode: ev.dressCode || 'Formal / Festive Elegance',
        description: ev.description || 'Join us to celebrate this special ceremony.',
      }));
    }
    return [
      {
        time: '16:00',
        title: 'Welcome & Refreshments',
        venue: venueName,
        dressCode: 'Black Tie Optional',
        description: 'Guests arrive to welcome refreshments and gentle ambient music by the lake.',
      },
      {
        time: '17:30',
        title: 'Sacred Vows',
        venue: venueName,
        dressCode: 'Celestial Formal',
        description: 'Solemn ceremony as twilight horizon embraces our families and closest loved ones.',
      },
      {
        time: '19:30',
        title: 'Gala Dinner & Toasts',
        venue: venueName,
        dressCode: 'Gilded Accents',
        description: 'An exquisite dining showcase with vintage wine pairings and heartfelt toasts.',
      },
      {
        time: '22:00',
        title: 'Midnight Soirée & Dancing',
        venue: venueName,
        dressCode: 'Glamorous Evening',
        description: 'Celebratory music, shared laughter, and dancing beneath the open night sky.',
      },
    ];
  }, [userEvents, venueName]);

  const protocolDressCode =
    (dressCodeSection?.config?.dressCode as string) ||
    (userEvents.length > 0 && userEvents[0]?.dressCode ? userEvents[0].dressCode : null) ||
    'Formal Elegance • Black Tie with Celestial Accents';

  const rsvpMaxGuests = (rsvpConfig.maxGuests as number) || (rsvpConfig.guestCountTarget as number) || 4;

  // P11 Authoritative Graph Blueprints & Design Tokens
  const effectiveSoulsGraph = soulsSceneGraph || CelestialSoulsGraph;
  const effectiveStoryGraph = storySceneGraph || CelestialConstellationGraph;
  const effectiveCountdownGraph = countdownSceneGraph || CelestialCountdownGraph;
  const effectiveTokens = CELESTIAL_ODYSSEY_SCHEMA.designTokens!;

  const effectiveCelebrationState: CelebrationState = useMemo(() => {
    const p1 = (coupleConfig.partner1Name as string)?.trim() || (celebrationTitle.includes('&') ? celebrationTitle.split('&')[0]?.trim() : 'Vikramaditya') || 'Aarav';
    const p2 = (coupleConfig.partner2Name as string)?.trim() || (celebrationTitle.includes('&') ? celebrationTitle.split('&')[1]?.trim() : 'Ananya') || 'Meera';
    const p1Img = (coupleConfig.partner1Image as string) || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=85';
    const p2Img = (coupleConfig.partner2Image as string) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=85';

    return {
      occasion: 'wedding',
      theme: 'celestial-odyssey',
      title: celebrationTitle,
      tagline: celebrationSubtitle,
      protagonist1: p1,
      protagonist1Role: coupleConfig.partner1Role || 'The Groom',
      protagonist1Bio: coupleConfig.partner1Bio || 'An architect with a passion for heritage structures.',
      protagonist1Image: p1Img,
      protagonist1Vow: coupleConfig.partner1Vow || '“In you, I discovered the steadfast constellation that guides every horizon I will ever seek.”',
      protagonist2: p2,
      protagonist2Role: coupleConfig.partner2Role || 'The Bride',
      protagonist2Bio: coupleConfig.partner2Bio || 'A wildlife photographer captivated by mountain mist and storytelling.',
      protagonist2Image: p2Img,
      protagonist2Vow: coupleConfig.partner2Vow || '“Beside you, silence feels like music and the future feels like returning home.”',
      unionDeclaration: coupleConfig.unionDeclaration || (storySection?.config?.unionDeclaration as string) || (storySection?.config?.quote as string) || 'Two independent trajectories drawn across infinite space by gravitational destiny — merging into one eternal, harmonic constellation.',
      date: eventDateStr,
      time: (heroConfig.eventTime as string) || '06:00 PM IST',
      venueName: venueName,
      venueAddress: venueAddress || `${venueName}, ${venueCity}`,
      city: venueCity,
      stateCountry: 'Rajasthan, India',
      guestCountTarget: 150,
      additionalLocations: [],
      storyQuote: (storyConfig.quote as string) || '“Two independent trajectories drawn across infinite space by gravitational destiny.”',
      storyBody: (storyConfig.storyText as string) || 'From our first meeting under a canopy of starlight to this sacred hour...',
      milestones: (milestones as any) || [],
      itinerary: (itineraryEvents as any) || [],
      speedTier: speedTier as any,
      enableCountdown: isCountdownEnabled,
      enableCoupleProfile: isSoulsEnabled,
      enableItinerary: isGatheringEnabled,
      enableStory: isStoryEnabled,
      enableVenueMap: true,
      enableDressCode: true,
      enableGallery: true,
      enableRsvp: isRsvpEnabled,
      enableShagun: enableShagun,
      enableGuestbook: enableGuestbook,
      enableMusic: true,
      rsvpDeadline: rsvpDeadline,
      allowPlusOnes: 'yes',
      enableDietary: true,
      upiId: upiId,
      shagunAmounts: shagunAmounts,
      hasPasscodeProtection: false,
      passcode: '2027',
      previewMode: 'experience',
      monogramInitials: 'V & A',
      monogramStyle: 'arch',
      monogramImage: '',
      coverImage: coverImage || 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&q=80',
      isSingleCelebrant: false,
      primaryColorOverride: primaryAccent,
    };
  }, [
    coupleConfig,
    celebrationTitle,
    celebrationSubtitle,
    heroConfig,
    storySection,
    storyConfig,
    eventDateStr,
    venueName,
    venueAddress,
    venueCity,
    milestones,
    itineraryEvents,
    speedTier,
    isCountdownEnabled,
    isSoulsEnabled,
    isGatheringEnabled,
    isStoryEnabled,
    isRsvpEnabled,
    enableShagun,
    enableGuestbook,
    rsvpDeadline,
    upiId,
    shagunAmounts,
    coverImage,
    primaryAccent,
  ]);

  // Synthesized Celestial Soundscape
  const toggleAudio = () => {
    if (typeof window === 'undefined') return;
    try {
      if (isPlayingAudio) {
        audioCtxRef.current?.suspend();
        setIsPlayingAudio(false);
      } else {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioCtx();
        }
        if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }

        const ctx = audioCtxRef.current;
        const freqs = [196.0, 246.94, 293.66, 392.0]; // G3, B3, D4, G4 (Warm G Major chord)
        freqs.forEach((f) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, ctx.currentTime);
          gain.gain.setValueAtTime(0.025, ctx.currentTime);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
        });

        setIsPlayingAudio(true);
      }
    } catch {
      // Audio fallback
    }
  };

  // Add to Calendar action (.ics download)
  const handleAddToCalendar = () => {
    if (typeof window === 'undefined') return;
    const cleanDate = eventDateStr.replace(/[^0-9]/g, '');
    const dateStamp = cleanDate.length >= 8 ? cleanDate.substring(0, 8) : '20261218';
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//OrbitoX//Celestial Celebrations//EN',
      'BEGIN:VEVENT',
      'SUMMARY:' + celebrationTitle + ' - Celebration',
      'DESCRIPTION:' + celebrationSubtitle + '\\nLocation: ' + venueName + ', ' + venueCity,
      'LOCATION:' + venueName + ', ' + venueCity,
      'DTSTART:' + dateStamp + 'T160000Z',
      'DTEND:' + dateStamp + 'T235900Z',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanSlug = celebrationTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    link.setAttribute('download', `${cleanSlug || 'Celebration'}-Celebration.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // RSVP Form submit
  const handleRsvpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rsvpName.trim() || rsvpStatus === 'IDLE') return;
    setIsRsvpSubmitted(true);
  };

  // Wish submit
  const handleWishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWishAuthor.trim() || !newWishText.trim()) return;
    setWishes([
      {
        id: Date.now(),
        author: newWishAuthor.trim(),
        text: newWishText.trim(),
        time: 'Just now',
      },
      ...wishes,
    ]);
    setNewWishAuthor('');
    setNewWishText('');
    setWishSentNotification(true);
    setTimeout(() => setWishSentNotification(false), 4500);
  };

  const handleBeginJourney = () => {
    const nextTargetId = enabledMomentIds.find((id) => id !== 'moment-arrival');
    if (nextTargetId) {
      const el = document.getElementById(nextTargetId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#06080F',
        color: '#FFF9F5',
        fontFamily: "'Outfit', sans-serif",
        minHeight: '100vh',
        position: 'relative',
        overflowX: 'hidden',
        ['--orbitox-accent-primary' as any]: primaryAccent,
        ['--cel-accent' as any]: primaryAccent,
        ['--cel-gold' as any]: primaryAccent,
      }}
    >
      {/* Moment 01 — Arrival */}
      {isArrivalEnabled && (
        <div id="sec-scene_arrival" data-scene-id="scene_arrival">
          <CelestialArrivalScene
            celebrationTitle={celebrationTitle}
            celebrationSubtitle={celebrationSubtitle}
            eventDateStr={eventDateStr}
            venueName={venueName}
            venueCity={venueCity}
            primaryAccent={primaryAccent}
            coverImage={coverImage}
            coverImageShape={coverImageShape}
            coverImageFocalPoint={coverImageFocalPoint}
            coverImageOverlay={coverImageOverlay}
            isPlayingAudio={isPlayingAudio}
            layout={arrivalLayout}
            motion={arrivalMotion}
            interactions={arrivalInteractions}
            onToggleAudio={toggleAudio}
            onBeginJourney={handleBeginJourney}
          />
        </div>
      )}

      {/* Moment 02 — The Souls */}
      {isSoulsEnabled && (
        <div id="sec-scene_souls" data-scene-id="scene_souls">
          {soulsRenderMode === 'graph' ? (
            <UnifiedSceneRenderer
              sceneGraph={effectiveSoulsGraph}
              device="desktop"
              tokens={effectiveTokens}
              celebrationState={effectiveCelebrationState}
            />
          ) : (
            <CelestialSoulsScene
              partner1Name={coupleConfig.partner1Name || (celebrationTitle.includes('&') ? celebrationTitle.split('&')[0]?.trim() : 'Vikramaditya')}
              partner1Role={coupleConfig.partner1Role || 'The Groom'}
              partner1Bio={coupleConfig.partner1Bio}
              partner1Image={coupleConfig.partner1Image}
              partner1Vow={coupleConfig.partner1Vow}
              partner1Shape={partner1Shape}
              partner1FocalPoint={partner1FocalPoint}
              partner1CropBehavior={partner1CropBehavior}
              partner2Name={coupleConfig.partner2Name || (celebrationTitle.includes('&') ? celebrationTitle.split('&')[1]?.trim() : 'Ananya')}
              partner2Role={coupleConfig.partner2Role || 'The Bride'}
              partner2Bio={coupleConfig.partner2Bio}
              partner2Image={coupleConfig.partner2Image}
              partner2Vow={coupleConfig.partner2Vow}
              partner2Shape={partner2Shape}
              partner2FocalPoint={partner2FocalPoint}
              partner2CropBehavior={partner2CropBehavior}
              unionDeclaration={coupleConfig.unionDeclaration || (storySection?.config?.unionDeclaration as string) || (storySection?.config?.quote as string)}
              primaryAccent={primaryAccent}
              layout={soulsLayout}
              motion={soulsMotion}
              interactions={soulsInteractions}
              sceneGraph={effectiveSoulsGraph}
            />
          )}
        </div>
      )}

      {/* Moment 03 — The Constellation of Our Story */}
      {isStoryEnabled && (
        <div id="sec-scene_constellation" data-scene-id="scene_constellation">
          {storyRenderMode === 'graph' ? (
            <UnifiedSceneRenderer
              sceneGraph={effectiveStoryGraph}
              device="desktop"
              tokens={effectiveTokens}
              celebrationState={effectiveCelebrationState}
            />
          ) : (
            <CelestialConstellationScene
              milestones={milestones}
              primaryAccent={primaryAccent}
              layout={storyLayout}
              motion={storyMotion}
              interactions={storyInteractions}
              sceneGraph={effectiveStoryGraph}
            />
          )}
        </div>
      )}

      {/* Moment 04 — Celestial Alignment Countdown */}
      {isCountdownEnabled && (
        <div id="sec-scene_countdown" data-scene-id="scene_countdown">
          {countdownRenderMode === 'graph' ? (
            <UnifiedSceneRenderer
              sceneGraph={effectiveCountdownGraph}
              device="desktop"
              tokens={effectiveTokens}
              celebrationState={effectiveCelebrationState}
            />
          ) : (
            <CelestialClockScene
              eventDateStr={eventDateStr}
              celebrationTitle={celebrationTitle}
              celebrationSubtitle={celebrationSubtitle}
              venueName={venueName}
              venueCity={venueCity}
              primaryAccent={primaryAccent}
              speedTier={speedTier}
              layout={countdownLayout}
              motion={countdownMotion}
              interactions={countdownInteractions}
              sceneGraph={countdownSceneGraph}
              onAddToCalendar={handleAddToCalendar}
            />
          )}
        </div>
      )}

      {/* Moment 05 — The Gathering (Sanctuary & Itinerary) */}
      {isGatheringEnabled && (
        <div id="sec-scene_gathering" data-scene-id="scene_gathering">
          <CelestialGatheringScene
            events={itineraryEvents}
            protocolDressCode={protocolDressCode}
            venueName={venueName}
            venueCity={venueCity}
            venueAddress={venueAddress}
            primaryAccent={primaryAccent}
            layout={gatheringLayout}
            motion={gatheringMotion}
            interactions={gatheringInteractions}
          />
        </div>
      )}

      {/* Moment 06 — Attendance (RSVP) */}
      {isRsvpEnabled && (
        <div id="sec-scene_attendance" data-scene-id="scene_attendance">
          <CelestialRsvpScene
            rsvpStatus={rsvpStatus}
            setRsvpStatus={setRsvpStatus}
            rsvpName={rsvpName}
            setRsvpName={setRsvpName}
            guestCount={guestCount}
            setGuestCount={setGuestCount}
            dietary={dietary}
            setDietary={setDietary}
            rsvpNote={rsvpNote}
            setRsvpNote={setRsvpNote}
            isSubmitted={isRsvpSubmitted}
            setIsSubmitted={setIsRsvpSubmitted}
            onSubmit={handleRsvpSubmit}
            maxGuests={rsvpMaxGuests}
            primaryAccent={primaryAccent}
            rsvpDeadline={rsvpDeadline}
            layout={rsvpLayout}
            motion={rsvpMotion}
            interactions={rsvpInteractions}
          />
        </div>
      )}

      {/* Moment 07 — Blessings */}
      {isBlessingsEnabled && (
        <div id="sec-scene_blessings" data-scene-id="scene_blessings">
          <CelestialBlessingsScene
            wishes={wishes}
            newWishAuthor={newWishAuthor}
            setNewWishAuthor={setNewWishAuthor}
            newWishText={newWishText}
            setNewWishText={setNewWishText}
            onWishSubmit={handleWishSubmit}
            wishSentNotification={wishSentNotification}
            primaryAccent={primaryAccent}
            enableGuestbook={enableGuestbook}
            enableShagun={enableShagun}
            upiId={upiId}
            shagunAmounts={shagunAmounts}
            layout={blessingsLayout}
            motion={blessingsMotion}
            interactions={blessingsInteractions}
          />
        </div>
      )}

      {/* Moment 08 — Departure */}
      <div id="sec-scene_departure" data-scene-id="scene_departure">
        <CelestialDepartureScene
          celebrationTitle={celebrationTitle}
          primaryAccent={primaryAccent}
        />
      </div>

      {/* Dynamic Graph-Native Scenes (New Scene Creation without React) */}
      {(experience.sections || [])
        .filter(
          (s) =>
            !['hero', 'couple_profile', 'person_profile', 'story', 'countdown', 'events_schedule', 'venue_map', 'rsvp', 'wishes_guestbook', 'gift_registry', 'dress_code', 'departure'].includes(s.sectionType) &&
            (s.config?.renderMode === 'graph' || s.config?.sceneGraph)
        )
        .map((sec) => (
          <div key={sec.id} id={`sec-${sec.id}`} data-scene-id={sec.id}>
            <UnifiedSceneRenderer
              sceneGraph={(sec.config as any)?.sceneGraph}
              device="desktop"
              tokens={effectiveTokens}
              celebrationState={effectiveCelebrationState}
            />
          </div>
        ))}

      {/* Contextual Navigation (No application toolbar!) */}
      <CelestialContextualNav primaryAccent={primaryAccent} enabledMomentIds={enabledMomentIds} />
    </div>
  );
}
