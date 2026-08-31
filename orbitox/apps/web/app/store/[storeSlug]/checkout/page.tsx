'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCommerceStorefront, useCommerceCart, useCommerceCurrency, commerceEngine, PaymentProviderType } from '@orbitox/commerce';
import {
  IconLock,
  IconZap,
  IconShieldCheck,
  IconGlobe,
  IconTruck,
} from '@/components/storefront/storefront-icons';

export default function StorefrontCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const rawSlug = params?.storeSlug;
  const storeSlug: string = (Array.isArray(rawSlug) ? rawSlug[0] : rawSlug) || 'aura-luxury';

  const { data: storefront } = useCommerceStorefront(storeSlug);
  const storeId = storefront?.store.id || 'store_aura_luxury';
  const tenantId = storefront?.store.tenantId || 'tenant_aura_corp';
  const { cart } = useCommerceCart(storeId);

  const baseCurrency = storeSlug === 'punjabi-jutti' ? 'INR' : 'USD';
  const { formatPrice } = useCommerceCurrency(baseCurrency, storeSlug);

  // Form State
  const [email, setEmail] = useState<string>('alex.connoisseur@luxury.com');
  const [phone, setPhone] = useState<string>('+1 (555) 234-5678');
  const [firstName, setFirstName] = useState<string>('Alex');
  const [lastName, setLastName] = useState<string>('Vance');
  const [address1, setAddress1] = useState<string>('742 Evergreen Terrace');
  const [city, setCity] = useState<string>('Beverly Hills');
  const [state, setState] = useState<string>('CA');
  const [zip, setZip] = useState<string>('90210');
  const [country, setCountry] = useState<string>('United States');
  const [paymentMethod, setPaymentMethod] = useState<PaymentProviderType>('mock');
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!storefront || !cart) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.items.length === 0) {
      setError('Your shopping bag is empty.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // 1. Process Checkout via Checkout Engine
      const res = await commerceEngine.orders.createOrderFromCart(tenantId, storeId, {
        cartId: cart.id,
        customerEmail: email,
        customerPhone: phone,
        shippingAddress: {
          firstName,
          lastName,
          addressLine1: address1,
          city,
          state,
          postalCode: zip,
          country,
          phone,
          email,
        },
        paymentMethod,
      });

      // 2. If non-COD, auto-verify payment in test simulator
      if (paymentMethod === 'mock' || paymentMethod === 'stripe' || paymentMethod === 'razorpay') {
        commerceEngine.orders.markPaymentPaid(res.id, `sim_tx_${Date.now()}`, paymentMethod);
      }

      // 3. Route to order tracking receipt
      router.push(`/store/${storeSlug}/order/${res.id}`);
    } catch (err: any) {
      setError(err.message || 'Checkout failed');
      setProcessing(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--orb-bg, #0D0D0E)', color: 'var(--orb-text, #FFF)' }}>
      {/* Header */}
      <header
        style={{
          padding: '20px 32px',
          borderBottom: '1px solid var(--orb-border, rgba(255, 255, 255, 0.1))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--orb-surface, #161618)',
        }}
      >
        <Link
          href={`/store/${storeSlug}`}
          style={{
            fontSize: '22px',
            fontWeight: 900,
            fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)',
            color: '#FFF',
            textDecoration: 'none',
          }}
        >
          {storefront.store.name}
        </Link>
        <div style={{ fontSize: '13px', color: 'var(--orb-text-muted, #888)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconLock size={14} color="#10B981" />
          <span>256-Bit SSL Encrypted Secure Checkout</span>
        </div>
      </header>

      {/* Main Checkout Container */}
      <div
        style={{
          maxWidth: 'var(--orb-container-max-width, 1100px)',
          margin: '40px auto',
          padding: '0 24px',
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: '48px',
        }}
      >
        {/* Left: Checkout Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {error && (
            <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', fontSize: '13px', fontWeight: 700 }}>
              {error}
            </div>
          )}

          {/* 1. Contact Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>1. Customer Information</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--orb-radius-input, 8px)',
                    background: 'var(--orb-surface, #161618)',
                    border: '1px solid var(--orb-border, rgba(255,255,255,0.15))',
                    color: '#FFF',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Mobile Phone (for delivery SMS)</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--orb-radius-input, 8px)',
                    background: 'var(--orb-surface, #161618)',
                    border: '1px solid var(--orb-border, rgba(255,255,255,0.15))',
                    color: '#FFF',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>
          </div>

          {/* 2. Shipping Address */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>2. Delivery Address</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  style={{ padding: '12px 14px', borderRadius: 'var(--orb-radius-input, 8px)', background: 'var(--orb-surface, #161618)', border: '1px solid var(--orb-border, rgba(255,255,255,0.15))', color: '#FFF', fontSize: '13px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  style={{ padding: '12px 14px', borderRadius: 'var(--orb-radius-input, 8px)', background: 'var(--orb-surface, #161618)', border: '1px solid var(--orb-border, rgba(255,255,255,0.15))', color: '#FFF', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Street Address & Suite</label>
              <input
                type="text"
                required
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
                style={{ padding: '12px 14px', borderRadius: 'var(--orb-radius-input, 8px)', background: 'var(--orb-surface, #161618)', border: '1px solid var(--orb-border, rgba(255,255,255,0.15))', color: '#FFF', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>City</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  style={{ padding: '12px 14px', borderRadius: 'var(--orb-radius-input, 8px)', background: 'var(--orb-surface, #161618)', border: '1px solid var(--orb-border, rgba(255,255,255,0.15))', color: '#FFF', fontSize: '13px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>State</label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  style={{ padding: '12px 14px', borderRadius: 'var(--orb-radius-input, 8px)', background: 'var(--orb-surface, #161618)', border: '1px solid var(--orb-border, rgba(255,255,255,0.15))', color: '#FFF', fontSize: '13px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>ZIP Code</label>
                <input
                  type="text"
                  required
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  style={{ padding: '12px 14px', borderRadius: 'var(--orb-radius-input, 8px)', background: 'var(--orb-surface, #161618)', border: '1px solid var(--orb-border, rgba(255,255,255,0.15))', color: '#FFF', fontSize: '13px' }}
                />
              </div>
            </div>
          </div>

          {/* 3. Payment Method */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>3. Payment Method</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { id: 'mock', icon: <IconZap size={16} color="var(--orb-primary, #D4AF37)" />, title: 'Instant Simulator Gateway (Test Mode)', desc: 'Immediate automated payment confirmation for frictionless testing.' },
                { id: 'stripe', icon: <IconShieldCheck size={16} color="#3B82F6" />, title: 'Credit / Debit Card (Stripe Global)', desc: 'Supports Visa, Mastercard, AMEX, Apple Pay, and Google Pay.' },
                { id: 'razorpay', icon: <IconGlobe size={16} color="#10B981" />, title: 'Razorpay (UPI, GooglePay, Netbanking)', desc: 'Instant UPI QR code, PhonePe, Paytm, and Indian banks.' },
                { id: 'cod', icon: <IconTruck size={16} color="#F59E0B" />, title: 'Cash on Delivery (COD)', desc: 'Pay physical cash upon parcel arrival.' },
              ].map((m) => (
                <label
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '16px',
                    borderRadius: 'var(--orb-radius-card, 10px)',
                    background: paymentMethod === m.id ? 'rgba(212, 175, 55, 0.1)' : 'var(--orb-surface, #161618)',
                    border: paymentMethod === m.id ? '1px solid var(--orb-primary, #D4AF37)' : '1px solid var(--orb-border, rgba(255,255,255,0.1))',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={m.id}
                    checked={paymentMethod === m.id}
                    onChange={() => setPaymentMethod(m.id as any)}
                    style={{ marginTop: '4px' }}
                  />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {m.icon}
                      <span>{m.title}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--orb-text-muted, #888)', marginTop: '4px' }}>{m.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={processing}
            style={{
              padding: '16px 32px',
              borderRadius: 'var(--orb-radius-btn, 8px)',
              background: 'var(--orb-primary, #D4AF37)',
              color: '#000000',
              fontWeight: 900,
              fontSize: '15px',
              border: 'none',
              cursor: processing ? 'not-allowed' : 'pointer',
              letterSpacing: '0.04em',
              boxShadow: '0 0 24px rgba(212, 175, 55, 0.4)',
              opacity: processing ? 0.7 : 1,
            }}
          >
            {processing ? 'AUTHORIZING & PLACING ORDER...' : `COMPLETE PURCHASE • ${formatPrice(cart.totals.grandTotal)}`}
          </button>
        </form>

        {/* Right: Order Summary */}
        <div
          style={{
            padding: '24px',
            borderRadius: 'var(--orb-radius-card, 16px)',
            background: 'var(--orb-surface, #161618)',
            border: '1px solid var(--orb-border, rgba(255,255,255,0.1))',
            height: 'fit-content',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Order Summary ({cart.totals.itemsCount} items)</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '280px', overflowY: 'auto' }}>
            {cart.items.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                  ) : null}
                  <div>
                    <div style={{ fontWeight: 700 }}>{item.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--orb-text-muted, #888)' }}>
                      Qty {item.quantity} {item.variantTitle && `• ${item.variantTitle}`}
                    </div>
                  </div>
                </div>
                <span style={{ fontWeight: 700 }}>{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--orb-border, rgba(255,255,255,0.1))', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--orb-text-muted, #888)' }}>
              <span>Subtotal</span>
              <span>{formatPrice(cart.totals.subtotal)}</span>
            </div>

            {cart.appliedDiscount && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10B981' }}>
                <span>Coupon ({cart.appliedDiscount.code})</span>
                <span>-{formatPrice(cart.appliedDiscount.amount)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--orb-text-muted, #888)' }}>
              <span>Insured Shipping</span>
              <span>{cart.totals.shippingAmount === 0 ? 'FREE' : formatPrice(cart.totals.shippingAmount)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 900, color: 'var(--orb-text, #FFF)', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
              <span>Total</span>
              <span style={{ color: 'var(--orb-primary, #D4AF37)' }}>{formatPrice(cart.totals.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
