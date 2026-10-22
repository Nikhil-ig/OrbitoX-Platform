'use client';

import React, { useState } from 'react';
import { ExperienceSection, Theme } from '@orbitox-io/celebrations';

interface Props {
  section: ExperienceSection;
  theme: Theme;
}

export function GallerySection({ section, theme }: Props) {
  const config = section.config || {};
  const title = (config.title as string) || 'Our Moments';
  const subtitle = (config.subtitle as string) || 'Portraits and candid memories from our adventures';
  const photos =
    (config.photos as Array<{
      url: string;
      caption?: string;
    }>) || [];

  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  return (
    <section
      style={{
        padding: '90px 24px',
        background: theme.styleConfig.backgroundColor,
        color: theme.styleConfig.textColor,
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
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
          Visual Memories
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
            marginBottom: '50px',
          }}
        >
          {subtitle}
        </p>

        {/* Masonry / Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
          }}
        >
          {photos.map((photo, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedPhoto(photo.url)}
              style={{
                position: 'relative',
                height: '320px',
                borderRadius: '16px',
                overflow: 'hidden',
                cursor: 'pointer',
                border: `1px solid ${theme.styleConfig.primaryColor}26`,
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                transition: 'transform 0.25s, box-shadow 0.25s',
              }}
            >
              <img
                src={photo.url}
                alt={photo.caption || `Moment ${idx + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transition: 'transform 0.4s ease',
                }}
              />
              {photo.caption && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '16px 14px',
                    background: 'linear-gradient(0deg, rgba(0,0,0,0.85) 0%, transparent 100%)',
                    color: '#fff',
                    fontSize: '0.85rem',
                    textAlign: 'left',
                  }}
                >
                  {photo.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(12px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '85vh' }}>
            <img
              src={selectedPhoto}
              alt="Expanded preview"
              style={{
                maxWidth: '100%',
                maxHeight: '85vh',
                borderRadius: '12px',
                boxShadow: '0 0 40px rgba(0,0,0,0.8)',
              }}
            />
            <button
              onClick={() => setSelectedPhoto(null)}
              style={{
                position: 'absolute',
                top: '-16px',
                right: '-16px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#fff',
                color: '#000',
                fontWeight: 700,
                fontSize: '1rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
