'use client';

import * as React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  SegmentedControl,
  Switch,
  Label,
  HeroStat,
  Button,
  Badge,
  useToast,
} from '@orbitox-io/ui';
import type { AppearancePreferences } from '@/server/appearance/appearance-service';

export const ACCENT_PRESETS = [
  { id: 'ocean', label: 'Ocean', bgClass: 'bg-[var(--accent-ocean)]' },
  { id: 'emerald', label: 'Emerald', bgClass: 'bg-[var(--accent-emerald)]' },
  { id: 'sunflower', label: 'Sunflower', bgClass: 'bg-[var(--accent-sunflower)]' },
  { id: 'saffron', label: 'Saffron', bgClass: 'bg-[var(--accent-saffron)]' },
  { id: 'ruby', label: 'Ruby', bgClass: 'bg-[var(--accent-ruby)]' },
  { id: 'coral', label: 'Coral', bgClass: 'bg-[var(--accent-coral)]' },
  { id: 'violet', label: 'Violet', bgClass: 'bg-[var(--accent-violet)]' },
  { id: 'teal', label: 'Teal', bgClass: 'bg-[var(--accent-teal)]' },
] as const;

export const RADIUS_STEPS = [4, 8, 12, 16, 20, 24, 28, 32] as const;

export interface AppearanceClientProps {
  initialAppearance: AppearancePreferences;
  apiEndpoint?: string;
}

export function AppearanceClient({
  initialAppearance,
  apiEndpoint = '/api/v1/platform/me/appearance',
}: AppearanceClientProps) {
  const [appearance, setAppearance] = React.useState<AppearancePreferences>(initialAppearance);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();

  const applyToDocument = React.useCallback((prefs: AppearancePreferences) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', prefs.theme);
    root.setAttribute('data-accent', prefs.accent);
    root.setAttribute('data-density', prefs.density);
    root.setAttribute('data-radius', String(prefs.radius));
    root.setAttribute('data-motion', prefs.smoothAnimations ? 'smooth' : 'reduced');
    root.setAttribute('data-focus', prefs.boldFocusRings ? 'bold' : 'default');
    root.setAttribute('data-sidebar', prefs.compactSidebar ? 'compact' : 'default');
  }, []);

  const updatePreferences = async (patch: Partial<AppearancePreferences>) => {
    const nextAppearance: AppearancePreferences = {
      ...appearance,
      ...patch,
    };
    setAppearance(nextAppearance);
    applyToDocument(nextAppearance);

    setIsSaving(true);
    try {
      const res = await fetch(apiEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextAppearance),
      });

      if (res.ok) {
        toast({
          title: 'Theme updated',
          description: 'Saved to your account',
          variant: 'success',
          duration: 3000,
        });
      }
    } catch {
      // Offline fallback: the DOM already reflects the changes and cookie may be cached
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
          Appearance settings
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Customise the theme, accent colours, spacing density, and corner curves of the platform console.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Interactive Controls */}
        <div className="md:col-span-2 space-y-6">
          {/* 1. Theme Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Interface theme</CardTitle>
              <CardDescription>
                Select your preferred color mood, or sync with your operating system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SegmentedControl
                value={appearance.theme}
                onChange={(theme: string) => updatePreferences({ theme: theme as AppearancePreferences['theme'] })}
                options={[
                  { id: 'auto', label: 'Auto (OS)' },
                  { id: 'light', label: 'Light' },
                  { id: 'dark', label: 'Dark' },
                ]}
              />
            </CardContent>
          </Card>

          {/* 2. Accent Preset */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Accent colour</CardTitle>
              <CardDescription>
                One accent used for primary buttons, active navigation, and highlighted elements.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {ACCENT_PRESETS.map((preset) => {
                  const isSelected = appearance.accent === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => updatePreferences({ accent: preset.id as AppearancePreferences['accent'] })}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-full border text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[var(--color-primary)] bg-[var(--color-surface-raised)] ring-2 ring-[var(--color-primary)]/30 text-[var(--color-text)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)]'
                      }`}
                    >
                      <span
                        className={`h-3.5 w-3.5 rounded-full shrink-0 shadow-xs ${preset.bgClass}`}
                        aria-hidden="true"
                      />
                      <span className="truncate">{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 3. Spacing & Density */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Spacing density</CardTitle>
              <CardDescription>
                Adjust the whitespace scale across cards, data tables, and navigation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SegmentedControl
                value={appearance.density}
                onChange={(density: string) => updatePreferences({ density: density as AppearancePreferences['density'] })}
                options={[
                  { id: 'relaxed', label: 'Relaxed (×1.25)' },
                  { id: 'standard', label: 'Standard (1.0)' },
                  { id: 'compact', label: 'Compact (×0.65)' },
                ]}
              />
            </CardContent>
          </Card>

          {/* 4. Corner Radius */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Corner radius</CardTitle>
                  <CardDescription>
                    Adjust card corner rounding between 4 px and 32 px.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {appearance.radius} px
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {RADIUS_STEPS.map((r) => {
                  const isSelected = appearance.radius === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => updatePreferences({ radius: r })}
                      className={`h-9 flex items-center justify-center rounded-full text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)] font-semibold shadow-xs'
                          : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)]'
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 5. Fine Controls & Toggles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Motion & Accessibility</CardTitle>
              <CardDescription>
                Fine-tune motion transitions, accessibility focus borders, and desktop layout.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="smooth-anim-switch" className="text-sm font-medium text-[var(--color-text)]">
                    Smooth animations
                  </Label>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Enables 200–300 ms transitions. When disabled, transition durations drop to 0 ms.
                  </p>
                </div>
                <Switch
                  id="smooth-anim-switch"
                  checked={appearance.smoothAnimations}
                  onCheckedChange={(checked) => updatePreferences({ smoothAnimations: checked })}
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
                <div className="space-y-0.5">
                  <Label htmlFor="bold-focus-switch" className="text-sm font-medium text-[var(--color-text)]">
                    Bold focus rings
                  </Label>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    High-contrast 3 px focus borders for improved keyboard navigation visibility.
                  </p>
                </div>
                <Switch
                  id="bold-focus-switch"
                  checked={appearance.boldFocusRings}
                  onCheckedChange={(checked) => updatePreferences({ boldFocusRings: checked })}
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
                <div className="space-y-0.5">
                  <Label htmlFor="compact-sidebar-switch" className="text-sm font-medium text-[var(--color-text)]">
                    Compact sidebar
                  </Label>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Keep the desktop sidebar in a collapsed icon-only mode by default.
                  </p>
                </div>
                <Switch
                  id="compact-sidebar-switch"
                  checked={appearance.compactSidebar}
                  onCheckedChange={(checked) => updatePreferences({ compactSidebar: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Interactive Preview */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-base">Live Preview</CardTitle>
              <CardDescription>
                Updates reflect immediately across the entire page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preview Stat */}
              <div className="p-4 rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface-raised)]">
                <HeroStat
                  value="42,890"
                  label="Monthly active diners"
                  delta={{ value: '+14.2%', trend: 'up' }}
                />
              </div>

              {/* Preview Buttons */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[var(--color-text-muted)]">Interactive Elements</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" size="sm">
                    Primary button
                  </Button>
                  <Button variant="secondary" size="sm">
                    Secondary
                  </Button>
                  <Button variant="destructive" size="sm">
                    Danger
                  </Button>
                </div>
              </div>

              {/* Status Pills */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[var(--color-text-muted)]">Status Badges</p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full bg-[var(--color-success)]/15 text-[var(--color-success)] px-3 py-1 text-xs font-medium">
                    Operational
                  </span>
                  <span className="inline-flex items-center rounded-full bg-[var(--color-warning)]/15 text-[var(--color-warning)] px-3 py-1 text-xs font-medium">
                    Provisioning
                  </span>
                  <span className="inline-flex items-center rounded-full bg-[var(--color-danger)]/15 text-[var(--color-danger)] px-3 py-1 text-xs font-medium">
                    Suspended
                  </span>
                </div>
              </div>

              {/* Save status */}
              <div className="pt-3 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)] flex items-center justify-between">
                <span>Auto-saved to account</span>
                {isSaving && <span className="animate-pulse text-[var(--color-primary)]">Syncing...</span>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
