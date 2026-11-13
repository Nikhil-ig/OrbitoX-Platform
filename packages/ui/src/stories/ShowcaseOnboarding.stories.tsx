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
  ProgressBar,
  PillNav,
  QuantityStepper,
} from '../components';
import {
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  QrCode,
  Sparkles,
  Zap,
  Lock,
  Utensils,
  Building,
  Store,
  Layers,
  ChefHat,
  Printer,
  Smartphone,
  Eye,
  Settings,
  CreditCard,
  LayoutDashboard,
  FileText,
  Users,
} from 'lucide-react';

const meta: Meta = {
  title: 'Showcase/Onboarding Funnel',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

// ─── F1. Sign Up (Desktop, Light Mood) ───
export const F1_SignUp: StoryObj = {
  name: 'F1: Sign Up (Desktop, Light)',
  render: () => (
    <div className="min-h-screen bg-[#EEF1F5] flex items-center justify-center p-8" data-theme="light">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Left Dark Hero Card */}
        <div className="p-8 rounded-[32px] bg-[#0D0F12] text-white shadow-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-[#3D6EF5] flex items-center justify-center text-white">
                <Zap className="h-4 w-4" />
              </div>
              <span className="font-bold text-lg text-white">orbitoX</span>
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white leading-tight">
                Your restaurant, online in two minutes.
              </h1>
              <p className="text-xs text-[#9AA3AF] mt-3 leading-relaxed">
                QR menus, table ordering, kitchen screens and GST invoices. See your own site working before you pay anything.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-8 border-t border-white/10 text-xs">
            <div className="flex items-center gap-2.5 text-white">
              <span className="h-4 w-4 rounded-full bg-[#34D399]/20 text-[#34D399] flex items-center justify-center text-[10px]">✓</span>
              <span>Free preview of your live site, no card needed</span>
            </div>
            <div className="flex items-center gap-2.5 text-white">
              <span className="h-4 w-4 rounded-full bg-[#34D399]/20 text-[#34D399] flex items-center justify-center text-[10px]">✓</span>
              <span>Pay with UPI, card or net banking when you go live</span>
            </div>
            <div className="flex items-center gap-2.5 text-white">
              <span className="h-4 w-4 rounded-full bg-[#34D399]/20 text-[#34D399] flex items-center justify-center text-[10px]">✓</span>
              <span>Your data stays in India</span>
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="p-8 rounded-[32px] bg-white border border-[#E2E8F0] shadow-xl space-y-5">
          <div>
            <div className="text-[11px] font-semibold text-[#5A6170]">Step 1 of 3 · Your account</div>
            <h2 className="text-2xl font-bold text-[#14161A] mt-1">Create your account</h2>
          </div>

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="text-xs font-semibold text-[#14161A]">Your name</label>
              <input
                type="text"
                aria-label="Your name"
                defaultValue="Priya Shah"
                className="w-full mt-1.5 px-4 py-2.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#14161A] focus:outline-none focus:border-[#14161A]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#14161A]">Work email</label>
              <input
                type="email"
                aria-label="Work email"
                defaultValue="priya@shahgroup.in"
                className="w-full mt-1.5 px-4 py-2.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#14161A] focus:outline-none focus:border-[#14161A]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#14161A]">Mobile number</label>
              <input
                type="tel"
                aria-label="Mobile number"
                defaultValue="+91 98450 12345"
                className="w-full mt-1.5 px-4 py-2.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#14161A] focus:outline-none focus:border-[#14161A]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#14161A]">Password</label>
              <input
                type="password"
                aria-label="Password"
                defaultValue="supersecurepassword123"
                className="w-full mt-1.5 px-4 py-2.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#14161A] focus:outline-none focus:border-[#14161A]"
              />
              <div className="text-[11px] text-[#065F46] font-medium mt-1">Strong password</div>
            </div>

            <Button variant="primary" className="w-full rounded-full bg-[#14161A] text-white hover:bg-[#14161A]/90 py-3">
              Continue
            </Button>
          </form>

          <p className="text-[11px] text-[#5A6170] leading-relaxed">
            We'll send a 6-digit code to your email to confirm it's you. By continuing you agree to the Terms and Privacy policy.
          </p>

          <div className="text-xs text-center text-[#5A6170] pt-2 border-t border-[#F1F5F9]">
            Already have an account? <a href="#" className="font-semibold text-[#2F5BD8] hover:underline">Sign in</a>
          </div>
        </div>
      </div>
    </div>
  ),
};

// ─── F2. Create Organization (Desktop, Light Mood) ───
export const F2_CreateOrganization: StoryObj = {
  name: 'F2: Create Organization (Desktop, Light)',
  render: () => (
    <div className="min-h-screen bg-[#EEF1F5] p-8 flex flex-col items-center" data-theme="light">
      <div className="w-full max-w-5xl space-y-6">
        {/* Top Stepper Nav */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-[#14161A] text-white flex items-center justify-center font-bold text-xs">O</div>
            <span className="font-bold text-base text-[#14161A]">orbitoX</span>
          </div>

          <div className="flex items-center p-1 rounded-full bg-white border border-[#E2E8F0] text-xs shadow-sm">
            <span className="px-3 py-1 text-[#065F46] font-semibold flex items-center gap-1">
              ✓ Account
            </span>
            <span className="px-3 py-1 rounded-full bg-[#14161A] text-white font-semibold">
              2 · Organization
            </span>
            <span className="px-3 py-1 text-[#5A6170]">
              3 · Restaurant
            </span>
          </div>

          <a href="#" className="text-xs text-[#2F5BD8] font-medium hover:underline">Save and finish later</a>
        </div>

        {/* Form and Hierarchy Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form (2 cols) */}
          <div className="lg:col-span-2 p-8 rounded-[32px] bg-white border border-[#E2E8F0] shadow-xl space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[#14161A]">Tell us about your business</h2>
              <p className="text-xs text-[#5A6170] mt-1">This is your company. You'll add restaurants to it next.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#14161A]">Business name</label>
                <input
                  type="text"
                  aria-label="Business name"
                  defaultValue="Shah Hospitality Group"
                  className="w-full mt-1.5 px-4 py-2.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#14161A]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#14161A]">What do you run?</label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <div className="p-3.5 rounded-[20px] border-2 border-[#14161A] bg-[#F8FAFC] flex flex-col justify-between h-28 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span className="text-lg">🍴</span>
                      <span className="h-3.5 w-3.5 rounded-full border-4 border-[#14161A] bg-white" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-[#14161A]">Restaurants & cafés</div>
                      <div className="text-[10px] text-[#5A6170]">RestaurantOS</div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-[20px] border border-[#E2E8F0] bg-white flex flex-col justify-between h-28 cursor-pointer hover:border-[#CBD5E1]">
                    <div className="flex items-center justify-between">
                      <span className="text-lg">🏥</span>
                      <span className="h-3.5 w-3.5 rounded-full border border-[#CBD5E1]" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-[#14161A]">Clinics & hospitals</div>
                      <div className="text-[10px] text-[#5A6170]">HospitalOS</div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-[20px] border border-[#E2E8F0] bg-white flex flex-col justify-between h-28 cursor-pointer hover:border-[#CBD5E1]">
                    <div className="flex items-center justify-between">
                      <span className="text-lg">🏢</span>
                      <span className="h-3.5 w-3.5 rounded-full border border-[#CBD5E1]" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-[#14161A]">Both</div>
                      <div className="text-[10px] text-[#5A6170]">Add each later</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#14161A]">City</label>
                  <input
                    type="text"
                    aria-label="City"
                    defaultValue="Bengaluru"
                    className="w-full mt-1.5 px-4 py-2.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#14161A]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#14161A]">GSTIN (optional now)</label>
                  <input
                    type="text"
                    aria-label="GSTIN"
                    defaultValue="29ABCDE1234F1Z5"
                    className="w-full mt-1.5 px-4 py-2.5 rounded-full border border-emerald-600 bg-[#F8FAFC] text-xs text-[#14161A]"
                  />
                  <div className="text-[10px] text-[#065F46] font-medium mt-1">Valid · Karnataka</div>
                </div>
              </div>

              <div className="p-3.5 rounded-[20px] bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] flex items-center gap-2">
                <span className="h-4 w-4 rounded-full bg-[#F59E0B] text-white flex items-center justify-center font-bold text-[10px]">!</span>
                <span>Without a GSTIN you can still take orders, but we won't issue GST tax invoices until you add one.</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#F1F5F9]">
              <Button variant="secondary" className="rounded-full border-[#E2E8F0]">
                Back
              </Button>
              <Button variant="primary" className="rounded-full bg-[#14161A] text-white hover:bg-[#14161A]/90 px-8">
                Continue
              </Button>
            </div>
          </div>

          {/* Right Architecture Explainer Card (1 col) */}
          <div className="p-6 rounded-[32px] bg-white border border-[#E2E8F0] shadow-md space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-[#14161A]">How it fits together</h3>

              <div className="space-y-2">
                <div className="p-3 rounded-full bg-[#14161A] text-white font-semibold text-xs text-center shadow-md">
                  Shah Hospitality Group
                </div>

                <div className="pl-4 space-y-1.5 border-l-2 border-[#E2E8F0]">
                  <div className="p-2.5 rounded-full bg-[#FFEDD5] text-[#9A3412] font-semibold text-xs text-center">
                    Masala House · restaurant
                  </div>

                  <div className="pl-4 space-y-1 border-l-2 border-[#E2E8F0]">
                    <div className="p-2 rounded-full bg-[#F1F5F9] text-[#475569] text-[11px] text-center">
                      Indiranagar branch
                    </div>
                    <div className="p-2 rounded-full bg-[#F1F5F9] text-[#475569] text-[11px] text-center">
                      Koramangala branch
                    </div>
                  </div>

                  <div className="p-2.5 rounded-full bg-[#FFEDD5] text-[#9A3412] font-semibold text-xs text-center">
                    Chai & Co. · café
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#5A6170] leading-relaxed">
              One bill for the whole group. Each restaurant has its own menu, look and staff; each branch has its own floors and tables.
            </p>
          </div>
        </div>
      </div>
    </div>
  ),
};

// ─── F3. Add Restaurant (Desktop, Light Mood) ───
export const F3_AddRestaurant: StoryObj = {
  name: 'F3: Add Restaurant (Desktop, Light)',
  render: () => (
    <div className="min-h-screen bg-[#EEF1F5] p-8 flex flex-col items-center" data-theme="light">
      <div className="w-full max-w-5xl space-y-6">
        {/* Top Stepper Nav */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-[#14161A] text-white flex items-center justify-center font-bold text-xs">O</div>
            <span className="font-bold text-base text-[#14161A]">orbitoX</span>
          </div>

          <div className="flex items-center p-1 rounded-full bg-white border border-[#E2E8F0] text-xs shadow-sm">
            <span className="px-3 py-1 text-[#065F46] font-semibold">✓ Account</span>
            <span className="px-3 py-1 text-[#065F46] font-semibold">✓ Organization</span>
            <span className="px-3 py-1 rounded-full bg-[#14161A] text-white font-semibold">3 · Restaurant</span>
          </div>

          <span className="text-xs text-[#5A6170]">Shah Hospitality Group</span>
        </div>

        {/* Form and Template Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form (2 cols) */}
          <div className="lg:col-span-2 p-8 rounded-[32px] bg-white border border-[#E2E8F0] shadow-xl space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[#14161A]">Add your first restaurant</h2>
              <p className="text-xs text-[#5A6170] mt-1">You can change all of this later.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#14161A]">Restaurant name</label>
                <input
                  type="text"
                  aria-label="Restaurant name"
                  defaultValue="Masala House"
                  className="w-full mt-1.5 px-4 py-2.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#14161A]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#14161A]">Web address</label>
                <div className="flex items-center mt-1.5 rounded-full border border-emerald-600 bg-[#F8FAFC] px-4 py-2 text-xs">
                  <input
                    type="text"
                    aria-label="Web address slug"
                    defaultValue="masala"
                    className="bg-transparent text-[#14161A] font-semibold focus:outline-none flex-1"
                  />
                  <span className="text-[#5A6170]">.orbitox.io</span>
                </div>
                <div className="text-[10px] text-[#065F46] font-medium mt-1">Available. You can connect your own domain later.</div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#14161A]">Type</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  <button type="button" className="px-3.5 py-1.5 rounded-full bg-[#14161A] text-white text-xs font-medium">Casual dining</button>
                  <button type="button" className="px-3.5 py-1.5 rounded-full bg-white border border-[#E2E8F0] text-[#5A6170] text-xs font-medium">Fine dining</button>
                  <button type="button" className="px-3.5 py-1.5 rounded-full bg-white border border-[#E2E8F0] text-[#5A6170] text-xs font-medium">Café</button>
                  <button type="button" className="px-3.5 py-1.5 rounded-full bg-white border border-[#E2E8F0] text-[#5A6170] text-xs font-medium">Quick service</button>
                  <button type="button" className="px-3.5 py-1.5 rounded-full bg-white border border-[#E2E8F0] text-[#5A6170] text-xs font-medium">Cloud kitchen</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#14161A]">First branch area</label>
                  <input
                    type="text"
                    aria-label="First branch area"
                    defaultValue="Indiranagar"
                    className="w-full mt-1.5 px-4 py-2.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#14161A]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#14161A]">About how many tables?</label>
                  <input
                    type="number"
                    aria-label="About how many tables"
                    defaultValue="24"
                    className="w-full mt-1.5 px-4 py-2.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#14161A]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#14161A]">Start your menu with</label>
                <div className="space-y-2 mt-2">
                  <div className="p-3 rounded-[20px] border-2 border-[#14161A] bg-[#F8FAFC] flex items-center gap-3 cursor-pointer">
                    <span className="h-3.5 w-3.5 rounded-full border-4 border-[#14161A] bg-white shrink-0" />
                    <div>
                      <div className="font-semibold text-xs text-[#14161A]">A sample North Indian menu</div>
                      <div className="text-[10px] text-[#5A6170]">Recommended: see your site working right away, then edit</div>
                    </div>
                  </div>
                  <div className="p-3 rounded-[20px] border border-[#E2E8F0] bg-white flex items-center gap-3 cursor-pointer hover:border-[#CBD5E1]">
                    <span className="h-3.5 w-3.5 rounded-full border border-[#CBD5E1] shrink-0" />
                    <div>
                      <div className="font-semibold text-xs text-[#14161A]">Upload a spreadsheet or menu photo</div>
                      <div className="text-[10px] text-[#5A6170]">We turn it into items you review</div>
                    </div>
                  </div>
                  <div className="p-3 rounded-[20px] border border-[#E2E8F0] bg-white flex items-center gap-3 cursor-pointer hover:border-[#CBD5E1]">
                    <span className="h-3.5 w-3.5 rounded-full border border-[#CBD5E1] shrink-0" />
                    <div className="font-semibold text-xs text-[#14161A]">An empty menu</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Template Picker & What happens next (1 col) */}
          <div className="space-y-6 flex flex-col justify-between">
            <div className="p-6 rounded-[32px] bg-white border border-[#E2E8F0] shadow-md space-y-4">
              <h3 className="font-bold text-sm text-[#14161A]">Pick a look for your diners</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-[20px] border-2 border-[#14161A] bg-[#FFF7ED] text-center space-y-1">
                  <div className="h-16 rounded-[12px] bg-[#FB923C]" />
                  <div className="font-bold text-[11px] text-[#14161A]">Saffron</div>
                  <div className="text-[9px] font-semibold text-[#065F46]">Free</div>
                </div>
                <div className="p-2 rounded-[20px] border border-[#E2E8F0] bg-[#0D0F12] text-center space-y-1">
                  <div className="h-16 rounded-[12px] bg-[#F59E0B]" />
                  <div className="font-bold text-[11px] text-white">Noir</div>
                  <div className="text-[9px] font-semibold text-[#C4B5FD]">₹499/mo</div>
                </div>
                <div className="p-2 rounded-[20px] border border-[#E2E8F0] bg-[#F0FDF4] text-center space-y-1">
                  <div className="h-16 rounded-[12px] bg-[#34D399]" />
                  <div className="font-bold text-[11px] text-[#14161A]">Fresh</div>
                  <div className="text-[9px] font-semibold text-[#065F46]">Free</div>
                </div>
              </div>
              <a href="#" className="text-xs text-[#2F5BD8] font-medium hover:underline block text-center">See all 9 templates</a>
            </div>

            <div className="p-6 rounded-[32px] bg-[#14161A] text-white shadow-xl space-y-4">
              <h4 className="font-bold text-sm text-white">What happens next</h4>
              <p className="text-xs text-[#9AA3AF] leading-relaxed">
                We set up your restaurant, menu, tables and QR codes. It takes about 2 minutes, then you'll see your real site in preview. No payment yet.
              </p>
              <Button variant="secondary" className="w-full rounded-full bg-white text-[#14161A] hover:bg-white/90">
                Create my restaurant
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

// ─── F4. First Login Live in Preview (Desktop, Light Mood) ───
export const F4_FirstLoginPreview: StoryObj = {
  name: 'F4: First Login Live in Preview (Desktop, Light)',
  render: () => (
    <div className="min-h-screen bg-[#EEF1F5] flex flex-col" data-theme="light">
      {/* Top Warning Banner */}
      <div className="bg-[#14161A] text-white px-6 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[#14161A] bg-[#FBBF24] px-2 py-0.5 rounded-full">
            PREVIEW
          </span>
          <span>This is your real site with a sample menu. Diners can open it, but can't place orders until you go live.</span>
        </div>
        <Button variant="secondary" size="sm" className="rounded-full bg-white text-[#14161A] hover:bg-white/90">
          Go live
        </Button>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto w-full p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-[#5A6170]">Welcome, Priya</div>
            <h1 className="text-3xl font-bold tracking-tight text-[#14161A]">Masala House is ready to try</h1>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E2E8F0] text-xs">
            <span className="h-2 w-2 rounded-full bg-[#10B981]" />
            <span className="font-medium text-[#14161A]">masala.orbitox.io</span>
            <a href="#" className="text-[#2F5BD8] hover:underline font-semibold ml-1">Open</a>
          </div>
        </div>

        {/* 3 Panels Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Phone Preview Panel */}
          <div className="flex justify-center">
            <div className="w-[300px] h-[580px] bg-[#FFF7ED] rounded-[36px] border-8 border-[#14161A] shadow-2xl p-4 flex flex-col justify-between overflow-hidden relative">
              <div className="space-y-3">
                <span className="text-[9px] font-semibold text-[#9A3412] bg-[#FED7AA] px-2 py-0.5 rounded-full inline-block">Sample menu</span>
                <div className="text-[10px] text-[#5A6170]">Masala House · Indiranagar · Table 4</div>
                <h4 className="font-bold text-sm text-[#14161A]">What are you craving?</h4>

                <div className="flex gap-1">
                  <span className="px-2 py-0.5 rounded-full bg-[#14161A] text-white text-[10px] font-semibold">Mains</span>
                  <span className="px-2 py-0.5 rounded-full bg-white text-[#5A6170] text-[10px]">Breads</span>
                  <span className="px-2 py-0.5 rounded-full bg-white text-[#5A6170] text-[10px]">Drinks</span>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="p-2 rounded-[16px] bg-white border border-[#E2E8F0] flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-xs text-[#14161A]">Butter chicken</div>
                      <div className="text-[10px] text-[#5A6170]">₹420</div>
                    </div>
                    <span className="h-6 w-6 rounded-full bg-[#FB923C] text-white flex items-center justify-center font-bold text-xs">+</span>
                  </div>

                  <div className="p-2 rounded-[16px] bg-white border border-[#E2E8F0] flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-xs text-[#14161A]">Dal makhani</div>
                      <div className="text-[10px] text-[#5A6170]">₹310</div>
                    </div>
                    <span className="h-6 w-6 rounded-full bg-[#FB923C] text-white flex items-center justify-center font-bold text-xs">+</span>
                  </div>
                </div>
              </div>

              <div className="p-2 rounded-full bg-[#14161A] text-white text-[11px] font-semibold text-center">
                Test order · 2 items · ₹730
              </div>
            </div>
          </div>

          {/* Try It Like a Diner Steps */}
          <div className="p-6 rounded-[32px] bg-white border border-[#E2E8F0] shadow-md space-y-5 flex flex-col justify-between">
            <h3 className="font-bold text-base text-[#14161A]">Try it like a diner</h3>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="h-6 w-6 rounded-full bg-[#34D399] text-[#14161A] font-bold text-xs flex items-center justify-center shrink-0">1</span>
                <div>
                  <p className="text-xs font-medium text-[#14161A]">Scan this code with your phone, or open the link.</p>
                  <div className="h-28 w-28 mt-2 rounded-[18px] bg-black/5 flex items-center justify-center border border-[#E2E8F0]">
                    <QrCode className="h-16 w-16 text-[#14161A]" />
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="h-6 w-6 rounded-full bg-[#34D399] text-[#14161A] font-bold text-xs flex items-center justify-center shrink-0">2</span>
                <p className="text-xs font-medium text-[#14161A]">Place a <span className="font-bold">test order</span>. Test orders are free and are deleted when you go live.</p>
              </div>

              <div className="flex items-start gap-3">
                <span className="h-6 w-6 rounded-full bg-[#34D399] text-[#14161A] font-bold text-xs flex items-center justify-center shrink-0">3</span>
                <p className="text-xs font-medium text-[#14161A]">Watch it arrive on the kitchen screen →</p>
              </div>
            </div>
            <div />
          </div>

          {/* Right KDS & Ready Checklist */}
          <div className="space-y-6">
            {/* Live KDS Ticket */}
            <div className="p-5 rounded-[28px] bg-[#14161A] text-white shadow-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Kitchen screen</span>
                <span className="text-[#34D399] flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" /> live</span>
              </div>
              <div className="p-3 rounded-[20px] bg-[#1E232B] border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">Table 4</span>
                    <span className="text-[10px] font-bold text-[#14161A] bg-[#FBBF24] px-1.5 py-0.2 rounded-full">TEST</span>
                  </div>
                  <span className="text-[#9AA3AF] text-[11px]">0:42</span>
                </div>
                <div className="text-xs text-white/90 space-y-0.5">
                  <p>1 × Butter chicken</p>
                  <p>1 × Dal makhani · less spicy</p>
                </div>
                <button type="button" className="w-full py-1.5 rounded-full bg-[#FB923C] text-[#14161A] text-xs font-bold cursor-pointer">
                  Mark ready
                </button>
              </div>
            </div>

            {/* Already set up for you */}
            <div className="p-5 rounded-[28px] bg-white border border-[#E2E8F0] shadow-md space-y-3">
              <h4 className="font-bold text-sm text-[#14161A]">Already set up for you</h4>
              <div className="space-y-2 text-xs text-[#14161A]">
                <p className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-[#065F46]" /> 24 tables with QR codes on 1 floor</p>
                <p className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-[#065F46]" /> 18 sample dishes in 4 categories</p>
                <p className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-[#065F46]" /> Kitchen and billing screens</p>
                <p className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-[#065F46]" /> Template Saffron</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

// ─── F5. Choose Plan and Go Live (Desktop, Light Mood) ───
export const F5_ChoosePlanAndGoLive: StoryObj = {
  name: 'F5: Choose Plan and Go Live (Desktop, Light)',
  render: () => (
    <div className="min-h-screen bg-[#EEF1F5] p-8 flex justify-center" data-theme="light">
      <div className="w-full max-w-5xl space-y-6">
        {/* Back Link & Header */}
        <div>
          <a href="#" className="text-xs text-[#2F5BD8] font-medium hover:underline">← Back to preview</a>
          <h1 className="text-3xl font-bold tracking-tight text-[#14161A] mt-1">Go live with Masala House</h1>
          <p className="text-xs text-[#5A6170] mt-1">Diners can order the moment payment goes through. Cancel anytime.</p>
        </div>

        {/* 3 Plan Horizontal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-[24px] bg-white border border-[#E2E8F0] flex items-center justify-between cursor-pointer">
            <div>
              <div className="font-semibold text-xs text-[#14161A]">Starter</div>
              <div className="text-xl font-bold text-[#14161A]">₹2,499</div>
              <div className="text-[10px] text-[#5A6170]">1 branch · 30 tables · 10 staff</div>
            </div>
            <span className="h-4 w-4 rounded-full border border-[#CBD5E1]" />
          </div>

          <div className="p-5 rounded-[24px] bg-white border-2 border-[#14161A] shadow-md flex items-center justify-between cursor-pointer">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-[#14161A]">Growth</span>
                <span className="text-[9px] font-semibold text-white bg-[#14161A] px-2 py-0.2 rounded-full">Best for you</span>
              </div>
              <div className="text-xl font-bold text-[#14161A]">₹7,497</div>
              <div className="text-[10px] text-[#5A6170]">5 branches · 200 tables · 50 staff</div>
            </div>
            <span className="h-4 w-4 rounded-full border-4 border-[#14161A] bg-white" />
          </div>

          <div className="p-5 rounded-[24px] bg-white border border-[#E2E8F0] flex items-center justify-between cursor-pointer">
            <div>
              <div className="font-semibold text-xs text-[#14161A]">Scale</div>
              <div className="text-xl font-bold text-[#14161A]">₹14,999</div>
              <div className="text-[10px] text-[#5A6170]">Unlimited branches · AI actions</div>
            </div>
            <span className="h-4 w-4 rounded-full border border-[#CBD5E1]" />
          </div>
        </div>

        {/* Form and Summary Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Billing Form (2 cols) */}
          <div className="lg:col-span-2 p-6 rounded-[28px] bg-white border border-[#E2E8F0] shadow-md space-y-4">
            <h3 className="font-bold text-sm text-[#14161A]">Billing details for your GST invoice</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#14161A]">Legal name</label>
                <input
                  type="text"
                  aria-label="Legal name"
                  defaultValue="Shah Hospitality Pvt Ltd"
                  className="w-full mt-1 px-4 py-2 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#14161A]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#14161A]">GSTIN</label>
                <input
                  type="text"
                  aria-label="GSTIN"
                  defaultValue="29ABCDE1234F1Z5"
                  className="w-full mt-1 px-4 py-2 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#14161A]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#14161A]">Billing address</label>
              <input
                type="text"
                aria-label="Billing address"
                defaultValue="12, 100 Feet Rd, Indiranagar, Bengaluru 560038"
                className="w-full mt-1 px-4 py-2 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#14161A]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#14161A]">Pay with</label>
              <div className="flex gap-2 mt-2">
                <button type="button" className="px-4 py-1.5 rounded-full bg-[#14161A] text-white text-xs font-medium">UPI AutoPay</button>
                <button type="button" className="px-4 py-1.5 rounded-full bg-white border border-[#E2E8F0] text-[#5A6170] text-xs font-medium">Card</button>
                <button type="button" className="px-4 py-1.5 rounded-full bg-white border border-[#E2E8F0] text-[#5A6170] text-xs font-medium">Net banking</button>
              </div>
            </div>
          </div>

          {/* Right Summary Card (1 col) */}
          <div className="p-6 rounded-[28px] bg-[#14161A] text-white shadow-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-sm text-white">Summary</h4>
              <div className="flex justify-between">
                <span className="text-[#9AA3AF]">Growth, monthly</span>
                <span className="font-medium text-white">₹6,353.39</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9AA3AF]">CGST 9%</span>
                <span className="font-medium text-white">₹571.80</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9AA3AF]">SGST 9%</span>
                <span className="font-medium text-white">₹571.81</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9AA3AF]">Template Saffron</span>
                <span className="font-medium text-[#34D399]">Free</span>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-between items-baseline">
                <span className="text-xs text-[#9AA3AF]">Today</span>
                <span className="text-3xl font-bold text-white">₹7,497</span>
              </div>
              <p className="text-[11px] text-[#9AA3AF]">
                Then ₹7,497 on the 13th of each month. You'll get a GST invoice by email.
              </p>
            </div>

            <div>
              <Button variant="secondary" className="w-full rounded-full bg-white text-[#14161A] hover:bg-white/90">
                🔒 Pay ₹7,497 and go live
              </Button>
              <p className="text-[10px] text-[#9AA3AF] text-center mt-2">
                Payment opens in Razorpay's secure window. We never see your card or UPI PIN.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

// ─── F6. You're Live Setup Checklist (Desktop, Light Mood) ───
export const F6_LiveSetupChecklist: StoryObj = {
  name: "F6: You're Live Setup Checklist (Desktop, Light)",
  render: () => (
    <div className="min-h-screen bg-[#EEF1F5] flex" data-theme="light">
      {/* Sidebar Mockup */}
      <div className="w-[240px] bg-white border-r border-[#E2E8F0] p-4 flex flex-col justify-between hidden md:flex">
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-2 rounded-full bg-[#F8FAFC]">
            <span className="h-6 w-6 rounded-full bg-[#FB923C] text-white font-bold text-xs flex items-center justify-center">M</span>
            <span className="font-bold text-xs text-[#14161A]">Masala House</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="px-3 py-2 rounded-full bg-[#14161A] text-white font-medium">Today</div>
            <div className="px-3 py-2 text-[#5A6170] flex justify-between"><span>Orders</span><span className="text-[#2F5BD8]">12</span></div>
            <div className="px-3 py-2 text-[#5A6170]">Kitchen screen</div>
            <div className="px-3 py-2 text-[#5A6170]">Menu</div>
            <div className="px-3 py-2 text-[#5A6170]">Floors & tables</div>
            <div className="px-3 py-2 text-[#5A6170]">Staff</div>
          </div>
        </div>
      </div>

      {/* Main Checklist View */}
      <div className="flex-1 p-8 space-y-6 max-w-5xl">
        {/* Top Dark Hero Card */}
        <div className="p-6 rounded-[32px] bg-[#0D0F12] text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-[#34D399] bg-[#34D399]/20 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" /> Live
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">Masala House is taking orders</h1>
            <p className="text-xs text-[#9AA3AF]">
              Payment received · GST invoice ORB-2611-0042 sent to priya@shahgroup.in · test orders cleared
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" size="sm" className="rounded-full bg-white text-[#14161A] hover:bg-white/90">
              Print table QR codes
            </Button>
            <Button variant="secondary" size="sm" className="rounded-full border-white/20 text-white">
              Open kitchen screen
            </Button>
          </div>
        </div>

        {/* Setup Checklist Card */}
        <div className="p-6 rounded-[32px] bg-white border border-[#E2E8F0] shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-[#14161A]">Finish setting up</h3>
            <span className="text-xs font-semibold text-[#5A6170]">2 of 6 done</span>
          </div>
          <ProgressBar value={33} className="h-2" />

          <div className="space-y-2 pt-2">
            {/* Step 1 Done */}
            <div className="p-3.5 rounded-[20px] bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-full bg-[#059669] text-white flex items-center justify-center font-bold text-xs">✓</span>
                <div>
                  <div className="font-semibold text-xs text-[#14161A] line-through">Claim your owner account</div>
                  <div className="text-[10px] text-[#5A6170]">Done when you signed up</div>
                </div>
              </div>
              <span className="text-xs font-semibold text-[#065F46]">Done</span>
            </div>

            {/* Step 2 Done */}
            <div className="p-3.5 rounded-[20px] bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-full bg-[#059669] text-white flex items-center justify-center font-bold text-xs">✓</span>
                <div>
                  <div className="font-semibold text-xs text-[#14161A] line-through">Set your 4-digit staff PIN</div>
                  <div className="text-[10px] text-[#5A6170]">Used on the POS and kitchen screen</div>
                </div>
              </div>
              <span className="text-xs font-semibold text-[#065F46]">Done</span>
            </div>

            {/* Step 3 Active */}
            <div className="p-3.5 rounded-[20px] bg-white border-2 border-[#2F5BD8] flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-full bg-[#DBEAFE] text-[#2F5BD8] flex items-center justify-center font-bold text-xs">3</span>
                <div>
                  <div className="font-bold text-xs text-[#14161A]">Replace the sample menu</div>
                  <div className="text-[10px] text-[#5A6170]">18 sample dishes are still showing to diners</div>
                </div>
              </div>
              <Button variant="primary" size="sm" className="rounded-full bg-[#14161A] text-white hover:bg-[#14161A]/90">
                Edit menu
              </Button>
            </div>

            {/* Step 4 Pending */}
            <div className="p-3.5 rounded-[20px] bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-full bg-[#E2E8F0] text-[#5A6170] flex items-center justify-center font-bold text-xs">4</span>
                <div>
                  <div className="font-semibold text-xs text-[#14161A]">Check floors and tables</div>
                  <div className="text-[10px] text-[#5A6170]">24 tables on 1 floor · move them to match your room</div>
                </div>
              </div>
              <Button variant="secondary" size="sm" className="rounded-full border-[#E2E8F0]">
                Open floor plan
              </Button>
            </div>

            {/* Step 5 Pending */}
            <div className="p-3.5 rounded-[20px] bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-full bg-[#E2E8F0] text-[#5A6170] flex items-center justify-center font-bold text-xs">5</span>
                <div>
                  <div className="font-semibold text-xs text-[#14161A]">Add your logo and colours</div>
                  <div className="text-[10px] text-[#5A6170]">Template Saffron with default colours</div>
                </div>
              </div>
              <Button variant="secondary" size="sm" className="rounded-full border-[#E2E8F0]">
                Brand settings
              </Button>
            </div>

            {/* Step 6 Pending */}
            <div className="p-3.5 rounded-[20px] bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-full bg-[#E2E8F0] text-[#5A6170] flex items-center justify-center font-bold text-xs">6</span>
                <div>
                  <div className="font-semibold text-xs text-[#14161A]">Connect Razorpay for diner payments</div>
                  <div className="text-[10px] text-[#5A6170]">Diners can pay at the counter until then</div>
                </div>
              </div>
              <Button variant="secondary" size="sm" className="rounded-full border-[#E2E8F0]">
                Connect
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

// ─── D6. Phone First Login Live in Preview (Mobile Light 390x844) ───
export const D6_PhoneFirstLoginPreview: StoryObj = {
  name: 'D6: Phone First Login Preview (Mobile, Light)',
  render: () => (
    <div className="min-h-screen bg-[#EEF1F5] flex justify-center py-6 px-4" data-theme="light">
      <div className="w-full max-w-[390px] min-h-[740px] bg-[#EEF1F5] rounded-[44px] shadow-2xl border-8 border-[#14161A] flex flex-col overflow-hidden relative">
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pt-6 pb-24 space-y-5">
          <span className="text-[10px] font-bold text-[#14161A] bg-[#FBBF24] px-2.5 py-0.5 rounded-full inline-block">
            PREVIEW · diners can't order yet
          </span>

          <h2 className="text-3xl font-bold tracking-tight text-[#14161A] leading-tight">
            Masala House is ready to try
          </h2>

          {/* Dark Preview Card */}
          <div className="p-5 rounded-[28px] bg-[#14161A] text-white shadow-xl flex items-center justify-between gap-4">
            <div className="w-24 h-36 bg-[#FFF7ED] rounded-[18px] border-2 border-white/20 p-2 flex flex-col justify-between shrink-0">
              <div className="h-10 rounded-[10px] bg-[#FB923C]" />
              <div className="h-2 rounded-full bg-[#14161A]" />
            </div>
            <div className="space-y-2">
              <div className="text-[10px] text-[#9AA3AF]">masala.orbitox.io</div>
              <h4 className="font-bold text-sm text-white">Your real site, with a sample menu</h4>
              <p className="text-[10px] text-[#9AA3AF]">24 tables · 18 dishes · kitchen screen ready</p>
              <button type="button" className="px-3.5 py-1.5 rounded-full bg-white text-[#14161A] text-xs font-semibold cursor-pointer">
                Open site
              </button>
            </div>
          </div>

          {/* Try it in 30 seconds */}
          <div className="p-5 rounded-[28px] bg-white border border-[#E2E8F0] shadow-sm space-y-4">
            <h4 className="font-bold text-sm text-[#14161A]">Try it in 30 seconds</h4>
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-full bg-[#14161A] text-white font-bold text-xs flex items-center justify-center">1</span>
                <span className="text-[#14161A] font-medium">Place a free test order</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-full bg-[#F1F5F9] text-[#5A6170] font-bold text-xs flex items-center justify-center">2</span>
                <span className="text-[#5A6170]">See it pop up in the kitchen</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-full bg-[#F1F5F9] text-[#5A6170] font-bold text-xs flex items-center justify-center">3</span>
                <span className="text-[#5A6170]">Go live when you're happy</span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Bottom Bar */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="p-3 rounded-full bg-[#14161A] text-white shadow-2xl flex items-center justify-between px-4">
            <div>
              <div className="font-bold text-xs">Go live</div>
              <div className="text-[10px] text-[#9AA3AF]">from ₹2,499 / month</div>
            </div>
            <button type="button" className="px-4 py-1.5 rounded-full bg-[#2F5BD8] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer">
              Choose plan →
            </button>
          </div>
        </div>
      </div>
    </div>
  ),
};

