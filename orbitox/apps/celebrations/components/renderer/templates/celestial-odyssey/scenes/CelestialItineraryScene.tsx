'use client';

import React, { useState } from 'react';
import { Clock, Heart, Sparkles, Disc, MapPin, Shirt, CalendarPlus, ChevronRight } from 'lucide-react';

export interface CelestialEventItem {
  time: string;
  title: string;
  venue: string;
  dressCode?: string;
  description: string;
  icon?: any;
}

interface CelestialItinerarySceneProps {
  events: CelestialEventItem[];
  protocolDressCode?: string;
  primaryAccent?: string;
  onAddEventToCalendar?: (event: CelestialEventItem) => void;
}

export function CelestialItineraryScene({
  events,
  protocolDressCode = 'Formal Elegance • Celestial Black Tie & Gilded Accents',
  primaryAccent = '#E5C07B',
  onAddEventToCalendar,
}: CelestialItinerarySceneProps) {
  const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(0);

  return (
    <section
      id="celestial-itinerary-scene"
      aria-label="Ceremonial Itinerary"
      style={{
        position: 'relative',
        padding: '120px 24px',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse 90% 50% at 50% 50%, rgba(15, 20, 40, 0.45) 0%, rgba(7, 8, 13, 0.98) 100%)',
      }}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 18px',
              borderRadius: '9999px',
              background: 'rgba(229, 192, 123, 0.08)',
              border: `1px solid ${primaryAccent}33`,
              color: primaryAccent,
              fontSize: '0.78rem',
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}
          >
            <Clock size={14} />
            <span>Order of the Stars</span>
          </div>

          <h2
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 'clamp(2.2rem, 5vw, 3.6rem)',
              fontWeight: 400,
              color: '#FFF9F5',
              margin: '0 0 16px 0',
              letterSpacing: '0.04em',
            }}
          >
            The Celestial Alignment Schedule
          </h2>

          <p
            style={{
              fontSize: 'clamp(0.92rem, 2vw, 1.08rem)',
              color: 'rgba(255, 249, 245, 0.65)',
              maxWidth: '580px',
              margin: '0 auto 24px auto',
              lineHeight: 1.6,
            }}
          >
            Each hour unfolds a distinct sacred chapter. Tap any ceremony to view etiquette and location specifics.
          </p>

          {/* Master Dress Code Banner */}
          {protocolDressCode && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 22px',
                borderRadius: '9999px',
                background: 'rgba(229, 192, 123, 0.08)',
                border: `1px solid ${primaryAccent}44`,
                color: '#FFF9F5',
                fontSize: '0.86rem',
              }}
            >
              <Shirt size={16} style={{ color: primaryAccent }} />
              <strong style={{ color: primaryAccent }}>Dress Protocol:</strong>
              <span>{protocolDressCode}</span>
            </div>
          )}
        </div>

        {/* Timeline Sequence */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Central Celestial Vertical Line */}
          <div
            style={{
              position: 'absolute',
              top: '40px',
              bottom: '40px',
              left: 'clamp(20px, 4vw, 40px)',
              width: '2px',
              background: `linear-gradient(180deg, ${primaryAccent}88 0%, rgba(229, 192, 123, 0.1) 100%)`,
              zIndex: 1,
            }}
          />

          {events.map((ev, idx) => {
            const isSelected = selectedEventIndex === idx;
            const Icon = ev.icon || Clock;

            return (
              <div
                key={idx}
                onClick={() => setSelectedEventIndex(isSelected ? null : idx)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'clamp(16px, 3vw, 32px)',
                  paddingLeft: 'clamp(0px, 2vw, 12px)',
                  cursor: 'pointer',
                  zIndex: 2,
                }}
              >
                {/* Timeline Orb Marker */}
                <div
                  style={{
                    width: 'clamp(42px, 5vw, 56px)',
                    height: 'clamp(42px, 5vw, 56px)',
                    borderRadius: '50%',
                    background: isSelected ? primaryAccent : '#0B0D18',
                    border: `2px solid ${primaryAccent}`,
                    boxShadow: isSelected ? `0 0 20px ${primaryAccent}` : '0 4px 12px rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isSelected ? '#07080D' : primaryAccent,
                    flexShrink: 0,
                    transition: 'all 0.3s ease',
                  }}
                >
                  <Icon size={20} />
                </div>

                {/* Ceremony Content Card */}
                <div
                  style={{
                    flex: 1,
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(229, 192, 123, 0.1) 0%, rgba(15, 20, 38, 0.9) 100%)'
                      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(10, 12, 22, 0.8) 100%)',
                    borderRadius: '24px',
                    border: isSelected ? `1.5px solid ${primaryAccent}` : '1px solid rgba(229, 192, 123, 0.15)',
                    padding: 'clamp(20px, 3vw, 32px)',
                    boxShadow: isSelected ? `0 12px 32px -4px ${primaryAccent}22` : '0 8px 24px rgba(0, 0, 0, 0.4)',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  {/* Top Bar: Time and Index */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '10px',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Cinzel', serif",
                        fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                        fontWeight: 600,
                        color: primaryAccent,
                        letterSpacing: '0.08em',
                      }}
                    >
                      {ev.time}
                    </span>

                    <span
                      style={{
                        fontSize: '0.72rem',
                        letterSpacing: '0.2em',
                        color: 'rgba(255, 255, 255, 0.4)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Phase 0{idx + 1}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)',
                      fontWeight: 400,
                      color: '#FFF9F5',
                      margin: '0 0 10px 0',
                    }}
                  >
                    {ev.title}
                  </h3>

                  {/* Description */}
                  <p
                    style={{
                      fontSize: 'clamp(0.9rem, 1.6vw, 1rem)',
                      color: 'rgba(255, 249, 245, 0.72)',
                      lineHeight: 1.6,
                      margin: '0 0 16px 0',
                    }}
                  >
                    {ev.description}
                  </p>

                  {/* Venue and Dress Code Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '9999px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'rgba(255, 255, 255, 0.75)',
                        fontSize: '0.78rem',
                      }}
                    >
                      <MapPin size={12} style={{ color: primaryAccent }} />
                      <span>{ev.venue}</span>
                    </div>

                    {ev.dressCode && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          borderRadius: '9999px',
                          background: 'rgba(229, 192, 123, 0.06)',
                          border: `1px solid ${primaryAccent}22`,
                          color: primaryAccent,
                          fontSize: '0.78rem',
                        }}
                      >
                        <Sparkles size={12} />
                        <span>{ev.dressCode}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
