import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { BRAND_OPTION_A, BRAND_OPTION_B } from '../tokens/brand-palettes';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/card';
import { Badge } from '../components/badge';

const meta: Meta = {
  title: 'Foundations/Brand Palettes',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

export const PalettesComparison: StoryObj = {
  render: () => (
    <div className="space-y-8 p-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">Brand Palettes (B2.3)</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Two production-grade design directions for OrbitoX Platform and RestaurantOS.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Option A: Titanium Slate */}
        <Card className="border-[var(--color-border)]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{BRAND_OPTION_A.name}</CardTitle>
              <Badge variant="default">Active Default</Badge>
            </div>
            <CardDescription>{BRAND_OPTION_A.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded bg-[#0b0f17] text-white border border-slate-800">
                <div className="font-semibold">Surface Dark</div>
                <div className="text-[10px] text-slate-300">{BRAND_OPTION_A.colors.surfaceDark}</div>
              </div>
              <div className="p-3 rounded bg-[#4f46e5] text-white">
                <div className="font-semibold">Primary Light</div>
                <div className="text-[10px] text-indigo-100">{BRAND_OPTION_A.colors.primaryLight}</div>
              </div>
              <div className="p-3 rounded bg-[#22d3ee] text-slate-950 font-semibold">
                <div>Accent Dark</div>
                <div className="text-[10px]">{BRAND_OPTION_A.colors.accentDark}</div>
              </div>
              <div className="p-3 rounded bg-[#10b981] text-slate-950 font-semibold">
                <div>Success Emerald</div>
                <div className="text-[10px]">#10b981 (Emerald 500)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Option B: Obsidian Amber */}
        <Card className="border-[var(--color-border)]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{BRAND_OPTION_B.name}</CardTitle>
              <Badge variant="outline">Candidate</Badge>
            </div>
            <CardDescription>{BRAND_OPTION_B.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded bg-[#171513] text-white border border-zinc-800">
                <div className="font-semibold">Surface Dark</div>
                <div className="text-[10px] text-zinc-300">{BRAND_OPTION_B.colors.surfaceDark}</div>
              </div>
              <div className="p-3 rounded bg-[#7c3aed] text-white font-semibold">
                <div>Primary Light</div>
                <div className="text-[10px] text-violet-100">{BRAND_OPTION_B.colors.primaryLight}</div>
              </div>
              <div className="p-3 rounded bg-[#fbbf24] text-zinc-950 font-semibold">
                <div>Accent Dark</div>
                <div className="text-[10px]">{BRAND_OPTION_B.colors.accentDark}</div>
              </div>
              <div className="p-3 rounded bg-[#f97316] text-zinc-950 font-semibold">
                <div>Warning Orange</div>
                <div className="text-[10px]">#f97316 (Orange 500)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Token Preview under Brand Option B */}
      <div
        data-brand="obsidian-amber"
        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] p-5 space-y-3"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Live CSS Token Scope: Obsidian Amber (`data-brand="obsidian-amber"`)</h3>
            <p className="text-xs text-[var(--color-text-muted)]">Verifies warm charcoal surfaces + violet/amber contrast pairs.</p>
          </div>
          <Badge variant="default">Option B Token Scope</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1.5 rounded text-xs font-medium bg-[var(--color-primary)] text-[var(--color-primary-fg)]">
            Primary Action Surface
          </span>
          <span className="px-3 py-1.5 rounded text-xs font-medium bg-[var(--color-accent)] text-[var(--color-accent-fg)]">
            Accent Highlight Surface
          </span>
        </div>
      </div>
    </div>
  ),
};
