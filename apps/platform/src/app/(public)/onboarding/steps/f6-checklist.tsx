'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  CheckCircle2,
  Printer,
  QrCode,
  Users,
  Smartphone,
  ExternalLink,
  ArrowRight,
  Flame,
  ChefHat,
  Sparkles,
} from 'lucide-react';

interface F6ChecklistProps {
  restaurantName: string;
  slug: string;
  tenantId: string;
  tableCount: number;
  planId: string;
}

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  completed: boolean;
  icon: React.ReactNode;
}

export function F6ChecklistStep({
  restaurantName,
  slug,
  tenantId,
  tableCount,
  planId,
}: F6ChecklistProps) {
  const router = useRouter();
  const [items, setItems] = useState<ChecklistItem[]>([
    {
      id: 'qr',
      title: 'Print Table QR Codes',
      description: `Download ready-to-print PDF stickers for all ${tableCount} tables with authentic cryptographic signatures.`,
      actionLabel: 'Download QR Sheet',
      completed: true,
      icon: <QrCode className="h-5 w-5 text-emerald-600" />,
    },
    {
      id: 'kds',
      title: 'Station Kitchen Display (KDS)',
      description: 'Bookmark and open the real-time order queue on your kitchen station tablet or monitor.',
      actionLabel: 'Open Station KDS',
      completed: true,
      icon: <ChefHat className="h-5 w-5 text-emerald-600" />,
    },
    {
      id: 'staff',
      title: 'Invite Captains & Service Staff',
      description: 'Grant role-based PIN access to captains, order takers, and kitchen managers.',
      actionLabel: 'Invite Team',
      completed: false,
      icon: <Users className="h-5 w-5 text-gray-500" />,
    },
    {
      id: 'payment',
      title: 'Test Live UPI / Card Payment',
      description: 'Scan your own table QR and place a ₹1 live payment to verify instant bank settlement.',
      actionLabel: 'Test Settlement',
      completed: false,
      icon: <Smartphone className="h-5 w-5 text-gray-500" />,
    },
    {
      id: 'printer',
      title: 'Connect Thermal ESC/POS Printer',
      description: 'Auto-print Kitchen Order Tickets (KOT) on Bluetooth or LAN receipt printers.',
      actionLabel: 'Configure Printer',
      completed: false,
      icon: <Printer className="h-5 w-5 text-gray-500" />,
    },
  ]);

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, completed: !it.completed } : it)),
    );
  };

  const completedCount = items.filter((i) => i.completed).length;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
          <Sparkles className="h-3.5 w-3.5" />
          <span>You are live!</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#14161A]">
          {restaurantName} is live and ready
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 max-w-lg mx-auto">
          Your digital dining runtime is active at <strong className="text-[#14161A] font-mono">{slug}.orbitox.io</strong>. Complete your setup checklist to start taking diner orders.
        </p>

        {/* Progress Bar */}
        <div className="pt-2 max-w-md mx-auto space-y-1">
          <div className="flex justify-between text-xs font-medium text-gray-500">
            <span>Setup Checklist</span>
            <span>{completedCount} of {items.length} completed</span>
          </div>
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${(completedCount / items.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Checklist Cards */}
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              item.completed
                ? 'bg-white border-gray-200 shadow-sm'
                : 'bg-white/70 border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                className={`h-6 w-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5 cursor-pointer transition-colors ${
                  item.completed
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                {item.completed && <Check className="h-3.5 w-3.5" />}
              </button>

              <div className="space-y-0.5">
                <h3
                  className={`text-sm font-bold ${
                    item.completed ? 'text-[#14161A]' : 'text-gray-800'
                  }`}
                >
                  {item.title}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                className="px-3.5 py-1.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold cursor-pointer transition-colors"
              >
                {item.actionLabel}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Primary Action to Open Dashboard */}
      <div className="p-6 rounded-3xl bg-[#14161A] text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-base">Ready to manage your restaurant?</h4>
          <p className="text-xs text-gray-400 mt-0.5">
            Open the real-time operating dashboard to view floor matrices, revenue, and active orders.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            router.push('/');
          }}
          className="px-8 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#14161A] text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shrink-0"
        >
          <span>Open Operating Dashboard</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
