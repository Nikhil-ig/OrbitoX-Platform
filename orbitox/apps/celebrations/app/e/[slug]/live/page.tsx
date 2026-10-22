'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Heart, Sparkles, Wine, PartyPopper, Gift } from 'lucide-react';

interface LiveWish {
  id: string;
  name: string;
  message: string;
  iconType: 'toast' | 'sparkles' | 'heart' | 'party';
  time: string;
  highlight?: boolean;
}

const INITIAL_LIVE_WISHES: LiveWish[] = [
  {
    id: 'w1',
    name: 'Kabir & Simran',
    message: 'Wishing both of you a lifetime of joy, spontaneous road trips, and beautiful memories! You look stunning tonight!',
    iconType: 'toast',
    time: 'Just now',
    highlight: true,
  },
  {
    id: 'w2',
    name: 'Uncle Rajesh & Family',
    message: 'May Lord Shiva and Parvati bless this holy union with eternal happiness, prosperity, and endless laughter.',
    iconType: 'sparkles',
    time: '2m ago',
  },
  {
    id: 'w3',
    name: 'Ananya Singhania',
    message: 'The decor is straight out of a royal fairy tale! Meera, that lehenga is iconic! Congratulations to both of you!',
    iconType: 'heart',
    time: '5m ago',
    highlight: true,
  },
  {
    id: 'w4',
    name: 'Devraj Singh Rathore',
    message: 'Raising a glass to the sharpest architect and the most talented photographer! Incredible party!',
    iconType: 'toast',
    time: '8m ago',
  },
  {
    id: 'w5',
    name: 'Pooja Bhatt',
    message: 'The speech made everyone tear up! Best wedding ever! Can’t wait for the sangeet dance-offs tonight!',
    iconType: 'party',
    time: '12m ago',
  },
];

export default function VenueProjectorWallPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [wishes, setWishes] = useState<LiveWish[]>(INITIAL_LIVE_WISHES);
  const [checkedInCount, setCheckedInCount] = useState(148);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activePoll, setActivePoll] = useState({
    question: 'Who will rule the dance floor tonight?',
    groomVotes: 74,
    brideVotes: 89,
  });

  // Listen for live incoming wishes & check-ins
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'orbitox_celebration_latest_wish' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const newWish: LiveWish = {
            id: `w_${Date.now()}`,
            name: parsed.guestName || 'Loving Guest',
            message: parsed.message || 'Heartiest congratulations!',
            iconType: 'sparkles',
            time: 'Just now',
            highlight: true,
          };
          setWishes((prev) => [newWish, ...prev.slice(0, 8)]);
          setCheckedInCount((c) => c + 1);
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const totalPollVotes = activePoll.groomVotes + activePoll.brideVotes;
  const groomPct = Math.round((activePoll.groomVotes / totalPollVotes) * 100);
  const bridePct = Math.round((activePoll.brideVotes / totalPollVotes) * 100);

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 50% 20%, #17152B 0%, #08070E 60%, #030206 100%)',
        color: '#fff',
        fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
        padding: '32px 48px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient Lighting Orbs */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '20%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '15%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, rgba(0, 0, 0, 0) 70%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Header Bar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(212, 175, 55, 0.25)',
          paddingBottom: '20px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              boxShadow: '0 0 16px #10B981',
              animation: 'pulse 2s infinite',
            }}
          />
          <div>
            <div style={{ fontSize: '0.85rem', letterSpacing: '3px', color: '#D4AF37', fontWeight: 800 }}>
              ORBITOX LIVE VENUE PROJECTOR WALL
            </div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0, fontFamily: "'Cinzel', serif" }}>
              Aarav & Meera Wedding Celebration
            </h1>
          </div>
        </div>

        {/* Live Headcount & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div
            style={{
              padding: '10px 22px',
              borderRadius: '16px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '1.4rem' }}>🎉</span>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 700, textTransform: 'uppercase' }}>
                Venue Gate Check-In
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>
                {checkedInCount} Guests Arrived
              </div>
            </div>
          </div>

          <button
            onClick={toggleFullscreen}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            {isFullscreen ? 'Exit Fullscreen ⤢' : 'Expand Fullscreen ⤢'}
          </button>

          <Link
            href={`/e/${slug}`}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              background: 'rgba(212, 175, 55, 0.15)',
              border: '1px solid #D4AF37',
              color: '#D4AF37',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            ← Back to Invitation
          </Link>
        </div>
      </header>

      {/* Main Split Screen Area */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '380px 1fr',
          gap: '40px',
          margin: '32px 0',
          flex: 1,
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Left Column: Interactive QR Code & Live Audience Poll */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Giant QR Card */}
          <div
            className="glass-card"
            style={{
              padding: '32px 24px',
              borderRadius: '24px',
              textAlign: 'center',
              border: '2px solid rgba(212, 175, 55, 0.4)',
              background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.08) 0%, rgba(15, 17, 26, 0.9) 100%)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
            }}
          >
            <span
              style={{
                fontSize: '0.75rem',
                letterSpacing: '2px',
                color: '#D4AF37',
                fontWeight: 800,
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              Interactive Live Feed
            </span>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>
              Scan to Post Your Wish
            </h3>

            {/* QR Code Visual Mockup */}
            <div
              style={{
                width: '180px',
                height: '180px',
                margin: '0 auto 18px auto',
                background: '#fff',
                borderRadius: '16px',
                padding: '12px',
                boxShadow: '0 8px 30px rgba(212, 175, 55, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://celebrate.orbitox.io/e/${slug}`}
                alt="QR Code"
                style={{ width: '100%', height: '100%', borderRadius: '8px' }}
              />
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--cel-text-secondary)', marginBottom: '8px' }}>
              Aim your mobile camera to leave a blessing, vote in live polls, or send digital shagun.
            </p>
            <code style={{ fontSize: '0.8rem', color: '#D4AF37', fontWeight: 700 }}>
              celebrate.orbitox.io/e/{slug}
            </code>
          </div>

          {/* Live Audience Poll Widget */}
          <div
            className="glass-card"
            style={{
              padding: '24px',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(15, 17, 26, 0.75)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10B981', textTransform: 'uppercase' }}>
                ● LIVE AUDIENCE TRIVIA
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--cel-text-secondary)' }}>
                {totalPollVotes} Votes
              </span>
            </div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>
              {activePoll.question}
            </h4>

            {/* Team Groom */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span>🕺 Team Groom</span>
                <span style={{ fontWeight: 700 }}>{groomPct}%</span>
              </div>
              <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${groomPct}%`, background: '#3B82F6', transition: 'width 0.5s' }} />
              </div>
            </div>

            {/* Team Bride */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span>💃 Team Bride</span>
                <span style={{ fontWeight: 700 }}>{bridePct}%</span>
              </div>
              <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${bridePct}%`, background: '#EC4899', transition: 'width 0.5s' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Scrolling Wishes Waterfall */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflowY: 'hidden',
            maxHeight: 'calc(100vh - 200px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
              Live Guestbook & Stage Blessings
            </h2>
            <span style={{ fontSize: '0.85rem', color: '#D4AF37', fontWeight: 600 }}>
              Auto-Refreshing in Real Time
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {wishes.map((w, idx) => (
              <div
                key={w.id}
                className="glass-card"
                style={{
                  padding: '24px 28px',
                  borderRadius: '20px',
                  border: w.highlight
                    ? '2px solid rgba(212, 175, 55, 0.6)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  background: w.highlight
                    ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(15, 17, 26, 0.9) 100%)'
                    : 'rgba(15, 17, 26, 0.75)',
                  boxShadow: w.highlight
                    ? '0 10px 30px rgba(212, 175, 55, 0.2)'
                    : 'none',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '20px',
                  animation: idx === 0 ? 'fadeIn 0.6s ease' : 'none',
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #D4AF37 0%, #AA7C11 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#D4AF37',
                    flexShrink: 0,
                    boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)',
                  }}
                >
                  {w.iconType === 'toast' && <Wine size={24} />}
                  {w.iconType === 'sparkles' && <Sparkles size={24} />}
                  {w.iconType === 'heart' && <Heart size={24} fill="#D4AF37" />}
                  {w.iconType === 'party' && <PartyPopper size={24} />}
                </div>

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                    }}
                  >
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                      {w.name}
                    </h3>
                    <span
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--cel-text-secondary)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      {w.time}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: '1.05rem',
                      lineHeight: 1.6,
                      color: 'rgba(255, 255, 255, 0.9)',
                      margin: 0,
                      fontFamily: "'Playfair Display', serif",
                    }}
                  >
                    “{w.message}”
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Banner */}
      <footer
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          paddingTop: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.85rem',
          color: 'var(--cel-text-secondary)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div>
          Jagmandir Island Palace, Udaipur • Hosted by Aarav & Meera
        </div>
        <div>
          Powered by <strong style={{ color: '#D4AF37' }}>OrbitoX Celebrations Engine</strong> • Zero-Trust Multi-Tenancy
        </div>
      </footer>
    </main>
  );
}
