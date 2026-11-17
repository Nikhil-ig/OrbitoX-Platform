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

export interface AppearancePersistenceState {
  appearance: AppearancePreferences;
  isSaving: boolean;
  isReconciling: boolean;
  isUnconfirmed: boolean;
  desiredRevision: number;
  persistedRevision: number;
}

export interface AppearancePersistenceOptions {
  initialAppearance: AppearancePreferences;
  apiEndpoint?: string;
  onToast?: (notification: ToastNotification) => void;
  onStateChange?: (state: AppearancePersistenceState) => void;
}

interface RevisionWaiter {
  revision: number;
  resolve: () => void;
}

export function applyAppearanceToDocument(prefs: AppearancePreferences): void {
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

/**
 * Single-Writer Serialized Appearance Persistence Controller
 * Guarantees that at most ONE PUT request is in flight at any time.
 * Rapid user updates coalesce into the newest desired preference snapshot.
 * Stale writes can never clobber PostgreSQL or newer client state.
 * Employs authoritative GET reconciliation for dropped or ambiguous network responses.
 */
export class AppearancePersistenceController {
  private committedAppearance: AppearancePreferences;
  private desiredAppearance: AppearancePreferences;
  private desiredRevision: number = 0;
  private persistedRevision: number = 0;
  private isWriting: boolean = false;
  private isReconcilingState: boolean = false;
  private isUnconfirmedState: boolean = false;
  private isDisposed: boolean = false;
  private waiters: RevisionWaiter[] = [];

  private apiEndpoint: string;
  private onToast?: (notification: ToastNotification) => void;
  private onStateChange?: (state: AppearancePersistenceState) => void;

  constructor(options: AppearancePersistenceOptions) {
    this.desiredAppearance = { ...options.initialAppearance };
    this.committedAppearance = { ...options.initialAppearance };
    this.apiEndpoint = options.apiEndpoint || '/api/v1/platform/me/appearance';
    this.onToast = options.onToast;
    this.onStateChange = options.onStateChange;
    // PURE constructor: zero DOM side effects or network calls during render.
  }

  get currentAppearance(): AppearancePreferences {
    return this.desiredAppearance;
  }

  get lastCommittedAppearance(): AppearancePreferences {
    return this.committedAppearance;
  }

  get currentRevision(): number {
    return this.desiredRevision;
  }

  get confirmedRevision(): number {
    return this.persistedRevision;
  }

  get isSaving(): boolean {
    return this.isWriting || this.isReconcilingState;
  }

  get isReconciling(): boolean {
    return this.isReconcilingState;
  }

  get isUnconfirmed(): boolean {
    return this.isUnconfirmedState;
  }

  get pendingSavesCount(): number {
    return Math.max(0, this.desiredRevision - this.persistedRevision);
  }

  /**
   * Synchronize document data attributes with the current desired appearance.
   * Called within React useEffect lifecycle to preserve render purity.
   */
  syncDocument(): void {
    if (this.isDisposed) return;
    applyAppearanceToDocument(this.desiredAppearance);
  }

  /**
   * Dispose controller subscriptions and cancel pending notification dispatches on unmount.
   */
  dispose(): void {
    this.isDisposed = true;
    this.onToast = undefined;
    this.onStateChange = undefined;
    // Drain any remaining waiters so callers don't hang
    const remaining = [...this.waiters];
    this.waiters = [];
    for (const w of remaining) {
      w.resolve();
    }
  }

  /**
   * Queue an optimistic appearance patch through the single-writer pipeline.
   */
  updatePreferences(patch: Partial<AppearancePreferences>): Promise<void> {
    if (this.isDisposed) return Promise.resolve();

    this.desiredRevision += 1;
    const targetRevision = this.desiredRevision;
    this.desiredAppearance = {
      ...this.desiredAppearance,
      ...patch,
    };
    this.isUnconfirmedState = false;
    applyAppearanceToDocument(this.desiredAppearance);
    this.notifyState();

    const promise = new Promise<void>((resolve) => {
      this.waiters.push({ revision: targetRevision, resolve });
    });

    // Launch queue processing if not already writing/reconciling
    this.processQueue();

    return promise;
  }

  /**
   * Safe retry method for unconfirmed or stalled saves.
   */
  async retry(): Promise<void> {
    if (this.isDisposed) return;
    if (this.isUnconfirmedState) {
      await this.reconcileAuthoritativeState(this.persistedRevision, this.desiredAppearance);
    }
    if (this.desiredRevision > this.persistedRevision) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isWriting || this.isReconcilingState || this.isDisposed) {
      return;
    }

    this.isWriting = true;
    this.notifyState();

    try {
      while (this.desiredRevision > this.persistedRevision && !this.isDisposed) {
        const snapshotRevision = this.desiredRevision;
        const snapshotPayload = { ...this.desiredAppearance };

        let res: Response;
        try {
          const csrfToken = this.getCsrfToken();
          res = await fetch(this.apiEndpoint, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
            },
            body: JSON.stringify(snapshotPayload),
          });
        } catch {
          // Network connection dropped or unreachable during PUT.
          // Enter authoritative reconciliation to verify whether PostgreSQL committed.
          await this.reconcileAuthoritativeState(snapshotRevision, snapshotPayload);
          this.resolveWaitersUpTo(snapshotRevision);
          break;
        }

        if (res.ok) {
          const data = await res.json().catch(() => null);
          const serverAppearance = (data?.appearance as AppearancePreferences) || snapshotPayload;
          this.committedAppearance = { ...serverAppearance };
          this.persistedRevision = snapshotRevision;
          this.isUnconfirmedState = false;

          // Only display success notification if no newer user changes were queued during in-flight write
          if (this.desiredRevision === snapshotRevision) {
            this.onToast?.({
              title: 'Theme updated',
              description: 'Saved to your account',
              variant: 'success',
              duration: 3000,
            });
          }
          this.resolveWaitersUpTo(snapshotRevision);
          // If newer preferences were queued (desiredRevision > snapshotRevision),
          // the while-loop continues to persist the newest coalesced snapshot!
        } else {
          // HTTP non-success (400, 401, 403, 422, 429, 500, etc.)
          const errorData = await res.json().catch(() => null);
          const errorMessage =
            errorData?.error?.message ||
            errorData?.message ||
            `Failed to save appearance (HTTP ${res.status})`;

          if (this.desiredRevision > snapshotRevision) {
            // Newer desired preferences are already waiting in the queue!
            // Do not roll back the newer desired state and do not display an obsolete rejection.
            this.resolveWaitersUpTo(snapshotRevision);
            continue;
          } else {
            // The newest desired snapshot failed!
            // Restore the last server-confirmed preferences across controller, document, and React state:
            this.desiredAppearance = { ...this.committedAppearance };
            this.persistedRevision = this.desiredRevision;
            applyAppearanceToDocument(this.committedAppearance);

            this.onToast?.({
              title: 'Failed to save appearance',
              description: errorMessage,
              variant: 'error',
              duration: 4000,
            });
            this.resolveWaitersUpTo(snapshotRevision);
            break;
          }
        }
      }
    } finally {
      this.isWriting = false;
      this.resolveWaitersUpTo(this.desiredRevision);
      this.notifyState();
    }
  }

  private resolveWaitersUpTo(revision: number): void {
    const toResolve: RevisionWaiter[] = [];
    const remaining: RevisionWaiter[] = [];

    for (const w of this.waiters) {
      if (w.revision <= revision) {
        toResolve.push(w);
      } else {
        remaining.push(w);
      }
    }

    this.waiters = remaining;
    for (const w of toResolve) {
      w.resolve();
    }
  }

  private async reconcileAuthoritativeState(
    snapshotRevision: number,
    _snapshotPayload: AppearancePreferences
  ): Promise<void> {
    this.isReconcilingState = true;
    this.notifyState();

    try {
      const csrfToken = this.getCsrfToken();
      const getRes = await fetch(this.apiEndpoint, {
        method: 'GET',
        headers: {
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
      });

      if (getRes.ok) {
        const getData = await getRes.json().catch(() => null);
        if (getData?.success && getData?.appearance) {
          const authoritative = getData.appearance as AppearancePreferences;
          this.committedAppearance = { ...authoritative };
          this.isUnconfirmedState = false;

          if (this.desiredRevision > snapshotRevision) {
            // Newer desired preferences exist. Retain them and continue queue!
            return;
          } else {
            // No newer desired preferences. Synchronize UI and document with authoritative server state:
            this.desiredAppearance = { ...authoritative };
            this.persistedRevision = snapshotRevision;
            applyAppearanceToDocument(authoritative);
            return;
          }
        }
      }
      throw new Error(`Reconciliation GET returned status ${getRes.status}`);
    } catch {
      // Reconciliation GET itself failed!
      // Represent persistence as unconfirmed. Do not falsely claim that server was rolled back.
      this.isUnconfirmedState = true;
      this.onToast?.({
        title: 'Save unconfirmed',
        description:
          'Network connection failed and server state could not be verified. You can retry syncing.',
        variant: 'warning',
        duration: 5000,
      });
    } finally {
      this.isReconcilingState = false;
      this.notifyState();
    }
  }

  private getCsrfToken(): string | undefined {
    if (typeof document === 'undefined' || !document.cookie) return undefined;
    return (
      document.cookie
        .split('; ')
        .find((row) => row.startsWith('orbitox_operator_csrf='))
        ?.split('=')[1] ||
      document.cookie
        .split('; ')
        .find((row) => row.startsWith('orbitox_customer_csrf='))
        ?.split('=')[1]
    );
  }

  private notifyState(): void {
    if (this.isDisposed) return;
    this.onStateChange?.({
      appearance: { ...this.desiredAppearance },
      isSaving: this.isSaving,
      isReconciling: this.isReconcilingState,
      isUnconfirmed: this.isUnconfirmedState,
      desiredRevision: this.desiredRevision,
      persistedRevision: this.persistedRevision,
    });
  }
}
