'use client';

import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Monitor,
  ChefHat,
  ShoppingBag,
  ListChecks,
  Check,
  Zap,
  ExternalLink,
  ArrowLeft,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface D6Props {
  ownerName: string;
  restaurantName: string;
  slug: string;
  tenantId: string;
  tableCount: number;
  templateId: string;
  city: string;
  onSwitchToDesktop: () => void;
}

export function D6MobilePreviewView({
  ownerName,
  restaurantName,
  slug,
  tenantId,
  tableCount,
  templateId,
  city,
  onSwitchToDesktop,
}: D6Props) {
  const [activeTab, setActiveTab] = useState<'storefront' | 'kds' | 'checklist'>('storefront');
  const [menuItems, setMenuItems] = useState<Array<{ id: string; name: string; price: number; qty: number }>>([]);
  const [cartItems, setCartItems] = useState<Array<{ id: string; name: string; price: number; qty: number }>>([]);
  const [kdsTasks, setKdsTasks] = useState<any[]>([]);
  const [kdsReady, setKdsReady] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/customer/tenants/${encodeURIComponent(tenantId)}/preview-summary`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.preview?.menu?.items?.length) {
          const formatted = data.preview.menu.items.map((i: any) => ({
            id: i.id,
            name: i.name,
            price: Math.round(i.basePriceMinor / 100),
            qty: 1,
          }));
          setMenuItems(formatted);
          if (cartItems.length === 0 && formatted.length > 0) {
            setCartItems([formatted[0], ...(formatted[1] ? [formatted[1]] : [])]);
          }
        }
      })
      .catch(() => {});

    fetch(`/api/v1/customer/tenants/${encodeURIComponent(tenantId)}/kds`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.tasks)) {
          setKdsTasks(data.tasks);
        }
      })
      .catch(() => {});
  }, [tenantId]);

  const cartTotal = cartItems.reduce((acc, i) => acc + i.price * i.qty, 0);

  const handlePlaceTestOrder = async () => {
    if (cartItems.length === 0) return;
    setPlacingOrder(true);
    try {
      await fetch(`/api/v1/customer/tenants/${encodeURIComponent(tenantId)}/test-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: 'T-01',
          items: cartItems.map((i) => ({
            id: i.id,
            name: i.name,
            qty: i.qty,
            quantity: i.qty,
            priceMinor: i.price * 100,
          })),
        }),
      });
      setActiveTab('kds');
      setKdsReady(false);
      const res = await fetch(`/api/v1/customer/tenants/${encodeURIComponent(tenantId)}/kds`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.tasks)) setKdsTasks(data.tasks);
    } catch {
      // Fallback
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center py-4">
      {/* View Switcher Header */}
      <div className="w-full max-w-sm flex items-center justify-between px-2 mb-3">
        <button
          type="button"
          onClick={onSwitchToDesktop}
          className="text-xs font-semibold text-[#14161A] flex items-center gap-1.5 hover:text-blue-600 cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Desktop View</span>
        </button>
        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
          D6 Mobile Preview
        </span>
      </div>

      {/* 390×844 Mobile Device Frame */}
      <div className="w-[390px] h-[844px] bg-[#FFF7ED] rounded-[48px] border-[10px] border-[#14161A] shadow-2xl flex flex-col justify-between overflow-hidden relative">
        {/* Notch */}
        <div className="w-36 h-5 bg-[#14161A] rounded-full mx-auto -mt-2 z-20 shrink-0" />

        {/* Top Status & Brand Header */}
        <div className="px-5 pt-2 pb-3 bg-white/80 backdrop-blur-md border-b border-[#E2E8F0] z-10 shrink-0">
          <div className="flex items-center justify-between text-[11px] text-[#5A6170]">
            <span className="font-semibold text-[#9A3412] bg-[#FED7AA] px-2 py-0.5 rounded-full">
              Preview Mode
            </span>
            <span>{city} · Table T-01</span>
          </div>
          <h2 className="text-lg font-bold text-[#14161A] mt-1">{restaurantName}</h2>
          <div className="text-[10px] text-gray-500">{slug}.orbitox.io</div>
        </div>

        {/* Scrollable Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'storefront' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-sm text-[#14161A]">Starter Menu · {templateId.toUpperCase()}</h3>
                <p className="text-[11px] text-[#5A6170]">Place an authorized test order to preview kitchen routing.</p>
              </div>

              <div className="space-y-2.5">
                {(menuItems.length > 0 ? menuItems : cartItems).map((item) => (
                  <div key={item.id || item.name} className="p-3 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#14161A]">{item.name}</div>
                      <div className="text-[11px] text-[#5A6170]">₹{item.price}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setCartItems((prev) => {
                          const ex = prev.find((i) => i.id === item.id);
                          if (ex) return prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
                          return [...prev, { ...item, qty: 1 }];
                        })
                      }
                      className="h-6 w-6 rounded-full bg-[#FB923C] text-white flex items-center justify-center font-bold text-xs"
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                ⚡ Test orders are free, bypass payment, and are strictly excluded from accounting.
              </div>
            </div>
          )}

          {activeTab === 'kds' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-[#14161A]">Kitchen Display System</h3>
                <span className="text-emerald-700 font-bold text-[10px] flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" /> Live
                </span>
              </div>

              <div className="p-4 rounded-[24px] bg-[#14161A] text-white space-y-3 shadow-lg">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">Table T-01</span>
                    <span className="text-[9px] font-extrabold text-[#14161A] bg-[#FBBF24] px-1.5 py-0.2 rounded-full">
                      TEST ORDER
                    </span>
                  </div>
                  <span className="text-gray-400 text-[10px]">Just now</span>
                </div>

                <div className="text-xs space-y-1 text-gray-200">
                  {cartItems.map((c, idx) => (
                    <p key={idx}>{c.qty} × {c.name}</p>
                  ))}
                </div>

                {kdsReady ? (
                  <div className="py-2 rounded-full bg-emerald-600 text-white text-xs font-bold text-center">
                    ✓ Fulfilled & Ready
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setKdsReady(true)}
                    className="w-full py-2 rounded-full bg-[#FB923C] text-[#14161A] text-xs font-bold hover:bg-[#FB923C]/90 cursor-pointer"
                  >
                    Bump ticket (Mark ready)
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'checklist' && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-[#14161A]">Launch Readiness</h3>
              <div className="space-y-2.5">
                <div className="p-3 rounded-2xl bg-white border border-[#E2E8F0] flex items-center gap-2.5 text-xs text-[#14161A]">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Account &amp; Phone verified</span>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-[#E2E8F0] flex items-center gap-2.5 text-xs text-[#14161A]">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Organization &amp; GSTIN registered</span>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-[#E2E8F0] flex items-center gap-2.5 text-xs text-[#14161A]">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{tableCount} tables with QR codes provisioned</span>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-[#E2E8F0] flex items-center gap-2.5 text-xs text-[#14161A]">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Template {templateId.toUpperCase()} active</span>
                </div>
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-2.5 text-xs text-amber-900">
                  <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                  <span>Razorpay payment gateway (Connect in F5)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Cart & Nav Bar */}
        <div className="p-3 bg-white border-t border-[#E2E8F0] space-y-2 shrink-0">
          {activeTab === 'storefront' && (
            <button
              type="button"
              disabled={placingOrder}
              onClick={handlePlaceTestOrder}
              className="w-full py-2.5 rounded-full bg-[#14161A] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              {placingOrder ? (
                <span className="flex items-center gap-1.5"><RefreshCw className="h-3 w-3 animate-spin" /> Submitting...</span>
              ) : (
                <span>Submit Test Order · ₹{cartTotal}</span>
              )}
            </button>
          )}

          {/* Tab Navigation Pill Bar */}
          <div className="flex items-center justify-around bg-gray-100 p-1 rounded-full text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('storefront')}
              className={`flex-1 py-1.5 rounded-full font-semibold transition-all ${
                activeTab === 'storefront' ? 'bg-[#14161A] text-white' : 'text-[#5A6170]'
              }`}
            >
              Storefront
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('kds')}
              className={`flex-1 py-1.5 rounded-full font-semibold transition-all ${
                activeTab === 'kds' ? 'bg-[#14161A] text-white' : 'text-[#5A6170]'
              }`}
            >
              Kitchen KDS
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('checklist')}
              className={`flex-1 py-1.5 rounded-full font-semibold transition-all ${
                activeTab === 'checklist' ? 'bg-[#14161A] text-white' : 'text-[#5A6170]'
              }`}
            >
              Checklist
            </button>
          </div>
        </div>

        {/* Home Bar Indicator */}
        <div className="w-32 h-1 bg-[#14161A] rounded-full mx-auto my-1.5 shrink-0" />
      </div>
    </div>
  );
}
