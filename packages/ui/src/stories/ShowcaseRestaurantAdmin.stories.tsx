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
  StatStrip,
  PillNav,
  QuantityStepper,
  ProgressBar,
} from '../components';
import { LollipopChart } from '../charts/lollipop-chart';
import { HourlyBarChart } from '../charts/hourly-bar-chart';
import {
  LayoutDashboard,
  Utensils,
  Layers,
  MapPin,
  Users,
  UserCheck,
  FileText,
  Smartphone,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Check,
  AlertTriangle,
  Clock,
  Printer,
  Copy,
  ExternalLink,
  QrCode,
  ShieldAlert,
  Sliders,
  DollarSign,
  Coffee,
  CheckCircle2,
  Lock,
} from 'lucide-react';

const meta: Meta = {
  title: 'Showcase/RestaurantOS Admin',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

// ─── R0. Shared RestaurantOS Sidebar (Desktop, Light Mood) ───
export const R0_RestaurantOSSidebar: StoryObj = {
  name: 'R0: RestaurantOS Sidebar (Desktop, Light)',
  render: () => (
    <div className="min-h-screen bg-[#EEF1F5] p-8 flex justify-center items-start" data-theme="light">
      <div className="w-[260px] bg-white rounded-[28px] border border-[#E2E8F0] p-4 flex flex-col min-h-[720px] shadow-xl">
        {/* Restaurant Profile Selector */}
        <div className="flex items-center justify-between p-2 rounded-[20px] hover:bg-[#F8FAFC] cursor-pointer">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-[#FB923C] text-white font-bold text-xs flex items-center justify-center">
              M
            </div>
            <div>
              <div className="font-bold text-xs text-[#14161A]">Masala House</div>
              <div className="text-[10px] text-[#5A6170]">Shah Hospitality</div>
            </div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-[#5A6170]" />
        </div>

        {/* Branch Selector Pill */}
        <div className="mt-2 mb-3">
          <div className="flex items-center justify-between px-3 py-1.5 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] text-xs cursor-pointer hover:border-[#CBD5E1]">
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3 text-[#5A6170]" />
              <span className="font-medium text-[#14161A]">Indiranagar</span>
            </div>
            <ChevronDown className="h-3 w-3 text-[#5A6170]" />
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 space-y-1">
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-[#14161A] text-white text-xs font-semibold shadow-md cursor-pointer">
            <LayoutDashboard className="h-4 w-4" />
            <span>Today</span>
          </div>

          <div className="flex items-center justify-between px-3.5 py-2 rounded-full text-[#5A6170] hover:text-[#14161A] hover:bg-[#F8FAFC] text-xs font-medium cursor-pointer">
            <div className="flex items-center gap-2.5">
              <FileText className="h-4 w-4" />
              <span>Orders</span>
            </div>
            <span className="text-[10px] font-bold text-[#2F5BD8] bg-[#DBEAFE] px-2 py-0.2 rounded-full">12</span>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-full text-[#5A6170] hover:text-[#14161A] hover:bg-[#F8FAFC] text-xs font-medium cursor-pointer">
            <Coffee className="h-4 w-4" />
            <span>Kitchen screen</span>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-full text-[#5A6170] hover:text-[#14161A] hover:bg-[#F8FAFC] text-xs font-medium cursor-pointer">
            <Utensils className="h-4 w-4" />
            <span>Menu</span>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-full text-[#5A6170] hover:text-[#14161A] hover:bg-[#F8FAFC] text-xs font-medium cursor-pointer">
            <Layers className="h-4 w-4" />
            <span>Floors & tables</span>
          </div>

          <div className="flex items-center justify-between px-3.5 py-2 rounded-full text-[#5A6170] hover:text-[#14161A] hover:bg-[#F8FAFC] text-xs font-medium cursor-pointer">
            <div className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4" />
              <span>Branches</span>
            </div>
            <span className="text-[10px] font-bold text-[#2F5BD8] bg-[#DBEAFE] px-2 py-0.2 rounded-full">2</span>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-full text-[#5A6170] hover:text-[#14161A] hover:bg-[#F8FAFC] text-xs font-medium cursor-pointer">
            <Users className="h-4 w-4" />
            <span>Staff</span>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-full text-[#5A6170] hover:text-[#14161A] hover:bg-[#F8FAFC] text-xs font-medium cursor-pointer">
            <UserCheck className="h-4 w-4" />
            <span>Guests</span>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-full text-[#5A6170] hover:text-[#14161A] hover:bg-[#F8FAFC] text-xs font-medium cursor-pointer">
            <DollarSign className="h-4 w-4" />
            <span>Invoices & GST</span>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-full text-[#5A6170] hover:text-[#14161A] hover:bg-[#F8FAFC] text-xs font-medium cursor-pointer">
            <Smartphone className="h-4 w-4" />
            <span>Diner app & template</span>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-full text-[#5A6170] hover:text-[#14161A] hover:bg-[#F8FAFC] text-xs font-medium cursor-pointer">
            <BarChart3 className="h-4 w-4" />
            <span>Reports</span>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-full text-[#5A6170] hover:text-[#14161A] hover:bg-[#F8FAFC] text-xs font-medium cursor-pointer">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </div>
        </nav>

        {/* Bottom Quota Usage Card */}
        <div className="pt-3 border-t border-[#E2E8F0]">
          <div className="p-3 rounded-[20px] bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#14161A]">Growth plan</span>
              <a href="#" className="text-[11px] text-[#2F5BD8] font-medium hover:underline">Upgrade</a>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-[#5A6170]">
                <span>Tables</span>
                <span>24 / 200</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden">
                <div className="h-full bg-[#2F5BD8] rounded-full w-[12%]" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-[#5A6170]">
                <span>Menu items</span>
                <span>18 / 500</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden">
                <div className="h-full bg-[#2F5BD8] rounded-full w-[4%]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

// ─── R1. Today Dashboard (Desktop, Light Mood) ───
export const R1_TodayDashboard: StoryObj = {
  name: 'R1: Today Dashboard (Desktop, Light)',
  render: () => (
    <div className="min-h-screen bg-[#EEF1F5] p-8 flex justify-center" data-theme="light">
      <div className="w-full max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-[#5A6170]">Indiranagar · Thursday dinner service</div>
            <h1 className="text-3xl font-bold tracking-tight text-[#14161A]">Good evening, Priya</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[#5A6170] px-3 py-1.5 rounded-full bg-white border border-[#E2E8F0]">
              86 an item
            </span>
            <Button variant="primary" className="rounded-full bg-[#14161A] text-white hover:bg-[#14161A]/90">
              New order
            </Button>
          </div>
        </div>

        {/* 4 Hero Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-[28px] bg-white border border-[#E2E8F0] shadow-sm">
            <div className="text-3xl font-bold text-[#14161A]">₹48,920</div>
            <div className="text-xs text-[#5A6170] mt-1">Sales today</div>
            <div className="text-[11px] text-[#065F46] font-medium mt-1">+14% vs last Thursday</div>
          </div>

          <div className="p-5 rounded-[28px] bg-white border border-[#E2E8F0] shadow-sm">
            <div className="text-3xl font-bold text-[#14161A]">86</div>
            <div className="text-xs text-[#5A6170] mt-1">Orders</div>
          </div>

          <div className="p-5 rounded-[28px] bg-white border border-[#E2E8F0] shadow-sm">
            <div className="text-3xl font-bold text-[#14161A]">17 <span className="text-lg text-[#5A6170] font-normal">/ 24</span></div>
            <div className="text-xs text-[#5A6170] mt-1">Tables seated</div>
          </div>

          <div className="p-5 rounded-[28px] bg-white border border-[#E2E8F0] shadow-sm">
            <div className="text-3xl font-bold text-[#14161A]">14 m</div>
            <div className="text-xs text-[#5A6170] mt-1">Avg. kitchen time</div>
          </div>
        </div>

        {/* 3 Operations Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Needs you now */}
          <div className="p-6 rounded-[28px] bg-white border border-[#E2E8F0] shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-[#14161A]">Needs you now</h3>
              <span className="h-4 w-4 rounded-full bg-[#2F5BD8] text-white text-[10px] font-bold flex items-center justify-center">3</span>
            </div>

            <div className="space-y-2.5">
              <div className="p-3.5 rounded-[20px] bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="h-8 w-8 rounded-full bg-[#2F5BD8] text-white font-bold text-xs flex items-center justify-center">T9</span>
                  <div>
                    <div className="font-bold text-xs text-[#14161A]">Table 9 is calling a waiter</div>
                    <div className="text-[10px] text-[#5A6170]">2 min ago</div>
                  </div>
                </div>
                <button type="button" className="px-3 py-1 rounded-full bg-[#14161A] text-white text-xs font-semibold cursor-pointer">
                  Resolve
                </button>
              </div>

              <div className="p-3.5 rounded-[20px] bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="h-8 w-8 rounded-full bg-[#B45309] text-white font-bold text-xs flex items-center justify-center">T3</span>
                  <div>
                    <div className="font-bold text-xs text-[#14161A]">Table 3 asked for the bill</div>
                    <div className="text-[10px] text-[#5A6170]">₹2,140 · 4 guests</div>
                  </div>
                </div>
                <button type="button" className="px-3 py-1 rounded-full border border-[#E2E8F0] bg-white text-[#14161A] text-xs font-semibold cursor-pointer">
                  Settle
                </button>
              </div>

              <div className="p-3.5 rounded-[20px] bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="h-8 w-8 rounded-full bg-[#EF4444] text-white font-bold text-xs flex items-center justify-center">⏰</span>
                  <div>
                    <div className="font-bold text-xs text-[#14161A]">2 kitchen tickets over 20 min</div>
                    <div className="text-[10px] text-[#5A6170]">Tandoor station</div>
                  </div>
                </div>
                <button type="button" className="px-3 py-1 rounded-full border border-[#E2E8F0] bg-white text-[#14161A] text-xs font-semibold cursor-pointer">
                  Open KDS
                </button>
              </div>
            </div>
          </div>

          {/* Column 2: Main hall right now */}
          <div className="p-6 rounded-[28px] bg-white border border-[#E2E8F0] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#14161A]">Main hall right now</h3>
              <a href="#" className="text-xs text-[#2F5BD8] font-medium hover:underline">Floor plan</a>
            </div>

            {/* 18 Table Grid */}
            <div className="grid grid-cols-6 gap-2">
              {[1, 2, 5, 6, 8, 9, 10, 12, 14, 16, 17].map((num) => (
                <div key={num} className="h-10 rounded-[12px] bg-[#2F5BD8] text-white font-bold text-xs flex items-center justify-center">
                  {num}
                </div>
              ))}
              {[4, 13].map((num) => (
                <div key={num} className="h-10 rounded-[12px] bg-[#14161A] text-white font-bold text-xs flex items-center justify-center">
                  {num}
                </div>
              ))}
              {[3, 7, 11, 15, 18].map((num) => (
                <div key={num} className="h-10 rounded-[12px] bg-[#F1F5F9] text-[#5A6170] font-medium text-xs flex items-center justify-center border border-[#E2E8F0]">
                  {num}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-4 text-[11px] text-[#14161A] pt-3 border-t border-[#F1F5F9]">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#2F5BD8]" /> Seated</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#14161A]" /> Bill asked</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#CBD5E1]" /> Free</span>
            </div>
          </div>

          {/* Column 3: Top dishes tonight */}
          <div className="p-6 rounded-[28px] bg-white border border-[#E2E8F0] shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-[#14161A]">Top dishes tonight</h3>

            <div className="space-y-2">
              <div className="p-3.5 rounded-[20px] bg-[#14161A] text-white flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <span className="h-6 w-6 rounded-full bg-white text-[#14161A] font-bold text-xs flex items-center justify-center">1</span>
                  <span className="font-bold text-xs">Butter chicken</span>
                </div>
                <span className="font-bold text-xs">31</span>
              </div>

              <div className="p-3.5 rounded-[20px] bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="h-6 w-6 rounded-full bg-[#E2E8F0] text-[#14161A] font-bold text-xs flex items-center justify-center">2</span>
                  <span className="font-semibold text-xs text-[#14161A]">Garlic naan</span>
                </div>
                <span className="font-semibold text-xs text-[#14161A]">58</span>
              </div>

              <div className="p-3.5 rounded-[20px] bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="h-6 w-6 rounded-full bg-[#E2E8F0] text-[#14161A] font-bold text-xs flex items-center justify-center">3</span>
                  <span className="font-semibold text-xs text-[#14161A]">Dal makhani</span>
                </div>
                <span className="font-semibold text-xs text-[#14161A]">22</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

// ─── R2. Branches and Edit Branch (Desktop, Light Mood) ───
export const R2_BranchesAndEditBranch: StoryObj = {
  name: 'R2: Branches and Edit Branch (Desktop, Light)',
  render: () => (
    <div className="min-h-screen bg-[#EEF1F5] p-8 flex justify-center" data-theme="light">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Branches List (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-[#5A6170]">2 of 5 on your plan</div>
              <h1 className="text-3xl font-bold tracking-tight text-[#14161A]">Branches</h1>
            </div>
            <Button variant="primary" className="rounded-full bg-[#14161A] text-white hover:bg-[#14161A]/90">
              Add branch
            </Button>
          </div>

          <div className="space-y-4">
            {/* Indiranagar (Active Selection) */}
            <div className="p-6 rounded-[28px] bg-white border-2 border-[#14161A] shadow-md space-y-3 cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#FFEDD5] text-[#EA580C] flex items-center justify-center">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#14161A]">Indiranagar</h3>
                    <p className="text-xs text-[#5A6170]">MH-IND · 12, 100 Feet Rd</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-[#065F46] bg-[#D1FAE5] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#065F46]" /> Open now
                </span>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-xs text-[#5A6170] px-3 py-1 rounded-full bg-[#F8FAFC] border border-[#E2E8F0]">2 floors</span>
                <span className="text-xs text-[#5A6170] px-3 py-1 rounded-full bg-[#F8FAFC] border border-[#E2E8F0]">24 tables</span>
                <span className="text-xs text-[#5A6170] px-3 py-1 rounded-full bg-[#F8FAFC] border border-[#E2E8F0]">14 staff</span>
                <span className="text-xs text-[#5A6170] px-3 py-1 rounded-full bg-[#F8FAFC] border border-[#E2E8F0]">3 menu changes</span>
              </div>
            </div>

            {/* Koramangala */}
            <div className="p-6 rounded-[28px] bg-white border border-[#E2E8F0] shadow-sm space-y-3 cursor-pointer hover:border-[#CBD5E1]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#F1F5F9] text-[#5A6170] flex items-center justify-center">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#14161A]">Koramangala</h3>
                    <p className="text-xs text-[#5A6170]">MH-KOR · 80 Feet Rd, 4th Block</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-[#78350F] bg-[#FEF3C7] px-2.5 py-0.5 rounded-full">
                  Closed today · renovation
                </span>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-xs text-[#5A6170] px-3 py-1 rounded-full bg-[#F8FAFC] border border-[#E2E8F0]">1 floor</span>
                <span className="text-xs text-[#5A6170] px-3 py-1 rounded-full bg-[#F8FAFC] border border-[#E2E8F0]">16 tables</span>
                <span className="text-xs text-[#5A6170] px-3 py-1 rounded-full bg-[#F8FAFC] border border-[#E2E8F0]">9 staff</span>
              </div>
            </div>

            {/* Add Branch Placeholder */}
            <div className="p-8 rounded-[28px] border-2 border-dashed border-[#CBD5E1] bg-white/50 text-center space-y-1 cursor-pointer hover:bg-white transition-colors">
              <Plus className="h-5 w-5 text-[#5A6170] mx-auto" />
              <div className="font-bold text-xs text-[#14161A]">Add another branch</div>
              <div className="text-[10px] text-[#5A6170]">3 more included in Growth</div>
            </div>
          </div>
        </div>

        {/* Edit Indiranagar Slide-over Panel (1 col) */}
        <div className="p-6 rounded-[32px] bg-white border border-[#E2E8F0] shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-[#14161A]">Edit Indiranagar</h3>
            <button type="button" className="h-7 w-7 rounded-full bg-[#F1F5F9] text-[#5A6170] flex items-center justify-center text-xs">✕</button>
          </div>

          <div className="space-y-4 text-xs text-[#14161A]">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-[#14161A]">Branch name</label>
                <input
                  type="text"
                  aria-label="Branch name"
                  defaultValue="Indiranagar"
                  className="w-full mt-1 px-3.5 py-2 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-[#14161A]"
                />
              </div>
              <div>
                <label className="font-semibold text-[#14161A]">Short code</label>
                <input
                  type="text"
                  aria-label="Short code"
                  defaultValue="MH-IND"
                  className="w-full mt-1 px-3.5 py-2 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-[#14161A]"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-[#14161A]">Address</label>
              <input
                type="text"
                aria-label="Address"
                defaultValue="12, 100 Feet Rd, Indiranagar, Bengaluru 560038"
                className="w-full mt-1 px-3.5 py-2 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-[#14161A]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-[#14161A]">Phone</label>
                <input
                  type="tel"
                  aria-label="Phone"
                  defaultValue="+91 80 4123 4567"
                  className="w-full mt-1 px-3.5 py-2 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-[#14161A]"
                />
              </div>
              <div>
                <label className="font-semibold text-[#14161A]">Time zone</label>
                <select
                  aria-label="Time zone"
                  className="w-full mt-1 px-3.5 py-2 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-[#14161A]"
                >
                  <option>Asia/Kolkata (IST)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="font-semibold text-[#14161A]">Opening hours</label>
              <div className="p-2.5 rounded-[16px] bg-[#F8FAFC] border border-[#E2E8F0] flex justify-between">
                <span>Mon – Thu</span>
                <span className="font-mono">12:00 – 15:30 · 19:00 – 23:00</span>
              </div>
              <div className="p-2.5 rounded-[16px] bg-[#F8FAFC] border border-[#E2E8F0] flex justify-between">
                <span>Fri – Sun</span>
                <span className="font-mono">12:00 – 23:30</span>
              </div>
              <a href="#" className="text-[11px] text-[#2F5BD8] hover:underline block">Add a holiday or special hours</a>
            </div>

            <div className="p-3 rounded-[20px] bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
              <div>
                <div className="font-semibold text-[#14161A]">Accepting orders</div>
                <div className="text-[10px] text-[#5A6170]">Turn off to pause QR ordering for this branch only</div>
              </div>
              <span className="h-5 w-9 rounded-full bg-[#10B981] flex items-center justify-end px-1"><span className="h-3.5 w-3.5 rounded-full bg-white" /></span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button variant="secondary" className="flex-1 rounded-full border-[#E2E8F0]">Cancel</Button>
              <Button variant="primary" className="flex-1 rounded-full bg-[#14161A] text-white">Save changes</Button>
            </div>

            <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
              <span className="text-[10px] text-[#5A6170]">Close this branch for good?</span>
              <button type="button" className="text-xs text-[#B91C1C] font-semibold border border-[#B91C1C]/30 px-3 py-1 rounded-full hover:bg-[#FEF2F2]">
                Close branch
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

// ─── R3. Floors & Tables Editor (Desktop, Light Mood) ───
export const R3_FloorsAndTablesEditor: StoryObj = {
  name: 'R3: Floors & Tables Editor (Desktop, Light)',
  render: () => (
    <div className="min-h-screen bg-[#EEF1F5] p-8 flex justify-center" data-theme="light">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas Area (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-[#5A6170]">Indiranagar · click a table to edit it</div>
              <h1 className="text-3xl font-bold tracking-tight text-[#14161A]">Floors & tables</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#065F46] font-medium flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> All changes saved
              </span>
              <Button variant="secondary" size="sm" className="rounded-full border-[#E2E8F0]">
                Print all QR codes
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <PillNav
              items={[
                { id: 'main', label: 'Main hall · 10', active: true },
                { id: 'terrace', label: 'Terrace · 8' },
                { id: 'add', label: '+ Floor' },
              ]}
            />
            <div className="flex items-center gap-2 text-xs">
              <button type="button" className="px-3 py-1.5 rounded-full bg-white border border-[#E2E8F0] text-[#5A6170] hover:text-[#14161A]">◯ Round table</button>
              <button type="button" className="px-3 py-1.5 rounded-full bg-white border border-[#E2E8F0] text-[#5A6170] hover:text-[#14161A]">▢ Square table</button>
              <button type="button" className="px-3 py-1.5 rounded-full bg-white border border-[#E2E8F0] text-[#5A6170] hover:text-[#14161A]">Merge tables</button>
            </div>
          </div>

          {/* Dotted Floor Plan Canvas */}
          <div className="p-8 rounded-[32px] bg-white border border-[#E2E8F0] shadow-md min-h-[460px] relative flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="px-4 py-1 rounded-full bg-[#F1F5F9] text-xs font-semibold text-[#5A6170]">
                Entrance
              </div>
              <div className="py-12 px-2 rounded-[16px] bg-[#F8FAFC] border border-[#E2E8F0] text-[10px] text-[#5A6170] writing-vertical">
                Bar counter
              </div>
            </div>

            {/* Table Layout Simulation */}
            <div className="grid grid-cols-4 gap-6 my-auto pr-16">
              <div className="h-16 w-16 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-center flex flex-col justify-center cursor-pointer">
                <span className="font-bold text-xs text-[#14161A]">1</span>
                <span className="text-[9px] text-[#5A6170]">2 seats</span>
              </div>

              <div className="h-16 w-16 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-center flex flex-col justify-center cursor-pointer">
                <span className="font-bold text-xs text-[#14161A]">2</span>
                <span className="text-[9px] text-[#5A6170]">2 seats</span>
              </div>

              <div className="h-16 w-20 rounded-[18px] bg-[#EFF6FF] border border-[#BFDBFE] text-center flex flex-col justify-center cursor-pointer">
                <span className="font-bold text-xs text-[#14161A]">3</span>
                <span className="text-[9px] text-[#5A6170]">4 seats</span>
              </div>

              <div className="h-16 w-20 rounded-[18px] bg-[#EFF6FF] border border-[#BFDBFE] text-center flex flex-col justify-center cursor-pointer">
                <span className="font-bold text-xs text-[#14161A]">4</span>
                <span className="text-[9px] text-[#5A6170]">4 seats</span>
              </div>

              {/* Table 5 Selected */}
              <div className="h-16 w-24 rounded-[18px] bg-[#14161A] text-white text-center flex flex-col justify-center shadow-[0_0_20px_rgba(47,91,216,0.5)] cursor-pointer">
                <span className="font-bold text-xs text-white">5</span>
                <span className="text-[9px] text-white/70">6 seats</span>
              </div>

              <div className="h-16 w-16 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-center flex flex-col justify-center cursor-pointer">
                <span className="font-bold text-xs text-[#14161A]">6</span>
                <span className="text-[9px] text-[#5A6170]">4 seats</span>
              </div>

              <div className="h-16 w-16 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-center flex flex-col justify-center cursor-pointer">
                <span className="font-bold text-xs text-[#14161A]">7</span>
                <span className="text-[9px] text-[#5A6170]">2 seats</span>
              </div>

              <div className="h-16 w-28 rounded-[18px] bg-[#EFF6FF] border border-[#BFDBFE] text-center flex flex-col justify-center cursor-pointer">
                <span className="font-bold text-xs text-[#14161A]">9</span>
                <span className="text-[9px] text-[#5A6170]">8 seats</span>
              </div>
            </div>
            <div />
          </div>
        </div>

        {/* Right Table Editor Panel (1 col) */}
        <div className="p-6 rounded-[32px] bg-white border border-[#E2E8F0] shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-[#14161A]">Table 5</h3>
              <span className="text-[10px] font-semibold text-[#065F46] bg-[#D1FAE5] px-2.5 py-0.5 rounded-full">Free</span>
            </div>

            <div className="space-y-3 text-xs text-[#14161A]">
              <div>
                <label className="font-semibold text-[#14161A]">Table number</label>
                <input
                  type="text"
                  aria-label="Table number"
                  defaultValue="5"
                  className="w-full mt-1 px-4 py-2 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-[#14161A]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#14161A]">Seats</label>
                <div className="mt-1 flex items-center justify-center gap-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-full py-1.5">
                  <button type="button" aria-label="Decrease seats" className="h-8 w-8 flex items-center justify-center text-base font-bold text-[#5A6170] cursor-pointer">−</button>
                  <span className="font-bold text-[#14161A]">6</span>
                  <button type="button" aria-label="Increase seats" className="h-8 w-8 flex items-center justify-center text-base font-bold text-[#5A6170] cursor-pointer">+</button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#14161A]">Shape</label>
                <div className="flex mt-1 p-1 rounded-full bg-[#F1F5F9]">
                  <button type="button" className="flex-1 py-1 rounded-full text-xs text-[#5A6170]">Round</button>
                  <button type="button" className="flex-1 py-1 rounded-full bg-[#14161A] text-white text-xs font-semibold">Square</button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#14161A]">Section</label>
                <select
                  aria-label="Section"
                  className="w-full mt-1 px-4 py-2 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-[#14161A]"
                >
                  <option>Window</option>
                  <option>Centre hall</option>
                  <option>Patio</option>
                </select>
              </div>

              <div className="p-3 rounded-[20px] bg-[#F8FAFC] border border-[#E2E8F0] flex items-center gap-3">
                <QrCode className="h-10 w-10 text-[#14161A]" />
                <div className="space-y-0.5">
                  <a href="#" className="text-xs text-[#2F5BD8] font-medium hover:underline block py-1">Download QR</a>
                  <a href="#" className="text-[11px] text-[#5A6170] hover:underline block py-1">Replace QR code</a>
                </div>
              </div>
            </div>
          </div>

          <button type="button" className="w-full py-2.5 rounded-full border border-[#B91C1C]/40 text-[#B91C1C] text-xs font-semibold hover:bg-[#FEF2F2] cursor-pointer">
            Remove table
          </button>
        </div>
      </div>
    </div>
  ),
};

// ─── R4. Menu and Edit Item (Desktop, Light Mood) ───
export const R4_MenuAndEditItem: StoryObj = {
  name: 'R4: Menu and Edit Item (Desktop, Light)',
  render: () => (
    <div className="min-h-screen bg-[#EEF1F5] p-8 flex justify-center" data-theme="light">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu Items List (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-[#5A6170]">18 items · 4 categories · shared by both branches</div>
              <h1 className="text-3xl font-bold tracking-tight text-[#14161A]">Menu</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" className="rounded-full border-[#E2E8F0]">Import</Button>
              <Button variant="primary" size="sm" className="rounded-full bg-[#14161A] text-white hover:bg-[#14161A]/90">Add item</Button>
            </div>
          </div>

          {/* Yellow Banner */}
          <div className="p-3.5 rounded-[20px] bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-between text-xs text-[#92400E]">
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full bg-[#F59E0B] text-white flex items-center justify-center font-bold text-[10px]">!</span>
              <span>Sample menu: diners see these dishes until you edit or remove them.</span>
            </div>
            <a href="#" className="font-semibold text-[#92400E] hover:underline">Remove all samples</a>
          </div>

          {/* Categories PillNav */}
          <PillNav
            items={[
              { id: 'mains', label: 'Mains · 7', active: true },
              { id: 'starters', label: 'Starters · 4' },
              { id: 'breads', label: 'Breads · 4' },
              { id: 'drinks', label: 'Drinks · 3' },
              { id: 'add', label: '+ Category' },
            ]}
          />

          {/* Dish List */}
          <div className="space-y-2">
            {/* Butter Chicken (Selected) */}
            <div className="p-3.5 rounded-[24px] bg-white border-2 border-[#2F5BD8] shadow-sm flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-[16px] bg-[#FB923C]" />
                <div>
                  <div className="font-bold text-xs text-[#14161A]">Butter chicken</div>
                  <div className="text-[10px] text-[#5A6170]">Tandoor · 18 min · non-veg</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-xs text-[#14161A]">₹420</span>
                <span className="text-[10px] font-semibold text-[#2F5BD8] bg-[#DBEAFE] px-2 py-0.5 rounded-full">Popular</span>
              </div>
            </div>

            <div className="p-3.5 rounded-[24px] bg-white border border-[#E2E8F0] flex items-center justify-between cursor-pointer hover:border-[#CBD5E1]">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-[16px] bg-[#FBBF24]" />
                <div>
                  <div className="font-bold text-xs text-[#14161A]">Paneer butter masala</div>
                  <div className="text-[10px] text-[#5A6170]">Curry · 15 min · veg</div>
                </div>
              </div>
              <span className="font-bold text-xs text-[#14161A]">₹360</span>
            </div>

            <div className="p-3.5 rounded-[24px] bg-white border border-[#E2E8F0] flex items-center justify-between cursor-pointer hover:border-[#CBD5E1]">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-[16px] bg-[#B45309]" />
                <div>
                  <div className="font-bold text-xs text-[#14161A]">Dal makhani</div>
                  <div className="text-[10px] text-[#5A6170]">Curry · 12 min · veg</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-xs text-[#14161A]">₹310</span>
                <span className="text-[10px] font-semibold text-[#2F5BD8] bg-[#DBEAFE] px-2 py-0.5 rounded-full">Signature</span>
              </div>
            </div>

            <div className="p-3.5 rounded-[24px] bg-white border border-[#E2E8F0] flex items-center justify-between cursor-pointer hover:border-[#CBD5E1]">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-[16px] bg-[#F59E0B]" />
                <div>
                  <div className="font-bold text-xs text-[#14161A]">Chicken biryani</div>
                  <div className="text-[10px] text-[#5A6170]">Biryani · 20 min · non-veg</div>
                </div>
              </div>
              <span className="font-bold text-xs text-[#14161A]">₹380</span>
            </div>

            <div className="p-3.5 rounded-[24px] bg-white border border-[#E2E8F0] flex items-center justify-between cursor-pointer hover:border-[#CBD5E1]">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-[16px] bg-[#94A3B8]" />
                <div>
                  <div className="font-bold text-xs text-[#14161A]">Kadai mushroom</div>
                  <div className="text-[10px] text-[#5A6170]">Curry · 15 min · veg</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-xs text-[#14161A]">₹320</span>
                <span className="text-[10px] font-semibold text-[#991B1B] bg-[#FEE2E2] px-2 py-0.5 rounded-full">Sold out</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Edit Dish Panel (1 col) */}
        <div className="p-6 rounded-[32px] bg-white border border-[#E2E8F0] shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-[#14161A]">Butter chicken</h3>
              <span className="text-[10px] font-bold text-[#14161A] bg-[#FBBF24] px-2 py-0.2 rounded-full">SAMPLE</span>
            </div>
            <button type="button" className="h-7 w-7 rounded-full bg-[#F1F5F9] text-[#5A6170] flex items-center justify-center text-xs">✕</button>
          </div>

          <div className="space-y-3 text-xs text-[#14161A]">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-[18px] bg-[#FB923C] shrink-0" />
              <div>
                <a href="#" className="font-semibold text-[#2F5BD8] hover:underline">Change photo</a>
                <p className="text-[10px] text-[#5A6170] mt-0.5">JPG or PNG, up to 5 MB</p>
              </div>
            </div>

            <div>
              <label className="font-semibold text-[#14161A]">Description</label>
              <textarea
                aria-label="Description"
                defaultValue="Tandoori chicken in a tomato and butter gravy."
                rows={2}
                className="w-full mt-1 p-2.5 rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] text-[#14161A]"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="font-semibold text-[#14161A]">Price (₹)</label>
                <input
                  type="text"
                  aria-label="Price"
                  defaultValue="420"
                  className="w-full mt-1 px-3 py-1.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-[#14161A]"
                />
              </div>
              <div>
                <label className="font-semibold text-[#14161A]">GST</label>
                <select
                  aria-label="GST rate"
                  className="w-full mt-1 px-2 py-1.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-[11px] text-[#14161A]"
                >
                  <option>5% · restaurant</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-[#14161A]">HSN / SAC</label>
                <input
                  type="text"
                  aria-label="HSN or SAC"
                  defaultValue="996331"
                  className="w-full mt-1 px-3 py-1.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-[#14161A]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="font-semibold text-[#14161A]">Kitchen station</label>
                <select
                  aria-label="Kitchen station"
                  className="w-full mt-1 px-2 py-1.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-[11px] text-[#14161A]"
                >
                  <option>Tandoor</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-[#14161A]">Prep time</label>
                <input
                  type="text"
                  aria-label="Prep time"
                  defaultValue="18 min"
                  className="w-full mt-1 px-3 py-1.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-[#14161A]"
                />
              </div>
              <div>
                <label className="font-semibold text-[#14161A]">Food type</label>
                <select
                  aria-label="Food type"
                  className="w-full mt-1 px-2 py-1.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-[11px] text-[#14161A]"
                >
                  <option>Non-veg</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold text-[#14161A]">Contains</label>
              <div className="flex gap-1.5 mt-1">
                <span className="px-2.5 py-0.5 rounded-full bg-[#14161A] text-white text-[10px]">Dairy</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#14161A] text-white text-[10px]">Nuts</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#5A6170] text-[10px]">Gluten</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#5A6170] text-[10px]">Egg</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#F1F5F9] flex items-center gap-2">
              <Button variant="secondary" className="flex-1 rounded-full border-[#E2E8F0]">Hide from menu</Button>
              <Button variant="primary" className="flex-1 rounded-full bg-[#14161A] text-white">Save item</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

// ─── R5. Staff & Roles (Desktop, Light Mood) ───
export const R5_StaffAndRoles: StoryObj = {
  name: 'R5: Staff and Roles (Desktop, Light)',
  render: () => (
    <div className="min-h-screen bg-[#EEF1F5] p-8 flex justify-center" data-theme="light">
      <div className="w-full max-w-6xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-[#5A6170]">23 people · 38 of 50 seats used</div>
            <h1 className="text-3xl font-bold tracking-tight text-[#14161A]">Staff</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" className="rounded-full border-[#E2E8F0]">Add POS device</Button>
            <Button variant="primary" size="sm" className="rounded-full bg-[#14161A] text-white hover:bg-[#14161A]/90">Add person</Button>
          </div>
        </div>

        {/* Filter Pills */}
        <PillNav
          items={[
            { id: 'all', label: 'Everyone', active: true },
            { id: 'floor', label: 'Floor' },
            { id: 'kitchen', label: 'Kitchen' },
            { id: 'managers', label: 'Managers' },
            { id: 'locked', label: 'Locked out · 1' },
          ]}
        />

        {/* Staff Table Card */}
        <div className="p-6 rounded-[32px] bg-white border border-[#E2E8F0] shadow-md overflow-x-auto">
          <table className="w-full text-left text-xs text-[#14161A]">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#5A6170]">
                <th className="py-2.5 font-medium">Name</th>
                <th className="py-2.5 font-medium">Role</th>
                <th className="py-2.5 font-medium">Branch</th>
                <th className="py-2.5 font-medium">Station</th>
                <th className="py-2.5 font-medium">Status</th>
                <th className="py-2.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              <tr>
                <td className="py-3 flex items-center gap-2.5 font-semibold text-[#14161A]">
                  <span className="h-7 w-7 rounded-full bg-[#14161A] text-white flex items-center justify-center font-bold text-[10px]">PS</span>
                  Priya Shah
                </td>
                <td className="py-3"><span className="px-2.5 py-0.5 rounded-full bg-[#14161A] text-white text-[10px] font-semibold">Owner</span></td>
                <td className="py-3 text-[#5A6170]">All branches</td>
                <td className="py-3 text-[#5A6170]">—</td>
                <td className="py-3"><span className="text-[10px] text-[#065F46] bg-[#D1FAE5] px-2 py-0.5 rounded-full font-medium">Active</span></td>
                <td className="py-3 text-right"><Button variant="secondary" size="sm" className="rounded-full text-xs">Manage</Button></td>
              </tr>

              <tr>
                <td className="py-3 flex items-center gap-2.5 font-semibold text-[#14161A]">
                  <span className="h-7 w-7 rounded-full bg-[#FFEDD5] text-[#9A3412] flex items-center justify-center font-bold text-[10px]">RK</span>
                  Rahul Kapoor
                </td>
                <td className="py-3"><span className="px-2.5 py-0.5 rounded-full bg-[#FFEDD5] text-[#9A3412] text-[10px] font-semibold">Manager</span></td>
                <td className="py-3 text-[#5A6170]">Indiranagar</td>
                <td className="py-3 text-[#5A6170]">—</td>
                <td className="py-3"><span className="text-[10px] text-[#065F46] bg-[#D1FAE5] px-2 py-0.5 rounded-full font-medium">Active</span></td>
                <td className="py-3 text-right"><Button variant="secondary" size="sm" className="rounded-full text-xs">Manage</Button></td>
              </tr>

              <tr>
                <td className="py-3 flex items-center gap-2.5 font-semibold text-[#14161A]">
                  <span className="h-7 w-7 rounded-full bg-[#DBEAFE] text-[#1E40AF] flex items-center justify-center font-bold text-[10px]">AN</span>
                  Arjun Nair
                </td>
                <td className="py-3"><span className="px-2.5 py-0.5 rounded-full bg-[#DBEAFE] text-[#1E40AF] text-[10px] font-semibold">Server</span></td>
                <td className="py-3 text-[#5A6170]">Indiranagar</td>
                <td className="py-3 text-[#5A6170]">Floor</td>
                <td className="py-3"><span className="text-[10px] text-[#065F46] bg-[#D1FAE5] px-2 py-0.5 rounded-full font-medium">Active</span></td>
                <td className="py-3 text-right"><Button variant="secondary" size="sm" className="rounded-full text-xs">Reset PIN</Button></td>
              </tr>

              <tr>
                <td className="py-3 flex items-center gap-2.5 font-semibold text-[#14161A]">
                  <span className="h-7 w-7 rounded-full bg-[#EDE9FE] text-[#581C87] flex items-center justify-center font-bold text-[10px]">SI</span>
                  Sana Iqbal
                </td>
                <td className="py-3"><span className="px-2.5 py-0.5 rounded-full bg-[#EDE9FE] text-[#581C87] text-[10px] font-semibold">Host</span></td>
                <td className="py-3 text-[#5A6170]">Indiranagar</td>
                <td className="py-3 text-[#5A6170]">Front door</td>
                <td className="py-3"><span className="text-[10px] text-[#78350F] bg-[#FEF3C7] px-2 py-0.5 rounded-full font-medium">Invited</span></td>
                <td className="py-3 text-right"><Button variant="secondary" size="sm" className="rounded-full text-xs">Resend invite</Button></td>
              </tr>

              <tr>
                <td className="py-3 flex items-center gap-2.5 font-semibold text-[#14161A]">
                  <span className="h-7 w-7 rounded-full bg-[#DCFCE7] text-[#14532D] flex items-center justify-center font-bold text-[10px]">RK</span>
                  Ravi Kumar
                </td>
                <td className="py-3"><span className="px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#14532D] text-[10px] font-semibold">Chef</span></td>
                <td className="py-3 text-[#5A6170]">Indiranagar</td>
                <td className="py-3 text-[#5A6170]">Tandoor</td>
                <td className="py-3"><span className="text-[10px] text-[#991B1B] bg-[#FEE2E2] px-2 py-0.5 rounded-full font-medium">Locked out</span></td>
                <td className="py-3 text-right"><Button variant="primary" size="sm" className="rounded-full bg-[#14161A] text-white text-xs">Unlock</Button></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Roles Permission Explainer */}
        <div className="p-6 rounded-[32px] bg-white border border-[#E2E8F0] shadow-sm space-y-3">
          <h4 className="font-bold text-sm text-[#14161A]">What each role can do</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#14161A]">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[#5A6170]">
                  <th className="py-2">Permission</th>
                  <th className="py-2">Owner</th>
                  <th className="py-2">Admin</th>
                  <th className="py-2">Manager</th>
                  <th className="py-2">Server / Host</th>
                  <th className="py-2">Chef / Expo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                <tr><td className="py-2">Take orders, settle tables</td><td>✓</td><td>✓</td><td>✓</td><td>✓</td><td>—</td></tr>
                <tr><td className="py-2">Kitchen screen</td><td>✓</td><td>✓</td><td>✓</td><td>—</td><td>✓</td></tr>
                <tr><td className="py-2">Edit menu, tables, staff</td><td>✓</td><td>✓</td><td>Own branch</td><td>—</td><td>—</td></tr>
                <tr><td className="py-2">Billing, plan, GST, payments</td><td>✓</td><td>✓</td><td>—</td><td>—</td><td>—</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  ),
};

// ─── R6. Settings: Brand, Domain, GST, Payments (Desktop, Light Mood) ───
export const R6_SettingsBrandGSTPayments: StoryObj = {
  name: 'R6: Settings Brand, Domain, GST, Payments (Desktop, Light)',
  render: () => (
    <div className="min-h-screen bg-[#EEF1F5] p-8 flex justify-center" data-theme="light">
      <div className="w-full max-w-6xl space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-[#14161A]">Settings</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Brand */}
          <div className="p-6 rounded-[28px] bg-white border border-[#E2E8F0] shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-[#14161A]">Brand</h3>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#FB923C] text-white font-bold text-base flex items-center justify-center">M</div>
              <div>
                <a href="#" className="font-semibold text-xs text-[#2F5BD8] hover:underline">Upload logo</a>
                <p className="text-[10px] text-[#5A6170]">Square PNG or SVG, at least 512 px</p>
              </div>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#5A6170]">Brand colour</span>
              <span className="flex items-center gap-1.5 text-[#14161A]"><span className="h-4 w-4 rounded-full bg-[#FB923C]" /> #FB923C</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#5A6170]">Diner template</span>
              <a href="#" className="text-[#2F5BD8] font-semibold hover:underline">Saffron · change</a>
            </div>
          </div>

          {/* Web Address */}
          <div className="p-6 rounded-[28px] bg-white border border-[#E2E8F0] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#14161A]">Your own web address</h3>
              <span className="text-[10px] font-semibold text-[#78350F] bg-[#FEF3C7] px-2 py-0.2 rounded-full">Waiting for DNS</span>
            </div>
            <input
              type="text"
              aria-label="Your web address"
              defaultValue="order.masalahouse.in"
              className="w-full px-4 py-2 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#14161A]"
            />
            <div className="p-3 rounded-[18px] bg-[#F8FAFC] border border-[#E2E8F0] text-xs space-y-1">
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-[#5A6170]">Type CNAME</span>
                <span className="text-[#2F5BD8] cursor-pointer">Copy</span>
              </div>
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-[#5A6170]">edge.orbitox.io</span>
                <span className="text-[#2F5BD8] cursor-pointer">Copy</span>
              </div>
            </div>
            <Button variant="primary" size="sm" className="w-full rounded-full bg-[#14161A] text-white">Check now</Button>
          </div>

          {/* GST & Invoices */}
          <div className="p-6 rounded-[28px] bg-white border border-[#E2E8F0] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#14161A]">GST & invoices</h3>
              <span className="text-[10px] font-semibold text-[#065F46] bg-[#D1FAE5] px-2 py-0.2 rounded-full">GSTIN verified</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-[#5A6170]">GSTIN</label>
                <input
                  type="text"
                  aria-label="GSTIN"
                  defaultValue="29ABCDE1234F1Z5"
                  className="w-full mt-0.5 px-3 py-1.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-[#14161A]"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#5A6170]">Invoice prefix</label>
                <input
                  type="text"
                  aria-label="Invoice prefix"
                  defaultValue="MH/25-26/"
                  className="w-full mt-0.5 px-3 py-1.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-[#14161A]"
                />
              </div>
            </div>
            <div className="space-y-1 text-xs">
              <label className="flex items-center gap-2 min-h-[32px] cursor-pointer text-[#14161A]">
                <input
                  type="radio"
                  name="gst"
                  aria-label="Don't issue tax invoices (safest)"
                  defaultChecked
                  className="h-6 w-6 accent-[#14161A]"
                />
                <span>Don't issue tax invoices (safest)</span>
              </label>
              <label className="flex items-center gap-2 min-h-[32px] cursor-pointer text-[#14161A]">
                <input
                  type="radio"
                  name="gst"
                  aria-label="Issue a bill of supply"
                  className="h-6 w-6 accent-[#14161A]"
                />
                <span>Issue a bill of supply</span>
              </label>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="p-6 rounded-[28px] bg-white border border-[#DC2626]/30 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-sm text-[#B91C1C]">Danger zone</h4>
            <p className="text-xs text-[#5A6170] mt-0.5">Download everything, or delete Masala House. Deletion waits 30 days.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="rounded-full border-[#E2E8F0]">Export all data</Button>
            <Button variant="destructive" size="sm" className="rounded-full bg-[#DC2626] text-white">Delete restaurant...</Button>
          </div>
        </div>
      </div>
    </div>
  ),
};

// ─── S3. Orders Board (Desktop, Light Mood) ───
export const S3_OrdersDesktop: StoryObj = {
  name: 'S3: Orders Board (Desktop, Light)',
  render: () => (
    <div className="min-h-screen bg-[#EEF1F5] p-8 flex justify-center" data-theme="light">
      <div className="w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-[#5A6170]">Indiranagar · tonight</div>
            <h1 className="text-3xl font-bold tracking-tight text-[#14161A]">Orders</h1>
          </div>
          <PillNav
            items={[
              { id: 'live', label: 'Live', active: true },
              { id: 'completed', label: 'Completed' },
              { id: 'cancelled', label: 'Cancelled' },
            ]}
          />
        </div>

        {/* Status Strip */}
        <div className="grid grid-cols-5 gap-3">
          <div className="p-4 rounded-[24px] bg-white border border-[#E2E8F0] text-center">
            <div className="text-2xl font-bold text-[#14161A]">12</div>
            <div className="text-[10px] text-[#5A6170]">in progress</div>
          </div>
          <div className="p-4 rounded-[24px] bg-white border border-[#E2E8F0] text-center">
            <div className="text-2xl font-bold text-[#14161A]">3</div>
            <div className="text-[10px] text-[#5A6170]">New</div>
          </div>
          <div className="p-4 rounded-[24px] bg-[#14161A] text-white text-center shadow-md">
            <div className="text-2xl font-bold text-white">5</div>
            <div className="text-[10px] text-white/70">Cooking</div>
          </div>
          <div className="p-4 rounded-[24px] bg-white border border-[#E2E8F0] text-center">
            <div className="text-2xl font-bold text-[#14161A]">2</div>
            <div className="text-[10px] text-[#5A6170]">Ready</div>
          </div>
          <div className="p-4 rounded-[24px] bg-[#FEF2F2] border border-[#FECACA] text-center">
            <div className="text-2xl font-bold text-[#991B1B]">1</div>
            <div className="text-[10px] text-[#991B1B] font-semibold">Running late</div>
          </div>
        </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-[28px] bg-[#14161A] text-white shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-base">Table 7</span>
              <span className="text-[10px] font-semibold text-[#14161A] bg-white px-2 py-0.5 rounded-full">Cooking</span>
            </div>
            <p className="text-xs text-[#9AA3AF]">Arjun · 7 items · dine-in</p>
            <div className="flex items-center justify-between pt-2">
              <span className="font-bold text-base text-white">₹1,670</span>
              <span className="text-xs text-[#9AA3AF]">12 min</span>
            </div>
          </div>

          <div className="p-5 rounded-[28px] bg-white border border-[#E2E8F0] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-base text-[#14161A]">Table 11</span>
              <span className="text-[10px] font-semibold text-[#5A6170] bg-[#F1F5F9] px-2 py-0.5 rounded-full">New</span>
            </div>
            <p className="text-xs text-[#5A6170]">QR self-order · 2 items</p>
            <div className="flex items-center justify-between pt-2">
              <span className="font-bold text-base text-[#14161A]">₹640</span>
              <span className="text-xs text-[#5A6170]">1 min</span>
            </div>
          </div>

          <div className="p-5 rounded-[28px] bg-white border-2 border-rose-500 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-base text-[#14161A]">Takeaway 18</span>
              <span className="text-[10px] font-semibold text-[#991B1B] bg-[#FEE2E2] px-2 py-0.5 rounded-full">Late</span>
            </div>
            <p className="text-xs text-[#5A6170]">Counter · 2 items</p>
            <div className="flex items-center justify-between pt-2">
              <span className="font-bold text-base text-[#14161A]">₹798</span>
              <span className="text-xs text-[#991B1B] font-bold">24 min</span>
            </div>
          </div>

          <div className="p-5 rounded-[28px] bg-white border border-[#E2E8F0] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-base text-[#14161A]">Table 3</span>
              <span className="text-[10px] font-semibold text-white bg-[#14161A] px-2 py-0.5 rounded-full">Bill asked</span>
            </div>
            <p className="text-xs text-[#5A6170]">Deepa · 9 items</p>
            <div className="flex items-center justify-between pt-2">
              <span className="font-bold text-base text-[#14161A]">₹2,140</span>
              <span className="text-xs text-[#5A6170]">58 min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

// ─── S4. Invoices & GST Registry (Desktop, Light Mood) ───
export const S4_InvoicesAndGST: StoryObj = {
  name: 'S4: Invoices and GST Registry (Desktop, Light)',
  render: () => (
    <div className="min-h-screen bg-[#EEF1F5] p-8 flex justify-center" data-theme="light">
      <div className="w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-[#5A6170]">GSTIN 29ABCDE1234F1Z5 · Indiranagar</div>
            <h1 className="text-3xl font-bold tracking-tight text-[#14161A]">Invoices & GST</h1>
          </div>
          <PillNav
            items={[
              { id: 'sep', label: 'Sep' },
              { id: 'oct', label: 'Oct' },
              { id: 'nov', label: 'Nov', active: true },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 p-6 rounded-[32px] bg-[#14161A] text-white shadow-xl flex flex-col justify-between">
            <div className="space-y-1">
              <div className="text-xs text-[#9AA3AF]">GST collected in November</div>
              <div className="text-4xl font-bold tracking-tight text-white">₹61,240</div>
              <div className="text-xs text-[#9AA3AF] mt-1">on ₹12.25L taxable sales · 2,914 invoices</div>
            </div>
          </div>

          <div className="p-6 rounded-[32px] bg-white border border-[#E2E8F0] shadow-sm space-y-2 flex flex-col justify-between">
            <div>
              <div className="text-xs text-[#5A6170]">Needs your attention</div>
              <div className="text-3xl font-bold text-[#14161A]">2</div>
              <p className="text-xs text-[#5A6170] mt-1">Invoices with a cancelled item, waiting for a credit note</p>
            </div>
            <a href="#" className="text-xs text-[#2F5BD8] font-semibold hover:underline">Review</a>
          </div>
        </div>

        <div className="p-6 rounded-[32px] bg-white border border-[#E2E8F0] shadow-md space-y-4">
          <h3 className="font-bold text-sm text-[#14161A]">Recent invoices</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#14161A]">
              <tbody className="divide-y divide-[#F1F5F9]">
                <tr>
                  <td className="py-3 font-mono font-medium text-[#14161A]">MH/25-26/04812</td>
                  <td className="py-3 text-[#5A6170]">Table 3 · 21:14 · UPI</td>
                  <td className="py-3"><span className="text-[10px] text-[#065F46] bg-[#D1FAE5] px-2 py-0.5 rounded-full font-medium">Paid</span></td>
                  <td className="py-3 font-bold text-right text-[#14161A]">₹2,247 <span className="text-[10px] text-[#5A6170] font-normal block">GST ₹107</span></td>
                </tr>
                <tr>
                  <td className="py-3 font-mono font-medium text-[#14161A]">MH/25-26/04811</td>
                  <td className="py-3 text-[#5A6170]">Takeaway 18 · 21:02 · Cash</td>
                  <td className="py-3"><span className="text-[10px] text-[#065F46] bg-[#D1FAE5] px-2 py-0.5 rounded-full font-medium">Paid</span></td>
                  <td className="py-3 font-bold text-right text-[#14161A]">₹838 <span className="text-[10px] text-[#5A6170] font-normal block">GST ₹40</span></td>
                </tr>
                <tr className="bg-[#FFFBEB]">
                  <td className="py-3 font-mono font-bold text-[#92400E]">MH/25-26/04810</td>
                  <td className="py-3 text-[#92400E]">Table 11 · 20:51 · Card</td>
                  <td className="py-3"><span className="text-[10px] text-white bg-[#14161A] px-2 py-0.5 rounded-full font-medium">Credit note due</span></td>
                  <td className="py-3 font-bold text-right text-[#92400E]">₹672 <span className="text-[10px] font-normal block">GST ₹32</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  ),
};

// ─── S5. Reports Analytics (Desktop, Light Mood) ───
export const S5_ReportsDesktop: StoryObj = {
  name: 'S5: Reports Analytics (Desktop, Light)',
  render: () => (
    <div className="min-h-screen bg-[#EEF1F5] p-8 flex justify-center" data-theme="light">
      <div className="w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-[#5A6170]">Masala House · both branches</div>
            <h1 className="text-3xl font-bold tracking-tight text-[#14161A]">Reports</h1>
          </div>
          <PillNav
            items={[
              { id: 'day', label: 'Day' },
              { id: 'week', label: 'Week', active: true },
              { id: 'month', label: 'Month' },
            ]}
          />
        </div>

        {/* Top Hero Chart Card */}
        <div className="p-6 rounded-[32px] bg-white border border-[#E2E8F0] shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-[#14161A]">Sales</h3>
              <p className="text-xs text-[#5A6170]">This week, including GST</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-bold text-[#14161A]">₹3.4L</span>
                <span className="text-xs font-semibold text-[#065F46]">+20% vs last week</span>
              </div>
            </div>
            <div className="text-xs font-semibold text-white bg-[#14161A] px-3 py-1 rounded-full">
              ₹67,400 peak
            </div>
          </div>

          <LollipopChart
            title=""
            description=""
            data={[
              { label: 'M', value: 38000 },
              { label: 'T', value: 42000 },
              { label: 'W', value: 49000 },
              { label: 'T', value: 54000 },
              { label: 'F', value: 67400, isSelected: true },
              { label: 'S', value: 61000 },
              { label: 'S', value: 58000 },
            ]}
            valueFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
          />
        </div>

        {/* 3 Detail Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-[28px] bg-[#14161A] text-white shadow-xl space-y-4">
            <h4 className="font-bold text-sm text-white">Top dishes</h4>
            <div className="space-y-2">
              <div className="p-3 rounded-full bg-white text-[#14161A] flex justify-between font-bold text-xs">
                <span>1 Butter chicken</span>
                <span>214</span>
              </div>
              <div className="p-3 rounded-full bg-white/10 text-white flex justify-between text-xs">
                <span>2 Garlic naan</span>
                <span>402</span>
              </div>
              <div className="p-3 rounded-full bg-white/10 text-white flex justify-between text-xs">
                <span>3 Dal makhani</span>
                <span>171</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-[28px] bg-white border border-[#E2E8F0] shadow-sm space-y-4">
            <h4 className="font-bold text-sm text-[#14161A]">Busiest hours</h4>
            <HourlyBarChart
              title=""
              description=""
              data={[
                { hour: 12, count: 14 },
                { hour: 14, count: 28 },
                { hour: 16, count: 8 },
                { hour: 18, count: 48, isPeak: true },
                { hour: 20, count: 52, isPeak: true },
                { hour: 22, count: 22 },
              ]}
            />
            <p className="text-[11px] text-[#5A6170]">Peak 8–10 pm. Consider an extra server on Fridays.</p>
          </div>

          <div className="p-6 rounded-[28px] bg-white border border-[#E2E8F0] shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-[#14161A]">Branches</h4>
              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between font-semibold text-[#14161A]"><span>Indiranagar</span><span>₹2.3L</span></div>
                  <div className="h-1.5 rounded-full bg-[#E2E8F0] mt-1 overflow-hidden"><div className="h-full bg-[#14161A] rounded-full w-[68%]" /></div>
                </div>
                <div>
                  <div className="flex justify-between font-semibold text-[#14161A]"><span>Koramangala</span><span>₹1.1L</span></div>
                  <div className="h-1.5 rounded-full bg-[#E2E8F0] mt-1 overflow-hidden"><div className="h-full bg-[#2F5BD8] rounded-full w-[32%]" /></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F1F5F9]">
              <div className="p-3 rounded-[18px] bg-[#F8FAFC] text-center">
                <div className="font-bold text-base text-[#14161A]">₹642</div>
                <div className="text-[10px] text-[#5A6170]">avg. bill</div>
              </div>
              <div className="p-3 rounded-[18px] bg-[#F8FAFC] text-center">
                <div className="font-bold text-base text-[#14161A]">48'</div>
                <div className="text-[10px] text-[#5A6170]">avg. stay</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

