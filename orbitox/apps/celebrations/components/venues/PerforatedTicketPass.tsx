'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, Download, ExternalLink, Calendar, MapPin, Users, Utensils, Sparkles, Printer } from 'lucide-react';

export interface TicketPassData {
  ticketId: string;
  venueName: string;
  venueCity: string;
  venueAddress: string;
  venueImage: string;
  plannerName: string;
  eventDate: string;
  guestCount: string;
  cateringTier: string;
  price: string;
  occasion: string;
}

export function PerforatedTicketPass({
  data,
  onDesignInvitation,
}: {
  data: TicketPassData;
  onDesignInvitation?: () => void;
}) {
  const [downloaded, setDownloaded] = useState(false);

  const handlePrintOrDownload = () => {
    setDownloaded(true);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div style={{ maxWidth: '440px', margin: '0 auto' }}>
      {/* Luxury Perforated Ticket Card */}
      <div className="perforated-ticket-container">
        {/* Top Venue Photo Banner */}
        <div style={{ position: 'relative', height: '170px', overflow: 'hidden' }}>
          <img
            src={data.venueImage}
            alt={data.venueName}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%)',
            }}
          />

          {/* VIP Badge */}
          <div
            style={{
              position: 'absolute',
              top: '14px',
              left: '16px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '9999px',
              background: '#00E68A',
              color: '#071911',
              fontSize: '0.68rem',
              fontWeight: 900,
              letterSpacing: '0.5px',
            }}
          >
            <Sparkles size={12} />
            <span>CONFIRMED RESERVATION</span>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '16px',
              right: '16px',
            }}
          >
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.2 }}>
              {data.venueName}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.85)' }}>
              {data.venueCity}
            </div>
          </div>
        </div>

        {/* Middle Details Grid */}
        <div style={{ padding: '20px 24px 10px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px', fontSize: '0.85rem' }}>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                Full Name / Planner
              </div>
              <div style={{ fontWeight: 800, color: '#111827', marginTop: '2px' }}>
                {data.plannerName || 'Guest of Honor'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.68rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                Event Occasion
              </div>
              <div style={{ fontWeight: 800, color: '#111827', marginTop: '2px' }}>
                {data.occasion || 'Wedding Celebration'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.68rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                Reserved Date
              </div>
              <div style={{ fontWeight: 800, color: '#111827', marginTop: '2px' }}>
                {data.eventDate || '16 May 2027'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.68rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                Guest Capacity
              </div>
              <div style={{ fontWeight: 800, color: '#111827', marginTop: '2px' }}>
                {data.guestCount || '70 Persons'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.68rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                Catering &amp; Dining
              </div>
              <div style={{ fontWeight: 800, color: '#111827', marginTop: '2px' }}>
                {data.cateringTier || '210 Gourmet Dishes'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.68rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                Total Paid
              </div>
              <div style={{ fontWeight: 900, color: '#00A862', fontSize: '1.05rem', marginTop: '1px' }}>
                {data.price || '$6,000'}
              </div>
            </div>
          </div>
        </div>

        {/* Scalloped Perforation Tear Line (Matching the reference video) */}
        <div className="ticket-scallop-wrap">
          <div className="ticket-scallop-left" />
          <div className="ticket-dashed-line" />
          <div className="ticket-scallop-right" />
        </div>

        {/* Bottom Barcode Section */}
        <div style={{ padding: '4px 24px 24px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', fontWeight: 700 }}>
            TICKET PASS ID: {data.ticketId}
          </div>

          {/* SVG Barcode Graphic */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '3px', height: '48px', padding: '6px 12px', background: '#F9FAFB', borderRadius: '8px' }}>
            {[4, 2, 6, 2, 8, 3, 2, 5, 2, 7, 3, 2, 6, 3, 8, 2, 4, 3, 2, 5, 7, 2, 3, 6, 2, 4, 2, 8, 3, 2, 5, 2].map((w, i) => (
              <div
                key={i}
                style={{
                  width: `${w}px`,
                  height: '100%',
                  background: i % 2 === 0 ? '#111827' : 'transparent',
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: '#4B5563', letterSpacing: '3px', marginTop: '6px' }}>
            *{data.ticketId}*
          </div>
        </div>
      </div>

      {/* Action Buttons Below Pass */}
      <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          type="button"
          onClick={handlePrintOrDownload}
          className="btn-mint"
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '0.88rem',
            fontWeight: 800,
            boxShadow: '0 6px 20px rgba(0, 230, 138, 0.35)',
          }}
        >
          <Printer size={16} />
          <span>{downloaded ? 'Opening Print / PDF Pass...' : 'Print or Save Ticket Pass'}</span>
        </button>

        {onDesignInvitation && (
          <button
            type="button"
            onClick={onDesignInvitation}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              background: '#121826',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <Sparkles size={16} color="#00E68A" />
            <span>Craft Digital Invitation for this Venue</span>
          </button>
        )}
      </div>
    </div>
  );
}
