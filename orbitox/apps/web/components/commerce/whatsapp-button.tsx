'use client';

import React from 'react';

interface WhatsAppButtonProps {
  phoneNumber?: string;
  storeName?: string;
  productTitle?: string;
  selectedVariant?: string;
  price?: string | number;
  productUrl?: string;
  customMessage?: string;
  variant?: 'primary' | 'compact' | 'floating' | 'outline';
  className?: string;
  style?: React.CSSProperties;
}

export function WhatsAppButton({
  phoneNumber = '+919876543210',
  storeName = 'Patiala Shahi Jutti House',
  productTitle,
  selectedVariant,
  price,
  productUrl,
  customMessage,
  variant = 'primary',
  style,
}: WhatsAppButtonProps) {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    let message = customMessage;
    if (!message) {
      if (productTitle) {
        message =
          `👋 *Namaste ${storeName}!* ✨\n\n` +
          `I would like to order this handcrafted item:\n\n` +
          `🛍️ *Product:* ${productTitle}\n` +
          (selectedVariant ? `📏 *Size:* ${selectedVariant}\n` : '') +
          (price ? `💰 *Price:* ${price}\n` : '') +
          (productUrl ? `🔗 *Link:* ${productUrl}\n` : '') +
          `\nPlease confirm stock availability, size assistance, and dispatch time! 🙏`;
      } else {
        message = `👋 *Namaste ${storeName}!* ✨\n\nI am browsing your online store and would like assistance with an order!`;
      }
    }

    const encoded = encodeURIComponent(message || '');
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (variant === 'floating') {
    return (
      <button
        onClick={handleClick}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9990,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 20px',
          borderRadius: '999px',
          background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
          color: '#FFFFFF',
          border: 'none',
          boxShadow: '0 8px 30px rgba(37, 211, 102, 0.45), 0 0 15px rgba(37, 211, 102, 0.2)',
          cursor: 'pointer',
          fontWeight: 800,
          fontSize: '14px',
          letterSpacing: '0.02em',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          ...style,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
        }}
        title="Chat & Order on WhatsApp"
      >
        <span style={{ fontSize: '20px' }}>💬</span>
        <span>Order on WhatsApp</span>
      </button>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '8px 14px',
          borderRadius: '6px',
          background: 'rgba(37, 211, 102, 0.15)',
          border: '1px solid rgba(37, 211, 102, 0.4)',
          color: '#25D366',
          fontSize: '12px',
          fontWeight: 800,
          cursor: 'pointer',
          transition: 'background 0.2s ease',
          ...style,
        }}
      >
        <span>💬</span>
        <span>WhatsApp Buy</span>
      </button>
    );
  }

  // Primary variant
  return (
    <button
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        width: '100%',
        padding: '14px 24px',
        borderRadius: 'var(--orb-radius-btn, 8px)',
        background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
        color: '#FFFFFF',
        border: 'none',
        fontSize: '14px',
        fontWeight: 800,
        letterSpacing: '0.03em',
        cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(37, 211, 102, 0.35)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        ...style,
      }}
    >
      <span style={{ fontSize: '18px' }}>💬</span>
      <span>BUY VIA WHATSAPP (INSTANT CHECKOUT)</span>
    </button>
  );
}
