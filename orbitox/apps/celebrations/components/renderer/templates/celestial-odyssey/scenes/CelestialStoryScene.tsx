'use client';

import React, { useState } from 'react';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { MilestoneChapter } from '../CelestialOdysseyExperience';

interface CelestialStorySceneProps {
  milestones: MilestoneChapter[];
  primaryAccent?: string;
}

export function CelestialStoryScene({
  milestones,
  primaryAccent = '#E5C07B',
}: CelestialStorySceneProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeChapter = milestones[activeIndex] || milestones[0]!;

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % milestones.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + milestones.length) % milestones.length);
  };

  return (
    <section
      id="moment-story"
      aria-label="The Constellation of Our Story"
      style={{
        position: 'relative',
        padding: '120px 24px',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse 90% 70% at 50% 50%, rgba(10, 15, 34, 0.7) 0%, rgba(6, 8, 15, 0.98) 100%)',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <p
            style={{
              fontSize: '0.76rem',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: primaryAccent,
              fontWeight: 500,
              margin: '0 0 12px 0',
            }}
          >
            Milestones
          </p>

          <h2
            style={{
              fontFamily: "'Playfair Display', 'Cinzel', serif",
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 400,
              color: '#FFF9F5',
              margin: '0 0 16px 0',
              letterSpacing: '0.02em',
            }}
          >
            The Constellation of Our Story
          </h2>

          <p
            style={{
              fontSize: 'clamp(0.92rem, 1.8vw, 1.05rem)',
              color: 'rgba(255, 249, 245, 0.65)',
              maxWidth: '520px',
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            Every memory along our trajectory forms an enduring celestial alignment.
          </p>
        </div>

        {/* Constellation Star Navigator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'clamp(12px, 3vw, 24px)',
            marginBottom: '44px',
            flexWrap: 'wrap',
          }}
        >
          {milestones.map((m, idx) => {
            const isActive = activeIndex === idx;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveIndex(idx)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 18px',
                  borderRadius: '9999px',
                  background: isActive ? `linear-gradient(135deg, ${primaryAccent}22 0%, rgba(255,255,255,0.06) 100%)` : 'transparent',
                  border: isActive ? `1.5px solid ${primaryAccent}` : '1px solid rgba(255, 255, 255, 0.1)',
                  color: isActive ? '#FFF9F5' : 'rgba(255, 255, 255, 0.55)',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  minHeight: '40px',
                }}
              >
                <span style={{ color: primaryAccent }}>0{idx + 1}</span>
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Memory Composition: Image + Editorial Typography */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'clamp(32px, 4vw, 56px)',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '28px',
            padding: 'clamp(24px, 4vw, 44px)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          }}
        >
          {/* Archival Photograph Frame */}
          <div
            style={{
              position: 'relative',
              borderRadius: '20px',
              overflow: 'hidden',
              aspectRatio: '4 / 3',
              boxShadow: '0 12px 32px rgba(0,0,0,0.7)',
            }}
          >
            <img
              src={activeChapter.image}
              alt={activeChapter.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 0.6s ease',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, transparent 50%, rgba(6, 8, 15, 0.75) 100%)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '16px',
                padding: '4px 12px',
                borderRadius: '9999px',
                background: 'rgba(6, 8, 15, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#FFF9F5',
                fontSize: '0.76rem',
              }}
            >
              {activeChapter.location}
            </div>
          </div>

          {/* Narrative Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span
              style={{
                fontSize: '0.78rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: primaryAccent,
              }}
            >
              {activeChapter.chapter} • {activeChapter.year}
            </span>

            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 'clamp(1.6rem, 2.8vw, 2.2rem)',
                fontWeight: 400,
                color: '#FFF9F5',
                margin: 0,
              }}
            >
              {activeChapter.title}
            </h3>

            <p
              style={{
                fontSize: 'clamp(0.92rem, 1.8vw, 1.05rem)',
                color: 'rgba(255, 249, 245, 0.78)',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              {activeChapter.description}
            </p>

            {/* Pagination Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <button
                type="button"
                onClick={handlePrev}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 18px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFF9F5',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  minHeight: '40px',
                }}
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 18px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: `1px solid ${primaryAccent}55`,
                  color: primaryAccent,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: '40px',
                }}
              >
                <span>Next Memory</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
