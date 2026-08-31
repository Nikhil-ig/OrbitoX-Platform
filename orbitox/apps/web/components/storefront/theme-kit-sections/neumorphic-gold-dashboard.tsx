'use client';

import React, { useState } from 'react';
import { PageSection } from '@orbitox/commerce';
import {
  IconCamera,
  IconSearch,
  IconBell,
  IconHeart,
  IconTag,
  IconPlay,
  IconArrowRight,
  IconFlame,
  IconSparkles,
  IconStar,
  IconCrown,
  IconGlobe,
  IconZap,
} from '../storefront-icons';

interface NeumorphicGoldDashboardProps {
  section: PageSection;
  onSelect?: () => void;
  isSelected?: boolean;
}

export function NeumorphicGoldDashboardSection({
  section,
  onSelect,
  isSelected,
}: NeumorphicGoldDashboardProps) {
  const {
    headline = 'EXPLORE & TRANSACT',
    title = 'Live Luxury Interface Suite',
  } = section.settings || {};

  const [commentText, setCommentText] = useState('');
  const [likesCount, setLikesCount] = useState(32100);
  const [hasLiked, setHasLiked] = useState(false);
  const [activeReaction, setActiveReaction] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<'flight' | 'boat' | 'seat'>('flight');
  const [activeTab, setActiveTab] = useState<'day' | 'night'>('night');

  const toggleLike = () => {
    if (hasLiked) {
      setLikesCount((prev) => prev - 1);
      setHasLiked(false);
    } else {
      setLikesCount((prev) => prev + 1);
      setHasLiked(true);
    }
  };

  return (
    <section
      onClick={onSelect}
      style={{
        maxWidth: '1360px',
        margin: '30px auto',
        padding: '50px 30px',
        background: '#C7BBAE', // Warm Sand Backdrop matching Reference Image 1
        borderRadius: '36px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        border: isSelected ? '2px solid #EAB308' : 'none',
        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.12)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ─── 1. TOP NAVIGATION PILL BAR ─── */}
      <div
        style={{
          background: '#141519',
          borderRadius: '9999px',
          padding: '10px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '36px',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
        }}
      >
        {/* Left: Social Icons & Night Mode Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Day / Night Toggle */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab(activeTab === 'night' ? 'day' : 'night');
            }}
            style={{
              width: '46px',
              height: '24px',
              borderRadius: '9999px',
              background: '#0B0C0E',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              justifyContent: activeTab === 'night' ? 'flex-end' : 'flex-start',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FDE047, #EAB308)',
                boxShadow: '0 0 10px rgba(234, 179, 8, 0.5)',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#6B7280', alignItems: 'center' }}>
            <span style={{ cursor: 'pointer', fontWeight: 800 }}>f</span>
            <span style={{ cursor: 'pointer', display: 'flex' }}><IconCamera size={14} color="#9CA3AF" /></span>
          </div>
        </div>

        {/* Center: Integrated Search Pill with Gold Magnifier Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#1F2026',
            borderRadius: '9999px',
            padding: '3px 4px 3px 16px',
            width: '320px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <input
            type="text"
            placeholder="Search destination, tickets, metrics..."
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFF',
              fontSize: '12px',
              outline: 'none',
              flex: 1,
            }}
          />
          <button
            type="button"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #EAB308, #CA8A04)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#000',
            }}
          >
            <IconSearch size={14} color="#000" />
          </button>
        </div>

        {/* Right: Notifications Bell & Avatar with Gold Halo Ring */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#1F2026',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9CA3AF',
              cursor: 'pointer',
            }}
          >
            <IconBell size={15} color="#9CA3AF" />
          </div>

          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              border: '2px solid #EAB308',
              overflow: 'hidden',
              boxShadow: '0 0 12px rgba(234, 179, 8, 0.3)',
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop"
              alt="User Avatar"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        </div>
      </div>

      {/* ─── 2. MAIN BENTO GRID OF NEUMORPHIC CARDS ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1.3fr) minmax(0, 1fr)',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* ── COLUMN 1: Bangkok Social Story Card & Vertical Mode Switcher ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Bangkok Travel Story Card */}
          <div
            style={{
              background: '#15161B',
              borderRadius: '30px',
              padding: '16px',
              color: '#FFFFFF',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Image Preview with Floating Like & Comment Badges */}
            <div
              style={{
                position: 'relative',
                height: '180px',
                borderRadius: '22px',
                overflow: 'hidden',
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1508009603885-50cf7c579365?q=80&w=600&auto=format&fit=crop"
                alt="Bangkok Temple"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />

              {/* Floating Like & Comment Pills */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '10px',
                  display: 'flex',
                  gap: '6px',
                }}
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike();
                  }}
                  style={{
                    background: hasLiked ? 'rgba(234, 179, 8, 0.25)' : 'rgba(20, 21, 26, 0.75)',
                    border: hasLiked ? '1px solid #EAB308' : '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(8px)',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: hasLiked ? '#EAB308' : '#FFF',
                  }}
                >
                  <IconHeart size={12} filled={hasLiked} color={hasLiked ? '#EAB308' : '#FFF'} />
                  <span>{(likesCount / 1000).toFixed(1)} K</span>
                </div>

                <div
                  style={{
                    background: 'rgba(20, 21, 26, 0.75)',
                    backdropFilter: 'blur(8px)',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <IconTag size={12} color="#FFF" />
                  <span>1.4 K</span>
                </div>
              </div>
            </div>

            {/* Title & Description */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 900, margin: '2px 0 6px 0', color: '#FFF' }}>
                Bangkok
              </h3>
              <p style={{ fontSize: '11px', color: '#9CA3AF', lineHeight: 1.4, margin: 0 }}>
                The capital city of Thailand and maybe the traffic jam capital of the planet, Bangkok is a fascinating metropolis.
              </p>
            </div>

            {/* Comment Input with Send Arrow Button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#1F2129',
                borderRadius: '14px',
                padding: '4px 6px 4px 14px',
                marginTop: '4px',
              }}
            >
              <input
                type="text"
                placeholder="Leave a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#FFF',
                  fontSize: '11px',
                  outline: 'none',
                  flex: 1,
                }}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (commentText) {
                    alert(`Posted comment: "${commentText}"`);
                    setCommentText('');
                  }
                }}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '10px',
                  background: '#2B2D37',
                  border: 'none',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                ➤
              </button>
            </div>
          </div>

          {/* Bottom Row: Vertical Mode Switcher + Circular 11:30 am Dial */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            {/* Vertical Pill Switcher */}
            <div
              style={{
                background: '#15161B',
                borderRadius: '24px',
                padding: '10px 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {[
                { id: 'boat', icon: <IconGlobe size={16} /> },
                { id: 'flight', icon: <IconZap size={16} /> },
                { id: 'seat', icon: <IconStar size={16} /> },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMode(item.id as any);
                  }}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '12px',
                    background: activeMode === item.id ? '#EAB308' : '#22242D',
                    color: activeMode === item.id ? '#000' : '#EAB308',
                    border: 'none',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  {item.icon}
                </button>
              ))}
            </div>

            {/* Circular Time Widget */}
            <div
              style={{
                flex: 1,
                background: '#15161B',
                borderRadius: '28px',
                height: '110px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
              }}
            >
              {/* Gold Circular Arc Gauge */}
              <div
                style={{
                  width: '74px',
                  height: '74px',
                  borderRadius: '50%',
                  border: '4px solid #232530',
                  borderTopColor: '#EAB308',
                  borderRightColor: '#EAB308',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: 'rotate(-45deg)',
                }}
              >
                <div style={{ transform: 'rotate(45deg)', textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: 900, color: '#FFF' }}>11:30</div>
                  <div style={{ fontSize: '9px', color: '#9CA3AF' }}>am</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── COLUMN 2: Flight Booking Card, Reactions Bar & Bonus Points ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Flight / Luxury Booking Card ($420 + Moscow to Bangkok + Squircle OK button) */}
          <div
            style={{
              background: '#15161B',
              borderRadius: '28px',
              padding: '20px',
              color: '#FFFFFF',
              boxShadow: '0 20px 40px rgba(0,0, 0, 0.3)',
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '16px',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#FFF' }}>
                $ 420
              </div>
              <div style={{ fontSize: '10px', color: '#9CA3AF', marginBottom: '14px' }}>
                ✈ ticket price
              </div>

              {/* Route with Airplane Window Thumbnail */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    border: '1px solid rgba(234, 179, 8, 0.4)',
                  }}
                >
                  <img
                    src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=200&auto=format&fit=crop"
                    alt="Flight Window"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                <div style={{ fontSize: '11px', color: '#CBD5E1', lineHeight: 1.4 }}>
                  <div><span style={{ color: '#9CA3AF' }}>from</span> <strong>Moscow, SVO</strong></div>
                  <div><span style={{ color: '#9CA3AF' }}>to</span> <strong>Bangkok, BKK</strong></div>
                </div>
              </div>
            </div>

            {/* Squircle "OK" Action Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                alert('Flight Booked for $420!');
              }}
              style={{
                width: '64px',
                height: '90px',
                borderRadius: '20px',
                background: '#232530',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#EAB308',
                fontSize: '14px',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              OK
            </button>
          </div>

          {/* Reaction Bar Pill (👍 😆 😮 🔥) */}
          <div
            style={{
              background: '#15161B',
              borderRadius: '9999px',
              padding: '8px 16px',
              display: 'inline-flex',
              gap: '14px',
              alignSelf: 'center',
              boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
            }}
          >
            {[
              { icon: <IconStar size={16} color="#EAB308" filled />, val: 'star' },
              { icon: <IconHeart size={16} color="#EF4444" filled />, val: 'heart' },
              { icon: <IconFlame size={16} color="#F97316" />, val: 'fire' },
              { icon: <IconSparkles size={16} color="#EAB308" />, val: 'sparkles' },
            ].map((item, idx) => (
              <span
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveReaction(item.val);
                }}
                style={{
                  fontSize: '18px',
                  cursor: 'pointer',
                  transform: activeReaction === item.val ? 'scale(1.3)' : 'scale(1)',
                  transition: 'transform 0.15s ease',
                }}
              >
                {item.icon}
              </span>
            ))}
          </div>

          {/* Bonus Points Card (3 198 bonus points + Transactions Table) */}
          <div
            style={{
              background: '#15161B',
              borderRadius: '28px',
              padding: '20px',
              color: '#FFFFFF',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            }}
          >
            {/* Header with Arrow Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#FFF' }}>3 198</div>
                <div style={{ fontSize: '10px', color: '#9CA3AF' }}>bonus points</div>
              </div>

              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#232530',
                  color: '#EAB308',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                ➤
              </div>
            </div>

            {/* Transactions Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6B7280', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
              <span>Transactions</span>
              <span style={{ marginLeft: 'auto', marginRight: '16px' }}>Spent</span>
              <span>CashB</span>
            </div>

            {/* Transactions Rows */}
            {[
              { name: 'S7', spent: '$2 129', cash: '420' },
              { name: 'Yandex Drive', spent: '$228', cash: '27' },
              { name: 'Uber', spent: '$210', cash: '17' },
              { name: 'Starbucks', spent: '$152', cash: '14' },
            ].map((tx, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  padding: '6px 0',
                  color: '#CBD5E1',
                }}
              >
                <span style={{ fontWeight: 700 }}>{tx.name}</span>
                <span style={{ marginLeft: 'auto', marginRight: '16px', color: '#9CA3AF' }}>{tx.spent}</span>
                <span style={{ color: '#EAB308', fontWeight: 800 }}>❖ {tx.cash}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── COLUMN 3: Video Bookmark Card & 120 bpm Equalizer Card ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top 10 Places Video Bookmark Card */}
          <div
            style={{
              background: '#15161B',
              borderRadius: '28px',
              padding: '16px',
              color: '#FFFFFF',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
              position: 'relative',
            }}
          >
            {/* Top Left Floating Bookmark Badge */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: '24px',
                width: '30px',
                height: '34px',
                background: '#232530',
                borderRadius: '8px 8px 4px 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EAB308',
                zIndex: 3,
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
              }}
            >
              <IconTag size={15} color="#EAB308" />
            </div>

            {/* Video Thumbnail with Play Button */}
            <div
              style={{
                position: 'relative',
                height: '140px',
                borderRadius: '20px',
                overflow: 'hidden',
                marginTop: '10px',
                marginBottom: '10px',
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1528181304800-259b08848526?q=80&w=400&auto=format&fit=crop"
                alt="Explore Bangkok"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />

              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.85)',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <IconPlay size={14} color="#000" />
                </div>
              </div>
            </div>

            <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFF' }}>Top 10 places</div>
            <div style={{ fontSize: '10px', color: '#9CA3AF' }}>Explore Bangkok</div>
          </div>

          {/* Vital Pulse & Equalizer Bar Monitor Card (120 bpm + Gold Bars) */}
          <div
            style={{
              background: '#15161B',
              borderRadius: '28px',
              padding: '24px 20px',
              color: '#FFFFFF',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '36px', fontWeight: 900, color: '#FFF', lineHeight: 1 }}>
              120
            </div>
            <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px', marginBottom: '20px' }}>
              bmp
            </div>

            {/* Gold Vertical Equalizer Bars Graph */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                height: '70px',
                width: '100%',
                marginBottom: '16px',
              }}
            >
              {[30, 50, 75, 40, 60, 95, 80, 55, 70, 90, 45].map((val, idx) => (
                <div
                  key={idx}
                  style={{
                    width: '7px',
                    height: `${val}%`,
                    borderRadius: '9999px',
                    background: 'linear-gradient(180deg, #FDE047 0%, #CA8A04 100%)',
                    boxShadow: '0 0 8px rgba(234, 179, 8, 0.3)',
                  }}
                />
              ))}
            </div>

            {/* Bottom Dots Indicator */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <div style={{ width: '14px', height: '4px', borderRadius: '9999px', background: '#EAB308' }} />
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#374151' }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
