'use client';

import React, { useState } from 'react';
import { Experience, Theme } from '@orbitox-io/celebrations';
import {
  Calendar,
  Clock,
  MapPin,
  Mail,
  User,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { WishesGuestbookSection } from '../../sections/WishesGuestbookSection';
import { CoupleTitle } from '../../CoupleTitle';

interface Props {
  experience: Experience;
  theme: Theme;
}

export function MinimalEditorialExperience({ experience, theme }: Props) {
  // RSVP Form State
  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');
  const [attendingStatus, setAttendingStatus] = useState<'ATTENDING' | 'DECLINED'>('ATTENDING');
  const [partySize, setPartySize] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rsvpSubmitted, setRsvpSubmitted] = useState(false);

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
  const p1Bio = (coupleConfig.partner1Bio as string) || 'Creative visionary with a love for quiet mornings and classic architecture.';
  const p1Image = (coupleConfig.partner1Image as string) || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=85';

  const p2Name = (coupleConfig.partner2Name as string) || partner2;
  const p2Role = (coupleConfig.partner2Role as string) || 'The Groom';
  const p2Bio = (coupleConfig.partner2Bio as string) || 'Botanist and photographer captivated by alpine heights and timeless stories.';
  const p2Image = (coupleConfig.partner2Image as string) || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=85';

  // Venue & Maps Data
  const venueSection = experience.sections?.find((s) => s.sectionType === 'venue_map');
  const venueConfig = venueSection?.config || {};
  const venueNameStr = (venueConfig.venueName as string) || (heroConfig.venueName as string) || 'The Glasshouse Pavilion';
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
      name: 'Welcome Apertifs & Canapés',
      date: eventDateStr,
      time: '15:30 HRS',
      venue: venueNameStr,
      dressCode: 'Monochrome Editorial & Cocktail Chic',
      description: 'Chilled champagne, acoustic vinyl, and afternoon greetings in the courtyard.',
    },
    {
      id: 'ev_2',
      name: 'The Exchange of Vows',
      date: eventDateStr,
      time: '17:00 HRS',
      venue: venueNameStr,
      dressCode: 'Black Tie Optional / Elevated Minimal',
      description: 'Sunset ceremony amidst minimalist floral architecture.',
    },
    {
      id: 'ev_3',
      name: 'Curated Banquet & Dance',
      date: eventDateStr,
      time: '19:30 HRS',
      venue: venueNameStr,
      dressCode: 'Formal Eveningwear',
      description: 'Multi-course culinary journey followed by midnight dancing.',
    },
  ];

  // RSVP Form Configuration
  const rsvpSection = experience.sections?.find((s) => s.sectionType === 'rsvp');
  const rsvpConfig = rsvpSection?.config || {};
  const allowPlusOneGuest = (rsvpConfig.askPlusOne as boolean) ?? true;

  const wishesSection = experience.sections?.find((s) => s.sectionType === 'wishes_guestbook') || {
    id: 'sec_wishes_guestbook',
    sectionType: 'wishes_guestbook' as const,
    title: 'Words of Grace & Letters',
    order: 9,
    isEnabled: true,
    config: {
      title: 'Words of Grace & Letters',
      subtitle: `An intimate chronicle of well-wishes for ${p1Name} & ${p2Name}`,
      hostNames: coupleNames,
      venueCity: venueLocation,
    },
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
        backgroundColor: '#FBF9F5',
        color: '#121212',
        minHeight: '100vh',
        fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif",
        position: 'relative',
        lineHeight: 1.6,
      }}
    >
      {/* ─── MASTHEAD HEADER ─── */}
      <header
        style={{
          borderBottom: '1px solid rgba(18, 18, 18, 0.12)',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: '0.75rem',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: '#52525B',
        }}
      >
        <span>Vol. XXVII • Editorial Edition</span>
        <span style={{ fontWeight: 700, color: '#121212' }}>OrbitoX Celebrations</span>
        <span>{eventDateStr}</span>
      </header>

      {/* ─── HERO SPREAD: MONUMENTAL COVER ─── */}
      <section
        style={{
          padding: 'clamp(40px, 8vh, 90px) 24px clamp(50px, 10vh, 100px) 24px',
          maxWidth: '1080px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '0.8rem',
            letterSpacing: '4px',
            textTransform: 'uppercase',
            color: '#71717A',
            display: 'inline-block',
            marginBottom: '16px',
          }}
        >
          Special Commemorative Issue
        </span>

        {/* Monumental Headline */}
        <CoupleTitle
          as="h1"
          title={coupleNames}
          flourishColor="#121212"
          style={{
            fontSize: 'clamp(2.8rem, 9vw, 6.2rem)',
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: '-1px',
            color: '#121212',
            margin: '0 0 24px 0',
          }}
        />

        <p
          style={{
            fontSize: 'clamp(1.1rem, 2.8vw, 1.45rem)',
            color: '#52525B',
            maxWidth: '620px',
            margin: '0 auto 40px auto',
            fontStyle: 'italic',
          }}
        >
          Together with their families, invite you to share in the celebration of their marriage.
        </p>

        {/* Editorial Photo Frame */}
        <div
          style={{
            maxWidth: '820px',
            margin: '0 auto 40px auto',
            borderRadius: '4px',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(18, 18, 18, 0.08)',
            backgroundColor: '#FAF8F5',
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1400&q=85"
            alt={coupleNames}
            style={{
              width: '100%',
              height: 'clamp(280px, 50vh, 480px)',
              objectFit: 'cover',
              filter: 'grayscale(25%) contrast(105%)',
            }}
          />
          <div
            style={{
              padding: '14px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '0.78rem',
              color: '#71717A',
              borderTop: '1px solid rgba(18, 18, 18, 0.06)',
            }}
          >
            <span>FIG. 01 — THE COMMENCEMENT</span>
            <span>{venueLocation}</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => scrollTo('editorial-rsvp')}
          style={{
            padding: '14px 38px',
            backgroundColor: '#121212',
            color: '#FBF9F5',
            border: 'none',
            fontSize: '0.85rem',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            letterSpacing: '2px',
            textTransform: 'uppercase',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          RSVP For The Celebration →
        </button>
      </section>

      {/* ─── CHAPTER I: THE UNION & PORTRAITS (ASYMMETRIC SPREAD) ─── */}
      <section
        style={{
          borderTop: '1px solid rgba(18, 18, 18, 0.1)',
          borderBottom: '1px solid rgba(18, 18, 18, 0.1)',
          padding: 'clamp(60px, 9vh, 110px) 24px',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ marginBottom: '40px' }}>
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '0.75rem',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: '#A1A1AA',
              }}
            >
              Chapter I
            </span>
            <h2
              style={{
                fontSize: 'clamp(2rem, 5vw, 3rem)',
                fontWeight: 400,
                color: '#121212',
                marginTop: '4px',
              }}
            >
              The Union & Protagonists
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
              gap: 'clamp(32px, 6vw, 64px)',
            }}
          >
            {/* Partner 1 Editorial Card */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  height: 'clamp(300px, 45vw, 440px)',
                  marginBottom: '20px',
                  overflow: 'hidden',
                  borderRadius: '2px',
                  backgroundColor: '#F4F1EA',
                }}
              >
                <img
                  src={p1Image}
                  alt={p1Name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: '0.75rem',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  color: '#71717A',
                  marginBottom: '4px',
                }}
              >
                {p1Role}
              </span>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 400, margin: '0 0 12px 0' }}>
                {p1Name}
              </h3>
              <p style={{ color: '#52525B', fontSize: '1rem', lineHeight: 1.7, fontStyle: 'italic', margin: 0 }}>
                "{p1Bio}"
              </p>
            </div>

            {/* Partner 2 Editorial Card */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  height: 'clamp(300px, 45vw, 440px)',
                  marginBottom: '20px',
                  overflow: 'hidden',
                  borderRadius: '2px',
                  backgroundColor: '#F4F1EA',
                }}
              >
                <img
                  src={p2Image}
                  alt={p2Name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: '0.75rem',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  color: '#71717A',
                  marginBottom: '4px',
                }}
              >
                {p2Role}
              </span>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 400, margin: '0 0 12px 0' }}>
                {p2Name}
              </h3>
              <p style={{ color: '#52525B', fontSize: '1rem', lineHeight: 1.7, fontStyle: 'italic', margin: 0 }}>
                "{p2Bio}"
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CHAPTER II: THE TIMETABLE (MINIMALIST ITINERARY) ─── */}
      <section
        style={{
          padding: 'clamp(60px, 9vh, 110px) 24px',
          maxWidth: '880px',
          margin: '0 auto',
        }}
      >
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '0.75rem',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: '#A1A1AA',
            }}
          >
            Chapter II
          </span>
          <h2
            style={{
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: 400,
              color: '#121212',
              marginTop: '4px',
            }}
          >
            The Itinerary of Events
          </h2>
          <p style={{ color: '#71717A', fontStyle: 'italic', fontSize: '1.05rem', margin: '8px 0 0 0' }}>
            {eventDateStr} • {venueLocation}
          </p>
        </div>

        <div style={{ borderTop: '1px solid #121212' }}>
          {eventsList.map((ev, i) => (
            <div
              key={ev.id || i}
              style={{
                padding: '28px 0',
                borderBottom: '1px solid rgba(18, 18, 18, 0.12)',
                display: 'grid',
                gridTemplateColumns: 'clamp(100px, 22vw, 160px) 1fr',
                gap: '24px',
                alignItems: 'baseline',
              }}
            >
              <div>
                <span
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#121212',
                    letterSpacing: '1px',
                    display: 'block',
                  }}
                >
                  {ev.time}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#71717A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  STAGE 0{i + 1}
                </span>
              </div>

              <div>
                <h3 style={{ fontSize: '1.45rem', fontWeight: 500, margin: '0 0 6px 0', color: '#121212' }}>
                  {ev.name}
                </h3>
                <p style={{ margin: '0 0 8px 0', color: '#52525B', fontSize: '0.95rem' }}>
                  {ev.description}
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '16px',
                    fontSize: '0.8rem',
                    color: '#71717A',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  <span><strong>Venue:</strong> {ev.venue || venueNameStr}</span>
                  {ev.dressCode && <span><strong>Attire:</strong> {ev.dressCode}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Map Location Link */}
        <div style={{ textAlign: 'center', marginTop: '36px' }}>
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(venueFullAddress)}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#121212',
              fontSize: '0.85rem',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              letterSpacing: '1px',
              textTransform: 'uppercase',
              textDecoration: 'none',
              borderBottom: '1px solid #121212',
              paddingBottom: '2px',
            }}
          >
            <span>View Venue on Google Maps</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </section>

      {/* ─── CHAPTER III: BRUTALIST-CHIC RSVP FORM ─── */}
      <section
        id="editorial-rsvp"
        style={{
          borderTop: '1px solid rgba(18, 18, 18, 0.1)',
          padding: 'clamp(60px, 9vh, 110px) 24px',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '0.75rem',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: '#A1A1AA',
              }}
            >
              Chapter III
            </span>
            <h2
              style={{
                fontSize: 'clamp(2rem, 5vw, 3rem)',
                fontWeight: 400,
                color: '#121212',
                marginTop: '4px',
              }}
            >
              Confirmation of Attendance
            </h2>
            <p style={{ color: '#71717A', fontStyle: 'italic', fontSize: '1rem', margin: '8px 0 0 0' }}>
              Kindly reply by {eventDateStr} so we may reserve your seating.
            </p>
          </div>

          {rsvpSubmitted ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', border: '1px solid #121212', borderRadius: '4px' }}>
              <CheckCircle2 size={40} color="#121212" style={{ margin: '0 auto 16px auto' }} />
              <h3 style={{ fontSize: '1.6rem', fontWeight: 400, marginBottom: '8px' }}>
                Your Attendance is Recorded
              </h3>
              <p style={{ color: '#52525B', fontSize: '1rem', fontStyle: 'italic', marginBottom: '24px' }}>
                Thank you, {guestName}. We look forward to sharing this memorable chapter with you.
              </p>
              <button
                onClick={() => setRsvpSubmitted(false)}
                style={{
                  padding: '10px 24px',
                  backgroundColor: 'transparent',
                  border: '1px solid #121212',
                  fontSize: '0.8rem',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Modify Response
              </button>
            </div>
          ) : (
            <form onSubmit={handleRsvpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: '0.78rem',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    color: '#121212',
                    marginBottom: '8px',
                    fontWeight: 600,
                  }}
                >
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Julian Montgomery"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 0',
                    border: 'none',
                    borderBottom: '1px solid #121212',
                    backgroundColor: 'transparent',
                    fontSize: '1.1rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    borderRadius: 0,
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: '0.78rem',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    color: '#121212',
                    marginBottom: '8px',
                    fontWeight: 600,
                  }}
                >
                  Email or Contact Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="julian@montgomery.com"
                  value={guestContact}
                  onChange={(e) => setGuestContact(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 0',
                    border: 'none',
                    borderBottom: '1px solid #121212',
                    backgroundColor: 'transparent',
                    fontSize: '1.1rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    borderRadius: 0,
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: allowPlusOneGuest ? '1fr 1fr' : '1fr', gap: '20px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: '0.78rem',
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      color: '#121212',
                      marginBottom: '8px',
                      fontWeight: 600,
                    }}
                  >
                    Attendance
                  </label>
                  <select
                    value={attendingStatus}
                    onChange={(e: any) => setAttendingStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 0',
                      border: 'none',
                      borderBottom: '1px solid #121212',
                      backgroundColor: 'transparent',
                      fontSize: '1rem',
                      fontFamily: 'inherit',
                      outline: 'none',
                      borderRadius: 0,
                      cursor: 'pointer',
                    }}
                  >
                    <option value="ATTENDING">Joyfully Attending</option>
                    <option value="DECLINED">Regretfully Decline</option>
                  </select>
                </div>

                {allowPlusOneGuest && (
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: '0.78rem',
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        color: '#121212',
                        marginBottom: '8px',
                        fontWeight: 600,
                      }}
                    >
                      Party Size
                    </label>
                    <select
                      value={partySize}
                      onChange={(e) => setPartySize(parseInt(e.target.value, 10))}
                      style={{
                        width: '100%',
                        padding: '12px 0',
                        border: 'none',
                        borderBottom: '1px solid #121212',
                        backgroundColor: 'transparent',
                        fontSize: '1rem',
                        fontFamily: 'inherit',
                        outline: 'none',
                        borderRadius: 0,
                        cursor: 'pointer',
                      }}
                    >
                      <option value={1}>1 Person</option>
                      <option value={2}>2 Persons (+1 Guest)</option>
                      <option value={3}>3 Persons</option>
                      <option value={4}>4 Persons</option>
                    </select>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  marginTop: '16px',
                  padding: '16px 24px',
                  backgroundColor: '#121212',
                  color: '#FBF9F5',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'wait' : 'pointer',
                  transition: 'opacity 0.2s',
                }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit RSVP →'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ─── CHAPTER IV: GUESTBOOK ANTHOLOGY ─── */}
      <section
        style={{
          padding: 'clamp(60px, 9vh, 110px) 24px',
          maxWidth: '840px',
          margin: '0 auto',
        }}
      >
        <WishesGuestbookSection
          section={wishesSection}
          theme={theme}
          experienceId={experience.id}
          tenantId={experience.tenantId}
        />
      </section>

      {/* ─── COLOPHON / EDITORIAL FOOTER ─── */}
      <footer
        style={{
          borderTop: '1px solid rgba(18, 18, 18, 0.1)',
          padding: '40px 24px',
          textAlign: 'center',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: '0.75rem',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: '#71717A',
        }}
      >
        <div>Published for {coupleNames}</div>
        <div style={{ marginTop: '4px', color: '#A1A1AA' }}>
          {eventDateStr} • {venueLocation}
        </div>
      </footer>
    </div>
  );
}
