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
  Crown,
  Sparkles,
  Users,
  ArrowRight,
  Gift,
  Check,
  ExternalLink,
  Navigation,
  Copy,
  Plus,
  Minus,
  QrCode,
  Utensils,
  X,
} from 'lucide-react';
import { CosmicGoldCanvas } from './CosmicGoldCanvas';
import {
  RoyalArchwaySvg,
  RoyalWaxSeal,
  RoyalFiligreeDivider,
  RoyalCrownMotif,
  RoyalCornerFlourish,
  RoyalCountdownPills,
  RoyalAudioPlayerPill,
  RoyalUnionMedallion,
} from './RoyalRegaliaDecorations';
import { CoupleTitle } from '../../CoupleTitle';
import { WishesGuestbookSection } from '../../sections/WishesGuestbookSection';

interface Props {
  experience: Experience;
  theme: Theme;
}

export function RoyalRegaliaExperience({ experience, theme }: Props) {
  // RSVP Form State
  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');
  const [attendingStatus, setAttendingStatus] = useState<'ATTENDING' | 'DECLINED'>('ATTENDING');
  const [partySize, setPartySize] = useState(2);
  const [dietaryPreference, setDietaryPreference] = useState('Vegetarian');
  const [specialNote, setSpecialNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rsvpSubmitted, setRsvpSubmitted] = useState(false);

  // Audio State & Reference
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Digital Shagun Selected Amount & Custom UPI Modal
  const [selectedShagun, setSelectedShagun] = useState<number>(2100);
  const [customShagun, setCustomShagun] = useState<string>('');
  const [isCustomShagun, setIsCustomShagun] = useState<boolean>(false);
  const [shagunSent, setShagunSent] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Dynamic Data Extraction from Experience Payload
  const heroSection = experience.sections?.find((s) => s.sectionType === 'hero');
  const heroConfig = heroSection?.config || {};

  // Couple Profile Section Data
  const coupleSection = experience.sections?.find((s) => s.sectionType === 'couple_profile');
  const coupleConfig = coupleSection?.config || {};

  const p1FromCouple = ((coupleConfig.partner1Name as string) || '').trim();
  const p2FromCouple = ((coupleConfig.partner2Name as string) || '').trim();

  // If both or either celebrant is configured in the People step, prioritize them!
  const coupleNames =
    (p1FromCouple && p2FromCouple)
      ? `${p1FromCouple} & ${p2FromCouple}`
      : (heroConfig.hostNames as string) ||
        experience.title ||
        (p1FromCouple || p2FromCouple ? `${p1FromCouple || 'Aarav'} & ${p2FromCouple || 'Meera'}` : 'Aarav & Meera');

  const partnerNamesList = coupleNames.replace(/&amp;/g, '&').split(/\s*&\s*|\s+and\s+/i);
  const partner1 = p1FromCouple || partnerNamesList[0]?.trim() || 'Aarav';
  const partner2 = p2FromCouple || partnerNamesList[1]?.trim() || 'Meera';
  const eventDateStr = (heroConfig.eventDate as string) || experience.eventDate || 'December 18, 2026';
  const venueLocation = (heroConfig.venueCity as string) || (heroConfig.venueName as string) || 'Udaipur, Rajasthan';

  const p1Name = p1FromCouple || partner1;
  const p1Role = (coupleConfig.partner1Role as string) || 'The Groom';
  const p1Bio = (coupleConfig.partner1Bio as string) || '';
  const p1Image = (coupleConfig.partner1Image as string) || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=85';

  const p2Name = p2FromCouple || partner2;
  const p2Role = (coupleConfig.partner2Role as string) || 'The Bride';
  const p2Bio = (coupleConfig.partner2Bio as string) || '';
  const p2Image = (coupleConfig.partner2Image as string) || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=85';

  const isSingle = (coupleConfig.isSingleCelebrant as boolean) || !p2Name;
  const crestImage = (heroConfig.monogramImage as string) || (coupleConfig.monogramImage as string) || (experience as any).monogramImage || '';
  const monogramInitials = (heroConfig.monogramInitials as string) || (coupleConfig.monogramInitials as string) || (experience as any).monogramInitials || '';

  // Venue & Maps Data
  const venueSection = experience.sections?.find((s) => s.sectionType === 'venue_map');
  const venueConfig = venueSection?.config || {};
  const venueNameStr = (venueConfig.venueName as string) || (heroConfig.venueName as string) || 'Umaid Bhawan Palace';
  const venueAddressStr = (venueConfig.address as string) || '';
  const venueLocationStr = (venueConfig.venueCity as string) || venueLocation;
  const venueFullAddress = venueAddressStr
    ? venueAddressStr.toLowerCase().includes(venueNameStr.toLowerCase())
      ? venueAddressStr
      : `${venueNameStr}, ${venueAddressStr}`
    : `${venueNameStr}, ${venueLocationStr}`;

  const venueGoogleMapsUrl =
    (venueConfig.mapUrl as string) ||
    (venueConfig.googleMapsUrl as string) ||
    `https://maps.google.com/?q=${encodeURIComponent(venueFullAddress)}`;
  const additionalLocations = (venueConfig.additionalLocations as Array<{
    id: string;
    name: string;
    address?: string;
    note?: string;
  }>) || [];

  const handleCopyAddress = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(`${venueNameStr}\n${venueFullAddress}`);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2200);
    }
  };

  // Itinerary Events Data
  const eventsSection = experience.sections?.find((s) => s.sectionType === 'events_schedule');
  const eventsConfig = eventsSection?.config || {};
  const eventsList = (eventsConfig.events as Array<{
    id: string;
    name: string;
    date: string;
    time: string;
    venue: string;
    dressCode: string;
    description: string;
  }>) || [
      {
        id: 'ev_1',
        name: 'Mehendi & Sangeet Soirée',
        date: eventDateStr,
        time: '04:00 PM onwards',
        venue: venueNameStr,
        dressCode: 'Royal Pastel & Traditional Chic',
        description: 'Henna artistry, celebratory folk melodies, and dinner under the stars.',
      },
      {
        id: 'ev_2',
        name: 'The Sacred Vows & Pheras',
        date: eventDateStr,
        time: '06:30 PM',
        venue: venueNameStr,
        dressCode: 'Regal Formal Indian',
        description: 'Sunset Vedic wedding ceremony under the royal floral mandap.',
      },
      {
        id: 'ev_3',
        name: 'Imperial Gala Banquet & Reception',
        date: eventDateStr,
        time: '08:30 PM',
        venue: venueNameStr,
        dressCode: 'Black Tie & Royal Elegance',
        description: 'Fine dining feast, royal toasts, and musical celebration.',
      },
    ];

  // RSVP Form Configuration
  const rsvpSection = experience.sections?.find((s) => s.sectionType === 'rsvp');
  const rsvpConfig = rsvpSection?.config || {};
  const allowPlusOneGuest = (rsvpConfig.askPlusOne as boolean) ?? true;

  const wishesSection = experience.sections?.find((s) => s.sectionType === 'wishes_guestbook') || {
    id: 'sec_wishes_guestbook',
    sectionType: 'wishes_guestbook' as const,
    title: 'Imperial Wishes & Blessings',
    order: 9,
    isEnabled: true,
    config: {
      title: 'Imperial Wishes & Blessings',
      subtitle: `Bestow your love and divine blessings upon ${p1Name} & ${p2Name}`,
      hostNames: coupleNames,
      venueCity: venueLocation,
    },
  };

  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((e) => console.log('Audio autoplay prevented:', e));
      setIsPlaying(true);
    }
  };

  const handleRsvpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    setIsSubmitting(true);
    try {
      await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experienceId: experience.id,
          tenantId: experience.tenantId,
          guestName: guestName.trim(),
          contact: guestContact.trim(),
          status: attendingStatus,
          partySize,
          dietaryPreference,
          specialNote,
        }),
      });
      setRsvpSubmitted(true);
    } catch (err) {
      console.warn('RSVP submission note:', err);
      setRsvpSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Helper for 1-click Google Calendar
  const makeGoogleCalendarUrl = (eventName: string, time: string, venue: string, desc?: string) => {
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      `${eventName} — ${coupleNames}`
    )}&details=${encodeURIComponent(desc || `Ceremony for ${coupleNames}`)}&location=${encodeURIComponent(
      venue || venueFullAddress
    )}`;
  };

  // Extract initials for wax seal
  const initial1 = p1Name.charAt(0) || 'A';
  const initial2 = p2Name.charAt(0) || 'M';
  const crestInitials = `${initial1}${initial2}`;

  const effectiveShagunAmount = isCustomShagun && customShagun ? parseInt(customShagun, 10) || selectedShagun : selectedShagun;

  return (
    <div
      style={{
        backgroundColor: '#040711',
        backgroundImage: `
          radial-gradient(ellipse 90% 60% at 50% -10%, rgba(28, 40, 85, 0.45) 0%, rgba(6, 8, 20, 0.98) 70%),
          radial-gradient(circle 800px at 50% 1200px, rgba(212, 175, 55, 0.05) 0%, transparent 70%)
        `,
        color: '#FAF5EE',
        minHeight: '100vh',
        fontFamily: "'Cormorant Garamond', 'Cinzel', serif",
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {/* Background Audio */}
      <audio
        ref={audioRef}
        loop
        preload="none"
        src="https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3"
      />

      {/* Living Stardust Cosmic Canvas */}
      <CosmicGoldCanvas />

      {/* Haute Horlogerie Ambient Soundscape Pill */}
      <RoyalAudioPlayerPill
        isPlaying={isPlaying}
        onToggle={toggleMusic}
        trackName="Palace Baroque Waltz"
      />

      {/* ─── HERO SECTION: GRAND PALACE ARCH ─── */}
      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '100px 20px 80px 20px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: '860px', margin: '0 auto', position: 'relative' }}>
          {/* Ornamental Arch Motif / Custom Royal Crest with Halo */}
          <div style={{ marginBottom: '22px', display: 'flex', justifyContent: 'center', position: 'relative' }}>
            {/* Ambient golden halo */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '140px',
                height: '140px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(212, 175, 55, 0.28) 0%, transparent 70%)',
                filter: 'blur(10px)',
                pointerEvents: 'none',
              }}
            />

            {crestImage ? (
              <div
                style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  padding: '3px',
                  background: 'linear-gradient(135deg, #FFDF73 0%, #D4AF37 50%, #785207 100%)',
                  boxShadow: '0 0 35px rgba(212, 175, 55, 0.5), 0 8px 24px rgba(0, 0, 0, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <img
                  src={crestImage}
                  alt="Royal Crest"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <RoyalCrownMotif size={36} color="#FFDF73" />
                <RoyalArchwaySvg size={70} color="#D4AF37" />
              </div>
            )}
          </div>

          {/* Auspicious Imperial Kicker */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ color: '#D4AF37', fontSize: '11px' }}>♦ ✦ ♦</span>
            <span
              style={{
                display: 'inline-block',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '0.76rem',
                letterSpacing: '3.5px',
                textTransform: 'uppercase',
                color: '#FFDF73',
                padding: '6px 20px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(212, 175, 55, 0.12)',
                border: '1px solid rgba(212, 175, 55, 0.35)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                fontWeight: 700,
              }}
            >
              Auspicious Imperial Union
            </span>
            <span style={{ color: '#D4AF37', fontSize: '11px' }}>♦ ✦ ♦</span>
          </div>

          <p
            style={{
              fontSize: 'clamp(1rem, 2.6vw, 1.25rem)',
              color: 'rgba(250, 245, 238, 0.85)',
              fontStyle: 'italic',
              margin: '0 auto 20px auto',
              maxWidth: '560px',
              lineHeight: 1.6,
            }}
          >
            With the divine grace of the Almighty and blessings of our elders
          </p>

          {/* Monumental Royal Couple Names */}
          <CoupleTitle
            as="h1"
            title={coupleNames}
            flourishColor="#D4AF37"
            style={{
              fontFamily: "'Cinzel', 'Playfair Display', Georgia, serif",
              fontSize: 'clamp(2.6rem, 7.5vw, 4.6rem)',
              fontWeight: 700,
              letterSpacing: '2.5px',
              lineHeight: 1.15,
              margin: '0 0 18px 0',
            }}
            nameStyle={{
              background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF4D4 22%, #F5C67B 52%, #FFDE9C 78%, #CA9339 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 14px rgba(245, 198, 123, 0.35))',
            }}
            ampersandStyle={{
              color: '#F5C67B',
              WebkitTextFillColor: '#F5C67B',
            }}
          />

          <p
            style={{
              fontSize: 'clamp(0.95rem, 2.8vw, 1.25rem)',
              letterSpacing: '2px',
              color: 'rgba(250, 245, 238, 0.9)',
              marginBottom: '24px',
              textTransform: 'uppercase',
              fontWeight: 400,
              lineHeight: 1.6,
            }}
          >
            Cordially request the honor of your presence to celebrate their wedding
          </p>

          {/* Jeweled Countdown Pedestals */}
          <RoyalCountdownPills targetDate={eventDateStr} accentColor="#D4AF37" />

          {/* Date & Palace Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '16px',
              padding: '14px 32px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(212, 175, 55, 0.08)',
              border: '1.5px solid rgba(212, 175, 55, 0.4)',
              boxShadow: '0 10px 36px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(16px)',
              marginBottom: '36px',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FFDF73' }}>
              <Calendar size={18} />
              <span style={{ fontSize: '1.05rem', fontWeight: 600 }}>{eventDateStr}</span>
            </div>
            <span style={{ color: 'rgba(212, 175, 55, 0.5)' }}>✦</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FAF5EE' }}>
              <MapPin size={18} color="#D4AF37" />
              <span style={{ fontSize: '1.05rem', fontWeight: 500 }}>{venueLocation}</span>
            </div>
          </div>

          <br />

          {/* Sculpted Gold RSVP CTA Button */}
          <button
            onClick={() => scrollTo('regalia-rsvp')}
            style={{
              padding: '16px 44px',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, #FFF0B8 0%, #FFDF73 25%, #D4AF37 60%, #996515 100%)',
              color: '#07090E',
              fontWeight: 800,
              fontSize: '0.95rem',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(212, 175, 55, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.6)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.25s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(212, 175, 55, 0.65)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(212, 175, 55, 0.5)';
            }}
          >
            <span>RSVP for Celebration</span>
            <ArrowRight size={17} />
          </button>
        </div>
      </section>

      {/* ─── SECTION 2: IMPERIAL FARMAN (CEREMONIAL PROCLAMATION) ─── */}
      <section
        style={{
          padding: '90px 20px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: '720px',
            margin: '0 auto',
            padding: '56px clamp(24px, 5vw, 52px)',
            backgroundColor: 'rgba(13, 18, 43, 0.82)',
            backdropFilter: 'blur(24px)',
            borderRadius: '28px',
            border: '1.5px solid rgba(212, 175, 55, 0.45)',
            boxShadow: '0 25px 70px rgba(0, 0, 0, 0.7), inset 0 0 50px rgba(212, 175, 55, 0.08)',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          {/* Four Gilded Baroque Corner Flourishes */}
          <RoyalCornerFlourish position="top-left" size={48} color="#D4AF37" />
          <RoyalCornerFlourish position="top-right" size={48} color="#D4AF37" />
          <RoyalCornerFlourish position="bottom-left" size={48} color="#D4AF37" />
          <RoyalCornerFlourish position="bottom-right" size={48} color="#D4AF37" />

          {/* Top Wax Seal */}
          <div
            style={{
              position: 'absolute',
              top: '-36px',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <RoyalWaxSeal size={72} initials={crestInitials} />
          </div>

          <span
            style={{
              display: 'inline-block',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '0.72rem',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              color: '#D4AF37',
              marginTop: '16px',
              marginBottom: '6px',
              fontWeight: 700,
            }}
          >
            ✦ Sacred Proclamation ✦
          </span>

          <h3
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 'clamp(1.5rem, 4vw, 2.1rem)',
              color: '#FFDF73',
              marginBottom: '20px',
              letterSpacing: '2px',
              lineHeight: 1.3,
            }}
          >
            The Royal Farman
          </h3>

          <RoyalFiligreeDivider color="#D4AF37" maxWidth={260} />

          <p
            style={{
              fontSize: 'clamp(1.1rem, 2.6vw, 1.3rem)',
              lineHeight: 1.85,
              color: 'rgba(250, 245, 238, 0.92)',
              fontStyle: 'italic',
              margin: '24px auto',
              maxWidth: '560px',
            }}
          >
            "Two souls woven in harmony, embarking on a timeless voyage of love, honor, and laughter.
            Together with our beloved families, we welcome you to share in these cherished memories,
            auspicious prayers, and joyous festivities."
          </p>

          <RoyalFiligreeDivider color="#D4AF37" maxWidth={260} />

          <p
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '0.85rem',
              letterSpacing: '2.5px',
              textTransform: 'uppercase',
              color: '#FFDF73',
              fontWeight: 700,
              marginTop: '20px',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
            }}
          >
            The Families of {p1Name} & {p2Name}
          </p>
        </div>
      </section>

      {/* ─── SECTION 3: GILDED PORTRAITS & CELEBRANT BIOS ─── */}
      <section
        style={{
          padding: '90px 20px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: '860px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ color: '#D4AF37', fontSize: '10px' }}>♦ ✦ ♦</span>
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '0.74rem',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                color: '#D4AF37',
                fontWeight: 700,
              }}
            >
              The Celebrants
            </span>
            <span style={{ color: '#D4AF37', fontSize: '10px' }}>♦ ✦ ♦</span>
          </div>

          <h2
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 'clamp(2rem, 5vw, 2.9rem)',
              color: '#FFFFFF',
              marginBottom: '14px',
            }}
          >
            {isSingle ? 'The Honored Host' : 'Honoring the Couple'}
          </h2>

          <RoyalFiligreeDivider color="#D4AF37" maxWidth={320} />

          {/* Side by Side Gilded Medallions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'clamp(20px, 4vw, 48px)',
              marginTop: '44px',
              flexWrap: 'wrap',
            }}
          >
            {/* Partner 1 */}
            <div style={{ textAlign: 'center', maxWidth: isSingle ? '340px' : '280px', flex: isSingle ? '0 1 340px' : '1 1 240px' }}>
              {/* Crown motif above portrait */}
              <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'center' }}>
                <RoyalCrownMotif size={28} color="#FFDF73" />
              </div>

              <div
                style={{
                  width: isSingle ? 'clamp(180px, 36vw, 230px)' : 'clamp(150px, 32vw, 200px)',
                  height: isSingle ? 'clamp(210px, 42vw, 270px)' : 'clamp(180px, 38vw, 240px)',
                  borderRadius: '50%',
                  margin: '0 auto 18px auto',
                  padding: '6px',
                  background: 'linear-gradient(135deg, #FFF0B8 0%, #FFDF73 30%, #D4AF37 70%, #785207 100%)',
                  boxShadow: '0 14px 40px rgba(0, 0, 0, 0.6), 0 0 28px rgba(212, 175, 55, 0.4)',
                  position: 'relative',
                }}
              >
                {/* Inner dashed gold ring */}
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    border: '1.5px dashed rgba(255, 255, 255, 0.4)',
                    padding: '3px',
                    boxSizing: 'border-box',
                  }}
                >
                  <img
                    src={p1Image}
                    alt={p1Name}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                </div>
              </div>

              <h3
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: isSingle ? '1.8rem' : '1.45rem',
                  color: '#FAF5EE',
                  marginBottom: '4px',
                  textShadow: '0 2px 10px rgba(0, 0, 0, 0.6)',
                }}
              >
                {p1Name}
              </h3>
              <span
                style={{
                  display: 'inline-block',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: '0.75rem',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  color: '#FFDF73',
                  fontWeight: 700,
                  marginBottom: '12px',
                }}
              >
                {p1Role}
              </span>
              {p1Bio && (
                <div
                  style={{
                    backgroundColor: 'rgba(212, 175, 55, 0.06)',
                    border: '1px solid rgba(212, 175, 55, 0.2)',
                    borderRadius: '14px',
                    padding: '12px 16px',
                    maxWidth: '260px',
                    margin: '0 auto',
                  }}
                >
                  <p
                    style={{
                      fontSize: '0.92rem',
                      color: 'rgba(250, 245, 238, 0.85)',
                      lineHeight: 1.5,
                      fontStyle: 'italic',
                      margin: 0,
                    }}
                  >
                    "{p1Bio}"
                  </p>
                </div>
              )}
            </div>

            {/* Central Royal Medallion & Partner 2 (Only in Couple Mode) */}
            {!isSingle && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RoyalUnionMedallion size={54} color="#D4AF37" />
                </div>

                <div style={{ textAlign: 'center', maxWidth: '280px', flex: '1 1 240px' }}>
                  {/* Crown motif above portrait */}
                  <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'center' }}>
                    <RoyalCrownMotif size={28} color="#FFDF73" />
                  </div>

                  <div
                    style={{
                      width: 'clamp(150px, 32vw, 200px)',
                      height: 'clamp(180px, 38vw, 240px)',
                      borderRadius: '50%',
                      margin: '0 auto 18px auto',
                      padding: '6px',
                      background: 'linear-gradient(135deg, #FFF0B8 0%, #FFDF73 30%, #D4AF37 70%, #785207 100%)',
                      boxShadow: '0 14px 40px rgba(0, 0, 0, 0.6), 0 0 28px rgba(212, 175, 55, 0.4)',
                      position: 'relative',
                    }}
                  >
                    {/* Inner dashed gold ring */}
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        border: '1.5px dashed rgba(255, 255, 255, 0.4)',
                        padding: '3px',
                        boxSizing: 'border-box',
                      }}
                    >
                      <img
                        src={p2Image}
                        alt={p2Name}
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          objectFit: 'cover',
                        }}
                      />
                    </div>
                  </div>

                  <h3
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: '1.45rem',
                      color: '#FAF5EE',
                      marginBottom: '4px',
                      textShadow: '0 2px 10px rgba(0, 0, 0, 0.6)',
                    }}
                  >
                    {p2Name}
                  </h3>
                  <span
                    style={{
                      display: 'inline-block',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: '0.75rem',
                      letterSpacing: '2px',
                      textTransform: 'uppercase',
                      color: '#FFDF73',
                      fontWeight: 700,
                      marginBottom: '12px',
                    }}
                  >
                    {p2Role}
                  </span>
                  {p2Bio && (
                    <div
                      style={{
                        backgroundColor: 'rgba(212, 175, 55, 0.06)',
                        border: '1px solid rgba(212, 175, 55, 0.2)',
                        borderRadius: '14px',
                        padding: '12px 16px',
                        maxWidth: '260px',
                        margin: '0 auto',
                      }}
                    >
                      <p
                        style={{
                          fontSize: '0.92rem',
                          color: 'rgba(250, 245, 238, 0.85)',
                          lineHeight: 1.5,
                          fontStyle: 'italic',
                          margin: 0,
                        }}
                      >
                        "{p2Bio}"
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ─── SECTION 4: PALACE CEREMONIAL ITINERARY ─── */}
      <section
        id="regalia-itinerary"
        style={{
          padding: '90px 20px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '44px' }}>
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '0.74rem',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                color: '#D4AF37',
                fontWeight: 700,
              }}
            >
              ✦ Ceremonial Schedule ✦
            </span>
            <h2
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 'clamp(2rem, 5vw, 2.9rem)',
                color: '#FFFFFF',
                marginTop: '8px',
                marginBottom: '12px',
              }}
            >
              Order of Events
            </h2>
            <p
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '0.95rem',
                color: 'rgba(250, 245, 238, 0.7)',
                maxWidth: '520px',
                margin: '0 auto',
                lineHeight: 1.6,
              }}
            >
              A sequence of auspicious rituals, royal feasts, and joy to mark our sacred union.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {eventsList.map((ev, idx) => {
              const calUrl = makeGoogleCalendarUrl(ev.name, ev.time, ev.venue, ev.description);

              return (
                <div
                  key={ev.id || idx}
                  style={{
                    padding: '28px clamp(20px, 4vw, 36px)',
                    borderRadius: '22px',
                    backgroundColor: 'rgba(13, 18, 43, 0.82)',
                    border: '1px solid rgba(212, 175, 55, 0.35)',
                    boxShadow: '0 14px 36px rgba(0, 0, 0, 0.55)',
                    backdropFilter: 'blur(20px)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    position: 'relative',
                    transition: 'all 0.25s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontSize: '0.72rem',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(212, 175, 55, 0.15)',
                          border: '1px solid rgba(212, 175, 55, 0.3)',
                          color: '#D4AF37',
                          fontWeight: 700,
                          letterSpacing: '1px',
                        }}
                      >
                        ✦ 0{idx + 1}
                      </span>
                      <h3
                        style={{
                          fontFamily: "'Cinzel', serif",
                          fontSize: '1.4rem',
                          color: '#FFDF73',
                          margin: 0,
                        }}
                      >
                        {ev.name}
                      </h3>
                    </div>

                    <a
                      href={calUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '9999px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        color: '#FFDF73',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Calendar size={12} />
                      <span>Add to Calendar</span>
                    </a>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '12px',
                      fontSize: '0.92rem',
                      color: 'rgba(250, 245, 238, 0.9)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={16} color="#D4AF37" />
                      <span>{ev.time}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={16} color="#D4AF37" />
                      <span>{ev.venue || venueNameStr}</span>
                    </div>
                  </div>

                  {ev.description && (
                    <p style={{ margin: 0, fontSize: '0.92rem', color: 'rgba(250, 245, 238, 0.8)', fontStyle: 'italic', lineHeight: 1.5 }}>
                      "{ev.description}"
                    </p>
                  )}

                  {ev.dressCode && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.82rem',
                        color: '#FFDF73',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        backgroundColor: 'rgba(212, 175, 55, 0.08)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        width: 'fit-content',
                      }}
                    >
                      <Sparkles size={13} color="#D4AF37" />
                      <span>Dress Code: {ev.dressCode}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Venue & Directions Action */}
          <div style={{ textAlign: 'center', marginTop: '36px' }}>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(venueFullAddress)}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 28px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(212, 175, 55, 0.12)',
                border: '1.5px solid #D4AF37',
                color: '#FFDF73',
                fontSize: '0.9rem',
                textDecoration: 'none',
                fontWeight: 600,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                transition: 'all 0.2s ease',
              }}
            >
              <Navigation size={15} />
              <span>Get Directions to Palace</span>
            </a>
          </div>
        </div>
      </section>

      {/* ─── SECTION 5: DESTINATION & WAYFINDING ─── */}
      <section
        id="sec-venue"
        data-section="venue"
        style={{
          padding: '90px 20px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          {/* Section Kicker & Header */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '3px',
                color: '#D4AF37',
                fontWeight: 700,
              }}
            >
              Destination & Wayfinding
            </span>
            <h2
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 'clamp(2rem, 5vw, 2.9rem)',
                color: '#FFFFFF',
                marginTop: '8px',
                marginBottom: '12px',
              }}
            >
              The Royal Setting
            </h2>
            <p
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '1rem',
                color: 'rgba(250, 245, 238, 0.75)',
                maxWidth: '580px',
                margin: '0 auto',
                lineHeight: 1.6,
              }}
            >
              Guiding your arrival to our celebration venue and ceremonial spots.
            </p>
          </div>

          {/* Master Destination Card */}
          <div
            style={{
              padding: 'clamp(24px, 4vw, 36px)',
              borderRadius: '24px',
              backgroundColor: 'rgba(13, 18, 43, 0.85)',
              border: '1px solid rgba(212, 175, 55, 0.35)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(20px)',
              marginBottom: additionalLocations.length > 0 ? '36px' : '0px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', maxWidth: '600px' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.05))',
                    border: '1.5px solid rgba(212, 175, 55, 0.45)',
                    color: '#FFDF73',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 8px 20px rgba(212, 175, 55, 0.15)',
                  }}
                >
                  <MapPin size={28} color="#D4AF37" />
                </div>
                <div>
                  <span
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: '0.72rem',
                      letterSpacing: '1.8px',
                      textTransform: 'uppercase',
                      color: '#D4AF37',
                      fontWeight: 700,
                    }}
                  >
                    Primary Venue
                  </span>
                  <h3
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: 'clamp(1.4rem, 3.2vw, 1.9rem)',
                      color: '#FFFFFF',
                      margin: '2px 0 6px 0',
                    }}
                  >
                    {venueNameStr}
                  </h3>
                  <p
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: '0.92rem',
                      color: 'rgba(250, 245, 238, 0.8)',
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {venueFullAddress}
                  </p>
                </div>
              </div>

              {/* Action Buttons: 1-Click Google Maps & Copy Address */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                <a
                  href={venueGoogleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '9px',
                    padding: '12px 22px',
                    borderRadius: '9999px',
                    background: 'linear-gradient(135deg, #FFDF73 0%, #D4AF37 50%, #996515 100%)',
                    color: '#07090E',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 4px 18px rgba(212, 175, 55, 0.38)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Navigation size={15} />
                  <span>Get Directions on Google Maps</span>
                  <ExternalLink size={13} />
                </a>

                <button
                  type="button"
                  onClick={handleCopyAddress}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 18px',
                    borderRadius: '9999px',
                    backgroundColor: copiedAddress ? 'rgba(0, 230, 138, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    border: copiedAddress ? '1px solid #00E68A' : '1px solid rgba(212, 175, 55, 0.25)',
                    color: copiedAddress ? '#00E68A' : 'rgba(250, 245, 238, 0.85)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {copiedAddress ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedAddress ? 'Copied to Clipboard' : 'Copy Address'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Celebration Spots & Sub-Locations Grid */}
          {additionalLocations.length > 0 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '20px',
                  padding: '0 4px',
                }}
              >
                <div>
                  <h3
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: '1.35rem',
                      color: '#FFDF73',
                      margin: 0,
                    }}
                  >
                    Ceremony & Gathering Spots
                  </h3>
                  <span
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: '0.85rem',
                      color: 'rgba(250, 245, 238, 0.65)',
                    }}
                  >
                    Dedicated locations for key moments within {venueNameStr}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: '0.75rem',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(212, 175, 55, 0.15)',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    color: '#D4AF37',
                    fontWeight: 700,
                    letterSpacing: '1px',
                  }}
                >
                  {additionalLocations.length} {additionalLocations.length === 1 ? 'Spot' : 'Spots'}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '18px',
                }}
              >
                {additionalLocations.map((loc, idx) => {
                  const locMapQuery = encodeURIComponent(
                    `${loc.name ? loc.name + ', ' : ''}${loc.address || venueFullAddress}`
                  );
                  const locMapUrl = `https://maps.google.com/?q=${locMapQuery}`;

                  return (
                    <div
                      key={loc.id || idx}
                      style={{
                        padding: '22px 24px',
                        borderRadius: '18px',
                        backgroundColor: 'rgba(13, 18, 43, 0.75)',
                        border: '1px solid rgba(212, 175, 55, 0.25)',
                        boxShadow: '0 10px 28px rgba(0, 0, 0, 0.4)',
                        backdropFilter: 'blur(16px)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span
                          style={{
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(212, 175, 55, 0.15)',
                            color: '#D4AF37',
                            letterSpacing: '0.5px',
                          }}
                        >
                          Spot 0{idx + 1}
                        </span>
                      </div>

                      <h4
                        style={{
                          fontFamily: "'Cinzel', serif",
                          fontSize: '1.2rem',
                          color: '#FFFFFF',
                          margin: 0,
                        }}
                      >
                        {loc.name || 'Ceremony Location'}
                      </h4>

                      {loc.address && (
                        <p
                          style={{
                            margin: 0,
                            fontSize: '0.85rem',
                            color: 'rgba(250, 245, 238, 0.75)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '6px',
                            lineHeight: 1.4,
                          }}
                        >
                          <MapPin size={13} color="#D4AF37" style={{ marginTop: '2px', flexShrink: 0 }} />
                          <span>{loc.address}</span>
                        </p>
                      )}

                      {loc.note && (
                        <p
                          style={{
                            margin: 0,
                            fontSize: '0.82rem',
                            color: '#FFDF73',
                            backgroundColor: 'rgba(212, 175, 55, 0.08)',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            borderLeft: '2px solid #D4AF37',
                            lineHeight: 1.4,
                          }}
                        >
                          {loc.note}
                        </p>
                      )}

                      <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                        <a
                          href={locMapUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: '#FFDF73',
                            textDecoration: 'none',
                          }}
                        >
                          <Navigation size={13} />
                          <span>Get Directions →</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── SECTION 6: DIGITAL SHAGUN & BLESSINGS REGISTRY ─── */}
      <section
        style={{
          padding: '90px 20px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: '720px',
            margin: '0 auto',
            padding: '48px clamp(20px, 4vw, 44px)',
            backgroundColor: 'rgba(13, 18, 43, 0.85)',
            border: '1.5px solid rgba(212, 175, 55, 0.4)',
            borderRadius: '26px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(20px)',
            position: 'relative',
          }}
        >
          {/* Gilded Corner Flourishes */}
          <RoyalCornerFlourish position="top-left" size={42} color="#D4AF37" />
          <RoyalCornerFlourish position="top-right" size={42} color="#D4AF37" />
          <RoyalCornerFlourish position="bottom-left" size={42} color="#D4AF37" />
          <RoyalCornerFlourish position="bottom-right" size={42} color="#D4AF37" />

          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: 'rgba(212, 175, 55, 0.15)',
              border: '1.5px solid #D4AF37',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px auto',
              color: '#FFDF73',
              boxShadow: '0 0 20px rgba(212, 175, 55, 0.35)',
            }}
          >
            <Gift size={26} />
          </div>

          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '0.74rem',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              color: '#D4AF37',
              fontWeight: 700,
            }}
          >
            ✦ Auspicious Traditions ✦
          </span>

          <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 'clamp(1.6rem, 4vw, 2.1rem)', color: '#FFDF73', marginTop: '6px', marginBottom: '8px' }}>
            Blessings & Traditional Shagun
          </h3>
          <p style={{ color: 'rgba(250, 245, 238, 0.8)', fontSize: '0.96rem', fontStyle: 'italic', maxWidth: '520px', margin: '0 auto 28px auto', lineHeight: 1.6 }}>
            Your loving presence and prayers are our most treasured gifts. For guests wishing to bestow a traditional Shagun blessing upon the couple:
          </p>

          {/* Auspicious Coin Denominations */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '18px' }}>
            {[501, 1100, 2100, 5100, 11000, 21000].map((amt) => {
              const isSelected = !isCustomShagun && selectedShagun === amt;
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setSelectedShagun(amt);
                    setIsCustomShagun(false);
                  }}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '14px',
                    background: isSelected
                      ? 'linear-gradient(135deg, #FFDF73 0%, #D4AF37 100%)'
                      : 'rgba(255, 255, 255, 0.04)',
                    color: isSelected ? '#060814' : '#FFDF73',
                    border: isSelected ? '1px solid #FFDF73' : '1px solid rgba(212, 175, 55, 0.3)',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    boxShadow: isSelected ? '0 4px 18px rgba(212, 175, 55, 0.45)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  ₹{amt.toLocaleString('en-IN')}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setIsCustomShagun(!isCustomShagun)}
              style={{
                padding: '10px 18px',
                borderRadius: '14px',
                background: isCustomShagun ? 'linear-gradient(135deg, #FFDF73 0%, #D4AF37 100%)' : 'rgba(255, 255, 255, 0.04)',
                color: isCustomShagun ? '#060814' : '#FFDF73',
                border: isCustomShagun ? '1px solid #FFDF73' : '1px solid rgba(212, 175, 55, 0.3)',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                transition: 'all 0.2s ease',
              }}
            >
              Custom Amount
            </button>
          </div>

          {/* Custom Amount Input Field */}
          {isCustomShagun && (
            <div style={{ maxWidth: '280px', margin: '0 auto 20px auto', position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#FFDF73', fontWeight: 700 }}>
                ₹
              </span>
              <input
                type="number"
                placeholder="Enter amount"
                value={customShagun}
                onChange={(e) => setCustomShagun(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 34px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(6, 8, 20, 0.8)',
                  border: '1.5px solid #D4AF37',
                  color: '#FFFFFF',
                  fontSize: '1rem',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
            </div>
          )}

          {shagunSent ? (
            <div
              style={{
                padding: '18px 24px',
                borderRadius: '16px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10B981',
                color: '#34D399',
                fontSize: '0.96rem',
                maxWidth: '480px',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Check size={20} />
              <span>Auspicious Shagun blessing of ₹{effectiveShagunAmount.toLocaleString('en-IN')} bestowed with love!</span>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setShagunSent(true)}
                style={{
                  padding: '15px 36px',
                  borderRadius: '9999px',
                  background: 'linear-gradient(135deg, #FFF0B8 0%, #FFDF73 25%, #D4AF37 60%, #996515 100%)',
                  color: '#07090E',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  letterSpacing: '1px',
                  cursor: 'pointer',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  boxShadow: '0 6px 24px rgba(212, 175, 55, 0.45)',
                  transition: 'all 0.2s ease',
                }}
              >
                Bestow Shagun (₹{effectiveShagunAmount.toLocaleString('en-IN')})
              </button>

              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 24px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1.5px solid rgba(212, 175, 55, 0.4)',
                  color: '#FFDF73',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  transition: 'all 0.2s ease',
                }}
              >
                <QrCode size={16} />
                <span>Instant UPI QR</span>
              </button>
            </div>
          )}

          {/* Simulated UPI QR Modal */}
          {showQrModal && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
                padding: '20px',
              }}
              onClick={() => setShowQrModal(false)}
            >
              <div
                style={{
                  maxWidth: '380px',
                  width: '100%',
                  backgroundColor: '#0A0F24',
                  border: '1.5px solid #D4AF37',
                  borderRadius: '24px',
                  padding: '32px 24px',
                  textAlign: 'center',
                  boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(212, 175, 55, 0.25)',
                  position: 'relative',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    background: 'none',
                    border: 'none',
                    color: '#9CA3AF',
                    cursor: 'pointer',
                  }}
                >
                  <X size={20} />
                </button>

                <RoyalCrownMotif size={28} color="#FFDF73" />
                <h4 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.25rem', color: '#FFDF73', margin: '8px 0 4px 0' }}>
                  Digital Shagun Gateway
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'rgba(250, 245, 238, 0.7)', margin: '0 0 20px 0' }}>
                  {coupleNames} • ₹{effectiveShagunAmount.toLocaleString('en-IN')}
                </p>

                {/* Simulated QR Code Canvas Box */}
                <div
                  style={{
                    width: '200px',
                    height: '200px',
                    margin: '0 auto 20px auto',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  <QrCode size={150} color="#060814" />
                  <span style={{ fontSize: '10px', color: '#060814', fontWeight: 800, marginTop: '4px' }}>
                    BHIM UPI / GPAY / PHONEPE
                  </span>
                </div>

                <p style={{ fontSize: '0.78rem', color: 'rgba(250, 245, 238, 0.75)', margin: '0 0 16px 0' }}>
                  Scan with any UPI app to transfer traditional blessings directly to the host accounts.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setShagunSent(true);
                    setShowQrModal(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '9999px',
                    backgroundColor: '#D4AF37',
                    color: '#060814',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  I have sent the Shagun
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── SECTION 7: ROYAL VELVET RSVP ─── */}
      <section
        id="regalia-rsvp"
        style={{
          padding: '90px 20px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: '680px',
            margin: '0 auto',
            padding: '52px clamp(24px, 5vw, 48px)',
            backgroundColor: 'rgba(13, 18, 43, 0.88)',
            backdropFilter: 'blur(24px)',
            borderRadius: '28px',
            border: '1.5px solid rgba(212, 175, 55, 0.45)',
            boxShadow: '0 25px 70px rgba(0, 0, 0, 0.7), inset 0 0 40px rgba(212, 175, 55, 0.06)',
            position: 'relative',
          }}
        >
          {/* Gilded Corner Flourishes */}
          <RoyalCornerFlourish position="top-left" size={44} color="#D4AF37" />
          <RoyalCornerFlourish position="top-right" size={44} color="#D4AF37" />
          <RoyalCornerFlourish position="bottom-left" size={44} color="#D4AF37" />
          <RoyalCornerFlourish position="bottom-right" size={44} color="#D4AF37" />

          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '0.74rem',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                color: '#D4AF37',
                fontWeight: 700,
              }}
            >
              ✦ Formal Response Required ✦
            </span>
            <h2
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 'clamp(1.9rem, 4.5vw, 2.6rem)',
                color: '#FFFFFF',
                marginTop: '6px',
                marginBottom: '8px',
              }}
            >
              Royal RSVP Confirmation
            </h2>
            <p style={{ color: 'rgba(250, 245, 238, 0.8)', fontSize: '0.95rem', fontStyle: 'italic', margin: '0 auto' }}>
              Kindly confirm your presence by {eventDateStr} to ensure auspicious palace seating.
            </p>
          </div>

          {rsvpSubmitted ? (
            <div style={{ textAlign: 'center', padding: '36px 0' }}>
              <div
                style={{
                  width: '70px',
                  height: '70px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(212, 175, 55, 0.15)',
                  color: '#FFDF73',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 18px auto',
                  border: '1.5px solid #D4AF37',
                  boxShadow: '0 0 24px rgba(212, 175, 55, 0.35)',
                }}
              >
                <CheckCircle2 size={40} />
              </div>
              <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.9rem', color: '#FAF5EE', marginBottom: '8px' }}>
                Your Presence is Honored
              </h3>
              <p style={{ color: 'rgba(250, 245, 238, 0.85)', fontSize: '1rem', fontStyle: 'italic', marginBottom: '28px', maxWidth: '440px', margin: '0 auto 28px auto' }}>
                Thank you, <strong>{guestName}</strong>. Your confirmation for {partySize} {partySize === 1 ? 'guest' : 'guests'} has been formally registered with the royal host families.
              </p>
              <button
                type="button"
                onClick={() => setRsvpSubmitted(false)}
                style={{
                  padding: '12px 28px',
                  borderRadius: '9999px',
                  backgroundColor: 'transparent',
                  color: '#FFDF73',
                  border: '1px solid rgba(212, 175, 55, 0.45)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                Modify Response
              </button>
            </div>
          ) : (
            <form onSubmit={handleRsvpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* Attendance Toggle Choice */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#FFDF73', marginBottom: '8px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
                  Will You Be Attending? *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setAttendingStatus('ATTENDING')}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '14px',
                      backgroundColor: attendingStatus === 'ATTENDING' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(6, 8, 20, 0.6)',
                      border: attendingStatus === 'ATTENDING' ? '1.5px solid #FFDF73' : '1px solid rgba(212, 175, 55, 0.25)',
                      color: attendingStatus === 'ATTENDING' ? '#FFDF73' : 'rgba(250, 245, 238, 0.7)',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      boxShadow: attendingStatus === 'ATTENDING' ? '0 0 16px rgba(212, 175, 55, 0.3)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    ✨ Joyfully Accept
                  </button>

                  <button
                    type="button"
                    onClick={() => setAttendingStatus('DECLINED')}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '14px',
                      backgroundColor: attendingStatus === 'DECLINED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(6, 8, 20, 0.6)',
                      border: attendingStatus === 'DECLINED' ? '1.5px solid #EF4444' : '1px solid rgba(212, 175, 55, 0.25)',
                      color: attendingStatus === 'DECLINED' ? '#FCA5A5' : 'rgba(250, 245, 238, 0.7)',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Regretfully Decline
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#FFDF73', marginBottom: '8px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
                  Guest Name(s) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maharaja Vikram Singh & Family"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    borderRadius: '14px',
                    backgroundColor: 'rgba(6, 8, 20, 0.7)',
                    border: '1px solid rgba(212, 175, 55, 0.35)',
                    color: '#FFFFFF',
                    fontFamily: 'inherit',
                    fontSize: '0.98rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Contact Information */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#FFDF73', marginBottom: '8px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
                  Contact (Mobile or Email) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="vikram@singh.in or +91 98765 43210"
                  value={guestContact}
                  onChange={(e) => setGuestContact(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    borderRadius: '14px',
                    backgroundColor: 'rgba(6, 8, 20, 0.7)',
                    border: '1px solid rgba(212, 175, 55, 0.35)',
                    color: '#FFFFFF',
                    fontFamily: 'inherit',
                    fontSize: '0.98rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Headcount Stepper (if attending) */}
              {attendingStatus === 'ATTENDING' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#FFDF73', marginBottom: '8px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
                    Party Size (Attending Guests)
                  </label>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '8px 18px',
                      borderRadius: '14px',
                      backgroundColor: 'rgba(6, 8, 20, 0.7)',
                      border: '1px solid rgba(212, 175, 55, 0.35)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setPartySize(Math.max(1, partySize - 1))}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(212, 175, 55, 0.15)',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        color: '#FFDF73',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Minus size={15} />
                    </button>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '1.2rem', fontWeight: 700, color: '#FFFFFF', minWidth: '40px', textAlign: 'center' }}>
                      {partySize} {partySize === 1 ? 'Guest' : 'Guests'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPartySize(Math.min(10, partySize + 1))}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(212, 175, 55, 0.15)',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        color: '#FFDF73',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* Dietary Preferences (if attending) */}
              {attendingStatus === 'ATTENDING' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#FFDF73', marginBottom: '8px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
                    Dietary Requirements
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {['Vegetarian', 'Jain', 'Non-Vegetarian', 'Vegan', 'Gluten-Free'].map((diet) => {
                      const isDietSelected = dietaryPreference === diet;
                      return (
                        <button
                          key={diet}
                          type="button"
                          onClick={() => setDietaryPreference(diet)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '9999px',
                            backgroundColor: isDietSelected ? '#D4AF37' : 'rgba(255, 255, 255, 0.05)',
                            color: isDietSelected ? '#060814' : 'rgba(250, 245, 238, 0.8)',
                            border: isDietSelected ? '1px solid #FFDF73' : '1px solid rgba(212, 175, 55, 0.25)',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {diet}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Special Note */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#FFDF73', marginBottom: '8px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
                  Personal Note or Blessing (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Warm wishes or arrival details for the host family..."
                  value={specialNote}
                  onChange={(e) => setSpecialNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    backgroundColor: 'rgba(6, 8, 20, 0.7)',
                    border: '1px solid rgba(212, 175, 55, 0.35)',
                    color: '#FFFFFF',
                    fontFamily: 'inherit',
                    fontSize: '0.92rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'none',
                  }}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  marginTop: '10px',
                  padding: '16px',
                  borderRadius: '9999px',
                  background: 'linear-gradient(135deg, #FFF0B8 0%, #FFDF73 25%, #D4AF37 60%, #996515 100%)',
                  color: '#07090E',
                  fontWeight: 800,
                  fontSize: '0.96rem',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  border: 'none',
                  cursor: isSubmitting ? 'wait' : 'pointer',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  boxShadow: '0 8px 32px rgba(212, 175, 55, 0.45)',
                  transition: 'all 0.25s ease',
                }}
              >
                {isSubmitting ? 'Recording Royal RSVP...' : '✦ Seal & Confirm Royal RSVP ✦'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ─── SECTION 8: IMPERIAL WISHES GUESTBOOK ─── */}
      <section
        style={{
          padding: '90px 20px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: '840px', margin: '0 auto' }}>
          <WishesGuestbookSection
            section={wishesSection}
            theme={theme}
            experienceId={experience.id}
            tenantId={experience.tenantId}
          />
        </div>
      </section>

      {/* ─── LUXURY REGAL FOOTER ─── */}
      <footer
        style={{
          padding: '70px 20px',
          textAlign: 'center',
          borderTop: '1px solid rgba(212, 175, 55, 0.3)',
          position: 'relative',
          zIndex: 10,
          backgroundColor: 'rgba(4, 7, 17, 0.98)',
        }}
      >
        <RoyalWaxSeal size={56} initials={crestInitials} />
        <h4 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.45rem', color: '#FFDF73', margin: '16px 0 6px 0' }}>
          {coupleNames}
        </h4>
        <p style={{ color: 'rgba(250, 245, 238, 0.65)', fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>
          {eventDateStr} • {venueLocation}
        </p>
      </footer>
    </div>
  );
}
