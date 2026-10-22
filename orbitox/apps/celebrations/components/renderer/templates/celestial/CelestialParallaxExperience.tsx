'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Heart,
  Calendar,
  Clock,
  MapPin,
  Send,
  Volume2,
  VolumeX,
  Compass,
  ArrowDown,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Disc,
  Layers,
  UserCheck,
  UserX,
  Menu,
  X,
} from 'lucide-react';
import { Experience, ExperienceSection, Theme } from '@orbitox-io/celebrations';
import { CoupleTitle } from '../../CoupleTitle';

interface CelestialParallaxExperienceProps {
  experience: Experience;
  theme: Theme;
}

// Milestone trajectory data interface and universal generator
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

export function CelestialParallaxExperience({
  experience,
  theme,
}: CelestialParallaxExperienceProps) {
  const [scrollY, setScrollY] = useState(0);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const [activeMilestone, setActiveMilestone] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<'IDLE' | 'ATTENDING' | 'DECLINING'>('IDLE');
  const [rsvpName, setRsvpName] = useState('');
  const [guestCount, setGuestCount] = useState('1');
  const [dietary, setDietary] = useState('');
  const [rsvpNote, setRsvpNote] = useState('');
  const [isRsvpSubmitted, setIsRsvpSubmitted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Guestbook state
  const [wishes, setWishes] = useState([
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

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const heroSection = experience.sections?.find((s) => s.sectionType === 'hero');
  const heroConfig = heroSection?.config || {};
  const coupleSection = experience.sections?.find((s) => s.sectionType === 'couple_profile');
  const coupleConfig = coupleSection?.config || {};
  const venueSection = experience.sections?.find((s) => s.sectionType === 'venue_map');
  const venueConfig = venueSection?.config || {};
  const storySection = experience.sections?.find((s) => s.sectionType === 'story');
  const eventsSection = experience.sections?.find((s) => s.sectionType === 'events_schedule');
  const rsvpSection = experience.sections?.find((s) => s.sectionType === 'rsvp');
  const rsvpConfig = rsvpSection?.config || {};
  const dressCodeSection = experience.sections?.find((s) => s.sectionType === 'dress_code');

  const celebrationTitle =
    (heroConfig.title as string) ||
    (coupleConfig.partner1Name && coupleConfig.partner2Name
      ? `${coupleConfig.partner1Name} & ${coupleConfig.partner2Name}`
      : '') ||
    experience.title ||
    'Vikramaditya Rathore & Ananya Singhania';
  const celebrationSubtitle =
    (heroConfig.subheadline as string) ||
    (heroConfig.headline as string) ||
    'The Celestial Convergence Under the Midnight Stars';
  const eventDateStr =
    (heroConfig.eventDate as string) || (experience.eventDate as string) || 'December 18, 2026';
  const venueName =
    (heroConfig.venueName as string) ||
    (venueConfig.venueName as string) ||
    "The Grand Lake Sanctuary";
  const venueCity =
    (heroConfig.venueCity as string) ||
    (venueConfig.venueCity as string) ||
    "Lake Como, Italy";

  // Story Milestones resolution: prioritize user-configured milestones from /create, or universal defaults
  const isStorySectionEnabled = storySection ? storySection.isEnabled !== false : true;
  const customMilestones = (storySection?.config?.milestones as Array<any>) || [];
  const isStoryVisible = isStorySectionEnabled && (customMilestones.length > 0 || !storySection);
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

  // Itinerary Events resolution: prioritize user-configured events from /create, or universal celebration ceremonies
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
        icon: idx === 0 ? Clock : idx === 1 ? Heart : idx === 2 ? Sparkles : Disc,
      }));
    }
    return [
      {
        time: '16:00',
        title: 'Welcome & Gathering',
        venue: venueName,
        description: 'Guests arrive to welcome refreshments, cordial greetings, and gentle ambient music.',
        icon: Clock,
      },
      {
        time: '17:30',
        title: 'The Sacred Vow Exchange',
        venue: venueName,
        description: 'Solemn ceremony as the twilight horizon embraces our families and closest loved ones.',
        icon: Heart,
      },
      {
        time: '19:30',
        title: 'Gala Dinner & Heartfelt Toasts',
        venue: venueName,
        description: 'An exquisite dining showcase with vintage wine pairings and celebratory toasts.',
        icon: Sparkles,
      },
      {
        time: '22:00',
        title: 'Midnight Soirée & Dancing',
        venue: venueName,
        description: 'Celebratory music, shared laughter, and dancing beneath the open night sky.',
        icon: Disc,
      },
    ];
  }, [userEvents, venueName]);

  const protocolDressCode =
    (dressCodeSection?.config?.dressCode as string) ||
    (userEvents.length > 0 && userEvents[0]?.dressCode ? userEvents[0].dressCode : null) ||
    'Formal Elegance • Black Tie & Gilded Accents';

  const rsvpMaxGuests = (rsvpConfig.maxGuests as number) || 4;

  // Target event date countdown calculation
  useEffect(() => {
    const target = new Date(eventDateStr).getTime() || new Date('2026-12-18T16:00:00').getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const diff = Math.max(0, target - now);

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [eventDateStr]);

  // Responsive desktop check to disable mobile parallax overlap
  useEffect(() => {
    const checkViewport = () => {
      setIsDesktop(typeof window !== 'undefined' && window.innerWidth >= 768);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  // Smooth scroll listener for parallax
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Mouse tilt tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 20;
      const y = (e.clientY / innerHeight - 0.5) * 20;
      setMouseOffset({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Ambient synthesized audio
  const audioCtxRef = useRef<AudioContext | null>(null);
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

        // Ambient celestial pad harmonic drone
        const ctx = audioCtxRef.current;
        const freqs = [196.0, 246.94, 293.66, 392.0]; // G3, B3, D4, G4 (Warm G Major)
        freqs.forEach((f) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, ctx.currentTime);
          gain.gain.setValueAtTime(0.04, ctx.currentTime);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
        });

        setIsPlayingAudio(true);
      }
    } catch {
      // Audio autoplay policy fallback
    }
  };

  const handleRsvpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rsvpName.trim() || rsvpStatus === 'IDLE') return;
    setIsRsvpSubmitted(true);
  };

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
      'DTSTART:' + dateStamp + 'T153000Z',
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

  return (
    <div
      style={{
        backgroundColor: '#07080D',
        color: '#FFF9F5',
        fontFamily: 'Outfit, sans-serif',
        minHeight: '100vh',
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {/* GLOBAL BACKGROUND ISO-GRID & AMBIENT ROSE GLOW */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          background:
            'radial-gradient(circle at 50% 15%, rgba(232, 165, 152, 0.09) 0%, rgba(7, 8, 13, 0) 65%), radial-gradient(circle at 85% 60%, rgba(232, 184, 109, 0.05) 0%, rgba(7, 8, 13, 0) 50%)',
        }}
      />
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.035,
          backgroundImage: `repeating-linear-gradient(60deg, #FFF 0, #FFF 1px, transparent 0, transparent 60px),
            repeating-linear-gradient(120deg, #FFF 0, #FFF 1px, transparent 0, transparent 60px)`,
        }}
      />

      {/* TOP FLOATING NAV BAR (Spyker Minimalist Editorial Bar) */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 80,
          padding: 'clamp(12px, 2vh, 18px) clamp(14px, 3.5vw, 32px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          background: 'rgba(7, 8, 13, 0.88)',
          borderBottom: '1px solid rgba(232, 165, 152, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              border: '1px solid #E8A598',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#E8A598',
              flexShrink: 0,
            }}
          >
            <Compass size={15} />
          </div>
          <span
            style={{
              fontFamily: 'serif',
              fontSize: 'clamp(0.72rem, 1.8vw, 0.95rem)',
              letterSpacing: 'clamp(1px, 0.4vw, 3px)',
              color: '#FFF9F5',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 'min(50vw, 260px)',
            }}
          >
            ATELIER D&#39;AMOUR • CHRONOS
          </span>
        </div>

        {/* Center Quick Navigation Links (Hidden on mobile via desktop-only) */}
        <nav
          className="desktop-only"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '28px',
          }}
        >
          <a
            href="#chapter-01"
            style={{
              fontSize: '0.72rem',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: 'rgba(255, 249, 245, 0.7)',
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
          >
            I. Horizon
          </a>
          <a
            href="#chapter-02"
            style={{
              fontSize: '0.72rem',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: 'rgba(255, 249, 245, 0.7)',
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
          >
            II. Chronology
          </a>
          <a
            href="#chapter-03"
            style={{
              fontSize: '0.72rem',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: 'rgba(255, 249, 245, 0.7)',
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
          >
            III. Instruments
          </a>
          <a
            href="#chapter-04"
            style={{
              fontSize: '0.72rem',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: 'rgba(255, 249, 245, 0.7)',
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
          >
            IV. Movement
          </a>
          <a
            href="#chapter-05"
            style={{
              fontSize: '0.72rem',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: '#E8A598',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            V. VIP Pass
          </a>
        </nav>

        {/* Audio Toggle & Coordinates & Mobile Index */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Mobile Chapter Index Trigger */}
          <button
            type="button"
            className="mobile-only celestial-btn-tactile"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle Chapter Navigation"
            aria-expanded={isMobileMenuOpen}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '9999px',
              background: isMobileMenuOpen ? 'rgba(232, 165, 152, 0.25)' : 'rgba(255, 255, 255, 0.06)',
              border: `1px solid ${isMobileMenuOpen ? '#E8A598' : 'rgba(255, 255, 255, 0.15)'}`,
              color: isMobileMenuOpen ? '#E8A598' : '#FFF9F5',
              fontSize: 'clamp(0.68rem, 1.8vw, 0.72rem)',
              letterSpacing: '1px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              minHeight: '36px',
              transition: 'all 0.2s',
            }}
          >
            {isMobileMenuOpen ? <X size={13} /> : <Menu size={13} />}
            <span>Index</span>
          </button>

          <button
            type="button"
            className="celestial-btn-tactile"
            onClick={toggleAudio}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '9999px',
              background: isPlayingAudio
                ? 'rgba(232, 165, 152, 0.2)'
                : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${isPlayingAudio ? '#E8A598' : 'rgba(255,255,255,0.1)'}`,
              color: isPlayingAudio ? '#E8A598' : '#FFF9F5',
              fontSize: 'clamp(0.68rem, 1.8vw, 0.72rem)',
              letterSpacing: '1px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'all 0.2s',
              minHeight: '36px',
              flexShrink: 0,
            }}
          >
            {isPlayingAudio ? <Volume2 size={13} /> : <VolumeX size={13} />}
            <span>{isPlayingAudio ? 'Soundscape' : 'Mute'}</span>
          </button>
        </div>
      </header>

      {/* Mobile Chapter Navigation Drawer & Tap-to-Dismiss Backdrop */}
      {isMobileMenuOpen && (
        <>
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 78,
              background: 'rgba(5, 6, 10, 0.75)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: 'calc(58px + env(safe-area-inset-top, 0px))',
              left: 0,
              right: 0,
              background: 'rgba(9, 11, 17, 0.98)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              borderBottom: '1px solid rgba(232, 165, 152, 0.3)',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.95)',
              padding: '16px 20px',
              zIndex: 79,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: 'calc(100dvh - 80px)',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {[
              { href: '#chapter-01', num: 'I', label: 'The Convergence (Hero)' },
              { href: '#chapter-02', num: 'II', label: 'The Staggered Horizon (Portraits)' },
              { href: '#chapter-03', num: 'III', label: 'Precision Horlogerie (Countdown)' },
              { href: '#chapter-04', num: 'IV', label: 'Ceremonial Movement (Itinerary)' },
              { href: '#chapter-05', num: 'V', label: 'VIP Pass & RSVP Terminal' },
              { href: '#chapter-06', num: 'VI', label: 'Starlight Archive (Guestbook)' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="celestial-btn-tactile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(232, 165, 152, 0.18)',
                  color: item.num === 'V' ? '#E8A598' : '#FFF9F5',
                  textDecoration: 'none',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  letterSpacing: '1px',
                  minHeight: '46px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#E8A598', fontFamily: 'serif', fontSize: '0.92rem' }}>{item.num}.</span>
                  <span>{item.label}</span>
                </div>
                <ChevronRight size={14} color="#E8A598" />
              </a>
            ))}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* CHAPTER 01: THE MONUMENTAL CINEMATIC HERO (HIGH-IMPACT PARALLAX)          */}
      {/* ========================================================================= */}
      <section
        id="chapter-01"
        style={{
          position: 'relative',
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: 'clamp(80px, 11vh, 120px) clamp(16px, 4vw, 36px) clamp(36px, 5vh, 60px) clamp(16px, 4vw, 36px)',
          overflow: 'hidden',
          zIndex: 10,
        }}
      >
        {/* Full-Bleed Parallax Backdrop Image with Smooth Scroll Scale */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            transform: `scale(${1 + scrollY * 0.00035}) translate3d(${mouseOffset.x * 0.4}px, ${mouseOffset.y * 0.4 + scrollY * 0.15}px, 0)`,
            transition: 'transform 0.1s cubic-bezier(0.1, 0.9, 0.2, 1)',
            backgroundImage:
              'url(https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&q=85)',
            backgroundSize: 'cover',
            backgroundPosition: 'center 40%',
            filter: 'brightness(0.38) saturate(1.15)',
          }}
        />

        {/* Obsidian Gradient Mask & Guilloché Vignette */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            background:
              'radial-gradient(circle at center, rgba(7, 8, 13, 0.25) 0%, rgba(7, 8, 13, 0.85) 75%, #07080D 100%)',
          }}
        />

        {/* Hero Content Container */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            maxWidth: '920px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'clamp(14px, 2.5vh, 24px)',
          }}
        >
          {/* Chapter 01 Badging */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '6px 10px',
              padding: '6px 16px',
              borderRadius: '9999px',
              background: 'rgba(232, 165, 152, 0.12)',
              border: '1px solid rgba(232, 165, 152, 0.35)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              maxWidth: '100%',
            }}
          >
            <span
              style={{
                fontFamily: 'sans-serif',
                fontSize: 'clamp(0.62rem, 1.8vw, 0.72rem)',
                fontWeight: 600,
                letterSpacing: 'clamp(1.5px, 0.5vw, 3px)',
                color: '#E8A598',
                textTransform: 'uppercase',
              }}
            >
              CHAPTER I • THE CONVERGENCE
            </span>
            <span style={{ color: 'rgba(232, 165, 152, 0.4)' }}>•</span>
            <span
              style={{
                fontFamily: 'sans-serif',
                fontSize: 'clamp(0.62rem, 1.8vw, 0.72rem)',
                color: '#FFF9F5',
                letterSpacing: 'clamp(1px, 0.4vw, 2px)',
              }}
            >
              {venueCity.toUpperCase()}
            </span>
          </div>

          {/* Authenticated 3-Line Couple Title with Centered Middle Ampersand */}
          <div style={{ width: '100%', margin: '4px 0' }}>
            <CoupleTitle
              title={celebrationTitle}
              as="h1"
              style={{
                fontFamily: 'Playfair Display, Cormorant Garamond, serif',
                fontSize: 'clamp(1.85rem, 5.8vw, 4.8rem)',
                fontWeight: 500,
                color: '#FFF9F5',
                lineHeight: 1.12,
                letterSpacing: '-0.5px',
                margin: 0,
                textShadow: '0 10px 40px rgba(0, 0, 0, 0.8)',
              }}
            />
          </div>

          {/* Subheadline with Fluid Clamp Typography */}
          <p
            style={{
              fontFamily: 'sans-serif',
              fontSize: 'clamp(0.85rem, 2.2vw, 1.2rem)',
              color: 'rgba(255, 249, 245, 0.82)',
              letterSpacing: 'clamp(1px, 0.4vw, 2px)',
              lineHeight: 1.6,
              maxWidth: '680px',
              margin: '0 auto',
            }}
          >
            {celebrationSubtitle}
          </p>

          {/* Date, Location, and Chronometer Coordinates Pill (Responsive Wrapped Chips) */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px 12px',
              margin: '8px 0 12px 0',
              maxWidth: '100%',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: '#E8A598',
                padding: '7px 16px',
                borderRadius: '9999px',
                background: 'rgba(18, 20, 30, 0.8)',
                border: '1px solid rgba(232, 165, 152, 0.3)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <Calendar size={14} />
              <span style={{ fontSize: 'clamp(0.76rem, 2vw, 0.85rem)', fontWeight: 600 }}>{eventDateStr}</span>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: '#FFF5EA',
                padding: '7px 16px',
                borderRadius: '9999px',
                background: 'rgba(18, 20, 30, 0.8)',
                border: '1px solid rgba(232, 165, 152, 0.25)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <MapPin size={14} color="#E8A598" />
              <span style={{ fontSize: 'clamp(0.76rem, 2vw, 0.85rem)' }}>{venueCity}</span>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#CBD5E1',
                padding: '7px 16px',
                borderRadius: '9999px',
                background: 'rgba(18, 20, 30, 0.8)',
                border: '1px solid rgba(232, 165, 152, 0.2)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <Compass size={13} color="#E8A598" />
              <span style={{ fontSize: 'clamp(0.72rem, 1.8vw, 0.78rem)', letterSpacing: '1px' }}>
                45° 59&#39; N • 9° 16&#39; E
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginTop: '4px',
              width: '100%',
            }}
          >
            <a
              href="#chapter-05"
              className="celestial-btn-tactile"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: 'clamp(13px, 2vh, 16px) clamp(22px, 4vw, 36px)',
                borderRadius: '9999px',
                background:
                  'linear-gradient(135deg, #E8A598 0%, #D48B7E 50%, #B86E61 100%)',
                color: '#07080D',
                fontWeight: 700,
                fontSize: 'clamp(0.78rem, 2vw, 0.85rem)',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                textDecoration: 'none',
                boxShadow: '0 12px 36px rgba(232, 165, 152, 0.35)',
                minHeight: '48px',
                width: 'min(100%, 280px)',
              }}
            >
              <span>Access VIP Pass</span>
              <Sparkles size={16} />
            </a>

            <a
              href="#chapter-02"
              className="celestial-btn-tactile"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: 'clamp(13px, 2vh, 16px) clamp(20px, 3.5vw, 32px)',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(232, 165, 152, 0.35)',
                color: '#FFF9F5',
                fontWeight: 600,
                fontSize: 'clamp(0.78rem, 2vw, 0.85rem)',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                textDecoration: 'none',
                backdropFilter: 'blur(16px)',
                minHeight: '48px',
                width: 'min(100%, 280px)',
              }}
            >
              <span>Discover Chronology</span>
              <ArrowDown size={15} />
            </a>
          </div>
        </div>

        {/* Scroll Indicator with Chronometer Needle Animation (Natural document flow to prevent CTA button overlap) */}
        <div
          style={{
            position: 'relative',
            marginTop: 'clamp(28px, 4.5vh, 48px)',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            opacity: 0.75,
          }}
        >
          <span
            style={{
              fontSize: '0.65rem',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              color: '#E8A598',
            }}
          >
            SCROLL TO EXPLORE
          </span>
          <div
            style={{
              width: '20px',
              height: '32px',
              borderRadius: '10px',
              border: '1px solid rgba(232, 165, 152, 0.5)',
              display: 'flex',
              justifyContent: 'center',
              paddingTop: '6px',
            }}
          >
            <div
              style={{
                width: '3px',
                height: '8px',
                background: '#E8A598',
                borderRadius: '2px',
                animation: 'bounce 1.8s infinite',
              }}
            />
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* CHAPTER 02: ASYMMETRIC STAGGERED PARALLAX COLLAGE (DIRECT SPYKER LAYOUT)   */}
      {/* ========================================================================= */}
      <section
        id="chapter-02"
        style={{
          position: 'relative',
          padding: 'clamp(50px, 8vh, 120px) clamp(16px, 4vw, 36px)',
          maxWidth: '1440px',
          margin: '0 auto',
          zIndex: 10,
        }}
      >
        {/* Section Chapter Header */}
        <div
          style={{
            textAlign: 'center',
            maxWidth: '780px',
            margin: '0 auto clamp(28px, 5vh, 60px) auto',
          }}
        >
          <p
            style={{
              fontSize: 'clamp(0.68rem, 1.8vw, 0.75rem)',
              letterSpacing: 'clamp(2px, 0.5vw, 4px)',
              textTransform: 'uppercase',
              color: '#E8A598',
              fontWeight: 600,
              marginBottom: '10px',
            }}
          >
            CHAPTER II • THE STAGGERED HORIZON
          </p>
          <h2
            style={{
              fontFamily: 'Playfair Display, Cormorant Garamond, serif',
              fontSize: 'clamp(1.9rem, 5vw, 3.8rem)',
              fontWeight: 500,
              letterSpacing: '1px',
              lineHeight: 1.15,
              color: '#FFF9F5',
              margin: '0 0 14px 0',
            }}
          >
            Pure Romance in Motion
          </h2>
          <p
            style={{
              fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
              lineHeight: 1.7,
              color: 'rgba(255, 249, 245, 0.72)',
              margin: 0,
            }}
          >
            Like the handcrafted coachwork of fine grand-tourers, every memory of our journey has
            been forged with unwavering intention. An interlocking narrative of shared horizons,
            whispered promises, and timeless devotion.
          </p>

          {/* Quick Jump Anchors on Mobile */}
          <div
            className="mobile-only"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '18px',
            }}
          >
            {[
              { id: '#figure-01', label: 'I. Encounter' },
              { id: '#figure-02', label: 'II. Sanctuary' },
              { id: '#figure-03', label: 'III. Sacred Seal' },
            ].map((f) => (
              <a
                key={f.id}
                href={f.id}
                style={{
                  fontSize: '0.68rem',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  background: 'rgba(232, 165, 152, 0.12)',
                  border: '1px solid rgba(232, 165, 152, 0.3)',
                  color: '#FFF9F5',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                {f.label}
              </a>
            ))}
          </div>
        </div>

        {/* 3-COLUMN ASYMMETRIC STAGGERED GRID WITH MULTI-SPEED PARALLAX */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : '1fr',
            columnGap: 'clamp(20px, 3vw, 32px)',
            rowGap: isDesktop ? 'clamp(32px, 5vh, 60px)' : 'clamp(28px, 4vh, 40px)',
            alignItems: 'start',
            maxWidth: isDesktop ? '1440px' : '480px',
            margin: '0 auto',
          }}
        >
          {/* FIGURE 1 */}
          <div
            id="figure-01"
            style={{
              transform: isDesktop ? `translate3d(0, ${scrollY * -0.05}px, 0)` : 'none',
              transition: isDesktop ? 'transform 0.1s linear' : 'none',
              background: 'rgba(18, 20, 30, 0.85)',
              border: '1px solid rgba(232, 165, 152, 0.35)',
              borderRadius: 'clamp(16px, 2.5vw, 22px)',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(232, 165, 152, 0.05)',
            }}
          >
            <div
              className="celestial-photo-card celestial-photo-card-1"
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '4/5',
                overflow: 'hidden',
                background: '#0D0F18',
              }}
            >
              <img
                src={milestones[0]?.image || "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1000&q=85"}
                alt={milestones[0]?.title || "The First Encounter"}
                className="celestial-figure-img"
              />
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  background: 'rgba(7, 8, 13, 0.82)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(232, 165, 152, 0.3)',
                  fontSize: 'clamp(0.6rem, 1.4vw, 0.68rem)',
                  color: '#E8A598',
                  letterSpacing: '1px',
                  fontWeight: 600,
                }}
              >
                {milestones[0]?.coords || '01 • THE SPARK'}
              </div>
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  background: 'rgba(7, 8, 13, 0.88)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(232, 165, 152, 0.35)',
                  fontSize: 'clamp(0.62rem, 1.5vw, 0.7rem)',
                  color: '#FFF9F5',
                  letterSpacing: '1.5px',
                  fontWeight: 700,
                }}
              >
                {milestones[0]?.chapter || 'MOMENT 01 • THE ENCOUNTER'}
              </div>
            </div>
            <div
              style={{
                padding: 'clamp(16px, 2.5vh, 22px) clamp(16px, 3vw, 24px)',
                background: 'linear-gradient(180deg, rgba(20, 23, 33, 0.95) 0%, rgba(14, 16, 24, 0.98) 100%)',
                borderTop: '1px solid rgba(232, 165, 152, 0.2)',
                textAlign: 'left',
              }}
            >
              <h3
                style={{
                  fontFamily: 'Playfair Display, Cormorant Garamond, serif',
                  fontSize: 'clamp(1.15rem, 2.4vw, 1.35rem)',
                  color: '#FFF9F5',
                  margin: '0 0 6px 0',
                  fontWeight: 600,
                }}
              >
                {milestones[0]?.title || 'The First Encounter'}
              </h3>
              <p
                style={{
                  fontSize: 'clamp(0.82rem, 1.8vw, 0.88rem)',
                  lineHeight: 1.65,
                  color: 'rgba(255, 249, 245, 0.72)',
                  margin: 0,
                }}
              >
                {milestones[0]?.description ||
                  'Two trajectories that collided in autumn. An iso-grid of shared passions, laughter, and mutual dreams that formed the bedrock of an unbreakable union.'}
              </p>
            </div>
          </div>

          {/* CONNECTOR NODE BETWEEN 1 & 2 ON MOBILE */}
          {!isDesktop && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                margin: '-14px 0',
              }}
            >
              <div style={{ width: '1px', height: '18px', background: 'linear-gradient(180deg, rgba(232,165,152,0.6), rgba(232,165,152,0.1))' }} />
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#E8A598', boxShadow: '0 0 8px #E8A598' }} />
              <div style={{ width: '1px', height: '18px', background: 'linear-gradient(180deg, rgba(232,165,152,0.1), rgba(232,165,152,0.6))' }} />
            </div>
          )}

          {/* FIGURE 2 */}
          <div
            id="figure-02"
            className="celestial-stagger-2"
            style={{
              transform: isDesktop ? `translate3d(0, ${scrollY * -0.11}px, 0)` : 'none',
              transition: isDesktop ? 'transform 0.1s linear' : 'none',
              background: 'rgba(18, 20, 30, 0.85)',
              border: '1px solid rgba(232, 165, 152, 0.35)',
              borderRadius: 'clamp(16px, 2.5vw, 22px)',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(232, 165, 152, 0.05)',
            }}
          >
            <div
              className="celestial-photo-card celestial-photo-card-2"
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '4/5',
                overflow: 'hidden',
                background: '#0D0F18',
              }}
            >
              <img
                src={milestones[1]?.image || "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1000&q=85"}
                alt={milestones[1]?.title || "The Shared Horizon"}
                className="celestial-figure-img"
              />
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  background: 'rgba(7, 8, 13, 0.82)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(232, 165, 152, 0.3)',
                  fontSize: 'clamp(0.6rem, 1.4vw, 0.68rem)',
                  color: '#E8A598',
                  letterSpacing: '1px',
                  fontWeight: 600,
                }}
              >
                {milestones[1]?.coords || '02 • THE HARMONY'}
              </div>
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  background: 'rgba(7, 8, 13, 0.88)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(232, 165, 152, 0.35)',
                  fontSize: 'clamp(0.62rem, 1.5vw, 0.7rem)',
                  color: '#FFF9F5',
                  letterSpacing: '1.5px',
                  fontWeight: 700,
                }}
              >
                {milestones[1]?.chapter || 'MOMENT 02 • THE JOURNEY'}
              </div>
            </div>
            <div
              style={{
                padding: 'clamp(16px, 2.5vh, 22px) clamp(16px, 3vw, 24px)',
                background: 'linear-gradient(180deg, rgba(20, 23, 33, 0.95) 0%, rgba(14, 16, 24, 0.98) 100%)',
                borderTop: '1px solid rgba(232, 165, 152, 0.2)',
                textAlign: 'left',
              }}
            >
              <h3
                style={{
                  fontFamily: 'Playfair Display, Cormorant Garamond, serif',
                  fontSize: 'clamp(1.15rem, 2.4vw, 1.35rem)',
                  color: '#FFF9F5',
                  margin: '0 0 6px 0',
                  fontWeight: 600,
                }}
              >
                {milestones[1]?.title || 'The Shared Horizon'}
              </h3>
              <p
                style={{
                  fontSize: 'clamp(0.82rem, 1.8vw, 0.88rem)',
                  lineHeight: 1.65,
                  color: 'rgba(255, 249, 245, 0.72)',
                  margin: 0,
                }}
              >
                {milestones[1]?.description ||
                  'Countless memories crafted through travels, late-night conversations, and learning each other’s unspoken languages. Building a steadfast love designed to outlast time itself.'}
              </p>
            </div>
          </div>

          {/* CONNECTOR NODE BETWEEN 2 & 3 ON MOBILE */}
          {!isDesktop && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                margin: '-14px 0',
              }}
            >
              <div style={{ width: '1px', height: '18px', background: 'linear-gradient(180deg, rgba(232,165,152,0.6), rgba(232,165,152,0.1))' }} />
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#E8A598', boxShadow: '0 0 8px #E8A598' }} />
              <div style={{ width: '1px', height: '18px', background: 'linear-gradient(180deg, rgba(232,165,152,0.1), rgba(232,165,152,0.6))' }} />
            </div>
          )}

          {/* FIGURE 3 */}
          <div
            id="figure-03"
            className="celestial-stagger-3"
            style={{
              transform: isDesktop ? `translate3d(0, ${scrollY * -0.07}px, 0)` : 'none',
              transition: isDesktop ? 'transform 0.1s linear' : 'none',
              background: 'rgba(18, 20, 30, 0.85)',
              border: '1px solid rgba(232, 165, 152, 0.35)',
              borderRadius: 'clamp(16px, 2.5vw, 22px)',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(232, 165, 152, 0.05)',
            }}
          >
            <div
              className="celestial-photo-card celestial-photo-card-3"
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '4/5',
                overflow: 'hidden',
                background: '#0D0F18',
              }}
            >
              <img
                src={milestones[2]?.image || "https://images.unsplash.com/photo-1519741497674-611481863552?w=1000&q=85"}
                alt={milestones[2]?.title || "The Sacred Promise"}
                className="celestial-figure-img"
              />
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  background: 'rgba(7, 8, 13, 0.82)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(232, 165, 152, 0.3)',
                  fontSize: 'clamp(0.6rem, 1.4vw, 0.68rem)',
                  color: '#E8A598',
                  letterSpacing: '1px',
                  fontWeight: 600,
                }}
              >
                {milestones[2]?.coords || '03 • THE PROMISE'}
              </div>
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  background: 'rgba(7, 8, 13, 0.88)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(232, 165, 152, 0.35)',
                  fontSize: 'clamp(0.62rem, 1.5vw, 0.7rem)',
                  color: '#FFF9F5',
                  letterSpacing: '1.5px',
                  fontWeight: 700,
                }}
              >
                {milestones[2]?.chapter || 'MOMENT 03 • THE PROMISE'}
              </div>
            </div>
            <div
              style={{
                padding: 'clamp(16px, 2.5vh, 22px) clamp(16px, 3vw, 24px)',
                background: 'linear-gradient(180deg, rgba(20, 23, 33, 0.95) 0%, rgba(14, 16, 24, 0.98) 100%)',
                borderTop: '1px solid rgba(232, 165, 152, 0.2)',
                textAlign: 'left',
              }}
            >
              <h3
                style={{
                  fontFamily: 'Playfair Display, Cormorant Garamond, serif',
                  fontSize: 'clamp(1.15rem, 2.4vw, 1.35rem)',
                  color: '#FFF9F5',
                  margin: '0 0 6px 0',
                  fontWeight: 600,
                }}
              >
                {milestones[2]?.title || 'The Sacred Promise'}
              </h3>
              <p
                style={{
                  fontSize: 'clamp(0.82rem, 1.8vw, 0.88rem)',
                  lineHeight: 1.65,
                  color: 'rgba(255, 249, 245, 0.72)',
                  margin: 0,
                }}
              >
                {milestones[2]?.description ||
                  'With quiet reverence beneath an open canopy of stars, the sacred question was asked. A breathless, whispered yes that sealed our tomorrows forever.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* CHAPTER 03: INTERACTIVE LOVERS' CHRONOGRAPH & MILESTONE TRAJECTORY         */}
      {/* ========================================================================= */}
      <section
        id="chapter-03"
        style={{
          position: 'relative',
          padding: 'clamp(60px, 10vh, 120px) clamp(16px, 4vw, 36px)',
          background: 'linear-gradient(180deg, #07080D 0%, #0D0F18 50%, #07080D 100%)',
          borderTop: '1px solid rgba(232, 165, 152, 0.15)',
          borderBottom: '1px solid rgba(232, 165, 152, 0.15)',
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Chapter Header */}
          <div style={{ textAlign: 'center', marginBottom: 'clamp(36px, 6vh, 60px)' }}>
            <p
              style={{
                fontSize: 'clamp(0.68rem, 1.8vw, 0.75rem)',
                letterSpacing: 'clamp(2px, 0.5vw, 4px)',
                textTransform: 'uppercase',
                color: '#E8A598',
                fontWeight: 600,
                marginBottom: '10px',
              }}
            >
              CHAPTER III • PRECISION HORLOGERIE
            </p>
            <h2
              style={{
                fontFamily: 'Playfair Display, Cormorant Garamond, serif',
                fontSize: 'clamp(1.9rem, 5vw, 3.5rem)',
                fontWeight: 500,
                letterSpacing: '1px',
                color: '#FFF9F5',
                margin: 0,
              }}
            >
              The Architecture of Time
            </h2>
          </div>

          {/* 4 HIGH-PRECISION CHRONOGRAPH COUNTDOWN SUB-DIALS (4 in one row across all viewports) */}
          <div
            className="celestial-countdown-grid"
            style={{
              marginBottom: 'clamp(40px, 6vh, 70px)',
            }}
          >
            {[
              { label: 'DAYS', value: timeLeft.days, max: 365 },
              { label: 'HOURS', value: timeLeft.hours, max: 24 },
              { label: 'MINUTES', value: timeLeft.minutes, max: 60 },
              { label: 'SECONDS', value: timeLeft.seconds, max: 60 },
            ].map((subdial, idx) => (
              <div
                key={idx}
                style={{
                  minWidth: 0,
                  background: 'rgba(18, 20, 30, 0.85)',
                  border: '1px solid rgba(232, 165, 152, 0.35)',
                  borderRadius: 'clamp(12px, 2vw, 20px)',
                  padding: 'clamp(14px, 2.2vh, 26px) clamp(4px, 1.2vw, 14px)',
                  textAlign: 'center',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Dial Concentric Bezel */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-15px',
                    right: '-15px',
                    width: 'clamp(40px, 8vw, 80px)',
                    height: 'clamp(40px, 8vw, 80px)',
                    borderRadius: '50%',
                    border: '1px dashed rgba(232, 165, 152, 0.2)',
                    pointerEvents: 'none',
                  }}
                />
                <div
                  style={{
                    fontSize: 'clamp(1.25rem, 4.6vw, 3rem)',
                    fontFamily: 'Playfair Display, Cormorant Garamond, serif',
                    fontWeight: 600,
                    color: '#FFF9F5',
                    lineHeight: 1,
                    marginBottom: 'clamp(4px, 0.8vh, 8px)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {String(subdial.value).padStart(2, '0')}
                </div>
                <div
                  style={{
                    fontSize: 'clamp(0.5rem, 1.4vw, 0.68rem)',
                    letterSpacing: 'clamp(0.5px, 0.2vw, 2px)',
                    textTransform: 'uppercase',
                    color: '#E8A598',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%',
                  }}
                >
                  {subdial.label}
                </div>
              </div>
            ))}
          </div>

          {/* INTERACTIVE MILESTONE TRAJECTORY SCRUBBER */}
          {isStoryVisible && (
            <div
              style={{
                background: 'rgba(18, 20, 30, 0.9)',
                border: '1px solid rgba(232, 165, 152, 0.4)',
                borderRadius: 'clamp(18px, 3vw, 28px)',
                padding: 'clamp(20px, 3.5vw, 40px) clamp(16px, 3vw, 32px)',
                backdropFilter: 'blur(25px)',
                WebkitBackdropFilter: 'blur(25px)',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
              }}
            >
            {/* Top Scrubber Axis Navigation (Header + 4-in-one-row milestone tabs) */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'clamp(14px, 2vh, 20px)',
                borderBottom: '1px solid rgba(232, 165, 152, 0.2)',
                paddingBottom: 'clamp(16px, 2.5vh, 24px)',
                marginBottom: 'clamp(20px, 3.5vh, 36px)',
              }}
            >
              {/* Header Title & Compass Indicator */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: 'clamp(0.62rem, 1.6vw, 0.7rem)',
                      letterSpacing: '2px',
                      color: '#E8A598',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                    }}
                  >
                    TRAJECTORY COMPASS
                  </span>
                  <h3
                    style={{
                      fontFamily: 'Playfair Display, Cormorant Garamond, serif',
                      fontSize: 'clamp(1.1rem, 2.5vw, 1.45rem)',
                      color: '#FFF9F5',
                      margin: '3px 0 0 0',
                    }}
                  >
                    Milestone Horizon • Our Story Timeline
                  </h3>
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    background: 'rgba(232, 165, 152, 0.12)',
                    border: '1px solid rgba(232, 165, 152, 0.3)',
                    fontSize: 'clamp(0.65rem, 1.6vw, 0.72rem)',
                    color: '#FFF9F5',
                    letterSpacing: '1px',
                  }}
                >
                  <Compass size={12} color="#E8A598" />
                  <span>STEP 0{activeMilestone + 1} OF 0{milestones.length}</span>
                </div>
              </div>

              {/* MILESTONE TRAJECTORY SCRUBBER TRACK */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    milestones.length <= 4
                      ? `repeat(${Math.max(1, milestones.length)}, 1fr)`
                      : 'repeat(auto-fit, minmax(80px, 1fr))',
                  gap: 'clamp(6px, 1.5vw, 12px)',
                  width: '100%',
                }}
              >
                {milestones.map((m, idx) => {
                  const isActive = activeMilestone === idx;
                  const displayTag = m.year || `0${idx + 1}`;
                  const displayLabel = m.label || m.title || `PART 0${idx + 1}`;

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setActiveMilestone(idx)}
                      className="celestial-btn-tactile"
                      style={{
                        minWidth: 0,
                        padding: 'clamp(8px, 1.4vh, 14px) clamp(4px, 1vw, 10px)',
                        borderRadius: 'clamp(10px, 1.8vw, 16px)',
                        background: isActive
                          ? 'linear-gradient(180deg, rgba(232, 165, 152, 0.22) 0%, rgba(18, 20, 30, 0.8) 100%)'
                          : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${isActive ? '#E8A598' : 'rgba(255, 255, 255, 0.08)'}`,
                        boxShadow: isActive ? '0 4px 18px rgba(232, 165, 152, 0.25)' : 'none',
                        color: isActive ? '#FFF9F5' : 'rgba(255, 255, 255, 0.6)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3px',
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        outline: 'none',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 'clamp(0.72rem, 2.2vw, 0.95rem)',
                          fontWeight: 700,
                          letterSpacing: 'clamp(0.5px, 0.2vw, 1px)',
                          color: isActive ? '#FFF9F5' : 'rgba(255, 255, 255, 0.75)',
                          lineHeight: 1.1,
                        }}
                      >
                        {displayTag}
                      </span>
                      <span
                        style={{
                          fontSize: 'clamp(0.5rem, 1.3vw, 0.65rem)',
                          letterSpacing: 'clamp(0.4px, 0.1vw, 1px)',
                          textTransform: 'uppercase',
                          fontWeight: 600,
                          color: isActive ? '#E8A598' : 'rgba(255, 255, 255, 0.4)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '100%',
                        }}
                      >
                        {displayLabel}
                      </span>
                      <div
                        style={{
                          width: '100%',
                          height: '3px',
                          borderRadius: '2px',
                          marginTop: '2px',
                          background: isActive
                            ? 'linear-gradient(90deg, #E8A598 0%, #D48B7E 100%)'
                            : 'rgba(255, 255, 255, 0.08)',
                          boxShadow: isActive ? '0 0 8px rgba(232, 165, 152, 0.6)' : 'none',
                          transition: 'all 0.25s ease',
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Milestone Card View */}
            {(() => {
              const currentMilestone =
                milestones[activeMilestone] || milestones[0]!;
              return (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                    gap: 'clamp(20px, 3.5vw, 36px)',
                    alignItems: 'center',
                  }}
                >
                  {/* Photo Frame */}
                  <div
                    style={{
                      borderRadius: '18px',
                      overflow: 'hidden',
                      position: 'relative',
                      aspectRatio: '16/10',
                      border: '1px solid rgba(232, 165, 152, 0.3)',
                    }}
                  >
                    <img
                      src={currentMilestone.image}
                      alt={currentMilestone.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center 35%',
                        transition: 'all 0.4s ease',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '10px',
                        left: '10px',
                        padding: '5px 12px',
                        borderRadius: '9999px',
                        background: 'rgba(7, 8, 13, 0.88)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(232, 165, 152, 0.3)',
                        fontSize: 'clamp(0.65rem, 1.6vw, 0.72rem)',
                        color: '#E8A598',
                        letterSpacing: '1px',
                      }}
                    >
                      {currentMilestone.coords}
                    </div>
                  </div>

                  {/* Narrative Content */}
                  <div>
                    <div
                      style={{
                        fontSize: 'clamp(0.65rem, 1.6vw, 0.72rem)',
                        letterSpacing: '2px',
                        color: '#E8A598',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        marginBottom: '6px',
                      }}
                    >
                      {currentMilestone.chapter} • {currentMilestone.location}
                    </div>
                    <h4
                      style={{
                        fontFamily: 'Playfair Display, serif',
                        fontSize: 'clamp(1.35rem, 3.2vw, 1.8rem)',
                        color: '#FFF9F5',
                        margin: '0 0 12px 0',
                      }}
                    >
                      {currentMilestone.title}
                    </h4>
                    <p
                      style={{
                        fontSize: 'clamp(0.85rem, 1.8vw, 0.92rem)',
                        lineHeight: 1.65,
                        color: 'rgba(255, 249, 245, 0.8)',
                        marginBottom: '20px',
                      }}
                    >
                      {currentMilestone.description}
                    </p>

                    {/* Progress Indicators with comfortable touch targets */}
                    <div style={{ display: 'flex', gap: '8px', padding: '6px 0' }}>
                      {milestones.map((_, i) => (
                        <div
                          key={i}
                          onClick={() => setActiveMilestone(i)}
                          style={{
                            height: '6px',
                            flex: 1,
                            borderRadius: '3px',
                            background:
                              i === activeMilestone
                                ? 'linear-gradient(90deg, #E8A598, #D48B7E)'
                                : 'rgba(232, 165, 152, 0.2)',
                            boxShadow:
                              i === activeMilestone ? '0 0 8px rgba(232, 165, 152, 0.6)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* CHAPTER 04: THE CEREMONIAL MOVEMENT & VENUE ITINERARY                     */}
      {/* ========================================================================= */}
      <section
        id="chapter-04"
        style={{
          position: 'relative',
          padding: 'clamp(60px, 10vh, 120px) clamp(16px, 4vw, 36px)',
          maxWidth: '1200px',
          margin: '0 auto',
          zIndex: 10,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 'clamp(32px, 5vh, 60px)' }}>
          <p
            style={{
              fontSize: 'clamp(0.68rem, 1.8vw, 0.75rem)',
              letterSpacing: 'clamp(2px, 0.5vw, 4px)',
              textTransform: 'uppercase',
              color: '#E8A598',
              fontWeight: 600,
              marginBottom: '10px',
            }}
          >
            CHAPTER IV • THE CEREMONIAL SEQUENCE
          </p>
          <h2
            style={{
              fontFamily: 'Playfair Display, Cormorant Garamond, serif',
              fontSize: 'clamp(1.9rem, 5vw, 3.5rem)',
              fontWeight: 500,
              color: '#FFF9F5',
              margin: 0,
            }}
          >
            The Movement of Celebrations
          </h2>
        </div>

        {/* Itinerary Timeline Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: 'clamp(16px, 2.5vw, 24px)',
          }}
        >
          {itineraryEvents.map((event, idx) => {
            const Icon = event.icon;
            return (
              <div
                key={idx}
                style={{
                  background: 'rgba(18, 20, 30, 0.75)',
                  border: '1px solid rgba(232, 165, 152, 0.25)',
                  borderRadius: 'clamp(16px, 2.5vw, 20px)',
                  padding: 'clamp(20px, 3vh, 30px) clamp(18px, 3vw, 26px)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'all 0.3s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontSize: 'clamp(1.2rem, 3vw, 1.4rem)',
                      fontFamily: 'serif',
                      fontWeight: 600,
                      color: '#E8A598',
                    }}
                  >
                    {event.time}
                  </span>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(232, 165, 152, 0.12)',
                      border: '1px solid rgba(232, 165, 152, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#E8A598',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} />
                  </div>
                </div>

                <h4
                  style={{
                    fontSize: 'clamp(1.05rem, 2.4vw, 1.15rem)',
                    fontWeight: 600,
                    color: '#FFF9F5',
                    margin: 0,
                  }}
                >
                  {event.title}
                </h4>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#E8B86D',
                    fontSize: 'clamp(0.76rem, 1.8vw, 0.8rem)',
                  }}
                >
                  <MapPin size={13} />
                  <span>{event.venue}</span>
                </div>

                <p
                  style={{
                    fontSize: 'clamp(0.82rem, 1.8vw, 0.86rem)',
                    lineHeight: 1.6,
                    color: 'rgba(255, 249, 245, 0.65)',
                    margin: 0,
                  }}
                >
                  {event.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Venue Protocol & Google Maps Link */}
        <div
          style={{
            marginTop: 'clamp(24px, 4vh, 40px)',
            padding: 'clamp(16px, 2.5vh, 24px) clamp(16px, 3vw, 32px)',
            borderRadius: 'clamp(16px, 2.5vw, 20px)',
            background: 'rgba(18, 20, 30, 0.6)',
            border: '1px solid rgba(232, 165, 152, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 'clamp(0.65rem, 1.6vw, 0.72rem)',
                letterSpacing: '2px',
                color: '#E8A598',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              VENUE &amp; DRESS CODE PROTOCOL
            </div>
            <div style={{ fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', color: '#FFF9F5', marginTop: '4px' }}>
              <strong>Dress Code:</strong> {protocolDressCode}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: isDesktop ? 'row' : 'column',
              gap: '10px',
              width: isDesktop ? 'auto' : '100%',
            }}
          >
            <button
              type="button"
              onClick={handleAddToCalendar}
              className="celestial-btn-tactile"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 20px',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(232, 165, 152, 0.3)',
                color: '#FFF9F5',
                fontSize: 'clamp(0.78rem, 1.8vw, 0.84rem)',
                fontWeight: 600,
                letterSpacing: '1px',
                cursor: 'pointer',
                minHeight: '46px',
                width: isDesktop ? 'auto' : '100%',
                boxSizing: 'border-box',
              }}
            >
              <Calendar size={14} color="#E8A598" />
              <span>Add to Calendar (.ics)</span>
            </button>

            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(`${venueName}, ${venueCity}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="celestial-btn-tactile"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 22px',
                borderRadius: '9999px',
                background: 'rgba(232, 165, 152, 0.15)',
                border: '1px solid rgba(232, 165, 152, 0.4)',
                color: '#E8A598',
                fontSize: 'clamp(0.78rem, 1.8vw, 0.84rem)',
                fontWeight: 600,
                textDecoration: 'none',
                letterSpacing: '1px',
                minHeight: '46px',
                width: isDesktop ? 'auto' : '100%',
                boxSizing: 'border-box',
              }}
            >
              <span>Open in Google Maps</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* CHAPTER 05: 24K ROSE-GOLD VIP PASS & RSVP TERMINAL (SPYKER BOARDING PASS) */}
      {/* ========================================================================= */}
      <section
        id="chapter-05"
        style={{
          position: 'relative',
          padding: 'clamp(60px, 10vh, 120px) clamp(16px, 4vw, 36px)',
          background: 'linear-gradient(180deg, #07080D 0%, #11131E 50%, #07080D 100%)',
          borderTop: '1px solid rgba(232, 165, 152, 0.15)',
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(32px, 5vh, 50px)' }}>
            <p
              style={{
                fontSize: 'clamp(0.68rem, 1.8vw, 0.75rem)',
                letterSpacing: 'clamp(2px, 0.5vw, 4px)',
                textTransform: 'uppercase',
                color: '#E8A598',
                fontWeight: 600,
                marginBottom: '10px',
              }}
            >
              CHAPTER V • THE ROYAL ASSEMBLAGE
            </p>
            <h2
              style={{
                fontFamily: 'Playfair Display, Cormorant Garamond, serif',
                fontSize: 'clamp(1.9rem, 5vw, 3.5rem)',
                fontWeight: 500,
                color: '#FFF9F5',
                margin: '0 0 clamp(8px, 1.5vh, 14px) 0',
              }}
            >
              Your VIP Invitation Pass
            </h2>
            <p
              style={{
                fontSize: 'clamp(0.85rem, 2vw, 0.92rem)',
                color: 'rgba(255, 249, 245, 0.7)',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Please confirm your presence to ensure seamless helicopter transfer, suite
              allocation, and bespoke banquet arrangements.
            </p>
          </div>

          {/* THE GILDED VIP BOARDING PASS TICKET CARD */}
          <div
            style={{
              position: 'relative',
              borderRadius: 'clamp(18px, 3vw, 24px)',
              background: 'linear-gradient(145deg, #181B26 0%, #10121B 100%)',
              border: '2px solid rgba(232, 165, 152, 0.5)',
              boxShadow: '0 25px 70px rgba(0,0,0,0.9), 0 0 40px rgba(232, 165, 152, 0.15)',
              overflow: 'hidden',
            }}
          >
            {/* Top Pass Foil Header */}
            <div
              style={{
                position: 'relative',
                padding: 'clamp(16px, 2.5vh, 24px) clamp(16px, 3.5vw, 32px)',
                background:
                  'linear-gradient(135deg, rgba(232, 165, 152, 0.25) 0%, rgba(232, 184, 109, 0.15) 100%)',
                borderBottom: '1px dashed rgba(232, 165, 152, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              {/* Left and Right Perforated Ticket Notches */}
              <div className="ticket-notch-left" />
              <div className="ticket-notch-right" />

              <div>
                <div
                  style={{
                    fontSize: 'clamp(0.62rem, 1.6vw, 0.68rem)',
                    letterSpacing: '2.5px',
                    color: '#E8A598',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                  }}
                >
                  OFFICIAL VIP INVITATION PASS
                </div>
                <div
                  style={{
                    fontFamily: 'serif',
                    fontSize: 'clamp(1.1rem, 2.8vw, 1.25rem)',
                    fontWeight: 600,
                    color: '#FFF9F5',
                  }}
                >
                  {celebrationTitle}
                </div>
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '5px 14px',
                  borderRadius: '9999px',
                  background: 'rgba(232, 165, 152, 0.15)',
                  border: '1px solid rgba(232, 165, 152, 0.4)',
                  fontSize: 'clamp(0.68rem, 1.8vw, 0.75rem)',
                  color: '#FFF5EA',
                  fontWeight: 600,
                }}
              >
                <Compass size={13} color="#E8A598" />
                <span>PASSCODE: VERIFIED</span>
              </div>
            </div>

            {/* Pass Body Form */}
            <div style={{ padding: 'clamp(20px, 3vh, 36px) clamp(16px, 3.5vw, 32px)' }}>
              {isRsvpSubmitted ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '30px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px',
                  }}
                >
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid #10B981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#10B981',
                      boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    <CheckCircle2 size={32} />
                  </div>
                  <h3
                    style={{
                      fontFamily: 'serif',
                      fontSize: 'clamp(1.4rem, 3.5vw, 1.8rem)',
                      color: '#FFF9F5',
                      margin: 0,
                    }}
                  >
                    VIP Boarding Pass Confirmed
                  </h3>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      background: 'rgba(232, 165, 152, 0.15)',
                      border: '1px solid rgba(232, 165, 152, 0.35)',
                      color: '#E8A598',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                    }}
                  >
                    <Sparkles size={14} />
                    <span>STATUS: ALLOCATED FOR {guestCount} {Number(guestCount) > 1 ? 'GUESTS' : 'GUEST'}</span>
                  </div>
                  <p
                    style={{
                      fontSize: 'clamp(0.85rem, 2vw, 0.92rem)',
                      color: 'rgba(255, 249, 245, 0.75)',
                      maxWidth: '480px',
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    Thank you, <strong>{rsvpName}</strong>. Your VIP reservation has been logged into the celestial registry for {venueCity}.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={handleAddToCalendar}
                      className="celestial-btn-tactile"
                      style={{
                        padding: '10px 20px',
                        borderRadius: '9999px',
                        background: 'linear-gradient(135deg, #E8A598 0%, #D48B7E 100%)',
                        border: 'none',
                        color: '#07080D',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        minHeight: '44px',
                      }}
                    >
                      <Calendar size={14} />
                      <span>Save to Apple / Google Calendar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRsvpSubmitted(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#E8A598',
                        fontSize: '0.82rem',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        padding: '8px 12px',
                        minHeight: '44px',
                      }}
                    >
                      Modify RSVP response
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleRsvpSubmit}
                  style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 2.5vh, 22px)' }}
                >
                  {/* Status Toggle */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 'clamp(0.68rem, 1.8vw, 0.75rem)',
                        letterSpacing: '2px',
                        textTransform: 'uppercase',
                        color: '#E8A598',
                        marginBottom: '10px',
                        fontWeight: 600,
                      }}
                    >
                      Will you attend our celebration?
                    </label>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setRsvpStatus('ATTENDING')}
                        className="celestial-btn-tactile"
                        style={{
                          flex: 1,
                          minWidth: 'min(100%, 140px)',
                          padding: '14px 10px',
                          borderRadius: '12px',
                          background:
                            rsvpStatus === 'ATTENDING'
                              ? 'rgba(232, 165, 152, 0.25)'
                              : 'rgba(255, 255, 255, 0.04)',
                          border: `1px solid ${rsvpStatus === 'ATTENDING' ? '#E8A598' : 'rgba(255, 255, 255, 0.1)'}`,
                          color: rsvpStatus === 'ATTENDING' ? '#FFF9F5' : 'rgba(255, 255, 255, 0.6)',
                          fontSize: 'clamp(0.82rem, 2vw, 0.88rem)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          minHeight: '48px',
                        }}
                      >
                        <UserCheck size={16} />
                        <span>Accepts with Joy</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRsvpStatus('DECLINING')}
                        className="celestial-btn-tactile"
                        style={{
                          flex: 1,
                          minWidth: 'min(100%, 140px)',
                          padding: '14px 10px',
                          borderRadius: '12px',
                          background:
                            rsvpStatus === 'DECLINING'
                              ? 'rgba(239, 68, 68, 0.2)'
                              : 'rgba(255, 255, 255, 0.04)',
                          border: `1px solid ${rsvpStatus === 'DECLINING' ? '#EF4444' : 'rgba(255, 255, 255, 0.1)'}`,
                          color: rsvpStatus === 'DECLINING' ? '#FCA5A5' : 'rgba(255, 255, 255, 0.6)',
                          fontSize: 'clamp(0.82rem, 2vw, 0.88rem)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          minHeight: '48px',
                        }}
                      >
                        <UserX size={16} />
                        <span>Regretfully Declines</span>
                      </button>
                    </div>
                  </div>

                  {/* Name Input (16px to prevent iOS auto-zoom) */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 'clamp(0.68rem, 1.8vw, 0.75rem)',
                        letterSpacing: '2px',
                        textTransform: 'uppercase',
                        color: '#E8A598',
                        marginBottom: '8px',
                        fontWeight: 600,
                      }}
                    >
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Lord Alexander Vance"
                      value={rsvpName}
                      onChange={(e) => setRsvpName(e.target.value)}
                      className="celestial-input"
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: '12px',
                        background: 'rgba(7, 8, 13, 0.75)',
                        border: '1px solid rgba(232, 165, 152, 0.3)',
                        color: '#FFF9F5',
                        fontSize: '16px',
                        outline: 'none',
                        minHeight: '48px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Guest Count & Dietary Preferences Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                      gap: '16px',
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: 'clamp(0.68rem, 1.8vw, 0.75rem)',
                          letterSpacing: '2px',
                          textTransform: 'uppercase',
                          color: '#E8A598',
                          marginBottom: '8px',
                          fontWeight: 600,
                        }}
                      >
                        Total Attendees
                      </label>
                      <select
                        value={guestCount}
                        onChange={(e) => setGuestCount(e.target.value)}
                        className="celestial-select celestial-input"
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          borderRadius: '12px',
                          background: '#07080D',
                          border: '1px solid rgba(232, 165, 152, 0.3)',
                          color: '#FFF9F5',
                          fontSize: '16px',
                          outline: 'none',
                          minHeight: '48px',
                          boxSizing: 'border-box',
                        }}
                      >
                        {Array.from(
                          { length: Math.min(Math.max(rsvpMaxGuests, 1), 6) },
                          (_, i) => i + 1
                        ).map((num) => (
                          <option key={num} value={String(num)}>
                            {num} {num === 1 ? 'Person (Solo VIP Pass)' : num === 2 ? 'Persons (Couple Pass)' : num === 3 ? 'Persons (Family Pass)' : 'Persons (Party Pass)'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: 'clamp(0.68rem, 1.8vw, 0.75rem)',
                          letterSpacing: '2px',
                          textTransform: 'uppercase',
                          color: '#E8A598',
                          marginBottom: '8px',
                          fontWeight: 600,
                        }}
                      >
                        Dietary Specifications
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Vegetarian, Gluten-Free, Halal"
                        value={dietary}
                        onChange={(e) => setDietary(e.target.value)}
                        className="celestial-input"
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          borderRadius: '12px',
                          background: 'rgba(7, 8, 13, 0.75)',
                          border: '1px solid rgba(232, 165, 152, 0.3)',
                          color: '#FFF9F5',
                          fontSize: '16px',
                          outline: 'none',
                          minHeight: '48px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  {/* Note to the Couple */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 'clamp(0.68rem, 1.8vw, 0.75rem)',
                        letterSpacing: '2px',
                        textTransform: 'uppercase',
                        color: '#E8A598',
                        marginBottom: '8px',
                        fontWeight: 600,
                      }}
                    >
                      Personal Note for the Couple
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Share a heartfelt message, song request, or travel details..."
                      value={rsvpNote}
                      onChange={(e) => setRsvpNote(e.target.value)}
                      className="celestial-input"
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: '12px',
                        background: 'rgba(7, 8, 13, 0.75)',
                        border: '1px solid rgba(232, 165, 152, 0.3)',
                        color: '#FFF9F5',
                        fontSize: '16px',
                        outline: 'none',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={rsvpStatus === 'IDLE'}
                    className="celestial-btn-tactile"
                    style={{
                      padding: 'clamp(14px, 2vh, 18px)',
                      borderRadius: '9999px',
                      background:
                        rsvpStatus === 'IDLE'
                          ? 'rgba(255, 255, 255, 0.08)'
                          : 'linear-gradient(135deg, #E8A598 0%, #D48B7E 50%, #B86E61 100%)',
                      border: 'none',
                      color: rsvpStatus === 'IDLE' ? 'rgba(255, 255, 255, 0.4)' : '#07080D',
                      fontWeight: 700,
                      fontSize: 'clamp(0.8rem, 2vw, 0.86rem)',
                      letterSpacing: '2px',
                      textTransform: 'uppercase',
                      cursor: rsvpStatus === 'IDLE' ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      minHeight: '52px',
                      width: '100%',
                      boxShadow:
                        rsvpStatus === 'IDLE'
                          ? 'none'
                          : '0 12px 30px rgba(232, 165, 152, 0.35)',
                    }}
                  >
                    <span>
                      {rsvpStatus === 'IDLE'
                        ? 'Select Attendance Option Above'
                        : 'Confirm & Transmit VIP RSVP'}
                    </span>
                    <Send size={15} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* CHAPTER 06: STARLIGHT WISHES WALL & GUESTBOOK                             */}
      {/* ========================================================================= */}
      <section
        id="chapter-06"
        style={{
          position: 'relative',
          padding: 'clamp(60px, 10vh, 120px) clamp(16px, 4vw, 36px)',
          maxWidth: '1200px',
          margin: '0 auto',
          zIndex: 10,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 'clamp(32px, 5vh, 50px)' }}>
          <p
            style={{
              fontSize: 'clamp(0.68rem, 1.8vw, 0.75rem)',
              letterSpacing: 'clamp(2px, 0.5vw, 4px)',
              textTransform: 'uppercase',
              color: '#E8A598',
              fontWeight: 600,
              marginBottom: '10px',
            }}
          >
            STARLIGHT ARCHIVE
          </p>
          <h2
            style={{
              fontFamily: 'Playfair Display, Cormorant Garamond, serif',
              fontSize: 'clamp(1.9rem, 5vw, 3.5rem)',
              fontWeight: 500,
              color: '#FFF9F5',
              margin: 0,
            }}
          >
            Wishes from Around the World
          </h2>
        </div>

        {/* Wish Submission Form */}
        <form
          onSubmit={handleWishSubmit}
          style={{
            maxWidth: '680px',
            margin: '0 auto clamp(36px, 6vh, 60px) auto',
            background: 'rgba(18, 20, 30, 0.75)',
            border: '1px solid rgba(232, 165, 152, 0.25)',
            borderRadius: 'clamp(16px, 2.5vw, 20px)',
            padding: 'clamp(18px, 2.5vh, 24px) clamp(16px, 3vw, 28px)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {wishSentNotification && (
            <div
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                background: 'rgba(232, 165, 152, 0.15)',
                border: '1px solid rgba(232, 165, 152, 0.45)',
                color: '#FFF9F5',
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                textAlign: 'center',
              }}
            >
              <Sparkles size={15} color="#E8A598" />
              <span>Your blessing has been etched into the starlight archive!</span>
            </div>
          )}

          <input
            type="text"
            required
            placeholder="Your Name (e.g. Elena Rostova)"
            value={newWishAuthor}
            onChange={(e) => setNewWishAuthor(e.target.value)}
            className="celestial-input"
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '10px',
              background: '#07080D',
              border: '1px solid rgba(232, 165, 152, 0.25)',
              color: '#FFF9F5',
              fontSize: '16px',
              outline: 'none',
              minHeight: '46px',
              boxSizing: 'border-box',
            }}
          />
          <textarea
            rows={2}
            required
            placeholder="Leave a blessing for the couple..."
            value={newWishText}
            onChange={(e) => setNewWishText(e.target.value)}
            className="celestial-input"
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '10px',
              background: '#07080D',
              border: '1px solid rgba(232, 165, 152, 0.25)',
              color: '#FFF9F5',
              fontSize: '16px',
              outline: 'none',
              resize: 'none',
              minHeight: '46px',
              boxSizing: 'border-box',
            }}
          />
          <button
            type="submit"
            className="celestial-btn-tactile"
            style={{
              alignSelf: isDesktop ? 'flex-end' : 'stretch',
              width: isDesktop ? 'auto' : '100%',
              justifyContent: 'center',
              padding: '12px 24px',
              borderRadius: '9999px',
              background: '#E8A598',
              border: 'none',
              color: '#07080D',
              fontSize: 'clamp(0.75rem, 1.8vw, 0.8rem)',
              fontWeight: 700,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              minHeight: '46px',
            }}
          >
            <span>Post Blessing</span>
            <Sparkles size={13} />
          </button>
        </form>

        {/* Wishes Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: 'clamp(14px, 2vw, 20px)',
          }}
        >
          {wishes.map((w) => (
            <div
              key={w.id}
              style={{
                padding: 'clamp(18px, 2.5vh, 24px)',
                borderRadius: 'clamp(14px, 2vw, 18px)',
                background: 'rgba(18, 20, 30, 0.65)',
                border: '1px solid rgba(232, 165, 152, 0.2)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '14px',
              }}
            >
              <p
                style={{
                  fontSize: 'clamp(0.84rem, 1.8vw, 0.88rem)',
                  lineHeight: 1.6,
                  color: 'rgba(255, 249, 245, 0.8)',
                  margin: 0,
                  fontStyle: 'italic',
                }}
              >
                &ldquo;{w.text}&rdquo;
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingTop: '10px',
                }}
              >
                <span style={{ fontSize: 'clamp(0.78rem, 1.8vw, 0.82rem)', fontWeight: 600, color: '#E8A598' }}>
                  {w.author}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#A1A1AA' }}>{w.time}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MONUMENTAL FOOTER (SPYKER SIGNATURE WATERMARK)                            */}
      {/* ========================================================================= */}
      <footer
        style={{
          padding: 'clamp(50px, 8vh, 80px) clamp(16px, 4vw, 24px) calc(clamp(40px, 6vh, 60px) + env(safe-area-inset-bottom, 0px)) clamp(16px, 4vw, 24px)',
          borderTop: '1px solid rgba(232, 165, 152, 0.15)',
          background: 'rgba(7, 8, 13, 0.95)',
          textAlign: 'center',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '1px solid #E8A598',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#E8A598',
              margin: '0 auto 14px auto',
            }}
          >
            <Compass size={18} />
          </div>

          <div
            style={{
              fontSize: 'clamp(0.66rem, 1.6vw, 0.72rem)',
              letterSpacing: 'clamp(2px, 0.5vw, 4px)',
              color: '#E8A598',
              textTransform: 'uppercase',
              fontWeight: 600,
              marginBottom: '8px',
            }}
          >
            NULLA TENACI INVIA EST VIA
          </div>

          <p
            style={{
              fontSize: 'clamp(0.8rem, 1.8vw, 0.85rem)',
              color: 'rgba(255, 249, 245, 0.6)',
              margin: '0 0 20px 0',
              lineHeight: 1.6,
            }}
          >
            For the tenacious in love, no road is impassable. Created with{' '}
            <strong style={{ color: '#FFF9F5' }}>OrbitoX Celebrations</strong>.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
            }}
          >
            <Link
              href="/create"
              style={{
                fontSize: 'clamp(0.72rem, 1.8vw, 0.75rem)',
                color: '#E8A598',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                textDecoration: 'none',
                padding: '8px 16px',
                borderRadius: '9999px',
                background: 'rgba(232, 165, 152, 0.08)',
                border: '1px solid rgba(232, 165, 152, 0.25)',
              }}
            >
              Craft Your Celebration ↗
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
