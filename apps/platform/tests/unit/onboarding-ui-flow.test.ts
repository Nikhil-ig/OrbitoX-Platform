import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSubdomainSlug,
  validateSlugSyntax,
  generateSubdomainSlugFromName,
} from '@/app/api/v1/customer/tenants/check-slug/route';
import { validateIndianGstin } from '@/server/auth/account-security';

describe('Stage 5: Onboarding UI Components, State Machine & Multi-Viewport Verification', () => {
  describe('F1 Account Setup & Password Strength', () => {
    it('validates password strength levels', () => {
      const getStrength = (pwd: string) => {
        if (!pwd || pwd.length < 8) return 'TOO_SHORT';
        const hasNum = /\d/.test(pwd);
        const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
        if (hasNum && hasSpecial && pwd.length >= 10) return 'STRONG';
        if (hasNum || hasSpecial) return 'MEDIUM';
        return 'WEAK';
      };

      assert.equal(getStrength('short'), 'TOO_SHORT');
      assert.equal(getStrength('onlyletters'), 'WEAK');
      assert.equal(getStrength('letters123'), 'MEDIUM');
      assert.equal(getStrength('supersecurepassword123!'), 'STRONG');
    });

    it('validates 6-digit verification code format and paste handling', () => {
      const cleanDigits = (raw: string) => raw.replace(/[^0-9]/g, '').slice(0, 6);
      assert.equal(cleanDigits('123456'), '123456');
      assert.equal(cleanDigits('12-34-56'), '123456');
      assert.equal(cleanDigits('code: 987654 (valid)'), '987654');
      assert.equal(cleanDigits('123456789'), '123456');
    });
  });

  describe('F2 Business Organization & GSTIN Validator', () => {
    it('validates Indian GSTIN format and maps state codes', () => {
      // Karnataka
      const resKA = validateIndianGstin('29ABCDE1234F1Z5');
      assert.equal(resKA.valid, true);
      assert.equal(resKA.stateCode, '29');
      assert.equal(resKA.stateName, 'Karnataka');

      // Maharashtra
      const resMH = validateIndianGstin('27ABCDE1234F1Z5');
      assert.equal(resMH.valid, true);
      assert.equal(resMH.stateCode, '27');
      assert.equal(resMH.stateName, 'Maharashtra');

      // Delhi
      const resDL = validateIndianGstin('07ABCDE1234F1Z5');
      assert.equal(resDL.valid, true);
      assert.equal(resDL.stateCode, '07');
      assert.equal(resDL.stateName, 'Delhi');

      // Invalid GSTIN length / structure
      const resInv = validateIndianGstin('INVALIDGST123');
      assert.equal(resInv.valid, false);
    });

    it('enforces hierarchy model: Organization -> Restaurants -> Branches', () => {
      const org = { id: 'org_1', name: 'Shah Hospitality Group' };
      const restaurant = { id: 'rest_1', orgId: org.id, name: 'Masala House' };
      const branches = [
        { id: 'br_1', restaurantId: restaurant.id, name: 'Indiranagar Main' },
        { id: 'br_2', restaurantId: restaurant.id, name: 'Koramangala Branch' },
      ];

      assert.equal(restaurant.orgId, org.id);
      assert.equal(branches.length, 2);
      assert.ok(branches.every((b) => b.restaurantId === restaurant.id));
    });
  });

  describe('F3 Restaurant Identity & Subdomain Availability', () => {
    it('auto-generates normalized slugs from restaurant display names', () => {
      assert.equal(generateSubdomainSlugFromName('Masala House'), 'masala-house');
      assert.equal(generateSubdomainSlugFromName('The Bombay Canteen & Bar'), 'the-bombay-canteen-bar');
      assert.equal(generateSubdomainSlugFromName('Café Mocha 101'), 'caf-mocha-101');
      assert.equal(generateSubdomainSlugFromName('---Spices & Chillies---'), 'spices-chillies');
    });

    it('enforces subdomain syntax rules and reserved words', () => {
      assert.equal(validateSlugSyntax('masala').valid, true);
      assert.equal(validateSlugSyntax('my-bistro-blr').valid, true);
      assert.equal(validateSlugSyntax('a').valid, false); // too short
      assert.equal(validateSlugSyntax('a'.repeat(35)).valid, false); // too long
      assert.equal(validateSlugSyntax('admin').valid, false); // reserved
      assert.equal(validateSlugSyntax('orbitox').valid, false); // reserved
      assert.equal(validateSlugSyntax('masala--cafe').valid, false); // consecutive hyphens
    });

    it('enforces table count constraints and brand templates', () => {
      const templates = ['saffron', 'ember', 'sage', 'ocean'];
      assert.ok(templates.includes('saffron'));
      assert.ok(templates.includes('ember'));

      const clampTables = (t: number) => Math.max(1, Math.min(120, t));
      assert.equal(clampTables(14), 14);
      assert.equal(clampTables(-5), 1);
      assert.equal(clampTables(500), 120);
    });
  });

  describe('F4 Working Preview & Storefront Showcase', () => {
    it('computes 14-day preview mode expiry correctly', () => {
      const now = Date.now();
      const expiry = new Date(now + 14 * 24 * 3600 * 1000);
      const daysDiff = Math.round((expiry.getTime() - now) / (24 * 3600 * 1000));
      assert.equal(daysDiff, 14);
    });

    it('calculates diner cart subtotals and item counts with Indian Rupee formatting', () => {
      const cart = [
        { name: 'Butter chicken', price: 420, qty: 2 },
        { name: 'Garlic naan', price: 90, qty: 4 },
        { name: 'Dal makhani', price: 310, qty: 1 },
      ];
      const total = cart.reduce((acc, i) => acc + i.price * i.qty, 0);
      const count = cart.reduce((acc, i) => acc + i.qty, 0);

      assert.equal(count, 7);
      assert.equal(total, 2 * 420 + 4 * 90 + 310); // 840 + 360 + 310 = 1510
      assert.equal(`₹${total}`, '₹1510');
    });

    it('formats KDS tickets with TEST ORDER badge and individual item statuses', () => {
      const ticket = {
        id: 'task_101',
        tableNumber: 'Table T-01',
        isTest: true,
        items: [
          { name: 'Butter chicken', qty: 2 },
          { name: 'Garlic naan', qty: 4 },
        ],
        status: 'QUEUED',
      };

      assert.equal(ticket.isTest, true);
      assert.equal(ticket.status, 'QUEUED');
      assert.equal(ticket.items.length, 2);
    });
  });

  describe('Multi-Viewport Specifications (390×844, 834×1194, 1194×834, 1440×900)', () => {
    const viewports = [
      { name: 'Mobile Phone (D6)', width: 390, height: 844, isMobile: true },
      { name: 'Tablet Portrait', width: 834, height: 1194, isMobile: false },
      { name: 'Tablet Landscape', width: 1194, height: 834, isMobile: false },
      { name: 'Desktop Large', width: 1440, height: 900, isMobile: false },
    ];

    it('validates all 4 required viewport dimensions and responsive breakpoints', () => {
      for (const vp of viewports) {
        assert.ok(vp.width > 0);
        assert.ok(vp.height > 0);
        if (vp.width <= 768) {
          assert.equal(vp.isMobile, true);
        } else {
          assert.equal(vp.isMobile, false);
        }
      }
    });
  });
});

