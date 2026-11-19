import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  QuantityStepper,
  PillNav,
  BottomTabBar,
  VegMark,
} from '../components';
import {
  Search,
  Plus,
  Check,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Home,
  FileText,
  Layers,
  Menu as MenuIcon,
  ShoppingBag,
  Bell,
  Utensils,
  CreditCard,
  Settings,
} from 'lucide-react';

const meta: Meta = {
  title: 'Showcase/Restaurant Operations & Staff',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

// ─── S2. POS Take Order & Checkout (Tablet Landscape 1194x834, Light Mood) ───
export const S2_POSTakeOrderAndCheckout: StoryObj = {
  name: 'S2: POS Take Order & Checkout (Tablet Landscape, Light)',
  render: () => (
    <div className="min-h-screen bg-[#CBD5E1] p-6 flex justify-center items-center" data-theme="light">
      <div className="w-full max-w-[1194px] h-[780px] bg-[#EEF1F5] rounded-[36px] shadow-2xl border-8 border-[#14161A] flex overflow-hidden">
        {/* Left POS Menu Area (Light Mood) */}
        <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            {/* Top Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-9 w-9 rounded-full bg-[#14161A] text-white font-bold text-xs flex items-center justify-center">M</span>
                <PillNav
                  items={[
                    { id: 'mains', label: 'Mains', active: true },
                    { id: 'breads', label: 'Breads' },
                    { id: 'drinks', label: 'Drinks' },
                  ]}
                />
              </div>

              <div className="flex items-center gap-2">
                <button type="button" aria-label="Search" className="h-9 w-9 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center text-[#5A6170]">
                  <Search className="h-4 w-4" />
                </button>
                <span className="h-9 w-9 rounded-full bg-[#DBEAFE] text-[#2F5BD8] font-bold text-xs flex items-center justify-center">
                  AN
                </span>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-tight text-[#14161A]">Mains</h2>
              <p className="text-xs text-[#5A6170]">6 dishes · tap to add</p>
            </div>

            {/* 3x2 Dish Grid */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              {/* Dish 1: Butter Chicken */}
              <div className="p-3.5 rounded-[24px] bg-white border-2 border-[#2F5BD8] shadow-sm space-y-2 flex flex-col justify-between relative cursor-pointer">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-semibold text-white bg-[#14161A] px-2 py-0.2 rounded-full">Bestseller</span>
                    <span className="text-[9px] font-semibold text-white bg-[#2F5BD8] px-2 py-0.2 rounded-full">2 in order</span>
                  </div>
                  <div className="h-20 rounded-[16px] bg-[#FFF7ED] flex items-center justify-center">
                    <div className="h-12 w-20 rounded-t-full bg-[#FB923C]" />
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
                    <span className="font-bold text-xs text-[#14161A]">Butter chicken</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-xs text-[#14161A]">₹420</span>
                  <button type="button" aria-label="Add" className="h-7 w-7 rounded-full bg-[#2F5BD8] text-white flex items-center justify-center font-bold text-xs">
                    +
                  </button>
                </div>
              </div>

              {/* Dish 2: Paneer Butter Masala */}
              <div className="p-3.5 rounded-[24px] bg-white border border-[#E2E8F0] shadow-sm space-y-2 flex flex-col justify-between cursor-pointer hover:border-[#CBD5E1]">
                <div>
                  <div className="h-20 rounded-[16px] bg-[#FEF3C7] flex items-center justify-center">
                    <div className="h-12 w-20 rounded-t-full bg-[#F59E0B]" />
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                    <span className="font-bold text-xs text-[#14161A]">Paneer butter masala</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-xs text-[#14161A]">₹360</span>
                  <button type="button" aria-label="Add" className="h-7 w-7 rounded-full bg-[#F1F5F9] text-[#14161A] flex items-center justify-center font-bold text-xs">
                    +
                  </button>
                </div>
              </div>

              {/* Dish 3: Dal Makhani */}
              <div className="p-3.5 rounded-[24px] bg-white border-2 border-[#2F5BD8] shadow-sm space-y-2 flex flex-col justify-between cursor-pointer">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-semibold text-white bg-[#14161A] px-2 py-0.2 rounded-full">Chef's pick</span>
                    <span className="text-[9px] font-semibold text-white bg-[#2F5BD8] px-2 py-0.2 rounded-full">1 in order</span>
                  </div>
                  <div className="h-20 rounded-[16px] bg-[#FEF3C7] flex items-center justify-center">
                    <div className="h-12 w-20 rounded-t-full bg-[#B45309]" />
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                    <span className="font-bold text-xs text-[#14161A]">Dal makhani</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-xs text-[#14161A]">₹310</span>
                  <button type="button" aria-label="Add" className="h-7 w-7 rounded-full bg-[#2F5BD8] text-white flex items-center justify-center font-bold text-xs">
                    +
                  </button>
                </div>
              </div>

              {/* Dish 4: Chicken Biryani */}
              <div className="p-3.5 rounded-[24px] bg-white border border-[#E2E8F0] shadow-sm space-y-2 flex flex-col justify-between cursor-pointer hover:border-[#CBD5E1]">
                <div>
                  <div className="h-20 rounded-[16px] bg-[#FFF7ED] flex items-center justify-center">
                    <div className="h-12 w-20 rounded-t-full bg-[#EA580C]" />
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
                    <span className="font-bold text-xs text-[#14161A]">Chicken biryani</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-xs text-[#14161A]">₹380</span>
                  <button type="button" aria-label="Add" className="h-7 w-7 rounded-full bg-[#F1F5F9] text-[#14161A] flex items-center justify-center font-bold text-xs">
                    +
                  </button>
                </div>
              </div>

              {/* Dish 5: Kadai Mushroom (Sold Out) */}
              <div className="p-3.5 rounded-[24px] bg-white border border-[#E2E8F0] space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold text-[#1E293B] bg-slate-200 px-2 py-0.5 rounded-full inline-block mb-2">Sold out</span>
                  <div className="h-20 rounded-[16px] bg-[#F1F5F9] flex items-center justify-center">
                    <div className="h-12 w-20 rounded-t-full bg-[#94A3B8]" />
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                    <span className="font-bold text-xs text-[#1E293B]">Kadai mushroom</span>
                  </div>
                </div>
                <span className="font-bold text-xs text-[#334155]">₹320</span>
              </div>

              {/* Dish 6: Rogan Josh */}
              <div className="p-3.5 rounded-[24px] bg-white border border-[#E2E8F0] shadow-sm space-y-2 flex flex-col justify-between cursor-pointer hover:border-[#CBD5E1]">
                <div>
                  <div className="h-20 rounded-[16px] bg-[#FEE2E2] flex items-center justify-center">
                    <div className="h-12 w-20 rounded-t-full bg-[#DC2626]" />
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
                    <span className="font-bold text-xs text-[#14161A]">Rogan josh</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-xs text-[#14161A]">₹460</span>
                  <button type="button" aria-label="Add" className="h-7 w-7 rounded-full bg-[#F1F5F9] text-[#14161A] flex items-center justify-center font-bold text-xs">
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Checkout Rail (Dark Mood #14161A) */}
        <div className="w-[380px] bg-[#14161A] text-white p-6 flex flex-col justify-between border-l border-white/10">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <div className="text-[10px] text-[#9AA3AF]">Dine-in · 4 guests</div>
                <h3 className="text-xl font-bold tracking-tight text-white">Table 7</h3>
              </div>
              <button type="button" className="px-3 py-1 rounded-full border border-white/20 text-white text-xs font-semibold cursor-pointer">
                Change
              </button>
            </div>

            {/* Selected Items */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-white">Butter chicken</div>
                  <div className="text-[10px] text-[#9AA3AF]">₹420 each</div>
                </div>
                <div className="flex items-center gap-2 bg-[#1E232B] px-3 py-1 rounded-full border border-white/10">
                  <button type="button" className="text-xs font-bold text-[#9AA3AF]">−</button>
                  <span className="font-bold text-xs text-white">2</span>
                  <button type="button" className="text-xs font-bold text-[#9AA3AF]">+</button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-white">Dal makhani</div>
                  <div className="text-[10px] text-[#9AA3AF]">₹310 each</div>
                </div>
                <div className="flex items-center gap-2 bg-[#1E232B] px-3 py-1 rounded-full border border-white/10">
                  <button type="button" className="text-xs font-bold text-[#9AA3AF]">−</button>
                  <span className="font-bold text-xs text-white">1</span>
                  <button type="button" className="text-xs font-bold text-[#9AA3AF]">+</button>
                </div>
              </div>
            </div>
          </div>

          {/* Calculations & Actions */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[#9AA3AF]">
                <span>Subtotal</span>
                <span>₹1,150</span>
              </div>
              <div className="flex justify-between text-[#9AA3AF]">
                <span>CGST 2.5% + SGST 2.5%</span>
                <span>₹57.50</span>
              </div>
              <div className="flex justify-between items-baseline pt-2">
                <span className="text-sm font-semibold text-[#9AA3AF]">Total</span>
                <span className="text-3xl font-bold text-white tracking-tight">₹1,208</span>
              </div>
            </div>

            {/* Primary Action Button */}
            <button type="button" className="w-full py-3 rounded-full bg-white text-[#14161A] font-bold text-xs flex items-center justify-between px-4 shadow-xl hover:bg-white/90 cursor-pointer">
              <span>Send <span className="font-extrabold">3</span> items to kitchen</span>
              <span className="h-6 w-6 rounded-full bg-[#2F5BD8] text-white flex items-center justify-center font-bold text-xs">→</span>
            </button>

            {/* Payment Modes */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button type="button" className="py-1.5 rounded-full border border-white/20 text-xs font-medium text-center hover:bg-white/10">UPI</button>
              <button type="button" className="py-1.5 rounded-full border border-white/20 text-xs font-medium text-center hover:bg-white/10">Card</button>
              <button type="button" className="py-1.5 rounded-full border border-white/20 text-xs font-medium text-center hover:bg-white/10">Cash</button>
              <button type="button" className="py-1.5 rounded-full border border-white/20 text-xs font-medium text-center hover:bg-white/10">Split</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

// ─── D2. Owner Phone: Orders (Mobile Light 390x844) ───
export const D2_OwnerPhoneOrders: StoryObj = {
  name: 'D2: Owner Phone Orders (Mobile, Light)',
  render: () => (
    <div className="min-h-screen bg-[#EEF1F5] flex justify-center py-6 px-4" data-theme="light">
      <div className="w-full max-w-[390px] min-h-[740px] bg-[#EEF1F5] rounded-[44px] shadow-2xl border-8 border-[#14161A] flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-[#14161A]">Orders</h2>
          <button type="button" aria-label="Search" className="h-8 w-8 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center text-[#5A6170]">
            <Search className="h-4 w-4" />
          </button>
        </div>

        {/* Pill Tabs */}
        <div className="px-5 mb-2">
          <div className="flex p-1 rounded-full bg-white border border-[#E2E8F0]">
            <button type="button" className="flex-1 py-1 rounded-full bg-[#14161A] text-white text-xs font-semibold">Live · 12</button>
            <button type="button" className="flex-1 py-1 rounded-full text-[#5A6170] text-xs font-medium">Done</button>
            <button type="button" className="flex-1 py-1 rounded-full text-[#5A6170] text-xs font-medium">Cancelled</button>
          </div>
        </div>

        {/* Secondary Status Filter Strip */}
        <div className="px-5 flex gap-1.5 overflow-x-auto pb-2">
          <span className="px-3 py-1 rounded-full bg-[#FEE2E2] text-[#991B1B] text-[11px] font-semibold shrink-0">1 late</span>
          <span className="px-3 py-1 rounded-full bg-white text-[#5A6170] border border-[#E2E8F0] text-[11px] shrink-0">3 new</span>
          <span className="px-3 py-1 rounded-full bg-white text-[#5A6170] border border-[#E2E8F0] text-[11px] shrink-0">5 cooking</span>
          <span className="px-3 py-1 rounded-full bg-white text-[#5A6170] border border-[#E2E8F0] text-[11px] shrink-0">2 ready</span>
        </div>

        {/* Content Orders List */}
        <div className="flex-1 overflow-y-auto px-5 py-2 space-y-3 pb-24">
          {/* Card 1: Late Takeaway */}
          <div className="p-4 rounded-[28px] bg-white border-2 border-rose-500 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-[#14161A]">Takeaway 18</span>
              <span className="font-bold text-xs text-[#991B1B]">24 min</span>
            </div>
            <p className="text-xs text-[#5A6170]">2 × Chicken biryani · Counter</p>
            <div className="flex gap-1.5 h-1.5">
              <div className="h-full w-1/4 rounded-full bg-[#EF4444]" />
              <div className="h-full w-1/4 rounded-full bg-[#EF4444]" />
              <div className="h-full w-1/4 rounded-full bg-[#E2E8F0]" />
              <div className="h-full w-1/4 rounded-full bg-[#E2E8F0]" />
            </div>
          </div>

          {/* Card 2: Cooking Dine-in */}
          <div className="p-4 rounded-[28px] bg-[#14161A] text-white shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">Table 7</span>
                <span className="text-[10px] font-semibold text-[#14161A] bg-white px-2 py-0.2 rounded-full">Cooking</span>
              </div>
              <span className="font-bold text-sm">₹1,670</span>
            </div>
            <p className="text-xs text-[#9AA3AF]">7 items · Arjun · 12 min</p>
            <div className="flex gap-1.5 h-1.5">
              <div className="h-full w-1/4 rounded-full bg-white" />
              <div className="h-full w-1/4 rounded-full bg-white" />
              <div className="h-full w-1/4 rounded-full bg-white/20" />
              <div className="h-full w-1/4 rounded-full bg-white/20" />
            </div>
          </div>

          {/* Card 3: New QR self-order */}
          <div className="p-4 rounded-[28px] bg-white border border-[#E2E8F0] shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#14161A]">Table 11</span>
                <span className="text-[10px] font-semibold text-[#5A6170] bg-[#F1F5F9] px-2 py-0.2 rounded-full">New</span>
              </div>
              <span className="font-bold text-sm text-[#14161A]">₹640</span>
            </div>
            <p className="text-xs text-[#5A6170]">QR self-order · 1 min</p>
          </div>
        </div>

        {/* Floating Pill Bottom Tab Bar with Centre Plus */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="h-14 bg-[#14161A] rounded-full flex items-center justify-around px-2 shadow-2xl">
            <button type="button" aria-label="Home" className="p-2 text-[#9AA3AF] hover:text-white cursor-pointer"><Home className="h-4 w-4" /></button>
            <button type="button" aria-label="Orders" className="h-10 px-3.5 rounded-full bg-white text-[#14161A] flex items-center gap-1.5 font-bold text-xs cursor-pointer">
              <FileText className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Add" className="h-10 w-10 rounded-full bg-[#2F5BD8] text-white flex items-center justify-center font-bold text-lg shadow-[0_0_16px_rgba(47,91,216,0.6)] cursor-pointer">
              +
            </button>
            <button type="button" aria-label="Floor" className="p-2 text-[#9AA3AF] hover:text-white cursor-pointer"><Layers className="h-4 w-4" /></button>
            <button type="button" aria-label="Menu" className="p-2 text-[#9AA3AF] hover:text-white cursor-pointer"><MenuIcon className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    </div>
  ),
};

// ─── D3. Owner Phone: Edit Dish Bottom Sheet (Mobile Light 390x844) ───
export const D3_OwnerPhoneEditDish: StoryObj = {
  name: 'D3: Owner Phone Edit Dish Sheet (Mobile, Light)',
  render: () => (
    <div className="min-h-screen bg-[#CBD5E1] flex justify-center py-6 px-4" data-theme="light">
      <div className="w-full max-w-[390px] min-h-[740px] bg-black/40 rounded-[44px] shadow-2xl border-8 border-[#14161A] flex flex-col justify-end overflow-hidden relative">
        {/* Dimmed Background Mockup */}
        <div className="absolute top-6 left-6 text-2xl font-bold text-white">Menu</div>

        {/* Bottom Sheet Modal */}
        <div className="w-full bg-white text-[#14161A] rounded-t-[36px] shadow-2xl p-5 space-y-4">
          {/* Drag Handle */}
          <div className="w-10 h-1 bg-[#CBD5E1] rounded-full mx-auto mb-1" />

          {/* Dish Banner */}
          <div className="h-32 rounded-[24px] bg-[#FFF7ED] p-3 flex flex-col justify-between relative overflow-hidden">
            <div className="h-16 w-32 rounded-t-full bg-[#FB923C] mx-auto mt-4" />
            <button type="button" className="self-end px-3 py-1 rounded-full bg-[#14161A] text-white text-[10px] font-semibold">
              Change photo
            </button>
          </div>

          <div>
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] text-[#5A6170]">Mains · Tandoor station</span>
              <span className="text-[10px] text-[#5A6170]">Price</span>
            </div>
            <div className="flex justify-between items-baseline mt-0.5">
              <h3 className="text-xl font-bold text-[#14161A]">Butter chicken</h3>
              <span className="text-xl font-bold text-[#14161A]">₹420</span>
            </div>
          </div>

          {/* Veg Pill Nav */}
          <div className="flex p-1 rounded-full bg-[#F1F5F9]">
            <button type="button" className="flex-1 py-1 rounded-full text-xs text-[#5A6170]">Veg</button>
            <button type="button" className="flex-1 py-1 rounded-full bg-[#14161A] text-white text-xs font-semibold">Non-veg</button>
            <button type="button" className="flex-1 py-1 rounded-full text-xs text-[#5A6170]">Egg</button>
          </div>

          {/* Contains Pills */}
          <div>
            <div className="text-[11px] font-semibold text-[#14161A] mb-1.5">Contains</div>
            <div className="flex gap-1.5">
              <span className="px-3 py-1 rounded-full bg-[#14161A] text-white text-[10px] font-semibold">Dairy</span>
              <span className="px-3 py-1 rounded-full bg-[#14161A] text-white text-[10px] font-semibold">Nuts</span>
              <span className="px-3 py-1 rounded-full bg-[#F1F5F9] text-[#5A6170] text-[10px]">Gluten</span>
              <span className="px-3 py-1 rounded-full bg-[#F1F5F9] text-[#5A6170] text-[10px]">Egg</span>
            </div>
          </div>

          {/* Branch Prices */}
          <div className="p-3.5 rounded-[20px] bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 text-xs text-[#14161A]">
            <div className="flex items-center justify-between text-[#14161A]">
              <span>Indiranagar</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#14161A]">₹420</span>
                <span className="h-4 w-7 rounded-full bg-[#2F5BD8] flex items-center justify-end px-0.5"><span className="h-3 w-3 rounded-full bg-white" /></span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[#14161A]">
              <span>Koramangala</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#2F5BD8]">₹440</span>
                <span className="h-4 w-7 rounded-full bg-[#2F5BD8] flex items-center justify-end px-0.5"><span className="h-3 w-3 rounded-full bg-white" /></span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button variant="secondary" className="flex-1 rounded-full border-[#E2E8F0]">More</Button>
            <Button variant="primary" className="flex-2 rounded-full bg-[#14161A] text-white">Save</Button>
          </div>
        </div>
      </div>
    </div>
  ),
};

// ─── D5. Waiter Phone: Take Order (Mobile Dark 390x844) ───
export const D5_WaiterPhoneTakeOrder: StoryObj = {
  name: 'D5: Waiter Phone Take Order (Mobile, Dark)',
  render: () => (
    <div className="min-h-screen bg-[var(--color-bg)] flex justify-center py-6 px-4" data-theme="dark">
      <div className="w-full max-w-[390px] min-h-[740px] bg-[#0D0F12] text-[#F2F4F7] rounded-[44px] shadow-2xl border-8 border-[#1B1F25] flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex items-center gap-3">
          <button type="button" aria-label="Back" className="h-8 w-8 rounded-full bg-white/10 text-white flex items-center justify-center cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white leading-tight">Table 7</h2>
            <p className="text-[11px] text-[#9AA3AF]">4 guests · 3 items already sent</p>
          </div>
        </div>

        {/* Category Pills */}
        <div className="px-5 mb-3 flex gap-2">
          <span className="px-4 py-1.5 rounded-full bg-white text-[#14161A] text-xs font-bold">Mains</span>
          <span className="px-4 py-1.5 rounded-full bg-[#14171C] text-[#9AA3AF] text-xs font-medium">Breads</span>
          <span className="px-4 py-1.5 rounded-full bg-[#14171C] text-[#9AA3AF] text-xs font-medium">Drinks</span>
        </div>

        {/* Dish Order Rows */}
        <div className="flex-1 overflow-y-auto px-5 py-2 space-y-3 pb-24">
          <div className="p-3.5 rounded-[24px] bg-[#14171C] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
              <div>
                <div className="font-bold text-xs text-white">Butter chicken</div>
                <div className="text-[10px] text-[#9AA3AF]">₹420</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-[#0D0F12] px-3 py-1.5 rounded-full border border-white/10">
              <button type="button" className="text-xs font-bold text-[#9AA3AF]">−</button>
              <span className="font-bold text-xs text-white">5</span>
              <button type="button" className="text-xs font-bold text-[#9AA3AF]">+</button>
            </div>
          </div>

          <div className="p-3.5 rounded-[24px] bg-[#14171C] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
              <div>
                <div className="font-bold text-xs text-white">Paneer butter masala</div>
                <div className="text-[10px] text-[#9AA3AF]">₹360</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-[#0D0F12] px-3 py-1.5 rounded-full border border-white/10">
              <button type="button" className="text-xs font-bold text-[#9AA3AF]">−</button>
              <span className="font-bold text-xs text-white">1</span>
              <button type="button" className="text-xs font-bold text-[#9AA3AF]">+</button>
            </div>
          </div>

          <div className="p-3.5 rounded-[24px] bg-[#14171C] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
              <div>
                <div className="font-bold text-xs text-white">Dal makhani</div>
                <div className="text-[10px] text-[#9AA3AF]">₹310</div>
              </div>
            </div>
            <button type="button" aria-label="Add" className="h-8 w-8 rounded-full bg-[#0D0F12] border border-white/10 text-white flex items-center justify-center font-bold text-sm">
              +
            </button>
          </div>

          <div className="p-3.5 rounded-[24px] bg-[#14171C] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
              <div>
                <div className="font-bold text-xs text-white">Rogan josh</div>
                <div className="text-[10px] text-[#9AA3AF]">₹460</div>
              </div>
            </div>
            <button type="button" aria-label="Add" className="h-8 w-8 rounded-full bg-[#0D0F12] border border-white/10 text-white flex items-center justify-center font-bold text-sm">
              +
            </button>
          </div>
        </div>

        {/* Floating Send to Kitchen Action Bar */}
        <div className="absolute bottom-4 left-4 right-4">
          <button type="button" className="w-full p-2.5 rounded-full bg-[var(--color-accent)] text-white shadow-[0_8px_24px_rgba(61,110,245,0.4)] flex items-center justify-between px-3 cursor-pointer">
            <div className="flex items-center gap-2.5">
              <span className="h-8 w-8 rounded-full bg-white text-[#14161A] font-bold text-xs flex items-center justify-center">8</span>
              <div className="text-left">
                <div className="font-bold text-xs leading-tight">Send to kitchen</div>
                <div className="text-[10px] text-white font-medium">₹2,772 incl. GST</div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 mr-2" />
          </button>
        </div>
      </div>
    </div>
  ),
};

// ─── D9. Host Stand Live Floor (Tablet Portrait 834x1194, Dark Mood) ───
export const D9_HostStandTablet: StoryObj = {
  name: 'D9: Host Stand Live Floor (Tablet Portrait, Dark)',
  render: () => (
    <div className="min-h-screen bg-[#0D0F12] p-6 flex justify-center items-center" data-theme="dark">
      <div className="w-full max-w-[834px] min-h-[1000px] bg-[#14171C] text-[#F2F4F7] rounded-[36px] shadow-2xl border-8 border-[#1B1F25] flex flex-col justify-between p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div>
            <div className="text-xs text-[#9AA3AF]">Host stand · Main hall</div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">Tonight's floor</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-2xl font-bold text-white">4</div>
              <div className="text-[10px] text-[#9AA3AF]">free now</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">3</div>
              <div className="text-[10px] text-[#9AA3AF]">waiting · ~15'</div>
            </div>
          </div>
        </div>

        {/* Live Table Map */}
        <div className="flex-1 my-6 rounded-[28px] bg-[#0D0F12] border border-white/5 p-8 relative flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="px-3 py-1 rounded-full bg-white/5 text-[10px] text-[#9AA3AF]">Entrance</span>
            <span className="py-10 px-2 rounded-xl bg-white/5 text-[10px] text-[#9AA3AF] writing-vertical">Bar</span>
          </div>

          <div className="grid grid-cols-4 gap-6 my-auto pr-12">
            <div className="h-16 w-16 rounded-full bg-[#1B1F25] text-center flex flex-col justify-center">
              <span className="font-bold text-xs text-white">1</span>
              <span className="text-[9px] text-[#9AA3AF]">32'</span>
            </div>

            <div className="h-16 w-16 rounded-full border-2 border-dashed border-[#10B981] text-center flex flex-col justify-center">
              <span className="font-bold text-xs text-white">2</span>
              <span className="text-[9px] text-[#10B981]">2 seats</span>
            </div>

            <div className="h-16 w-16 rounded-[16px] bg-white text-[#14161A] text-center flex flex-col justify-center">
              <span className="font-bold text-xs">3</span>
              <span className="text-[9px] font-semibold">bill</span>
            </div>

            {/* Table 10 Blue Selected */}
            <div className="h-16 w-16 rounded-full bg-[var(--color-accent)] text-white text-center flex flex-col justify-center shadow-[0_0_24px_rgba(61,110,245,0.6)] cursor-pointer">
              <span className="font-bold text-xs">10</span>
              <span className="text-[9px] text-white font-semibold">5'</span>
            </div>

            <div className="h-16 w-20 rounded-[18px] bg-[#10B981] text-[#14161A] text-center flex flex-col justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              <span className="font-bold text-xs">4</span>
              <span className="text-[9px] font-bold">food up</span>
            </div>

            <div className="h-16 w-24 rounded-[18px] border-2 border-dashed border-[#10B981] text-center flex flex-col justify-center">
              <span className="font-bold text-xs text-white">5</span>
              <span className="text-[9px] text-[#10B981]">6 seats</span>
            </div>

            <div className="h-16 w-16 rounded-full bg-[#1B1F25] text-center flex flex-col justify-center">
              <span className="font-bold text-xs text-white">6</span>
              <span className="text-[9px] text-[#9AA3AF]">12'</span>
            </div>

            <div className="h-16 w-16 rounded-full border-2 border-dashed border-[#10B981] text-center flex flex-col justify-center">
              <span className="font-bold text-xs text-white">11</span>
              <span className="text-[9px] text-[#10B981]">2 seats</span>
            </div>

            <div className="h-16 w-16 rounded-[16px] bg-[#1B1F25] text-center flex flex-col justify-center">
              <span className="font-bold text-xs text-white">7</span>
              <span className="text-[9px] text-[#9AA3AF]">21'</span>
            </div>

            <div className="h-16 w-20 rounded-[18px] border-2 border-dashed border-[#10B981] text-center flex flex-col justify-center">
              <span className="font-bold text-xs text-white">8</span>
              <span className="text-[9px] text-[#10B981]">4 seats</span>
            </div>

            <div className="h-16 w-24 rounded-[18px] border-2 border-[#EF4444] text-center flex flex-col justify-center shadow-[0_0_20px_rgba(239,68,68,0.3)]">
              <span className="font-bold text-xs text-[#EF4444]">9</span>
              <span className="text-[9px] text-[#EF4444]">calling</span>
            </div>

            <div className="h-16 w-16 rounded-full bg-[#1B1F25] text-center flex flex-col justify-center">
              <span className="font-bold text-xs text-white">12</span>
              <span className="text-[9px] text-[#CBD5E1]">cleaning</span>
            </div>
          </div>
          <div />
        </div>

        {/* Bottom Control Panel */}
        <div className="p-5 rounded-[28px] bg-[#0D0F12] border border-white/5 space-y-4">
          <div className="flex items-center gap-3">
            <span className="h-9 w-9 rounded-xl bg-[var(--color-accent)] text-white font-bold text-sm flex items-center justify-center">10</span>
            <div>
              <h3 className="font-bold text-sm text-white">Table 10 · 2 seats</h3>
              <p className="text-[11px] text-[#9AA3AF]">Seated 5' ago</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button type="button" className="px-5 py-2.5 rounded-full bg-[var(--color-accent)] text-white text-xs font-semibold shadow-[0_4px_16px_rgba(61,110,245,0.4)] cursor-pointer">
              Seat Mehta · 4
            </button>
            <button type="button" className="px-5 py-2.5 rounded-full border border-white/10 text-white text-xs font-medium hover:bg-white/5 cursor-pointer">
              Move party
            </button>
            <button type="button" className="px-5 py-2.5 rounded-full border border-white/10 text-white text-xs font-medium hover:bg-white/5 cursor-pointer">
              Join tables
            </button>
            <button type="button" className="px-5 py-2.5 rounded-full border border-white/10 text-white text-xs font-medium hover:bg-white/5 cursor-pointer">
              Mark cleaned
            </button>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-white/5 text-xs">
            <span className="text-[#9AA3AF] font-medium">Waitlist</span>
            <span className="px-3 py-1 rounded-full bg-white/5 text-white">Mehta · 4 · 12'</span>
            <span className="px-3 py-1 rounded-full bg-white/5 text-white">Rao · 2 · 6'</span>
            <span className="px-3 py-1 rounded-full bg-white/5 text-white">Iyer · 6 · 2'</span>
          </div>
        </div>
      </div>
    </div>
  ),
};

