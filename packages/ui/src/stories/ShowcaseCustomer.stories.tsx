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
  HeroStat,
  PillNav,
  QuantityStepper,
  ProgressBar,
  BottomTabBar,
} from '../components';
import {
  Check,
  Plus,
  ShoppingBag,
  Bell,
  Home,
  Store,
  Users,
  CreditCard,
  Settings,
  ChevronRight,
  Search,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';

const meta: Meta = {
  title: 'Showcase/Customer & Templates',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

// ─── U1. Change Plan (Customer Dashboard, Desktop Light) ───
export const U1_ChangePlan: StoryObj = {
  name: 'U1: Change Plan (Desktop, Light)',
  render: () => (
    <div className="min-h-screen bg-[#EEF1F5] text-[#14161A] p-8 flex justify-center" data-theme="light">
      <div className="w-full max-w-5xl space-y-8">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-[#2F5BD8] font-medium mb-1">Billing / Change plan</div>
            <h1 className="text-3xl font-bold tracking-tight text-[#14161A]">Pick what fits your group</h1>
            <p className="text-xs text-[#5A6170] mt-1">
              Prices include 18% GST. Change or cancel anytime; the difference is prorated.
            </p>
          </div>
          <div className="flex items-center p-1 rounded-full bg-white border border-[#E2E8F0] shadow-sm">
            <button type="button" className="px-4 py-1.5 rounded-full bg-[#14161A] text-white text-xs font-semibold cursor-pointer">
              Monthly
            </button>
            <button type="button" className="px-4 py-1.5 rounded-full text-[#5A6170] text-xs font-medium hover:text-[#14161A] cursor-pointer">
              Yearly · 2 months free
            </button>
          </div>
        </div>

        {/* 3 Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Starter */}
          <div className="p-6 rounded-[28px] bg-white border border-[#E2E8F0] shadow-lg flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm text-[#14161A]">Starter</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold tracking-tight text-[#14161A]">₹2,499</span>
                  <span className="text-xs text-[#5A6170]">/month</span>
                </div>
                <p className="text-xs text-[#5A6170] mt-1">1 tenant · 10 staff · free templates</p>
              </div>

              <div className="space-y-2 text-xs pt-2 border-t border-[#F1F5F9]">
                <div className="flex items-center gap-2 text-[#14161A]">
                  <Check className="h-3.5 w-3.5 text-[#34D399]" />
                  <span>RestaurantOS or HospitalOS</span>
                </div>
                <div className="flex items-center gap-2 text-[#14161A]">
                  <Check className="h-3.5 w-3.5 text-[#34D399]" />
                  <span>Email support</span>
                </div>
                <div className="flex items-center gap-2 text-[#5A6170]">
                  <span className="w-3.5 text-center">—</span>
                  <span>AI assistant</span>
                </div>
              </div>
            </div>

            <Button variant="secondary" className="w-full rounded-full border-[#E2E8F0]">
              Downgrade
            </Button>
          </div>

          {/* Growth (Active / Current Plan) */}
          <div className="p-6 rounded-[28px] bg-[#14161A] text-white shadow-2xl flex flex-col justify-between space-y-6 relative">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-white">Growth</h3>
                <span className="text-[10px] font-semibold text-[#14161A] bg-white px-2.5 py-0.5 rounded-full">
                  Current plan
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight text-white">₹7,497</span>
                <span className="text-xs text-[#9AA3AF]">/month</span>
              </div>
              <p className="text-xs text-[#9AA3AF]">5 tenants · 50 staff · 1 paid template</p>

              <div className="space-y-2 text-xs pt-2 border-t border-white/10">
                <div className="flex items-center gap-2 text-white">
                  <Check className="h-3.5 w-3.5 text-[#34D399]" />
                  <span>Everything in Starter</span>
                </div>
                <div className="flex items-center gap-2 text-white">
                  <Check className="h-3.5 w-3.5 text-[#34D399]" />
                  <span>Multi-branch</span>
                </div>
                <div className="flex items-center gap-2 text-white">
                  <Check className="h-3.5 w-3.5 text-[#34D399]" />
                  <span>AI assistant, read-only</span>
                </div>
              </div>
            </div>

            <button type="button" disabled className="w-full py-2.5 rounded-full bg-white/10 text-white/60 text-xs font-semibold cursor-not-allowed">
              Your plan
            </button>
          </div>

          {/* Scale (Upgrade target) */}
          <div className="p-6 rounded-[28px] bg-white border-2 border-[#2F5BD8] shadow-xl flex flex-col justify-between space-y-6 relative">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-[#14161A]">Scale</h3>
                <span className="text-[10px] font-semibold text-white bg-[#2F5BD8] px-2.5 py-0.5 rounded-full">
                  Popular
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight text-[#14161A]">₹14,999</span>
                <span className="text-xs text-[#5A6170]">/month</span>
              </div>
              <p className="text-xs text-[#5A6170]">15 tenants · 200 staff · all templates</p>

              <div className="space-y-2 text-xs pt-2 border-t border-[#F1F5F9]">
                <div className="flex items-center gap-2 text-[#14161A]">
                  <Check className="h-3.5 w-3.5 text-[#34D399]" />
                  <span>Everything in Growth</span>
                </div>
                <div className="flex items-center gap-2 text-[#14161A]">
                  <Check className="h-3.5 w-3.5 text-[#34D399]" />
                  <span>AI assistant with actions</span>
                </div>
                <div className="flex items-center gap-2 text-[#14161A]">
                  <Check className="h-3.5 w-3.5 text-[#34D399]" />
                  <span>Priority support</span>
                </div>
              </div>
            </div>

            <Button variant="primary" className="w-full rounded-full bg-[#2F5BD8] hover:bg-[#2F5BD8]/90">
              Upgrade to Scale
            </Button>
          </div>
        </div>

        {/* Bottom Details Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Extra Seats */}
          <div className="p-6 rounded-[28px] bg-white border border-[#E2E8F0] shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-[#14161A]">Extra staff seats</h4>
                <span className="text-[10px] font-semibold text-[#14161A] bg-[#FEF3C7] px-2 py-0.5 rounded-full">12 left</span>
              </div>
              <div className="mt-4 flex justify-center">
                <div className="flex items-center gap-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-full px-5 py-2">
                  <button type="button" className="text-lg font-bold text-[#5A6170] hover:text-[#14161A] cursor-pointer">−</button>
                  <span className="text-lg font-bold text-[#14161A] w-8 text-center">10</span>
                  <button type="button" className="text-lg font-bold text-[#5A6170] hover:text-[#14161A] cursor-pointer">+</button>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-[#5A6170] text-center">
              ₹99 per seat per month. Add now, remove anytime.
            </p>
          </div>

          {/* Add-ons */}
          <div className="p-6 rounded-[28px] bg-white border border-[#E2E8F0] shadow-sm space-y-3">
            <h4 className="font-semibold text-sm text-[#14161A]">Add-ons</h4>
            <div className="p-3 rounded-[20px] bg-[#F8FAFC] border border-[#E2E8F0] flex items-start justify-between gap-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  aria-label="Add AI assistant with actions"
                  className="mt-1 rounded"
                />
                <div>
                  <div className="font-semibold text-xs text-[#14161A]">AI assistant with actions</div>
                  <div className="text-[10px] text-[#5A6170]">Lets the assistant draft changes for you to approve</div>
                </div>
              </label>
              <span className="text-xs font-semibold text-[#14161A]">₹999</span>
            </div>

            <div className="p-3 rounded-[20px] bg-[#F8FAFC] border border-[#E2E8F0] flex items-start justify-between gap-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  aria-label="Add extra paid template"
                  className="mt-1 rounded"
                />
                <div>
                  <div className="font-semibold text-xs text-[#14161A]">Extra paid template</div>
                  <div className="text-[10px] text-[#5A6170]">For a second restaurant brand</div>
                </div>
              </label>
              <span className="text-xs font-semibold text-[#14161A]">₹499</span>
            </div>
          </div>

          {/* Summary Card */}
          <div className="p-6 rounded-[28px] bg-[#14161A] text-white shadow-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-2.5 text-xs">
              <h4 className="font-semibold text-sm text-white mb-3">Summary</h4>
              <div className="flex justify-between">
                <span className="text-[#9AA3AF]">Scale plan</span>
                <span className="font-medium text-white">₹14,999</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9AA3AF]">10 extra seats</span>
                <span className="font-medium text-white">₹990</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9AA3AF]">AI assistant with actions</span>
                <span className="font-medium text-white">₹999</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9AA3AF]">Credit for unused Growth days</span>
                <span className="font-medium text-[#34D399]">− ₹4,748</span>
              </div>
              <div className="pt-3 border-t border-white/10 flex justify-between items-baseline">
                <span className="text-xs text-[#9AA3AF]">Pay today</span>
                <span className="text-2xl font-bold text-white">₹12,240</span>
              </div>
            </div>

            <Button variant="secondary" className="w-full rounded-full bg-white text-[#14161A] hover:bg-white/90">
              Confirm and pay with Razorpay
            </Button>
          </div>
        </div>
      </div>
    </div>
  ),
};

// ─── U2. Diner Template Gallery (Customer Dashboard, Desktop Light) ───
export const U2_DinerTemplateGallery: StoryObj = {
  name: 'U2: Diner Template Gallery (Desktop, Light)',
  render: () => (
    <div className="min-h-screen bg-[#EEF1F5] text-[#14161A] p-8 flex justify-center" data-theme="light">
      <div className="w-full max-w-6xl space-y-6">
        {/* Header */}
        <div>
          <div className="text-xs text-[#2F5BD8] font-medium mb-1">Masala House / Diner app</div>
          <h1 className="text-3xl font-bold tracking-tight text-[#14161A]">Choose how diners see you</h1>
          <p className="text-xs text-[#5A6170] mt-1">
            Your menu, prices and orders stay the same. Only the look changes, and you can switch back anytime.
          </p>
        </div>

        {/* Filter Pills */}
        <PillNav
          items={[
            { id: 'all', label: 'All 9', active: true },
            { id: 'free', label: 'Free' },
            { id: 'paid', label: 'Paid' },
            { id: 'cafes', label: 'Cafés' },
            { id: 'fine-dining', label: 'Fine dining' },
            { id: 'qsr', label: 'Quick service' },
          ]}
        />

        {/* Main Grid + Customize Side Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Templates Grid (2 cols) */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Saffron */}
            <div className="p-4 rounded-[28px] bg-white border border-[#E2E8F0] shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <div className="h-40 rounded-[20px] bg-[#FFF7ED] p-3 flex flex-col justify-end relative overflow-hidden border border-[#FFEDD5]">
                  <div className="h-16 rounded-[14px] bg-[#FB923C]" />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <h4 className="font-bold text-sm text-[#14161A]">Saffron</h4>
                  <span className="text-[10px] font-semibold text-[#065F46] bg-[#D1FAE5] px-2 py-0.5 rounded-full">Free</span>
                </div>
                <p className="text-xs text-[#5A6170] mt-1">Warm and bright. Great for casual dining.</p>
              </div>
              <Button variant="secondary" size="sm" className="w-full rounded-full border-[#E2E8F0]">
                Use template
              </Button>
            </div>

            {/* Noir (In Use) */}
            <div className="p-4 rounded-[28px] bg-white border-2 border-[#14161A] shadow-lg space-y-3 flex flex-col justify-between relative">
              <div>
                <div className="h-40 rounded-[20px] bg-[#0D0F12] p-3 flex flex-col justify-end relative overflow-hidden border border-white/10">
                  <div className="h-16 rounded-[14px] bg-[#F59E0B]" />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <h4 className="font-bold text-sm text-[#14161A]">Noir</h4>
                  <span className="text-[10px] font-semibold text-[#581C87] bg-[#EDE9FE] px-2 py-0.5 rounded-full">₹499 / mo</span>
                </div>
                <p className="text-xs text-[#5A6170] mt-1">Dark and gold. Made for bars and fine dining.</p>
              </div>
              <Button variant="primary" size="sm" className="w-full rounded-full bg-[#14161A] text-white hover:bg-[#14161A]/90">
                In use · customize
              </Button>
            </div>

            {/* Fresh */}
            <div className="p-4 rounded-[28px] bg-white border border-[#E2E8F0] shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <div className="h-40 rounded-[20px] bg-[#F0FDF4] p-3 flex flex-col justify-end relative overflow-hidden border border-[#DCFCE7]">
                  <div className="h-16 rounded-[14px] bg-[#34D399]" />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <h4 className="font-bold text-sm text-[#14161A]">Fresh</h4>
                  <span className="text-[10px] font-semibold text-[#065F46] bg-[#D1FAE5] px-2 py-0.5 rounded-full">Free</span>
                </div>
                <p className="text-xs text-[#5A6170] mt-1">Clean, light and quick. For cafés and QSR.</p>
              </div>
              <Button variant="secondary" size="sm" className="w-full rounded-full border-[#E2E8F0]">
                Use template
              </Button>
            </div>

            {/* Coastal */}
            <div className="p-4 rounded-[28px] bg-white border border-[#E2E8F0] shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <div className="h-40 rounded-[20px] bg-[#EFF6FF] p-3 flex flex-col justify-end relative overflow-hidden border border-[#DBEAFE]">
                  <div className="h-16 rounded-[14px] bg-[#60A5FA]" />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <h4 className="font-bold text-sm text-[#14161A]">Coastal</h4>
                  <span className="text-[10px] font-semibold text-[#581C87] bg-[#EDE9FE] px-2 py-0.5 rounded-full">₹299 / mo</span>
                </div>
                <p className="text-xs text-[#5A6170] mt-1">Soft blues for seafood and beach cafés.</p>
              </div>
              <Button variant="primary" size="sm" className="w-full rounded-full bg-[#2F5BD8]">
                Unlock template
              </Button>
            </div>

            {/* Thali */}
            <div className="p-4 rounded-[28px] bg-white border border-[#E2E8F0] shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <div className="h-40 rounded-[20px] bg-[#FEF2F2] p-3 flex flex-col justify-end relative overflow-hidden border border-[#FEE2E2]">
                  <div className="h-16 rounded-[14px] bg-[#EF4444]" />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <h4 className="font-bold text-sm text-[#14161A]">Thali</h4>
                  <span className="text-[10px] font-semibold text-[#581C87] bg-[#EDE9FE] px-2 py-0.5 rounded-full">₹299 / mo</span>
                </div>
                <p className="text-xs text-[#5A6170] mt-1">Festive patterns and big photos for Indian menus.</p>
              </div>
              <Button variant="primary" size="sm" className="w-full rounded-full bg-[#2F5BD8]">
                Unlock template
              </Button>
            </div>

            {/* Mono */}
            <div className="p-4 rounded-[28px] bg-white border border-[#E2E8F0] shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <div className="h-40 rounded-[20px] bg-[#F8FAFC] p-3 flex flex-col justify-end relative overflow-hidden border border-[#E2E8F0]">
                  <div className="h-16 rounded-[14px] bg-[#64748B]" />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <h4 className="font-bold text-sm text-[#14161A]">Mono</h4>
                  <span className="text-[10px] font-semibold text-[#065F46] bg-[#D1FAE5] px-2 py-0.5 rounded-full">Free</span>
                </div>
                <p className="text-xs text-[#5A6170] mt-1">Black and white, type-first, very fast.</p>
              </div>
              <Button variant="secondary" size="sm" className="w-full rounded-full border-[#E2E8F0]">
                Use template
              </Button>
            </div>
          </div>

          {/* Right Customize Panel (1 col) */}
          <div className="p-6 rounded-[28px] bg-white border border-[#E2E8F0] shadow-xl space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-[#14161A]">Noir</h3>
                <span className="text-[10px] font-semibold text-white bg-[#14161A] px-2.5 py-0.5 rounded-full">
                  In use
                </span>
              </div>

              {/* Brand Colour */}
              <div>
                <h4 className="text-xs font-semibold text-[#14161A] mb-2">Brand colour</h4>
                <div className="flex items-center gap-3">
                  <button type="button" aria-label="Gold" className="h-8 w-8 rounded-full bg-[#F59E0B] ring-2 ring-offset-2 ring-[#14161A] cursor-pointer" />
                  <button type="button" aria-label="Coral" className="h-8 w-8 rounded-full bg-[#F87171] hover:scale-105 transition-transform cursor-pointer" />
                  <button type="button" aria-label="Green" className="h-8 w-8 rounded-full bg-[#34D399] hover:scale-105 transition-transform cursor-pointer" />
                  <button type="button" aria-label="Violet" className="h-8 w-8 rounded-full bg-[#A78BFA] hover:scale-105 transition-transform cursor-pointer" />
                </div>
                <p className="text-[11px] text-[#5A6170] mt-2">
                  We check contrast for you; unreadable colours are blocked.
                </p>
              </div>

              {/* Menu Layout */}
              <div>
                <h4 className="text-xs font-semibold text-[#14161A] mb-2">Menu layout</h4>
                <div className="flex items-center p-1 rounded-full bg-[#F1F5F9] border border-[#E2E8F0]">
                  <button type="button" className="flex-1 py-1 rounded-full bg-[#14161A] text-white text-xs font-semibold cursor-pointer">Cards</button>
                  <button type="button" className="flex-1 py-1 rounded-full text-[#5A6170] text-xs font-medium cursor-pointer">List</button>
                  <button type="button" className="flex-1 py-1 rounded-full text-[#5A6170] text-xs font-medium cursor-pointer">Photo grid</button>
                </div>
              </div>

              {/* Show on Menu */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-semibold text-[#14161A] mb-1">Show on the menu</h4>
                <label className="flex items-center gap-2 text-xs text-[#14161A] cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Top dishes ranking</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-[#14161A] cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Live order status bar</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-[#14161A] cursor-pointer">
                  <input type="checkbox" className="rounded" />
                  <span>Veg / non-veg filter</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-[#F1F5F9]">
              <Button variant="secondary" size="sm" className="flex-1 rounded-full border-[#E2E8F0]">
                Preview on phone
              </Button>
              <Button variant="primary" size="sm" className="flex-1 rounded-full bg-[#14161A] text-white hover:bg-[#14161A]/90">
                Publish to diners
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

// ─── U3. Diner Template “Noir” (Mobile Phone, Dark Mood 390x844) ───
export const U3_DinerTemplateNoir: StoryObj = {
  name: 'U3: Diner Template "Noir" (Mobile, Dark)',
  render: () => (
    <div className="min-h-screen bg-[var(--color-bg)] flex justify-center py-6 px-4" data-theme="dark">
      <div className="w-full max-w-[390px] min-h-[740px] bg-[#0D0F12] text-[#F2F4F7] rounded-[44px] shadow-2xl border-8 border-[#1B1F25] flex flex-col overflow-hidden relative">
        {/* Top Header */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold tracking-wider uppercase text-[#F59E0B]">MASALA HOUSE</div>
            <h2 className="text-xl font-bold tracking-tight text-white mt-0.5">Tonight's menu</h2>
          </div>
          <button type="button" aria-label="Cart" className="h-9 w-9 rounded-full bg-white/10 text-white flex items-center justify-center cursor-pointer">
            <ShoppingBag className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4 pb-24">
          <div className="text-xs text-[#9AA3AF] font-medium">Top dishes this week</div>

          {/* Golden Hero Dish Pill */}
          <div className="p-3.5 rounded-[24px] bg-[#F59E0B] text-[#14161A] flex items-center justify-between shadow-[0_4px_20px_rgba(245,158,11,0.3)]">
            <div className="flex items-center gap-3">
              <span className="h-6 w-6 rounded-full bg-[#14161A] text-white text-xs font-bold flex items-center justify-center">1</span>
              <span className="font-bold text-sm">Butter chicken</span>
            </div>
            <span className="font-bold text-sm">₹420</span>
          </div>

          {/* Dish Row 2 */}
          <div className="p-3.5 rounded-[24px] bg-[#14171C] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="h-6 w-6 rounded-full bg-white/10 text-white text-xs font-bold flex items-center justify-center">2</span>
              <span className="font-medium text-sm text-white">Dal makhani</span>
            </div>
            <span className="font-medium text-sm text-white">₹310</span>
          </div>

          {/* Dish Row 3 */}
          <div className="p-3.5 rounded-[24px] bg-[#14171C] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="h-6 w-6 rounded-full bg-white/10 text-white text-xs font-bold flex items-center justify-center">3</span>
              <span className="font-medium text-sm text-white">Garlic naan</span>
            </div>
            <span className="font-medium text-sm text-white">₹90</span>
          </div>

          {/* Featured Hero Dish Card */}
          <div className="rounded-[28px] bg-[#14171C] border border-white/5 overflow-hidden shadow-lg">
            <div className="h-32 bg-gradient-to-br from-[#451A03] to-[#14171C] flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-[#F59E0B]" />
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-white">Paneer tikka</h3>
                <span className="font-bold text-base text-[#F59E0B]">₹360</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/80 bg-white/10 px-2.5 py-0.5 rounded-full font-medium">Vegetarian</span>
                <span className="text-[10px] text-white/80 bg-white/10 px-2.5 py-0.5 rounded-full font-medium">Spicy</span>
              </div>
              <button type="button" className="w-full py-2.5 rounded-full bg-[#F59E0B] text-[#14161A] text-xs font-bold shadow-md cursor-pointer">
                Add to order
              </button>
            </div>
          </div>
        </div>

        {/* Live Order Floating Status Pill */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="p-3 rounded-full bg-white text-[#14161A] shadow-2xl flex items-center justify-between px-4">
            <div>
              <div className="font-bold text-xs">Being prepared · 8 min</div>
              <div className="text-[10px] text-[#5A6170]">Order #42 · Table 7</div>
            </div>
            <button type="button" className="px-3.5 py-1.5 rounded-full bg-[#14161A] text-white text-xs font-semibold cursor-pointer">
              Track
            </button>
          </div>
        </div>
      </div>
    </div>
  ),
};

// ─── U4. Diner Template “Fresh” (Mobile Phone, Light Mood 390x844) ───
export const U4_DinerTemplateFresh: StoryObj = {
  name: 'U4: Diner Template "Fresh" (Mobile, Light)',
  render: () => (
    <div className="min-h-screen bg-[#F0FDF4] flex justify-center py-6 px-4" data-theme="light">
      <div className="w-full max-w-[390px] min-h-[740px] bg-white rounded-[44px] shadow-2xl border-8 border-[#14161A] flex flex-col overflow-hidden relative">
        {/* Top Header */}
        <div className="px-6 pt-5 pb-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#34D399] flex items-center justify-center text-[#14161A] font-bold text-sm">
            🌿
          </div>
          <div>
            <h3 className="font-bold text-base text-[#14161A]">Green Leaf Café</h3>
            <p className="text-[11px] text-[#5A6170]">Open · pickup in 10 min</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-5 mb-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#F8FAFC] border border-[#E2E8F0]">
            <Search className="h-3.5 w-3.5 text-[#5A6170]" />
            <input
              type="text"
              placeholder="Search the menu"
              className="w-full bg-transparent text-xs text-[#14161A] focus:outline-none"
            />
          </div>
        </div>

        {/* 2x2 Dish Grid */}
        <div className="flex-1 overflow-y-auto px-5 py-2 grid grid-cols-2 gap-3 pb-24">
          {/* Item 1 */}
          <div className="p-3 rounded-[24px] bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 flex flex-col justify-between">
            <div className="h-24 rounded-[18px] bg-gradient-to-br from-[#86EFAC] to-[#22C55E]" />
            <div>
              <div className="font-semibold text-xs text-[#14161A]">Avocado toast</div>
              <div className="flex items-center justify-between mt-1">
                <span className="font-bold text-xs text-[#14161A]">₹240</span>
                <button type="button" aria-label="Add" className="h-7 w-7 rounded-full bg-[#14161A] text-white flex items-center justify-center cursor-pointer">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Item 2 */}
          <div className="p-3 rounded-[24px] bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 flex flex-col justify-between">
            <div className="h-24 rounded-[18px] bg-gradient-to-br from-[#FCD34D] to-[#F59E0B]" />
            <div>
              <div className="font-semibold text-xs text-[#14161A]">Cold brew</div>
              <div className="flex items-center justify-between mt-1">
                <span className="font-bold text-xs text-[#14161A]">₹180</span>
                <button type="button" aria-label="Add" className="h-7 w-7 rounded-full bg-[#14161A] text-white flex items-center justify-center cursor-pointer">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Item 3 */}
          <div className="p-3 rounded-[24px] bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 flex flex-col justify-between">
            <div className="h-24 rounded-[18px] bg-gradient-to-br from-[#F472B6] to-[#DB2777]" />
            <div>
              <div className="font-semibold text-xs text-[#14161A]">Berry bowl</div>
              <div className="flex items-center justify-between mt-1">
                <span className="font-bold text-xs text-[#14161A]">₹260</span>
                <button type="button" aria-label="Add" className="h-7 w-7 rounded-full bg-[#14161A] text-white flex items-center justify-center cursor-pointer">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Item 4 */}
          <div className="p-3 rounded-[24px] bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 flex flex-col justify-between">
            <div className="h-24 rounded-[18px] bg-gradient-to-br from-[#FB923C] to-[#EA580C]" />
            <div>
              <div className="font-semibold text-xs text-[#14161A]">Croissant</div>
              <div className="flex items-center justify-between mt-1">
                <span className="font-bold text-xs text-[#14161A]">₹140</span>
                <button type="button" aria-label="Add" className="h-7 w-7 rounded-full bg-[#14161A] text-white flex items-center justify-center cursor-pointer">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Floating Checkout Pill */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="p-3 rounded-full bg-[#34D399] text-[#14161A] shadow-xl flex items-center justify-between px-4">
            <div>
              <div className="font-bold text-xs">2 items · ₹420</div>
              <div className="text-[10px] text-[#14161A]/80">Pickup at the counter</div>
            </div>
            <button type="button" className="px-4 py-1.5 rounded-full bg-[#14161A] text-white text-xs font-semibold cursor-pointer">
              Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  ),
};

// ─── D8. Customer Dashboard on Phone (Mobile Light 390x844) ───
export const D8_CustomerDashboardPhone: StoryObj = {
  name: 'D8: Customer Dashboard on Phone (Mobile, Light)',
  render: () => (
    <div className="min-h-screen bg-[#EEF1F5] flex justify-center py-6 px-4" data-theme="light">
      <div className="w-full max-w-[390px] min-h-[740px] bg-[#EEF1F5] rounded-[44px] shadow-2xl border-8 border-[#14161A] flex flex-col overflow-hidden relative">
        {/* Top Header */}
        <div className="px-6 pt-5 pb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-[#5A6170]">Shah Hospitality Group</span>
          <div className="h-8 w-8 rounded-full bg-[#FFEDD5] text-[#9A3412] font-bold text-xs flex items-center justify-center">
            PS
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-2 space-y-4 pb-24">
          <h2 className="text-2xl font-bold tracking-tight text-[#14161A]">
            Hello, Priya
          </h2>

          {/* Hero Performance Card */}
          <div className="p-5 rounded-[28px] bg-white border border-[#E2E8F0] shadow-md space-y-3">
            <div className="text-xs text-[#5A6170]">Orders this week, all restaurants</div>
            <div className="text-4xl font-bold text-[#14161A]">+18%</div>
            {/* 7 Bar Pills */}
            <div className="flex items-end justify-between h-14 pt-2">
              <div className="w-6 h-6 rounded-full bg-[#E2E8F0]" />
              <div className="w-6 h-4 rounded-full bg-[#E2E8F0]" />
              <div className="w-6 h-8 rounded-full bg-[#E2E8F0]" />
              <div className="w-6 h-10 rounded-full bg-[#E2E8F0]" />
              <div className="w-6 h-12 rounded-full bg-[#E2E8F0]" />
              <div className="w-6 h-14 rounded-full bg-[#14161A]" />
              <div className="w-6 h-9 rounded-full bg-[#E2E8F0]" />
            </div>
          </div>

          {/* Your places */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#14161A]">Your places</h3>
              <a href="#" className="text-xs text-[#2F5BD8] font-medium hover:underline">Add</a>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Masala House */}
              <div className="p-4 rounded-[24px] bg-[#14161A] text-white shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="h-7 w-7 rounded-full bg-[#FEF3C7] text-[#78350F] font-bold text-xs flex items-center justify-center">M</span>
                  <span className="text-[10px] font-semibold text-[#14161A] bg-white px-2 py-0.2 rounded-full">Live</span>
                </div>
                <div>
                  <div className="font-bold text-sm text-white">Masala House</div>
                  <div className="text-xs text-[#9AA3AF] mt-1"><span className="text-white font-bold text-base">1,402</span> orders</div>
                </div>
              </div>

              {/* Shah Clinic */}
              <div className="p-4 rounded-[24px] bg-white border border-[#E2E8F0] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="h-7 w-7 rounded-full bg-[#CCFBF1] text-[#115E59] font-bold text-xs flex items-center justify-center">+</span>
                </div>
                <div>
                  <div className="font-bold text-sm text-[#14161A]">Shah Clinic</div>
                  <div className="text-xs text-[#5A6170] mt-1"><span className="text-[#14161A] font-bold text-base">186</span> visits</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Plan Card */}
          <div className="p-4 rounded-[24px] bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[#F1F5F9] text-[#14161A] flex items-center justify-center">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-xs text-[#14161A]">Growth plan · ₹7,497</div>
                <div className="text-[10px] text-[#5A6170]">Next charge 1 Dec · UPI AutoPay</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-[#5A6170]" />
          </div>
        </div>

        {/* Floating Pill Bottom Tab Bar */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="h-14 bg-white border border-[#E2E8F0] rounded-full flex items-center justify-around px-2 shadow-xl">
            <button type="button" aria-label="Home" className="h-10 w-10 rounded-full bg-[#14161A] text-white flex items-center justify-center cursor-pointer">
              <Home className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Places" className="p-2 text-[#5A6170] hover:text-[#14161A] cursor-pointer">
              <Store className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Team" className="p-2 text-[#5A6170] hover:text-[#14161A] cursor-pointer">
              <Users className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Billing" className="p-2 text-[#5A6170] hover:text-[#14161A] cursor-pointer">
              <CreditCard className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Settings" className="p-2 text-[#5A6170] hover:text-[#14161A] cursor-pointer">
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  ),
};

