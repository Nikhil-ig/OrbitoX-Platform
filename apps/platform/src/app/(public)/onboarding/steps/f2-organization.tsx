'use client';

import React, { useState } from 'react';
import { Building, Store, AlertCircle, ArrowRight, ArrowLeft, RefreshCw, CheckCircle2, Info } from 'lucide-react';

interface F2Props {
  onSuccess: (org: { id: string; name: string; slug: string; city: string; gstin?: string }) => void;
  onBack: () => void;
  defaultBusinessName?: string;
}

const INDIAN_STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
  '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan',
  '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
  '19': 'West Bengal', '23': 'Madhya Pradesh', '24': 'Gujarat', '27': 'Maharashtra',
  '29': 'Karnataka', '32': 'Kerala', '33': 'Tamil Nadu', '36': 'Telangana', '37': 'Andhra Pradesh',
};

export function F2OrganizationStep({ onSuccess, onBack, defaultBusinessName = '' }: F2Props) {
  const [businessName, setBusinessName] = useState(defaultBusinessName || 'Shah Hospitality Group');
  const [category, setCategory] = useState<'RESTAURANTS_CAFES' | 'HEALTHCARE' | 'MULTI'>('RESTAURANTS_CAFES');
  const [city, setCity] = useState('Bengaluru');
  const [gstin, setGstin] = useState('29ABCDE1234F1Z5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate GSTIN syntax dynamically
  const getGstinStatus = (g: string) => {
    const trimmed = g.trim().toUpperCase();
    if (!trimmed) return null;
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(trimmed)) {
      return { valid: false, message: 'Invalid 15-character GSTIN format' };
    }
    const stateCode = trimmed.slice(0, 2);
    const stateName = INDIAN_STATE_CODES[stateCode] || 'State ' + stateCode;
    return { valid: true, message: `Valid · ${stateName}` };
  };

  const gstinStatus = getGstinStatus(gstin);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!businessName.trim() || businessName.trim().length < 2) {
      setError('Business name must be at least 2 characters long.');
      return;
    }
    if (gstin.trim() && gstinStatus && !gstinStatus.valid) {
      setError('Please provide a valid Indian GSTIN or leave the field blank.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/customer/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'idempotency-key': `org_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        },
        body: JSON.stringify({
          name: businessName.trim(),
          businessCategory: category === 'MULTI' ? 'RESTAURANTS_CAFES' : category,
          city: city.trim(),
          gstin: gstin.trim() ? gstin.trim().toUpperCase() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to create organization.');
      }

      onSuccess({
        id: data.organization.id,
        name: data.organization.name,
        slug: data.organization.slug,
        city: data.organization.city || city,
        gstin: data.organization.gstin,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
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

        <button
          type="button"
          onClick={onBack}
          className="text-xs text-[#2F5BD8] font-medium hover:underline cursor-pointer flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          <span>Back</span>
        </button>
      </div>

      {/* Form and Hierarchy Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form (2 cols) */}
        <div className="lg:col-span-2 p-8 rounded-[32px] bg-white border border-[#E2E8F0] shadow-xl space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-[#14161A]">Tell us about your business</h2>
            <p className="text-xs text-[#5A6170] mt-1">This is your company. You&apos;ll add restaurants to it next.</p>
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs font-semibold text-[#14161A]">Business name</label>
              <input
                type="text"
                required
                aria-label="Business name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Shah Hospitality Group"
                className="w-full mt-1.5 px-4 py-2.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#14161A] focus:outline-none focus:border-[#14161A]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#14161A]">What do you run?</label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div
                  onClick={() => setCategory('RESTAURANTS_CAFES')}
                  className={`p-3.5 rounded-[20px] flex flex-col justify-between h-28 cursor-pointer transition-all ${
                    category === 'RESTAURANTS_CAFES'
                      ? 'border-2 border-[#14161A] bg-[#F8FAFC]'
                      : 'border border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">🍴</span>
                    <span
                      className={`h-3.5 w-3.5 rounded-full ${
                        category === 'RESTAURANTS_CAFES'
                          ? 'border-4 border-[#14161A] bg-white'
                          : 'border border-[#CBD5E1]'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-[#14161A]">Restaurants & cafés</div>
                    <div className="text-[10px] text-[#5A6170]">RestaurantOS</div>
                  </div>
                </div>

                <div
                  onClick={() => setCategory('HEALTHCARE')}
                  className={`p-3.5 rounded-[20px] flex flex-col justify-between h-28 cursor-pointer transition-all ${
                    category === 'HEALTHCARE'
                      ? 'border-2 border-[#14161A] bg-[#F8FAFC]'
                      : 'border border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">🏥</span>
                    <span
                      className={`h-3.5 w-3.5 rounded-full ${
                        category === 'HEALTHCARE'
                          ? 'border-4 border-[#14161A] bg-white'
                          : 'border border-[#CBD5E1]'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-[#14161A]">Clinics & hospitals</div>
                    <div className="text-[10px] text-[#5A6170]">HospitalOS</div>
                  </div>
                </div>

                <div
                  onClick={() => setCategory('MULTI')}
                  className={`p-3.5 rounded-[20px] flex flex-col justify-between h-28 cursor-pointer transition-all ${
                    category === 'MULTI'
                      ? 'border-2 border-[#14161A] bg-[#F8FAFC]'
                      : 'border border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">🏢</span>
                    <span
                      className={`h-3.5 w-3.5 rounded-full ${
                        category === 'MULTI'
                          ? 'border-4 border-[#14161A] bg-white'
                          : 'border border-[#CBD5E1]'
                      }`}
                    />
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
                  required
                  aria-label="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Bengaluru"
                  className="w-full mt-1.5 px-4 py-2.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#14161A] focus:outline-none focus:border-[#14161A]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#14161A]">GSTIN (optional now)</label>
                <input
                  type="text"
                  aria-label="GSTIN"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 29ABCDE1234F1Z5"
                  className={`w-full mt-1.5 px-4 py-2.5 rounded-full border bg-[#F8FAFC] text-xs text-[#14161A] focus:outline-none ${
                    gstinStatus
                      ? gstinStatus.valid
                        ? 'border-emerald-600'
                        : 'border-red-400'
                      : 'border-[#E2E8F0]'
                  }`}
                />
                {gstinStatus && (
                  <div
                    className={`text-[10px] font-medium mt-1 ${
                      gstinStatus.valid ? 'text-[#065F46]' : 'text-red-500'
                    }`}
                  >
                    {gstinStatus.message}
                  </div>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-[20px] bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] flex items-center gap-2">
              <span className="h-4 w-4 rounded-full bg-[#F59E0B] text-white flex items-center justify-center font-bold text-[10px] shrink-0">!</span>
              <span>Without a GSTIN you can still take orders, but we won&apos;t issue GST tax invoices until you add one.</span>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={onBack}
                className="px-6 py-2.5 rounded-full border border-[#E2E8F0] text-xs font-semibold text-[#14161A] hover:bg-gray-50 cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-[#14161A] text-white hover:bg-[#14161A]/90 px-8 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Creating organization...</span>
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Architecture Explainer Card (1 col) */}
        <div className="p-6 rounded-[32px] bg-white border border-[#E2E8F0] shadow-md space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-[#14161A]">How it fits together</h3>

            <div className="space-y-2">
              <div className="p-3 rounded-full bg-[#14161A] text-white font-semibold text-xs text-center shadow-md truncate">
                {businessName || 'Your Business Group'}
              </div>

              <div className="pl-4 space-y-1.5 border-l-2 border-[#E2E8F0]">
                <div className="p-2.5 rounded-full bg-[#FFEDD5] text-[#9A3412] font-semibold text-xs text-center">
                  Masala House · restaurant
                </div>

                <div className="pl-4 space-y-1 border-l-2 border-[#E2E8F0]">
                  <div className="p-2 rounded-full bg-[#F1F5F9] text-[#475569] text-[11px] text-center">
                    {city || 'Bengaluru'} branch
                  </div>
                  <div className="p-2 rounded-full bg-[#F1F5F9] text-[#475569] text-[11px] text-center">
                    Second branch
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
  );
}
