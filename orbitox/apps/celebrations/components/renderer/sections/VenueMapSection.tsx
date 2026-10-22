'use client';

import React, { useState } from 'react';
import { ExperienceSection, Theme } from '@orbitox-io/celebrations';
import { MapPin, Info, Navigation, ExternalLink, Check, Copy, Plane } from 'lucide-react';

interface Props {
  section: ExperienceSection;
  theme: Theme;
}

export function VenueMapSection({ section, theme }: Props) {
  const config = section.config || {};
  const venueName = (config.venueName as string) || 'Villa d\'Este & Grand Lake View';
  const address = (config.venueAddress as string) || (config.address as string) || 'Via Regina 40, 22012 Cernobbio, Lake Como, Italy';
  const venueCity = (config.venueCity as string) || 'Lake Como, Italy';
  const nearestAirport = (config.nearestAirport as string) || 'MXP • Milan Malpensa (~45 mins)';
  const transportNote =
    (config.transportNote as string) ||
    'Private boat shuttles depart every 20 minutes from Como Pier. Dedicated valet parking available at the grand gates.';

  const [copied, setCopied] = useState(false);

  const coordinates = (config.coordinates as string) || (config.coords as string) || '';
  const queryAddress = coordinates ? `${venueName}, ${coordinates}` : `${venueName}, ${address}`;
  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(queryAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryAddress)}`;
  const appleMapsUrl = `https://maps.apple.com/?q=${encodeURIComponent(queryAddress)}`;
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(queryAddress)}&navigate=yes`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`${venueName}\n${address}${coordinates ? `\nGPS: ${coordinates}` : ''}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section
      style={{
        padding: '100px 24px',
        background: theme.styleConfig.backgroundColor,
        color: theme.styleConfig.textColor,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
        <div
          style={{
            fontSize: '0.85rem',
            textTransform: 'uppercase',
            letterSpacing: '3px',
            color: theme.styleConfig.primaryColor,
            marginBottom: '12px',
            fontWeight: 800,
          }}
        >
          DESTINATION &amp; COORDINATES
        </div>

        <h2
          style={{
            fontFamily: theme.styleConfig.fontHeading,
            fontSize: 'clamp(2.2rem, 5vw, 3.4rem)',
            color: theme.styleConfig.textColor,
            marginBottom: '16px',
            lineHeight: 1.15,
          }}
        >
          Venue &amp; Satellite GPS
        </h2>

        <p
          style={{
            fontFamily: theme.styleConfig.fontBody,
            fontSize: '1.05rem',
            color: theme.styleConfig.mutedTextColor,
            maxWidth: '600px',
            margin: '0 auto 44px auto',
            lineHeight: 1.6,
          }}
        >
          Detailed navigational coordinates, interactive satellite map, and seamless transit guidance for all attending guests.
        </p>

        {/* Master Destination Card */}
        <div
          style={{
            background: theme.styleConfig.cardBackgroundColor || 'rgba(18, 24, 38, 0.75)',
            border: `1px solid ${theme.styleConfig.primaryColor}33`,
            borderRadius: '28px',
            padding: 'clamp(20px, 3.5vw, 40px)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            textAlign: 'left',
          }}
        >
          {/* Header Info */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '20px', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '16px',
                  background: `${theme.styleConfig.primaryColor}22`,
                  border: `1.5px solid ${theme.styleConfig.primaryColor}44`,
                  color: theme.styleConfig.primaryColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <MapPin size={26} color={theme.styleConfig.primaryColor} />
              </div>
              <div>
                <h3
                  style={{
                    fontFamily: theme.styleConfig.fontHeading,
                    fontSize: 'clamp(1.4rem, 3vw, 1.9rem)',
                    color: theme.styleConfig.textColor,
                    margin: '0 0 4px 0',
                  }}
                >
                  {venueName}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.95rem',
                    color: theme.styleConfig.mutedTextColor,
                  }}
                >
                  {address}
                </p>
                {coordinates && (
                  <p
                    style={{
                      margin: '4px 0 0 0',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace',
                      color: theme.styleConfig.primaryColor,
                    }}
                  >
                    📍 GPS: {coordinates}
                  </p>
                )}
              </div>
            </div>

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: copied ? '#00E68A' : theme.styleConfig.textColor,
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Address Copied!' : 'Copy Address'}</span>
            </button>
          </div>

          {/* Interactive Google Maps Embed */}
          <div
            style={{
              width: '100%',
              height: '380px',
              borderRadius: '20px',
              overflow: 'hidden',
              border: `1px solid ${theme.styleConfig.primaryColor}28`,
              marginBottom: '28px',
              position: 'relative',
              background: '#07090E',
            }}
          >
            <iframe
              title={`Interactive Map for ${venueName}`}
              src={embedUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          {/* Action Pills: Direct Navigation */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '28px',
              paddingBottom: '24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: theme.styleConfig.primaryColor, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Launch Navigation in App:
            </span>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  background: theme.styleConfig.primaryColor,
                  color: '#07090E',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  boxShadow: `0 4px 16px ${theme.styleConfig.primaryColor}40`,
                  transition: 'transform 0.2s',
                }}
              >
                <Navigation size={15} />
                <span>Google Maps</span>
                <ExternalLink size={13} />
              </a>

              <a
                href={appleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                }}
              >
                <span>Apple Maps</span>
                <ExternalLink size={13} />
              </a>

              <a
                href={wazeUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                }}
              >
                <span>Waze</span>
                <ExternalLink size={13} />
              </a>
            </div>
          </div>

          {/* Concierge & Transit Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {nearestAirport && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '14px',
                  padding: '16px 18px',
                }}
              >
                <Plane size={20} color={theme.styleConfig.primaryColor} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: theme.styleConfig.primaryColor, textTransform: 'uppercase', marginBottom: '2px' }}>
                    Nearest Air Gateway
                  </div>
                  <div style={{ fontSize: '0.9rem', color: theme.styleConfig.textColor }}>
                    {nearestAirport}
                  </div>
                </div>
              </div>
            )}

            {transportNote && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '14px',
                  padding: '16px 18px',
                }}
              >
                <Info size={20} color={theme.styleConfig.primaryColor} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: theme.styleConfig.primaryColor, textTransform: 'uppercase', marginBottom: '2px' }}>
                    Concierge &amp; Transit Advisory
                  </div>
                  <div style={{ fontSize: '0.88rem', color: theme.styleConfig.mutedTextColor, lineHeight: 1.5 }}>
                    {transportNote}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
