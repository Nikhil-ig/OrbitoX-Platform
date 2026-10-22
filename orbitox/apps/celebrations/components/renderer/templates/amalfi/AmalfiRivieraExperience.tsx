'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Experience, Theme } from '@orbitox-io/celebrations';
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
  Sun,
  Compass,
} from 'lucide-react';
import { AmalfiCoastalCanvas } from './AmalfiCoastalCanvas';
import {
  ItalianMajolicaBorder,
  TerracottaArchway,
  AmalfiFloralDivider,
} from './AmalfiDecorations';
import { CoupleTitle } from '../../CoupleTitle';

interface Props {
  experience: Experience;
  theme: Theme;
}

export function AmalfiRivieraExperience({ experience, theme }: Props) {
  const [isMuted, setIsMuted] = useState(true);

  // RSVP Form State
  const [rsvpName, setRsvpName] = useState('');
  const [rsvpAttending, setRsvpAttending] = useState<'yes' | 'no'>('yes');
  const [rsvpGuests, setRsvpGuests] = useState('1');
  const [rsvpDietary, setRsvpDietary] = useState('');
  const [rsvpMessage, setRsvpMessage] = useState('');
  const [rsvpSubmitted, setRsvpSubmitted] = useState(false);

  // Guestbook State
  const [wishes, setWishes] = useState<
    Array<{ id: string; name: string; message: string; time: string; hearts: number }>
  >([
    {
      id: 'w1',
      name: 'Leonardo & Francesca',
      message: 'Che la vostra vita insieme sia splendida e luminosa come il mare della Costiera Amalfitana!',
      time: '4 hours ago',
      hearts: 34,
    },
    {
      id: 'w2',
      name: 'Uncle Giovanni',
      message: 'Raising a glass of Limoncello to the most breathtaking couple. Auguri di cuore!',
      time: 'Yesterday',
      hearts: 22,
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
    'Matteo & Sofia';
  const nameParts = coupleNames.split('&').map((n) => n.trim());
  const partner1First = nameParts[0] || 'Matteo';
  const partner2First = nameParts[1] || 'Sofia';

  const subheadline =
    (heroConfig.subheadline as string) ||
    'Together with our families, we invite you to celebrate on the Amalfi cliffs';
  const eventDate =
    (heroConfig.eventDate as string) || experience.eventDate || 'September 12, 2027';
  const venueCity = (heroConfig.venueCity as string) || 'Ravello, Italy';

  // Couple profiles
  const coupleConfig = coupleSec?.config || {};
  const partner1 = {
    name: (coupleConfig.partner1Name as string) || partner1First,
    role: (coupleConfig.partner1Role as string) || 'Lo Sposo (The Groom)',
    bio:
      (coupleConfig.partner1Bio as string) ||
      'An Italian maritime architect with an enduring devotion to wooden sailing yachts and Mediterranean sunrises.',
    image:
      (coupleConfig.partner1Image as string) ||
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
  };
  const partner2 = {
    name: (coupleConfig.partner2Name as string) || partner2First,
    role: (coupleConfig.partner2Role as string) || 'La Sposa (The Bride)',
    bio:
      (coupleConfig.partner2Bio as string) ||
      'An olive grove curator and classical pianist captivated by coastal cliff gardens and twilight poetry.',
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
            year: '2022',
            title: 'Il Primo Incontro a Positano',
            description: 'A chance encounter over espresso on a sunlit veranda overlooking the turquoise bay.',
            image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=600&q=80',
          },
          {
            year: '2024',
            title: 'La Barca a Vela verso Capri',
            description: 'Sailing past the Faraglioni rocks at golden hour, knowing our hearts were anchored forever.',
            image: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=600&q=80',
          },
          {
            year: '2026',
            title: 'La Proposta al Tramonto',
            description: 'Among the clifftop pergolas of Ravello surrounded by flowering bougainvillea, she said Yes.',
            image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80',
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
        name: 'Aperitivo al Tramonto & Pizza Soirée',
        date: 'September 11, 2027',
        time: '05:30 PM',
        venue: 'Terrazza dell’Infinito, Villa Cimbrone',
        dressCode: 'Resort Chic & Italian Linen',
        description: 'Wood-fired Neapolitan pizza, Aperol spritz, and acoustic mandolin strings.',
      },
      {
        id: 'ev2',
        name: 'La Cerimonia & Gran Banchetto',
        date: 'September 12, 2027',
        time: '04:30 PM',
        venue: 'Il Belvedere dei Limoni, Ravello',
        dressCode: 'Black-Tie Optional / Mediterranean Elegance',
        description: 'Sacred sunset vows overlooking the sea followed by dining beneath lemon pergolas.',
      },
    ];

  // Live countdown state
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const target = new Date(eventDate).getTime() || new Date('2027-09-12T18:00:00').getTime();
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
        backgroundColor: '#120A07',
        color: '#FFF9F5',
        minHeight: '100vh',
        fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif",
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {/* Floating Mediterranean Sunbeam Motes & Bougainvillea Petals */}
      <AmalfiCoastalCanvas />

      {/* Warm Sunset Terrace Glow */}
      <div
        style={{
          position: 'fixed',
          top: '-15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '900px',
          height: '600px',
          background: 'radial-gradient(ellipse, rgba(232, 184, 109, 0.2) 0%, rgba(216, 74, 117, 0.1) 45%, transparent 75%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Floating Audio Toggle */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 90 }}>
        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '9999px',
            background: 'rgba(28, 14, 10, 0.88)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(232, 184, 109, 0.45)',
            color: '#FFF1C5',
            fontSize: '0.8rem',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          {isMuted ? <VolumeX size={15} color="#D84A75" /> : <Volume2 size={15} color="#E8B86D" />}
          <span>{isMuted ? 'Sound Off' : 'Amalfi Guitar'}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* HERO SECTION: VILLA BELMONDO CLIFFTOP TERRACE                             */}
      {/* ========================================================================= */}
      <section
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 20px 60px 20px',
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: '780px', width: '100%', position: 'relative', textAlign: 'center' }}>
          <TerracottaArchway primaryColor="#E8B86D" accentColor="#D84A75" />

          {/* Top Ceramic Majolica Tile Ribbon Accent */}
          <div style={{ margin: '-20px auto 24px auto', maxWidth: '640px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(232, 184, 109, 0.4)' }}>
            <ItalianMajolicaBorder primaryColor="#E8B86D" azureColor="#3A7D8C" />
          </div>

          <span
            style={{
              textTransform: 'uppercase',
              letterSpacing: '5px',
              fontSize: 'clamp(0.72rem, 1.8vw, 0.82rem)',
              color: '#E8B86D',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
            }}
          >
            <Sun size={14} color="#E8B86D" />
            <span>Costiera Amalfitana • Celebrazione d'Amore</span>
            <Sun size={14} color="#E8B86D" />
          </span>

          <CoupleTitle
            as="h1"
            title={coupleNames}
            flourishColor="#E8B86D"
            style={{
              fontSize: 'clamp(2.4rem, 6vw, 4rem)',
              color: '#FFF9F5',
              lineHeight: 1.15,
              fontWeight: 700,
              textShadow: '0 4px 24px rgba(0,0,0,0.9), 0 0 32px rgba(232, 184, 109, 0.35)',
              margin: '0 0 14px 0',
            }}
          />

          <p
            style={{
              fontSize: 'clamp(0.95rem, 2.2vw, 1.15rem)',
              color: '#E8B86D',
              fontStyle: 'italic',
              maxWidth: '520px',
              margin: '0 auto 24px auto',
              lineHeight: 1.5,
            }}
          >
            "{subheadline}"
          </p>

          {/* Ceremony Date & Location Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '16px',
              padding: '10px 24px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(232, 184, 109, 0.4)',
              backdropFilter: 'blur(16px)',
              color: '#FFF1C5',
              fontSize: '0.9rem',
              marginBottom: '32px',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} color="#E8B86D" />
              <span>{eventDate}</span>
            </span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={14} color="#D84A75" />
              <span>{venueCity}</span>
            </span>
          </div>

          {/* 4-Box Never-Wrap Countdown */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              maxWidth: '340px',
              margin: '0 auto',
            }}
          >
            {[
              { label: 'Giorni', val: timeLeft.days },
              { label: 'Ore', val: timeLeft.hours },
              { label: 'Minuti', val: timeLeft.minutes },
              { label: 'Secondi', val: timeLeft.seconds },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(30, 15, 10, 0.85)',
                  border: '1px solid rgba(232, 184, 109, 0.35)',
                  borderRadius: '12px',
                  padding: '10px 6px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#E8B86D' }}>
                  {String(item.val).padStart(2, '0')}
                </div>
                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#D84A75' }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* CAPITOLO I: GLI SPOSI (COUPLE PROFILES IN MAJOLICA FRAMES)                */}
      {/* ========================================================================= */}
      <section style={{ position: 'relative', padding: '70px 20px', maxWidth: '920px', margin: '0 auto', zIndex: 10 }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <span style={{ textTransform: 'uppercase', letterSpacing: '3px', fontSize: '0.76rem', color: '#E8B86D', fontWeight: 600 }}>
            Capitolo I
          </span>
          <h2 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.6rem)', color: '#FFF9F5', marginTop: '4px', marginBottom: '8px' }}>
            Gli Sposi
          </h2>
          <p style={{ color: '#E8B86D', fontStyle: 'italic', fontSize: '0.95rem', margin: 0 }}>
            Due anime che si incontrano sul sentiero dei limoni
          </p>
          <AmalfiFloralDivider />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '30px' }}>
          {[partner1, partner2].map((p, i) => (
            <div
              key={i}
              style={{
                borderRadius: '24px',
                background: 'linear-gradient(180deg, rgba(34, 18, 12, 0.8) 0%, rgba(18, 8, 5, 0.95) 100%)',
                border: '1px solid rgba(232, 184, 109, 0.35)',
                padding: '36px 24px',
                textAlign: 'center',
                boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div
                style={{
                  width: '140px',
                  height: '140px',
                  borderRadius: '50%',
                  margin: '0 auto 20px auto',
                  padding: '5px',
                  background: 'linear-gradient(135deg, #E8B86D 0%, #D84A75 100%)',
                  boxShadow: '0 0 28px rgba(232, 184, 109, 0.35)',
                }}
              >
                <img
                  src={p.image}
                  alt={p.name}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              </div>

              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 14px',
                  borderRadius: '9999px',
                  background: 'rgba(232, 184, 109, 0.15)',
                  border: '1px solid rgba(232, 184, 109, 0.4)',
                  color: '#FFF1C5',
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '10px',
                }}
              >
                {p.role}
              </span>

              <h3 style={{ fontSize: '1.7rem', color: '#FFF6E9', margin: '0 0 10px 0' }}>{p.name}</h3>
              <p style={{ fontSize: '0.92rem', lineHeight: 1.6, color: '#D9C8BE', fontStyle: 'italic', margin: 0 }}>
                "{p.bio}"
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* CAPITOLO II: IL NOSTRO VIAGGIO (STORY TIMELINE)                           */}
      {/* ========================================================================= */}
      {isStoryVisible && (
        <section style={{ position: 'relative', padding: '70px 20px', maxWidth: '820px', margin: '0 auto', zIndex: 10 }}>
          <div style={{ textAlign: 'center', marginBottom: '44px' }}>
            <span style={{ textTransform: 'uppercase', letterSpacing: '3px', fontSize: '0.76rem', color: '#E8B86D', fontWeight: 600 }}>
              Capitolo II
            </span>
            <h2 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.6rem)', color: '#FFF9F5', marginTop: '4px', marginBottom: '8px' }}>
              Il Nostro Viaggio
            </h2>
            <p style={{ color: '#E8B86D', fontStyle: 'italic', fontSize: '0.95rem', margin: 0 }}>
              I ricordi più preziosi tra Positano, Capri e Ravello
            </p>
            <AmalfiFloralDivider />
          </div>

          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Vertical Terracotta Stone Spine */}
            <div
              style={{
                position: 'absolute',
                top: '10px',
                bottom: '10px',
                left: '20px',
                width: '2px',
                background: 'linear-gradient(180deg, transparent 0%, #E8B86D 15%, #D84A75 85%, transparent 100%)',
                opacity: 0.4,
              }}
            />

            {storyMilestones.map((item, idx) => (
              <div key={idx} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', paddingLeft: '48px' }}>
                {/* Compass Sun Node */}
                <div
                  style={{
                    position: 'absolute',
                    left: '6px',
                    top: '18px',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: '#1A0B06',
                    border: '2px solid #E8B86D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 14px rgba(232, 184, 109, 0.6)',
                    zIndex: 2,
                    color: '#E8B86D',
                  }}
                >
                  <Sun size={13} />
                </div>

                {/* Card */}
                <div
                  style={{
                    flex: 1,
                    background: 'rgba(30, 15, 10, 0.85)',
                    border: '1px solid rgba(232, 184, 109, 0.3)',
                    borderRadius: '18px',
                    padding: '22px',
                    boxShadow: '0 10px 28px rgba(0,0,0,0.55)',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#E8B86D', letterSpacing: '2px', textTransform: 'uppercase' }}>
                    {item.year}
                  </span>
                  <h4 style={{ fontSize: '1.3rem', color: '#FFF6E9', margin: '4px 0 8px 0' }}>{item.title}</h4>
                  <p style={{ fontSize: '0.9rem', color: '#D9C8BE', lineHeight: 1.6, margin: '0 0 14px 0' }}>
                    {item.description}
                  </p>
                  {item.image && (
                    <div style={{ borderRadius: '12px', overflow: 'hidden', height: '180px', border: '1px solid rgba(216, 74, 117, 0.25)' }}>
                      <img src={item.image} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* CAPITOLO III: IL PROGRAMMA DELLE FESTE (BANQUET ITINERARY)                */}
      {/* ========================================================================= */}
      <section style={{ position: 'relative', padding: '70px 20px', maxWidth: '920px', margin: '0 auto', zIndex: 10 }}>
        <div style={{ textAlign: 'center', marginBottom: '44px' }}>
          <span style={{ textTransform: 'uppercase', letterSpacing: '3px', fontSize: '0.76rem', color: '#E8B86D', fontWeight: 600 }}>
            Capitolo III
          </span>
          <h2 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.6rem)', color: '#FFF9F5', marginTop: '4px', marginBottom: '8px' }}>
            Il Programma delle Feste
          </h2>
          <p style={{ color: '#E8B86D', fontStyle: 'italic', fontSize: '0.95rem', margin: 0 }}>
            Festeggiamenti e banchetti affacciati sul mare azzurro
          </p>
          <AmalfiFloralDivider />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '24px' }}>
          {eventList.map((ev, i) => (
            <div
              key={ev.id || i}
              style={{
                borderRadius: '20px',
                background: 'linear-gradient(180deg, rgba(34, 18, 12, 0.85) 0%, rgba(18, 8, 5, 0.95) 100%)',
                border: '1px solid rgba(232, 184, 109, 0.35)',
                padding: '26px 22px',
                boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#E8B86D', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Momento {i + 1}
                  </span>
                  {ev.dressCode && (
                    <span style={{ padding: '3px 10px', borderRadius: '9999px', background: 'rgba(216, 74, 117, 0.15)', border: '1px solid rgba(216, 74, 117, 0.35)', fontSize: '0.68rem', color: '#FFF1C5' }}>
                      {ev.dressCode}
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '1.4rem', color: '#FFF6E9', margin: '0 0 14px 0' }}>{ev.name}</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#D9C8BE' }}>
                    <Calendar size={13} color="#E8B86D" />
                    <span>{ev.date}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#D9C8BE' }}>
                    <Clock size={13} color="#D84A75" />
                    <span>{ev.time}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#D9C8BE' }}>
                    <MapPin size={13} color="#E8B86D" />
                    <span>{ev.venue}</span>
                  </div>
                </div>

                {ev.description && (
                  <p style={{ fontSize: '0.85rem', color: '#BFAEA4', lineHeight: 1.5, margin: 0 }}>
                    {ev.description}
                  </p>
                )}
              </div>

              <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(ev.venue + ', ' + venueCity)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#E8B86D', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 600 }}
                >
                  <span>Indicazioni Stradali (Maps)</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* CAPITOLO IV: CONFERMA DI PARTECIPAZIONE (AMALFI PAPER RSVP)               */}
      {/* ========================================================================= */}
      <section style={{ position: 'relative', padding: '70px 20px', maxWidth: '640px', margin: '0 auto', zIndex: 10 }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{ textTransform: 'uppercase', letterSpacing: '3px', fontSize: '0.76rem', color: '#E8B86D', fontWeight: 600 }}>
            Capitolo IV
          </span>
          <h2 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.6rem)', color: '#FFF9F5', marginTop: '4px', marginBottom: '8px' }}>
            Conferma di Partecipazione
          </h2>
          <p style={{ color: '#E8B86D', fontStyle: 'italic', fontSize: '0.95rem', margin: 0 }}>
            È gradita gentile conferma entro il 20 Luglio 2027
          </p>
          <AmalfiFloralDivider />
        </div>

        <div
          style={{
            background: 'linear-gradient(180deg, rgba(34, 18, 12, 0.92) 0%, rgba(18, 8, 5, 0.98) 100%)',
            border: '2px solid rgba(232, 184, 109, 0.45)',
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
                  background: 'rgba(232, 184, 109, 0.15)',
                  border: '2px solid #E8B86D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  color: '#E8B86D',
                }}
              >
                <CheckCircle size={30} />
              </div>
              <h3 style={{ fontSize: '1.7rem', color: '#FFF1C5', marginBottom: '8px' }}>
                Grazie di Cuore!
              </h3>
              <p style={{ color: '#D9C8BE', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
                Gentile <strong>{rsvpName}</strong>, la vostra presenza è stata felicemente confermata per la festa a {venueCity}.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRsvpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#E8B86D', marginBottom: '6px' }}>
                  Nome e Cognome degli Ospiti *
                </label>
                <input
                  type="text"
                  required
                  placeholder="es. Matteo & Sofia Rossi"
                  value={rsvpName}
                  onChange={(e) => setRsvpName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'rgba(0,0,0,0.45)',
                    border: '1px solid rgba(232, 184, 109, 0.35)',
                    color: '#fff',
                    fontSize: '0.95rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#E8B86D', marginBottom: '8px' }}>
                  Sarai Presente? *
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
                      border: rsvpAttending === 'yes' ? '2px solid #E8B86D' : '1px solid rgba(255,255,255,0.15)',
                      background: rsvpAttending === 'yes' ? 'rgba(232, 184, 109, 0.2)' : 'rgba(0,0,0,0.3)',
                      color: rsvpAttending === 'yes' ? '#FFF1C5' : '#D1C4C0',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Heart size={14} fill={rsvpAttending === 'yes' ? '#E8B86D' : 'transparent'} />
                    <span>Con Gioia / Attending</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRsvpAttending('no')}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: rsvpAttending === 'no' ? '2px solid #D84A75' : '1px solid rgba(255,255,255,0.15)',
                      background: rsvpAttending === 'no' ? 'rgba(216, 74, 117, 0.2)' : 'rgba(0,0,0,0.3)',
                      color: rsvpAttending === 'no' ? '#FFF1C5' : '#D1C4C0',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Con Rimpianto / Decline
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#E8B86D', marginBottom: '6px' }}>
                    Numero di Ospiti
                  </label>
                  <select
                    value={rsvpGuests}
                    onChange={(e) => setRsvpGuests(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: 'rgba(0,0,0,0.45)',
                      border: '1px solid rgba(232, 184, 109, 0.35)',
                      color: '#fff',
                      fontSize: '0.95rem',
                    }}
                  >
                    <option value="1">1 Ospite</option>
                    <option value="2">2 Ospiti</option>
                    <option value="3">3 Ospiti</option>
                    <option value="4">4 Ospiti</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#E8B86D', marginBottom: '6px' }}>
                    Esigenze Alimentari
                  </label>
                  <input
                    type="text"
                    placeholder="es. Vegetariano"
                    value={rsvpDietary}
                    onChange={(e) => setRsvpDietary(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: 'rgba(0,0,0,0.45)',
                      border: '1px solid rgba(232, 184, 109, 0.35)',
                      color: '#fff',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#E8B86D', marginBottom: '6px' }}>
                  Un Messaggio per gli Sposi
                </label>
                <textarea
                  rows={3}
                  placeholder="Scrivi un pensiero affettuoso..."
                  value={rsvpMessage}
                  onChange={(e) => setRsvpMessage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'rgba(0,0,0,0.45)',
                    border: '1px solid rgba(232, 184, 109, 0.35)',
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
                  background: 'linear-gradient(135deg, #E8B86D 0%, #D84A75 100%)',
                  border: 'none',
                  color: '#150A07',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  boxShadow: '0 6px 24px rgba(232, 184, 109, 0.4)',
                  transition: 'all 0.2s',
                  marginTop: '6px',
                }}
              >
                Invia Conferma RSVP
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* CAPITOLO V: IL LIBRO DEGLI OSPITI (GUESTBOOK)                             */}
      {/* ========================================================================= */}
      <section style={{ position: 'relative', padding: '70px 20px 130px 20px', maxWidth: '820px', margin: '0 auto', zIndex: 10 }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <span style={{ textTransform: 'uppercase', letterSpacing: '3px', fontSize: '0.76rem', color: '#E8B86D', fontWeight: 600 }}>
            Capitolo V
          </span>
          <h2 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.6rem)', color: '#FFF9F5', marginTop: '4px', marginBottom: '8px' }}>
            Il Libro degli Ospiti
          </h2>
          <p style={{ color: '#E8B86D', fontStyle: 'italic', fontSize: '0.95rem', margin: 0 }}>
            Lascia una dedica, una benedizione o un ricordo per gli sposi
          </p>
          <AmalfiFloralDivider />
        </div>

        <form
          onSubmit={handleAddWish}
          style={{
            background: 'rgba(30, 15, 10, 0.85)',
            border: '1px solid rgba(232, 184, 109, 0.35)',
            borderRadius: '20px',
            padding: '22px',
            marginBottom: '32px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '12px' }}>
            <input
              type="text"
              required
              placeholder="Il Tuo Nome"
              value={newWishName}
              onChange={(e) => setNewWishName(e.target.value)}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(232, 184, 109, 0.3)',
                color: '#fff',
                fontSize: '0.9rem',
              }}
            />
            <input
              type="text"
              required
              placeholder="Scrivi una dedica o augurio..."
              value={newWishText}
              onChange={(e) => setNewWishText(e.target.value)}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(232, 184, 109, 0.3)',
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
              gap: '8px',
              padding: '10px 22px',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, #E8B86D 0%, #D84A75 100%)',
              border: 'none',
              color: '#150A07',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              alignSelf: 'flex-end',
            }}
          >
            <Send size={13} />
            <span>Firma il Libro degli Ospiti</span>
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {wishes.map((w) => (
            <div
              key={w.id}
              style={{
                background: 'rgba(30, 15, 10, 0.7)',
                border: '1px solid rgba(216, 74, 117, 0.25)',
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
                  <span style={{ fontSize: '0.75rem', color: '#E8B86D', opacity: 0.8 }}>• {w.time}</span>
                </div>
                <p style={{ margin: 0, color: '#D9C8BE', fontSize: '0.92rem', lineHeight: 1.5, fontStyle: 'italic' }}>
                  "{w.message}"
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setWishes(
                    wishes.map((item) =>
                      item.id === w.id ? { ...item, hearts: item.hearts + 1 } : item
                    )
                  )
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  background: 'rgba(216, 74, 117, 0.15)',
                  border: '1px solid rgba(216, 74, 117, 0.3)',
                  color: '#FF7096',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <Heart size={13} fill="#FF7096" />
                <span>{w.hearts}</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          textAlign: 'center',
          padding: '36px 20px',
          borderTop: '1px solid rgba(232, 184, 109, 0.2)',
          color: '#E8B86D',
          fontSize: '0.82rem',
          letterSpacing: '1px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <p style={{ margin: 0 }}>
          Dedicato con amore a <strong>{coupleNames}</strong>
        </p>
        <p style={{ margin: '6px 0 0 0', fontSize: '0.7rem', opacity: 0.6 }}>
          Powered by OrbitoX Celebrations Engine
        </p>
      </footer>
    </div>
  );
}
