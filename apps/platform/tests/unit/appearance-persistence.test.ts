import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  AppearancePersistenceController,
  applyAppearanceToDocument,
  type ToastNotification,
} from '@/app/(console)/console/settings/appearance/appearance-persistence';
import type { AppearancePreferences } from '@/server/appearance/appearance-service';

const DEFAULT_TEST_APPEARANCE: AppearancePreferences = {
  theme: 'light',
  accent: 'ocean',
  density: 'standard',
  radius: 16,
  smoothAnimations: true,
  boldFocusRings: false,
  compactSidebar: false,
};

describe('Appearance Persistence & Concurrency Race Guard (7B.1 / P1)', () => {
  const originalFetch = globalThis.fetch;
  const originalDocument = (globalThis as any).document;
  const domAttributes = new Map<string, string>();

  beforeEach(() => {
    domAttributes.clear();
    (globalThis as any).document = {
      documentElement: {
        setAttribute: (name: string, val: string) => domAttributes.set(name, String(val)),
        getAttribute: (name: string) => domAttributes.get(name) ?? null,
        hasAttribute: (name: string) => domAttributes.has(name),
        removeAttribute: (name: string) => domAttributes.delete(name),
      },
      cookie: 'orbitox_operator_csrf=test_csrf_token',
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    (globalThis as any).document = originalDocument;
  });

  it('verifies all seven document attributes are applied by applyAppearanceToDocument', () => {
    applyAppearanceToDocument(DEFAULT_TEST_APPEARANCE);

    assert.equal(domAttributes.get('data-theme'), 'light');
    assert.equal(domAttributes.get('data-accent'), 'ocean');
    assert.equal(domAttributes.get('data-density'), 'standard');
    assert.equal(domAttributes.get('data-radius'), '16');
    assert.equal(domAttributes.get('data-motion'), 'smooth');
    assert.equal(domAttributes.get('data-focus'), 'default');
    assert.equal(domAttributes.get('data-sidebar'), 'default');
  });

  it('restores all seven document attributes on HTTP 401, 422, 500, and network failure', async () => {
    const errorStatuses = [401, 422, 500] as const;

    for (const status of errorStatuses) {
      domAttributes.clear();
      const toasts: ToastNotification[] = [];

      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({ error: { message: `Simulated error ${status}` } }),
          { status, headers: { 'Content-Type': 'application/json' } }
        );

      const controller = new AppearancePersistenceController({
        initialAppearance: DEFAULT_TEST_APPEARANCE,
        onToast: (t) => toasts.push(t),
      });

      // Optimistic patch updating multiple attributes across theme, accent, radius, motion, focus
      await controller.updatePreferences({
        theme: 'dark',
        accent: 'saffron',
        density: 'compact',
        radius: 28,
        smoothAnimations: false,
        boldFocusRings: true,
        compactSidebar: true,
      });

      // Failed request must roll back to DEFAULT_TEST_APPEARANCE
      assert.deepEqual(controller.currentAppearance, DEFAULT_TEST_APPEARANCE);
      assert.equal(controller.isSaving, false);

      // Verify all 7 document attributes were restored
      assert.equal(domAttributes.get('data-theme'), 'light');
      assert.equal(domAttributes.get('data-accent'), 'ocean');
      assert.equal(domAttributes.get('data-density'), 'standard');
      assert.equal(domAttributes.get('data-radius'), '16');
      assert.equal(domAttributes.get('data-motion'), 'smooth');
      assert.equal(domAttributes.get('data-focus'), 'default');
      assert.equal(domAttributes.get('data-sidebar'), 'default');

      // Verify toast notification
      assert.equal(toasts.length, 1);
      assert.ok(toasts[0]);
      assert.equal(toasts[0]?.variant, 'error');
      assert.ok(toasts[0]?.description.includes(String(status)));
    }

    // Network failure test (fetch throws / network disconnect)
    domAttributes.clear();
    const networkToasts: ToastNotification[] = [];
    globalThis.fetch = async () => {
      throw new Error('Failed to fetch: Network offline');
    };

    const netController = new AppearancePersistenceController({
      initialAppearance: DEFAULT_TEST_APPEARANCE,
      onToast: (t) => networkToasts.push(t),
    });

    await netController.updatePreferences({
      accent: 'emerald',
      radius: 24,
    });

    assert.deepEqual(netController.currentAppearance, DEFAULT_TEST_APPEARANCE);
    assert.equal(netController.isSaving, false);
    assert.equal(domAttributes.get('data-accent'), 'ocean');
    assert.equal(domAttributes.get('data-radius'), '16');
    assert.equal(networkToasts.length, 1);
    assert.ok(networkToasts[0]);
    assert.equal(networkToasts[0]?.variant, 'error');
    assert.equal(networkToasts[0]?.title, 'Connection error');
  });

  it('handles two overlapping saves arriving out of order without clobbering latest state', async () => {
    let resolveReq1: (res: Response) => void;
    let resolveReq2: (res: Response) => void;

    const p1 = new Promise<Response>((resolve) => {
      resolveReq1 = resolve;
    });
    const p2 = new Promise<Response>((resolve) => {
      resolveReq2 = resolve;
    });

    let callCount = 0;
    globalThis.fetch = async () => {
      callCount += 1;
      if (callCount === 1) return p1;
      return p2;
    };

    const toasts: ToastNotification[] = [];
    const controller = new AppearancePersistenceController({
      initialAppearance: DEFAULT_TEST_APPEARANCE,
      onToast: (t) => toasts.push(t),
    });

    // 1. User changes accent to Emerald (Request 1 dispatched)
    const update1 = controller.updatePreferences({ accent: 'emerald' });
    assert.equal(controller.isSaving, true);
    assert.equal(controller.pendingSavesCount, 1);
    assert.equal(controller.currentAppearance.accent, 'emerald');

    // 2. User changes radius to 24 before Request 1 finishes (Request 2 dispatched)
    const update2 = controller.updatePreferences({ radius: 24 });
    assert.equal(controller.isSaving, true);
    assert.equal(controller.pendingSavesCount, 2);
    assert.equal(controller.currentAppearance.accent, 'emerald');
    assert.equal(controller.currentAppearance.radius, 24);

    // 3. Request 2 SUCCEEDS first (arriving out of order)
    resolveReq2!(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    await update2;

    // After Request 2 resolves, Request 1 is still pending -> isSaving must remain true!
    assert.equal(controller.isSaving, true);
    assert.equal(controller.pendingSavesCount, 1);
    assert.equal(controller.lastCommittedAppearance.accent, 'emerald');
    assert.equal(controller.lastCommittedAppearance.radius, 24);

    // 4. Request 1 FAILS afterward (HTTP 500)
    resolveReq1!(
      new Response(JSON.stringify({ error: { message: 'Outdated request failed' } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    await update1;

    // 5. Verification: Request 1 must NOT roll back Request 2's successful changes!
    assert.equal(controller.isSaving, false);
    assert.equal(controller.pendingSavesCount, 0);
    assert.equal(controller.currentAppearance.accent, 'emerald');
    assert.equal(controller.currentAppearance.radius, 24);
    assert.equal(domAttributes.get('data-accent'), 'emerald');
    assert.equal(domAttributes.get('data-radius'), '24');

    // Verify toast: Request 2 got the success toast, Request 1 was silenced from false rollback
    assert.equal(toasts.length, 1);
    assert.ok(toasts[0]);
    assert.equal(toasts[0]?.variant, 'success');
  });

  it('rolls back to last committed state when the latest request fails after earlier success', async () => {
    let resolveReq1: (res: Response) => void;
    let resolveReq2: (res: Response) => void;

    const p1 = new Promise<Response>((resolve) => {
      resolveReq1 = resolve;
    });
    const p2 = new Promise<Response>((resolve) => {
      resolveReq2 = resolve;
    });

    let callCount = 0;
    globalThis.fetch = async () => {
      callCount += 1;
      if (callCount === 1) return p1;
      return p2;
    };

    const toasts: ToastNotification[] = [];
    const controller = new AppearancePersistenceController({
      initialAppearance: DEFAULT_TEST_APPEARANCE,
      onToast: (t) => toasts.push(t),
    });

    // Request 1: accent emerald
    const update1 = controller.updatePreferences({ accent: 'emerald' });
    // Request 2: radius 24
    const update2 = controller.updatePreferences({ radius: 24 });

    // Request 1 succeeds
    resolveReq1!(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    await update1;

    // Request 2 fails (e.g. 422 validation error)
    resolveReq2!(
      new Response(JSON.stringify({ error: { message: 'Invalid radius step' } }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    await update2;

    // Because Request 2 owned the latest optimistic state, it rolls back to Request 1's committed state!
    assert.equal(controller.currentAppearance.accent, 'emerald');
    assert.equal(controller.currentAppearance.radius, 16);
    assert.equal(domAttributes.get('data-accent'), 'emerald');
    assert.equal(domAttributes.get('data-radius'), '16');

    assert.equal(toasts.some((t) => t.variant === 'error'), true);
  });
});
