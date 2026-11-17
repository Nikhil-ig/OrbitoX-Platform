import './dom-setup';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getPersonaDefaultAppearance,
  parseAppearanceCookie,
  serializeAppearanceCookie,
  type AppearancePreferences,
} from '@/server/appearance/appearance-service';

describe('Layer 2: Database Outage Degradation & Station Context Hierarchy (P2 Item 2)', () => {
  const CUSTOM_SAVED_COOKIE: AppearancePreferences = {
    theme: 'dark',
    accent: 'ruby',
    density: 'relaxed',
    radius: 32,
    smoothAnimations: true,
    boldFocusRings: true,
    compactSidebar: true,
  };

  it('degrades to validated cookie when database is unreachable/timed out', () => {
    // Simulated DB failure: appearance is null (from caught DB error)
    const dbAppearance: AppearancePreferences | null = null;
    const rawCookie = serializeAppearanceCookie(CUSTOM_SAVED_COOKIE);

    // Resolver hierarchy
    const resolved: AppearancePreferences = dbAppearance || parseAppearanceCookie(rawCookie, 'operator');

    assert.equal(resolved.accent, 'ruby', 'Must recover accent from validated cookie during DB outage');
    assert.equal(resolved.theme, 'dark');
    assert.equal(resolved.radius, 32);
    assert.equal(resolved.boldFocusRings, true);
  });

  it('degrades to persona default when both database and cookie are absent', () => {
    const dbAppearance: AppearancePreferences | null = null;
    const rawCookie = null;

    const resolved: AppearancePreferences = dbAppearance || parseAppearanceCookie(rawCookie, 'operator');

    const opDefault = getPersonaDefaultAppearance('operator');
    assert.deepEqual(resolved, opDefault, 'Must fall back to operator persona default');
    assert.equal(resolved.theme, 'dark');
    assert.equal(resolved.density, 'compact');
    assert.equal(resolved.radius, 16);
  });

  it('degrades to persona default when cookie is corrupted during DB outage', () => {
    const dbAppearance: AppearancePreferences | null = null;
    const corruptCookie = 'corrupt-not-json';

    const resolved: AppearancePreferences = dbAppearance || parseAppearanceCookie(corruptCookie, 'customer');

    const custDefault = getPersonaDefaultAppearance('customer');
    assert.deepEqual(resolved, custDefault, 'Must fall back to customer persona default on corrupted cookie');
    assert.equal(resolved.theme, 'light');
    assert.equal(resolved.radius, 28);
  });

  it('applies station context dark override to /pos route when x-orbito-station indicates dark terminal', () => {
    // Default /pos without station hint -> light
    const defaultPos = getPersonaDefaultAppearance('staff_pos');
    assert.equal(defaultPos.theme, 'light', 'POS without station hint must default to light mood');

    // /pos with station hint 'kds' -> overrides to dark mood
    const kdsPos = getPersonaDefaultAppearance('staff_pos', 'kds');
    assert.equal(kdsPos.theme, 'dark', 'POS with station=kds must override default to dark mood');

    // /pos with station hint 'night' -> overrides to dark mood
    const nightPos = getPersonaDefaultAppearance('staff_pos', 'night');
    assert.equal(nightPos.theme, 'dark', 'POS with station=night must override default to dark mood');

    // Parse cookie with station hint fallback
    const resolvedStation = parseAppearanceCookie(null, 'staff_pos', 'kds');
    assert.equal(resolvedStation.theme, 'dark', 'parseAppearanceCookie must preserve station dark override');
  });
});
