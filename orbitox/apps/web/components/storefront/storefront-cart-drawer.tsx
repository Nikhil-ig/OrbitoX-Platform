'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCommerceCart, useCommerceCurrency } from '@orbitox/commerce';
import {
  IconShoppingBag,
  IconClose,
  IconGift,
  IconCrown,
  IconPlus,
  IconMinus,
  IconTrash,
  IconCheck,
  IconLock,
  IconArrowRight,
  IconShield,
  IconRotateCcw,
  IconTruck,
} from './storefront-icons';

export interface CartDrawerProps {
  storeSlug: string;
  storeId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function StorefrontCartDrawer({ storeSlug, storeId, isOpen, onClose }: CartDrawerProps) {
  const { cart, updateQuantity, removeItem, addItem, applyDiscount, removeDiscount } = useCommerceCart(storeId);
  const baseCurrency = storeSlug === 'punjabi-jutti' ? 'INR' : 'USD';
  const { formatPrice } = useCommerceCurrency(baseCurrency, storeSlug);
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [addedUpsellId, setAddedUpsellId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    try {
      applyDiscount(couponCode);
      setCouponCode('');
    } catch (err: any) {
      setCouponError(err.message || 'Invalid coupon code');
    }
  };

  const isINR = baseCurrency === 'INR';
  const freeShippingThreshold = isINR ? 4999 : 100;
  const subtotal = cart?.totals.subtotal || 0;
  const remaining = Math.max(0, freeShippingThreshold - subtotal);
  const progress = Math.min(100, (subtotal / freeShippingThreshold) * 100);

  // Upsell Accessories
  const upsellItems = isINR
    ? [
        {
          id: 'upsell-care-kit',
          title: 'Royal Beeswax Care Kit & Brass Brush',
          price: 499,
          imageUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=300&auto=format&fit=crop',
          badge: 'Atelier Essential',
        },
        {
          id: 'upsell-potli-bag',
          title: 'Matching Phulkari Handcrafted Potli Bag',
          price: 999,
          imageUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=300&auto=format&fit=crop',
          badge: 'Bridal Pairing',
        },
      ]
    : [
        {
          id: 'upsell-care-kit',
          title: 'Luxury Suede & Leather Care Kit',
          price: 18,
          imageUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=300&auto=format&fit=crop',
          badge: 'Atelier Essential',
        },
        {
          id: 'upsell-potli-bag',
          title: 'Silk Velvet Dust Bag & Cedar Horn',
          price: 28,
          imageUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=300&auto=format&fit=crop',
          badge: 'VIP Care',
        },
      ];

  const handleAddUpsell = (upsell: (typeof upsellItems)[0]) => {
    addItem({
      productId: upsell.id,
      quantity: 1,
    });
    setAddedUpsellId(upsell.id);
    setTimeout(() => setAddedUpsellId(null), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 999,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          height: '100%',
          background: 'var(--orb-surface, #161618)',
          color: 'var(--orb-text, #FFFFFF)',
          boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid var(--orb-border, rgba(255, 255, 255, 0.1))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--orb-border, rgba(255, 255, 255, 0.1))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconShoppingBag size={20} color="var(--orb-primary, #D4AF37)" />
            <span style={{ fontSize: '18px', fontWeight: 800 }}>Shopping Bag</span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '9999px',
                background: 'var(--orb-primary, #D4AF37)',
                color: '#000000',
                fontSize: '11px',
                fontWeight: 800,
              }}
            >
              {cart?.totals.itemsCount || 0}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--orb-text, #FFFFFF)',
              cursor: 'pointer',
              opacity: 0.7,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
            }}
            title="Close"
          >
            <IconClose size={20} />
          </button>
        </div>

        {/* Dynamic Tiered Free Shipping & Gift Progress Meter */}
        <div
          style={{
            padding: '14px 24px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid var(--orb-border, rgba(255,255,255,0.06))',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 700 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IconGift size={15} color="var(--orb-primary, #D4AF37)" />
                <span>
                  {remaining > 0
                    ? `Add ${formatPrice(remaining)} more for FREE Express Shipping & Luxury Box`
                    : 'Unlocked FREE Express Shipping & Luxury Gift Box!'}
                </span>
              </div>
              <span style={{ color: 'var(--orb-primary, #D4AF37)', fontWeight: 800 }}>{Math.round(progress)}%</span>
            </div>
            <div
              style={{
                width: '100%',
                height: '6px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '9999px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #D4AF37, #F59E0B)',
                  boxShadow: '0 0 10px rgba(212, 175, 55, 0.5)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* Cart Line Items & Upsells */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!cart || cart.items.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--orb-text-muted, #888)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(212, 175, 55, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconShoppingBag size={32} color="var(--orb-primary, #D4AF37)" />
                </div>
              </div>
              <p style={{ fontWeight: 700, fontSize: '16px', margin: '0 0 6px 0', color: '#FFF' }}>Your bag is empty</p>
              <p style={{ fontSize: '13px', margin: 0 }}>Explore our handcrafted collection to add items.</p>
              <Link
                href={`/store/${storeSlug}/shop`}
                onClick={onClose}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '16px',
                  padding: '10px 22px',
                  borderRadius: '9999px',
                  background: 'var(--orb-primary, #D4AF37)',
                  color: '#000',
                  fontWeight: 800,
                  fontSize: '12px',
                  textDecoration: 'none',
                }}
              >
                <span>Shop Collection</span>
                <IconArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <>
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    gap: '14px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid var(--orb-border-subtle, rgba(255, 255, 255, 0.06))',
                  }}
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      style={{ width: '70px', height: '80px', borderRadius: 'var(--orb-radius-input, 8px)', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '70px', height: '80px', borderRadius: '8px', background: '#333' }} />
                  )}

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1.3 }}>{item.title}</span>
                        <button
                          onClick={() => removeItem(item.id)}
                          style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                          title="Remove item"
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>
                      {item.variantTitle && (
                        <span style={{ fontSize: '11px', color: 'var(--orb-text-muted, #888)' }}>
                          {item.variantTitle}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      {/* Quantity Selector */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          border: '1px solid var(--orb-border, rgba(255, 255, 255, 0.2))',
                          borderRadius: '6px',
                          overflow: 'hidden',
                        }}
                      >
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          style={{ width: '26px', height: '26px', background: 'transparent', border: 'none', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <IconMinus size={11} />
                        </button>
                        <span style={{ fontSize: '12px', fontWeight: 700, width: '24px', textAlign: 'center' }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          style={{ width: '26px', height: '26px', background: 'transparent', border: 'none', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <IconPlus size={11} />
                        </button>
                      </div>

                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--orb-primary, #D4AF37)' }}>
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* 1-Click Upsells Section */}
              <div style={{ marginTop: '10px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: 'var(--orb-primary, #D4AF37)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <IconCrown size={14} color="var(--orb-primary, #D4AF37)" />
                  <span>Atelier Add-ons & Pairings</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {upsellItems.map((upsell) => (
                    <div
                      key={upsell.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={upsell.imageUrl} alt="" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700 }}>{upsell.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--orb-primary, #D4AF37)', fontWeight: 800 }}>+{formatPrice(upsell.price)}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddUpsell(upsell)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: addedUpsellId === upsell.id ? '#10B981' : 'var(--orb-primary, #D4AF37)',
                          color: '#000',
                          fontWeight: 800,
                          fontSize: '11px',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {addedUpsellId === upsell.id ? (
                          <>
                            <IconCheck size={12} />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <IconPlus size={12} />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Summary & Checkout */}
        {cart && cart.items.length > 0 && (
          <div
            style={{
              padding: '22px 24px 30px',
              borderTop: '1px solid var(--orb-border, rgba(255, 255, 255, 0.12))',
              background: 'var(--orb-surface-subtle, #141416)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Coupon Code Input */}
            <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="PROMO CODE (E.G. ROYAL20)"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--orb-border, rgba(255,255,255,0.15))',
                  background: 'rgba(0,0,0,0.45)',
                  color: '#FFF',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFF',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  transition: 'background 0.2s',
                }}
              >
                Apply
              </button>
            </form>

            {cart.appliedDiscount && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 10px', borderRadius: '6px' }}>
                <span>Coupon Applied: <strong>{cart.appliedDiscount.code}</strong></span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>-{formatPrice(cart.appliedDiscount.amount)}</span>
                  <button onClick={removeDiscount} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '11px' }}>
                    <IconClose size={12} />
                  </button>
                </div>
              </div>
            )}

            {couponError && <span style={{ fontSize: '11px', color: '#EF4444' }}>{couponError}</span>}

            {/* Totals Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--orb-text-muted, #94A3B8)' }}>
                <span>Subtotal</span>
                <span>{formatPrice(cart.totals.subtotal)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--orb-text-muted, #94A3B8)' }}>
                <span>Estimated Shipping</span>
                <span style={{ color: remaining === 0 ? '#10B981' : 'inherit', fontWeight: remaining === 0 ? 800 : 500 }}>
                  {remaining === 0 ? 'FREE (UNLOCKED)' : formatPrice(cart.totals.shippingAmount)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 900, color: 'var(--orb-text, #FFFFFF)', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span>Estimated Total</span>
                <span style={{ color: 'var(--orb-primary, #D4AF37)', fontSize: '18px' }}>
                  {formatPrice(cart.totals.grandTotal)}
                </span>
              </div>
            </div>

            {/* Redesigned Luxury Checkout CTA Button */}
            <Link
              href={`/store/${storeSlug}/checkout`}
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                width: '100%',
                padding: '16px 24px',
                borderRadius: '9999px',
                background: 'linear-gradient(135deg, var(--orb-primary, #D4AF37) 0%, #B8860B 100%)',
                color: '#000000',
                textAlign: 'center',
                fontWeight: 900,
                fontSize: '14px',
                textDecoration: 'none',
                boxSizing: 'border-box',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                boxShadow: '0 8px 28px rgba(212, 175, 55, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
              }}
            >
              <IconLock size={16} />
              <span>PROCEED TO SECURE CHECKOUT</span>
              <IconArrowRight size={16} />
            </Link>

            {/* Trust Assurance Row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '12px',
                fontSize: '10px',
                color: 'rgba(255, 255, 255, 0.45)',
                textAlign: 'center',
                letterSpacing: '0.02em',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <IconShield size={11} color="var(--orb-primary, #D4AF37)" />
                <span>256-bit SSL Encrypted</span>
              </span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <IconRotateCcw size={11} color="var(--orb-primary, #D4AF37)" />
                <span>7-Day Easy Returns</span>
              </span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <IconTruck size={11} color="var(--orb-primary, #D4AF37)" />
                <span>Global Express Delivery</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
