'use client';

import React from 'react';
import { ExperienceSection, Theme } from '@orbitox-io/celebrations';
import { Calendar, Clock, MapPin, Sparkles, Mail, ArrowUpRight } from 'lucide-react';

interface Props {
  section: ExperienceSection;
  theme: Theme;
}

export function EventsScheduleSection({ section, theme }: Props) {
  const config = section.config || {};
  const title = (config.title as string) || 'Celebration Itinerary';
  const subtitle = (config.subtitle as string) || 'Join us across all festive celebrations';
  const events =
    (config.events as Array<{
      id: string;
      name: string;
      date: string;
      time: string;
      venue: string;
      dressCode?: string;
      description?: string;
    }>) || [];

  return (
    <section
      style={{
        padding: '90px 24px',
        background: theme.styleConfig.backgroundColor,
        color: theme.styleConfig.textColor,
      }}
    >
      <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
        <div
          style={{
            fontSize: '0.85rem',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            color: theme.styleConfig.primaryColor,
            marginBottom: '12px',
            fontWeight: 700,
          }}
        >
          Ceremonies & Functions
        </div>

        <h2
          style={{
            fontFamily: theme.styleConfig.fontHeading,
            fontSize: 'clamp(2.2rem, 5vw, 3.2rem)',
            color: theme.styleConfig.textColor,
            marginBottom: '16px',
          }}
        >
          {title}
        </h2>

        <p
          style={{
            fontFamily: theme.styleConfig.fontBody,
            fontSize: '1.05rem',
            color: theme.styleConfig.mutedTextColor,
            marginBottom: '60px',
          }}
        >
          {subtitle}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '30px',
            textAlign: 'left',
          }}
        >
          {events.map((evt, idx) => (
            <div
              key={evt.id || idx}
              style={{
                background: theme.styleConfig.cardBackgroundColor || 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${theme.styleConfig.primaryColor}33`,
                borderRadius: '20px',
                padding: '32px 26px',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: theme.styleConfig.primaryColor,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}
                  >
                    Event 0{idx + 1}
                  </span>
                  {evt.dressCode && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        color: theme.styleConfig.mutedTextColor,
                      }}
                    >
                      <Sparkles size={12} color={theme.styleConfig.primaryColor} />
                      <span>{evt.dressCode}</span>
                    </span>
                  )}
                </div>

                <h3
                  style={{
                    fontFamily: theme.styleConfig.fontHeading,
                    fontSize: '1.6rem',
                    color: theme.styleConfig.textColor,
                    marginBottom: '16px',
                    lineHeight: 1.25,
                  }}
                >
                  {evt.name}
                </h3>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    fontSize: '0.9rem',
                    color: theme.styleConfig.mutedTextColor,
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={15} color={theme.styleConfig.primaryColor} />
                    <span>{evt.date}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={15} color={theme.styleConfig.primaryColor} />
                    <span>{evt.time}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={15} color={theme.styleConfig.primaryColor} />
                    <span>{evt.venue}</span>
                  </div>
                </div>

                {evt.description && (
                  <p
                    style={{
                      fontFamily: theme.styleConfig.fontBody,
                      fontSize: '0.88rem',
                      lineHeight: 1.6,
                      color: theme.styleConfig.mutedTextColor,
                      borderTop: `1px solid ${theme.styleConfig.primaryColor}22`,
                      paddingTop: '16px',
                      marginBottom: '16px',
                    }}
                  >
                    {evt.description}
                  </p>
                )}

                <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <a
                    href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                      evt.name
                    )}&details=${encodeURIComponent(
                      evt.description || 'Celebration Ceremony'
                    )}&location=${encodeURIComponent(evt.venue)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: theme.styleConfig.primaryColor,
                      padding: '7px 12px',
                      borderRadius: '8px',
                      background: `${theme.styleConfig.primaryColor}18`,
                      border: `1px solid ${theme.styleConfig.primaryColor}33`,
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Calendar size={13} />
                    <span>Add to Calendar</span>
                    <ArrowUpRight size={13} />
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('organimo-rsvp-section') || document.getElementById('rsvp') || document.querySelector('[id*="rsvp"]');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#ffffff',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      background: theme.styleConfig.primaryColor,
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    <Mail size={13} />
                    <span>RSVP for Event</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
