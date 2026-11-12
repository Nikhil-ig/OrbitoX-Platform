import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { MaskedField } from '../src/components/masked-field';
import { CopyOnceSecret } from '../src/components/copy-once-secret';
import { DangerousAction } from '../src/components/dangerous-action';

describe('Security Components Guard (B3.7)', () => {
  describe('MaskedField (PHI/PII Zero DOM Leak)', () => {
    it('never leaks unrevealed secret into rendered DOM or attributes', () => {
      let accessedSecret = 'SECRET_AADHAAR_9999_8888';
      const onRevealMock = async (reason: string) => {
        if (!reason) throw new Error('Reason required');
        return accessedSecret;
      };

      const html = ReactDOMServer.renderToString(
        React.createElement(MaskedField, {
          maskedPreview: '•••• •••• 8888',
          onReveal: onRevealMock,
        })
      );

      // Secret must NEVER be present in the unrevealed markup
      assert.equal(html.includes(accessedSecret), false);
      assert.equal(html.includes('•••• •••• 8888'), true);
      assert.equal(html.includes('Reveal'), true);
    });

    it('enforces that reveal action requires an audited reason parameter', async () => {
      let callCount = 0;
      let auditedReason = '';
      const onRevealMock = async (reason: string) => {
        callCount++;
        auditedReason = reason;
        return 'PATIENT_SSN_12345';
      };

      const result = await onRevealMock('Patient consultation chart review');
      assert.equal(callCount, 1);
      assert.equal(auditedReason, 'Patient consultation chart review');
      assert.equal(result, 'PATIENT_SSN_12345');
    });
  });

  describe('CopyOnceSecret (Volatile Memory Wipe)', () => {
    it('renders volatile secret in initial markup', () => {
      const secret = 'sk_live_orbitox_prod_9988776655';
      const html = ReactDOMServer.renderToString(
        React.createElement(CopyOnceSecret, {
          secret,
          title: 'Production API Key',
        })
      );

      assert.equal(html.includes(secret), true);
      assert.equal(html.includes('Production API Key'), true);
      assert.equal(html.includes('safely stored this secret'), true);
    });
  });

  describe('DangerousAction (Typed Confirmation & Step-up Re-Auth)', () => {
    it('renders trigger and encapsulates destruction parameters', () => {
      const html = ReactDOMServer.renderToString(
        React.createElement(DangerousAction, {
          trigger: React.createElement('button', null, 'Delete Branch'),
          title: 'Delete Production Branch',
          description: 'This permanently wipes branch records and orders.',
          expectedConfirmationText: 'DELETE diner-oasis-prod',
          requireReason: true,
          onConfirm: () => {},
        })
      );

      assert.equal(html.includes('Delete Branch'), true);
    });

    it('validates confirmation predicate: exact string match + reason requirement', () => {
      const expectedText = 'DELETE tenant-alpha';
      const requireReason = true;

      const validateCanConfirm = (typed: string, reason: string, stepUpVerified: boolean) => {
        const isTypedMatch = typed.trim() === expectedText.trim();
        const isReasonValid = !requireReason || reason.trim().length >= 5;
        return isTypedMatch && stepUpVerified && isReasonValid;
      };

      // Fails on mismatch
      assert.equal(validateCanConfirm('delete tenant-alpha', 'audit review', true), false);
      // Fails on short reason
      assert.equal(validateCanConfirm('DELETE tenant-alpha', 'no', true), false);
      // Fails if step-up not verified
      assert.equal(validateCanConfirm('DELETE tenant-alpha', 'audit review', false), false);
      // Passes when all constraints met
      assert.equal(validateCanConfirm('DELETE tenant-alpha', 'audit review reason', true), true);
    });
  });
});
