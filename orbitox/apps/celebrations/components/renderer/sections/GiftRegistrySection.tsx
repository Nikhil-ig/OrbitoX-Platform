'use client';

import React, { useState } from 'react';
import { ExperienceSection, Theme, ShagunContribution } from '@orbitox-io/celebrations';
import { Plane, Home, Sparkles, CheckCircle2, Heart, Gift, Send } from 'lucide-react';

interface Props {
  section: ExperienceSection;
  theme: Theme;
  experienceId?: string;
  tenantId?: string;
}

export function GiftRegistrySection({ section, theme, experienceId = 'demo', tenantId = 'tenant_demo' }: Props) {
  const cfg = section.config || {};
  const title = (cfg.title as string) || 'Blessings & Digital Shagun';
  const subtitle =
    (cfg.subtitle as string) ||
    'Your presence and warm blessings are our greatest treasure. For those wishing to honor us with a gesture:';

  const [selectedFund, setSelectedFund] = useState<'honeymoon' | 'new_home' | 'blessing'>('honeymoon');
  const [selectedAmount, setSelectedAmount] = useState<number>(2100);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [guestName, setGuestName] = useState<string>('');
  const [blessingNote, setBlessingNote] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successData, setSuccessData] = useState<ShagunContribution | null>(null);

  const amounts = [501, 1100, 2100, 5100, 11000];

  const funds = [
    {
      id: 'honeymoon' as const,
      title: 'Honeymoon in Amalfi Coast Fund',
      Icon: Plane,
      desc: 'Help us create unforgettable memories in Italy',
      progress: 68,
    },
    {
      id: 'new_home' as const,
      title: 'Our First Home Sanctuary Fund',
      Icon: Home,
      desc: 'Contributing towards cozy rugs, books, and plants',
      progress: 42,
    },
    {
      id: 'blessing' as const,
      title: 'Traditional Shagun & Ashirwad',
      Icon: Sparkles,
      desc: 'Warm financial blessings and prayers for prosperity',
      progress: 89,
    },
  ];

  const currentAmount = customAmount ? parseInt(customAmount, 10) || 0 : selectedAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      alert('Please enter your name to accompany your blessing.');
      return;
    }
    if (currentAmount <= 0) {
      alert('Please select or enter a valid amount.');
      return;
    }

    setIsProcessing(true);

    const contribution: ShagunContribution = {
      id: `shg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      experienceId,
      tenantId,
      contributorName: guestName.trim(),
      amount: currentAmount,
      currency: 'INR',
      fundType: selectedFund,
      blessingNote: blessingNote.trim() || 'May your journey together be filled with boundless joy and light!',
      paymentMethod,
      transactionRef: `OX-TXN-${Date.now()}`,
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
    };

    try {
      await fetch('/api/shagun', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contribution),
      });
    } catch {
      // Fallback local storage
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('orbitox_celebration_latest_shagun', JSON.stringify(contribution));
      window.dispatchEvent(
        new CustomEvent('celebration:shagun_received', { detail: contribution })
      );
    }

    setIsProcessing(false);
    setSuccessData(contribution);
  };

  return (
    <section
      style={{
        padding: '90px 24px',
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
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
            Digital Gifting & Shagun
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
              lineHeight: 1.6,
            }}
          >
            {subtitle}
          </p>
        </div>

        {/* Success Modal / Card */}
        {successData ? (
          <div
            className="glass-card"
            style={{
              padding: '44px 32px',
              textAlign: 'center',
              borderRadius: '24px',
              border: `2px solid ${theme.styleConfig.accentColor}`,
              background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.12) 0%, rgba(10, 10, 15, 0.95) 100%)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: `${theme.styleConfig.primaryColor}22`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: theme.styleConfig.primaryColor,
                  boxShadow: `0 0 25px ${theme.styleConfig.primaryColor}44`,
                }}
              >
                <CheckCircle2 size={36} />
              </div>
            </div>
            <h3
              style={{
                fontFamily: theme.styleConfig.fontHeading,
                fontSize: '2rem',
                color: '#fff',
                marginBottom: '12px',
              }}
            >
              Thank You, {successData.contributorName}!
            </h3>
            <p
              style={{
                color: theme.styleConfig.mutedTextColor,
                fontSize: '1.05rem',
                maxWidth: '520px',
                margin: '0 auto 24px auto',
              }}
            >
              Your generous blessing of <strong style={{ color: theme.styleConfig.accentColor }}>₹{successData.amount.toLocaleString('en-IN')}</strong> towards the <em>{funds.find(f => f.id === successData.fundType)?.title}</em> has been warmly received by the hosts.
            </p>

            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                display: 'inline-block',
                marginBottom: '28px',
                fontSize: '0.85rem',
                color: 'var(--cel-text-secondary)',
              }}
            >
              Transaction Ref: <code style={{ color: '#fff' }}>{successData.transactionRef}</code> • Powered by OrbitoX Commerce
            </div>

            <br />
            <button
              onClick={() => {
                setSuccessData(null);
                setGuestName('');
                setBlessingNote('');
                setCustomAmount('');
              }}
              className="btn-primary"
              style={{ padding: '12px 28px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Heart size={16} />
              <span>Send Another Blessing</span>
            </button>
          </div>
        ) : (
          <div
            className="glass-card"
            style={{
              padding: '36px',
              borderRadius: '24px',
              border: '1px solid var(--cel-border-subtle)',
              background: 'rgba(15, 17, 26, 0.85)',
            }}
          >
            <form onSubmit={handleSubmit}>
              {/* Step 1: Select Fund */}
              <div style={{ marginBottom: '28px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: '#fff',
                    marginBottom: '12px',
                  }}
                >
                  1. Choose Celebration Registry Fund:
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '14px',
                  }}
                >
                  {funds.map((f) => {
                    const isSelected = selectedFund === f.id;
                    return (
                      <div
                        key={f.id}
                        onClick={() => setSelectedFund(f.id)}
                        style={{
                          padding: '18px 16px',
                          borderRadius: '14px',
                          border: isSelected
                            ? `2px solid ${theme.styleConfig.accentColor}`
                            : '1px solid var(--cel-border-subtle)',
                          background: isSelected
                            ? 'rgba(212, 175, 55, 0.12)'
                            : 'rgba(255, 255, 255, 0.03)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div style={{ marginBottom: '10px', color: theme.styleConfig.primaryColor, display: 'flex', alignItems: 'center' }}>
                          <f.Icon size={24} />
                        </div>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                          {f.title}
                        </h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--cel-text-secondary)', marginBottom: '10px' }}>
                          {f.desc}
                        </p>
                        <div
                          style={{
                            height: '4px',
                            borderRadius: '2px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${f.progress}%`,
                              background: theme.styleConfig.accentColor,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Choose Amount */}
              <div style={{ marginBottom: '28px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: '#fff',
                    marginBottom: '12px',
                  }}
                >
                  2. Select Shagun Amount (INR):
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                  {amounts.map((amt) => {
                    const isSelected = !customAmount && selectedAmount === amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setSelectedAmount(amt);
                          setCustomAmount('');
                        }}
                        style={{
                          padding: '10px 20px',
                          borderRadius: '10px',
                          border: isSelected
                            ? `2px solid ${theme.styleConfig.accentColor}`
                            : '1px solid var(--cel-border-subtle)',
                          background: isSelected
                            ? theme.styleConfig.accentColor
                            : 'rgba(255, 255, 255, 0.05)',
                          color: isSelected ? '#000' : '#fff',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                        }}
                      >
                        ₹{amt.toLocaleString('en-IN')}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="number"
                  placeholder="Or enter custom blessing amount (e.g. ₹25,000)"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid var(--cel-border-subtle)',
                    background: 'rgba(0, 0, 0, 0.3)',
                    color: '#fff',
                    fontSize: '0.95rem',
                  }}
                />
              </div>

              {/* Step 3: Guest Name & Note */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#fff', marginBottom: '6px' }}>
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Uncle Rajesh & Family"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '1px solid var(--cel-border-subtle)',
                      background: 'rgba(0, 0, 0, 0.3)',
                      color: '#fff',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#fff', marginBottom: '6px' }}>
                    Preferred Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e: any) => setPaymentMethod(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '1px solid var(--cel-border-subtle)',
                      background: 'rgba(15, 17, 26, 0.95)',
                      color: '#fff',
                    }}
                  >
                    <option value="UPI">Instant UPI (GPay / PhonePe / Paytm)</option>
                    <option value="CARD">Credit / Debit Card</option>
                    <option value="NETBANKING">Net Banking (All Indian Banks)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '28px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#fff', marginBottom: '6px' }}>
                  Blessing Message / Personal Note:
                </label>
                <textarea
                  rows={3}
                  placeholder="Leave a warm blessing or piece of advice..."
                  value={blessingNote}
                  onChange={(e) => setBlessingNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid var(--cel-border-subtle)',
                    background: 'rgba(0, 0, 0, 0.3)',
                    color: '#fff',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  justifyContent: 'center',
                }}
              >
                <span>
                  {isProcessing
                    ? 'Processing Secure Blessing...'
                    : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <span>Gift ₹{currentAmount.toLocaleString('en-IN')} Shagun</span>
                          <Heart size={16} fill="currentColor" />
                        </span>
                      )}
                </span>
              </button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
