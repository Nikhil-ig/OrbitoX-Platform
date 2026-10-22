'use client';

import React, { useState } from 'react';
import { ExperienceSection, Theme, RsvpStatus } from '@orbitox-io/celebrations';
import { CheckCircle2, Heart, Sparkles, XCircle } from 'lucide-react';

interface Props {
  section: ExperienceSection;
  theme: Theme;
  experienceId?: string;
  tenantId?: string;
}

export function RsvpSection({ section, theme, experienceId, tenantId }: Props) {
  const config = section.config || {};
  const title = (config.title as string) || 'Will you join us?';
  const subtitle =
    (config.subtitle as string) ||
    'Kindly RSVP by November 20, 2026 so we can reserve your seat.';
  const askDietary = (config.askDietary as boolean) ?? true;
  const askPlusOne = (config.askPlusOne as boolean) ?? true;

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    guestName: '',
    email: '',
    phone: '',
    attending: 'ATTENDING' as RsvpStatus,
    partySize: 1,
    plusOneName: '',
    dietaryRequirements: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        experienceId: experienceId || 'default',
        tenantId: tenantId || 'tenant_default',
      };

      await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Broadcast real-time update across browser tabs for host dashboard
      try {
        localStorage.setItem(
          'orbitox_celebration_latest_rsvp',
          JSON.stringify({
            ...payload,
            id: `g_${Date.now()}`,
            date: 'Just now',
          })
        );
        window.dispatchEvent(
          new CustomEvent('celebration:rsvp_received', { detail: payload })
        );
      } catch {
        // Safe fallback if storage unavailable
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <section
      style={{
        padding: '90px 24px',
        background: theme.styleConfig.backgroundColor,
        color: theme.styleConfig.textColor,
      }}
    >
      <div style={{ maxWidth: '650px', margin: '0 auto', textAlign: 'center' }}>
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
          Response Requested
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
            marginBottom: '40px',
          }}
        >
          {subtitle}
        </p>

        <div
          style={{
            background: theme.styleConfig.cardBackgroundColor || 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${theme.styleConfig.primaryColor}33`,
            borderRadius: '24px',
            padding: '40px 32px',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 12px 36px rgba(0,0,0,0.3)',
            textAlign: 'left',
          }}
        >
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: `${theme.styleConfig.primaryColor}26`,
                  color: theme.styleConfig.primaryColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px auto',
                }}
              >
                <CheckCircle2 size={34} color={theme.styleConfig.primaryColor} />
              </div>
              <h3
                style={{
                  fontFamily: theme.styleConfig.fontHeading,
                  fontSize: '1.8rem',
                  marginBottom: '10px',
                  color: theme.styleConfig.primaryColor,
                }}
              >
                RSVP Received!
              </h3>
              <p style={{ color: theme.styleConfig.mutedTextColor, lineHeight: 1.6, marginBottom: '24px' }}>
                Thank you, <strong>{formData.guestName}</strong>. Your response has been recorded.
                We can&apos;t wait to celebrate together!
              </p>

              {/* Interconnected CTA Link to Guestbook */}
              <button
                type="button"
                onClick={() => {
                  const el =
                    document.getElementById('organimo-thank-you') ||
                    document.getElementById('guestbook') ||
                    document.querySelector('[id*="guestbook"]') ||
                    document.querySelector('[id*="wishes"]');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '11px 24px',
                  backgroundColor: theme.styleConfig.primaryColor,
                  color: '#ffffff',
                  borderRadius: '9999px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: `0 4px 16px ${theme.styleConfig.primaryColor}40`,
                  transition: 'transform 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <Heart size={15} fill="#ffffff" />
                <span>Leave a Message in the Guestbook</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '6px',
                    color: theme.styleConfig.textColor,
                  }}
                >
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Malhotra"
                  value={formData.guestName}
                  onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'rgba(0,0,0,0.35)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff',
                    fontSize: '0.95rem',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginBottom: '6px',
                      color: theme.styleConfig.textColor,
                    }}
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="vikram@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      background: 'rgba(0,0,0,0.35)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginBottom: '6px',
                      color: theme.styleConfig.textColor,
                    }}
                  >
                    WhatsApp / Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      background: 'rgba(0,0,0,0.35)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: theme.styleConfig.textColor,
                  }}
                >
                  Will you be attending? *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, attending: 'ATTENDING' })}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border:
                        formData.attending === 'ATTENDING'
                          ? `2px solid ${theme.styleConfig.primaryColor}`
                          : '1px solid rgba(255,255,255,0.12)',
                      background:
                        formData.attending === 'ATTENDING'
                          ? `${theme.styleConfig.primaryColor}22`
                          : 'rgba(0,0,0,0.25)',
                      color:
                        formData.attending === 'ATTENDING'
                          ? theme.styleConfig.primaryColor
                          : theme.styleConfig.mutedTextColor,
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <Sparkles size={16} />
                    <span>Joyfully Accept</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, attending: 'DECLINED' })}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border:
                        formData.attending === 'DECLINED'
                          ? '2px solid #EF4444'
                          : '1px solid rgba(255,255,255,0.12)',
                      background:
                        formData.attending === 'DECLINED'
                          ? 'rgba(239, 68, 68, 0.15)'
                          : 'rgba(0,0,0,0.25)',
                      color: formData.attending === 'DECLINED' ? '#EF4444' : theme.styleConfig.mutedTextColor,
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <XCircle size={16} />
                    <span>Regretfully Decline</span>
                  </button>
                </div>
              </div>

              {formData.attending === 'ATTENDING' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          marginBottom: '6px',
                          color: theme.styleConfig.textColor,
                        }}
                      >
                        Total Party Size
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.partySize}
                        onChange={(e) => setFormData({ ...formData, partySize: parseInt(e.target.value) || 1 })}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          background: 'rgba(0,0,0,0.35)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: '#fff',
                          fontSize: '0.95rem',
                        }}
                      />
                    </div>
                    {askPlusOne && (
                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            marginBottom: '6px',
                            color: theme.styleConfig.textColor,
                          }}
                        >
                          Guest / Plus-One Name(s)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Priya Malhotra"
                          value={formData.plusOneName}
                          onChange={(e) => setFormData({ ...formData, plusOneName: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            background: 'rgba(0,0,0,0.35)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#fff',
                            fontSize: '0.95rem',
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {askDietary && (
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          marginBottom: '6px',
                          color: theme.styleConfig.textColor,
                        }}
                      >
                        Dietary Preferences
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Jain Vegetarian, Vegan, Nut allergy, etc."
                        value={formData.dietaryRequirements}
                        onChange={(e) => setFormData({ ...formData, dietaryRequirements: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          background: 'rgba(0,0,0,0.35)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: '#fff',
                          fontSize: '0.95rem',
                        }}
                      />
                    </div>
                  )}
                </>
              )}

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '6px',
                    color: theme.styleConfig.textColor,
                  }}
                >
                  Personal Message to the Celebrants
                </label>
                <textarea
                  rows={3}
                  placeholder="Share warm wishes, memories, or words of blessing..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'rgba(0,0,0,0.35)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  background: theme.styleConfig.primaryColor,
                  color: '#07090E',
                  fontWeight: 700,
                  fontSize: '1rem',
                  border: 'none',
                  cursor: loading ? 'wait' : 'pointer',
                  boxShadow: `0 4px 20px ${theme.styleConfig.primaryColor}55`,
                  marginTop: '10px',
                }}
              >
                {loading ? 'Submitting RSVP...' : 'Confirm RSVP →'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
