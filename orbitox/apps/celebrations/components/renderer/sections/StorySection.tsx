'use client';

import React from 'react';
import { ExperienceSection, Theme } from '@orbitox-io/celebrations';
import { Calendar, ArrowRight } from 'lucide-react';

interface Props {
  section: ExperienceSection;
  theme: Theme;
}

export function StorySection({ section, theme }: Props) {
  const config = section.config || {};
  const title = (config.title as string) || 'Our Journey Together';
  const subtitle = (config.subtitle as string) || 'A few chapters from our favorite story';
  const milestones =
    (config.milestones as Array<{
      year: string;
      label?: string;
      title: string;
      description: string;
      image?: string;
    }>) || [];

  return (
    <section
      style={{
        padding: '90px 24px',
        background: theme.styleConfig.backgroundColor,
        color: theme.styleConfig.textColor,
      }}
    >
      <div style={{ maxWidth: '850px', margin: '0 auto', textAlign: 'center' }}>
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
          Memories & Milestones
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

        {/* Timeline Stack */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {milestones.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '30px',
                alignItems: 'center',
                background: theme.styleConfig.cardBackgroundColor || 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${theme.styleConfig.primaryColor}26`,
                borderRadius: '20px',
                padding: '28px',
                textAlign: 'left',
                backdropFilter: 'blur(12px)',
              }}
            >
              {item.image && (
                <div
                  style={{
                    height: '220px',
                    borderRadius: '14px',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}

              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    background: `${theme.styleConfig.primaryColor}22`,
                    color: theme.styleConfig.primaryColor,
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    marginBottom: '12px',
                  }}
                >
                  {item.label ? `${item.year} • ${item.label}` : item.year}
                </span>

                <h3
                  style={{
                    fontFamily: theme.styleConfig.fontHeading,
                    fontSize: '1.6rem',
                    color: theme.styleConfig.textColor,
                    marginBottom: '10px',
                  }}
                >
                  {item.title}
                </h3>

                <p
                  style={{
                    fontFamily: theme.styleConfig.fontBody,
                    fontSize: '0.95rem',
                    lineHeight: 1.7,
                    color: theme.styleConfig.mutedTextColor,
                  }}
                >
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Interconnected CTA Link to Events */}
        <div style={{ marginTop: '54px' }}>
          <button
            type="button"
            onClick={() => {
              const el =
                document.getElementById('organimo-events-details') ||
                document.getElementById('events') ||
                document.querySelector('[id*="events"]');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '13px 30px',
              borderRadius: '9999px',
              backgroundColor: theme.styleConfig.primaryColor,
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.88rem',
              border: 'none',
              cursor: 'pointer',
              boxShadow: `0 8px 24px ${theme.styleConfig.primaryColor}40`,
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <Calendar size={15} />
            <span>View Ceremonies Itinerary</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </section>
  );
}
