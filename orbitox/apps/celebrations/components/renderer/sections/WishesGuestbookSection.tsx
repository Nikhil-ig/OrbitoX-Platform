'use client';

import React, { useState, useEffect } from 'react';
import { ExperienceSection, Theme } from '@orbitox-io/celebrations';
import { Heart, Sparkles, Wine, ThumbsUp, Send, MessageCircle } from 'lucide-react';

interface Props {
  section: ExperienceSection;
  theme: Theme;
  experienceId?: string;
  tenantId?: string;
}

export interface Wish {
  id: string;
  name: string;
  message: string;
  date: string;
  reactions: Record<string, number>;
}

export function WishesGuestbookSection({ section, theme, experienceId, tenantId }: Props) {
  const config = section.config || {};
  const title = (config.title as string) || 'Warm Wishes & Guestbook';
  const subtitle =
    (config.subtitle as string) || 'Leave your love, blessings, and memorable advice for the couple';

  // Dynamic derivation of host names and venue from config
  const hostNames = (config.hostNames as string) || 'the celebrating couple';
  const venueCity = (config.venueCity as string) || (config.venueName as string) || '';

  const storageKey = `orbitox_wishes_${experienceId || 'default'}`;

  // Generate dynamic contextual sample wishes based on real experience data
  const getDynamicDefaultWishes = (): Wish[] => {
    return [
      {
        id: 'w_default_1',
        name: 'Kabir & Ananya',
        message: `Wishing ${hostNames} a lifetime of shared sunsets, boundless laughter, and endless adventures together!`,
        date: '2 hours ago',
        reactions: { heart: 14, toast: 8, sparkles: 5 },
      },
      {
        id: 'w_default_2',
        name: 'Sanjay Uncle & Family',
        message: `May God bless your sacred journey with peace, harmony, and prosperity${venueCity ? ` in ${venueCity}` : ''}!`,
        date: 'Yesterday',
        reactions: { heart: 18, thumbs: 14, sparkles: 9 },
      },
      {
        id: 'w_default_3',
        name: 'College Best Friends',
        message: `So thrilled to celebrate this milestone together with ${hostNames}! Counting down every moment!`,
        date: '2 days ago',
        reactions: { thumbs: 22, toast: 15, heart: 11 },
      },
    ];
  };

  // Initialize wishes dynamically from config, storage, or dynamic fallback
  const [wishes, setWishes] = useState<Wish[]>(() => {
    if (config.wishes && Array.isArray(config.wishes) && config.wishes.length > 0) {
      return config.wishes as Wish[];
    }
    return getDynamicDefaultWishes();
  });

  const [authorName, setAuthorName] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync with localStorage & remote /api/wishes on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check localStorage first
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWishes(parsed);
          return;
        }
      }
    } catch {}

    // Fetch from API to check for any existing server-side wishes
    fetch(`/api/wishes?experienceId=${encodeURIComponent(experienceId || 'default')}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.wishes) && data.wishes.length > 0) {
          const apiWishes: Wish[] = data.wishes.map((w: any) => ({
            id: w.id,
            name: w.guestName,
            message: w.message,
            date: w.date || 'Recently',
            reactions: w.reactions || { heart: 1 },
          }));
          setWishes((prev) => {
            const combined = [...apiWishes, ...prev.filter((p) => !apiWishes.some((a) => a.id === p.id))];
            try {
              localStorage.setItem(storageKey, JSON.stringify(combined));
            } catch {}
            return combined;
          });
        }
      })
      .catch(() => {});
  }, [storageKey, experienceId]);

  const handlePostWish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !message.trim()) return;

    setIsSubmitting(true);

    const newWish: Wish = {
      id: `wish_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: authorName.trim(),
      message: message.trim(),
      date: 'Just now',
      reactions: { heart: 1 },
    };

    // Optimistic UI update
    const updatedWishes = [newWish, ...wishes];
    setWishes(updatedWishes);
    setAuthorName('');
    setMessage('');

    // Persist to localStorage
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedWishes));
    } catch {}

    // Post to backend API
    try {
      await fetch('/api/wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: newWish.name,
          message: newWish.message,
          experienceId: experienceId || 'default',
          tenantId: tenantId || 'tenant_default',
        }),
      });
    } catch (err) {
      console.warn('Wishes API offline, saved locally to guest device:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReaction = (wishId: string, reactionKey: string) => {
    setWishes((prev) => {
      const updated = prev.map((w) => {
        if (w.id !== wishId) return w;
        const currentCount = w.reactions[reactionKey] || 0;
        return {
          ...w,
          reactions: {
            ...w.reactions,
            [reactionKey]: currentCount + 1,
          },
        };
      });

      // Persist reaction update
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}

      return updated;
    });
  };

  return (
    <section
      style={{
        padding: '90px 24px',
        background: theme.styleConfig.backgroundColor,
        color: theme.styleConfig.textColor,
      }}
    >
      <div style={{ maxWidth: '950px', margin: '0 auto', textAlign: 'center' }}>
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
          Virtual Guestbook
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

        {/* Input Card */}
        <div
          style={{
            background: theme.styleConfig.cardBackgroundColor || 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${theme.styleConfig.primaryColor}33`,
            borderRadius: '20px',
            padding: '32px 28px',
            backdropFilter: 'blur(16px)',
            marginBottom: '50px',
            textAlign: 'left',
          }}
        >
          <form onSubmit={handlePostWish} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <input
                type="text"
                required
                placeholder="Your Name (e.g. Diya Sengupta)"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  fontSize: '0.95rem',
                }}
              />
            </div>

            <textarea
              rows={3}
              required
              placeholder="Write your blessings, memory, or love note..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
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

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: '12px 26px',
                  borderRadius: '10px',
                  background: theme.styleConfig.primaryColor,
                  color: '#07090E',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  border: 'none',
                  cursor: isSubmitting ? 'wait' : 'pointer',
                  boxShadow: `0 4px 16px ${theme.styleConfig.primaryColor}44`,
                }}
              >
                {isSubmitting ? (
                  'Posting...'
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span>Post Blessing</span>
                    <Heart size={14} fill="#07090E" />
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Wishes Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            textAlign: 'left',
          }}
        >
          {wishes.map((w) => (
            <div
              key={w.id}
              style={{
                background: theme.styleConfig.cardBackgroundColor || 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${theme.styleConfig.primaryColor}22`,
                borderRadius: '16px',
                padding: '24px',
                backdropFilter: 'blur(12px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <p
                style={{
                  fontFamily: theme.styleConfig.fontBody,
                  fontSize: '0.95rem',
                  lineHeight: 1.6,
                  color: theme.styleConfig.textColor,
                  marginBottom: '16px',
                  fontStyle: 'italic',
                }}
              >
                &ldquo;{w.message}&rdquo;
              </p>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  {[
                    { key: 'heart', label: 'Love', Icon: Heart },
                    { key: 'toast', label: 'Cheers', Icon: Wine },
                    { key: 'thumbs', label: 'Bless', Icon: ThumbsUp },
                    { key: 'sparkles', label: 'Magic', Icon: Sparkles },
                  ].map(({ key, Icon }) => {
                    const count = w.reactions[key] || 0;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleReaction(w.id, key)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          background: count > 0 ? `${theme.styleConfig.primaryColor}18` : 'rgba(255,255,255,0.06)',
                          border: count > 0 ? `1px solid ${theme.styleConfig.primaryColor}44` : '1px solid rgba(255,255,255,0.1)',
                          color: count > 0 ? theme.styleConfig.primaryColor : theme.styleConfig.mutedTextColor,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'transform 0.15s ease',
                        }}
                      >
                        <Icon size={12} />
                        {count > 0 && <span>{count}</span>}
                      </button>
                    );
                  })}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    paddingTop: '12px',
                    fontSize: '0.8rem',
                  }}
                >
                  <span style={{ fontWeight: 700, color: theme.styleConfig.primaryColor }}>
                    {w.name}
                  </span>
                  <span style={{ color: theme.styleConfig.mutedTextColor }}>
                    {w.date}
                  </span>
                </div>
              </div>
          ))}
        </div>
      </div>
    </section>
  );
}
