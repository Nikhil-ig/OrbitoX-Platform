'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Compass, ChevronRight } from 'lucide-react';

interface CelestialContextualNavProps {
  primaryAccent?: string;
  enabledMomentIds?: string[];
}

const MOMENTS = [
  { id: 'moment-arrival', label: 'Arrival', subtitle: 'The Prelude' },
  { id: 'moment-souls', label: 'The Souls', subtitle: 'The Union' },
  { id: 'moment-story', label: 'Our Story', subtitle: 'The Constellation' },
  { id: 'moment-convergence', label: 'Convergence', subtitle: 'The Countdown' },
  { id: 'moment-gathering', label: 'The Gathering', subtitle: 'Sanctuary & Itinerary' },
  { id: 'moment-rsvp', label: 'Attendance', subtitle: 'Confirm Presence' },
  { id: 'moment-blessings', label: 'Blessings', subtitle: 'Living Guestbook' },
];

export function CelestialContextualNav({
  primaryAccent = '#E5C07B',
  enabledMomentIds,
}: CelestialContextualNavProps) {
  const activeMoments = React.useMemo(() => {
    if (!enabledMomentIds || enabledMomentIds.length === 0) return MOMENTS;
    return MOMENTS.filter((m) => enabledMomentIds.includes(m.id));
  }, [enabledMomentIds]);

  const [activeMomentId, setActiveMomentId] = useState('moment-arrival');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Active section observer & scroll state
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 1000);

      const scrollPos = window.scrollY + window.innerHeight * 0.45;
      for (const m of activeMoments) {
        const el = document.getElementById(m.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveMomentId(m.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [activeMoments]);

  const handleScrollTo = (id: string) => {
    setActiveMomentId(id);
    setIsDrawerOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const activeIndex = MOMENTS.findIndex((m) => m.id === activeMomentId);

  return (
    <>
      {/* 1. DESKTOP CONTEXTUAL DOTS (Quiet on the right margin) */}
      <aside
        aria-label="Chapter progression"
        className="desktop-only-flex"
        style={{
          position: 'fixed',
          right: '24px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          alignItems: 'flex-end',
          opacity: isNavVisible ? 1 : 0.2,
          transition: 'opacity 0.3s ease',
        }}
        onMouseEnter={() => setIsNavVisible(true)}
      >
        {activeMoments.map((m, idx) => {
          const isActive = activeMomentId === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => handleScrollTo(m.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                outline: 'none',
              }}
              aria-label={`Jump to ${m.label}`}
            >
              {/* Hover Tooltip label */}
              <span
                style={{
                  fontSize: '0.72rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: isActive ? primaryAccent : 'rgba(255, 255, 255, 0.4)',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.2s ease',
                }}
              >
                {m.label}
              </span>

              {/* Dot */}
              <span
                style={{
                  width: isActive ? '8px' : '5px',
                  height: isActive ? '8px' : '5px',
                  borderRadius: '50%',
                  background: isActive ? primaryAccent : 'rgba(255, 255, 255, 0.25)',
                  boxShadow: isActive ? `0 0 10px ${primaryAccent}` : 'none',
                  transition: 'all 0.3s ease',
                }}
              />
            </button>
          );
        })}
      </aside>

      {/* 2. MOBILE CONTEXTUAL PILL (Quiet, unobtrusive, auto-fades when scrolling) */}
      <div
        className="mobile-only-block"
        style={{
          position: 'fixed',
          bottom: 'calc(env(safe-area-inset-bottom, 16px) + 12px)',
          right: '16px',
          zIndex: 50,
          opacity: isScrolling ? 0 : 0.85,
          transform: isScrolling ? 'translateY(8px) scale(0.96)' : 'translateY(0) scale(1)',
          pointerEvents: isScrolling ? 'none' : 'auto',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}
      >
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '9999px',
            background: 'rgba(8, 12, 24, 0.82)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(229, 192, 123, 0.22)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            color: '#FFF9F5',
            fontSize: '0.68rem',
            cursor: 'pointer',
            minHeight: '30px',
            letterSpacing: '0.04em',
          }}
          aria-label="Open chapter index"
        >
          <span style={{ color: primaryAccent, fontWeight: 600 }}>0{activeIndex + 1}</span>
          <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>0{MOMENTS.length}</span>
          <span style={{ width: '1px', height: '8px', background: 'rgba(255,255,255,0.18)' }} />
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.62rem' }}>Index</span>
        </button>
      </div>

      {/* 3. MOBILE FULL-SCREEN CHAPTER OVERLAY (Summoned only on demand) */}
      {isDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(6, 8, 15, 0.95)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '32px 24px',
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="Close chapter index"
          >
            <X size={20} />
          </button>

          <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
            <p
              style={{
                fontSize: '0.74rem',
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: primaryAccent,
                marginBottom: '24px',
              }}
            >
              Celebration Index
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeMoments.map((m, idx) => {
                const isActive = activeMomentId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleScrollTo(m.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      borderRadius: '16px',
                      background: isActive ? 'rgba(229, 192, 123, 0.08)' : 'transparent',
                      border: isActive ? `1px solid ${primaryAccent}44` : '1px solid transparent',
                      color: isActive ? primaryAccent : '#FFF9F5',
                      cursor: 'pointer',
                      textAlign: 'left',
                      minHeight: '44px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>
                        0{idx + 1}
                      </div>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', color: isActive ? primaryAccent : '#FFF9F5' }}>
                        {m.label}
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ opacity: isActive ? 1 : 0.3 }} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .desktop-only-flex {
          display: flex !important;
        }
        .mobile-only-block {
          display: none !important;
        }

        @media (max-width: 1024px) {
          .desktop-only-flex {
            display: none !important;
          }
          .mobile-only-block {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}
