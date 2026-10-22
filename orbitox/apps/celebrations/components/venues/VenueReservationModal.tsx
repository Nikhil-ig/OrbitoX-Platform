'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  ArrowLeft,
  Heart,
  Star,
  Users,
  Utensils,
  Sparkles,
  Calendar,
  CreditCard,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { PerforatedTicketPass, TicketPassData } from './PerforatedTicketPass';

export interface VenueItem {
  id: string;
  name: string;
  city: string;
  region: string;
  address: string;
  price: string;
  priceRaw: number;
  rating: number;
  capacity: string;
  catering: string;
  decor: string;
  makeup: string;
  category: 'villa' | 'palace' | 'ballroom' | 'beachfront' | 'rustic';
  coverImage: string;
  gallery: string[];
  description: string;
}

interface Props {
  venue: VenueItem | null;
  isOpen: boolean;
  onClose: () => void;
  isWishlisted: boolean;
  onToggleWishlist: (id: string) => void;
}

export function VenueReservationModal({
  venue,
  isOpen,
  onClose,
  isWishlisted,
  onToggleWishlist,
}: Props) {
  const router = useRouter();

  // Wizard Step: 'detail' | 'calendar' | 'payment' | 'receipt' | 'success'
  const [step, setStep] = useState<'detail' | 'calendar' | 'payment' | 'receipt' | 'success'>('detail');

  // Calendar State
  const [currentMonthIndex, setCurrentMonthIndex] = useState(8); // September
  const [selectedDay, setSelectedDay] = useState<number>(18);

  // Payment Form State
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple' | 'google' | 'paypal'>('card');
  const [cardHolder, setCardHolder] = useState('Julian Vance');
  const [cardNumber, setCardNumber] = useState('0811 2570 3291 7180');
  const [cardExpiry, setCardExpiry] = useState('09/28');
  const [cardCvv, setCardCvv] = useState('777');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Ticket Data State
  const [confirmedTicket, setConfirmedTicket] = useState<TicketPassData | null>(null);

  if (!isOpen || !venue) return null;

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const handleNextMonth = () => {
    setCurrentMonthIndex((prev) => (prev + 1) % 12);
  };
  const handlePrevMonth = () => {
    setCurrentMonthIndex((prev) => (prev === 0 ? 11 : prev - 1));
  };

  const handleProcessPayment = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      const ticket: TicketPassData = {
        ticketId: `ORB-${Math.floor(1000 + Math.random() * 9000)}-VIP-2027`,
        venueName: venue.name,
        venueCity: venue.city,
        venueAddress: venue.address,
        venueImage: venue.coverImage,
        plannerName: cardHolder.trim() || 'Julian Vance',
        eventDate: `${selectedDay} ${months[currentMonthIndex]} 2027`,
        guestCount: venue.capacity,
        cateringTier: venue.catering,
        price: venue.price,
        occasion: 'Wedding Celebration',
      };

      // Persist to local bookings history
      try {
        const existing = JSON.parse(localStorage.getItem('orbitox_venue_bookings') || '[]');
        localStorage.setItem('orbitox_venue_bookings', JSON.stringify([ticket, ...existing]));
      } catch {
        // storage fallback
      }

      setConfirmedTicket(ticket);
      setIsProcessingPayment(false);
      setStep('receipt');
    }, 1200);
  };

  const handleDesignInvitation = () => {
    onClose();
    // Route to /create with pre-filled venue query params
    router.push(
      `/create?occasion=wedding&template=celestial-parallax`
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(7, 9, 14, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: '#0D121D',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '28px',
          overflow: 'hidden',
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 230, 138, 0.15)',
          position: 'relative',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ════════════════════════════════════════════════════════════ */}
        {/* TOP BAR / NAVIGATION                                         */}
        {/* ════════════════════════════════════════════════════════════ */}
        <div
          style={{
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(18, 24, 38, 0.6)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {step !== 'detail' && step !== 'success' && (
              <button
                type="button"
                onClick={() => {
                  if (step === 'calendar') setStep('detail');
                  else if (step === 'payment') setStep('calendar');
                  else if (step === 'receipt') setStep('payment');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#CAD5E2',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                }}
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#FFFFFF', textTransform: 'capitalize' }}>
              {step === 'detail'
                ? 'Venue Specifications'
                : step === 'calendar'
                ? 'Select Celebration Date'
                : step === 'payment'
                ? 'Multi-Method Checkout'
                : step === 'receipt'
                ? 'Digital Ticket Pass'
                : 'Rental Confirmed!'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {step === 'detail' && (
              <button
                type="button"
                onClick={() => onToggleWishlist(venue.id)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: isWishlisted ? '#FF4D8D' : '#CAD5E2',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Heart size={16} fill={isWishlisted ? '#FF4D8D' : 'none'} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#CAD5E2',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* SCROLLABLE CONTENT BODY                                      */}
        {/* ════════════════════════════════════════════════════════════ */}
        <div style={{ overflowY: 'auto', padding: '20px', flex: 1 }}>
          {/* STEP 1: VENUE SPECIFICATIONS & DETAILS (Reference 00:08) */}
          {step === 'detail' && (
            <div>
              {/* Cover Image Carousel */}
              <div
                style={{
                  position: 'relative',
                  height: '210px',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  marginBottom: '16px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}
              >
                <img
                  src={venue.coverImage}
                  alt={venue.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    background: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(8px)',
                    color: '#FFD166',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                  }}
                >
                  <Star size={13} fill="#FFD166" />
                  <span>{venue.rating}</span>
                </div>
              </div>

              {/* Title & Location */}
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#FFFFFF', margin: '0 0 4px 0' }}>
                  {venue.name}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--cel-text-muted)', fontSize: '0.84rem' }}>
                  <MapPin size={14} color="#00E68A" />
                  <span>{venue.address}</span>
                </div>
              </div>

              {/* Amenity Badges Row (Directly from Dribbble Reference 00:08) */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <div className="amenity-pill-badge">
                  <Users size={14} color="#00E68A" />
                  <span>{venue.capacity}</span>
                </div>
                <div className="amenity-pill-badge">
                  <Utensils size={14} color="#00D2FF" />
                  <span>{venue.catering}</span>
                </div>
                <div className="amenity-pill-badge">
                  <Sparkles size={14} color="#A855F7" />
                  <span>{venue.decor}</span>
                </div>
                <div className="amenity-pill-badge">
                  <Star size={14} color="#FFD166" />
                  <span>{venue.makeup}</span>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Description
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--cel-text-secondary)', lineHeight: 1.55, margin: 0 }}>
                  {venue.description}
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: INTERACTIVE CALENDAR DATE PICKER (Reference 00:10) */}
          {step === 'calendar' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.78rem', color: '#00E68A', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {venue.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FFFFFF' }}>
                    {months[currentMonthIndex]} 2027
                  </span>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Days of Week */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', gap: '4px', marginBottom: '8px' }}>
                {daysOfWeek.map((day) => (
                  <div key={day} style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--cel-text-dim)' }}>
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '20px' }}>
                {/* Simulated leading empty days */}
                {[28, 29, 30, 31].map((d) => (
                  <button key={`prev-${d}`} type="button" disabled className="calendar-grid-cell">
                    {d}
                  </button>
                ))}
                {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => {
                  const isSelected = selectedDay === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDay(d)}
                      className={`calendar-grid-cell ${isSelected ? 'selected' : ''}`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  padding: '14px',
                  borderRadius: '14px',
                  background: 'rgba(0, 230, 138, 0.08)',
                  border: '1px solid rgba(0, 230, 138, 0.2)',
                  fontSize: '0.8rem',
                  color: '#CAD5E2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Calendar size={18} color="#00E68A" />
                <div>
                  <strong style={{ color: '#FFFFFF' }}>Selected Date:</strong> {selectedDay} {months[currentMonthIndex]} 2027 (3 Days Exclusive Access)
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: MULTI-METHOD CHECKOUT (Reference 00:12 - 00:18) */}
          {step === 'payment' && (
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--cel-text-muted)', marginBottom: '14px' }}>
                Select preferred secure checkout method:
              </div>

              {/* Payment Gateways */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
                <div
                  className={`payment-method-card ${paymentMethod === 'card' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('card')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '22px', borderRadius: '4px', background: '#EB001B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.65rem', fontWeight: 900 }}>
                      MC
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#FFFFFF' }}>
                        Credit / Debit Card
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--cel-text-muted)' }}>
                        Mastercard, Visa, Amex
                      </div>
                    </div>
                  </div>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: paymentMethod === 'card' ? '5px solid #00E68A' : '2px solid rgba(255,255,255,0.3)' }} />
                </div>

                <div
                  className={`payment-method-card ${paymentMethod === 'apple' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('apple')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '22px', borderRadius: '4px', background: '#000', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.65rem', fontWeight: 900 }}>
                      Pay
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#FFFFFF' }}>Apple Pay</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--cel-text-muted)' }}>1-Tap Touch ID Checkout</div>
                    </div>
                  </div>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: paymentMethod === 'apple' ? '5px solid #00E68A' : '2px solid rgba(255,255,255,0.3)' }} />
                </div>

                <div
                  className={`payment-method-card ${paymentMethod === 'google' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('google')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '22px', borderRadius: '4px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4285F4', fontSize: '0.65rem', fontWeight: 900 }}>
                      GPay
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#FFFFFF' }}>Google Pay</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--cel-text-muted)' }}>Fast Google Account Checkout</div>
                    </div>
                  </div>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: paymentMethod === 'google' ? '5px solid #00E68A' : '2px solid rgba(255,255,255,0.3)' }} />
                </div>

                <div
                  className={`payment-method-card ${paymentMethod === 'paypal' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('paypal')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '22px', borderRadius: '4px', background: '#003087', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0079C1', fontSize: '0.65rem', fontWeight: 900 }}>
                      PP
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#FFFFFF' }}>PayPal</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--cel-text-muted)' }}>Buyer Protected Transfer</div>
                    </div>
                  </div>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: paymentMethod === 'paypal' ? '5px solid #00E68A' : '2px solid rgba(255,255,255,0.3)' }} />
                </div>
              </div>

              {/* Expanded Card Form when Credit Card is active */}
              {paymentMethod === 'card' && (
                <div style={{ padding: '16px', borderRadius: '16px', background: '#07090E', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '18px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <label className="studio-input-label">Cardholder Full Name:</label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="e.g. Julian Vance"
                      className="studio-input-box"
                      style={{ minHeight: '40px', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label className="studio-input-label">Card Number:</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="0000 0000 0000 0000"
                      className="studio-input-box"
                      style={{ minHeight: '40px', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label className="studio-input-label">CVV:</label>
                      <input
                        type="text"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="777"
                        maxLength={4}
                        className="studio-input-box"
                        style={{ minHeight: '40px', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label className="studio-input-label">Expiry Date:</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="studio-input-box"
                        style={{ minHeight: '40px', fontSize: '0.88rem' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--cel-text-dim)', marginBottom: '14px' }}>
                <Lock size={12} color="#00E68A" />
                <span>256-Bit Encrypted Secure Escrow Checkout</span>
              </div>
            </div>
          )}

          {/* STEP 4: PERFORATED DIGITAL TICKET PASS (Reference 00:19 - 00:20) */}
          {step === 'receipt' && confirmedTicket && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.74rem', color: '#00E68A', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  RESERVATION VOUCHER ACTIVE
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#FFFFFF' }}>
                  Your Digital Venue Pass
                </div>
              </div>

              <PerforatedTicketPass
                data={confirmedTicket}
                onDesignInvitation={() => setStep('success')}
              />
            </div>
          )}

          {/* STEP 5: SUCCESS CONFIRMATION (Reference 00:22) */}
          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '24px 10px' }}>
              {/* Interlocking Rings Micro-Graphic with Glowing Aura */}
              <div
                style={{
                  width: '100px',
                  height: '100px',
                  margin: '0 auto 20px auto',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(0, 230, 138, 0.25) 0%, transparent 70%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    border: '4px solid #00E68A',
                    position: 'absolute',
                    left: '18px',
                    boxShadow: '0 0 16px rgba(0, 230, 138, 0.5)',
                  }}
                />
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    border: '4px solid #00D2FF',
                    position: 'absolute',
                    right: '18px',
                    boxShadow: '0 0 16px rgba(0, 210, 255, 0.5)',
                  }}
                />
              </div>

              <div className="badge-tag live" style={{ marginBottom: '12px' }}>
                RESERVATION CONFIRMED
              </div>

              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FFFFFF', margin: '0 0 8px 0' }}>
                Successful Place Rental!
              </h2>

              <p style={{ color: 'var(--cel-text-secondary)', fontSize: '0.88rem', maxWidth: '340px', margin: '0 auto 28px auto', lineHeight: 1.5 }}>
                You have successfully reserved your dream celebration venue at <strong style={{ color: '#FFFFFF' }}>{venue.name}</strong>.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleDesignInvitation}
                  className="btn-mint"
                  style={{ width: '100%', padding: '14px', fontSize: '0.92rem', fontWeight: 800 }}
                >
                  <Sparkles size={16} />
                  <span>Craft Digital Invitation for this Venue</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep('receipt')}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#CAD5E2',
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                  }}
                >
                  View Digital Barcode Pass
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--cel-text-muted)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    marginTop: '4px',
                  }}
                >
                  Back to Home
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* STICKY BOTTOM ACTION BAR (Reference 00:09, 00:11, 00:18)     */}
        {/* ════════════════════════════════════════════════════════════ */}
        {step !== 'receipt' && step !== 'success' && (
          <div
            style={{
              padding: '16px 20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(18, 24, 38, 0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexShrink: 0,
            }}
          >
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--cel-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Total Rate
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#00E68A' }}>
                {venue.price}
              </div>
            </div>

            {step === 'detail' && (
              <button
                type="button"
                onClick={() => setStep('calendar')}
                className="btn-mint"
                style={{ padding: '12px 28px', fontSize: '0.88rem', fontWeight: 800 }}
              >
                Book Now
              </button>
            )}

            {step === 'calendar' && (
              <button
                type="button"
                onClick={() => setStep('payment')}
                className="btn-mint"
                style={{ padding: '12px 28px', fontSize: '0.88rem', fontWeight: 800 }}
              >
                Proceed to Payment
              </button>
            )}

            {step === 'payment' && (
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={handleProcessPayment}
                className="btn-mint"
                style={{ padding: '12px 28px', fontSize: '0.88rem', fontWeight: 800 }}
              >
                {isProcessingPayment ? 'Securing Reservation...' : 'Complete Payment'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
