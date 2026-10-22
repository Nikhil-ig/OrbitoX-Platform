'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DEFAULT_OCCASIONS,
  DEFAULT_THEMES,
  Occasion,
  Theme,
  Experience,
  ExperienceSection,
} from '@orbitox-io/celebrations';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CalendarDays,
  MapPin,
  Share2,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  ChevronDown,
  Music,
  Heart,
  Eye,
  Send,
  Camera,
  Layers,
} from 'lucide-react';
import { atelierSoundscape } from '@/lib/atelier-soundscape';
import { AtelierChapterBar, ATELIER_CHAPTERS } from './AtelierChapterBar';
import { PortalsOccasionSelector } from './PortalsOccasionSelector';
import { UniverseMoodSelector, UNIVERSE_DEFINITIONS } from './UniverseMoodSelector';
import { LiveInvitationCanvas } from './LiveInvitationCanvas';
import { ExperienceView } from '@/components/renderer/ExperienceView';

interface CinematicAtelierProps {
  initialOccasionSlug?: string;
  initialThemeSlug?: string;
}

export const CinematicAtelier: React.FC<CinematicAtelierProps> = ({
  initialOccasionSlug,
  initialThemeSlug,
}) => {
  const router = useRouter();

  // 1. Initial Occasion & Theme Resolution
  const fallbackOccasion: Occasion = DEFAULT_OCCASIONS[0]!;
  const fallbackTheme: Theme = DEFAULT_THEMES[0]!;

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

  // 2. Interactive Atelier State
  const [currentChapter, setCurrentChapter] = useState<number>(initialOccasionSlug ? 2 : 1);
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
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Background Canvas particle animation ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 3. Stardust Particle Canvas Engine
  useEffect(() => {
    if (isCalmMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    interface Particle {
      x: number;
      y: number;
      radius: number;
      alpha: number;
      vx: number;
      vy: number;
    }

    const particles: Particle[] = Array.from({ length: 48 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.8 + 0.5,
      alpha: Math.random() * 0.7 + 0.2,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -Math.random() * 0.4 - 0.1,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.y < 0) p.y = height;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${p.alpha})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#D4AF37';
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isCalmMode]);

  // 4. Dynamic Live Experience Object (for Full Guest Experience Rendering)
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
      sections: sections,
      featuresEnabled: selectedOccasion.allowedFeatures,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [names, selectedOccasion, selectedTheme, eventDate, venueName, storyQuote, heroImage]);

  // Handle Chapter Advance
  const advanceChapter = (nextCh: number) => {
    atelierSoundscape.playTactileTick();
    setCurrentChapter(Math.min(Math.max(nextCh, 1), 8));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Published Link URL
  const publishedUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/e/${fullExperience.slug}`
    : `/e/${fullExperience.slug}`;

  const handleCopyLink = () => {
    atelierSoundscape.playTactileTick();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(publishedUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2400);
    }
  };

  const handleWaxSealClick = () => {
    atelierSoundscape.playWaxSealStamp();
    setIsWaxSealed(true);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#07090E',
        color: '#FAF8F5',
        position: 'relative',
        overflowX: 'hidden',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Background Canvas for Stardust Atmosphere */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 1,
          opacity: isCalmMode ? 0 : 0.65,
        }}
      />

      {/* Floating Header Navigation */}
      <header
        style={{
          position: 'fixed',
          top: 18,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(1180px, calc(100% - 32px))',
          zIndex: 900,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderRadius: 999,
          background: 'rgba(10, 13, 19, 0.72)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 10px 35px rgba(0, 0, 0, 0.4)',
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FAF4E1, #D4AF37)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#07090E',
              boxShadow: '0 0 15px rgba(212, 175, 55, 0.4)',
            }}
          >
            <Sparkles size={16} />
          </div>
          <div>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: '1.1rem',
                letterSpacing: '0.08em',
                color: '#FAF8F5',
              }}
            >
              CELEBRATIONS
            </span>
            <span
              style={{
                fontSize: 9,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#F5D061',
                marginLeft: 8,
              }}
            >
              Atelier
            </span>
          </div>
        </Link>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            href="/dashboard"
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'rgba(245, 247, 251, 0.7)',
              padding: '6px 12px',
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
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 999,
              background: isGuestPreviewActive ? '#FAF8F5' : 'rgba(212, 175, 55, 0.16)',
              border: isGuestPreviewActive ? '1px solid #FAF8F5' : '1px solid rgba(212, 175, 55, 0.35)',
              color: isGuestPreviewActive ? '#090B10' : '#F5D061',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.25s ease',
            }}
          >
            <Eye size={13} />
            <span>{isGuestPreviewActive ? 'Back to Atelier' : 'Live Guest View'}</span>
          </button>
        </div>
      </header>

      {/* FULL GUEST EXPERIENCE MODAL OVERLAY */}
      {isGuestPreviewActive ? (
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
              zIndex: 1100,
            }}
          >
            <button
              type="button"
              onClick={() => setIsGuestPreviewActive(false)}
              style={{
                padding: '10px 20px',
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
              ← Return to Atelier Editor
            </button>
          </div>
          <ExperienceView experience={fullExperience} theme={selectedTheme} />
        </div>
      ) : null}

      {/* MAIN CINEMATIC ATELIER STAGE */}
      <main
        style={{
          position: 'relative',
          zIndex: 10,
          paddingTop: 110,
          paddingBottom: 120,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="container" style={{ width: '100%', maxWidth: 1160 }}>
          {/* =========================================================================
              SCENE 01: THE THRESHOLD (The Opening Invitation)
              ========================================================================= */}
          {currentChapter === 1 && (
            <section
              style={{
                textAlign: 'center',
                padding: '40px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '65vh',
              }}
            >
              {/* Concentric Celestial Rings */}
              <div
                style={{
                  position: 'relative',
                  width: 140,
                  height: 140,
                  marginBottom: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: '1px solid rgba(212, 175, 55, 0.25)',
                    animation: isCalmMode ? 'none' : 'celestialRingPulse 4s infinite ease-in-out',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 18,
                    borderRadius: '50%',
                    border: '1px dashed rgba(212, 175, 55, 0.45)',
                  }}
                />
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 30%, #FAF4E1, #D4AF37 60%, #8A6820)',
                    boxShadow: '0 0 35px rgba(212, 175, 55, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#090B10',
                  }}
                >
                  <Sparkles size={28} />
                </div>
              </div>

              {/* Monolithic Poetic Title */}
              <h1
                style={{
                  fontSize: 'clamp(2.5rem, 6.5vw, 5.2rem)',
                  lineHeight: 1.05,
                  letterSpacing: '-0.04em',
                  maxWidth: 880,
                  margin: '0 auto 24px auto',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                }}
              >
                Every monumental memory begins with an intention <span className="gold-foil-text">to gather.</span>
              </h1>

              <p
                style={{
                  fontSize: 'clamp(1rem, 2.2vw, 1.25rem)',
                  lineHeight: 1.75,
                  maxWidth: 680,
                  color: 'rgba(245, 247, 251, 0.72)',
                  margin: '0 auto 40px auto',
                }}
              >
                Welcome to Celebrations. Step inside our creative atelier where your life’s most sacred milestones,
                weddings, and jubilations transform into living, interactive digital experiences.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <button
                  type="button"
                  onClick={() => {
                    atelierSoundscape.playHarpArpeggio();
                    advanceChapter(2);
                  }}
                  className="btn-primary"
                  style={{
                    padding: '18px 36px',
                    borderRadius: 999,
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    boxShadow: '0 15px 40px rgba(212, 175, 55, 0.4)',
                  }}
                >
                  <span>Begin The Story</span>
                  <ArrowRight size={18} />
                </button>

                <span
                  style={{
                    fontSize: 12,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'rgba(245, 247, 251, 0.45)',
                  }}
                >
                  Scroll or tap to enter Scene 02
                </span>
              </div>
            </section>
          )}

          {/* =========================================================================
              SCENE 02: THE SPARK (What are we celebrating?)
              ========================================================================= */}
          {currentChapter === 2 && (
            <section style={{ padding: '20px 0', textAlign: 'center' }}>
              <div style={{ marginBottom: 30 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: 999,
                    background: 'rgba(212, 175, 55, 0.1)',
                    border: '1px solid rgba(212, 175, 55, 0.25)',
                    color: '#F5D061',
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    marginBottom: 12,
                  }}
                >
                  <Sparkles size={13} /> Scene 02 · The Occasion
                </div>
                <h2
                  style={{
                    fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
                    fontFamily: 'var(--font-display)',
                    margin: 0,
                    letterSpacing: '-0.03em',
                  }}
                >
                  What sacred or joyful milestone are you bringing to life?
                </h2>
                <p style={{ marginTop: 10, color: 'rgba(245, 247, 251, 0.65)', fontSize: '1.05rem' }}>
                  Select an architectural portal to awaken its unique visual world and ceremonial features.
                </p>
              </div>

              <PortalsOccasionSelector
                selectedOccasion={selectedOccasion}
                onSelectOccasion={(occ) => {
                  setSelectedOccasion(occ);
                }}
              />

              <div style={{ marginTop: 36, display: 'flex', justifyContent: 'center', gap: 14 }}>
                <button
                  type="button"
                  onClick={() => advanceChapter(1)}
                  style={{
                    padding: '14px 24px',
                    borderRadius: 999,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FAF8F5',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ← Back
                </button>

                <button
                  type="button"
                  onClick={() => {
                    atelierSoundscape.playHarpArpeggio();
                    advanceChapter(3);
                  }}
                  className="btn-primary"
                  style={{
                    padding: '14px 30px',
                    borderRadius: 999,
                    fontWeight: 800,
                  }}
                >
                  <span>Choose The Atmosphere</span>
                  <ArrowRight size={17} />
                </button>
              </div>
            </section>
          )}

          {/* =========================================================================
              SCENE 03: THE ATMOSPHERE (Choose the Feeling / Universe)
              ========================================================================= */}
          {currentChapter === 3 && (
            <section style={{ padding: '20px 0', textAlign: 'center' }}>
              <div style={{ marginBottom: 30 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: 999,
                    background: 'rgba(212, 175, 55, 0.1)',
                    border: '1px solid rgba(212, 175, 55, 0.25)',
                    color: '#F5D061',
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    marginBottom: 12,
                  }}
                >
                  <Sparkles size={13} /> Scene 03 · Visual Atmosphere
                </div>
                <h2
                  style={{
                    fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
                    fontFamily: 'var(--font-display)',
                    margin: 0,
                    letterSpacing: '-0.03em',
                  }}
                >
                  Now, what should this world feel like?
                </h2>
                <p style={{ marginTop: 10, color: 'rgba(245, 247, 251, 0.65)', fontSize: '1.05rem' }}>
                  Each universe transforms typography, color physics, atmospheric sound, and tactile borders.
                </p>
              </div>

              <UniverseMoodSelector
                selectedTheme={selectedTheme}
                onSelectTheme={(th) => {
                  setSelectedTheme(th);
                }}
              />

              <div style={{ marginTop: 36, display: 'flex', justifyContent: 'center', gap: 14 }}>
                <button
                  type="button"
                  onClick={() => advanceChapter(2)}
                  style={{
                    padding: '14px 24px',
                    borderRadius: 999,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FAF8F5',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ← Back
                </button>

                <button
                  type="button"
                  onClick={() => {
                    atelierSoundscape.playHarpArpeggio();
                    advanceChapter(4);
                  }}
                  className="btn-primary"
                  style={{
                    padding: '14px 30px',
                    borderRadius: 999,
                    fontWeight: 800,
                  }}
                >
                  <span>Honor The Protagonists</span>
                  <ArrowRight size={17} />
                </button>
              </div>
            </section>
          )}

          {/* =========================================================================
              SCENE 04: THE PROTAGONISTS (Whom are we celebrating?)
              ========================================================================= */}
          {currentChapter === 4 && (
            <section style={{ padding: '20px 0' }}>
              <div style={{ textAlign: 'center', marginBottom: 30 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: 999,
                    background: 'rgba(212, 175, 55, 0.1)',
                    border: '1px solid rgba(212, 175, 55, 0.25)',
                    color: '#F5D061',
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    marginBottom: 12,
                  }}
                >
                  <Sparkles size={13} /> Scene 04 · Protagonists
                </div>
                <h2
                  style={{
                    fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
                    fontFamily: 'var(--font-display)',
                    margin: 0,
                    letterSpacing: '-0.03em',
                  }}
                >
                  Whom are we honoring?
                </h2>
                <p style={{ marginTop: 10, color: 'rgba(245, 247, 251, 0.65)', fontSize: '1.05rem' }}>
                  Type their names and watch the golden monogram and composition transform in real time.
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: 32,
                  alignItems: 'center',
                }}
              >
                {/* Input Studio Column */}
                <div
                  style={{
                    padding: '32px 28px',
                    borderRadius: 24,
                    background: 'rgba(15, 19, 27, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  <label
                    htmlFor="protagonist-names"
                    style={{
                      display: 'block',
                      fontSize: 12,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'rgba(245, 247, 251, 0.6)',
                      marginBottom: 10,
                    }}
                  >
                    Celebrant or Couple Names
                  </label>
                  <input
                    id="protagonist-names"
                    type="text"
                    value={names}
                    onChange={(e) => {
                      atelierSoundscape.playTactileTick();
                      setNames(e.target.value);
                    }}
                    placeholder="e.g. Vikram & Ananya"
                    className="atelier-input"
                    style={{ marginBottom: 20 }}
                  />

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                    {['Vikram & Ananya', 'Aarav & Meera', 'Siddharth & Priya', 'Rohan at 30'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          atelierSoundscape.playTactileTick();
                          setNames(preset);
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 999,
                          background: names === preset ? 'rgba(212, 175, 55, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                          border: names === preset ? '1px solid #D4AF37' : '1px solid rgba(255, 255, 255, 0.08)',
                          color: names === preset ? '#F5D061' : 'rgba(245, 247, 251, 0.6)',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => advanceChapter(3)}
                      style={{
                        padding: '12px 20px',
                        borderRadius: 999,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#FAF8F5',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ← Back
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        atelierSoundscape.playResonantBell();
                        advanceChapter(5);
                      }}
                      className="btn-primary"
                      style={{
                        padding: '12px 24px',
                        borderRadius: 999,
                        fontWeight: 800,
                        flex: 1,
                      }}
                    >
                      <span>Lock In Names & Set Date</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Live Rendering Canvas */}
                <div>
                  <LiveInvitationCanvas
                    names={names}
                    occasion={selectedOccasion}
                    theme={selectedTheme}
                    eventDate={eventDate}
                    venueName={venueName}
                    storyQuote={storyQuote}
                    heroImage={heroImage}
                  />
                </div>
              </div>
            </section>
          )}

          {/* =========================================================================
              SCENE 05: THE HORIZON (The Sanctuary & Date)
              ========================================================================= */}
          {currentChapter === 5 && (
            <section style={{ padding: '20px 0' }}>
              <div style={{ textAlign: 'center', marginBottom: 30 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: 999,
                    background: 'rgba(212, 175, 55, 0.1)',
                    border: '1px solid rgba(212, 175, 55, 0.25)',
                    color: '#F5D061',
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    marginBottom: 12,
                  }}
                >
                  <Sparkles size={13} /> Scene 05 · The Horizon
                </div>
                <h2
                  style={{
                    fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
                    fontFamily: 'var(--font-display)',
                    margin: 0,
                    letterSpacing: '-0.03em',
                  }}
                >
                  When and where will the moment arrive?
                </h2>
                <p style={{ marginTop: 10, color: 'rgba(245, 247, 251, 0.65)', fontSize: '1.05rem' }}>
                  Anchor the calendar disc and sanctuary coordinates into your invitation composition.
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: 32,
                  alignItems: 'center',
                }}
              >
                {/* Input Studio Column */}
                <div
                  style={{
                    padding: '32px 28px',
                    borderRadius: 24,
                    background: 'rgba(15, 19, 27, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  <div style={{ marginBottom: 22 }}>
                    <label
                      htmlFor="celebration-date"
                      style={{
                        display: 'block',
                        fontSize: 12,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'rgba(245, 247, 251, 0.6)',
                        marginBottom: 10,
                      }}
                    >
                      Celebration Date
                    </label>
                    <input
                      id="celebration-date"
                      type="date"
                      value={eventDate}
                      onChange={(e) => {
                        atelierSoundscape.playTactileTick();
                        setEventDate(e.target.value);
                      }}
                      className="atelier-input"
                    />
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <label
                      htmlFor="celebration-venue"
                      style={{
                        display: 'block',
                        fontSize: 12,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'rgba(245, 247, 251, 0.6)',
                        marginBottom: 10,
                      }}
                    >
                      Sanctuary / Venue Destination
                    </label>
                    <input
                      id="celebration-venue"
                      type="text"
                      value={venueName}
                      onChange={(e) => {
                        atelierSoundscape.playTactileTick();
                        setVenueName(e.target.value);
                      }}
                      placeholder="e.g. Lake Palace, Udaipur"
                      className="atelier-input"
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => advanceChapter(4)}
                      style={{
                        padding: '12px 20px',
                        borderRadius: 999,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#FAF8F5',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ← Back
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        atelierSoundscape.playResonantBell();
                        advanceChapter(6);
                      }}
                      className="btn-primary"
                      style={{
                        padding: '12px 24px',
                        borderRadius: 999,
                        fontWeight: 800,
                        flex: 1,
                      }}
                    >
                      <span>Tell Their Story</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Live Rendering Canvas */}
                <div>
                  <LiveInvitationCanvas
                    names={names}
                    occasion={selectedOccasion}
                    theme={selectedTheme}
                    eventDate={eventDate}
                    venueName={venueName}
                    storyQuote={storyQuote}
                    heroImage={heroImage}
                  />
                </div>
              </div>
            </section>
          )}

          {/* =========================================================================
              SCENE 06: THE NARRATIVE (Tell Their Story)
              ========================================================================= */}
          {currentChapter === 6 && (
            <section style={{ padding: '20px 0' }}>
              <div style={{ textAlign: 'center', marginBottom: 30 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: 999,
                    background: 'rgba(212, 175, 55, 0.1)',
                    border: '1px solid rgba(212, 175, 55, 0.25)',
                    color: '#F5D061',
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    marginBottom: 12,
                  }}
                >
                  <Sparkles size={13} /> Scene 06 · Narrative Story
                </div>
                <h2
                  style={{
                    fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
                    fontFamily: 'var(--font-display)',
                    margin: 0,
                    letterSpacing: '-0.03em',
                  }}
                >
                  Tell the story that brought you here.
                </h2>
                <p style={{ marginTop: 10, color: 'rgba(245, 247, 251, 0.65)', fontSize: '1.05rem' }}>
                  Every great gathering is rooted in an unforgettable journey. Write your message or choose a curated dedication.
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: 32,
                  alignItems: 'center',
                }}
              >
                {/* Input Studio Column */}
                <div
                  style={{
                    padding: '32px 28px',
                    borderRadius: 24,
                    background: 'rgba(15, 19, 27, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  <div style={{ marginBottom: 20 }}>
                    <label
                      htmlFor="story-dedication"
                      style={{
                        display: 'block',
                        fontSize: 12,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'rgba(245, 247, 251, 0.6)',
                        marginBottom: 10,
                      }}
                    >
                      Story Dedication / Vow Quote
                    </label>
                    <textarea
                      id="story-dedication"
                      rows={3}
                      value={storyQuote}
                      onChange={(e) => {
                        atelierSoundscape.playTactileTick();
                        setStoryQuote(e.target.value);
                      }}
                      className="atelier-input"
                      style={{ fontSize: '1.05rem', resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 12,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'rgba(245, 247, 251, 0.6)',
                        marginBottom: 10,
                      }}
                    >
                      Curated Cinematography Art
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                      {[
                        'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80',
                        'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=600&q=80',
                        'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=600&q=80',
                      ].map((imgUrl, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            atelierSoundscape.playTactileTick();
                            setHeroImage(imgUrl);
                          }}
                          style={{
                            height: 64,
                            borderRadius: 12,
                            backgroundImage: `url(${imgUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            cursor: 'pointer',
                            border: heroImage === imgUrl ? '2px solid #D4AF37' : '1px solid rgba(255,255,255,0.1)',
                            transform: heroImage === imgUrl ? 'scale(1.05)' : 'scale(1)',
                            transition: 'all 0.25s ease',
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => advanceChapter(5)}
                      style={{
                        padding: '12px 20px',
                        borderRadius: 999,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#FAF8F5',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ← Back
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        atelierSoundscape.playHarpArpeggio();
                        advanceChapter(7);
                      }}
                      className="btn-primary"
                      style={{
                        padding: '12px 24px',
                        borderRadius: 999,
                        fontWeight: 800,
                        flex: 1,
                      }}
                    >
                      <span>Reveal The Masterpiece</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Live Rendering Canvas */}
                <div>
                  <LiveInvitationCanvas
                    names={names}
                    occasion={selectedOccasion}
                    theme={selectedTheme}
                    eventDate={eventDate}
                    venueName={venueName}
                    storyQuote={storyQuote}
                    heroImage={heroImage}
                  />
                </div>
              </div>
            </section>
          )}

          {/* =========================================================================
              SCENE 07: THE GRAND REVEAL (The Full Living Experience)
              ========================================================================= */}
          {currentChapter === 7 && (
            <section style={{ padding: '20px 0', textAlign: 'center' }}>
              <div style={{ marginBottom: 30 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: 999,
                    background: 'rgba(212, 175, 55, 0.1)',
                    border: '1px solid rgba(212, 175, 55, 0.25)',
                    color: '#F5D061',
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    marginBottom: 12,
                  }}
                >
                  <Sparkles size={13} /> Scene 07 · The Grand Reveal
                </div>
                <h2
                  style={{
                    fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
                    fontFamily: 'var(--font-display)',
                    margin: 0,
                    letterSpacing: '-0.03em',
                  }}
                >
                  Your celebration has awakened.
                </h2>
                <p style={{ marginTop: 10, color: 'rgba(245, 247, 251, 0.65)', fontSize: '1.05rem' }}>
                  Interact with the invitation below, or tap &quot;Full Guest View&quot; to test the guest portal in full-screen splendour.
                </p>
              </div>

              <div style={{ maxWidth: 760, margin: '0 auto 36px auto' }}>
                <LiveInvitationCanvas
                  names={names}
                  occasion={selectedOccasion}
                  theme={selectedTheme}
                  eventDate={eventDate}
                  venueName={venueName}
                  storyQuote={storyQuote}
                  heroImage={heroImage}
                  isInteractive
                />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14 }}>
                <button
                  type="button"
                  onClick={() => advanceChapter(6)}
                  style={{
                    padding: '14px 24px',
                    borderRadius: 999,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FAF8F5',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ← Edit Details
                </button>

                <button
                  type="button"
                  onClick={() => {
                    atelierSoundscape.playHarpArpeggio();
                    setIsGuestPreviewActive(true);
                  }}
                  style={{
                    padding: '14px 26px',
                    borderRadius: 999,
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FAF8F5',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Eye size={16} />
                  <span>Explore Full Guest Portal</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    atelierSoundscape.playHarpArpeggio();
                    advanceChapter(8);
                  }}
                  className="btn-primary"
                  style={{
                    padding: '14px 32px',
                    borderRadius: 999,
                    fontWeight: 800,
                  }}
                >
                  <span>Seal & Publish Invitation</span>
                  <ArrowRight size={17} />
                </button>
              </div>
            </section>
          )}

          {/* =========================================================================
              SCENE 08: THE SEAL & LAUNCH (Publish & Share)
              ========================================================================= */}
          {currentChapter === 8 && (
            <section
              style={{
                textAlign: 'center',
                padding: '40px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ marginBottom: 30 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: 999,
                    background: 'rgba(212, 175, 55, 0.1)',
                    border: '1px solid rgba(212, 175, 55, 0.25)',
                    color: '#F5D061',
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    marginBottom: 12,
                  }}
                >
                  <Sparkles size={13} /> Scene 08 · Seal & Launch
                </div>
                <h2
                  style={{
                    fontSize: 'clamp(2.4rem, 5.5vw, 4.2rem)',
                    fontFamily: 'var(--font-display)',
                    margin: 0,
                    letterSpacing: '-0.03em',
                  }}
                >
                  {isWaxSealed ? 'Your Celebration is Sealed & Live' : 'Affix The Royal Wax Seal'}
                </h2>
                <p style={{ marginTop: 10, color: 'rgba(245, 247, 251, 0.65)', fontSize: '1.05rem', maxWidth: 640 }}>
                  {isWaxSealed
                    ? 'Your private invitation experience has been generated on the OrbitoX edge network and is ready to enchant your guests.'
                    : 'Press the wax seal to imprint your monogram, lock cryptographic integrity, and deploy your live celebration URL.'}
                </p>
              </div>

              {/* Physical 3D Wax Seal Button */}
              <div style={{ margin: '20px 0 40px 0' }}>
                <div
                  className="wax-seal"
                  onClick={handleWaxSealClick}
                  style={{
                    width: 100,
                    height: 100,
                    animation: isWaxSealed ? 'none' : 'portalFloat 4s infinite ease-in-out',
                  }}
                >
                  <div
                    className="wax-seal-inner"
                    style={{
                      width: 82,
                      height: 82,
                      fontSize: '1.4rem',
                    }}
                  >
                    {isWaxSealed ? <Check size={36} strokeWidth={3} /> : 'SEAL'}
                  </div>
                </div>
              </div>

              {/* Post-Seal Share Suite */}
              {isWaxSealed && (
                <div
                  style={{
                    width: '100%',
                    maxWidth: 620,
                    padding: 28,
                    borderRadius: 24,
                    background: 'rgba(14, 18, 26, 0.85)',
                    border: '1px solid rgba(212, 175, 55, 0.35)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
                    textAlign: 'left',
                    marginBottom: 32,
                  }}
                >
                  <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#F5D061', marginBottom: 6 }}>
                    Live Celebration Sanctuary Link
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 16px',
                      borderRadius: 14,
                      background: 'rgba(0, 0, 0, 0.45)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      marginBottom: 20,
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        fontSize: 14,
                        color: '#FAF8F5',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {publishedUrl}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        background: isCopied ? 'rgba(143, 214, 178, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                        border: isCopied ? '1px solid rgba(143, 214, 178, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)',
                        color: isCopied ? '#9CE5C4' : '#FAF8F5',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {isCopied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{isCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                    <a
                      href={publishedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary"
                      style={{
                        padding: '12px 18px',
                        borderRadius: 12,
                        fontSize: 13,
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      <span>Visit Live Page</span>
                      <ExternalLink size={15} />
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        const shareText = `You are cordially invited to celebrate ${names}! View our digital invitation: ${publishedUrl}`;
                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
                      }}
                      style={{
                        padding: '12px 18px',
                        borderRadius: 12,
                        background: '#25D366',
                        border: 'none',
                        color: '#07090E',
                        fontSize: 13,
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        cursor: 'pointer',
                      }}
                    >
                      <Share2 size={15} />
                      <span>WhatsApp Luxury Invite</span>
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 14 }}>
                <button
                  type="button"
                  onClick={() => advanceChapter(7)}
                  style={{
                    padding: '12px 20px',
                    borderRadius: 999,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FAF8F5',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ← Return to Reveal
                </button>

                <Link
                  href="/dashboard"
                  style={{
                    padding: '12px 24px',
                    borderRadius: 999,
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FAF8F5',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span>Open Host Dashboard</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Floating Bottom Chapter Compass Navigation */}
      <AtelierChapterBar
        currentChapter={currentChapter}
        onSelectChapter={(ch) => advanceChapter(ch)}
        onToggleGuestPreview={() => setIsGuestPreviewActive(!isGuestPreviewActive)}
        isGuestPreviewActive={isGuestPreviewActive}
        isAudioMuted={isAudioMuted}
        onToggleAudio={() => {
          const muted = atelierSoundscape.toggleMute();
          setIsAudioMuted(muted);
        }}
        isCalmMode={isCalmMode}
        onToggleCalmMode={() => setIsCalmMode(!isCalmMode)}
      />
    </div>
  );
};
