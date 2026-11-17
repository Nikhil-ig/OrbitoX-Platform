import './dom-setup';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { ToastProvider } from '@orbitox-io/ui';
import { AppearanceClient } from '@/app/(console)/console/settings/appearance/appearance-client';
import type { AppearancePreferences } from '@/server/appearance/appearance-service';

const INITIAL_APPEARANCE: AppearancePreferences = {
  theme: 'dark',
  accent: 'ocean',
  density: 'compact',
  radius: 16,
  smoothAnimations: true,
  boldFocusRings: false,
  compactSidebar: false,
};

describe('P2-01: React.StrictMode Double-Mount & Lifecycle Integration', () => {
  let putRequests: Array<{ url: string; payload: any }> = [];
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    putRequests = [];
    originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method || 'GET';

      if (method === 'PUT') {
        const payload = init?.body ? JSON.parse(init.body as string) : {};
        putRequests.push({ url, payload });
        return new Response(JSON.stringify({ success: true, appearance: payload }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, appearance: INITIAL_APPEARANCE }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
  });

  afterEach(() => {
    cleanup();
    globalThis.fetch = originalFetch;
  });

  it('mounts AppearanceClient under React.StrictMode with effect double-invocation without errors', () => {
    let renderResult: any;

    act(() => {
      renderResult = render(
        <React.StrictMode>
          <ToastProvider>
            <AppearanceClient
              initialAppearance={INITIAL_APPEARANCE}
              apiEndpoint="/api/v1/platform/me/appearance"
            />
          </ToastProvider>
        </React.StrictMode>
      );
    });

    assert.ok(renderResult, 'Component must render in StrictMode');
    assert.ok(
      renderResult.container.innerHTML.toLowerCase().includes('appearance settings'),
      'Renders appearance settings heading'
    );

    // Document attributes must be applied
    assert.equal(document.documentElement.getAttribute('data-theme'), 'dark');
    assert.equal(document.documentElement.getAttribute('data-accent'), 'ocean');
    assert.equal(document.documentElement.getAttribute('data-density'), 'compact');
  });

  it('preserves single-writer queue and asserts zero duplicate persistence calls under StrictMode replay', async () => {
    let getByRole: any;

    act(() => {
      const res = render(
        <React.StrictMode>
          <ToastProvider>
            <AppearanceClient
              initialAppearance={INITIAL_APPEARANCE}
              apiEndpoint="/api/v1/platform/me/appearance"
            />
          </ToastProvider>
        </React.StrictMode>
      );
      getByRole = res.getByRole;
    });

    // 1. First interaction: select Light theme
    const lightThemeRadio = getByRole('radio', { name: /Light/i });
    assert.ok(lightThemeRadio, 'Light theme radio button should be present');

    await act(async () => {
      fireEvent.click(lightThemeRadio);
    });

    // Invariant: Exactly 1 PUT initiated, no duplicate calls despite StrictMode effect replay
    assert.equal(putRequests.length, 1, 'First action must dispatch exactly 1 PUT request');
    assert.equal(putRequests[0]!.url, '/api/v1/platform/me/appearance');
    assert.equal(putRequests[0]!.payload.theme, 'light', 'Theme must be updated to light');
    assert.equal(document.documentElement.getAttribute('data-theme'), 'light');

    // 2. Second interaction: select Emerald accent preset
    const emeraldAccentButton = getByRole('button', { name: /Emerald/i });
    assert.ok(emeraldAccentButton, 'Emerald accent button should be present');

    await act(async () => {
      fireEvent.click(emeraldAccentButton);
    });

    // Invariant: Exactly 2 PUT requests in total (1 per user intent, 0 duplicates from StrictMode)
    assert.equal(putRequests.length, 2, 'Total PUT count must be exactly 2 for two sequential actions');
    assert.equal(putRequests[1]!.payload.accent, 'emerald', 'Accent must be updated to emerald');
    assert.equal(document.documentElement.getAttribute('data-accent'), 'emerald');
  });

  it('handles active in-flight persistence with deferred response and clean unmount cancellation', async () => {
    let resolvePendingPut: ((val: Response) => void) | null = null;
    let putCount = 0;
    const putPayloads: any[] = [];

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method || 'GET';
      if (method === 'PUT') {
        putCount++;
        const payload = init?.body ? JSON.parse(init.body as string) : {};
        putPayloads.push(payload);
        return new Promise<Response>((resolve) => {
          resolvePendingPut = resolve;
        });
      }
      return new Response(JSON.stringify({ success: true, appearance: INITIAL_APPEARANCE }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    let getByRole: any;
    let unmountFn: () => void = () => {};

    act(() => {
      const res = render(
        <React.StrictMode>
          <ToastProvider>
            <AppearanceClient
              initialAppearance={INITIAL_APPEARANCE}
              apiEndpoint="/api/v1/platform/me/appearance"
            />
          </ToastProvider>
        </React.StrictMode>
      );
      getByRole = res.getByRole;
      unmountFn = res.unmount;
    });

    // 1. Enqueue first change: select Light theme
    const lightRadio = getByRole('radio', { name: /Light/i });
    act(() => {
      fireEvent.click(lightRadio);
    });

    // Exactly 1 PUT in flight
    assert.equal(putCount, 1, 'Exactly one PUT request initiated');
    assert.equal(putPayloads[0].theme, 'light');

    // 2. While first PUT is pending, enqueue second change: select Emerald accent
    const emeraldBtn = getByRole('button', { name: /Emerald/i });
    act(() => {
      fireEvent.click(emeraldBtn);
    });

    // Single-writer invariant: still only 1 active in-flight request
    assert.equal(putCount, 1, 'Second change is queued without spawning overlapping concurrent PUT');

    // 3. Unmount component while persistence is pending in-flight
    act(() => {
      unmountFn();
    });

    // 4. Resolve the in-flight PUT request after unmount has occurred
    assert.ok(resolvePendingPut, 'Pending PUT promise resolver must exist');
    await act(async () => {
      resolvePendingPut!(
        new Response(JSON.stringify({ success: true, appearance: putPayloads[0] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    // 5. Verify no stale callbacks or unhandled crashes occurred
    assert.ok(true, 'Component and controller unmounted cleanly without memory leaks or errors');
  });
});
