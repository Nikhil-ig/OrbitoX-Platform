'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { getCustomerCsrfToken } from './csrf';
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
  status: 'QUEUED' | 'IN_PROGRESS' | 'READY' | 'BUMPED';
  isTest: boolean;
}

interface MenuItemView {
  id: string;
  name: string;
  categoryName: string;
  basePriceMinor: number;
  isVegetarian?: boolean;
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
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [previewData, setPreviewData] = useState<any>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [dishesByCategory, setDishesByCategory] = useState<Record<string, MenuItemView[]>>({});
  
  const [cart, setCart] = useState<Array<{ id: string; name: string; price: number; qty: number }>>([]);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderNotice, setOrderNotice] = useState<string | null>(null);

  // Live KDS tickets state
  const [kdsTickets, setKdsTickets] = useState<TestTicket[]>([]);
  const [kdsLoading, setKdsLoading] = useState(false);

  // Genuine optical QR code data URL
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const baseDomain = 'orbitox.io';
  const subdomainUrl = previewData?.restaurant?.subdomainUrl || `http://${slug}.${baseDomain}`;
  const sampleTable = previewData?.tables?.sampleTable || null;
  const dinerUrl = sampleTable?.dinerUrl || null;

  // 1. Fetch Authoritative Preview Summary
  const fetchPreviewSummary = async () => {
    try {
      const res = await fetch(`/api/v1/customer/tenants/${encodeURIComponent(tenantId)}/preview-summary`);
      if (res.ok) {
        const json = await res.json();
        if (json.ok && json.preview) {
          setPreviewData(json.preview);

          const items: MenuItemView[] = json.preview.menu?.items || [];
          const cats: string[] = json.preview.menu?.categories?.length
            ? json.preview.menu.categories
            : Array.from(new Set(items.map((i) => i.categoryName))).filter(Boolean);

          const grouped: Record<string, MenuItemView[]> = {};
          for (const c of cats) {
            grouped[c] = items.filter((i) => i.categoryName === c);
          }
          for (const item of items) {
            if (!grouped[item.categoryName]) {
              grouped[item.categoryName] = [item];
              if (!cats.includes(item.categoryName)) cats.push(item.categoryName);
            }
          }

          setCategories(cats);
          setDishesByCategory(grouped);
          if (cats.length > 0 && cats[0] && !activeCategory) {
            setActiveCategory(cats[0]);
          }

          // Initialize cart with first item from real menu if empty
          if (items.length > 0 && cart.length === 0 && items[0]) {
            const first = items[0];
            const second = items[1] || items[0];
            setCart([
              { id: first.id, name: first.name, price: Math.round(first.basePriceMinor / 100), qty: 1 },
              ...(second && second.id !== first.id ? [{ id: second.id, name: second.name, price: Math.round(second.basePriceMinor / 100), qty: 1 }] : []),
            ]);
          }
        }
      }
    } catch {
      // Keep existing state
    } finally {
      setLoadingSummary(false);
    }
  };

  // 2. Fetch Live KDS Tasks
  const fetchKdsTasks = async () => {
    setKdsLoading(true);
    try {
      const res = await fetch(`/api/v1/customer/tenants/${encodeURIComponent(tenantId)}/kds`);
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.tasks)) {
          // Group tasks by table or order - strictly filter by isTest === true
          const formatted: TestTicket[] = json.tasks
            .filter((t: any) => t.isTest === true)
            .map((t: any) => ({
              id: t.id,
              tableNumber: t.tableNumber ? `Table ${t.tableNumber}` : 'Table T-01',
              items: [{ name: t.itemName || 'Dish', qty: t.quantity || 1, note: t.modifiers?.join(', ') }],
              timeAgo: 'Just now',
              status: t.status === 'READY' ? 'READY' : t.status === 'BUMPED' ? 'BUMPED' : 'QUEUED',
              isTest: true,
            }));
          setKdsTickets(formatted);
        }
      }
    } catch {
      // Fallback
    } finally {
      setKdsLoading(false);
    }
  };

  useEffect(() => {
    fetchPreviewSummary();
    fetchKdsTasks();
    const interval = setInterval(() => {
      fetchKdsTasks();
    }, 4000);
    return () => clearInterval(interval);
  }, [tenantId]);

  // 3. Generate Standards-Compliant Optical QR Code
  useEffect(() => {
    const targetUrl = dinerUrl || subdomainUrl;
    if (targetUrl) {
      QRCode.toDataURL(targetUrl, {
        margin: 1,
        width: 140,
        color: { dark: '#14161A', light: '#FFFFFF' },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch(() => {});
    }
  }, [dinerUrl, subdomainUrl]);

  const handleAddToCart = (dish: MenuItemView) => {
    const price = Math.round(dish.basePriceMinor / 100);
    setCart((prev) => {
      const existing = prev.find((i) => i.id === dish.id);
      if (existing) {
        return prev.map((i) => (i.id === dish.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { id: dish.id, name: dish.name, price, qty: 1 }];
    });
  };

  const cartTotal = cart.reduce((acc, i) => acc + i.price * i.qty, 0);
  const cartCount = cart.reduce((acc, i) => acc + i.qty, 0);

  // 4. Place Real Test Order via Authoritative Endpoint
  const handlePlaceTestOrder = async () => {
    let orderItems = cart;
    if (orderItems.length === 0) {
      const allDishes = Object.values(dishesByCategory).flat();
      if (allDishes.length > 0 && allDishes[0]) {
        const d = allDishes[0];
        orderItems = [{ id: d.id, name: d.name, price: Math.round(d.basePriceMinor / 100), qty: 1 }];
      } else {
        orderItems = [{ id: 'item_sample_1', name: 'Dal Makhani', price: 280, qty: 1 }];
      }
    }
    if (!sampleTable) {
      setOrderNotice('Cannot place test order: No sample table provisioned.');
      return;
    }
    setPlacingOrder(true);
    setOrderNotice(null);

    try {
      const csrfToken = getCustomerCsrfToken();
      const res = await fetch(`/api/v1/customer/tenants/${encodeURIComponent(tenantId)}/test-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({
          tableNumber: sampleTable.tableNumber || 'T-01',
          guestName: `${ownerName} (Preview)`,
          items: orderItems.map((i) => ({
            id: i.id,
            itemId: i.id,
            name: i.name,
            qty: i.qty,
            quantity: i.qty,
            priceMinor: i.price * 100,
          })),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to place test order.');
      }

      setOrderNotice('✓ Test order submitted! It arrived on the kitchen screen.');
      await fetchKdsTasks();
      setTimeout(() => setOrderNotice(null), 5000);
    } catch (err: any) {
      setOrderNotice(`Order error: ${err.message}`);
    } finally {
      setPlacingOrder(false);
    }
  };

  // 5. Bump / Mark Ready on Kitchen Screen
  const handleMarkReady = async (ticketId: string) => {
    try {
      const csrfToken = getCustomerCsrfToken();
      const res = await fetch(`/api/v1/customer/tenants/${encodeURIComponent(tenantId)}/kds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({ taskId: ticketId }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to mark task ready on KDS.');
      }
      setKdsTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: 'READY' } : t))
      );
      setTimeout(fetchKdsTasks, 1000);
    } catch (err: any) {
      setOrderNotice(`KDS error: ${err.message}`);
    }
  };

  const activeDishes = dishesByCategory[activeCategory] || [];

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top Preview Status Banner */}
      <div className="w-full bg-[#14161A] text-white px-6 py-2.5 flex items-center justify-between text-xs rounded-2xl shadow-lg mb-6">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[#14161A] bg-[#FBBF24] px-2.5 py-0.5 rounded-full">
            PREVIEW
          </span>
          <span className="text-gray-200">
            This is your real restaurant tenant with a starter menu. Diners can open it, but can&apos;t place live payment orders until full launch.
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

      {/* Main 3-Column Preview Layout */}
      <div className="w-full max-w-6xl space-y-6">
        {/* Restaurant Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#FB923C] text-white flex items-center justify-center font-bold text-lg shadow-md">
              {restaurantName.charAt(0) || 'R'}
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#14161A] flex items-center gap-2">
                <span>{restaurantName}</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                  LIVE TENANT
                </span>
              </h1>
              <p className="text-xs text-[#5A6170] flex items-center gap-2">
                <span>{city}</span>
                <span>·</span>
                <a
                  href={subdomainUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#2F5BD8] hover:underline flex items-center gap-1"
                >
                  <span>{subdomainUrl.replace(/^https?:\/\//, '')}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchPreviewSummary}
              className="p-2 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 cursor-pointer shadow-sm"
              title="Refresh Preview Data"
            >
              <RefreshCw className={`h-4 w-4 ${loadingSummary ? 'animate-spin' : ''}`} />
            </button>
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#14161A] text-white">
              Template: {templateId.toUpperCase()}
            </span>
          </div>
        </div>

        {/* 3 Columns Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Interactive Phone Mockup (390×844) */}
          <div className="flex flex-col items-center">
            <div className="w-[310px] h-[600px] bg-[#FFF7ED] rounded-[38px] border-8 border-[#14161A] shadow-2xl p-4 flex flex-col justify-between overflow-hidden relative">
              {/* Notch */}
              <div className="w-28 h-4 bg-[#14161A] rounded-full mx-auto -mt-2 mb-2" />

              <div className="space-y-3 overflow-y-auto pr-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold text-[#9A3412] bg-[#FED7AA] px-2 py-0.5 rounded-full inline-block">
                    Starter menu
                  </span>
                  <span className="text-[10px] text-[#5A6170]">{city}</span>
                </div>

                <div>
                  <div className="text-[10px] text-[#5A6170]">
                    {restaurantName} · {sampleTable?.tableNumber || 'Table T-01'}
                  </div>
                  <h4 className="font-bold text-sm text-[#14161A]">What are you craving?</h4>
                </div>

                {/* Category Pills */}
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {(categories.length > 0 ? categories : ['Mains', 'Starters', 'Desserts']).map((cat) => (
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

                {/* Real Dishes */}
                <div className="space-y-2 pt-1">
                  {activeDishes.length > 0 ? (
                    activeDishes.map((dish) => (
                      <div
                        key={dish.id}
                        className="p-2.5 rounded-[18px] bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-between"
                      >
                        <div className="max-w-[200px]">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                dish.isVegetarian ? 'bg-emerald-600' : 'bg-red-600'
                              }`}
                            />
                            <span className="font-semibold text-xs text-[#14161A] truncate">{dish.name}</span>
                          </div>
                          <div className="text-[10px] text-[#5A6170] mt-0.5">
                            ₹{Math.round(dish.basePriceMinor / 100)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddToCart(dish)}
                          className="h-6 w-6 rounded-full bg-[#FB923C] text-white flex items-center justify-center font-bold text-xs hover:bg-[#EA580C] cursor-pointer shadow-sm transition-all shrink-0"
                        >
                          +
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs text-gray-700">
                      Loading menu catalogue...
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Test Order Action */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={placingOrder || cart.length === 0 || !sampleTable}
                  onClick={handlePlaceTestOrder}
                  className="w-full p-2.5 rounded-full bg-[#14161A] text-white text-[11px] font-semibold text-center cursor-pointer hover:bg-black/90 shadow-md transition-all disabled:opacity-50"
                >
                  {placingOrder ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <RefreshCw className="h-3 w-3 animate-spin" /> Placing test order...
                    </span>
                  ) : !sampleTable ? (
                    <span>Sample table required</span>
                  ) : (
                    <span>Test order · {cartCount} items · ₹{cartTotal}</span>
                  )}
                </button>
              </div>
            </div>

            {orderNotice && (
              <div className="mt-3 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 text-center animate-in fade-in max-w-[310px]">
                {orderNotice}
              </div>
            )}
          </div>

          {/* Column 2: Try It Like a Diner Guide & Genuine Table QR */}
          <div className="p-6 rounded-[32px] bg-white border border-[#E2E8F0] shadow-md space-y-5 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-base text-[#14161A]">Try it like a diner</h3>
              <p className="text-xs text-[#5A6170] mt-0.5">
                Scan the optical QR code or open the link directly in your browser.
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
                    {/* Genuine optical QR Code */}
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt={`Optical Table QR Code for ${sampleTable?.tableNumber || 'Table T-01'}`}
                        className="w-28 h-28 object-contain mx-auto"
                      />
                    ) : (
                      <div className="w-28 h-28 bg-gray-100 flex items-center justify-center text-[10px] text-gray-400">
                        Generating QR...
                      </div>
                    )}
                    <div className="text-[10px] font-mono font-bold text-center text-[#14161A] mt-1">
                      {sampleTable?.tableNumber || 'Table T-01'}
                    </div>
                  </div>
                  <div className="mt-2">
                    <a
                      href={dinerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[#2F5BD8] hover:underline flex items-center gap-1"
                    >
                      <span>Open {sampleTable?.tableNumber || 'Table T-01'} in new tab</span>
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
                  Place an authorized <span className="font-bold">test order</span>. Test orders are free, bypass payment, and are strictly excluded from revenue & tax accounting.
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
                {kdsTickets.length > 0 ? (
                  kdsTickets.map((ticket) => (
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

                      {ticket.status === 'READY' || ticket.status === 'BUMPED' ? (
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
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-gray-300">
                    No active kitchen orders. Place a test order from the phone on the left!
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={placingOrder || !sampleTable}
                onClick={handlePlaceTestOrder}
                className="w-full py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-medium border border-white/10 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span>{sampleTable ? 'Place Quick Test Order' : 'Sample table required'}</span>
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
                  <span>Curated menu in {categories.length || 4} categories with GST HSN tags</span>
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
