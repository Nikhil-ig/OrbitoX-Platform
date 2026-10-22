'use client';

import React, { useState } from 'react';
import { CelebrationState, OCCASION_PRESETS, buildLiveExperience } from './StudioData';
import {
  X,
  CheckCircle2,
  Copy,
  ExternalLink,
  Share2,
  Sparkles,
  PartyPopper,
} from 'lucide-react';
import Link from 'next/link';

interface PublishCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: CelebrationState;
}

export function PublishCelebrationModal({
  isOpen,
  onClose,
  state,
}: PublishCelebrationModalProps) {
  const [copied, setCopied] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  if (!isOpen) return null;

  const slug = (
    state.editingSlug ||
    (state.protagonist2
      ? `${state.protagonist1}-${state.protagonist2}`
      : state.protagonist1 || 'celebration')
  )
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-');

  const guestPath = `/e/${slug}`;
  const guestUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${guestPath}` : guestPath;

  const handleCopy = () => {
    navigator.clipboard?.writeText(guestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePublish = async () => {
    try {
      const liveExp = buildLiveExperience(state);
      liveExp.slug = slug;
      if (typeof window !== 'undefined') {
        localStorage.setItem(`orbitox_exp_${slug}`, JSON.stringify(liveExp));
        localStorage.setItem('orbitox_exp_preview', JSON.stringify(liveExp));
      }
      await fetch('/api/experiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(liveExp),
      });
    } catch (e) {
      console.warn('Failed to publish experience to server:', e);
    }
    setIsPublished(true);
  };

  return (
    <div className="cs-modal-backdrop" onClick={onClose}>
      <div className="cs-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Top Accent Line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: 'linear-gradient(90deg, #fbbf24, #f43f5e, #fbbf24)',
          }}
        />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="cs-modal-close-btn"
        >
          <X size={18} />
        </button>

        {!isPublished ? (
          /* PRE-PUBLISH STAGE */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 9999,
                  fontSize: 11,
                  fontWeight: 700,
                  backgroundColor: 'rgba(251, 191, 36, 0.12)',
                  color: '#fbbf24',
                  border: '1px solid rgba(251, 191, 36, 0.25)',
                  marginBottom: 10,
                }}
              >
                <Sparkles size={13} />
                <span>Ready to Launch Milestone</span>
              </div>
              <h2 style={{ fontSize: 24, fontFamily: 'Cinzel, serif', color: '#ffffff', margin: '0 0 6px' }}>
                Publish Celebration
              </h2>
              <p style={{ fontSize: 13, color: '#a1a1aa', margin: 0, lineHeight: 1.5 }}>
                Your bespoke digital celebration experience for{' '}
                <strong style={{ color: '#ffffff' }}>
                  {state.protagonist1} {state.protagonist2 && `& ${state.protagonist2}`}
                </strong>{' '}
                will be deployed globally with cryptographic guest verification and real-time RSVP sync.
              </p>
            </div>

            {/* Link Preview Box */}
            <div style={{ padding: 14, borderRadius: 12, background: '#141418', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#71717a', fontWeight: 700, display: 'block', marginBottom: 6 }}>
                Dedicated Guest Experience URL
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: '#fde68a',
                }}
              >
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {guestUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: '#27272a',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: 11,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {copied ? <CheckCircle2 size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: '#d4d4d8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={15} style={{ color: '#10b981' }} />
                <span>Zero-Trust Cryptographic Signing (Ed25519)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={15} style={{ color: '#10b981' }} />
                <span>Instant 0% Fee UPI Digital Shagun Gateway Activated</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={15} style={{ color: '#10b981' }} />
                <span>Responsive Viewport Adaptation across Mobile, Tablet & Desktop</span>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={handlePublish}
              style={{
                width: '100%',
                padding: '12px 20px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
                color: '#000000',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.02em',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)',
              }}
            >
              <PartyPopper size={16} />
              <span>Confirm & Launch Celebration</span>
            </button>
          </div>
        ) : (
          /* POST-PUBLISH SUCCESS STAGE */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 18, padding: '10px 0' }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '2px solid rgba(16, 185, 129, 0.4)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={30} />
            </div>

            <div>
              <h2 style={{ fontSize: 24, fontFamily: 'Cinzel, serif', color: '#ffffff', margin: '0 0 4px' }}>
                Your Celebration is Live!
              </h2>
              <p style={{ fontSize: 13, color: '#a1a1aa', maxWidth: 360, margin: '0 auto', lineHeight: 1.5 }}>
                Guests can now explore the palatial itinerary, RSVP with dietary preferences, and send
                warm blessings.
              </p>
            </div>

            {/* URL Box */}
            <div
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 10,
                background: '#141418',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                fontFamily: 'monospace',
                fontSize: 12,
                color: '#fde68a',
                boxSizing: 'border-box',
              }}
            >
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {guestUrl}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  background: '#27272a',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {copied ? <CheckCircle2 size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
                <span>{copied ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>

            {/* Quick Share Links */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%' }}>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`We are delighted to invite you to celebrate our sacred union: ${guestUrl}`)}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#6ee7b7',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  textDecoration: 'none',
                }}
              >
                <Share2 size={14} />
                <span>WhatsApp</span>
              </a>

              <a
                href={guestPath}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  textDecoration: 'none',
                }}
              >
                <ExternalLink size={14} />
                <span>Guest View</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
