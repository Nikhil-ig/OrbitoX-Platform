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

export interface ToastNotification {
  title: string;
  description: string;
  variant: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export interface AppearancePersistenceOptions {
  initialAppearance: AppearancePreferences;
  apiEndpoint?: string;
  onToast?: (notification: ToastNotification) => void;
  onStateChange?: (appearance: AppearancePreferences, isSaving: boolean) => void;
}

export function applyAppearanceToDocument(prefs: AppearancePreferences) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', prefs.theme);
  root.setAttribute('data-accent', prefs.accent);
  root.setAttribute('data-density', prefs.density);
  root.setAttribute('data-radius', String(prefs.radius));
  root.setAttribute('data-motion', prefs.smoothAnimations ? 'smooth' : 'reduced');
  root.setAttribute('data-focus', prefs.boldFocusRings ? 'bold' : 'default');
  root.setAttribute('data-sidebar', prefs.compactSidebar ? 'compact' : 'default');
}

export class AppearancePersistenceController {
  private appearance: AppearancePreferences;
  private committedAppearance: AppearancePreferences;
  private latestRequestId = 0;
  private lastCommittedRequestId = 0;
  private pendingCount = 0;
  private apiEndpoint: string;
  private onToast?: (notification: ToastNotification) => void;
  private onStateChange?: (appearance: AppearancePreferences, isSaving: boolean) => void;

  constructor(options: AppearancePersistenceOptions) {
    this.appearance = { ...options.initialAppearance };
    this.committedAppearance = { ...options.initialAppearance };
    this.apiEndpoint = options.apiEndpoint || '/api/v1/platform/me/appearance';
    this.onToast = options.onToast;
    this.onStateChange = options.onStateChange;
    applyAppearanceToDocument(this.appearance);
  }

  get currentAppearance(): AppearancePreferences {
    return this.appearance;
  }

  get lastCommittedAppearance(): AppearancePreferences {
    return this.committedAppearance;
  }

  get isSaving(): boolean {
    return this.pendingCount > 0;
  }

  get pendingSavesCount(): number {
    return this.pendingCount;
  }

  async updatePreferences(patch: Partial<AppearancePreferences>): Promise<void> {
    const requestId = ++this.latestRequestId;
    this.pendingCount += 1;
    const requestAppearance: AppearancePreferences = {
      ...this.appearance,
      ...patch,
    };
    this.appearance = requestAppearance;
    applyAppearanceToDocument(this.appearance);
    this.notifyStateChange();

    try {
      const csrfToken = typeof document !== 'undefined' && document.cookie
        ? document.cookie.split('; ').find((row) => row.startsWith('orbitox_operator_csrf='))?.split('=')[1]
          || document.cookie.split('; ').find((row) => row.startsWith('orbitox_customer_csrf='))?.split('=')[1]
        : undefined;

      const res = await fetch(this.apiEndpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify(requestAppearance),
      });

      if (res.ok) {
        if (requestId >= this.lastCommittedRequestId) {
          this.lastCommittedRequestId = requestId;
          this.committedAppearance = { ...requestAppearance };
        }
        if (requestId === this.latestRequestId) {
          this.onToast?.({
            title: 'Theme updated',
            description: 'Saved to your account',
            variant: 'success',
            duration: 3000,
          });
        }
      } else {
        const errorData = await res.json().catch(() => null);
        const errorMessage = errorData?.error?.message || errorData?.message || 'Theme update failed. Reverting changes.';

        // Rollback is permitted ONLY when the failing request still owns the current optimistic state
        if (requestId === this.latestRequestId) {
          this.appearance = { ...this.committedAppearance };
          applyAppearanceToDocument(this.committedAppearance);
          this.onToast?.({
            title: 'Failed to save appearance',
            description: errorMessage,
            variant: 'error',
            duration: 4000,
          });
        }
      }
    } catch {
      // Network failure
      if (requestId === this.latestRequestId) {
        this.appearance = { ...this.committedAppearance };
        applyAppearanceToDocument(this.committedAppearance);
        this.onToast?.({
          title: 'Connection error',
          description: 'Network failed while saving appearance. Reverted changes.',
          variant: 'error',
          duration: 4000,
        });
      }
    } finally {
      this.pendingCount = Math.max(0, this.pendingCount - 1);
      this.notifyStateChange();
    }
  }

  private notifyStateChange() {
    this.onStateChange?.(this.appearance, this.isSaving);
  }
}
