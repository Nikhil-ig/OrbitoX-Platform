import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import {
  classifyRoutePersona,
  createForwardHeaders,
  type PersonaRouteClass,
} from '@/middleware';
import {
  getPersonaDefaultAppearance,
  parseAppearanceCookie,
  type AppearancePreferences,
} from '@/server/appearance/appearance-service';

describe('TST-TOK-02: Persona-Specific Route & Station Default Resolution', () => {
  it('classifies all five authoritative personas correctly from pathname', () => {
    // Operator Console
    assert.equal(classifyRoutePersona('/console'), 'operator');
    assert.equal(classifyRoutePersona('/console/settings/appearance'), 'operator');
    assert.equal(classifyRoutePersona('/platform/tenants'), 'operator');

    // Staff Operational Stations
    assert.equal(classifyRoutePersona('/kds'), 'staff_operational');
    assert.equal(classifyRoutePersona('/kds/live'), 'staff_operational');
    assert.equal(classifyRoutePersona('/kitchen/display'), 'staff_operational');
    assert.equal(classifyRoutePersona('/host/floor-plan'), 'staff_operational');
    assert.equal(classifyRoutePersona('/waiter/tables'), 'staff_operational');
    assert.equal(classifyRoutePersona('/staff/schedule'), 'staff_operational');

    // Staff POS Station (explicit station override to light mode)
    assert.equal(classifyRoutePersona('/pos'), 'staff_pos');
    assert.equal(classifyRoutePersona('/pos/checkout'), 'staff_pos');

    // Product Owner Workspace
    assert.equal(classifyRoutePersona('/owner/branches'), 'owner');
    assert.equal(classifyRoutePersona('/restaurants/menu'), 'owner');

    // Customer Workspace
    assert.equal(classifyRoutePersona('/workspace/projects'), 'customer');
    assert.equal(classifyRoutePersona('/customer/billing'), 'customer');

    // Public / Auth / Diner
    assert.equal(classifyRoutePersona('/login'), 'public');
    assert.equal(classifyRoutePersona('/signup'), 'public');
    assert.equal(classifyRoutePersona('/auth/reset'), 'public');
    assert.equal(classifyRoutePersona('/menu/item-1'), 'public');
    assert.equal(classifyRoutePersona('/unknown-path'), 'public');
  });

  it('resolves explicit persona default moods correctly when appearance is unset', () => {
    const operator = getPersonaDefaultAppearance('operator');
    assert.equal(operator.theme, 'dark', 'Operator default must be dark');
    assert.equal(operator.density, 'compact', 'Operator density must be compact');

    const staffOp = getPersonaDefaultAppearance('staff_operational');
    assert.equal(staffOp.theme, 'dark', 'Staff operational default must be dark (S1, D9)');

    const staffPos = getPersonaDefaultAppearance('staff_pos');
    assert.equal(staffPos.theme, 'light', 'Staff POS default must be light (S2)');

    const owner = getPersonaDefaultAppearance('owner');
    assert.equal(owner.theme, 'light', 'Product Owner default must be light (R1-R6)');

    const customer = getPersonaDefaultAppearance('customer');
    assert.equal(customer.theme, 'light', 'Customer workspace default must be light (A2, U1)');

    const pub = getPersonaDefaultAppearance('public');
    assert.equal(pub.theme, 'light', 'Public default must be light (F1-F6)');
  });

  it('strips client-supplied spoofed headers and forwards trusted server persona headers', () => {
    const req = new NextRequest('http://localhost:3005/console/tenants', {
      headers: {
        'x-orbito-route-persona': 'customer', // Client attempting to spoof customer persona
        'x-orbito-station': 'admin-super-override', // Client attempting arbitrary station injection
      },
    });

    const forwardHeaders = createForwardHeaders(req);
    assert.equal(
      forwardHeaders.get('x-orbito-route-persona'),
      'operator',
      'Header must be overwritten with server-classified route persona'
    );
    assert.equal(
      forwardHeaders.get('x-orbito-station'),
      null,
      'Untrusted client station header must be stripped'
    );
  });

  it('allows authenticated station cookie values but rejects invalid injections', () => {
    // Valid station cookies
    for (const stationVal of ['pos', 'kds', 'host', 'waiter', 'dark', 'night']) {
      const req = new NextRequest('http://localhost:3005/pos', {
        headers: {
          cookie: `orbitox_station=${stationVal}`,
        },
      });
      const headers = createForwardHeaders(req);
      assert.equal(headers.get('x-orbito-station'), stationVal, `Station ${stationVal} must be allowed`);
    }

    // Invalid/injected station cookie
    const invalidReq = new NextRequest('http://localhost:3005/pos', {
      headers: {
        cookie: 'orbitox_station=root_admin;path=/',
      },
    });
    const invalidHeaders = createForwardHeaders(invalidReq);
    assert.equal(invalidHeaders.get('x-orbito-station'), null);
  });

  it('parses schema-valid cookies and falls back safely to persona default when corrupted', () => {
    // Valid cookie
    const validObj: AppearancePreferences = {
      theme: 'dark',
      accent: 'emerald',
      density: 'compact',
      radius: 12,
      smoothAnimations: true,
      boldFocusRings: true,
      compactSidebar: true,
    };
    const validCookie = encodeURIComponent(JSON.stringify(validObj));
    const parsedValid = parseAppearanceCookie(validCookie, 'customer');
    assert.equal(parsedValid.accent, 'emerald');
    assert.equal(parsedValid.radius, 12);

    // Corrupted JSON payload -> falls back to requested persona default
    const malformedCookie = '%7Bmalformed_json_here';
    const parsedMalformed = parseAppearanceCookie(malformedCookie, 'operator');
    assert.equal(parsedMalformed.theme, 'dark');
    assert.equal(parsedMalformed.density, 'compact');

    // Empty cookie -> falls back to requested persona default
    const parsedEmpty = parseAppearanceCookie(null, 'owner');
    assert.equal(parsedEmpty.theme, 'light');
  });
});
