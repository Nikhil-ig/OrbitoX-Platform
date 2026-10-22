'use client';

import React, { useState } from 'react';
import { useEcosystem } from '../../lib/ecosystem-context';
import { useResponsiveDevice } from '../../hooks/useResponsiveDevice';
import { Sparkles, Check, X, ShieldCheck, Crown, ArrowRight } from 'lucide-react';

export function SovereignUpgradeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { hostCelebration, upgradeHostPlan, c2cPlans } = useEcosystem();
  const [successPlan, setSuccessPlan] = useState<string | null>(null);
  const { isMobile } = useResponsiveDevice();

  if (!isOpen) return null;

  const handleSelectPlan = (planId: string, planName: string) => {
    upgradeHostPlan(planId);
    setSuccessPlan(planName);
    setTimeout(() => {
      setSuccessPlan(null);
      onClose();
    }, 2500);
  };

  const successContent = (
    <div style={{ textAlign: 'center', padding: isMobile ? '24px 12px' : '40px 20px' }}>
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #F5E5C9, #DFBA6B)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto',
          boxShadow: '0 0 32px rgba(223, 186, 107, 0.6)',
        }}
      >
        <Crown size={32} color="#07090E" />
      </div>
      <h3 style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 900, color: '#fff', marginBottom: '8px' }}>
        Welcome to the Sovereign Circle!
      </h3>
      <p style={{ color: 'var(--cel-gold-light)', fontSize: '1.02rem', marginBottom: '16px' }}>
        {successPlan} successfully activated for {hostCelebration.coupleTitle}.
      </p>
      <p style={{ color: 'var(--cel-text-muted)', fontSize: '0.86rem' }}>
        Watermark removed • Custom domain enabled • Unlimited RSVPs unlocked.
      </p>
    </div>
  );

  const plansBody = (
    <>
      <div style={{ textAlign: 'center', marginBottom: isMobile ? '20px' : '32px' }}>
        <span className="badge-gold" style={{ marginBottom: '10px' }}>
          Atelier Elevation
        </span>
        <h2
          style={{
            fontSize: isMobile ? '1.5rem' : '2.2rem',
            fontWeight: 900,
            color: '#fff',
            letterSpacing: '-0.4px',
            marginBottom: '8px',
          }}
        >
          Elevate Your Celebration Pass
        </h2>
        <p style={{ color: 'var(--cel-text-secondary)', maxWidth: '580px', margin: '0 auto', fontSize: '0.88rem' }}>
          Your celebration is currently on the <strong>Complimentary Atelier Trial</strong> ({hostCelebration.trialDaysRemaining} days remaining). Upgrade to unlock custom domains, remove all watermarks, and preserve your digital sanctuary for up to 1 full year.
        </p>
      </div>

      {/* Plans Grid / Stack */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: isMobile ? '14px' : '20px',
        }}
      >
        {c2cPlans.map((plan) => {
          const isCurrent = hostCelebration.activePlanId === plan.id;
          const isRoyal = plan.id === 'c2c_royal_heritage';

          return (
            <div
              key={plan.id}
              style={{
                borderRadius: '16px',
                background: isRoyal
                  ? 'linear-gradient(135deg, rgba(223, 186, 107, 0.12), rgba(8, 12, 22, 0.95))'
                  : 'rgba(255, 255, 255, 0.02)',
                border: isRoyal
                  ? '1px solid var(--cel-gold)'
                  : isCurrent
                  ? '1px solid rgba(255, 255, 255, 0.3)'
                  : '1px solid var(--cel-border-subtle)',
                padding: isMobile ? '20px' : '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
              }}
            >
              {isRoyal && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--cel-gold)',
                    color: '#07090E',
                    fontWeight: 900,
                    fontSize: '0.66rem',
                    padding: '3px 12px',
                    borderRadius: '999px',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                  }}
                >
                  MAISON CHOICE
                </div>
              )}

              <div>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
                  {plan.name}
                </h4>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 900, color: isRoyal ? 'var(--cel-gold)' : '#fff' }}>
                    ₹{plan.priceInr.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--cel-text-muted)' }}>
                    / one-time
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.8rem', color: 'var(--cel-text-secondary)' }}>
                      <Check size={14} color={isRoyal ? 'var(--cel-gold)' : '#10B981'} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                {isCurrent ? (
                  <div
                    style={{
                      padding: '10px',
                      textAlign: 'center',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--cel-text-muted)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                    }}
                  >
                    Current Active Plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleSelectPlan(plan.id, plan.name)}
                    className={isRoyal ? 'btn-maison-primary' : 'btn-outline-gold'}
                    style={{ width: '100%', padding: '12px', fontSize: '0.86rem', justifyContent: 'center' }}
                  >
                    <span>Activate Pass</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  // 1. Mobile Experience: Slide-up Native Bottom Sheet
  if (isMobile) {
    return (
      <div className="mobile-bottom-sheet-backdrop" onClick={onClose}>
        <div className="mobile-bottom-sheet-content" onClick={(e) => e.stopPropagation()}>
          <div className="bottom-sheet-drag-handle" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          </div>
          {successPlan ? successContent : plansBody}
        </div>
      </div>
    );
  }

  // 2. Desktop & Tablet Experience: Centered Luxury Glass Modal
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.88)',
        backdropFilter: 'blur(20px)',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        className="glass-panel-gold"
        style={{
          maxWidth: '860px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '40px',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'rgba(255, 255, 255, 0.7)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>

        {successPlan ? successContent : plansBody}
      </div>
    </div>
  );
}
