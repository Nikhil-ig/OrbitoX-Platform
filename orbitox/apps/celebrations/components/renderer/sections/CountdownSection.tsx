'use client';

import React, { useState, useEffect } from 'react';
import { ExperienceSection, Theme } from '@orbitox-io/celebrations';

interface Props {
  section: ExperienceSection;
  theme: Theme;
}

export function CountdownSection({ section, theme }: Props) {
  const config = section.config || {};
  const targetDateStr = (config.targetDate as string) || '2026-12-18T18:00:00';
  const title = (config.title as string) || 'Counting down to forever';

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    function calculate() {
      const difference = +new Date(targetDateStr) - +new Date();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    }
    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetDateStr]);

  const timeUnits = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hours', value: timeLeft.hours },
    { label: 'Minutes', value: timeLeft.minutes },
    { label: 'Seconds', value: timeLeft.seconds },
  ];

  return (
    <section
      style={{
        padding: '60px 24px',
        textAlign: 'center',
        background: theme.styleConfig.backgroundColor,
        color: theme.styleConfig.textColor,
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h3
          style={{
            fontFamily: theme.styleConfig.fontHeading,
            fontSize: '1.4rem',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: theme.styleConfig.primaryColor,
            marginBottom: '32px',
          }}
        >
          ⏱️ {title}
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
          }}
        >
          {timeUnits.map((u, i) => (
            <div
              key={i}
              style={{
                background: theme.styleConfig.cardBackgroundColor || 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${theme.styleConfig.primaryColor}33`,
                borderRadius: '16px',
                padding: '24px 12px',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              }}
            >
              <div
                style={{
                  fontFamily: theme.styleConfig.fontHeading,
                  fontSize: 'clamp(2rem, 4vw, 3.2rem)',
                  fontWeight: 700,
                  color: theme.styleConfig.primaryColor,
                  lineHeight: 1,
                  marginBottom: '8px',
                }}
              >
                {String(u.value).padStart(2, '0')}
              </div>
              <div
                style={{
                  fontSize: '0.78rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  color: theme.styleConfig.mutedTextColor,
                  fontWeight: 600,
                }}
              >
                {u.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
