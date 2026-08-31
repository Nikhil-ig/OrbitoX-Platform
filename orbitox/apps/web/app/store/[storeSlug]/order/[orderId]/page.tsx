'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useCommerceStorefront, commerceEngine } from '@orbitox/commerce';
import {
  IconShieldCheck,
  IconCheck,
  IconArrowRight,
  IconPackage,
} from '@/components/storefront/storefront-icons';

export default function StorefrontOrderConfirmationPage() {
  const params = useParams();
  const rawSlug = params?.storeSlug;
  const storeSlug: string = (Array.isArray(rawSlug) ? rawSlug[0] : rawSlug) || 'aura-luxury';

  const rawOrderId = params?.orderId;
  const orderId: string = (Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId) || '';

  const { data: storefront } = useCommerceStorefront(storeSlug);
  const order = commerceEngine.orders.getOrderById(orderId);

  if (!storefront) return null;

  if (!order) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--orb-bg, #0D0D0E)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Order Not Found</h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Order ID <code>{orderId}</code> could not be located.</p>
          <Link href={`/store/${storeSlug}`} style={{ color: 'var(--orb-primary, #D4AF37)' }}>Return to Storefront</Link>
        </div>
      </div>
    );
  }

  const steps = [
    { key: 'placed', label: 'Order Placed', done: true },
    { key: 'confirmed', label: 'Payment Confirmed', done: order.paymentStatus === 'paid' || order.status === 'confirmed' || order.status === 'shipped' || order.status === 'delivered' },
    { key: 'shipped', label: 'Dispatched & Shipped', done: order.status === 'shipped' || order.status === 'delivered' },
    { key: 'delivered', label: 'Delivered', done: order.status === 'delivered' },
  ];

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

        <Link
          href={`/store/${storeSlug}/shop`}
          style={{
            fontSize: '13px',
            color: 'var(--orb-primary, #D4AF37)',
            textDecoration: 'none',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>Continue Shopping</span>
          <IconArrowRight size={13} />
        </Link>
      </header>

      {/* Main Order Confirmation Container */}
      <div
        style={{
          maxWidth: 'var(--orb-container-max-width, 860px)',
          margin: '40px auto',
          padding: '0 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* Success Card */}
        <div
          style={{
            padding: '36px',
            borderRadius: 'var(--orb-radius-card, 16px)',
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(17, 24, 39, 0.9))',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(212, 175, 55, 0.2)', border: '1px solid var(--orb-primary, #D4AF37)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconShieldCheck size={36} color="var(--orb-primary, #D4AF37)" />
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
            Thank You For Your Order!
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)', margin: 0, maxWidth: '480px' }}>
            Your order <strong style={{ color: '#D4AF37' }}>{order.orderNumber}</strong> has been received and confirmed. A confirmation receipt was dispatched to <strong>{order.customerEmail}</strong>.
          </p>
        </div>

        {/* Live Status Tracker */}
        <div
          style={{
            padding: '24px',
            borderRadius: 'var(--orb-radius-card, 16px)',
            background: 'var(--orb-surface, #161618)',
            border: '1px solid var(--orb-border, rgba(255,255,255,0.1))',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>Fulfillment Tracker</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {steps.map((s, idx) => (
              <div
                key={s.key}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '12px',
                  borderRadius: '8px',
                  background: s.done ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: s.done ? '1px solid var(--orb-primary, #D4AF37)' : '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: s.done ? '#D4AF37' : 'rgba(255,255,255,0.4)', fontWeight: 800 }}>
                    STEP {idx + 1}
                  </span>
                  {s.done ? <IconCheck size={13} color="#10B981" /> : null}
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: s.done ? '#FFF' : 'rgba(255,255,255,0.5)' }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Items & Shipping Breakdown */}
        <div
          style={{
            padding: '24px',
            borderRadius: 'var(--orb-radius-card, 16px)',
            background: 'var(--orb-surface, #161618)',
            border: '1px solid var(--orb-border, rgba(255,255,255,0.1))',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Receipt Details</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {order.items.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt="" style={{ width: '44px', height: '44px', borderRadius: '6px', objectFit: 'cover' }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 700 }}>{item.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--orb-text-muted, #888)' }}>
                      Qty {item.quantity} {item.variantTitle && `• ${item.variantTitle}`}
                    </div>
                  </div>
                </div>
                <span style={{ fontWeight: 800 }}>${item.totalPrice.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--orb-border, rgba(255,255,255,0.1))', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--orb-text-muted, #888)' }}>
              <span>Subtotal</span>
              <span>${order.subtotal.toFixed(2)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10B981' }}>
                <span>Discount</span>
                <span>-${order.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--orb-text-muted, #888)' }}>
              <span>Shipping ({order.shippingMethod || 'Standard'})</span>
              <span>{order.shippingAmount === 0 ? 'FREE' : `$${order.shippingAmount.toFixed(2)}`}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 900, color: 'var(--orb-text, #FFF)', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
              <span>Total Paid</span>
              <span style={{ color: 'var(--orb-primary, #D4AF37)' }}>${order.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Shipping & Payment Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--orb-surface, #161618)', border: '1px solid var(--orb-border, rgba(255,255,255,0.1))', fontSize: '13px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 8px 0' }}>Shipping Address</h4>
            <p style={{ margin: 0, lineHeight: 1.5, color: 'rgba(255,255,255,0.8)' }}>
              {order.shippingAddress.firstName} {order.shippingAddress.lastName}<br />
              {order.shippingAddress.addressLine1}<br />
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}<br />
              {order.shippingAddress.country}
            </p>
          </div>

          <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--orb-surface, #161618)', border: '1px solid var(--orb-border, rgba(255,255,255,0.1))', fontSize: '13px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 8px 0' }}>Payment Method</h4>
            <p style={{ margin: 0, lineHeight: 1.5, color: 'rgba(255,255,255,0.8)' }}>
              Gateway: <strong style={{ textTransform: 'uppercase' }}>{order.paymentMethod}</strong><br />
              Status: <span style={{ color: order.paymentStatus === 'paid' ? '#10B981' : '#F59E0B', fontWeight: 700 }}>{order.paymentStatus.toUpperCase()}</span><br />
              Ref: <code style={{ color: 'rgba(255,255,255,0.6)' }}>{order.paymentTransactionId || order.id}</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
