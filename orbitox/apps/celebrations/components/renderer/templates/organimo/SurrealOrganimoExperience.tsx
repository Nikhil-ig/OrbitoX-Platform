'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Experience, Theme } from '@orbitox-io/celebrations';
import {
  Heart,
  Calendar,
  Clock,
  MapPin,
  Mail,
  Send,
  Volume2,
  VolumeX,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Users,
  ArrowRight,
  BookOpen,
  User,
} from 'lucide-react';
import {
  RosePetalSvg,
  RoseStemSvg,
  RoseBouquetCluster,
  RoseIcon,
  InterconnectingVineLine,
} from './RoseDecorations';
import { WishesGuestbookSection } from '../../sections/WishesGuestbookSection';
import { CoupleTitle } from '../../CoupleTitle';
import { UnifiedSceneRenderer } from '../../UnifiedSceneRenderer';
import { CELESTIAL_ODYSSEY_SCHEMA } from '../../../template-studio/schema/builtin-schemas';
import { CelebrationState } from '@/components/studio/StudioData';

interface Props {
  experience: Experience;
  theme: Theme;
}

// Lightweight, performant IntersectionObserver hook for Awwwards-style scroll reveals
function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, isInView] as const;
}

export function SurrealOrganimoExperience({ experience, theme }: Props) {
  // RSVP Form State
  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');
  const [attendingStatus, setAttendingStatus] = useState<'ATTENDING' | 'DECLINED'>('ATTENDING');
  const [partySize, setPartySize] = useState(2);
  const [dietary, setDietary] = useState('Standard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rsvpSubmitted, setRsvpSubmitted] = useState(false);

  // Audio State & Reference
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Scroll Reveal Refs
  const [highlightsRef, isHighlightsInView] = useInView();
  const [bannerRef, isBannerInView] = useInView();
  const [coupleRef, isCoupleInView] = useInView();
  const [galleryRef, isGalleryInView] = useInView();
  const [rsvpRef, isRsvpInView] = useInView();
  const [storyRef, isStoryInView] = useInView();
  const [eventsRef, isEventsInView] = useInView();
  const [thankYouRef, isThankYouInView] = useInView();

  // Gallery Carousel State & Scroll Ref for Mobile Touch-Swipe
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const galleryScrollRef = useRef<HTMLDivElement>(null);

  // Highlight Cards Carousel State & Scroll Ref for Mobile
  const [activeHighlightIndex, setActiveHighlightIndex] = useState(0);
  const highlightScrollRef = useRef<HTMLDivElement>(null);

  const galleryImages = [
    {
      url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=85',
      title: 'Bridal Elegance',
      subtitle: 'Soft morning preparations',
    },
    {
      url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=85',
      title: 'The Golden Vows',
      subtitle: 'Under holy fire & blessings',
    },
    {
      url: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=800&q=85',
      title: 'wedding photo',
      subtitle: 'unforgettable memories of our love',
      featured: true,
    },
    {
      url: 'https://images.unsplash.com/photo-1544077960-604201fe74bc?w=800&q=85',
      title: 'Evening Festivities',
      subtitle: 'Lakeside banquet & music',
    },
  ];

  const highlightCards = [
    {
      id: 'party-place',
      title: 'party place',
      desc: 'Where our celebration comes alive with candlelit lakeside gazebos and music.',
      image: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80',
      actionText: 'GET VENUE',
      actionIcon: MapPin,
      targetId: 'organimo-events-details',
    },
    {
      id: 'love-story',
      title: 'love story',
      desc: 'From a fateful rooftop conversation to a forever promise under the stars.',
      image: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=600&q=80',
      actionText: 'READ STORY',
      actionIcon: BookOpen,
      targetId: 'organimo-story-section',
    },
    {
      id: 'our-wedding',
      title: 'our wedding',
      desc: 'The ceremonial rituals, vows, holy fires, banquet dinner, and dancing.',
      image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80',
      actionText: 'VIEW EVENTS',
      actionIcon: Calendar,
      targetId: 'organimo-events-details',
    },
  ];

  // Dynamic Interconnected Data Extraction
  const heroSection = experience.sections?.find((s) => s.sectionType === 'hero');
  const heroConfig = heroSection?.config || {};
  const coupleNames =
    (heroConfig.hostNames as string) ||
    experience.title ||
    'Aarav & Meera';
  const partnerNamesList = coupleNames.includes('&')
    ? coupleNames.split('&').map((s) => s.trim())
    : coupleNames.split(' and ').map((s) => s.trim());
  const partner1 = partnerNamesList[0] || 'Aarav';
  const partner2 = partnerNamesList[1] || 'Meera';
  const eventDateStr = (heroConfig.eventDate as string) || experience.eventDate || 'December 18, 2026';
  const venueLocation = (heroConfig.venueCity as string) || (heroConfig.venueName as string) || 'Udaipur, Rajasthan';

  // Couple Profile Section Data
  const coupleSection = experience.sections?.find((s) => s.sectionType === 'couple_profile');
  const coupleConfig = (coupleSection?.config || {}) as Record<string, any>;
  const coupleRenderMode = (coupleConfig.renderMode as 'legacy' | 'hybrid' | 'graph') || (coupleConfig.sceneGraph ? 'graph' : 'legacy');
  const effectiveTokens = CELESTIAL_ODYSSEY_SCHEMA.designTokens!;
  const p1Name = (coupleConfig.partner1Name as string) || partner1;
  const p1Role = (coupleConfig.partner1Role as string) || 'The Groom';
  const p1Bio = (coupleConfig.partner1Bio as string) || '';
  const p1Image = (coupleConfig.partner1Image as string) || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=85';

  const p2Name = (coupleConfig.partner2Name as string) || partner2;
  const p2Role = (coupleConfig.partner2Role as string) || 'The Bride';
  const p2Bio = (coupleConfig.partner2Bio as string) || '';
  const p2Image = (coupleConfig.partner2Image as string) || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=85';

  const effectiveCelebrationState: CelebrationState = {
    occasion: 'wedding',
    theme: 'surreal-organimo',
    title: experience.title || coupleNames,
    tagline: (heroConfig.subheadline as string) || 'An Ethereal Floral Convergence',
    protagonist1: p1Name,
    protagonist1Role: p1Role,
    protagonist1Bio: p1Bio,
    protagonist1Image: p1Image,
    protagonist1Vow: (coupleConfig.partner1Vow as string) || '',
    protagonist2: p2Name,
    protagonist2Role: p2Role,
    protagonist2Bio: p2Bio,
    protagonist2Image: p2Image,
    protagonist2Vow: (coupleConfig.partner2Vow as string) || '',
    unionDeclaration: (coupleConfig.unionDeclaration as string) || 'Our lives woven into one botanical tapestry.',
    date: eventDateStr,
    time: (heroConfig.eventTime as string) || '06:00 PM',
    venueName: (heroConfig.venueName as string) || 'Jagmandir Island Palace',
    venueAddress: (heroConfig.venueAddress as string) || 'Udaipur, Rajasthan',
    city: venueLocation,
    stateCountry: 'India',
    guestCountTarget: 100,
    additionalLocations: [],
    storyQuote: '',
    storyBody: '',
    milestones: [],
    itinerary: [],
    speedTier: 'ludicrous',
    enableCountdown: true,
    enableCoupleProfile: true,
    enableItinerary: true,
    enableStory: true,
    enableVenueMap: true,
    enableDressCode: true,
    enableGallery: true,
    enableRsvp: true,
    enableShagun: false,
    enableGuestbook: true,
    enableMusic: true,
    rsvpDeadline: '',
    allowPlusOnes: 'yes',
    enableDietary: true,
    upiId: '',
    shagunAmounts: [],
    hasPasscodeProtection: false,
    passcode: '',
    previewMode: 'experience',
    monogramInitials: 'A & M',
    monogramStyle: 'arch',
    monogramImage: '',
    coverImage: '',
    isSingleCelebrant: false,
    primaryColorOverride: '#FF3B77',
  };

  // Venue & Maps Data
  const venueSection = experience.sections?.find((s) => s.sectionType === 'venue_map');
  const venueConfig = venueSection?.config || {};
  const venueNameStr = (venueConfig.venueName as string) || (heroConfig.venueName as string) || 'Jagmandir Island Palace';
  const venueAddressStr = (venueConfig.address as string) || '';
  const venueLocationStr = (venueConfig.venueCity as string) || venueLocation;
  const venueFullAddress = venueAddressStr
    ? venueAddressStr.toLowerCase().includes(venueNameStr.toLowerCase())
      ? venueAddressStr
      : `${venueNameStr}, ${venueAddressStr}`
    : `${venueNameStr}, ${venueLocationStr}`;

  // RSVP Form Configuration
  const rsvpSection = experience.sections?.find((s) => s.sectionType === 'rsvp');
  const rsvpConfig = rsvpSection?.config || {};
  const allowPlusOneGuest = (rsvpConfig.askPlusOne as boolean) ?? true;

  const wishesSection = experience.sections?.find((s) => s.sectionType === 'wishes_guestbook') || {
    id: 'sec_wishes_guestbook',
    sectionType: 'wishes_guestbook' as const,
    title: 'Warm Wishes & Guestbook',
    order: 9,
    isEnabled: true,
    config: {
      title: 'Warm Wishes & Guestbook',
      subtitle: `Leave your love, blessings, and memorable advice for ${p1Name} & ${p2Name}`,
      hostNames: coupleNames,
      venueCity: venueLocation,
    },
  };

  // Active Chapter / Section Tracking for Interconnected Navigation
  const [activeSection, setActiveSection] = useState('organimo-hero');

  useEffect(() => {
    const sectionIds = [
      'organimo-hero',
      'organimo-highlights',
      'organimo-couple-bio',
      'organimo-gallery',
      'organimo-rsvp-section',
      'organimo-story-section',
      'organimo-events-details',
      'organimo-guestbook-section',
      'organimo-thank-you',
    ];

    const handleScroll = () => {
      const scrollPos = window.scrollY + 250;
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const id = sectionIds[i];
        if (!id) continue;
        const el = document.getElementById(id);
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Audio Toggle with Real Ambient Harp & Strings Soundtrack
  const toggleAudio = () => {
    if (!audioRef.current && typeof window !== 'undefined') {
      audioRef.current = new Audio('https://cdn.freesound.org/previews/612/612745_11861866-lq.mp3');
      audioRef.current.loop = true;
      audioRef.current.volume = 0.4;
    }
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      audioRef.current?.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const scrollToRsvp = () => {
    const el = document.getElementById('organimo-rsvp-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollGalleryTo = (index: number) => {
    setActiveGalleryIndex(index);
    if (galleryScrollRef.current) {
      const children = galleryScrollRef.current.children;
      if (children[index]) {
        (children[index] as HTMLElement).scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  };

  const scrollHighlightTo = (index: number) => {
    setActiveHighlightIndex(index);
    if (highlightScrollRef.current) {
      const children = highlightScrollRef.current.children;
      if (children[index]) {
        (children[index] as HTMLElement).scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  };

  const handleRsvpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    setIsSubmitting(true);
    const guestRecord = {
      id: `g_${Date.now()}`,
      guestName: guestName.trim(),
      email: guestContact.includes('@')
        ? guestContact.trim()
        : `${guestName.toLowerCase().replace(/\s+/g, '')}@guest.orbitox.io`,
      phone: !guestContact.includes('@') ? guestContact.trim() : '+91 98000 00000',
      attending: attendingStatus,
      partySize: attendingStatus === 'ATTENDING' ? partySize : 0,
      dietaryRequirements: dietary,
      experienceId: experience.id,
      tenantId: experience.tenantId,
      createdAt: new Date().toISOString(),
    };

    try {
      await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experienceId: experience.id,
          tenantId: experience.tenantId,
          guestName: guestRecord.guestName,
          email: guestRecord.email,
          phone: guestRecord.phone,
          attending: guestRecord.attending,
          partySize: guestRecord.partySize,
          dietaryRequirements: guestRecord.dietaryRequirements,
        }),
      });
    } catch {
      // Offline fallback
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('orbitox_celebration_latest_rsvp', JSON.stringify(guestRecord));
      window.dispatchEvent(
        new CustomEvent('celebration:rsvp_received', { detail: guestRecord })
      );
    }

    setIsSubmitting(false);
    setRsvpSubmitted(true);
  };

  return (
    <div
      style={{
        backgroundColor: '#FDFBF9',
        color: '#18181B',
        fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif",
        minHeight: '100vh',
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {/* ─── SECTION 1: HERO COVER (Mobile-Optimized Haute-Couture Split) ─── */}
      <section
        id="organimo-hero"
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#FDFBF9',
          overflow: 'hidden',
          padding: 'clamp(60px, 8vh, 90px) 20px 60px 20px',
        }}
      >
        {/* Minimalist Top Nav Links (Desktop) */}
        <nav
          style={{
            position: 'absolute',
            top: '32px',
            right: '48px',
            zIndex: 25,
            display: 'flex',
            gap: '28px',
            alignItems: 'center',
            fontSize: '0.85rem',
            fontWeight: 600,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            textTransform: 'uppercase',
            letterSpacing: '2px',
          }}
          className="desktop-only"
        >
          <button
            onClick={() => scrollToSection('organimo-highlights')}
            style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', transition: 'color 0.2s' }}
          >
            Highlights
          </button>
          <button
            onClick={() => scrollToSection('organimo-couple-bio')}
            style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', transition: 'color 0.2s' }}
          >
            The Couple
          </button>
          <button
            onClick={() => scrollToSection('organimo-gallery')}
            style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', transition: 'color 0.2s' }}
          >
            Gallery
          </button>
          <button
            onClick={scrollToRsvp}
            style={{ background: 'none', border: 'none', color: '#FF3B77', fontWeight: 700, cursor: 'pointer' }}
          >
            RSVP
          </button>
        </nav>

        {/* Static Photorealistic Rose Petals (Positioned below top nav to avoid collision) */}
        <div style={{ position: 'absolute', top: '76px', right: 'clamp(20px, 4vw, 40px)', zIndex: 12, pointerEvents: 'none' }}>
          <RosePetalSvg size={40} rotation={-22} />
        </div>
        <div style={{ position: 'absolute', top: '46%', left: 'clamp(8px, 3vw, 24px)', zIndex: 12, pointerEvents: 'none' }}>
          <RosePetalSvg size={38} rotation={25} flip />
        </div>
        <div style={{ position: 'absolute', bottom: '25px', left: 'clamp(20px, 6vw, 80px)', zIndex: 12, pointerEvents: 'none' }}>
          <RosePetalSvg size={42} rotation={68} />
        </div>
        <div style={{ position: 'absolute', bottom: '15px', right: 'clamp(16px, 5vw, 50px)', zIndex: 12, pointerEvents: 'none' }}>
          <RosePetalSvg size={46} rotation={-35} />
        </div>

        {/* Hero Container */}
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            zIndex: 15,
          }}
        >
          {/* Mobile-Friendly Split Container */}
          <div
            style={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
              alignItems: 'center',
              gap: 'clamp(28px, 6vw, 56px)',
            }}
          >
            {/* Left Column: Haute-Couture Typography with Staggered Entrance Animations */}
            <div
              style={{
                maxWidth: '580px',
                textAlign: 'left',
                padding: '8px 4px',
                order: 1,
              }}
            >
              <span
                style={{
                  fontSize: 'clamp(0.72rem, 2.2vw, 0.85rem)',
                  letterSpacing: '3px',
                  textTransform: 'uppercase',
                  color: '#FF3B77',
                  fontWeight: 700,
                  display: 'inline-block',
                  marginBottom: '14px',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  animation: 'organimo-fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both',
                }}
              >
                Save Our Date • {eventDateStr}
              </span>

              <h1
                style={{
                  fontSize: 'clamp(2.6rem, 8vw, 5.2rem)',
                  fontWeight: 400,
                  lineHeight: 1.1,
                  color: '#18181B',
                  margin: '0 0 16px 0',
                  fontFamily: "'Playfair Display', serif",
                  letterSpacing: '-0.02em',
                  animation: 'organimo-fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both',
                }}
              >
                {p1Name && p2Name ? (
                  <>
                    <span>{p1Name}</span>
                    <span style={{ fontStyle: 'italic', color: '#FF3B77', margin: '0 10px' }}>&</span>
                    <span>{p2Name}</span>
                  </>
                ) : (
                  coupleNames
                )}
              </h1>

              <p
                style={{
                  fontSize: 'clamp(1rem, 3.4vw, 1.22rem)',
                  lineHeight: 1.75,
                  color: '#52525B',
                  marginBottom: '30px',
                  fontStyle: 'italic',
                  animation: 'organimo-fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both',
                }}
              >
                Celebrate our special day with us. We warmly invite you to share our happiness and make unforgettable memories together.
              </p>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '14px',
                  alignItems: 'center',
                  animation: 'organimo-fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.55s both',
                }}
              >
                <button
                  onClick={scrollToRsvp}
                  className="anim-pulse-pink"
                  style={{
                    padding: '14px 38px',
                    borderRadius: '9999px',
                    backgroundColor: '#FF3B77',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0) scale(1)')}
                >
                  <span>RSVP</span>
                  <Send size={16} />
                </button>

                <button
                  onClick={() => scrollToSection('organimo-highlights')}
                  style={{
                    padding: '14px 28px',
                    borderRadius: '9999px',
                    backgroundColor: '#FFFFFF',
                    color: '#3F3F46',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <span>Explore</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>

            {/* Right Column: Pristine Framed Bridal Portrait with Scale-Fade Entrance */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                order: 2,
                animation: 'organimo-fade-scale 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: '480px',
                  height: 'clamp(320px, 46vh, 520px)',
                  borderRadius: '28px',
                  overflow: 'hidden',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.14), 0 0 0 1px rgba(255, 225, 230, 0.8)',
                  transition: 'transform 0.5s ease',
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1519741497674-611481863552?w=1000&q=85"
                  alt="Bridal Portrait"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center 20%',
                  }}
                />
                {/* Soft warm feather at bottom */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '120px',
                    background: 'linear-gradient(to top, rgba(253, 251, 249, 0.7) 0%, transparent 100%)',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interconnecting Botanical Vine */}
      <InterconnectingVineLine title="Celebration Highlights" />

      {/* ─── SECTION 2: 3 HIGHLIGHT ACTION CARDS (Touch-Swipeable Reel on Mobile) ─── */}
      <section
        id="organimo-highlights"
        ref={highlightsRef}
        style={{
          padding: 'clamp(40px, 6vh, 80px) 16px clamp(50px, 7vh, 80px) 16px',
          maxWidth: '1160px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 10,
          opacity: isHighlightsInView ? 1 : 0,
          transform: isHighlightsInView ? 'translateY(0)' : 'translateY(28px)',
          transition: 'opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), transform 0.85s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Mobile Swipe Container / Desktop 3-Column Grid */}
        <div
          ref={highlightScrollRef}
          className="hide-scrollbar"
          style={{
            display: 'flex',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            gap: '20px',
            paddingBottom: '12px',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {highlightCards.map((card, idx) => {
            const ActionIcon = card.actionIcon;
            return (
              <div
                key={card.id}
                className="organimo-hover-lift"
                style={{
                  flex: '0 0 clamp(270px, 80vw, 340px)',
                  scrollSnapAlign: 'center',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '24px',
                  padding: '24px 20px',
                  textAlign: 'center',
                  boxShadow: '0 16px 36px -10px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(255, 225, 230, 0.7)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div
                    style={{
                      height: '180px',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      marginBottom: '18px',
                    }}
                  >
                    <img
                      src={card.image}
                      alt={card.title}
                      className="organimo-zoom-img"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <h3
                    style={{
                      fontSize: '1.6rem',
                      fontWeight: 400,
                      fontStyle: 'italic',
                      color: '#18181B',
                      margin: '0 0 4px 0',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {card.title}
                  </h3>
                  <div style={{ width: '28px', height: '2px', backgroundColor: '#FF3B77', margin: '8px auto 14px auto' }} />
                  <p style={{ fontSize: '0.88rem', color: '#71717A', lineHeight: 1.65, marginBottom: '20px' }}>
                    {card.desc}
                  </p>
                </div>
                <div>
                  <button
                    onClick={() => scrollToSection(card.targetId)}
                    style={{
                      padding: '10px 26px',
                      borderRadius: '9999px',
                      backgroundColor: '#FFF1F4',
                      color: '#FF3B77',
                      border: '1px solid rgba(255, 59, 119, 0.25)',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'transform 0.2s ease, background-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    <span>{card.actionText}</span>
                    <ActionIcon size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Indicator Dots */}
        <div
          className="mobile-only"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            marginTop: '16px',
          }}
        >
          {highlightCards.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollHighlightTo(i)}
              aria-label={`Go to highlight ${i + 1}`}
              style={{
                width: activeHighlightIndex === i ? '22px' : '8px',
                height: '8px',
                borderRadius: '4px',
                backgroundColor: activeHighlightIndex === i ? '#FF3B77' : '#D4D4D8',
                transition: 'all 0.3s ease',
                padding: 0,
                border: 'none',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      </section>

      {/* Interconnecting Botanical Vine */}
      <InterconnectingVineLine title="A Celebration of Love" />

      {/* ─── SECTION 3: PANORAMIC COUPLE BANNER ("We will get married on...") ─── */}
      <section
        id="organimo-banner"
        ref={bannerRef}
        style={{
          position: 'relative',
          padding: 'clamp(80px, 12vh, 120px) 20px',
          textAlign: 'center',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          opacity: isBannerInView ? 1 : 0,
          transform: isBannerInView ? 'translateY(0)' : 'translateY(28px)',
          transition: 'opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), transform 0.85s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Background Photo with Dark Gradient Overlay for Guaranteed Contrast */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(0, 0, 0, 0.52), rgba(0, 0, 0, 0.68)), url(https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1600&q=85)',
            backgroundSize: 'cover',
            backgroundPosition: 'center 35%',
            zIndex: 1,
          }}
        />

        {/* Banner Text */}
        <div style={{ position: 'relative', zIndex: 10, maxWidth: '760px' }}>
          <h2
            style={{
              fontSize: 'clamp(2rem, 6.5vw, 3.8rem)',
              fontWeight: 400,
              lineHeight: 1.2,
              marginBottom: '14px',
              fontFamily: "'Playfair Display', serif",
              textShadow: '0 2px 10px rgba(0,0,0,0.5)',
            }}
          >
            We will get married on {eventDateStr}
          </h2>
          <p
            style={{
              fontSize: 'clamp(0.95rem, 3vw, 1.2rem)',
              color: 'rgba(255, 255, 255, 0.95)',
              fontStyle: 'italic',
              marginBottom: '32px',
              textShadow: '0 1px 6px rgba(0,0,0,0.5)',
            }}
          >
            and we would love for you to celebrate with us
          </p>
          <button
            onClick={scrollToRsvp}
            className="anim-pulse-pink"
            style={{
              padding: '14px 38px',
              borderRadius: '9999px',
              backgroundColor: '#FF3B77',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.95rem',
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'transform 0.25s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <span>Register / RSVP</span>
            <Send size={16} />
          </button>
        </div>
      </section>

      {/* Interconnecting Botanical Vine */}
      <InterconnectingVineLine title="The Couple" />

      {/* ─── SECTION 4: ANNA & MARK CIRCULAR COUPLE BIO (Mobile Side-by-Side Cohesion) ─── */}
      {coupleRenderMode === 'graph' && coupleConfig.sceneGraph ? (
        <section id="organimo-couple-bio" data-scene-id="scene_couple_profile">
          <UnifiedSceneRenderer
            sceneGraph={coupleConfig.sceneGraph}
            device="desktop"
            tokens={effectiveTokens}
            celebrationState={effectiveCelebrationState}
          />
        </section>
      ) : (
      <section
        id="organimo-couple-bio"
        ref={coupleRef}
        style={{
          padding: 'clamp(60px, 9vh, 110px) 16px',
          textAlign: 'center',
          backgroundColor: '#FFFFFF',
          position: 'relative',
          zIndex: 10,
          overflow: 'hidden',
          opacity: isCoupleInView ? 1 : 0,
          transform: isCoupleInView ? 'translateY(0)' : 'translateY(28px)',
          transition: 'opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), transform 0.85s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Static Realistic Rose Stems on Left and Right (Desktop Margins - Zero Parallax) */}
        <div
          style={{
            position: 'absolute',
            left: '2%',
            top: '48%',
            transform: 'translateY(-50%)',
            zIndex: 5,
            opacity: 0.95,
          }}
          className="desktop-only"
        >
          <RoseStemSvg size={160} rotation={14} />
        </div>

        <div
          style={{
            position: 'absolute',
            right: '2%',
            top: '48%',
            transform: 'translateY(-50%)',
            zIndex: 5,
            opacity: 0.95,
          }}
          className="desktop-only"
        >
          <RoseStemSvg size={160} rotation={-14} flip />
        </div>

        {/* Mobile Corner Petals for Delicate Botanical Framing */}
        <div className="mobile-only" style={{ position: 'absolute', top: '20px', left: '16px', pointerEvents: 'none', opacity: 0.7 }}>
          <RosePetalSvg size={32} rotation={45} />
        </div>
        <div className="mobile-only" style={{ position: 'absolute', bottom: '20px', right: '16px', pointerEvents: 'none', opacity: 0.7 }}>
          <RosePetalSvg size={32} rotation={-45} flip />
        </div>

        <div style={{ maxWidth: '840px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
          <CoupleTitle
            as="h2"
            title={coupleNames}
            flourishColor="#FF3B77"
            style={{
              fontSize: 'clamp(2.4rem, 7vw, 3.8rem)',
              fontWeight: 400,
              color: '#18181B',
              marginBottom: '6px',
            }}
          />
          <span
            style={{
              fontSize: '0.8rem',
              color: '#FF3B77',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              display: 'inline-block',
              marginBottom: '12px',
            }}
          >
            The Couple
          </span>
          <p
            style={{
              fontSize: 'clamp(0.92rem, 3vw, 1.05rem)',
              color: '#71717A',
              maxWidth: '540px',
              margin: '0 auto 48px auto',
              lineHeight: 1.65,
              fontStyle: 'italic',
            }}
          >
            We invite you to share our happiness and love on this special day.
          </p>

          {/* Unified Side-by-Side Portraits with Central Medallion */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'clamp(10px, 3vw, 36px)',
              position: 'relative',
              maxWidth: '580px',
              margin: '0 auto',
            }}
          >
            {/* Bride Avatar */}
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div
                style={{
                  position: 'relative',
                  width: 'clamp(118px, 34vw, 185px)',
                  height: 'clamp(118px, 34vw, 185px)',
                  margin: '0 auto 16px auto',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: 'clamp(4px, 1vw, 6px) solid #FFFFFF',
                    boxShadow: '0 12px 30px rgba(255, 59, 119, 0.22), 0 0 0 1px #FFE4E6',
                    transition: 'transform 0.4s ease, box-shadow 0.4s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.03)';
                    e.currentTarget.style.boxShadow = '0 16px 40px rgba(255, 59, 119, 0.35), 0 0 0 2px #FF3B77';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 12px 30px rgba(255, 59, 119, 0.22), 0 0 0 1px #FFE4E6';
                  }}
                >
                  <img
                    src={p1Image}
                    alt={p1Name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                {/* Rose Icon Badge Pinned Over Bottom Edge with Gentle Bob Animation */}
                <div
                  className="anim-badge-bounce"
                  style={{
                    position: 'absolute',
                    bottom: '-8px',
                    left: '50%',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '50%',
                    padding: '4px',
                    boxShadow: '0 4px 12px rgba(255, 59, 119, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                  }}
                >
                  <RoseIcon size={18} color="#FF3B77" />
                </div>
              </div>

              <h3
                style={{
                  fontSize: 'clamp(1.05rem, 3.2vw, 1.45rem)',
                  fontWeight: 600,
                  color: '#18181B',
                  margin: '0 0 2px 0',
                }}
              >
                {p1Name}
              </h3>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#FF3B77',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                {p1Role}
              </span>
              {p1Bio && (
                <p
                  style={{
                    fontSize: '0.82rem',
                    color: '#52525B',
                    margin: '6px auto 0 auto',
                    maxWidth: '220px',
                    lineHeight: 1.4,
                    fontStyle: 'italic',
                  }}
                >
                  "{p1Bio}"
                </p>
              )}
            </div>

            {/* Central Heart Medallion with Living Heartbeat Pulse Animation */}
            <div
              className="anim-heartbeat"
              style={{
                width: 'clamp(36px, 9vw, 52px)',
                height: 'clamp(36px, 9vw, 52px)',
                borderRadius: '50%',
                backgroundColor: '#FF3B77',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 8px 24px rgba(255, 59, 119, 0.45)',
                transform: 'translateY(-14px)',
                flexShrink: 0,
              }}
            >
              <Heart size={18} fill="#FFFFFF" color="#FFFFFF" />
            </div>

            {/* Groom Avatar */}
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div
                style={{
                  position: 'relative',
                  width: 'clamp(118px, 34vw, 185px)',
                  height: 'clamp(118px, 34vw, 185px)',
                  margin: '0 auto 16px auto',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: 'clamp(4px, 1vw, 6px) solid #FFFFFF',
                    boxShadow: '0 12px 30px rgba(255, 59, 119, 0.22), 0 0 0 1px #FFE4E6',
                    transition: 'transform 0.4s ease, box-shadow 0.4s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.03)';
                    e.currentTarget.style.boxShadow = '0 16px 40px rgba(255, 59, 119, 0.35), 0 0 0 2px #FF3B77';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 12px 30px rgba(255, 59, 119, 0.22), 0 0 0 1px #FFE4E6';
                  }}
                >
                  <img
                    src={p2Image}
                    alt={p2Name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                {/* Rose Icon Badge Pinned Over Bottom Edge with Gentle Bob Animation */}
                <div
                  className="anim-badge-bounce"
                  style={{
                    position: 'absolute',
                    bottom: '-8px',
                    left: '50%',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '50%',
                    padding: '4px',
                    boxShadow: '0 4px 12px rgba(255, 59, 119, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                  }}
                >
                  <RoseIcon size={18} color="#FF3B77" />
                </div>
              </div>

              <h3
                style={{
                  fontSize: 'clamp(1.05rem, 3.2vw, 1.45rem)',
                  fontWeight: 600,
                  color: '#18181B',
                  margin: '0 0 2px 0',
                }}
              >
                {p2Name}
              </h3>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#FF3B77',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                {p2Role}
              </span>
              {p2Bio && (
                <p
                  style={{
                    fontSize: '0.82rem',
                    color: '#52525B',
                    margin: '6px auto 0 auto',
                    maxWidth: '220px',
                    lineHeight: 1.4,
                    fontStyle: 'italic',
                  }}
                >
                  "{p2Bio}"
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Interconnecting Botanical Vine */}
      <InterconnectingVineLine title="Captured Memories" />

      {/* ─── SECTION 5: WEDDING PHOTO STRIP (Touch-Swipeable Snap Carousel on Mobile) ─── */}
      <section
        id="organimo-gallery"
        ref={galleryRef}
        style={{
          padding: '24px 16px 70px 16px',
          backgroundColor: '#FDFBF9',
          position: 'relative',
          zIndex: 10,
          opacity: isGalleryInView ? 1 : 0,
          transform: isGalleryInView ? 'translateY(0)' : 'translateY(28px)',
          transition: 'opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), transform 0.85s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          {/* Scrollable Container with Snap Physics */}
          <div
            ref={galleryScrollRef}
            className="hide-scrollbar"
            style={{
              display: 'flex',
              gap: '16px',
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
              padding: '8px 4px 16px 4px',
            }}
          >
            {galleryImages.map((img, idx) => (
              <div
                key={idx}
                className="organimo-hover-lift"
                style={{
                  flex: '0 0 clamp(260px, 78vw, 320px)',
                  height: 'clamp(280px, 42vh, 320px)',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  position: 'relative',
                  backgroundColor: '#18181B',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.08)',
                  scrollSnapAlign: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => scrollGalleryTo(idx)}
              >
                <img
                  src={img.url}
                  alt={img.title}
                  className="organimo-zoom-img"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: img.featured ? 0.6 : 1,
                  }}
                />
                {img.featured && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      padding: '20px',
                      textAlign: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 'clamp(1.4rem, 4vw, 1.7rem)',
                        fontWeight: 400,
                        fontStyle: 'italic',
                        marginBottom: '8px',
                        fontFamily: "'Playfair Display', serif",
                      }}
                    >
                      {img.title}
                    </span>
                    <span
                      style={{
                        fontSize: '0.85rem',
                        color: '#FDA4AF',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        lineHeight: 1.4,
                      }}
                    >
                      {img.subtitle}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Carousel Chevrons & Interactive Dots */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '14px',
              marginTop: '18px',
            }}
          >
            <button
              onClick={() =>
                scrollGalleryTo(
                  activeGalleryIndex > 0 ? activeGalleryIndex - 1 : galleryImages.length - 1
                )
              }
              aria-label="Previous Photo"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: '#fff',
                border: '1px solid #E4E4E7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#52525B',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <ChevronLeft size={18} />
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              {galleryImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => scrollGalleryTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  style={{
                    width: activeGalleryIndex === i ? '24px' : '8px',
                    height: '8px',
                    borderRadius: '4px',
                    backgroundColor: activeGalleryIndex === i ? '#FF3B77' : '#D4D4D8',
                    transition: 'all 0.3s ease',
                    padding: 0,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>

            <button
              onClick={() =>
                scrollGalleryTo(
                  activeGalleryIndex < galleryImages.length - 1 ? activeGalleryIndex + 1 : 0
                )
              }
              aria-label="Next Photo"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: '#fff',
                border: '1px solid #E4E4E7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#52525B',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Interconnecting Botanical Vine */}
      <InterconnectingVineLine title="Kindly Respond" />

      {/* ─── SECTION 6: "ARE YOU ATTENDING?" LUXURY ENVELOPE RSVP CARD (With Rose Bouquet Cluster) ─── */}
      <section
        id="organimo-rsvp-section"
        ref={rsvpRef}
        style={{
          padding: 'clamp(60px, 9vh, 100px) 16px 110px 16px',
          backgroundColor: '#FDFBF9',
          position: 'relative',
          zIndex: 10,
          opacity: isRsvpInView ? 1 : 0,
          transform: isRsvpInView ? 'translateY(0)' : 'translateY(28px)',
          transition: 'opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), transform 0.85s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <h2
            style={{
              fontSize: 'clamp(2.2rem, 6.5vw, 3.4rem)',
              fontWeight: 400,
              color: '#18181B',
              marginBottom: '8px',
            }}
          >
            Are You Attending?
          </h2>
          <p style={{ color: '#71717A', fontSize: '0.95rem', fontStyle: 'italic', marginBottom: '45px' }}>
            Kindly respond by November 20, 2026 so we can reserve your seat.
          </p>

          {/* Envelope Presentation with Physical Depth Layering */}
          <div
            style={{
              position: 'relative',
            }}
          >
            {/* Tilted Secondary Paper Layer */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: '#FFFFFF',
                borderRadius: '26px',
                transform: 'rotate(2deg) translateY(4px)',
                boxShadow: '0 20px 50px -15px rgba(0, 0, 0, 0.07)',
                border: '1px solid rgba(255, 225, 230, 0.6)',
                zIndex: 5,
              }}
            />

            {/* Tilted Floral Polaroid Photo Card poking out from top-right corner */}
            <div
              style={{
                position: 'absolute',
                top: '-20px',
                right: 'clamp(-8px, 1.5vw, 12px)',
                width: 'clamp(85px, 22vw, 125px)',
                height: 'clamp(105px, 26vw, 145px)',
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '6px 6px 18px 6px',
                boxShadow: '0 12px 25px rgba(0, 0, 0, 0.12)',
                transform: 'rotate(10deg)',
                zIndex: 6,
                border: '1px solid rgba(255, 225, 230, 0.8)',
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400&q=80"
                alt="Bouquet Polaroid"
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
              />
            </div>

            {/* Static Rose Bouquet Cluster (Positioned gracefully in corner, pointer-events none) */}
            <div
              style={{
                position: 'absolute',
                bottom: 'clamp(-30px, -4vw, -20px)',
                left: 'clamp(-24px, -3.5vw, -16px)',
                zIndex: 25,
                pointerEvents: 'none',
              }}
            >
              <RoseBouquetCluster size={135} />
            </div>

            {/* Main Stationery Card */}
            <div
              className="organimo-hover-lift"
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '26px',
                padding: 'clamp(28px, 6vw, 48px) clamp(18px, 5vw, 38px)',
                boxShadow:
                  '0 25px 60px -15px rgba(255, 59, 119, 0.12), 0 8px 25px rgba(0, 0, 0, 0.04)',
                border: '1px solid rgba(255, 225, 230, 0.8)',
                position: 'relative',
                textAlign: 'left',
                zIndex: 10,
              }}
            >
              {rsvpSubmitted ? (
                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                  <div
                    className="anim-pop"
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      backgroundColor: '#FFF1F4',
                      color: '#FF3B77',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px auto',
                      boxShadow: '0 8px 24px rgba(255, 59, 119, 0.25)',
                    }}
                  >
                    <CheckCircle2 size={36} />
                  </div>
                  <h3 style={{ fontSize: '1.8rem', color: '#18181B', marginBottom: '8px' }}>
                    Response Confirmed
                  </h3>
                  <p style={{ color: '#71717A', fontSize: '0.95rem', marginBottom: '24px', lineHeight: 1.6 }}>
                    Thank you, <strong>{guestName}</strong>! Your RSVP has been recorded in our host roster and synced to our celebration records.
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => scrollToSection('organimo-guestbook-section')}
                      style={{
                        padding: '12px 28px',
                        borderRadius: '9999px',
                        backgroundColor: '#FF3B77',
                        color: '#FFFFFF',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 16px rgba(255, 59, 119, 0.35)',
                        transition: 'transform 0.2s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      <Heart size={16} fill="#FFFFFF" />
                      <span>Send Blessings</span>
                    </button>
                    <button
                      onClick={() => setRsvpSubmitted(false)}
                      style={{
                        padding: '12px 24px',
                        borderRadius: '9999px',
                        backgroundColor: '#FFF1F4',
                        color: '#FF3B77',
                        border: '1px solid rgba(255, 59, 119, 0.3)',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        transition: 'transform 0.2s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      Edit Response
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRsvpSubmit}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))',
                      gap: '20px',
                      marginBottom: '20px',
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.78rem',
                          color: '#71717A',
                          marginBottom: '6px',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontWeight: 600,
                        }}
                      >
                        <User size={14} color="#FF3B77" />
                        <span>Your Full Name *</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Vikram Malhotra"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        style={{
                          width: '100%',
                          minHeight: '48px',
                          padding: '12px 14px',
                          border: '1px solid #E4E4E7',
                          borderRadius: '12px',
                          fontSize: '16px', // Prevents iOS Safari auto-zoom
                          fontFamily: 'inherit',
                          backgroundColor: '#FAFAF9',
                          transition: 'border-color 0.2s, box-shadow 0.2s',
                        }}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.78rem',
                          color: '#71717A',
                          marginBottom: '6px',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontWeight: 600,
                        }}
                      >
                        <Mail size={14} color="#FF3B77" />
                        <span>Email or Mobile *</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="vikram@malhotra.in"
                        value={guestContact}
                        onChange={(e) => setGuestContact(e.target.value)}
                        style={{
                          width: '100%',
                          minHeight: '48px',
                          padding: '12px 14px',
                          border: '1px solid #E4E4E7',
                          borderRadius: '12px',
                          fontSize: '16px', // Prevents iOS Safari auto-zoom
                          fontFamily: 'inherit',
                          backgroundColor: '#FAFAF9',
                          transition: 'border-color 0.2s, box-shadow 0.2s',
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))',
                      gap: '20px',
                      marginBottom: '20px',
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.78rem',
                          color: '#71717A',
                          marginBottom: '6px',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontWeight: 600,
                        }}
                      >
                        Attendance Confirmation
                      </label>
                      <select
                        value={attendingStatus}
                        onChange={(e: any) => setAttendingStatus(e.target.value)}
                        style={{
                          width: '100%',
                          minHeight: '48px',
                          padding: '12px 14px',
                          border: '1px solid #E4E4E7',
                          borderRadius: '12px',
                          fontSize: '16px', // Prevents iOS Safari auto-zoom
                          fontFamily: 'inherit',
                          backgroundColor: '#FAFAF9',
                        }}
                      >
                        <option value="ATTENDING">Joyfully Attending</option>
                        <option value="DECLINED">Regretfully Decline</option>
                      </select>
                    </div>

                    {attendingStatus === 'ATTENDING' && allowPlusOneGuest && (
                      <div>
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.78rem',
                            color: '#71717A',
                            marginBottom: '6px',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            fontWeight: 600,
                          }}
                        >
                          <Users size={14} color="#FF3B77" />
                          <span>Party Size (+1s)</span>
                        </label>
                        <select
                          value={partySize}
                          onChange={(e) => setPartySize(parseInt(e.target.value, 10))}
                          style={{
                            width: '100%',
                            minHeight: '48px',
                            padding: '12px 14px',
                            border: '1px solid #E4E4E7',
                            borderRadius: '12px',
                            fontSize: '16px', // Prevents iOS Safari auto-zoom
                            fontFamily: 'inherit',
                            backgroundColor: '#FAFAF9',
                          }}
                        >
                          <option value={1}>Just Me (1 Person)</option>
                          <option value={2}>Me + 1 Guest (2 Persons)</option>
                          <option value={3}>Family of 3</option>
                          <option value={4}>Family of 4</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {attendingStatus === 'ATTENDING' && (
                    <div style={{ marginBottom: '28px' }}>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.78rem',
                          color: '#71717A',
                          marginBottom: '6px',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontWeight: 600,
                        }}
                      >
                        <Sparkles size={14} color="#FF3B77" />
                        <span>Dietary Preferences</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Vegetarian, Jain, Gluten-Free, Vegan, No Nuts"
                        value={dietary}
                        onChange={(e) => setDietary(e.target.value)}
                        style={{
                          width: '100%',
                          minHeight: '48px',
                          padding: '12px 14px',
                          border: '1px solid #E4E4E7',
                          borderRadius: '12px',
                          fontSize: '16px', // Prevents iOS Safari auto-zoom
                          fontFamily: 'inherit',
                          backgroundColor: '#FAFAF9',
                        }}
                      />
                    </div>
                  )}

                  <div style={{ textAlign: 'center', marginTop: '16px', position: 'relative', zIndex: 30 }}>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="anim-pulse-pink"
                      style={{
                        width: '100%',
                        maxWidth: '300px',
                        minHeight: '50px',
                        padding: '14px 44px',
                        borderRadius: '9999px',
                        backgroundColor: '#FF3B77',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '1rem',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'transform 0.25s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      <span>{isSubmitting ? 'Confirming...' : 'RSVP'}</span>
                      <Send size={16} />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Interconnecting Botanical Vine */}
      <InterconnectingVineLine title="Our Love Story" />

      {/* ─── SECTION 7: "LOVE STORY" DEEP CHARCOAL HAUTE-EDITORIAL ─── */}
      <section
        id="organimo-story-section"
        ref={storyRef}
        style={{
          padding: 'clamp(80px, 12vh, 120px) 20px',
          backgroundImage:
            'linear-gradient(rgba(22, 21, 20, 0.88), rgba(22, 21, 20, 0.95)), url(https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=1600&q=85)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: '#FAFAF8',
          position: 'relative',
          zIndex: 10,
          opacity: isStoryInView ? 1 : 0,
          transform: isStoryInView ? 'translateY(0)' : 'translateY(28px)',
          transition: 'opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), transform 0.85s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div style={{ maxWidth: '880px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 'clamp(2.4rem, 6.5vw, 3.6rem)',
              fontWeight: 400,
              textAlign: 'center',
              marginBottom: '40px',
            }}
          >
            Love Story
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
              gap: '36px',
              fontSize: '1.02rem',
              lineHeight: 1.85,
              color: 'rgba(255, 255, 255, 0.88)',
            }}
          >
            {/* Left Column with Drop Cap */}
            <div>
              <p style={{ margin: 0 }}>
                <span
                  style={{
                    float: 'left',
                    fontSize: '4.2rem',
                    lineHeight: '3.4rem',
                    paddingTop: '6px',
                    paddingRight: '12px',
                    paddingBottom: '2px',
                    color: '#FF3B77',
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 700,
                  }}
                >
                  T
                </span>
                he first time our eyes met across that crowded rooftop cafe in Bengaluru, neither of us anticipated how quickly two independent lives would entwine into one shared heartbeat. A simple cup of coffee turned into hours of shared dreams and laughter.
              </p>
            </div>

            {/* Right Column */}
            <div>
              <p style={{ margin: 0 }}>
                Through countless weekend road trips, stargazing nights in the hills, and supporting each other through every personal milestone, we built a foundation of trust, kindness, and devotion. Today, standing before all of you, we embark on forever.
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <button
              onClick={() => scrollToSection('organimo-events-details')}
              style={{
                padding: '12px 32px',
                borderRadius: '9999px',
                backgroundColor: '#FF3B77',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.85rem',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                textTransform: 'uppercase',
                letterSpacing: '1px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 8px 24px rgba(255, 59, 119, 0.4)',
                transition: 'transform 0.25s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <span>View Ceremonies Itinerary</span>
              <Calendar size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* Interconnecting Botanical Vine */}
      <InterconnectingVineLine title="Ceremonial Itinerary" />

      {/* ─── SECTION 8: "EVENTS DETAILS" CEREMONIAL SCHEDULE ─── */}
      <section
        id="organimo-events-details"
        ref={eventsRef}
        style={{
          padding: 'clamp(60px, 9vh, 110px) 16px',
          backgroundColor: '#FFFFFF',
          position: 'relative',
          zIndex: 10,
          opacity: isEventsInView ? 1 : 0,
          transform: isEventsInView ? 'translateY(0)' : 'translateY(28px)',
          transition: 'opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), transform 0.85s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>
          <h2
            style={{
              fontSize: 'clamp(2.2rem, 6vw, 3.4rem)',
              fontWeight: 400,
              color: '#18181B',
              marginBottom: '36px',
            }}
          >
            Events Details
          </h2>

          {/* Ceremony Card with Pink Header Tab */}
          <div
            className="organimo-hover-lift"
            style={{
              backgroundColor: '#FAFAF9',
              borderRadius: '22px',
              overflow: 'hidden',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.05)',
              border: '1px solid #E4E4E7',
              textAlign: 'left',
            }}
          >
            {/* Header Tab */}
            <div
              style={{
                backgroundColor: '#FF3B77',
                color: '#fff',
                padding: '16px 20px',
                fontWeight: 700,
                fontSize: '0.95rem',
                textAlign: 'center',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Heart size={16} fill="#FFFFFF" color="#FFFFFF" />
              <span>Ceremony</span>
            </div>

            {/* Table Rows with Lucide Icons */}
            <div style={{ padding: '24px clamp(18px, 4vw, 32px)' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'clamp(95px, 26vw, 130px) 1fr',
                  alignItems: 'center',
                  padding: '14px 0',
                  borderBottom: '1px solid #E4E4E7',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#71717A', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <Calendar size={15} color="#FF3B77" />
                  <span>Date</span>
                </div>
                <span style={{ color: '#18181B', fontWeight: 600, fontSize: '0.95rem' }}>{eventDateStr}</span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'clamp(95px, 26vw, 130px) 1fr',
                  alignItems: 'center',
                  padding: '14px 0',
                  borderBottom: '1px solid #E4E4E7',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#71717A', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <Clock size={15} color="#FF3B77" />
                  <span>Time</span>
                </div>
                <span style={{ color: '#18181B', fontWeight: 600, fontSize: '0.95rem' }}>4:30 PM Onwards</span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'clamp(95px, 26vw, 130px) 1fr',
                  alignItems: 'flex-start',
                  padding: '14px 0',
                  borderBottom: '1px solid #E4E4E7',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#71717A', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: "'Plus Jakarta Sans', sans-serif", paddingTop: '2px' }}>
                  <MapPin size={15} color="#FF3B77" />
                  <span>Address</span>
                </div>
                <span style={{ color: '#18181B', fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.5 }}>
                  {venueFullAddress}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'clamp(95px, 26vw, 130px) 1fr',
                  alignItems: 'center',
                  padding: '14px 0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#71717A', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <Sparkles size={15} color="#FF3B77" />
                  <span>Dress Code</span>
                </div>
                <span style={{ color: '#18181B', fontWeight: 600, fontSize: '0.95rem' }}>
                  Formal Indian Pastel & Black Tie Optional
                </span>
              </div>
            </div>

            {/* Action Buttons: View on Map & RSVP for this Ceremony */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '0 20px 26px 20px',
              }}
            >
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(venueFullAddress)}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  color: '#FF3B77',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  textDecoration: 'none',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  backgroundColor: '#FFF1F4',
                  padding: '11px 22px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(255, 59, 119, 0.25)',
                  transition: 'transform 0.2s ease, background-color 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <MapPin size={15} />
                <span>View on Maps</span>
              </a>

              <button
                onClick={scrollToRsvp}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  color: '#FFFFFF',
                  backgroundColor: '#FF3B77',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  padding: '11px 24px',
                  borderRadius: '9999px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 6px 18px rgba(255, 59, 119, 0.35)',
                  transition: 'transform 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <Mail size={15} />
                <span>RSVP for Ceremony</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Interconnecting Botanical Vine */}
      <InterconnectingVineLine title="Blessings & Guestbook" />

      {/* ─── SECTION 8.5: "WISHES & GUESTBOOK" DYNAMIC INTERACTIVE GUESTBOOK ─── */}
      <div id="organimo-guestbook-section" style={{ position: 'relative', zIndex: 10 }}>
        <WishesGuestbookSection
          section={wishesSection as any}
          theme={theme}
          experienceId={experience.id}
          tenantId={experience.tenantId}
        />
      </div>

      {/* ─── SECTION 9: "THANK YOU!" ROMANTIC CLOSING ─── */}
      <section
        id="organimo-thank-you"
        ref={thankYouRef}
        style={{
          position: 'relative',
          padding: 'clamp(90px, 14vh, 140px) 20px',
          textAlign: 'center',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          opacity: isThankYouInView ? 1 : 0,
          transform: isThankYouInView ? 'translateY(0)' : 'translateY(28px)',
          transition: 'opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), transform 0.85s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Backdrop Photo with Romantic Vignette */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'url(https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1600&q=85)',
            backgroundSize: 'cover',
            backgroundPosition: 'center 35%',
            filter: 'brightness(0.38)',
            zIndex: 1,
          }}
        />

        <div style={{ position: 'relative', zIndex: 10, maxWidth: '640px' }}>
          <h2
            style={{
              fontSize: 'clamp(2.6rem, 7vw, 4.2rem)',
              fontWeight: 400,
              marginBottom: '14px',
              fontFamily: "'Playfair Display', serif",
            }}
          >
            Thank You!
          </h2>
          <p
            style={{
              fontSize: 'clamp(1.05rem, 3vw, 1.25rem)',
              color: 'rgba(255, 255, 255, 0.9)',
              letterSpacing: '2px',
              marginBottom: '28px',
            }}
          >
            {partner1} & {partner2}
          </p>

          <div
            className="anim-heartbeat"
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: '#FF3B77',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 10px 25px rgba(255, 59, 119, 0.45)',
            }}
          >
            <Heart size={22} fill="#FFFFFF" color="#FFFFFF" />
          </div>
        </div>
      </section>

      {/* Dynamic Graph-Native Scenes */}
      {(experience.sections || [])
        .filter(
          (s) =>
            !['hero', 'couple_profile', 'person_profile', 'story', 'countdown', 'events_schedule', 'venue_map', 'rsvp', 'wishes_guestbook', 'gift_registry', 'dress_code', 'gallery'].includes(s.sectionType) &&
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

      {/* ─── INTERCONNECTED LUXURY CHAPTER DOCK (Thumb-Friendly, Glassmorphic Capsule, Safe-Area Anchored) ─── */}
      <nav
        aria-label="Experience Chapter Navigation"
        style={{
          position: 'fixed',
          bottom: 'max(14px, env(safe-area-inset-bottom, 14px))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 85,
          width: 'max-content',
          maxWidth: 'calc(100vw - 20px)',
          backgroundColor: 'rgba(18, 17, 16, 0.92)',
          backdropFilter: 'blur(24px) saturate(190%)',
          WebkitBackdropFilter: 'blur(24px) saturate(190%)',
          border: '1px solid rgba(212, 175, 55, 0.35)',
          borderRadius: '9999px',
          padding: '6px 8px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.55), 0 0 24px rgba(212, 175, 55, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {/* Audio Player Soundtrack Button */}
        <button
          onClick={toggleAudio}
          title={isPlaying ? 'Pause Ambient Soundtrack' : 'Play Ambient Soundtrack'}
          aria-label={isPlaying ? 'Pause Ambient Soundtrack' : 'Play Ambient Soundtrack'}
          style={{
            flexShrink: 0,
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: isPlaying ? 'rgba(212, 175, 55, 0.22)' : 'rgba(255, 255, 255, 0.08)',
            border: isPlaying ? '1px solid rgba(212, 175, 55, 0.65)' : '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: isPlaying ? '0 0 12px rgba(212, 175, 55, 0.35)' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isPlaying ? '#E6C687' : 'rgba(255, 255, 255, 0.75)',
            transition: 'all 0.25s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {isPlaying ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '14px' }}>
              <div style={{ width: '2.5px', backgroundColor: '#E6C687', borderRadius: '2px', animation: 'organimo-music-wave-1 0.7s ease-in-out infinite' }} />
              <div style={{ width: '2.5px', backgroundColor: '#E6C687', borderRadius: '2px', animation: 'organimo-music-wave-2 0.7s ease-in-out infinite 0.2s' }} />
              <div style={{ width: '2.5px', backgroundColor: '#E6C687', borderRadius: '2px', animation: 'organimo-music-wave-3 0.7s ease-in-out infinite 0.4s' }} />
            </div>
          ) : (
            <VolumeX size={15} />
          )}
        </button>

        {/* Scrollable Chapter Navigation Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            maxWidth: 'clamp(170px, 50vw, 360px)',
            padding: '2px 2px',
          }}
        >
          {[
            { id: 'organimo-hero', label: 'Cover' },
            { id: 'organimo-highlights', label: 'Highlights' },
            { id: 'organimo-couple-bio', label: 'Couple' },
            { id: 'organimo-gallery', label: 'Gallery' },
            { id: 'organimo-rsvp-section', label: 'RSVP' },
            { id: 'organimo-story-section', label: 'Story' },
            { id: 'organimo-events-details', label: 'Events' },
            { id: 'organimo-guestbook-section', label: 'Wishes' },
            { id: 'organimo-thank-you', label: 'Blessings' },
          ].map((chap) => {
            const isActive = activeSection === chap.id;
            return (
              <button
                key={chap.id}
                onClick={() => scrollToSection(chap.id)}
                style={{
                  flexShrink: 0,
                  padding: '5px 11px',
                  borderRadius: '9999px',
                  border: isActive ? '1px solid rgba(212, 175, 55, 0.75)' : '1px solid transparent',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.32) 0%, rgba(170, 128, 16, 0.45) 100%)'
                    : 'transparent',
                  color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
                  fontSize: '0.74rem',
                  fontWeight: isActive ? 700 : 500,
                  letterSpacing: '0.4px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 0 10px rgba(212, 175, 55, 0.3)' : 'none',
                }}
              >
                {chap.label}
              </button>
            );
          })}
        </div>

        {/* Quick RSVP CTA Pill */}
        <button
          onClick={scrollToRsvp}
          aria-label="Scroll to RSVP Form"
          style={{
            flexShrink: 0,
            height: '34px',
            padding: '0 14px',
            borderRadius: '9999px',
            backgroundColor: '#FF3B77',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '0.78rem',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            letterSpacing: '0.4px',
            boxShadow: '0 4px 14px rgba(255, 59, 119, 0.45)',
            transition: 'transform 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Mail size={13} />
          <span>RSVP</span>
        </button>
      </nav>
    </div>
  );
}
