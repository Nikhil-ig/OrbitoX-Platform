'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Experience,
  Theme,
} from '@orbitox-io/celebrations';
import {
  Heart,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  Send,
  Volume2,
  VolumeX,
  CheckCircle,
  ExternalLink,
  Lock,
  Unlock,
} from 'lucide-react';
import { RomanticPetalsCanvas } from './RomanticPetalsCanvas';
import {
  FrenchArchwayFrame,
  ClimbingRosesGarland,
  VintageBrassHandle,
  RomanticFloralDivider,
  CandleLantern,
} from './RomanticDoorsDecorations';
import { CoupleTitle } from '../../CoupleTitle';

interface Props {
  experience: Experience;
  theme: Theme;
}

// Romantic sound synthesizer (Web Audio API)
function playRomanticDoorSound(action: 'open' | 'close') {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    // 1. Vintage brass latch click sound
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(action === 'open' ? 420 : 310, ctx.currentTime);
    clickGain.gain.setValueAtTime(0.12, ctx.currentTime);
    clickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(ctx.currentTime);
    clickOsc.stop(ctx.currentTime + 0.09);

    // 2. Romantic Cello / Harp Resonance
    const chord =
      action === 'open'
        ? [220.0, 277.18, 329.63, 440.0, 554.37, 659.25]
        : [329.63, 277.18, 220.0];

    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);

      gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + idx * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.06 + 1.8);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.06);
      osc.stop(ctx.currentTime + idx * 0.06 + 1.85);
    });
  } catch {
    // Silently degrade if audio policy is restricted
  }
}

export function RomanticDoorsExperience({ experience, theme }: Props) {
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [handleHovered, setHandleHovered] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // RSVP Form State
  const [rsvpName, setRsvpName] = useState('');
  const [rsvpAttending, setRsvpAttending] = useState<'yes' | 'no'>('yes');
  const [rsvpGuests, setRsvpGuests] = useState('1');
  const [rsvpDietary, setRsvpDietary] = useState('');
  const [rsvpMessage, setRsvpMessage] = useState('');
  const [rsvpSubmitted, setRsvpSubmitted] = useState(false);

  // Guestbook Wishes State
  const [wishes, setWishes] = useState<
    Array<{ id: string; name: string; message: string; time: string; hearts: number }>
  >([
    {
      id: 'w1',
      name: 'Princess Gayatri & Family',
      message: 'May your love bloom forever like the perennial roses of Udaipur. An ethereal union!',
      time: '2 hours ago',
      hearts: 24,
    },
    {
      id: 'w2',
      name: 'Rohan & Tanya',
      message: 'Counting the hours to dance under the stars at your Sangeet! Sending endless love.',
      time: 'Yesterday',
      hearts: 18,
    },
    {
      id: 'w3',
      name: 'Uncle Alok',
      message: 'Blessings from our entire family. May your shared journey be filled with laughter and grace.',
      time: '2 days ago',
      hearts: 31,
    },
  ]);
  const [newWishName, setNewWishName] = useState('');
  const [newWishText, setNewWishText] = useState('');

  // Extract Sections dynamically
  const sortedSections = useMemo(
    () => [...experience.sections].sort((a, b) => a.order - b.order),
    [experience.sections]
  );

  const heroSec = sortedSections.find((s) => s.sectionType === 'hero');
  const coupleSec = sortedSections.find((s) => s.sectionType === 'couple_profile');
  const storySec = sortedSections.find((s) => s.sectionType === 'story');
  const eventsSec = sortedSections.find((s) => s.sectionType === 'events_schedule');
  const venueSec = sortedSections.find((s) => s.sectionType === 'venue_map');

  // Dynamic values
  const heroConfig = heroSec?.config || {};
  const coupleNames =
    (heroConfig.hostNames as string) ||
    experience.title.replace(' Wedding Celebration', '') ||
    'Aarav & Meera';
  const nameParts = coupleNames.split('&').map((n) => n.trim());
  const partner1First = nameParts[0] || 'Aarav';
  const partner2First = nameParts[1] || 'Meera';

  const subheadline =
    (heroConfig.subheadline as string) ||
    'Together with our families, we invite you to celebrate our union';
  const eventDate =
    (heroConfig.eventDate as string) || experience.eventDate || 'December 18, 2026';
  const venueCity = (heroConfig.venueCity as string) || 'Udaipur, Rajasthan';

  // Couple profiles
  const coupleConfig = coupleSec?.config || {};
  const partner1 = {
    name: (coupleConfig.partner1Name as string) || partner1First,
    role: (coupleConfig.partner1Role as string) || 'The Groom',
    bio:
      (coupleConfig.partner1Bio as string) ||
      'An architect captivated by heritage structures, gentle mornings, and eternal love.',
    image:
      (coupleConfig.partner1Image as string) ||
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
  };
  const partner2 = {
    name: (coupleConfig.partner2Name as string) || partner2First,
    role: (coupleConfig.partner2Role as string) || 'The Bride',
    bio:
      (coupleConfig.partner2Bio as string) ||
      'A wildlife photographer enchanted by mountain mist, poetry, and shared laughter.',
    image:
      (coupleConfig.partner2Image as string) ||
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80',
  };

  // Story Milestones
  const rawStoryMilestones = storySec?.config?.milestones as Array<{
    year: string;
    title: string;
    description: string;
    image?: string;
  }> | undefined;

  const isStorySectionEnabled = storySec ? storySec.isEnabled !== false : true;
  const isStoryVisible = isStorySectionEnabled && (rawStoryMilestones === undefined || rawStoryMilestones.length > 0);

  const storyMilestones =
    rawStoryMilestones && rawStoryMilestones.length > 0
      ? rawStoryMilestones
      : [
          {
            year: '2021',
            title: 'The Serendipitous Meeting',
            description: 'A quiet rainy afternoon where conversation flowed for hours into twilight.',
            image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80',
          },
          {
            year: '2023',
            title: 'The Great Mountain Journey',
            description: 'Watching midnight stars above the peaks and knowing our souls were home.',
            image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&q=80',
          },
          {
            year: '2025',
            title: 'The Sunset Proposal',
            description: 'Under a canopy of blooming bougainvillea by the sea, forever began.',
            image: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=600&q=80',
          },
        ];

  // Events
  const eventList =
    (eventsSec?.config?.events as Array<{
      id: string;
      name: string;
      date: string;
      time: string;
      venue: string;
      dressCode?: string;
      description?: string;
    }>) || [
      {
        id: 'ev1',
        name: 'Mehendi & Floral High Tea',
        date: 'December 17, 2026',
        time: '03:30 PM Onwards',
        venue: 'The Botanical Courtyard, Taj Fateh Prakash',
        dressCode: 'Pastel Garden Chic',
        description: 'Henna artistry, live acoustic folk strings, and champagne treats.',
      },
      {
        id: 'ev2',
        name: 'Sangeet & Starlit Soirée',
        date: 'December 17, 2026',
        time: '07:30 PM',
        venue: 'The Grand Palace Pavilion',
        dressCode: 'Indo-Western Radiance',
        description: 'Performances, culinary banquet, and celebration under the stars.',
      },
      {
        id: 'ev3',
        name: 'The Sacred Vows & Pheras',
        date: 'December 18, 2026',
        time: '05:00 PM Sunset',
        venue: 'Jagmandir Island Palace',
        dressCode: 'Regal Traditional Formal',
        description: 'Sunset nuptials surrounded by the serene waters of Lake Pichola.',
      },
    ];

  // Live countdown state
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const target = new Date(eventDate).getTime() || new Date('2026-12-18T18:00:00').getTime();
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
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [eventDate]);

  const handleToggleDoors = () => {
    const nextState = !doorsOpen;
    playRomanticDoorSound(nextState ? 'open' : 'close');
    setDoorsOpen(nextState);
  };

  const handleRsvpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rsvpName.trim()) return;
    setRsvpSubmitted(true);
  };

  const handleAddWish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWishName.trim() || !newWishText.trim()) return;
    setWishes([
      {
        id: `wish_${Date.now()}`,
        name: newWishName.trim(),
        message: newWishText.trim(),
        time: 'Just now',
        hearts: 1,
      },
      ...wishes,
    ]);
    setNewWishName('');
    setNewWishText('');
  };

  return (
    <div
      style={{
        backgroundColor: '#12080E',
        color: '#FDF7F4',
        minHeight: '100vh',
        fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif",
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {/* Falling Organic Rose Petals & Candlelight Embers */}
      <RomanticPetalsCanvas />

      {/* Ambient Radial Romance Glows */}
      <div
        style={{
          position: 'fixed',
          top: '-15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '900px',
          height: '600px',
          background:
            'radial-gradient(ellipse at center, rgba(232, 165, 152, 0.15) 0%, rgba(212, 175, 55, 0.08) 45%, transparent 75%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Floating Audio Romance Toggle */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 90,
        }}
      >
        <button
          type="button"
          onClick={() => {
            setIsMuted(!isMuted);
            playRomanticDoorSound('open');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '9999px',
            background: 'rgba(25, 14, 20, 0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(212, 175, 55, 0.45)',
            color: '#FFF1C5',
            fontSize: '0.8rem',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            transition: 'all 0.2s',
          }}
        >
          {isMuted ? <VolumeX size={15} color="#E8A598" /> : <Volume2 size={15} color="#D4AF37" />}
          <span>{isMuted ? 'Sound Off' : 'Chateau Ambience'}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* HERO SECTION: ARCHITECTURAL 3D FRENCH CHATEAU DOUBLE DOORS                */}
      {/* ========================================================================= */}
      <section
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '70px 16px 50px 16px',
          zIndex: 10,
        }}
      >
        {/* Unified Architectural Portico Wrapper */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '620px',
            margin: '0 auto',
          }}
        >
          {/* Architectural Arch Casing Overlay (Hugs the exact perimeter of the curved doors) */}
          <div
            style={{
              position: 'absolute',
              top: '-32px',
              left: '-20px',
              right: '-20px',
              height: '180px',
              pointerEvents: 'none',
              zIndex: 30,
            }}
          >
            <FrenchArchwayFrame primaryColor="#E8A598" goldColor="#D4AF37" />
          </div>

          {/* Left Climbing Rose Garland (Clings directly to the left door jamb) */}
          <div
            style={{
              position: 'absolute',
              top: '40px',
              left: '-44px',
              width: '56px',
              height: '380px',
              zIndex: 32,
              pointerEvents: 'none',
            }}
          >
            <ClimbingRosesGarland side="left" primaryColor="#E8A598" />
          </div>

          {/* Right Climbing Rose Garland (Clings directly to the right door jamb) */}
          <div
            style={{
              position: 'absolute',
              top: '40px',
              right: '-44px',
              width: '56px',
              height: '380px',
              zIndex: 32,
              pointerEvents: 'none',
            }}
          >
            <ClimbingRosesGarland side="right" primaryColor="#E8A598" />
          </div>

          {/* THE 3D DOUBLE FRENCH DOOR PORTAL */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: 'clamp(520px, 72vh, 640px)',
              borderTopLeftRadius: '310px',
              borderTopRightRadius: '310px',
              borderBottomLeftRadius: '16px',
              borderBottomRightRadius: '16px',
              border: '2px solid rgba(212, 175, 55, 0.5)',
              boxShadow: '0 24px 70px rgba(0,0,0,0.9), inset 0 0 40px rgba(0,0,0,0.7)',
              background: '#0D0509',
              perspective: '1600px',
              perspectiveOrigin: '50% 50%',
            }}
          >
            {/* INNER SANCTUARY REVEAL (Clipped inside arched perimeter) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderTopLeftRadius: '308px',
                borderTopRightRadius: '308px',
                borderBottomLeftRadius: '14px',
                borderBottomRightRadius: '14px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'clamp(28px, 4vh, 44px) clamp(18px, 3vw, 32px)',
                textAlign: 'center',
                background:
                  'radial-gradient(circle at 50% 35%, rgba(232, 165, 152, 0.22) 0%, rgba(25, 12, 18, 0.96) 75%)',
                zIndex: 1,
              }}
            >
              {/* Soft Candlelit Chandelier Ambient Glow */}
              <div
                style={{
                  position: 'absolute',
                  top: '12%',
                  width: '260px',
                  height: '160px',
                  background: 'radial-gradient(ellipse, rgba(255, 235, 190, 0.25) 0%, transparent 70%)',
                  filter: 'blur(30px)',
                  pointerEvents: 'none',
                }}
              />

              <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(8px, 1.8vh, 16px)' }}>
                <span
                  style={{
                    letterSpacing: '4px',
                    textTransform: 'uppercase',
                    fontSize: 'clamp(0.68rem, 1.6vw, 0.78rem)',
                    color: '#D4AF37',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Sparkles size={13} color="#D4AF37" />
                  <span>The Sanctuary of Love</span>
                  <Sparkles size={13} color="#D4AF37" />
                </span>

                <CoupleTitle
                  as="h2"
                  title={coupleNames}
                  flourishColor="#E8A598"
                  style={{
                    fontSize: 'clamp(1.9rem, 4.8vw, 3.2rem)',
                    lineHeight: 1.15,
                    fontWeight: 700,
                    color: '#FFF6E9',
                    textShadow: '0 4px 20px rgba(0,0,0,0.9), 0 0 30px rgba(232, 165, 152, 0.35)',
                    margin: 0,
                  }}
                />

                <p
                  style={{
                    fontSize: 'clamp(0.85rem, 2vw, 1rem)',
                    fontStyle: 'italic',
                    color: '#E8A598',
                    maxWidth: '440px',
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  "{subheadline}"
                </p>

                {/* Ceremony Date & City Pill */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 'clamp(8px, 2vw, 14px)',
                    padding: '8px 18px',
                    borderRadius: '9999px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(212, 175, 55, 0.35)',
                    backdropFilter: 'blur(10px)',
                    color: '#FFF1C5',
                    fontSize: 'clamp(0.78rem, 1.8vw, 0.88rem)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={13} color="#D4AF37" />
                    <span>{eventDate}</span>
                  </span>
                  <span style={{ opacity: 0.4 }}>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={13} color="#E8A598" />
                    <span>{venueCity}</span>
                  </span>
                </div>

                {/* Countdown 4-Metric Grid (Guaranteed Never to Wrap) */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 'clamp(6px, 1.5vw, 10px)',
                    width: '100%',
                    maxWidth: '310px',
                    margin: '4px 0',
                  }}
                >
                  {[
                    { label: 'Days', val: timeLeft.days },
                    { label: 'Hours', val: timeLeft.hours },
                    { label: 'Mins', val: timeLeft.minutes },
                    { label: 'Secs', val: timeLeft.seconds },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(20, 9, 15, 0.8)',
                        border: '1px solid rgba(232, 165, 152, 0.3)',
                        borderRadius: '10px',
                        padding: '6px 4px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 'clamp(1.1rem, 2.8vw, 1.3rem)', fontWeight: 700, color: '#D4AF37' }}>
                        {String(item.val).padStart(2, '0')}
                      </div>
                      <div
                        style={{
                          fontSize: '0.62rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          color: '#E8A598',
                        }}
                      >
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Door Control Action */}
                <button
                  type="button"
                  onClick={handleToggleDoors}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 20px',
                    borderRadius: '9999px',
                    background: 'linear-gradient(135deg, #D4AF37 0%, #B34B62 100%)',
                    border: 'none',
                    color: '#FFF1C5',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(212, 175, 55, 0.35)',
                    transition: 'all 0.2s',
                  }}
                >
                  <Lock size={13} />
                  <span>Re-Close Doors</span>
                </button>
              </div>
            </div>

            {/* ========================================================= */}
            {/* LEFT FRENCH DOOR WING (3D SWING OUTWARD)                  */}
            {/* ========================================================= */}
            <div
              onClick={handleToggleDoors}
              onMouseEnter={() => setHandleHovered(true)}
              onMouseLeave={() => setHandleHovered(false)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '50%',
                height: '100%',
                background: 'linear-gradient(145deg, #24141D 0%, #150B11 60%, #0D0509 100%)',
                borderRight: '1px solid #3E2430',
                borderLeft: '2px solid rgba(212, 175, 55, 0.4)',
                borderTopLeftRadius: '308px',
                borderBottomLeftRadius: '14px',
                transformOrigin: 'left center',
                transform: doorsOpen
                  ? 'rotateY(-84deg) translateZ(-2px)'
                  : 'rotateY(0deg)',
                transition: 'transform 1.1s cubic-bezier(0.22, 1, 0.36, 1)',
                zIndex: 10,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '24px 14px',
                boxShadow: doorsOpen
                  ? 'none'
                  : 'inset 0 0 30px rgba(0,0,0,0.8), 6px 0 16px rgba(0,0,0,0.5)',
              }}
            >
              {/* Upper Arched Glass Mullions */}
              <div
                style={{
                  height: '56%',
                  borderTopLeftRadius: '280px',
                  borderTopRightRadius: '0px',
                  borderBottomLeftRadius: '6px',
                  borderBottomRightRadius: '6px',
                  border: '2px solid rgba(212, 175, 55, 0.35)',
                  background:
                    'linear-gradient(180deg, rgba(255, 235, 200, 0.12) 0%, rgba(20, 8, 14, 0.6) 100%)',
                  boxShadow: 'inset 0 0 16px rgba(255, 215, 140, 0.1)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gridTemplateRows: '1fr 1fr 1fr',
                  gap: '2px',
                  padding: '2px',
                }}
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      border: '1px solid rgba(212, 175, 55, 0.2)',
                      background: 'rgba(255, 240, 220, 0.03)',
                    }}
                  />
                ))}
              </div>

              {/* Lower Carved Boiserie Panel */}
              <div
                style={{
                  height: '38%',
                  borderRadius: '8px',
                  border: '2px solid rgba(212, 175, 55, 0.35)',
                  background: 'linear-gradient(145deg, #1C0F16 0%, #10060C 100%)',
                  boxShadow: 'inset 0 0 14px rgba(0,0,0,0.85)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '4px',
                    border: '1px dashed rgba(212, 175, 55, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#D4AF37',
                    opacity: 0.6,
                  }}
                >
                  <Sparkles size={14} />
                </div>
              </div>

              {/* Left Door Center Vintage Brass Handle (Meeting Center Seam) */}
              <div
                style={{
                  position: 'absolute',
                  top: '52%',
                  right: '-2px',
                  transform: 'translateY(-50%)',
                  zIndex: 25,
                }}
              >
                <VintageBrassHandle isHovered={handleHovered} isOpen={doorsOpen} side="left" />
              </div>
            </div>

            {/* ========================================================= */}
            {/* RIGHT FRENCH DOOR WING (3D SWING OUTWARD)                 */}
            {/* ========================================================= */}
            <div
              onClick={handleToggleDoors}
              onMouseEnter={() => setHandleHovered(true)}
              onMouseLeave={() => setHandleHovered(false)}
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '50%',
                height: '100%',
                background: 'linear-gradient(215deg, #24141D 0%, #150B11 60%, #0D0509 100%)',
                borderLeft: '1px solid #3E2430',
                borderRight: '2px solid rgba(212, 175, 55, 0.4)',
                borderTopRightRadius: '308px',
                borderBottomRightRadius: '14px',
                transformOrigin: 'right center',
                transform: doorsOpen
                  ? 'rotateY(84deg) translateZ(-2px)'
                  : 'rotateY(0deg)',
                transition: 'transform 1.1s cubic-bezier(0.22, 1, 0.36, 1)',
                zIndex: 10,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '24px 14px',
                boxShadow: doorsOpen
                  ? 'none'
                  : 'inset 0 0 30px rgba(0,0,0,0.8), -6px 0 16px rgba(0,0,0,0.5)',
              }}
            >
              {/* Upper Arched Glass Mullions */}
              <div
                style={{
                  height: '56%',
                  borderTopRightRadius: '280px',
                  borderTopLeftRadius: '0px',
                  borderBottomLeftRadius: '6px',
                  borderBottomRightRadius: '6px',
                  border: '2px solid rgba(212, 175, 55, 0.35)',
                  background:
                    'linear-gradient(180deg, rgba(255, 235, 200, 0.12) 0%, rgba(20, 8, 14, 0.6) 100%)',
                  boxShadow: 'inset 0 0 16px rgba(255, 215, 140, 0.1)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gridTemplateRows: '1fr 1fr 1fr',
                  gap: '2px',
                  padding: '2px',
                }}
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      border: '1px solid rgba(212, 175, 55, 0.2)',
                      background: 'rgba(255, 240, 220, 0.03)',
                    }}
                  />
                ))}
              </div>

              {/* Lower Carved Boiserie Panel */}
              <div
                style={{
                  height: '38%',
                  borderRadius: '8px',
                  border: '2px solid rgba(212, 175, 55, 0.35)',
                  background: 'linear-gradient(215deg, #1C0F16 0%, #10060C 100%)',
                  boxShadow: 'inset 0 0 14px rgba(0,0,0,0.85)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '4px',
                    border: '1px dashed rgba(212, 175, 55, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#D4AF37',
                    opacity: 0.6,
                  }}
                >
                  <Sparkles size={14} />
                </div>
              </div>

              {/* Right Door Center Vintage Brass Handle (Meeting Center Seam) */}
              <div
                style={{
                  position: 'absolute',
                  top: '52%',
                  left: '-2px',
                  transform: 'translateY(-50%)',
                  zIndex: 25,
                }}
              >
                <VintageBrassHandle isHovered={handleHovered} isOpen={doorsOpen} side="right" />
              </div>
            </div>

            {/* PUSH TO OPEN CALLOUT PILL (Shown when doors are closed) */}
            {!doorsOpen && (
              <div
                onClick={handleToggleDoors}
                style={{
                  position: 'absolute',
                  bottom: '24px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 35,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 20px',
                    borderRadius: '9999px',
                    background: 'rgba(212, 175, 55, 0.28)',
                    border: '1px solid #D4AF37',
                    color: '#FFF6E9',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 0 24px rgba(212, 175, 55, 0.55)',
                  }}
                >
                  <Unlock size={14} color="#D4AF37" />
                  <span>Push Antique Latch to Open</span>
                </div>
                <span
                  style={{
                    fontSize: '0.68rem',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    color: '#E8A598',
                    opacity: 0.85,
                  }}
                >
                  Step Into The Celebration
                </span>
              </div>
            )}
          </div>

          {/* Symmetrical Base Lanterns Anchor the Portico */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              padding: '14px 8px 0 8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CandleLantern size={26} glowColor="#FFB86C" />
              <span style={{ fontSize: '0.7rem', color: '#D4AF37', letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.7 }}>
                Sanctuaire
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.7rem', color: '#D4AF37', letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.7 }}>
                Éternité
              </span>
              <CandleLantern size={26} glowColor="#FFB86C" />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* PORTAL I: THE SANCTUARY OF VOWS (COUPLE PROFILES)                        */}
      {/* ========================================================================= */}
      <section
        style={{
          position: 'relative',
          padding: '70px 20px',
          maxWidth: '920px',
          margin: '0 auto',
          zIndex: 10,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <span
            style={{
              textTransform: 'uppercase',
              letterSpacing: '3px',
              fontSize: '0.76rem',
              color: '#D4AF37',
              fontWeight: 600,
            }}
          >
            Portal I
          </span>
          <h2
            style={{
              fontSize: 'clamp(1.9rem, 4vw, 2.6rem)',
              color: '#FFF1C5',
              marginTop: '4px',
              marginBottom: '8px',
            }}
          >
            The Sanctuary of Vows
          </h2>
          <p style={{ color: '#E8A598', fontStyle: 'italic', fontSize: '0.95rem', margin: 0 }}>
            Two paths intertwining beneath the shelter of forever
          </p>
          <RomanticFloralDivider />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: 'clamp(20px, 3vw, 32px)',
          }}
        >
          {/* Partner 1 (Groom / Celebrant 1) */}
          <div
            style={{
              borderRadius: '24px',
              background: 'linear-gradient(180deg, rgba(30, 16, 24, 0.75) 0%, rgba(15, 7, 12, 0.9) 100%)',
              border: '1px solid rgba(212, 175, 55, 0.35)',
              padding: 'clamp(24px, 3vw, 36px) 24px',
              textAlign: 'center',
              boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div
              style={{
                width: 'clamp(120px, 20vw, 150px)',
                height: 'clamp(120px, 20vw, 150px)',
                borderRadius: '50%',
                margin: '0 auto 20px auto',
                padding: '5px',
                background: 'linear-gradient(135deg, #D4AF37 0%, #E8A598 100%)',
                boxShadow: '0 0 28px rgba(212, 175, 55, 0.3)',
              }}
            >
              <img
                src={partner1.image}
                alt={partner1.name}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            </div>

            <span
              style={{
                display: 'inline-block',
                padding: '4px 14px',
                borderRadius: '9999px',
                background: 'rgba(212, 175, 55, 0.15)',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                color: '#FFF1C5',
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '10px',
              }}
            >
              {partner1.role}
            </span>

            <h3 style={{ fontSize: 'clamp(1.5rem, 3vw, 1.8rem)', color: '#FFF6E9', margin: '0 0 10px 0' }}>
              {partner1.name}
            </h3>

            <p
              style={{
                fontSize: '0.92rem',
                lineHeight: 1.6,
                color: '#D1C4C0',
                fontStyle: 'italic',
                margin: 0,
              }}
            >
              "{partner1.bio}"
            </p>
          </div>

          {/* Partner 2 (Bride / Celebrant 2) */}
          <div
            style={{
              borderRadius: '24px',
              background: 'linear-gradient(180deg, rgba(30, 16, 24, 0.75) 0%, rgba(15, 7, 12, 0.9) 100%)',
              border: '1px solid rgba(232, 165, 152, 0.35)',
              padding: 'clamp(24px, 3vw, 36px) 24px',
              textAlign: 'center',
              boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div
              style={{
                width: 'clamp(120px, 20vw, 150px)',
                height: 'clamp(120px, 20vw, 150px)',
                borderRadius: '50%',
                margin: '0 auto 20px auto',
                padding: '5px',
                background: 'linear-gradient(135deg, #E8A598 0%, #D4AF37 100%)',
                boxShadow: '0 0 28px rgba(232, 165, 152, 0.3)',
              }}
            >
              <img
                src={partner2.image}
                alt={partner2.name}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            </div>

            <span
              style={{
                display: 'inline-block',
                padding: '4px 14px',
                borderRadius: '9999px',
                background: 'rgba(232, 165, 152, 0.15)',
                border: '1px solid rgba(232, 165, 152, 0.4)',
                color: '#FFF1C5',
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '10px',
              }}
            >
              {partner2.role}
            </span>

            <h3 style={{ fontSize: 'clamp(1.5rem, 3vw, 1.8rem)', color: '#FFF6E9', margin: '0 0 10px 0' }}>
              {partner2.name}
            </h3>

            <p
              style={{
                fontSize: '0.92rem',
                lineHeight: 1.6,
                color: '#D1C4C0',
                fontStyle: 'italic',
                margin: 0,
              }}
            >
              "{partner2.bio}"
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* PORTAL II: THE WHISPERING GARDEN TIMELINE (RESPONSIVE ALIGNMENT)          */}
      {/* ========================================================================= */}
      {isStoryVisible && (
        <section
          style={{
            position: 'relative',
            padding: '70px 20px',
            maxWidth: '820px',
            margin: '0 auto',
            zIndex: 10,
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '44px' }}>
            <span
              style={{
                textTransform: 'uppercase',
                letterSpacing: '3px',
                fontSize: '0.76rem',
                color: '#D4AF37',
                fontWeight: 600,
              }}
            >
              Portal II
            </span>
            <h2
              style={{
                fontSize: 'clamp(1.9rem, 4vw, 2.6rem)',
                color: '#FFF1C5',
                marginTop: '4px',
                marginBottom: '8px',
              }}
            >
              The Whispering Garden
            </h2>
            <p style={{ color: '#E8A598', fontStyle: 'italic', fontSize: '0.95rem', margin: 0 }}>
              Chapters of our journey, etched upon rose arbors and starlit memories
            </p>
            <RomanticFloralDivider />
          </div>

          {/* Responsive Timeline Container */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Vertical Vine Spine */}
            <div
              className="chateau-timeline-spine"
              style={{
                position: 'absolute',
                top: '10px',
                bottom: '10px',
                left: '20px',
                width: '2px',
                background: 'linear-gradient(180deg, transparent 0%, #D4AF37 15%, #E8A598 85%, transparent 100%)',
                opacity: 0.35,
              }}
            />

            {storyMilestones.map((item, idx) => (
              <div
                key={idx}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '20px',
                  paddingLeft: '48px',
                }}
              >
                {/* Timeline Rose Blossom Node */}
                <div
                  style={{
                    position: 'absolute',
                    left: '6px',
                    top: '18px',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: '#1A0D15',
                    border: '2px solid #D4AF37',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 14px rgba(212, 175, 55, 0.55)',
                    zIndex: 2,
                    color: '#E8A598',
                  }}
                >
                  <Heart size={13} fill="#E8A598" />
                </div>

                {/* Milestone Card */}
                <div
                  style={{
                    flex: 1,
                    background: 'rgba(25, 12, 19, 0.85)',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: '18px',
                    padding: '22px',
                    boxShadow: '0 10px 28px rgba(0,0,0,0.55)',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#D4AF37',
                      letterSpacing: '2px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.year}
                  </span>
                  <h4 style={{ fontSize: '1.3rem', color: '#FFF6E9', margin: '4px 0 8px 0' }}>
                    {item.title}
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: '#D5C3BE', lineHeight: 1.6, margin: '0 0 14px 0' }}>
                    {item.description}
                  </p>

                  {item.image && (
                    <div
                      style={{
                        borderRadius: '12px',
                        overflow: 'hidden',
                        height: '180px',
                        border: '1px solid rgba(232, 165, 152, 0.25)',
                      }}
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* PORTAL III: THE GRAND BALLROOM ITINERARY (EVENTS)                         */}
      {/* ========================================================================= */}
      <section
        style={{
          position: 'relative',
          padding: '70px 20px',
          maxWidth: '960px',
          margin: '0 auto',
          zIndex: 10,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '44px' }}>
          <span
            style={{
              textTransform: 'uppercase',
              letterSpacing: '3px',
              fontSize: '0.76rem',
              color: '#D4AF37',
              fontWeight: 600,
            }}
          >
            Portal III
          </span>
          <h2
            style={{
              fontSize: 'clamp(1.9rem, 4vw, 2.6rem)',
              color: '#FFF1C5',
              marginTop: '4px',
              marginBottom: '8px',
            }}
          >
            The Grand Ballroom Itinerary
          </h2>
          <p style={{ color: '#E8A598', fontStyle: 'italic', fontSize: '0.95rem', margin: 0 }}>
            We request the honour of your presence at each ceremonial celebration
          </p>
          <RomanticFloralDivider />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 270px), 1fr))',
            gap: 'clamp(18px, 2.5vw, 24px)',
          }}
        >
          {eventList.map((ev, i) => (
            <div
              key={ev.id || i}
              style={{
                borderRadius: '20px',
                background: 'linear-gradient(180deg, rgba(28, 14, 22, 0.85) 0%, rgba(14, 6, 11, 0.95) 100%)',
                border: '1px solid rgba(212, 175, 55, 0.35)',
                padding: '26px 22px',
                boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#D4AF37',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}
                  >
                    Act {i + 1}
                  </span>
                  {ev.dressCode && (
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        background: 'rgba(232, 165, 152, 0.15)',
                        border: '1px solid rgba(232, 165, 152, 0.35)',
                        fontSize: '0.68rem',
                        color: '#FFF1C5',
                      }}
                    >
                      {ev.dressCode}
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: 'clamp(1.25rem, 2.5vw, 1.45rem)', color: '#FFF6E9', margin: '0 0 14px 0' }}>
                  {ev.name}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#D5C3BE' }}>
                    <Calendar size={13} color="#D4AF37" />
                    <span>{ev.date}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#D5C3BE' }}>
                    <Clock size={13} color="#E8A598" />
                    <span>{ev.time}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#D5C3BE' }}>
                    <MapPin size={13} color="#D4AF37" />
                    <span>{ev.venue}</span>
                  </div>
                </div>

                {ev.description && (
                  <p style={{ fontSize: '0.85rem', color: '#BAA7A1', lineHeight: 1.5, margin: 0 }}>
                    {ev.description}
                  </p>
                )}
              </div>

              <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(ev.venue + ', ' + venueCity)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    color: '#D4AF37',
                    fontSize: '0.8rem',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  <span>View Map Directions</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* PORTAL IV: THE ROSE GATE RSVP                                             */}
      {/* ========================================================================= */}
      <section
        style={{
          position: 'relative',
          padding: '70px 20px',
          maxWidth: '640px',
          margin: '0 auto',
          zIndex: 10,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span
            style={{
              textTransform: 'uppercase',
              letterSpacing: '3px',
              fontSize: '0.76rem',
              color: '#D4AF37',
              fontWeight: 600,
            }}
          >
            Portal IV
          </span>
          <h2
            style={{
              fontSize: 'clamp(1.9rem, 4vw, 2.6rem)',
              color: '#FFF1C5',
              marginTop: '4px',
              marginBottom: '8px',
            }}
          >
            The Rose Gate RSVP
          </h2>
          <p style={{ color: '#E8A598', fontStyle: 'italic', fontSize: '0.95rem', margin: 0 }}>
            Kindly grace our celebration with your response by November 20, 2026
          </p>
          <RomanticFloralDivider />
        </div>

        <div
          style={{
            background: 'linear-gradient(180deg, rgba(28, 14, 22, 0.92) 0%, rgba(14, 6, 11, 0.98) 100%)',
            border: '2px solid rgba(212, 175, 55, 0.45)',
            borderRadius: '24px',
            padding: 'clamp(24px, 4vw, 36px) clamp(18px, 3.5vw, 32px)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            backdropFilter: 'blur(25px)',
          }}
        >
          {rsvpSubmitted ? (
            <div style={{ textAlign: 'center', padding: '36px 16px' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'rgba(212, 175, 55, 0.15)',
                  border: '2px solid #D4AF37',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  color: '#D4AF37',
                }}
              >
                <CheckCircle size={30} />
              </div>
              <h3 style={{ fontSize: '1.7rem', color: '#FFF1C5', marginBottom: '8px' }}>
                Response Joyfully Recorded
              </h3>
              <p style={{ color: '#D5C3BE', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
                Thank you, <strong>{rsvpName}</strong>. Your reservation has been honored and recorded
                for the celebration in {venueCity}.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRsvpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#E8A598', marginBottom: '6px' }}>
                  Full Guest Name(s) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Julian & Clara de Montmirail"
                  value={rsvpName}
                  onChange={(e) => setRsvpName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'rgba(0,0,0,0.45)',
                    border: '1px solid rgba(212, 175, 55, 0.35)',
                    color: '#fff',
                    fontSize: '0.95rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#E8A598', marginBottom: '8px' }}>
                  Will You Attend? *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setRsvpAttending('yes')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px',
                      borderRadius: '10px',
                      border: rsvpAttending === 'yes' ? '2px solid #D4AF37' : '1px solid rgba(255,255,255,0.15)',
                      background: rsvpAttending === 'yes' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(0,0,0,0.3)',
                      color: rsvpAttending === 'yes' ? '#FFF1C5' : '#D1C4C0',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Heart size={14} fill={rsvpAttending === 'yes' ? '#D4AF37' : 'transparent'} />
                    <span>Joyfully Accept</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRsvpAttending('no')}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: rsvpAttending === 'no' ? '2px solid #E8A598' : '1px solid rgba(255,255,255,0.15)',
                      background: rsvpAttending === 'no' ? 'rgba(232, 165, 152, 0.2)' : 'rgba(0,0,0,0.3)',
                      color: rsvpAttending === 'no' ? '#FFF1C5' : '#D1C4C0',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Regretfully Decline
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#E8A598', marginBottom: '6px' }}>
                    Party Size
                  </label>
                  <select
                    value={rsvpGuests}
                    onChange={(e) => setRsvpGuests(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: 'rgba(0,0,0,0.45)',
                      border: '1px solid rgba(212, 175, 55, 0.35)',
                      color: '#fff',
                      fontSize: '0.95rem',
                    }}
                  >
                    <option value="1">1 Guest</option>
                    <option value="2">2 Guests</option>
                    <option value="3">3 Guests</option>
                    <option value="4">4 Guests</option>
                    <option value="5+">5+ Guests</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#E8A598', marginBottom: '6px' }}>
                    Dietary Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Vegetarian / Vegan"
                    value={rsvpDietary}
                    onChange={(e) => setRsvpDietary(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: 'rgba(0,0,0,0.45)',
                      border: '1px solid rgba(212, 175, 55, 0.35)',
                      color: '#fff',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#E8A598', marginBottom: '6px' }}>
                  A Note for {partner1First} & {partner2First}
                </label>
                <textarea
                  rows={3}
                  placeholder="Share a heartfelt blessing or travel note..."
                  value={rsvpMessage}
                  onChange={(e) => setRsvpMessage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'rgba(0,0,0,0.45)',
                    border: '1px solid rgba(212, 175, 55, 0.35)',
                    color: '#fff',
                    fontSize: '0.95rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #D4AF37 0%, #B34B62 100%)',
                  border: 'none',
                  color: '#FFF1C5',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  boxShadow: '0 6px 24px rgba(212, 175, 55, 0.4)',
                  transition: 'all 0.2s',
                  marginTop: '6px',
                }}
              >
                Seal & Dispatch RSVP
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* PORTAL V: THE BOOK OF BLESSINGS (GUESTBOOK)                               */}
      {/* ========================================================================= */}
      <section
        style={{
          position: 'relative',
          padding: '70px 20px 130px 20px',
          maxWidth: '820px',
          margin: '0 auto',
          zIndex: 10,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <span
            style={{
              textTransform: 'uppercase',
              letterSpacing: '3px',
              fontSize: '0.76rem',
              color: '#D4AF37',
              fontWeight: 600,
            }}
          >
            Portal V
          </span>
          <h2
            style={{
              fontSize: 'clamp(1.9rem, 4vw, 2.6rem)',
              color: '#FFF1C5',
              marginTop: '4px',
              marginBottom: '8px',
            }}
          >
            The Book of Blessings
          </h2>
          <p style={{ color: '#E8A598', fontStyle: 'italic', fontSize: '0.95rem', margin: 0 }}>
            Inscribe your love, wishes, and eternal prayers upon our sacred register
          </p>
          <RomanticFloralDivider />
        </div>

        {/* Inscription Form */}
        <form
          onSubmit={handleAddWish}
          style={{
            background: 'rgba(25, 12, 19, 0.85)',
            border: '1px solid rgba(212, 175, 55, 0.35)',
            borderRadius: '20px',
            padding: '22px',
            marginBottom: '32px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
              gap: '12px',
            }}
          >
            <input
              type="text"
              required
              placeholder="Your Name"
              value={newWishName}
              onChange={(e) => setNewWishName(e.target.value)}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                color: '#fff',
                fontSize: '0.9rem',
              }}
            />
            <input
              type="text"
              required
              placeholder="Inscribe your blessing or advice..."
              value={newWishText}
              onChange={(e) => setNewWishText(e.target.value)}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                color: '#fff',
                fontSize: '0.9rem',
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 22px',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, #D4AF37 0%, #B34B62 100%)',
              border: 'none',
              color: '#FFF1C5',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(212, 175, 55, 0.35)',
              alignSelf: 'flex-end',
            }}
          >
            <Send size={13} />
            <span>Add to Book of Blessings</span>
          </button>
        </form>

        {/* Wishes Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {wishes.map((w) => (
            <div
              key={w.id}
              style={{
                background: 'rgba(25, 12, 19, 0.7)',
                border: '1px solid rgba(232, 165, 152, 0.25)',
                borderRadius: '16px',
                padding: '18px 22px',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <strong style={{ color: '#FFF1C5', fontSize: '1rem' }}>{w.name}</strong>
                  <span style={{ fontSize: '0.75rem', color: '#D4AF37', opacity: 0.8 }}>• {w.time}</span>
                </div>
                <p style={{ margin: 0, color: '#D5C3BE', fontSize: '0.92rem', lineHeight: 1.5, fontStyle: 'italic' }}>
                  "{w.message}"
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setWishes(
                    wishes.map((item) =>
                      item.id === w.id ? { ...item, hearts: item.hearts + 1 } : item
                    )
                  );
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  background: 'rgba(232, 165, 152, 0.15)',
                  border: '1px solid rgba(232, 165, 152, 0.3)',
                  color: '#FFB7C5',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <Heart size={13} fill="#FFB7C5" />
                <span>{w.hearts}</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer Proclamation */}
      <footer
        style={{
          textAlign: 'center',
          padding: '36px 20px',
          borderTop: '1px solid rgba(212, 175, 55, 0.2)',
          color: '#E8A598',
          fontSize: '0.82rem',
          letterSpacing: '1px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <p style={{ margin: 0 }}>
          Crafted with eternal devotion for <strong>{coupleNames}</strong>
        </p>
        <p style={{ margin: '6px 0 0 0', fontSize: '0.7rem', opacity: 0.6 }}>
          Powered by OrbitoX Celebrations Engine
        </p>
      </footer>
    </div>
  );
}
