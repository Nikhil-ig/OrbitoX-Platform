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

/**
 * Fake Authoritative PostgreSQL / API Store
 * Simulates true server-side persistence, tracks concurrent in-flight PUT requests,
 * and exposes authoritative GET verification.
 */
class FakeAuthoritativeServerStore {
  persistedPreferences: AppearancePreferences;
  activePutCount = 0;
  maxSimultaneousPutCount = 0;
  totalPuts = 0;
  totalGets = 0;
  putHistory: { payload: AppearancePreferences; timestamp: number }[] = [];
  getHistory: { timestamp: number }[] = [];
  lastRequestedUrl: string = '';

  onPut?: (payload: AppearancePreferences) => Promise<Response> | Response;
  onGet?: () => Promise<Response> | Response;

  constructor(initial: AppearancePreferences = DEFAULT_TEST_APPEARANCE) {
    this.persistedPreferences = { ...initial };
  }

  async handleFetch(url: string | URL | Request, init?: RequestInit): Promise<Response> {
    const parsedUrl = typeof url === 'string' ? url : url.toString();
    this.lastRequestedUrl = parsedUrl;
    const method = init?.method || 'GET';

    if (method === 'PUT') {
      this.totalPuts += 1;
      this.activePutCount += 1;
      this.maxSimultaneousPutCount = Math.max(
        this.maxSimultaneousPutCount,
        this.activePutCount
      );

      const payload = JSON.parse((init?.body as string) || '{}') as AppearancePreferences;
      this.putHistory.push({ payload, timestamp: Date.now() });

      let res: Response;
      try {
        if (this.onPut) {
          res = await this.onPut(payload);
        } else {
          this.persistedPreferences = { ...payload };
          res = new Response(
            JSON.stringify({ success: true, appearance: this.persistedPreferences }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } finally {
        this.activePutCount -= 1;
      }
      return res;
    }

    if (method === 'GET') {
      this.totalGets += 1;
      this.getHistory.push({ timestamp: Date.now() });

      if (this.onGet) {
        return await this.onGet();
      }

      return new Response(
        JSON.stringify({ success: true, appearance: this.persistedPreferences }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  }
}

describe('Appearance Persistence Single-Writer & Concurrency Matrix (AP-01 to AP-17)', () => {
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
      cookie: 'orbitox_operator_csrf=test_csrf_token; orbitox_customer_csrf=test_customer_csrf',
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    (globalThis as any).document = originalDocument;
  });

  it('AP-01: One successful update -> UI, document and server store agree completely', async () => {
    const server = new FakeAuthoritativeServerStore(DEFAULT_TEST_APPEARANCE);
    globalThis.fetch = (url, init) => server.handleFetch(url, init);

    const toasts: ToastNotification[] = [];
    const controller = new AppearancePersistenceController({
      initialAppearance: DEFAULT_TEST_APPEARANCE,
      onToast: (t) => toasts.push(t),
    });
    controller.syncDocument();

    await controller.updatePreferences({
      accent: 'emerald',
      radius: 24,
    });

    // Invariant: UI state === server-persisted state
    assert.deepEqual(controller.currentAppearance, server.persistedPreferences);
    assert.equal(controller.currentAppearance.accent, 'emerald');
    assert.equal(controller.currentAppearance.radius, 24);
    assert.equal(domAttributes.get('data-accent'), 'emerald');
    assert.equal(domAttributes.get('data-radius'), '24');
    assert.equal(controller.isSaving, false);
    assert.equal(server.maxSimultaneousPutCount, 1);
    assert.equal(toasts.length, 1);
    assert.equal(toasts[0]?.variant, 'success');
  });

  it('AP-02: HTTP 401 Unauthorized -> Preferences recover correctly to last confirmed state', async () => {
    const server = new FakeAuthoritativeServerStore(DEFAULT_TEST_APPEARANCE);
    server.onPut = () =>
      new Response(JSON.stringify({ error: { message: 'Session expired' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    globalThis.fetch = (url, init) => server.handleFetch(url, init);

    const toasts: ToastNotification[] = [];
    const controller = new AppearancePersistenceController({
      initialAppearance: DEFAULT_TEST_APPEARANCE,
      onToast: (t) => toasts.push(t),
    });

    await controller.updatePreferences({ accent: 'ruby' });

    assert.deepEqual(controller.currentAppearance, DEFAULT_TEST_APPEARANCE);
    assert.equal(domAttributes.get('data-accent'), 'ocean');
    assert.equal(controller.isSaving, false);
    assert.equal(toasts.length, 1);
    assert.equal(toasts[0]?.variant, 'error');
    assert.ok(toasts[0]?.description.includes('Session expired'));
  });

  it('AP-03: HTTP 400/422 Validation Error -> Rejection is surfaced and state restored', async () => {
    const server = new FakeAuthoritativeServerStore(DEFAULT_TEST_APPEARANCE);
    server.onPut = () =>
      new Response(JSON.stringify({ error: { message: 'Invalid corner radius: 99' } }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      });
    globalThis.fetch = (url, init) => server.handleFetch(url, init);

    const toasts: ToastNotification[] = [];
    const controller = new AppearancePersistenceController({
      initialAppearance: DEFAULT_TEST_APPEARANCE,
      onToast: (t) => toasts.push(t),
    });

    await controller.updatePreferences({ radius: 28 });

    assert.deepEqual(controller.currentAppearance, DEFAULT_TEST_APPEARANCE);
    assert.equal(domAttributes.get('data-radius'), '16');
    assert.equal(controller.isSaving, false);
    assert.equal(toasts.length, 1);
    assert.equal(toasts[0]?.variant, 'error');
    assert.ok(toasts[0]?.description.includes('Invalid corner radius'));
  });

  it('AP-04: HTTP 500 Server Error -> No false success, error toast surfaced, rollback confirmed', async () => {
    const server = new FakeAuthoritativeServerStore(DEFAULT_TEST_APPEARANCE);
    server.onPut = () =>
      new Response(JSON.stringify({ error: { message: 'Database connection failed' } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    globalThis.fetch = (url, init) => server.handleFetch(url, init);

    const toasts: ToastNotification[] = [];
    const controller = new AppearancePersistenceController({
      initialAppearance: DEFAULT_TEST_APPEARANCE,
      onToast: (t) => toasts.push(t),
    });

    await controller.updatePreferences({ theme: 'dark' });

    assert.deepEqual(controller.currentAppearance, DEFAULT_TEST_APPEARANCE);
    assert.equal(domAttributes.get('data-theme'), 'light');
    assert.equal(controller.isSaving, false);
    assert.equal(toasts.length, 1);
    assert.equal(toasts[0]?.variant, 'error');
    assert.ok(toasts[0]?.description.includes('Database connection failed'));
  });

  it('AP-05: Network failure during PUT -> Authoritative GET reconciliation is attempted', async () => {
    const server = new FakeAuthoritativeServerStore(DEFAULT_TEST_APPEARANCE);
    let putAttempted = false;
    server.onPut = () => {
      putAttempted = true;
      throw new Error('ECONNRESET');
    };
    globalThis.fetch = (url, init) => server.handleFetch(url, init);

    const controller = new AppearancePersistenceController({
      initialAppearance: DEFAULT_TEST_APPEARANCE,
    });

    await controller.updatePreferences({ accent: 'violet' });

    assert.equal(putAttempted, true);
    // Reconciliation GET was triggered:
    assert.ok(server.totalGets >= 1);
    // Server store remained at default; UI and document reconciled to authoritative state
    assert.deepEqual(controller.currentAppearance, server.persistedPreferences);
    assert.equal(domAttributes.get('data-accent'), 'ocean');
    assert.equal(controller.isSaving, false);
  });

  it('AP-06: Two rapid preference changes -> Only ONE PUT runs at a time (single-writer invariant)', async () => {
    const server = new FakeAuthoritativeServerStore(DEFAULT_TEST_APPEARANCE);
    let resolveFirstPut: (res: Response) => void;
    const firstPutPromise = new Promise<Response>((resolve) => {
      resolveFirstPut = resolve;
    });

    let putCallIndex = 0;
    server.onPut = (payload) => {
      putCallIndex += 1;
      if (putCallIndex === 1) {
        return firstPutPromise;
      }
      server.persistedPreferences = { ...payload };
      return new Response(JSON.stringify({ success: true, appearance: payload }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    globalThis.fetch = (url, init) => server.handleFetch(url, init);

    const controller = new AppearancePersistenceController({
      initialAppearance: DEFAULT_TEST_APPEARANCE,
    });

    // Fire two rapid preference changes concurrently
    const p1 = controller.updatePreferences({ accent: 'emerald' });
    const p2 = controller.updatePreferences({ radius: 24 });

    // Assert that while PUT 1 is running, PUT 2 has NOT launched concurrently
    assert.equal(server.activePutCount, 1);
    assert.equal(server.maxSimultaneousPutCount, 1);
    assert.equal(controller.isSaving, true);

    // Resolve first PUT
    server.persistedPreferences = { ...DEFAULT_TEST_APPEARANCE, accent: 'emerald' };
    resolveFirstPut!(
      new Response(JSON.stringify({ success: true, appearance: server.persistedPreferences }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await Promise.all([p1, p2]);

    // Invariant: Max simultaneous in-flight PUT was exactly 1
    assert.equal(server.maxSimultaneousPutCount, 1);
    assert.equal(controller.isSaving, false);
    // Final browser appearance === final server-persisted appearance
    assert.deepEqual(controller.currentAppearance, server.persistedPreferences);
    assert.equal(server.persistedPreferences.accent, 'emerald');
    assert.equal(server.persistedPreferences.radius, 24);
  });

  it('AP-07: Three rapid changes -> Intermediate states are safely coalesced into newest snapshot', async () => {
    const server = new FakeAuthoritativeServerStore(DEFAULT_TEST_APPEARANCE);
    let resolveFirstPut: (res: Response) => void;
    const firstPutPromise = new Promise<Response>((resolve) => {
      resolveFirstPut = resolve;
    });

    let putCount = 0;
    server.onPut = (payload) => {
      putCount += 1;
      if (putCount === 1) {
        return firstPutPromise;
      }
      server.persistedPreferences = { ...payload };
      return new Response(JSON.stringify({ success: true, appearance: payload }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    globalThis.fetch = (url, init) => server.handleFetch(url, init);

    const controller = new AppearancePersistenceController({
      initialAppearance: DEFAULT_TEST_APPEARANCE,
    });

    // Dispatch 1st change
    const p1 = controller.updatePreferences({ accent: 'saffron' });
    // Dispatch 2nd and 3rd rapid changes while 1st is in-flight
    const p2 = controller.updatePreferences({ density: 'compact' });
    const p3 = controller.updatePreferences({ radius: 32 });

    assert.equal(server.activePutCount, 1);

    // Release 1st PUT
    server.persistedPreferences = { ...DEFAULT_TEST_APPEARANCE, accent: 'saffron' };
    resolveFirstPut!(
      new Response(JSON.stringify({ success: true, appearance: server.persistedPreferences }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await Promise.all([p1, p2, p3]);

    // Total PUTs should be exactly 2 (1 initial + 1 coalesced for the 2nd & 3rd changes)
    assert.equal(server.totalPuts, 2);
    assert.equal(server.maxSimultaneousPutCount, 1);
    assert.deepEqual(controller.currentAppearance, server.persistedPreferences);
    assert.equal(server.persistedPreferences.accent, 'saffron');
    assert.equal(server.persistedPreferences.density, 'compact');
    assert.equal(server.persistedPreferences.radius, 32);
  });

  it('AP-08: First request fails, newer state is queued -> Newer desired state is NOT rolled back', async () => {
    const server = new FakeAuthoritativeServerStore(DEFAULT_TEST_APPEARANCE);
    let resolveFirstPut: (res: Response) => void;
    const firstPutPromise = new Promise<Response>((resolve) => {
      resolveFirstPut = resolve;
    });

    let putCount = 0;
    server.onPut = (payload) => {
      putCount += 1;
      if (putCount === 1) {
        return firstPutPromise; // will fail with 500
      }
      server.persistedPreferences = { ...payload };
      return new Response(JSON.stringify({ success: true, appearance: payload }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    globalThis.fetch = (url, init) => server.handleFetch(url, init);

    const toasts: ToastNotification[] = [];
    const controller = new AppearancePersistenceController({
      initialAppearance: DEFAULT_TEST_APPEARANCE,
      onToast: (t) => toasts.push(t),
    });

    const p1 = controller.updatePreferences({ accent: 'ruby' });
    const p2 = controller.updatePreferences({ radius: 28 });

    // Fail first request with HTTP 500
    resolveFirstPut!(
      new Response(JSON.stringify({ error: { message: 'Intermediate failure' } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await Promise.all([p1, p2]);

    // Newer desired state (radius 28, accent ruby) must succeed and not be rolled back
    assert.equal(controller.currentAppearance.accent, 'ruby');
    assert.equal(controller.currentAppearance.radius, 28);
    assert.deepEqual(controller.currentAppearance, server.persistedPreferences);
    // No error toast for the intermediate failure since the latest snapshot succeeded
    assert.equal(toasts.some((t) => t.variant === 'error'), false);
    assert.equal(toasts.some((t) => t.variant === 'success'), true);
  });

  it('AP-09: First request succeeds, newer request fails -> Recover to the first confirmed state', async () => {
    const server = new FakeAuthoritativeServerStore(DEFAULT_TEST_APPEARANCE);
    let resolveFirstPut: (res: Response) => void;
    const firstPutPromise = new Promise<Response>((resolve) => {
      resolveFirstPut = resolve;
    });

    let putCount = 0;
    server.onPut = (payload) => {
      putCount += 1;
      if (putCount === 1) {
        return firstPutPromise;
      }
      // 2nd request fails with 422
      return new Response(JSON.stringify({ error: { message: 'Invalid radius step' } }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    globalThis.fetch = (url, init) => server.handleFetch(url, init);

    const toasts: ToastNotification[] = [];
    const controller = new AppearancePersistenceController({
      initialAppearance: DEFAULT_TEST_APPEARANCE,
      onToast: (t) => toasts.push(t),
    });

    const p1 = controller.updatePreferences({ accent: 'coral' });
    const p2 = controller.updatePreferences({ radius: 24 });

    // Release 1st PUT with success
    server.persistedPreferences = { ...DEFAULT_TEST_APPEARANCE, accent: 'coral' };
    resolveFirstPut!(
      new Response(JSON.stringify({ success: true, appearance: server.persistedPreferences }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await Promise.all([p1, p2]);

    // Must recover to the 1st confirmed state (accent coral, radius 16)
    assert.equal(controller.currentAppearance.accent, 'coral');
    assert.equal(controller.currentAppearance.radius, 16);
    assert.deepEqual(controller.currentAppearance, server.persistedPreferences);
    assert.equal(toasts.some((t) => t.variant === 'error'), true);
  });

  it('AP-10: Newer save succeeds -> Final persisted state matches latest desired state', async () => {
    const server = new FakeAuthoritativeServerStore(DEFAULT_TEST_APPEARANCE);
    globalThis.fetch = (url, init) => server.handleFetch(url, init);

    const controller = new AppearancePersistenceController({
      initialAppearance: DEFAULT_TEST_APPEARANCE,
    });

    await controller.updatePreferences({ theme: 'dark' });
    await controller.updatePreferences({ accent: 'teal', radius: 32 });

    assert.equal(server.persistedPreferences.theme, 'dark');
    assert.equal(server.persistedPreferences.accent, 'teal');
    assert.equal(server.persistedPreferences.radius, 32);
    assert.deepEqual(controller.currentAppearance, server.persistedPreferences);
  });

  it('AP-11: Network response lost after server commit -> GET reconciliation determines authoritative state', async () => {
    const server = new FakeAuthoritativeServerStore(DEFAULT_TEST_APPEARANCE);
    server.onPut = (payload) => {
      // Server commits to database before connection breaks:
      server.persistedPreferences = { ...payload };
      throw new Error('Connection reset by peer');
    };
    globalThis.fetch = (url, init) => server.handleFetch(url, init);

    const controller = new AppearancePersistenceController({
      initialAppearance: DEFAULT_TEST_APPEARANCE,
    });

    await controller.updatePreferences({ accent: 'violet', radius: 20 });

    // GET reconciliation verified that server committed the change
    assert.equal(server.totalGets, 1);
    assert.deepEqual(controller.currentAppearance, server.persistedPreferences);
    assert.equal(controller.currentAppearance.accent, 'violet');
    assert.equal(controller.currentAppearance.radius, 20);
    assert.equal(domAttributes.get('data-accent'), 'violet');
    assert.equal(domAttributes.get('data-radius'), '20');
    assert.equal(controller.isUnconfirmed, false);
  });

  it('AP-12: Reconciliation GET fails -> State is clearly marked unconfirmed without false rollback claim', async () => {
    const server = new FakeAuthoritativeServerStore(DEFAULT_TEST_APPEARANCE);
    server.onPut = () => {
      throw new Error('Offline');
    };
    server.onGet = () => {
      throw new Error('Offline');
    };
    globalThis.fetch = (url, init) => server.handleFetch(url, init);

    const toasts: ToastNotification[] = [];
    const controller = new AppearancePersistenceController({
      initialAppearance: DEFAULT_TEST_APPEARANCE,
      onToast: (t) => toasts.push(t),
    });

    await controller.updatePreferences({ accent: 'sunflower' });

    assert.equal(controller.isUnconfirmed, true);
    assert.equal(controller.isSaving, false);
    // Desired state retained in UI
    assert.equal(controller.currentAppearance.accent, 'sunflower');
    // Warning toast shown with retry instruction
    assert.equal(toasts.length, 1);
    assert.equal(toasts[0]?.variant, 'warning');
    assert.ok(toasts[0]?.title.includes('unconfirmed'));
  });

  it('AP-13: All requests finish -> isSaving becomes false', async () => {
    const server = new FakeAuthoritativeServerStore(DEFAULT_TEST_APPEARANCE);
    globalThis.fetch = (url, init) => server.handleFetch(url, init);

    const controller = new AppearancePersistenceController({
      initialAppearance: DEFAULT_TEST_APPEARANCE,
    });

    assert.equal(controller.isSaving, false);
    const savePromise = controller.updatePreferences({ accent: 'emerald' });
    assert.equal(controller.isSaving, true);
    await savePromise;
    assert.equal(controller.isSaving, false);
  });

  it('AP-14: Multiple requests remain pending -> isSaving remains true until complete drain', async () => {
    const server = new FakeAuthoritativeServerStore(DEFAULT_TEST_APPEARANCE);
    let resolvePut1: (res: Response) => void;
    let resolvePut2: (res: Response) => void;

    let count = 0;
    server.onPut = (payload) => {
      count += 1;
      if (count === 1) {
        return new Promise<Response>((res) => {
          resolvePut1 = res;
        });
      }
      return new Promise<Response>((res) => {
        resolvePut2 = res;
      });
    };
    globalThis.fetch = (url, init) => server.handleFetch(url, init);

    const controller = new AppearancePersistenceController({
      initialAppearance: DEFAULT_TEST_APPEARANCE,
    });

    const p1 = controller.updatePreferences({ accent: 'ruby' });
    const p2 = controller.updatePreferences({ radius: 24 });

    assert.equal(controller.isSaving, true);

    // Release 1st PUT
    resolvePut1!(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    await p1;

    // While 2nd PUT is running, isSaving MUST remain true
    assert.equal(controller.isSaving, true);

    // Release 2nd PUT
    resolvePut2!(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    await p2;

    assert.equal(controller.isSaving, false);
  });

  it('AP-15: Component unmounts during persistence -> Controller disposal suppresses stale callbacks', async () => {
    const server = new FakeAuthoritativeServerStore(DEFAULT_TEST_APPEARANCE);
    let resolvePut: (res: Response) => void;
    server.onPut = () =>
      new Promise<Response>((res) => {
        resolvePut = res;
      });
    globalThis.fetch = (url, init) => server.handleFetch(url, init);

    let stateCallbackCount = 0;
    let toastCallbackCount = 0;

    const controller = new AppearancePersistenceController({
      initialAppearance: DEFAULT_TEST_APPEARANCE,
      onToast: () => {
        toastCallbackCount += 1;
      },
      onStateChange: () => {
        stateCallbackCount += 1;
      },
    });

    const savePromise = controller.updatePreferences({ accent: 'coral' });
    assert.equal(stateCallbackCount, 2); // 1 optimistic + 1 isSaving: true

    // Component unmounts
    controller.dispose();

    // In-flight server request completes afterward
    resolvePut!(
      new Response(JSON.stringify({ success: true, appearance: controller.currentAppearance }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    await savePromise;

    // Callbacks to unmounted component were suppressed
    assert.equal(toastCallbackCount, 0);
  });

  it('AP-16: Customer persona -> Uses correct /api/v1/customer/me/appearance endpoint', async () => {
    const server = new FakeAuthoritativeServerStore(DEFAULT_TEST_APPEARANCE);
    globalThis.fetch = (url, init) => server.handleFetch(url, init);

    const controller = new AppearancePersistenceController({
      initialAppearance: DEFAULT_TEST_APPEARANCE,
      apiEndpoint: '/api/v1/customer/me/appearance',
    });

    await controller.updatePreferences({ accent: 'saffron' });

    assert.equal(server.lastRequestedUrl, '/api/v1/customer/me/appearance');
    assert.equal(server.persistedPreferences.accent, 'saffron');
  });

  it('AP-17: Operator persona -> Uses correct /api/v1/platform/me/appearance endpoint', async () => {
    const server = new FakeAuthoritativeServerStore(DEFAULT_TEST_APPEARANCE);
    globalThis.fetch = (url, init) => server.handleFetch(url, init);

    const controller = new AppearancePersistenceController({
      initialAppearance: DEFAULT_TEST_APPEARANCE,
      apiEndpoint: '/api/v1/platform/me/appearance',
    });

    await controller.updatePreferences({ accent: 'teal' });

    assert.equal(server.lastRequestedUrl, '/api/v1/platform/me/appearance');
    assert.equal(server.persistedPreferences.accent, 'teal');
  });

  it('verifies all seven document attributes are restored on failure', async () => {
    const server = new FakeAuthoritativeServerStore(DEFAULT_TEST_APPEARANCE);
    server.onPut = () =>
      new Response(JSON.stringify({ error: { message: 'Failed to update preferences' } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    globalThis.fetch = (url, init) => server.handleFetch(url, init);

    const controller = new AppearancePersistenceController({
      initialAppearance: DEFAULT_TEST_APPEARANCE,
    });

    await controller.updatePreferences({
      theme: 'dark',
      accent: 'coral',
      density: 'compact',
      radius: 32,
      smoothAnimations: false,
      boldFocusRings: true,
      compactSidebar: true,
    });

    // All seven attributes restored to initial confirmed state
    assert.equal(domAttributes.get('data-theme'), 'light');
    assert.equal(domAttributes.get('data-accent'), 'ocean');
    assert.equal(domAttributes.get('data-density'), 'standard');
    assert.equal(domAttributes.get('data-radius'), '16');
    assert.equal(domAttributes.get('data-motion'), 'smooth');
    assert.equal(domAttributes.get('data-focus'), 'default');
    assert.equal(domAttributes.get('data-sidebar'), 'default');
  });

  it('AP-18: First PUT fails with network error, newer update is queued -> Queue continues draining and persists newer update', async () => {
    const server = new FakeAuthoritativeServerStore(DEFAULT_TEST_APPEARANCE);
    let putAttempts = 0;
    server.onPut = (payload) => {
      putAttempts += 1;
      if (putAttempts === 1) {
        // First PUT fails with network error
        throw new Error('Network dropped during PUT 1');
      }
      // Second PUT succeeds and commits payload
      server.persistedPreferences = { ...payload };
      return new Response(JSON.stringify({ success: true, appearance: payload }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    // GET reconciliation returns the initial server state (before PUT 1)
    server.onGet = () =>
      new Response(JSON.stringify({ success: true, appearance: server.persistedPreferences }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    globalThis.fetch = (url, init) => server.handleFetch(url, init);

    const controller = new AppearancePersistenceController({
      initialAppearance: DEFAULT_TEST_APPEARANCE,
    });

    // Queue first update (rev 1)
    const p1 = controller.updatePreferences({ accent: 'emerald' });
    // Immediately queue second update (rev 2) while first PUT is in flight
    const p2 = controller.updatePreferences({ radius: 24 });

    // Await both promises
    await Promise.all([p1, p2]);

    // Invariant: Controller, document, and authoritative server store agree on revision 2
    assert.equal(putAttempts, 2, 'Must have attempted PUT 1 then drained PUT 2');
    assert.equal(server.persistedPreferences.accent, 'emerald');
    assert.equal(server.persistedPreferences.radius, 24);
    assert.equal(controller.currentAppearance.accent, 'emerald');
    assert.equal(controller.currentAppearance.radius, 24);
    assert.equal(domAttributes.get('data-accent'), 'emerald');
    assert.equal(domAttributes.get('data-radius'), '24');
    assert.equal(controller.isSaving, false);
    assert.equal(controller.isUnconfirmed, false);
  });

  it('React Strict Mode replay: Controller reactivates after unmount replay and persists preference changes', async () => {
    const server = new FakeAuthoritativeServerStore(DEFAULT_TEST_APPEARANCE);
    globalThis.fetch = (url, init) => server.handleFetch(url, init);

    const toasts: ToastNotification[] = [];
    const controller = new AppearancePersistenceController({
      initialAppearance: DEFAULT_TEST_APPEARANCE,
      onToast: (t) => toasts.push(t),
    });

    // Strict Mode effect setup 1
    controller.syncDocument();
    // Strict Mode effect cleanup 1 (disposes controller)
    controller.dispose();
    assert.equal(controller.isDisposed, true);

    // Strict Mode effect setup 2 (reactivates controller & syncs document)
    controller.activate({
      onToast: (t: ToastNotification) => toasts.push(t),
    });
    controller.syncDocument();
    assert.equal(controller.isDisposed, false);

    // User updates preference after Strict Mode remount
    await controller.updatePreferences({ accent: 'emerald' });

    assert.equal(server.persistedPreferences.accent, 'emerald');
    assert.equal(domAttributes.get('data-accent'), 'emerald');
    assert.equal(controller.currentAppearance.accent, 'emerald');
    assert.equal(toasts.length, 1);
    assert.equal(toasts[0]?.variant, 'success');
  });
});
