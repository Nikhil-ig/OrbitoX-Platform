'use client';

import React, { useState } from 'react';
import { Send, Check, Gift, Copy, QrCode, Sparkles } from 'lucide-react';
import { SceneLayoutConfig, SceneMotionConfig, SceneInteractionConfig } from '@/components/studio/StudioData';

export interface CelestialWishItem {
  id: number;
  author: string;
  text: string;
  time: string;
}

interface CelestialBlessingsSceneProps {
  wishes: CelestialWishItem[];
  newWishAuthor: string;
  setNewWishAuthor: (val: string) => void;
  newWishText: string;
  setNewWishText: (val: string) => void;
  onWishSubmit: (e: React.FormEvent) => void;
  wishSentNotification: boolean;
  primaryAccent?: string;
  enableGuestbook?: boolean;
  enableShagun?: boolean;
  upiId?: string;
  shagunAmounts?: number[];
  guestbookPrompt?: string;
  shagunPrompt?: string;
  layout?: SceneLayoutConfig;
  motion?: SceneMotionConfig;
  interactions?: SceneInteractionConfig[];
}

export function CelestialBlessingsScene({
  wishes,
  newWishAuthor,
  setNewWishAuthor,
  newWishText,
  setNewWishText,
  onWishSubmit,
  wishSentNotification,
  primaryAccent = '#E5C07B',
  enableGuestbook = true,
  enableShagun = true,
  upiId = 'aarav.meera@okhdfcbank',
  shagunAmounts = [1001, 2100, 5100, 11000],
  guestbookPrompt = 'Leave a permanent wish of love to accompany our story.',
  shagunPrompt = 'For those wishing to bestow traditional shagun or auspicious blessings',
  layout,
  motion,
  interactions,
}: CelestialBlessingsSceneProps) {
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [selectedShagun, setSelectedShagun] = useState<number | null>(null);

  const handleCopyUpi = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(upiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 3000);
    }
  };

  // Dynamic layout rules (P2-7)
  const composition = layout?.composition || 'editorial';
  const paddingTop = layout?.paddingTopRem !== undefined ? `${layout.paddingTopRem}rem` : 'clamp(44px, 6vh, 68px)';
  const paddingBottom = layout?.paddingBottomRem !== undefined ? `${layout.paddingBottomRem}rem` : 'clamp(44px, 6vh, 68px)';
  const contentMaxWidth = layout?.contentMaxWidthPx !== undefined ? `${layout.contentMaxWidthPx}px` : '980px';

  // Dynamic motion config (P2-8)
  const entryDuration = motion?.entryDuration !== undefined ? `${motion.entryDuration}s` : '0.8s';
  const motionEasing = motion?.easing || 'cubic-bezier(0.16, 1, 0.3, 1)';
  const isReducedStatic = motion?.reducedMotionFallback === 'static' || motion?.reducedMotionFallback === 'instant';

  return (
    <section
      id="moment-blessings"
      aria-label="Starlight Blessing Wall & Shagun"
      style={{
        position: 'relative',
        padding: `${paddingTop} 20px ${paddingBottom}`,
        overflow: 'hidden',
        background: 'radial-gradient(ellipse 90% 70% at 50% 50%, rgba(12, 16, 36, 0.7) 0%, rgba(6, 8, 15, 0.98) 100%)',
        transition: isReducedStatic ? 'none' : `padding ${entryDuration} ${motionEasing}`,
      }}
    >
      <div style={{ maxWidth: contentMaxWidth, margin: '0 auto', position: 'relative', zIndex: 2 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(32px, 5vh, 48px)' }}>
          {/* Incoming continuity light beam from Attendance */}
          <div
            style={{
              width: '1px',
              height: '24px',
              background: `linear-gradient(180deg, transparent 0%, ${primaryAccent}66 100%)`,
              margin: '0 auto 12px',
              opacity: 0.8,
            }}
          />

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
            {enableGuestbook && enableShagun ? 'Blessings & Shagun' : enableShagun ? 'Auspicious Shagun' : 'Guestbook'}
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
            {enableGuestbook ? 'The Starlight Blessing Wall' : 'Auspicious Ceremonial Shagun'}
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
            {enableGuestbook ? guestbookPrompt : shagunPrompt}
          </p>
        </div>

        {/* 1. DIGITAL SHAGUN CARD (Module Toggle) */}
        {enableShagun && (
          <div
            style={{
              maxWidth: '640px',
              margin: '0 auto 48px auto',
              background: `linear-gradient(135deg, rgba(223, 186, 107, 0.08) 0%, rgba(13, 20, 41, 0.65) 100%)`,
              borderRadius: '24px',
              border: `1.5px solid ${primaryAccent}44`,
              padding: 'clamp(20px, 4vw, 32px)',
              boxShadow: `0 12px 36px rgba(0, 0, 0, 0.6), inset 0 0 24px ${primaryAccent}11`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `${primaryAccent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Gift size={16} color={primaryAccent} />
                </div>
                <div>
                  <strong style={{ fontSize: '1rem', color: '#FFF9F5', display: 'block' }}>Digital Shagun & Token of Love</strong>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255, 249, 245, 0.6)' }}>Zero-commission direct UPI blessing</span>
                </div>
              </div>
              <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '6px', background: `${primaryAccent}22`, color: primaryAccent, fontWeight: 700 }}>
                TRADITIONAL AUSPICIOUS
              </span>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'rgba(255, 249, 245, 0.75)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              {shagunPrompt}
            </p>

            {/* Auspicious amounts chips */}
            {shagunAmounts && shagunAmounts.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
                {shagunAmounts.map((amt) => {
                  const isSel = selectedShagun === amt;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSelectedShagun(amt)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '9999px',
                        border: isSel ? `1.5px solid ${primaryAccent}` : '1px solid rgba(255, 255, 255, 0.12)',
                        background: isSel ? `${primaryAccent}33` : 'rgba(255, 255, 255, 0.03)',
                        color: isSel ? primaryAccent : '#CBD5E1',
                        fontSize: '0.82rem',
                        fontWeight: isSel ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      ₹{amt.toLocaleString()}
                    </button>
                  );
                })}
              </div>
            )}

            {/* UPI Handle / Copy Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '12px',
                background: 'rgba(6, 8, 15, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <QrCode size={16} color={primaryAccent} />
                <code style={{ fontSize: '0.84rem', color: '#FFF9F5', fontFamily: 'monospace', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {upiId}
                </code>
              </div>

              <button
                type="button"
                onClick={handleCopyUpi}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: copiedUpi ? '#10B981' : `${primaryAccent}26`,
                  color: copiedUpi ? '#fff' : primaryAccent,
                  border: `1px solid ${copiedUpi ? '#10B981' : `${primaryAccent}55`}`,
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                }}
              >
                {copiedUpi ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedUpi ? 'Copied VPA!' : 'Copy UPI ID'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. GUESTBOOK BLESSING COMPOSER (Module Toggle) */}
        {enableGuestbook && (
          <>
            <div
              style={{
                maxWidth: '640px',
                margin: '0 auto 56px auto',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: 'clamp(20px, 4vw, 32px)',
              }}
            >
              <form onSubmit={onWishSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label
                    htmlFor="wish-author-input"
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'rgba(255, 255, 255, 0.7)',
                      marginBottom: '6px',
                    }}
                  >
                    Your Name
                  </label>
                  <input
                    id="wish-author-input"
                    type="text"
                    required
                    placeholder="e.g. Elena & Marcus"
                    value={newWishAuthor}
                    onChange={(e) => setNewWishAuthor(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFF9F5',
                      fontSize: '0.92rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="wish-text-input"
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'rgba(255, 255, 255, 0.7)',
                      marginBottom: '6px',
                    }}
                  >
                    Your Blessing
                  </label>
                  <textarea
                    id="wish-text-input"
                    required
                    rows={3}
                    placeholder="Write your heartfelt blessing..."
                    value={newWishText}
                    onChange={(e) => setNewWishText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFF9F5',
                      fontSize: '0.92rem',
                      outline: 'none',
                      resize: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!newWishAuthor.trim() || !newWishText.trim()}
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    borderRadius: '9999px',
                    background: !newWishAuthor.trim() || !newWishText.trim()
                      ? 'rgba(255, 255, 255, 0.06)'
                      : `linear-gradient(135deg, ${primaryAccent} 0%, #D4AF37 100%)`,
                    color: !newWishAuthor.trim() || !newWishText.trim() ? 'rgba(255, 255, 255, 0.3)' : '#07080D',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    border: 'none',
                    cursor: !newWishAuthor.trim() || !newWishText.trim() ? 'not-allowed' : 'pointer',
                    minHeight: '42px',
                    boxShadow: !newWishAuthor.trim() || !newWishText.trim() ? 'none' : `0 4px 18px ${primaryAccent}33`,
                    transition: 'all 0.3s ease',
                  }}
                >
                  {!(!newWishAuthor.trim() || !newWishText.trim()) && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)',
                        animation: 'celestialButtonShimmer 5s ease-in-out infinite',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                  <Send size={14} style={{ position: 'relative', zIndex: 2 }} />
                  <span style={{ position: 'relative', zIndex: 2 }}>Leave Blessing</span>
                </button>

                {wishSentNotification && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      color: '#4ADE80',
                      fontSize: '0.82rem',
                    }}
                  >
                    <Check size={15} />
                    <span>Blessing inscribed into our constellation</span>
                  </div>
                )}
              </form>
            </div>

            {/* Wishes Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
              }}
            >
              {wishes.map((w) => (
                <div
                  key={w.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '18px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    padding: '20px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
                  }}
                >
                  <p
                    style={{
                      fontSize: '0.92rem',
                      color: 'rgba(255, 249, 245, 0.8)',
                      lineHeight: 1.6,
                      margin: 0,
                      fontStyle: 'italic',
                    }}
                  >
                    “{w.text}”
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '10px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: '0.95rem',
                        color: '#FFF9F5',
                        fontWeight: 500,
                      }}
                    >
                      {w.author}
                    </span>

                    <span style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                      {w.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Transition Bridge to Departure / Farewell */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: 'clamp(36px, 6vh, 56px)' }}>
          <div className="celestial-photon-stream" style={{ width: '1px', height: '36px', background: `linear-gradient(180deg, ${primaryAccent}66 0%, ${primaryAccent} 100%)` }} />
          <div style={{ position: 'relative', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '6px 0' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FFF9F5', boxShadow: `0 0 12px ${primaryAccent}, 0 0 4px #FFF`, animation: 'celestialBeaconBreathe 3s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1px solid ${primaryAccent}55`, animation: 'celestialBeaconRingPulse 3s cubic-bezier(0.16, 1, 0.3, 1) infinite', pointerEvents: 'none' }} />
          </div>
          <span style={{ fontSize: '0.54rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: `${primaryAccent}CC`, fontWeight: 500 }}>
            FINAL BLESSING
          </span>
          <div style={{ width: '1px', height: '24px', background: `linear-gradient(180deg, ${primaryAccent} 0%, transparent 100%)`, marginTop: '6px' }} />
        </div>
      </div>
    </section>
  );
}
