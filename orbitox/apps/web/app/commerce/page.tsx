'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCommerceStore, useCommerceProducts, useCommerceOrders, commerceEngine, TRADITIONAL_FASHION_VERTICALS } from '@orbitox/commerce';
import { GlassCard, NeonBadge, StudioButton, StatMetricWidget, useTheme } from '@orbitox/ui';
import { LaunchWizardModal } from '@/components/onboarding/launch-wizard-modal';

export default function CommerceOverviewPage() {
  const { store } = useCommerceStore();
  const storeId = store?.id || 'store_aura_luxury';
  const { products } = useCommerceProducts(storeId);
  const { orders } = useCommerceOrders(storeId);
  const [launchWizardOpen, setLaunchWizardOpen] = useState<boolean>(false);
  const [chatReply, setChatReply] = useState<string>('');

  const analytics = commerceEngine.analytics.getStoreAnalytics(storeId);

  // Live Activity Messages (Reference 3)
  const [liveActivities, setLiveActivities] = useState([
    { id: '1', name: 'Angela Moss', time: '1m ago', text: 'Liked your bridal jutti campaign! ✨', icon: '👑', isUser: false },
    { id: '2', name: 'WhatsApp Direct Bot', time: '5m ago', text: 'New order #ORD-9821 verified via WhatsApp! 🎉', icon: '💬', isUser: false },
    { id: '3', name: 'Daniel Radcliffe', time: '37m ago', text: 'Shown how much does custom embroidered jutti cost to get started?', icon: '🧵', isUser: false },
  ]);

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatReply.trim()) return;
    setLiveActivities(prev => [
      ...prev,
      { id: Date.now().toString(), name: 'You (Store Admin)', time: 'Just now', text: chatReply, icon: '💎', isUser: true },
    ]);
    setChatReply('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: '#FFF' }}>
      {/* 1. Top HUD Bar (Reference 3) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setLaunchWizardOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #A855F7 0%, #6366F1 100%)',
              color: '#FFF',
              fontWeight: 800,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(168, 85, 247, 0.45)',
            }}
          >
            <span>+</span>
            <span>Create New Brand</span>
          </button>

          <Link
            href="/commerce/store/builder"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#FFF',
              fontWeight: 700,
              fontSize: '13px',
              textDecoration: 'none',
            }}
          >
            <span>🎨</span>
            <span>Creative Studio Builder</span>
          </Link>
        </div>

        {/* Live Radar Map Widget (Reference 3) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 16px',
            borderRadius: '12px',
            background: 'rgba(13, 15, 24, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div style={{ position: 'relative', width: '12px', height: '12px' }}>
            <span
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: '#A855F7',
                animation: 'radarPing 2s cubic-bezier(0, 0, 0.2, 1) infinite',
              }}
            />
            <span
              style={{
                position: 'absolute',
                top: '2px',
                left: '2px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#A855F7',
                boxShadow: '0 0 10px #A855F7',
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#FFF' }}>Live Traffic Radar</div>
            <div style={{ fontSize: '10px', color: '#94A3B8' }}>4 shoppers active on Punjabi Jutti store</div>
          </div>
        </div>
      </div>

      {/* 2. 3D Mascot Hero Banner (Reference 3) */}
      <div
        style={{
          position: 'relative',
          padding: '32px 36px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #18152B 0%, #0F0D1C 50%, #08070F 100%)',
          border: '1px solid rgba(168, 85, 247, 0.35)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(168, 85, 247, 0.2)',
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          alignItems: 'center',
          gap: '24px',
          overflow: 'hidden',
        }}
      >
        {/* Ambient Glow */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '10%',
            width: '250px',
            height: '250px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ zIndex: 1, maxWidth: '640px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span
              style={{
                fontSize: '11px',
                padding: '3px 10px',
                borderRadius: '999px',
                background: 'rgba(255, 107, 74, 0.2)',
                color: '#FF6B4A',
                fontWeight: 800,
                border: '1px solid rgba(255, 107, 74, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>🔥</span>
              <span>GROWTH ENGINE ACTIVE</span>
            </span>
          </div>

          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 10px 0', color: '#FFF', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
            How Traditional Fashion Sellers Scale into 8-Figure Online Brands
          </h1>
          <p style={{ fontSize: '14px', color: '#94A3B8', margin: '0 0 20px 0', lineHeight: 1.6 }}>
            Launch your ready-made Punjabi Jutti, Phulkari, or Bridal Trousseau boutique in 10 minutes. Fully integrated with bite-free guarantees, direct WhatsApp checkout, and royal design tokens.
          </p>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setLaunchWizardOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #A855F7 0%, #6366F1 100%)',
                color: '#FFF',
                fontWeight: 800,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 0 25px rgba(168, 85, 247, 0.5)',
              }}
            >
              <span>✨</span>
              <span>Launch Brand (10-Min Wizard)</span>
            </button>

            <Link
              href="/store/punjabi-jutti"
              target="_blank"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#FFF',
                fontWeight: 700,
                fontSize: '13px',
                textDecoration: 'none',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              <span>🌐</span>
              <span>View Live Jutti Store</span>
            </Link>
          </div>
        </div>

        {/* 3D Mascot / Rocket Graphic */}
        <div
          className="animate-float"
          style={{
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '84px',
            filter: 'drop-shadow(0 15px 30px rgba(168, 85, 247, 0.4))',
          }}
        >
          🚀
        </div>
      </div>

      {/* 3. Next-Gen KPI Metric Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <StatMetricWidget
          label="Gross Revenue"
          value="₹3,42,800"
          delta="+14.2%"
          deltaType="positive"
          icon={<span>🧲</span>}
          subtext="Daily volume across all channels"
          accentTone="var(--ui-accent-primary, #A855F7)"
        />
        <StatMetricWidget
          label="WhatsApp Orders"
          value="148 Orders"
          delta="+28.5%"
          deltaType="positive"
          icon={<span>💬</span>}
          subtext="1-Click direct chat conversions"
          accentTone="#10B981"
        />
        <StatMetricWidget
          label="Bite-Free Guarantee"
          value="99.4%"
          delta="+0.8%"
          deltaType="positive"
          icon={<span>👑</span>}
          subtext="Patiala memory-foam customer satisfaction"
          accentTone="#E5A93C"
        />
        <StatMetricWidget
          label="Conversion Rate"
          value="4.85%"
          delta="+1.8%"
          deltaType="positive"
          icon={<span>⚡</span>}
          subtext="Vs 2.1% traditional ecommerce average"
          accentTone="#38BDF8"
        />
      </div>

      {/* 4. Split Section: Revenue Velocity & Live Customer Activity Chat Feed (Reference 3) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
        {/* Left: 7-Day Revenue Velocity Chart */}
        <div
          className="glass-card-elevated"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 4px 0' }}>
                7-Day Revenue Velocity & D2C Conversion
              </h3>
              <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>
                Gross volume from online storefront & WhatsApp direct orders
              </p>
            </div>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10B981',
                fontSize: '11px',
                fontWeight: 800,
              }}
            >
              🟢 Realtime Live
            </span>
          </div>

          {/* Bar Velocity Chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', height: '180px', paddingTop: '20px' }}>
            {analytics.salesHistory.map((point, idx) => {
              const maxRev = 10000;
              const heightPct = Math.min(100, Math.max(20, (point.revenue || 2500 + idx * 850) / (maxRev / 100)));
              return (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    height: '100%',
                    justifyContent: 'flex-end',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: `${heightPct}%`,
                      borderRadius: '8px 8px 0 0',
                      background: idx === analytics.salesHistory.length - 1
                        ? 'linear-gradient(to top, #A855F7, #6366F1)'
                        : 'rgba(255, 255, 255, 0.08)',
                      boxShadow: idx === analytics.salesHistory.length - 1
                        ? '0 0 16px rgba(168, 85, 247, 0.4)'
                        : 'none',
                      transition: 'all 0.3s ease',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>{point.date}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Live Customer Engagement & Chat Stream (Reference 3) */}
        <div
          className="glass-card-elevated"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>💬</span>
              <span>Live Activity & WhatsApp Feed</span>
            </h3>
            <span style={{ fontSize: '11px', color: '#A855F7', fontWeight: 700 }}>Active Stream</span>
          </div>

          {/* Messages Feed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, maxHeight: '220px', overflowY: 'auto' }}>
            {liveActivities.map((act) => (
              <div
                key={act.id}
                style={{
                  padding: '10px 12px',
                  borderRadius: '12px',
                  background: act.isUser ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: act.isUser ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px' }}>{act.icon}</span>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#FFF' }}>{act.name}</span>
                  </div>
                  <span style={{ fontSize: '10px', color: '#64748B' }}>{act.time}</span>
                </div>
                <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>{act.text}</p>
              </div>
            ))}
          </div>

          {/* Direct Response Input Form (Reference 3) */}
          <form onSubmit={handleSendReply} style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
            <input
              type="text"
              placeholder="Type a response..."
              value={chatReply}
              onChange={(e) => setChatReply(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '10px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#FFF',
                fontSize: '12px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #A855F7, #6366F1)',
                border: 'none',
                color: '#FFF',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              ➤
            </button>
          </form>
        </div>
      </div>

      {/* Traditional Fashion Launch Wizard Modal */}
      <LaunchWizardModal
        isOpen={launchWizardOpen}
        onClose={() => setLaunchWizardOpen(false)}
        onStoreCreated={(newSlug) => {
          window.location.href = `/store/${newSlug}`;
        }}
      />
    </div>
  );
}
