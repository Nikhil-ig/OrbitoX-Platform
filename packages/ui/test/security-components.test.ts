import './dom-setup';
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { render, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import { MaskedField } from '../src/components/masked-field';
import { CopyOnceSecret } from '../src/components/copy-once-secret';
import { DangerousAction } from '../src/components/dangerous-action';

afterEach(() => {
  cleanup();
});

describe('Security Components Guard (B3.7 / F-5)', () => {
  describe('MaskedField (PHI/PII Zero DOM Leak & Auto-Hide)', () => {
    it('never leaks unrevealed secret into SSR or DOM markup and hides Copy button by default', async () => {
      const secretPhi = 'AADHAAR-9999-8888-7777';
      let capturedReason = '';

      const ssrHtml = ReactDOMServer.renderToString(
        React.createElement(MaskedField, {
          maskedPreview: '•••• •••• 7777',
          onReveal: async (reason: string) => {
            capturedReason = reason;
            return secretPhi;
          },
        })
      );
      assert.equal(ssrHtml.includes(secretPhi), false);
      assert.equal(ssrHtml.includes('•••• •••• 7777'), true);

      const { getByText, getByLabelText, queryByText, queryByLabelText } = render(
        React.createElement(MaskedField, {
          maskedPreview: '•••• •••• 7777',
          onReveal: async (reason: string) => {
            capturedReason = reason;
            return secretPhi;
          },
        })
      );

      // Before reveal: secret is absent from DOM
      assert.equal(queryByText(secretPhi), null);

      // Click Reveal -> enter reason -> confirm
      fireEvent.click(getByText('Reveal'));
      const textarea = getByLabelText('Access Reason:');
      fireEvent.change(textarea, { target: { value: 'Clinical chart audit #402' } });
      await act(async () => {
        fireEvent.click(getByText('Confirm'));
      });

      await waitFor(() => {
        assert.ok(getByText(secretPhi));
      });
      assert.equal(capturedReason, 'Clinical chart audit #402');

      // allowCopy defaults to false -> Copy button must NOT be rendered for revealed PHI
      assert.equal(queryByLabelText('Copy'), null);
    });

    it('auto-hides revealed PHI after 60s timer, on window blur, and on document visibilitychange (F-5.2)', async (t) => {
      const secretPhi = 'PATIENT-PHI-SECRET-441';
      let revealCount = 0;

      const { getByText, getByLabelText, queryByText } = render(
        React.createElement(MaskedField, {
          maskedPreview: '•••• •••• •441',
          onReveal: async () => {
            revealCount++;
            return secretPhi;
          },
        })
      );

      // 1. Auto-hide via 60s fake timer
      t.mock.timers.enable({ apis: ['setTimeout'] });

      fireEvent.click(getByText('Reveal'));
      fireEvent.change(getByLabelText('Access Reason:'), { target: { value: 'Emergency lookup' } });
      await act(async () => {
        fireEvent.click(getByText('Confirm'));
      });
      assert.ok(getByText(secretPhi));

      // At 59,999ms, still visible
      act(() => {
        t.mock.timers.tick(59999);
      });
      assert.ok(getByText(secretPhi));

      // At 60,000ms, auto-hidden from DOM
      act(() => {
        t.mock.timers.tick(1);
      });
      assert.equal(queryByText(secretPhi), null);
      t.mock.timers.reset();

      // 2. Auto-hide on document visibilitychange === 'hidden'
      fireEvent.click(getByText('Reveal'));
      fireEvent.change(getByLabelText('Access Reason:'), { target: { value: 'Second lookup audit' } });
      await act(async () => {
        fireEvent.click(getByText('Confirm'));
      });
      await waitFor(() => {
        assert.ok(getByText(secretPhi));
      });

      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      act(() => {
        document.dispatchEvent(new window.Event('visibilitychange'));
      });
      assert.equal(queryByText(secretPhi), null);
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });

      // 3. Auto-hide on window blur
      fireEvent.click(getByText('Reveal'));
      fireEvent.change(getByLabelText('Access Reason:'), { target: { value: 'Third lookup audit' } });
      await act(async () => {
        fireEvent.click(getByText('Confirm'));
      });
      await waitFor(() => {
        assert.ok(getByText(secretPhi));
      });

      act(() => {
        window.dispatchEvent(new window.Event('blur'));
      });
      assert.equal(queryByText(secretPhi), null);
      assert.equal(revealCount, 3);
    });
  });

  describe('CopyOnceSecret (Volatile Memory Wipe & Non-Replayability)', () => {
    it('displays secret once, wipes permanently on confirm even on re-render with identical props, and never replays after unmount (F-5.3)', () => {
      const secretA = 'orb_test_once_confirm_wipe_001';
      let ackCalled = 0;

      const { getByText, getByRole, queryByText, rerender, unmount } = render(
        React.createElement(CopyOnceSecret, {
          secret: secretA,
          title: 'Production Ingress Key',
          onAcknowledged: () => {
            ackCalled++;
          },
        })
      );

      // Initially visible
      assert.ok(getByText(secretA));

      // Confirm button disabled until checkbox ticked
      const confirmBtn = getByText('Confirm') as HTMLButtonElement;
      assert.equal(confirmBtn.disabled, true);

      // Check acknowledgement & confirm
      fireEvent.click(getByRole('checkbox'));
      assert.equal(confirmBtn.disabled, false);
      fireEvent.click(confirmBtn);

      assert.equal(ackCalled, 1);
      assert.equal(queryByText(secretA), null);
      assert.ok(getByText('Secret Acknowledged'));

      // Re-rendering with exact same props must NEVER reveal secret again
      rerender(
        React.createElement(CopyOnceSecret, {
          secret: secretA,
          title: 'Production Ingress Key',
        })
      );
      assert.equal(queryByText(secretA), null);
      assert.ok(getByText('Secret Acknowledged'));
      unmount();

      // Unmount test: rendering a new instance with same unmounted secret never reveals it again
      const secretB = 'orb_test_once_unmount_wipe_002';
      const firstMount = render(
        React.createElement(CopyOnceSecret, {
          secret: secretB,
          title: 'Temporary Key',
        })
      );
      assert.ok(firstMount.getByText(secretB));
      firstMount.unmount();

      const secondMount = render(
        React.createElement(CopyOnceSecret, {
          secret: secretB,
          title: 'Temporary Key',
        })
      );
      assert.equal(secondMount.queryByText(secretB), null);
      assert.ok(secondMount.getByText('Secret Acknowledged'));
    });
  });

  describe('DangerousAction (Typed Confirmation, Audited Reason & Step-up Gate)', () => {
    it('never calls onConfirm if typed confirmation fails, reason is empty, or step-up auth rejects/returns false (F-5.4)', async () => {
      let confirmCount = 0;
      let confirmedPayload: { reason?: string } | null = null;
      let stepUpMode: 'false' | 'reject' | 'true' = 'false';

      const { getByText, getByPlaceholderText } = render(
        React.createElement(DangerousAction, {
          trigger: React.createElement('button', { type: 'button' }, 'Delete Branch'),
          title: 'Delete Production Branch',
          description: 'This permanently wipes branch records.',
          expectedConfirmationText: 'DELETE tenant-alpha',
          requireReason: true,
          onStepUpAuth: async () => {
            if (stepUpMode === 'reject') throw new Error('MFA assertion rejected');
            return stepUpMode === 'true';
          },
          onConfirm: (payload) => {
            confirmCount++;
            confirmedPayload = payload;
          },
        })
      );

      // Open dialog
      fireEvent.click(getByText('Delete Branch'));

      // Fill matching confirmation text & valid reason, BEFORE step-up passes
      fireEvent.change(getByPlaceholderText('DELETE tenant-alpha'), {
        target: { value: 'DELETE tenant-alpha' },
      });
      fireEvent.change(getByPlaceholderText('Enter mandatory audit justification...'), {
        target: { value: 'Compliance offboarding request #99' },
      });

      const confirmBtn = getByText('Confirm') as HTMLButtonElement;
      assert.equal(confirmBtn.disabled, true);

      // Attempt failed step-up auth (returns false)
      await act(async () => {
        fireEvent.click(getByText('Authenticate'));
      });
      assert.equal(confirmBtn.disabled, true);
      fireEvent.click(confirmBtn);
      assert.equal(confirmCount, 0);

      // Attempt rejected step-up auth (promise rejects)
      stepUpMode = 'reject';
      await act(async () => {
        fireEvent.click(getByText('Authenticate'));
      });
      assert.equal(confirmBtn.disabled, true);
      fireEvent.click(confirmBtn);
      assert.equal(confirmCount, 0);

      // Now allow step-up auth to succeed
      stepUpMode = 'true';
      await act(async () => {
        fireEvent.click(getByText('Authenticate'));
      });
      await waitFor(() => {
        assert.ok(getByText('Verified'));
      });

      // Clear reason -> confirm stays disabled
      fireEvent.change(getByPlaceholderText('Enter mandatory audit justification...'), {
        target: { value: 'no' },
      });
      assert.equal(confirmBtn.disabled, true);
      fireEvent.click(confirmBtn);
      assert.equal(confirmCount, 0);

      // Provide valid reason + mismatched text -> stays disabled
      fireEvent.change(getByPlaceholderText('Enter mandatory audit justification...'), {
        target: { value: 'Compliance offboarding request #99' },
      });
      fireEvent.change(getByPlaceholderText('DELETE tenant-alpha'), {
        target: { value: 'DELETE wrong-tenant' },
      });
      assert.equal(confirmBtn.disabled, true);

      // Fix confirmation text -> Confirm executes onConfirm exactly once
      fireEvent.change(getByPlaceholderText('DELETE tenant-alpha'), {
        target: { value: 'DELETE tenant-alpha' },
      });
      assert.equal(confirmBtn.disabled, false);

      await act(async () => {
        fireEvent.click(confirmBtn);
      });

      assert.equal(confirmCount, 1);
      assert.deepEqual(confirmedPayload, { reason: 'Compliance offboarding request #99' });
    });
  });
});
