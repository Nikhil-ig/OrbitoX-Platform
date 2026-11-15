'use client';

import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Check,
  CheckCircle2,
  ExternalLink,
  Smartphone,
  Monitor,
  Flame,
  ChefHat,
  Clock,
  Printer,
  Sparkles,
  Zap,
  Layers,
  ArrowRight,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface F4Props {
  ownerName: string;
  restaurantName: string;
  slug: string;
  tenantId: string;
  tableCount: number;
  templateId: string;
  city: string;
  onSwitchToD6Mobile?: () => void;
}

interface TestTicket {
  id: string;
  tableNumber: string;
  items: Array<{ name: string; qty: number; note?: string }>;
  timeAgo: string;
  status: 'QUEUED' | 'IN_PROGRESS' | 'READY';
  isTest: boolean;
}

export function F4WorkingPreviewStep({
  ownerName,
  restaurantName,
  slug,
  tenantId,
  tableCount,
  templateId,
  city,
  onSwitchToD6Mobile,
}: F4Props) {
  const [activeCategory, setActiveCategory] = useState('Mains');
  const [cart, setCart] = useState<Array<{ id: string; name: string; price: number; qty: number }>>([
    { id: '1', name: 'Butter chicken', price: 420, qty: 1 },
    { id: '2', name: 'Dal makhani', price: 310, qty: 1 },
  ]);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderNotice, setOrderNotice] = useState<string | null>(null);

  // Live KDS tickets state
  const [kdsTickets, setKdsTickets] = useState<TestTicket[]>([
    {
      id: 'task_demo_1',
      tableNumber: 'Table T-01',
      items: [
        { name: 'Butter chicken', qty: 1 },
        { name: 'Dal makhani', qty: 1, note: 'less spicy' },
      ],
      timeAgo: '0:42',
      status: 'QUEUED',
      isTest: true,
    },
  ]);

  const baseDomain = 'orbitox.io';
  const subdomainUrl = `http://${slug}.${baseDomain}`;
  const dinerUrl = `${subdomainUrl}/dine/tbl_${slug}_1`;

  const dishes: Record<string, Array<{ id: string; name: string; price: number; isVeg: boolean }>> = {
    Mains: [
      { id: '1', name: 'Butter chicken', price: 420, isVeg: false },
      { id: '2', name: 'Dal makhani', price: 310, isVeg: true },
      { id: '3', name: 'Paneer tikka masala', price: 360, isVeg: true },
    ],
    Starters: [
      { id: '4', name: 'Tandoori murgh half', price: 380, isVeg: false },
      { id: '5', name: 'Amritsari fish fry', price: 440, isVeg: false },
      { id: '6', name: 'Hara bhara kebab', price: 290, isVeg: true },
    ],
    Breads: [
      { id: '7', name: 'Butter garlic naan', price: 90, isVeg: true },
      { id: '8', name: 'Tandoori roti', price: 40, isVeg: true },
    ],
    Desserts: [
      { id: '9', name: 'Gulab jamun with rabri', price: 180, isVeg: true },
      { id: '10', name: 'Kesar kulfi', price: 160, isVeg: true },
    ],
  };

  const handleAddToCart = (dish: { id: string; name: string; price: number }) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === dish.id);
      if (existing) {
        return prev.map((i) => (i.id === dish.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { ...dish, qty: 1 }];
    });
  };

  const cartTotal = cart.reduce((acc, i) => acc + i.price * i.qty, 0);
  const cartCount = cart.reduce((acc, i) => acc + i.qty, 0);

  const handlePlaceTestOrder = async () => {
    if (cart.length === 0) return;
    setPlacingOrder(true);
    setOrderNotice(null);

    // Call test order endpoint or simulate real test order submission
    try {
      const newTicket: TestTicket = {
        id: `task_${Date.now()}`,
        tableNumber: 'Table T-01',
        items: cart.map((i) => ({ name: i.name, qty: i.qty })),
        timeAgo: 'Just now',
        status: 'QUEUED',
        isTest: true,
      };

      // Push to live KDS ticket stream
      setKdsTickets((prev) => [newTicket, ...prev]);
      setOrderNotice('✓ Test order placed! It arrived on the kitchen screen.');
      setTimeout(() => setOrderNotice(null), 5000);
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleMarkReady = (ticketId: string) => {
    setKdsTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: 'READY' } : t))
    );
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top Preview Status Banner */}
      <div className="w-full bg-[#14161A] text-white px-6 py-2.5 flex items-center justify-between text-xs rounded-2xl shadow-lg mb-6">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[#14161A] bg-[#FBBF24] px-2.5 py-0.5 rounded-full">
            PREVIEW
          </span>
          <span className="text-gray-200">
            This is your real restaurant tenant with a sample menu. Diners can open it, but can&apos;t place live payment orders until full launch.
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onSwitchToD6Mobile && (
            <button
              type="button"
              onClick={onSwitchToD6Mobile}
              className="text-xs text-blue-400 hover:text-white px-3 py-1 rounded-full border border-gray-700 flex items-center gap-1.5 cursor-pointer"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Mobile Phone View (D6)</span>
            </button>
          )}
          <span className="text-xs bg-white text-[#14161A] font-semibold px-3 py-1 rounded-full">
            14 days preview remaining
          </span>
        </div>
      </div>

      <div className="w-full max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs text-[#5A6170]">Welcome, {ownerName || 'Owner'}</div>
            <h1 className="text-3xl font-bold tracking-tight text-[#14161A]">
              {restaurantName} is ready to try
            </h1>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E2E8F0] text-xs shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="font-semibold text-[#14161A]">{slug}.orbitox.io</span>
            <a
              href={dinerUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[#2F5BD8] hover:underline font-semibold ml-1 flex items-center gap-0.5"
            >
              <span>Open</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* 3 Columns Layout: Phone Diner View, Step-by-Step Diner Guide, KDS Screen */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Column 1: Interactive Phone Mockup (390×844) */}
          <div className="flex flex-col items-center">
            <div className="w-[310px] h-[600px] bg-[#FFF7ED] rounded-[38px] border-8 border-[#14161A] shadow-2xl p-4 flex flex-col justify-between overflow-hidden relative">
              {/* Notch */}
              <div className="w-28 h-4 bg-[#14161A] rounded-full mx-auto -mt-2 mb-2" />

              <div className="space-y-3 overflow-y-auto pr-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold text-[#9A3412] bg-[#FED7AA] px-2 py-0.5 rounded-full inline-block">
                    Sample menu
                  </span>
                  <span className="text-[10px] text-[#5A6170]">{city}</span>
                </div>

                <div>
                  <div className="text-[10px] text-[#5A6170]">{restaurantName} · Table T-01</div>
                  <h4 className="font-bold text-sm text-[#14161A]">What are you craving?</h4>
                </div>

                {/* Category Pills */}
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {['Mains', 'Starters', 'Breads', 'Desserts'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer whitespace-nowrap transition-all ${
                        activeCategory === cat
                          ? 'bg-[#14161A] text-white'
                          : 'bg-white text-[#5A6170] hover:bg-gray-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Dishes */}
                <div className="space-y-2 pt-1">
                  {(dishes[activeCategory] || []).map((dish) => (
                    <div
                      key={dish.id}
                      className="p-2.5 rounded-[18px] bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              dish.isVeg ? 'bg-emerald-600' : 'bg-red-600'
                            }`}
                          />
                          <span className="font-semibold text-xs text-[#14161A]">{dish.name}</span>
                        </div>
                        <div className="text-[10px] text-[#5A6170] mt-0.5">₹{dish.price}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddToCart(dish)}
                        className="h-6 w-6 rounded-full bg-[#FB923C] text-white flex items-center justify-center font-bold text-xs hover:bg-[#EA580C] cursor-pointer shadow-sm transition-all"
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Test Order Action */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={placingOrder}
                  onClick={handlePlaceTestOrder}
                  className="w-full p-2.5 rounded-full bg-[#14161A] text-white text-[11px] font-semibold text-center cursor-pointer hover:bg-black/90 shadow-md transition-all disabled:opacity-50"
                >
                  {placingOrder ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <RefreshCw className="h-3 w-3 animate-spin" /> Placing test order...
                    </span>
                  ) : (
                    <span>Test order · {cartCount} items · ₹{cartTotal}</span>
                  )}
                </button>
              </div>
            </div>

            {orderNotice && (
              <div className="mt-3 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 text-center animate-in fade-in">
                {orderNotice}
              </div>
            )}
          </div>

          {/* Column 2: Try It Like a Diner Guide & Table QR */}
          <div className="p-6 rounded-[32px] bg-white border border-[#E2E8F0] shadow-md space-y-5 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-base text-[#14161A]">Try it like a diner</h3>
              <p className="text-xs text-[#5A6170] mt-0.5">
                Experience the real table ordering flow directly from your smartphone.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="h-6 w-6 rounded-full bg-[#34D399] text-[#14161A] font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <p className="text-xs font-medium text-[#14161A]">
                    Scan this QR code with your phone camera, or click the link below:
                  </p>
                  <div className="mt-2.5 p-3 rounded-[20px] bg-white border border-[#E2E8F0] shadow-sm inline-block">
                    {/* SVG Stylized QR Code */}
                    <svg
                      viewBox="0 0 100 100"
                      className="w-28 h-28 text-[#14161A]"
                      fill="currentColor"
                      aria-label="Table QR Code"
                    >
                      <rect x="0" y="0" width="30" height="30" rx="4" />
                      <rect x="5" y="5" width="20" height="20" fill="white" rx="2" />
                      <rect x="10" y="10" width="10" height="10" />
                      <rect x="70" y="0" width="30" height="30" rx="4" />
                      <rect x="75" y="5" width="20" height="20" fill="white" rx="2" />
                      <rect x="80" y="10" width="10" height="10" />
                      <rect x="0" y="70" width="30" height="30" rx="4" />
                      <rect x="5" y="75" width="20" height="20" fill="white" rx="2" />
                      <rect x="10" y="80" width="10" height="10" />
                      {/* Data dots */}
                      <circle cx="45" cy="15" r="4" />
                      <circle cx="55" cy="25" r="4" />
                      <circle cx="45" cy="45" r="5" />
                      <circle cx="55" cy="55" r="4" />
                      <circle cx="85" cy="45" r="4" />
                      <circle cx="45" cy="85" r="4" />
                      <circle cx="85" cy="85" r="5" />
                    </svg>
                    <div className="text-[10px] font-mono font-bold text-center text-[#14161A] mt-1">
                      Table T-01
                    </div>
                  </div>
                  <div className="mt-2">
                    <a
                      href={dinerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[#2F5BD8] hover:underline flex items-center gap-1"
                    >
                      <span>Open Table T-01 in new tab</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="h-6 w-6 rounded-full bg-[#34D399] text-[#14161A] font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </span>
                <p className="text-xs font-medium text-[#14161A]">
                  Place a <span className="font-bold">test order</span>. Test orders are free, bypass payment, and are excluded from tax reports.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="h-6 w-6 rounded-full bg-[#34D399] text-[#14161A] font-bold text-xs flex items-center justify-center shrink-0">
                  3
                </span>
                <p className="text-xs font-medium text-[#14161A]">
                  Watch it arrive immediately on the kitchen screen to the right →
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                Want physical signs? Print table QR codes in bulk from your Table Management console anytime.
              </span>
            </div>
          </div>

          {/* Column 3: Live Kitchen Screen (KDS) & Setup Checklist */}
          <div className="space-y-6">
            {/* Live KDS Screen */}
            <div className="p-5 rounded-[28px] bg-[#14161A] text-white shadow-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ChefHat className="h-4 w-4 text-[#FB923C]" />
                  <span className="font-semibold text-white">Kitchen screen (KDS)</span>
                </div>
                <span className="text-[#34D399] flex items-center gap-1 font-semibold text-[11px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#34D399] animate-ping" /> live
                </span>
              </div>

              {/* Tickets list */}
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {kdsTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-3 rounded-[20px] bg-[#1E232B] border border-white/10 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{ticket.tableNumber}</span>
                        {ticket.isTest && (
                          <span className="text-[10px] font-bold text-[#14161A] bg-[#FBBF24] px-1.5 py-0.2 rounded-full">
                            TEST
                          </span>
                        )}
                      </div>
                      <span className="text-[#9AA3AF] text-[11px]">{ticket.timeAgo}</span>
                    </div>

                    <div className="text-xs text-white/90 space-y-1">
                      {ticket.items.map((it, idx) => (
                        <p key={idx}>
                          {it.qty} × {it.name} {it.note && <span className="text-[#9AA3AF]">· {it.note}</span>}
                        </p>
                      ))}
                    </div>

                    {ticket.status === 'READY' ? (
                      <div className="py-1 rounded-full bg-emerald-600/30 text-emerald-400 text-xs font-bold text-center">
                        ✓ Dispatched / Ready
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleMarkReady(ticket.id)}
                        className="w-full py-1.5 rounded-full bg-[#FB923C] text-[#14161A] text-xs font-bold cursor-pointer hover:bg-[#FB923C]/90 shadow-sm transition-all"
                      >
                        Mark ready
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handlePlaceTestOrder}
                className="w-full py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-medium border border-white/10 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span>Simulate Kitchen Order</span>
              </button>
            </div>

            {/* Already set up checklist */}
            <div className="p-5 rounded-[28px] bg-white border border-[#E2E8F0] shadow-md space-y-3">
              <h4 className="font-bold text-sm text-[#14161A]">Already set up for you</h4>
              <div className="space-y-2.5 text-xs text-[#14161A]">
                <p className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#065F46] shrink-0" />
                  <span>{tableCount} tables with cryptographic QR codes on 1 floor</span>
                </p>
                <p className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#065F46] shrink-0" />
                  <span>Curated menu in 4 categories with GST HSN tags</span>
                </p>
                <p className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#065F46] shrink-0" />
                  <span>Realtime KDS and Table Operations active</span>
                </p>
                <p className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#065F46] shrink-0" />
                  <span>Branded with Template {templateId.toUpperCase()}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

