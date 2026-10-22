'use client';

import React from 'react';
import { Send, CheckCircle2, UserCheck, UserX, Plus, Minus, RotateCcw } from 'lucide-react';
import { SceneLayoutConfig, SceneMotionConfig, SceneInteractionConfig } from '@/components/studio/StudioData';

interface CelestialRsvpSceneProps {
  rsvpStatus: 'IDLE' | 'ATTENDING' | 'DECLINING';
  setRsvpStatus: (status: 'IDLE' | 'ATTENDING' | 'DECLINING') => void;
  rsvpName: string;
  setRsvpName: (val: string) => void;
  guestCount: string;
  setGuestCount: (val: string) => void;
  dietary: string;
  setDietary: (val: string) => void;
  rsvpNote: string;
  setRsvpNote: (val: string) => void;
  isSubmitted: boolean;
  setIsSubmitted: (val: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  maxGuests?: number;
  primaryAccent?: string;
  rsvpDeadline?: string;
  layout?: SceneLayoutConfig;
  motion?: SceneMotionConfig;
  interactions?: SceneInteractionConfig[];
}

export function CelestialRsvpScene({
  rsvpStatus,
  setRsvpStatus,
  rsvpName,
  setRsvpName,
  guestCount,
  setGuestCount,
  dietary,
  setDietary,
  rsvpNote,
  setRsvpNote,
  isSubmitted,
  setIsSubmitted,
  onSubmit,
  maxGuests = 4,
  primaryAccent = '#E5C07B',
  rsvpDeadline = '10 January 2027',
  layout,
  motion,
  interactions,
}: CelestialRsvpSceneProps) {
  const dietaryOptions = [
    'Chef Curated Gala',
    'Vegetarian Elegance',
    'Vegan Delights',
    'Jain Protocol',
    'Gluten-Free',
  ];

  const currentCount = parseInt(guestCount, 10) || 1;

  const handleIncrement = () => {
    if (currentCount < maxGuests) {
      setGuestCount(String(currentCount + 1));
    }
  };

  const handleDecrement = () => {
    if (currentCount > 1) {
      setGuestCount(String(currentCount - 1));
    }
  };

  // Dynamic layout rules (P2-7)
  const composition = layout?.composition || 'centered';
  const paddingTop = layout?.paddingTopRem !== undefined ? `${layout.paddingTopRem}rem` : 'clamp(44px, 6vh, 68px)';
  const paddingBottom = layout?.paddingBottomRem !== undefined ? `${layout.paddingBottomRem}rem` : 'clamp(44px, 6vh, 68px)';
  const contentMaxWidth = layout?.contentMaxWidthPx !== undefined ? `${layout.contentMaxWidthPx}px` : '680px';

  // Dynamic motion config (P2-8)
  const entryDuration = motion?.entryDuration !== undefined ? `${motion.entryDuration}s` : '0.8s';
  const motionEasing = motion?.easing || 'cubic-bezier(0.16, 1, 0.3, 1)';
  const isReducedStatic = motion?.reducedMotionFallback === 'static' || motion?.reducedMotionFallback === 'instant';

  return (
    <section
      id="moment-rsvp"
      aria-label="RSVP & Attendance Confirmation"
      style={{
        position: 'relative',
        padding: `${paddingTop} 20px ${paddingBottom}`,
        overflow: 'hidden',
        background: 'radial-gradient(ellipse 90% 70% at 50% 50%, rgba(14, 18, 40, 0.75) 0%, rgba(6, 8, 15, 0.98) 100%)',
        transition: isReducedStatic ? 'none' : `padding ${entryDuration} ${motionEasing}`,
      }}
    >
      <div style={{ maxWidth: contentMaxWidth, margin: '0 auto', position: 'relative', zIndex: 2 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(32px, 5vh, 48px)' }}>
          {/* Incoming continuity light beam from Gathering */}
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
            Attendance
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
            Will You Join Us?
          </h2>

          <p
            data-editor-node-id="lay_rsvp_decree"
            data-binding-key="rsvp.deadline"
            style={{
              fontSize: 'clamp(0.92rem, 1.8vw, 1.05rem)',
              color: 'rgba(255, 249, 245, 0.65)',
              maxWidth: '480px',
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            Kindly confirm your presence beneath the stars by {rsvpDeadline || '10 January 2027'}.
          </p>
        </div>

        {/* RSVP Card Body */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '28px',
            padding: 'clamp(24px, 4vw, 44px)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
          }}
        >
          {isSubmitted ? (
            /* Confirmation State */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '24px 0',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(229, 192, 123, 0.1)',
                  border: `1.5px solid ${primaryAccent}`,
                  boxShadow: `0 0 24px ${primaryAccent}33`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: primaryAccent,
                  marginBottom: '20px',
                }}
              >
                <CheckCircle2 size={32} />
              </div>

              <span
                style={{
                  fontSize: '0.76rem',
                  letterSpacing: '0.2em',
                  color: primaryAccent,
                  textTransform: 'uppercase',
                  fontWeight: 500,
                  marginBottom: '8px',
                }}
              >
                Response Received
              </span>

              <h3
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
                  color: '#FFF9F5',
                  margin: '0 0 10px 0',
                  fontWeight: 400,
                }}
              >
                {rsvpStatus === 'ATTENDING'
                  ? `We Await You, ${rsvpName}`
                  : `With Gratitude, ${rsvpName}`}
              </h3>

              <p
                style={{
                  fontSize: '0.94rem',
                  color: 'rgba(255, 249, 245, 0.7)',
                  maxWidth: '420px',
                  lineHeight: 1.6,
                  margin: '0 0 24px 0',
                }}
              >
                {rsvpStatus === 'ATTENDING'
                  ? `Your party of ${guestCount} has been reserved. We look forward to celebrating together beneath the stars.`
                  : 'Your warm wishes accompany us on this sacred day.'}
              </p>

              <button
                type="button"
                onClick={() => setIsSubmitted(false)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 20px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FFF9F5',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  minHeight: '40px',
                }}
              >
                <RotateCcw size={14} />
                <span>Modify Response</span>
              </button>
            </div>
          ) : (
            /* Form State */
            <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Decision Toggle */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'rgba(255, 255, 255, 0.7)',
                    marginBottom: '10px',
                  }}
                >
                  Your Intention
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setRsvpStatus('ATTENDING')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '14px',
                      borderRadius: '16px',
                      background: rsvpStatus === 'ATTENDING'
                        ? `linear-gradient(135deg, ${primaryAccent}20 0%, rgba(20, 24, 45, 0.8) 100%)`
                        : 'rgba(255, 255, 255, 0.03)',
                      border: rsvpStatus === 'ATTENDING'
                        ? `1.5px solid ${primaryAccent}`
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      color: rsvpStatus === 'ATTENDING' ? primaryAccent : '#FFF9F5',
                      fontWeight: 500,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      minHeight: '48px',
                    }}
                  >
                    <UserCheck size={16} />
                    <span>Joyfully Attending</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRsvpStatus('DECLINING')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '14px',
                      borderRadius: '16px',
                      background: rsvpStatus === 'DECLINING'
                        ? 'rgba(239, 68, 68, 0.12)'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: rsvpStatus === 'DECLINING'
                        ? '1.5px solid #EF4444'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      color: rsvpStatus === 'DECLINING' ? '#FCA5A5' : 'rgba(255, 255, 255, 0.65)',
                      fontWeight: 500,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      minHeight: '48px',
                    }}
                  >
                    <UserX size={16} />
                    <span>Regretfully Declining</span>
                  </button>
                </div>
              </div>

              {/* Guest Full Name */}
              <div>
                <label
                  htmlFor="rsvp-name-input"
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'rgba(255, 255, 255, 0.7)',
                    marginBottom: '8px',
                  }}
                >
                  Honored Guest Name(s) *
                </label>
                <input
                  id="rsvp-name-input"
                  type="text"
                  required
                  placeholder="e.g. Lord & Lady Mountbatten"
                  value={rsvpName}
                  onChange={(e) => setRsvpName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFF9F5',
                    fontSize: '0.94rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    minHeight: '44px',
                  }}
                />
              </div>

              {rsvpStatus !== 'DECLINING' && (
                <>
                  {/* Party Size Stepper */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.78rem',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'rgba(255, 255, 255, 0.7)',
                        marginBottom: '8px',
                      }}
                    >
                      Seats Reserved
                    </label>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <button
                        type="button"
                        onClick={handleDecrement}
                        disabled={currentCount <= 1}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#FFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: currentCount <= 1 ? 'not-allowed' : 'pointer',
                          opacity: currentCount <= 1 ? 0.4 : 1,
                        }}
                      >
                        <Minus size={15} />
                      </button>

                      <span
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          fontSize: '1.4rem',
                          color: primaryAccent,
                          minWidth: '32px',
                          textAlign: 'center',
                        }}
                      >
                        {guestCount}
                      </span>

                      <button
                        type="button"
                        onClick={handleIncrement}
                        disabled={currentCount >= maxGuests}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#FFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: currentCount >= maxGuests ? 'not-allowed' : 'pointer',
                          opacity: currentCount >= maxGuests ? 0.4 : 1,
                        }}
                      >
                        <Plus size={15} />
                      </button>

                      <span style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.45)' }}>
                        (Max {maxGuests})
                      </span>
                    </div>
                  </div>

                  {/* Dietary Chips */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.78rem',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'rgba(255, 255, 255, 0.7)',
                        marginBottom: '8px',
                      }}
                    >
                      Dietary Preferences
                    </label>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {dietaryOptions.map((opt) => {
                        const isSelected = dietary === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setDietary(isSelected ? '' : opt)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '9999px',
                              background: isSelected ? primaryAccent : 'rgba(255, 255, 255, 0.04)',
                              border: isSelected ? `1px solid ${primaryAccent}` : '1px solid rgba(255, 255, 255, 0.1)',
                              color: isSelected ? '#07080D' : '#FFF9F5',
                              fontSize: '0.78rem',
                              fontWeight: isSelected ? 600 : 400,
                              cursor: 'pointer',
                              minHeight: '36px',
                            }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Personal Note */}
              <div>
                <label
                  htmlFor="rsvp-note-input"
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'rgba(255, 255, 255, 0.7)',
                    marginBottom: '8px',
                  }}
                >
                  Personal Note
                </label>
                <textarea
                  id="rsvp-note-input"
                  rows={2}
                  placeholder="Share a thought or warm wish..."
                  value={rsvpNote}
                  onChange={(e) => setRsvpNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFF9F5',
                    fontSize: '0.9rem',
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!rsvpName.trim() || rsvpStatus === 'IDLE'}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '14px',
                  borderRadius: '14px',
                  background: !rsvpName.trim() || rsvpStatus === 'IDLE'
                    ? 'rgba(255, 255, 255, 0.08)'
                    : `linear-gradient(135deg, ${primaryAccent} 0%, #D4AF37 100%)`,
                  color: !rsvpName.trim() || rsvpStatus === 'IDLE' ? 'rgba(255, 255, 255, 0.3)' : '#07080D',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  border: 'none',
                  cursor: !rsvpName.trim() || rsvpStatus === 'IDLE' ? 'not-allowed' : 'pointer',
                  minHeight: '48px',
                  boxShadow: !rsvpName.trim() || rsvpStatus === 'IDLE' ? 'none' : `0 8px 24px ${primaryAccent}44`,
                  transition: 'all 0.3s ease',
                }}
              >
                {!(!rsvpName.trim() || rsvpStatus === 'IDLE') && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                      animation: 'celestialButtonShimmer 5s ease-in-out infinite',
                      pointerEvents: 'none',
                    }}
                  />
                )}
                <Send size={15} style={{ position: 'relative', zIndex: 2 }} />
                <span style={{ position: 'relative', zIndex: 2 }}>Confirm Attendance</span>
              </button>
            </form>
          )}
        </div>

        {/* Transition Bridge to Guestbook / Blessings */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: 'clamp(36px, 6vh, 56px)' }}>
          <div className="celestial-photon-stream" style={{ width: '1px', height: '36px', background: `linear-gradient(180deg, ${primaryAccent}66 0%, ${primaryAccent} 100%)` }} />
          <div style={{ position: 'relative', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '6px 0' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FFF9F5', boxShadow: `0 0 12px ${primaryAccent}, 0 0 4px #FFF`, animation: 'celestialBeaconBreathe 3s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1px solid ${primaryAccent}55`, animation: 'celestialBeaconRingPulse 3s cubic-bezier(0.16, 1, 0.3, 1) infinite', pointerEvents: 'none' }} />
          </div>
          <span style={{ fontSize: '0.54rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: `${primaryAccent}CC`, fontWeight: 500 }}>
            LEAVE YOUR BLESSINGS
          </span>
          <div style={{ width: '1px', height: '24px', background: `linear-gradient(180deg, ${primaryAccent} 0%, transparent 100%)`, marginTop: '6px' }} />
        </div>
      </div>
    </section>
  );
}
