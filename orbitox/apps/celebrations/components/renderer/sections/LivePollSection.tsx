'use client';

import React, { useState } from 'react';
import { ExperienceSection, Theme, EventPoll } from '@orbitox-io/celebrations';
import { Heart, Sparkles, Music, User } from 'lucide-react';

interface Props {
  section: ExperienceSection;
  theme: Theme;
  experienceId?: string;
  tenantId?: string;
}

const DEFAULT_POLLS: EventPoll[] = [
  {
    id: 'poll_1',
    question: 'Who fell in love first?',
    totalVotes: 98,
    options: [
      { id: 'opt_1', text: 'Aarav (Love at first sight!)', votes: 61, icon: 'user' },
      { id: 'opt_2', text: 'Meera (She just played it cool!)', votes: 37, icon: 'heart' },
    ],
  },
  {
    id: 'poll_2',
    question: 'Who will rule the Sangeet dance floor tonight?',
    totalVotes: 154,
    options: [
      { id: 'opt_3', text: 'Team Groom (Full Energy & Beats)', votes: 72, icon: 'music' },
      { id: 'opt_4', text: 'Team Bride (Grace & Fierce Choreography)', votes: 82, icon: 'sparkles' },
    ],
  },
];

export function LivePollSection({ section, theme, experienceId = 'demo' }: Props) {
  const cfg = section.config || {};
  const title = (cfg.title as string) || 'Celebration Trivia & Live Polls';
  const subtitle =
    (cfg.subtitle as string) || 'Cast your vote and see live audience opinions in real time!';

  const [polls, setPolls] = useState<EventPoll[]>(DEFAULT_POLLS);
  const [votedPolls, setVotedPolls] = useState<Record<string, string>>({});

  const handleVote = (pollId: string, optionId: string) => {
    if (votedPolls[pollId]) return;

    setPolls((prev) =>
      prev.map((p) => {
        if (p.id !== pollId) return p;
        return {
          ...p,
          totalVotes: p.totalVotes + 1,
          options: p.options.map((o) => (o.id === optionId ? { ...o, votes: o.votes + 1 } : o)),
        };
      })
    );

    setVotedPolls((prev) => ({ ...prev, [pollId]: optionId }));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('celebration:poll_voted', { detail: { pollId, optionId } })
      );
    }
  };

  return (
    <section
      style={{
        padding: '90px 24px',
        backgroundColor: 'rgba(5, 5, 10, 0.4)',
        position: 'relative',
      }}
    >
      <div className="container" style={{ maxWidth: '840px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <span
            style={{
              fontSize: '0.85rem',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              color: theme.styleConfig.accentColor,
              fontWeight: 700,
              display: 'inline-block',
              marginBottom: '10px',
            }}
          >
            Live Engagement & Trivia
          </span>
          <h2
            style={{
              fontFamily: theme.styleConfig.fontHeading,
              fontSize: '2.4rem',
              color: '#fff',
              marginBottom: '14px',
            }}
          >
            {title}
          </h2>
          <p
            style={{
              color: theme.styleConfig.mutedTextColor,
              fontSize: '1rem',
              maxWidth: '600px',
              margin: '0 auto',
            }}
          >
            {subtitle}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {polls.map((poll) => {
            const hasVoted = !!votedPolls[poll.id];

            return (
              <div
                key={poll.id}
                className="glass-card"
                style={{
                  padding: '32px',
                  borderRadius: '20px',
                  border: '1px solid var(--cel-border-subtle)',
                  background: 'rgba(15, 17, 26, 0.85)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px',
                  }}
                >
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                    {poll.question}
                  </h3>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: 'var(--cel-text-secondary)',
                      fontWeight: 600,
                    }}
                  >
                    {poll.totalVotes} Votes Cast
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {poll.options.map((option) => {
                    const percentage =
                      poll.totalVotes > 0
                        ? Math.round((option.votes / poll.totalVotes) * 100)
                        : 0;
                    const isSelected = votedPolls[poll.id] === option.id;

                    return (
                      <div
                        key={option.id}
                        onClick={() => handleVote(poll.id, option.id)}
                        style={{
                          position: 'relative',
                          padding: '16px 20px',
                          borderRadius: '12px',
                          border: isSelected
                            ? `2px solid ${theme.styleConfig.accentColor}`
                            : '1px solid var(--cel-border-subtle)',
                          background: 'rgba(255, 255, 255, 0.03)',
                          cursor: hasVoted ? 'default' : 'pointer',
                          overflow: 'hidden',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {/* Progress Bar Background Fill */}
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            bottom: 0,
                            width: `${percentage}%`,
                            background: isSelected
                              ? 'rgba(212, 175, 55, 0.25)'
                              : 'rgba(255, 255, 255, 0.08)',
                            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                            zIndex: 1,
                          }}
                        />

                        {/* Content */}
                        <div
                          style={{
                            position: 'relative',
                            zIndex: 2,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ color: isSelected ? theme.styleConfig.accentColor : theme.styleConfig.primaryColor, display: 'flex', alignItems: 'center' }}>
                              {option.icon === 'heart' && <Heart size={18} fill="currentColor" />}
                              {option.icon === 'user' && <User size={18} />}
                              {option.icon === 'music' && <Music size={18} />}
                              {option.icon === 'sparkles' && <Sparkles size={18} />}
                            </div>
                            <span
                              style={{
                                color: isSelected ? theme.styleConfig.accentColor : '#fff',
                                fontWeight: isSelected ? 700 : 500,
                                fontSize: '0.95rem',
                              }}
                            >
                              {option.text}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {isSelected && (
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  color: theme.styleConfig.accentColor,
                                  fontWeight: 700,
                                }}
                              >
                                Your Vote ✓
                              </span>
                            )}
                            <span
                              style={{
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: '1.05rem',
                                minWidth: '42px',
                                textAlign: 'right',
                              }}
                            >
                              {percentage}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {hasVoted && (
                  <p
                    style={{
                      marginTop: '16px',
                      fontSize: '0.8rem',
                      color: 'var(--cel-text-secondary)',
                      textAlign: 'center',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <Sparkles size={14} color={theme.styleConfig.primaryColor} />
                      <span>Thanks for voting! Your pick is synced to the live celebration wall.</span>
                    </span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
