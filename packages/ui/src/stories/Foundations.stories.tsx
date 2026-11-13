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

const ALL_ACCENTS = [
  { id: 'ocean', name: 'Ocean' },
  { id: 'emerald', name: 'Emerald' },
  { id: 'sunflower', name: 'Sunflower' },
  { id: 'saffron', name: 'Saffron' },
  { id: 'ruby', name: 'Ruby' },
  { id: 'coral', name: 'Coral' },
  { id: 'violet', name: 'Violet' },
  { id: 'teal', name: 'Teal' },
] as const;

export const AccentPresetsMatrix: StoryObj = {
  render: () => (
    <div className="space-y-8 p-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
          8 Accent Presets × 2 Moods (WCAG 2.2 AA Accessibility)
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Every preset defines its own high-contrast foreground color passing 4.5:1 contrast in both light and dark modes.
        </p>
      </div>

      {(['dark', 'light'] as const).map((mood) => (
        <div
          key={mood}
          data-theme={mood}
          className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <h3 className="text-lg font-bold capitalize">{mood} Mood Surface</h3>
            <span className="text-xs font-mono text-[var(--color-text-muted)]">data-theme="{mood}"</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ALL_ACCENTS.map((preset) => (
              <div
                key={preset.id}
                data-accent={preset.id}
                className="rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--color-text)]">{preset.name}</span>
                  <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{preset.id}</span>
                </div>
                <button
                  type="button"
                  className="w-full h-10 rounded-full font-medium text-xs px-4 bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-xs transition-opacity hover:opacity-90"
                >
                  Primary Action Pill
                </button>
                <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)] pt-1">
                  <span>Active Tab</span>
                  <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
};

