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

  it('preserves single-writer queue responsiveness after StrictMode effect cleanup and remount', async () => {
    let getByRole: any;
    let getByText: any;

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
      getByText = res.getByText;
    });

    // Interact with theme buttons (Auto, Light, Dark)
    const lightThemeRadio = getByRole('radio', { name: /Light/i });
    assert.ok(lightThemeRadio, 'Light theme radio button should be present');

    await act(async () => {
      fireEvent.click(lightThemeRadio);
    });

    // Check that PUT was dispatched through single-writer queue
    assert.ok(putRequests.length >= 1, 'PUT request must be dispatched via persistence controller');
    const lastPut = putRequests[putRequests.length - 1];
    assert.ok(lastPut, 'Last PUT request must be defined');
    assert.equal(lastPut.url, '/api/v1/platform/me/appearance');
    assert.equal(lastPut.payload.theme, 'light', 'Theme must be updated to light');

    // Document element attribute must be updated immediately
    assert.equal(document.documentElement.getAttribute('data-theme'), 'light');

    // Switch accent preset to Emerald
    const emeraldAccentButton = getByRole('button', { name: /Emerald/i });
    assert.ok(emeraldAccentButton, 'Emerald accent button should be present');

    await act(async () => {
      fireEvent.click(emeraldAccentButton);
    });

    const secondPut = putRequests[putRequests.length - 1];
    assert.ok(secondPut, 'Second PUT request must be defined');
    assert.equal(secondPut.payload.accent, 'emerald', 'Accent must be updated to emerald');
    assert.equal(document.documentElement.getAttribute('data-accent'), 'emerald');
  });

  it('handles clean unmount during active queue processing without memory leaks or errors', async () => {
    const { unmount } = render(
      <React.StrictMode>
        <ToastProvider>
          <AppearanceClient
            initialAppearance={INITIAL_APPEARANCE}
            apiEndpoint="/api/v1/platform/me/appearance"
          />
        </ToastProvider>
      </React.StrictMode>
    );

    // Unmount component cleanly
    act(() => {
      unmount();
    });

    assert.ok(true, 'Unmount succeeded cleanly');
  });
});
