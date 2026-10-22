'use client';

import React, { useState } from 'react';
import { Experience, Theme } from '@orbitox-io/celebrations';
import {
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  Flame,
  Music,
  Heart,
  CheckCircle2,
  ArrowRight,
  Vote,
  Ticket,
} from 'lucide-react';
import { KineticNeonCanvas } from './KineticNeonCanvas';
import { WishesGuestbookSection } from '../../sections/WishesGuestbookSection';
import { CoupleTitle } from '../../CoupleTitle';

interface Props {
  experience: Experience;
  theme: Theme;
}

export function PartyNocturneExperience({ experience, theme }: Props) {
  // RSVP Form State
  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');
  const [attendingStatus, setAttendingStatus] = useState<'ATTENDING' | 'DECLINED'>('ATTENDING');
  const [partySize, setPartySize] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rsvpSubmitted, setRsvpSubmitted] = useState(false);

  // Live Party Poll State
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [pollVotes, setPollVotes] = useState<Record<string, number>>({
    punjabi: 48,
    bollywood: 65,
    edm: 39,
    disco: 22,
  });

  // Dynamic Data Extraction from Experience Payload
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
  const coupleConfig = coupleSection?.config || {};
  const p1Name = (coupleConfig.partner1Name as string) || partner1;
  const p1Role = (coupleConfig.partner1Role as string) || 'The Bride';
  const p1Bio = (coupleConfig.partner1Bio as string) || 'Music enthusiast and midnight dancer.';
  const p1Image = (coupleConfig.partner1Image as string) || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=85';

  const p2Name = (coupleConfig.partner2Name as string) || partner2;
  const p2Role = (coupleConfig.partner2Role as string) || 'The Groom';
  const p2Bio = (coupleConfig.partner2Bio as string) || 'DJ aficionado and celebratory cocktail creator.';
  const p2Image = (coupleConfig.partner2Image as string) || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=85';

  // Venue & Maps Data
  const venueSection = experience.sections?.find((s) => s.sectionType === 'venue_map');
  const venueConfig = venueSection?.config || {};
  const venueNameStr = (venueConfig.venueName as string) || (heroConfig.venueName as string) || 'Neon Skyline Lounge';
  const venueAddressStr = (venueConfig.address as string) || '';
  const venueFullAddress = venueAddressStr
    ? venueAddressStr.toLowerCase().includes(venueNameStr.toLowerCase())
      ? venueAddressStr
      : `${venueNameStr}, ${venueAddressStr}`
    : `${venueNameStr}, ${venueLocation}`;

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
      name: 'Sunset Cocktails & Neon Warmup',
      date: eventDateStr,
      time: '18:00 PM',
      venue: venueNameStr,
      dressCode: 'Neon Chic & Glamour',
      description: 'Signature mixology, bass grooves, and illuminated photo installations.',
    },
    {
      id: 'ev_2',
      name: 'The Sangeet & Dance Battle',
      date: eventDateStr,
      time: '20:30 PM',
      venue: venueNameStr,
      dressCode: 'Electric Indo-Western',
      description: 'Family dance performances, LED dhol, and high-energy celebration.',
    },
    {
      id: 'ev_3',
      name: 'Midnight Rave & Afterparty',
      date: eventDateStr,
      time: '23:00 PM TILL LATE',
      venue: venueNameStr,
      dressCode: 'Club Glamour',
      description: 'Headline DJ set, confetti cannons, and midnight street food banquet.',
    },
  ];

  // RSVP Form Configuration
  const rsvpSection = experience.sections?.find((s) => s.sectionType === 'rsvp');
  const rsvpConfig = rsvpSection?.config || {};
  const allowPlusOneGuest = (rsvpConfig.askPlusOne as boolean) ?? true;

  const wishesSection = experience.sections?.find((s) => s.sectionType === 'wishes_guestbook') || {
    id: 'sec_wishes_guestbook',
    sectionType: 'wishes_guestbook' as const,
    title: 'Neon Guestbook & Cheers',
    order: 9,
    isEnabled: true,
    config: {
      title: 'Neon Guestbook & Cheers',
      subtitle: `Leave your loud cheers and hype words for ${p1Name} & ${p2Name}`,
      hostNames: coupleNames,
      venueCity: venueLocation,
    },
  };

  const handleVote = (trackKey: string) => {
    if (selectedTrack === trackKey) return;
    setSelectedTrack(trackKey);
    setPollVotes((prev) => ({
      ...prev,
      [trackKey]: (prev[trackKey] || 0) + 1,
    }));
  };

  const totalVotes = Object.values(pollVotes).reduce((a, b) => a + b, 0);

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
        }),
      });
      setRsvpSubmitted(true);
    } catch (err) {
      console.warn('RSVP note:', err);
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

  return (
    <div
      style={{
        backgroundColor: '#08080C',
        color: '#F4F4F5',
        minHeight: '100vh',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {/* Kinetic Neon Laser Canvas */}
      <KineticNeonCanvas />

      {/* ─── HERO SECTION: ELECTRIC HOLOGRAPHIC COVER ─── */}
      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '80px 20px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: '840px', margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 20px',
              borderRadius: '9999px',
              background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.2), rgba(6, 182, 212, 0.2))',
              border: '1px solid rgba(139, 92, 246, 0.5)',
              boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)',
              marginBottom: '24px',
            }}
          >
            <Sparkles size={16} color="#06B6D4" />
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                background: 'linear-gradient(90deg, #06B6D4, #8B5CF6, #EC4899)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              The Celebration & Music Night
            </span>
          </div>

          {/* Glowing Headline */}
          <CoupleTitle
            as="h1"
            title={coupleNames}
            flourishColor="#8B5CF6"
            style={{
              fontSize: 'clamp(2.6rem, 8vw, 5.2rem)',
              fontWeight: 900,
              lineHeight: 1.08,
              letterSpacing: '-1px',
              margin: '0 0 20px 0',
              textTransform: 'uppercase',
              color: '#FFFFFF',
              textShadow: '0 0 35px rgba(139, 92, 246, 0.6), 0 0 70px rgba(6, 182, 212, 0.3)',
            }}
          />

          <p
            style={{
              fontSize: 'clamp(1.05rem, 2.8vw, 1.35rem)',
              color: 'rgba(244, 244, 245, 0.8)',
              maxWidth: '580px',
              margin: '0 auto 36px auto',
              lineHeight: 1.6,
            }}
          >
            Join us under the electric sky for an unforgettable night of celebrations, heavy bass, cocktails, and dancing.
          </p>

          {/* Date & Location Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '16px',
              padding: '12px 24px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(18, 18, 28, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(16px)',
              marginBottom: '36px',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#06B6D4' }}>
              <Calendar size={16} />
              <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{eventDateStr}</span>
            </div>
            <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8B5CF6' }}>
              <MapPin size={16} />
              <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{venueLocation}</span>
            </div>
          </div>

          <br />

          {/* Glowing CTA Button */}
          <button
            onClick={() => scrollTo('nocturne-rsvp')}
            style={{
              padding: '16px 44px',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '0.95rem',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 0 30px rgba(139, 92, 246, 0.5), 0 0 60px rgba(236, 72, 153, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <Ticket size={18} />
            <span>Claim Your VIP Pass</span>
          </button>
        </div>
      </section>

      {/* ─── SECTION 2: DUO HIGHLIGHTS (COUPLE PROFILES) ─── */}
      <section
        style={{
          padding: '80px 20px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: '880px', margin: '0 auto', textAlign: 'center' }}>
          <span
            style={{
              fontSize: '0.8rem',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              color: '#06B6D4',
              fontWeight: 700,
            }}
          >
            Headlining Stars
          </span>
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 2.8rem)', fontWeight: 800, margin: '8px 0 36px 0', color: '#FFFFFF' }}>
            The Hosts of the Night
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '28px',
            }}
          >
            {/* Host 1 */}
            <div
              style={{
                padding: '28px',
                borderRadius: '24px',
                backgroundColor: 'rgba(18, 18, 28, 0.75)',
                border: '1px solid rgba(139, 92, 246, 0.35)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 0 30px rgba(139, 92, 246, 0.15)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '140px',
                  height: '140px',
                  borderRadius: '50%',
                  margin: '0 auto 18px auto',
                  padding: '4px',
                  background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
                  boxShadow: '0 0 24px rgba(6, 182, 212, 0.4)',
                }}
              >
                <img
                  src={p1Image}
                  alt={p1Name}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 4px 0', color: '#FFFFFF' }}>
                {p1Name}
              </h3>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#06B6D4', letterSpacing: '1px', textTransform: 'uppercase' }}>
                {p1Role}
              </span>
              <p style={{ fontSize: '0.9rem', color: 'rgba(244, 244, 245, 0.75)', marginTop: '10px', lineHeight: 1.5 }}>
                {p1Bio}
              </p>
            </div>

            {/* Host 2 */}
            <div
              style={{
                padding: '28px',
                borderRadius: '24px',
                backgroundColor: 'rgba(18, 18, 28, 0.75)',
                border: '1px solid rgba(236, 72, 153, 0.35)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 0 30px rgba(236, 72, 153, 0.15)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '140px',
                  height: '140px',
                  borderRadius: '50%',
                  margin: '0 auto 18px auto',
                  padding: '4px',
                  background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                  boxShadow: '0 0 24px rgba(236, 72, 153, 0.4)',
                }}
              >
                <img
                  src={p2Image}
                  alt={p2Name}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 4px 0', color: '#FFFFFF' }}>
                {p2Name}
              </h3>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#EC4899', letterSpacing: '1px', textTransform: 'uppercase' }}>
                {p2Role}
              </span>
              <p style={{ fontSize: '0.9rem', color: 'rgba(244, 244, 245, 0.75)', marginTop: '10px', lineHeight: 1.5 }}>
                {p2Bio}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 3: LIVE PARTY POLL & DJ REQUEST ─── */}
      <section
        style={{
          padding: '80px 20px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: '680px',
            margin: '0 auto',
            padding: '36px clamp(20px, 4vw, 36px)',
            borderRadius: '24px',
            backgroundColor: 'rgba(18, 18, 28, 0.85)',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            boxShadow: '0 0 40px rgba(139, 92, 246, 0.2)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: '#8B5CF6',
                marginBottom: '8px',
              }}
            >
              <Music size={20} />
              <span style={{ fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700 }}>
                Interactive DJ Booth
              </span>
            </div>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
              What Should The DJ Drop At Midnight?
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#A1A1AA', marginTop: '6px' }}>
              Cast your live vote to influence the party soundtrack!
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { key: 'bollywood', label: '🔥 Bollywood 2000s Nostalgia Anthems', color: '#EC4899' },
              { key: 'punjabi', label: '⚡ Punjabi Bass Beats & Dhol Heat', color: '#8B5CF6' },
              { key: 'edm', label: '🚀 Heavy EDM Festival Drops', color: '#06B6D4' },
              { key: 'disco', label: '✨ Retro Disco Funk Classics', color: '#F59E0B' },
            ].map((track) => {
              const votes = pollVotes[track.key] || 0;
              const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 25;
              const isSelected = selectedTrack === track.key;

              return (
                <div
                  key={track.key}
                  onClick={() => handleVote(track.key)}
                  style={{
                    position: 'relative',
                    padding: '16px 20px',
                    borderRadius: '14px',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: isSelected ? `2px solid ${track.color}` : '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    transition: 'all 0.2s',
                  }}
                >
                  {/* Progress Bar Background */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      width: `${pct}%`,
                      backgroundColor: `${track.color}22`,
                      transition: 'width 0.4s ease',
                      zIndex: 0,
                    }}
                  />

                  <div
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: '0.95rem', color: isSelected ? track.color : '#FFFFFF' }}>
                      {track.label}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: track.color }}>
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── SECTION 4: LINEUP & SCHEDULE ─── */}
      <section
        style={{
          padding: '80px 20px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <span style={{ fontSize: '0.8rem', letterSpacing: '3px', textTransform: 'uppercase', color: '#EC4899', fontWeight: 700 }}>
              Night Lineup
            </span>
            <h2 style={{ fontSize: 'clamp(2rem, 5vw, 2.8rem)', fontWeight: 800, margin: '8px 0 0 0', color: '#FFFFFF' }}>
              Celebration Timetable
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {eventsList.map((ev, i) => (
              <div
                key={ev.id || i}
                style={{
                  padding: '24px 28px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(18, 18, 28, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#06B6D4', fontWeight: 700, letterSpacing: '1px' }}>
                    {ev.time}
                  </span>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '4px 0 6px 0', color: '#FFFFFF' }}>
                    {ev.name}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#A1A1AA' }}>
                    {ev.description}
                  </p>
                </div>
                {ev.dressCode && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      backgroundColor: 'rgba(236, 72, 153, 0.15)',
                      color: '#EC4899',
                      border: '1px solid rgba(236, 72, 153, 0.3)',
                    }}
                  >
                    {ev.dressCode}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECTION 5: VIP ACCESS PASS RSVP ─── */}
      <section
        id="nocturne-rsvp"
        style={{
          padding: '80px 20px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '40px clamp(20px, 5vw, 36px)',
            borderRadius: '28px',
            backgroundColor: 'rgba(18, 18, 28, 0.9)',
            border: '1.5px solid rgba(139, 92, 246, 0.5)',
            boxShadow: '0 0 50px rgba(139, 92, 246, 0.25)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <span style={{ fontSize: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase', color: '#06B6D4', fontWeight: 700 }}>
              Guest Access Registration
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4.5vw, 2.4rem)', fontWeight: 800, margin: '6px 0 0 0', color: '#FFFFFF' }}>
              Confirm Your Attendance
            </h2>
          </div>

          {rsvpSubmitted ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <CheckCircle2 size={48} color="#06B6D4" style={{ margin: '0 auto 16px auto' }} />
              <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
                VIP Pass Confirmed!
              </h3>
              <p style={{ color: '#A1A1AA', fontSize: '0.95rem', marginBottom: '20px' }}>
                Awesome, {guestName}! Your spot has been reserved on the guestlist.
              </p>
              <button
                onClick={() => setRsvpSubmitted(false)}
                style={{
                  padding: '10px 24px',
                  borderRadius: '9999px',
                  backgroundColor: 'transparent',
                  border: '1px solid #8B5CF6',
                  color: '#8B5CF6',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Edit Entry Pass
              </button>
            </div>
          ) : (
            <form onSubmit={handleRsvpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#A1A1AA', marginBottom: '6px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Natasha Mehra"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    fontSize: '1rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#A1A1AA', marginBottom: '6px' }}>
                  Mobile / WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+91 98765 43210"
                  value={guestContact}
                  onChange={(e) => setGuestContact(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    fontSize: '1rem',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: allowPlusOneGuest ? '1fr 1fr' : '1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#A1A1AA', marginBottom: '6px' }}>
                    Status
                  </label>
                  <select
                    value={attendingStatus}
                    onChange={(e: any) => setAttendingStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      backgroundColor: '#12121C',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff',
                      fontSize: '0.95rem',
                    }}
                  >
                    <option value="ATTENDING">Ready to Party!</option>
                    <option value="DECLINED">Can't Make It</option>
                  </select>
                </div>

                {allowPlusOneGuest && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#A1A1AA', marginBottom: '6px' }}>
                      Party Count
                    </label>
                    <select
                      value={partySize}
                      onChange={(e) => setPartySize(parseInt(e.target.value, 10))}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        backgroundColor: '#12121C',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#fff',
                        fontSize: '0.95rem',
                      }}
                    >
                      <option value={1}>Solo (1 Person)</option>
                      <option value={2}>Duo (2 Persons)</option>
                      <option value={3}>Squad of 3</option>
                      <option value={4}>Squad of 4</option>
                    </select>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  marginTop: '10px',
                  padding: '16px',
                  borderRadius: '9999px',
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  border: 'none',
                  cursor: isSubmitting ? 'wait' : 'pointer',
                  boxShadow: '0 0 25px rgba(139, 92, 246, 0.5)',
                }}
              >
                {isSubmitting ? 'Generating VIP Pass...' : 'Confirm Entry Pass →'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ─── SECTION 6: GUESTBOOK STREAM ─── */}
      <section
        style={{
          padding: '80px 20px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <WishesGuestbookSection
            section={wishesSection}
            theme={theme}
            experienceId={experience.id}
            tenantId={experience.tenantId}
          />
        </div>
      </section>

      {/* ─── ELECTRIC FOOTER ─── */}
      <footer
        style={{
          padding: '40px 20px',
          textAlign: 'center',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#71717A',
          fontSize: '0.85rem',
        }}
      >
        <div>Celebration for {coupleNames}</div>
        <div style={{ marginTop: '4px' }}>{eventDateStr} • {venueLocation}</div>
      </footer>
    </div>
  );
}
