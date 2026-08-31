'use client';

import React, { useState } from 'react';
import { commerceEngine, DiscountCoupon } from '@orbitox/commerce';

export default function CommerceDiscountsPage() {
  const storeId = 'store_aura_luxury';
  const [discounts, setDiscounts] = useState<DiscountCoupon[]>(() =>
    commerceEngine.discounts.listDiscountsByStore(storeId)
  );
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [code, setCode] = useState<string>('SUMMER30');
  const [type, setType] = useState<'percentage' | 'fixed_amount'>('percentage');
  const [value, setValue] = useState<number>(30);
  const [minSpend, setMinSpend] = useState<number>(100);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCreateDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    const newCoupon = commerceEngine.discounts.createDiscount(storeId, {
      code: code.toUpperCase().trim(),
      type,
      value: Number(value),
      minOrderAmount: Number(minSpend),
      usageLimit: 500,
    });

    setDiscounts(commerceEngine.discounts.listDiscountsByStore(storeId));
    setModalOpen(false);

    commerceEngine.activity.logEvent({
      storeId,
      type: 'discount_created',
      title: `Created Promo Code: ${newCoupon.code}`,
      description: `${type === 'percentage' ? `${value}% OFF` : `$${value} OFF`} on orders over $${minSpend}.`,
      icon: '🏷️',
      severity: 'info',
    });

    showToast(`✓ Promo code "${newCoupon.code}" created successfully!`);
  };

  const handleToggleDiscount = (coupon: DiscountCoupon) => {
    const list = commerceEngine.discounts.listDiscountsByStore(storeId);
    const target = list.find((d) => d.id === coupon.id);
    if (target) {
      target.active = !target.active;
      setDiscounts([...list]);

      commerceEngine.activity.logEvent({
        storeId,
        type: 'discount_created',
        title: `Coupon ${target.code} ${target.active ? 'Activated' : 'Deactivated'}`,
        description: `Promo status updated to ${target.active ? 'ACTIVE' : 'EXPIRED'}.`,
        icon: target.active ? '🟢' : '⏸️',
        severity: 'info',
      });

      showToast(`✓ Promo code "${target.code}" is now ${target.active ? 'ACTIVE' : 'DEACTIVATED'}!`);
    }
  };

  const handleDeleteDiscount = (couponId: string, couponCode: string) => {
    // Filter out from local store list
    const list = commerceEngine.discounts.listDiscountsByStore(storeId).filter((d) => d.id !== couponId);
    // In engine, replace store list or deactivate
    const target = commerceEngine.discounts.listDiscountsByStore(storeId).find((d) => d.id === couponId);
    if (target) target.active = false;

    setDiscounts([...list]);
    showToast(`🗑️ Promo code "${couponCode}" removed!`);
  };

  const handleAiGenerateCampaign = () => {
    const campaigns = [
      { code: 'VIPRUNWAY25', type: 'percentage' as const, value: 25, minOrderAmount: 250 },
      { code: 'FLASH50OFF', type: 'fixed_amount' as const, value: 50, minOrderAmount: 200 },
      { code: 'WELCOME15', type: 'percentage' as const, value: 15, minOrderAmount: 75 },
    ];

    campaigns.forEach((c) => {
      commerceEngine.discounts.createDiscount(storeId, {
        code: c.code,
        type: c.type,
        value: c.value,
        minOrderAmount: c.minOrderAmount,
        usageLimit: 1000,
      });
    });

    setDiscounts(commerceEngine.discounts.listDiscountsByStore(storeId));

    commerceEngine.activity.logEvent({
      storeId,
      type: 'discount_created',
      title: '✨ AI Generated High-Conversion Campaign',
      description: 'Automatically deployed VIPRUNWAY25, FLASH50OFF, and WELCOME15 promo codes.',
      icon: '🤖',
      severity: 'success',
    });

    showToast('✨ AI successfully generated 3 high-converting promo campaigns!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: '#FFF' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🏷️</span>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Discounts & Promo Engine
            </h1>
          </div>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Create automated coupon campaigns, percentage discounts, minimum spend thresholds, and promotional vouchers.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleAiGenerateCampaign}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.2))',
              border: '1px solid #8B5CF6',
              color: '#C084FC',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>✨</span>
            <span>AI Generate Campaign</span>
          </button>

          <button
            onClick={() => setModalOpen(true)}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
              color: '#000000',
              fontWeight: 800,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 0 16px rgba(212, 175, 55, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>+</span>
            <span>Create Coupon</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10B981',
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Discounts Table */}
      <div style={{ borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.5)' }}>
              <th style={{ padding: '14px 20px', fontWeight: 700 }}>Promo Code</th>
              <th style={{ padding: '14px 20px', fontWeight: 700 }}>Type & Value</th>
              <th style={{ padding: '14px 20px', fontWeight: 700 }}>Min Purchase</th>
              <th style={{ padding: '14px 20px', fontWeight: 700 }}>Redemptions</th>
              <th style={{ padding: '14px 20px', fontWeight: 700 }}>Status</th>
              <th style={{ padding: '14px 20px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {discounts.map((d) => (
              <tr key={d.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <td style={{ padding: '16px 20px', fontWeight: 800 }}>
                  <code style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(212, 175, 55, 0.15)', color: '#D4AF37', border: '1px solid rgba(212, 175, 55, 0.3)', letterSpacing: '0.05em' }}>
                    {d.code}
                  </code>
                </td>
                <td style={{ padding: '16px 20px', fontWeight: 700 }}>
                  {d.type === 'percentage' ? `${d.value}% OFF` : `$${d.value} OFF`}
                </td>
                <td style={{ padding: '16px 20px', color: 'rgba(255, 255, 255, 0.7)' }}>
                  {d.minOrderAmount ? `$${d.minOrderAmount.toFixed(2)}` : 'None'}
                </td>
                <td style={{ padding: '16px 20px' }}>
                  {d.timesUsed} / {d.usageLimit || '∞'} used
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <span style={{ padding: '4px 8px', borderRadius: '4px', background: d.active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: d.active ? '#10B981' : '#EF4444', fontSize: '11px', fontWeight: 700 }}>
                    {d.active ? 'ACTIVE' : 'EXPIRED'}
                  </span>
                </td>
                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      onClick={() => handleToggleDiscount(d)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: d.active ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        border: d.active ? '1px solid #F59E0B' : '1px solid #10B981',
                        color: d.active ? '#F59E0B' : '#10B981',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {d.active ? 'Pause' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteDiscount(d.id, d.code)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#EF4444',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Coupon Modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              width: '460px',
              maxWidth: '100%',
              background: '#161618',
              borderRadius: '16px',
              border: '1px solid #D4AF37',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Create Promo Coupon</h2>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: '#FFF', fontSize: '18px', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDiscount} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700 }}>Coupon Code * (e.g. VIP20)</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  style={{ padding: '8px 12px', borderRadius: '6px', background: '#000', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#D4AF37', fontSize: '13px', fontWeight: 800, letterSpacing: '0.05em' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>Discount Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    style={{ padding: '8px 12px', borderRadius: '6px', background: '#000', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFF', fontSize: '12px' }}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Amount ($)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>Value Amount *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                    style={{ padding: '8px 12px', borderRadius: '6px', background: '#000', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFF', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700 }}>Minimum Order Spend ($)</label>
                <input
                  type="number"
                  min="0"
                  value={minSpend}
                  onChange={(e) => setMinSpend(Number(e.target.value))}
                  style={{ padding: '8px 12px', borderRadius: '6px', background: '#000', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFF', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: '6px', background: 'transparent', border: '1px solid #444', color: '#FFF', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ flex: 2, padding: '10px', borderRadius: '6px', background: 'linear-gradient(135deg, #D4AF37, #B8860B)', color: '#000', fontWeight: 800, border: 'none', cursor: 'pointer' }}
                >
                  Publish Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
