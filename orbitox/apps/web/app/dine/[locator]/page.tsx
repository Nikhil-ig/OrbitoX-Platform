'use client';

import React, { useState, useEffect, use } from 'react';

interface TableDiscovery {
  restaurantName: string;
  branchName: string;
  serviceAreaName: string;
  tableNumber: string;
  capacity: number;
  hasActiveSession: boolean;
  joinPolicy: string;
  locator: string;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  formattedPrice: string;
  category: string;
  imageUrl?: string;
  allergens: string[];
  dietaryFlags: string[];
  preparationDurationMinutes: number;
  modifierGroups: Array<{
    id: string;
    name: string;
    minSelections: number;
    maxSelections: number;
    isRequired: boolean;
    modifiers: Array<{
      id: string;
      name: string;
      formattedDelta: string;
    }>;
  }>;
}

interface CartItem {
  item: MenuItem;
  quantity: number;
  selectedModifierIds: string[];
}

export default function GuestDinePage({ params }: { params: Promise<{ locator: string }> }) {
  const resolvedParams = use(params);
  const locator = resolvedParams.locator;

  const [discovery, setDiscovery] = useState<TableDiscovery | null>(null);
  const [menuCategories, setMenuCategories] = useState<Array<{ name: string; items: MenuItem[] }>>([]);
  const [activeCategory, setActiveCategory] = useState<string>('Starters');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [displayName, setDisplayName] = useState<string>('');
  const [isJoined, setIsJoined] = useState<boolean>(false);
  const [capabilityToken, setCapabilityToken] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [orderProjection, setOrderProjection] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [orderSubmitting, setOrderSubmitting] = useState<boolean>(false);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedMods, setSelectedMods] = useState<string[]>([]);
  const [serviceMessage, setServiceMessage] = useState<string | null>(null);

  // 1. Resolve Table QR Locator
  useEffect(() => {
    async function loadTable() {
      try {
        setLoading(true);
        const res = await fetch(`/api/restaurant/qr/${locator}`);
        const data = await res.json();
        if (data.success) {
          setDiscovery(data.data);
        }

        const menuRes = await fetch('/api/restaurant/menu');
        const menuData = await menuRes.json();
        if (menuData.success) {
          setMenuCategories(menuData.data.categories);
          if (menuData.data.categories.length > 0) {
            setActiveCategory(menuData.data.categories[0].name);
          }
        }
      } catch (err) {
        console.error('Failed to load table discovery', err);
      } finally {
        setLoading(false);
      }
    }
    loadTable();
  }, [locator]);

  // 2. Poll Order Status when Order is active
  useEffect(() => {
    if (!activeOrder?.orderId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/restaurant/orders?orderId=${activeOrder.orderId}`);
        const data = await res.json();
        if (data.success) {
          setOrderProjection(data.data.projection);
        }
      } catch (err) {
        console.error('Status poll error', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeOrder?.orderId]);

  // Handle Seating / Join Party
  const handleJoinParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    try {
      const res = await fetch('/api/restaurant/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locator, displayName: displayName.trim() }),
      });
      const data = await res.json();
      if (data.success && data.data.capabilityToken) {
        setCapabilityToken(data.data.capabilityToken);
        setIsJoined(true);
      }
    } catch (err) {
      console.error('Join party failed', err);
    }
  };

  // Add Item to Cart
  const handleAddToCart = (item: MenuItem, modifierIds: string[] = []) => {
    setCart(prev => {
      const existing = prev.find(
        i => i.item.id === item.id && JSON.stringify(i.selectedModifierIds) === JSON.stringify(modifierIds)
      );
      if (existing) {
        return prev.map(i => (i === existing ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { item, quantity: 1, selectedModifierIds: modifierIds }];
    });
    setCustomizingItem(null);
  };

  // Submit Order to Kitchen
  const handleSubmitOrder = async () => {
    if (cart.length === 0 || !capabilityToken) return;

    try {
      setOrderSubmitting(true);
      const cartItemsPayload = cart.map(c => ({
        itemId: c.item.id,
        quantity: c.quantity,
        selectedModifierIds: c.selectedModifierIds,
      }));

      // 1. Get Quote
      const quoteRes = await fetch('/api/restaurant/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItems: cartItemsPayload }),
      });
      const quoteData = await quoteRes.json();
      if (!quoteData.success) throw new Error(quoteData.error);

      // 2. Submit Order
      const orderRes = await fetch('/api/restaurant/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capabilityToken,
          quoteId: quoteData.data.quoteId,
          cartItems: cartItemsPayload,
          idempotencyKey: `idemp_${Date.now()}_${Math.random()}`,
        }),
      });
      const orderResult = await orderRes.json();
      if (orderResult.success) {
        setActiveOrder(orderResult.data);
        setOrderProjection({
          stage: 'CONFIRMED',
          friendlyTitle: 'Order Confirmed',
          friendlyMessage: 'Order confirmed! Kitchen ticket scheduled for preparation.',
          progressPercent: 40,
        });
        setCart([]); // Clear cart
      }
    } catch (err: any) {
      alert(`Order submission error: ${err.message}`);
    } finally {
      setOrderSubmitting(false);
    }
  };

  const cartTotalCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0D18', color: '#fff' }}>
        <div style={{ fontSize: 28 }}>
          🍽️
        </div>
        <div style={{ marginLeft: 12, fontWeight: 600 }}>Connecting to Table...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0D18', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif', paddingBottom: 100 }}>
      {/* ─── Top Restaurant Identity Header ─── */}
      <header style={{ padding: '16px 20px', background: 'rgba(19, 23, 43, 0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FF7A1A', fontWeight: 700 }}>
              {discovery?.restaurantName || 'OrbitoX Bistro'}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>
              {discovery?.branchName} · <span style={{ color: '#818CF8' }}>Table {discovery?.tableNumber}</span>
            </div>
          </div>
          <div style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10B981', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
            {discovery?.serviceAreaName}
          </div>
        </div>
      </header>

      {/* ─── Join Table Modal if Not Joined ─── */}
      {!isJoined && (
        <div style={{ padding: 20, margin: '20px auto', maxWidth: 420 }}>
          <div style={{ background: '#13172B', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>👋</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px 0' }}>Welcome to Table {discovery?.tableNumber}!</h2>
            <p style={{ fontSize: 14, color: '#A3AED0', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              Enter your name to browse the menu, share food orders with companion diners, and track live kitchen preparation.
            </p>
            <form onSubmit={handleJoinParty}>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="What should we call you? (e.g. Nikhil)"
                style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 12, background: '#0C0F1E', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 15, marginBottom: 16, outline: 'none' }}
                autoFocus
              />
              <button
                type="submit"
                disabled={!displayName.trim()}
                style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg, #FF7A1A 0%, #FF9533 100%)', color: '#fff', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer', boxShadow: '0 8px 20px rgba(255, 122, 26, 0.35)' }}
              >
                Join Table Party
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── Active Order Live Journey Tracker ─── */}
      {orderProjection && (
        <div style={{ margin: '16px 20px', padding: 20, borderRadius: 20, background: 'linear-gradient(135deg, #181E38 0%, #13172B 100%)', border: '1px solid rgba(88, 101, 242, 0.3)', boxShadow: '0 12px 30px rgba(0,0,0,0.5)', transition: 'all 0.3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🔥</span>
              <span style={{ fontWeight: 800, fontSize: 16 }}>{orderProjection.friendlyTitle}</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 8, background: 'rgba(88, 101, 242, 0.2)', color: '#818CF8' }}>
              {orderProjection.stage}
            </span>
          </div>

          <div style={{ fontSize: 13, color: '#A3AED0', marginBottom: 16, lineHeight: 1.4 }}>
            {orderProjection.friendlyMessage}
          </div>

          {/* Progress Bar */}
          <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
            <div
              style={{ height: '100%', width: `${orderProjection.progressPercent}%`, background: 'linear-gradient(90deg, #FF7A1A, #5865F2)', transition: 'width 0.6s ease' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#7B87A8', fontWeight: 600 }}>
            <span>Order #{activeOrder?.orderNumber}</span>
            <span>{orderProjection.progressPercent}% completed</span>
          </div>
        </div>
      )}

      {/* ─── Menu Category Horizontal Pill Rail ─── */}
      {isJoined && (
        <div style={{ padding: '12px 20px', overflowX: 'auto', display: 'flex', gap: 8, scrollbarWidth: 'none' }}>
          {menuCategories.map(cat => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                border: activeCategory === cat.name ? '1px solid #FF7A1A' : '1px solid rgba(255,255,255,0.08)',
                background: activeCategory === cat.name ? 'rgba(255, 122, 26, 0.15)' : '#13172B',
                color: activeCategory === cat.name ? '#FF7A1A' : '#A3AED0',
                fontWeight: 700,
                fontSize: 13,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              {cat.name} ({cat.items.length})
            </button>
          ))}
        </div>
      )}

      {/* ─── Dish Cards Grid ─── */}
      {isJoined && (
        <div style={{ padding: '10px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {menuCategories
            .find(c => c.name === activeCategory)
            ?.items.map(item => (
              <div
                key={item.id}
                style={{
                  background: '#13172B',
                  borderRadius: 18,
                  border: '1px solid rgba(255,255,255,0.06)',
                  padding: 16,
                  display: 'flex',
                  gap: 16,
                  alignItems: 'center',
                }}
              >
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    style={{ width: 84, height: 84, borderRadius: 14, objectFit: 'cover' }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: item.dietaryFlags.includes('VEG') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: item.dietaryFlags.includes('VEG') ? '#10B981' : '#EF4444',
                      }}
                    >
                      {item.dietaryFlags.includes('VEG') ? '● VEG' : '▲ NON-VEG'}
                    </span>
                    <span style={{ fontSize: 11, color: '#7B87A8' }}>⏱ {item.preparationDurationMinutes} min</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{item.name}</div>
                  {item.description && (
                    <div style={{ fontSize: 12, color: '#A3AED0', marginBottom: 8, lineHeight: 1.3 }}>
                      {item.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>{item.formattedPrice}</div>
                    <button
                      onClick={() => {
                        if (item.modifierGroups.length > 0) {
                          setCustomizingItem(item);
                          setSelectedMods([]);
                        } else {
                          handleAddToCart(item);
                        }
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 10,
                        background: '#FF7A1A',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 13,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ─── Sticky Cart Bottom Bar ─── */}
      {cartTotalCount > 0 && (
        <div style={{ position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 40 }}>
          <div
            style={{
              background: '#FF7A1A',
              borderRadius: 18,
              padding: '14px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 12px 30px rgba(255, 122, 26, 0.5)',
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
            }}
            onClick={handleSubmitOrder}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#fff', color: '#FF7A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13 }}>
                {cartTotalCount}
              </div>
              <span style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>
                {orderSubmitting ? 'Sending to Kitchen...' : 'Send Order to Kitchen'}
              </span>
            </div>
            <span style={{ fontWeight: 900, fontSize: 16, color: '#fff' }}>➔</span>
          </div>
        </div>
      )}

      {/* ─── Service Call Bottom Actions ─── */}
      {isJoined && (
        <div style={{ display: 'flex', gap: 8, padding: '16px 20px' }}>
          <button
            onClick={() => setServiceMessage('A server has been notified for Table ' + discovery?.tableNumber)}
            style={{ flex: 1, padding: '10px', borderRadius: 12, background: '#13172B', border: '1px solid rgba(255,255,255,0.08)', color: '#A3AED0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            🔔 Call Server
          </button>
          <button
            onClick={() => setServiceMessage('Water refill requested')}
            style={{ flex: 1, padding: '10px', borderRadius: 12, background: '#13172B', border: '1px solid rgba(255,255,255,0.08)', color: '#A3AED0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            💧 Water Refill
          </button>
          <button
            onClick={() => setServiceMessage('Bill request received. Captain is bringing terminal.')}
            style={{ flex: 1, padding: '10px', borderRadius: 12, background: '#13172B', border: '1px solid rgba(255,255,255,0.08)', color: '#A3AED0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            💳 Request Bill
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {serviceMessage && (
        <div
          style={{ position: 'fixed', bottom: 80, left: 20, right: 20, background: '#10B981', color: '#fff', padding: '12px 16px', borderRadius: 14, fontWeight: 700, fontSize: 13, textAlign: 'center', zIndex: 50, boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)' }}
          onClick={() => setServiceMessage(null)}
        >
          ✓ {serviceMessage}
        </div>
      )}
    </div>
  );
}
