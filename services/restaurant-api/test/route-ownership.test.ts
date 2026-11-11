process.env.NODE_ENV = 'test';
process.env.STORAGE_DRIVER = 'json';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'path';
import * as fs from 'fs';

describe('RestaurantOS Route Ownership & Disjoint Boundary Invariants (B-2)', () => {
  const fixturePath = path.resolve(__dirname, 'fixtures/restaurant-routes-d7f9de5.json');
  let expectedRoutes: any[];
  let getAllRegisteredRoutes: any;

  before(async () => {
    expectedRoutes = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const routerMod = await import('../src/http/router');
    getAllRegisteredRoutes = routerMod.getAllRegisteredRoutes;
  });

  after(async () => {
    const contextMod = await import('../src/http/context');
    contextMod.eventLoopMonitor?.stop?.();
    if (contextMod.pgEventListener) {
      await contextMod.pgEventListener.stop?.();
    }
  });

  it('1. builds the route table from all modules and confirms every route has exactly ONE owning module', () => {
    const registered = getAllRegisteredRoutes();
    const routeOccurrences = new Map<string, string[]>();

    for (const r of registered) {
      const key = `${r.method} ${r.path}`;
      const existing = routeOccurrences.get(key) || [];
      existing.push(r.module);
      routeOccurrences.set(key, existing);
    }

    const duplicates: Array<{ key: string; modules: string[] }> = [];
    for (const [key, modules] of routeOccurrences.entries()) {
      if (modules.length > 1) {
        duplicates.push({ key, modules });
      }
    }

    assert.equal(
      duplicates.length,
      0,
      `Detected duplicated route registrations across modules:\n${JSON.stringify(duplicates, null, 2)}`
    );
  });

  it('2. verifies route set equals the baseline route set at d7f9de5 with zero missing or unexpected routes', () => {
    const registered = getAllRegisteredRoutes();
    const registeredMap = new Map(registered.map((r) => [`${r.method} ${r.path}`, r.module]));
    const expectedMap = new Map(expectedRoutes.map((r) => [`${r.method} ${r.path}`, r.module]));

    const missingRoutes: string[] = [];
    for (const key of expectedMap.keys()) {
      if (!registeredMap.has(key)) {
        missingRoutes.push(key);
      }
    }

    const unexpectedRoutes: string[] = [];
    for (const key of registeredMap.keys()) {
      if (!expectedMap.has(key)) {
        unexpectedRoutes.push(key);
      }
    }

    assert.equal(
      missingRoutes.length,
      0,
      `Missing routes expected from d7f9de5 baseline:\n${JSON.stringify(missingRoutes, null, 2)}`
    );
    assert.equal(
      unexpectedRoutes.length,
      0,
      `Unexpected routes registered not present in d7f9de5 baseline:\n${JSON.stringify(unexpectedRoutes, null, 2)}`
    );
    assert.equal(registered.length, expectedRoutes.length, `Expected exactly ${expectedRoutes.length} routes, found ${registered.length}`);
  });

  it('3. verifies module assignment for every route matches domain classification', () => {
    const registered = getAllRegisteredRoutes();
    const expectedMap = new Map(expectedRoutes.map((r) => [`${r.method} ${r.path}`, r.module]));

    const mismatchedModules: Array<{ key: string; expected: string; actual: string }> = [];
    for (const r of registered) {
      const key = `${r.method} ${r.path}`;
      const expectedModule = expectedMap.get(key);
      if (expectedModule && expectedModule !== r.module) {
        mismatchedModules.push({ key, expected: expectedModule, actual: r.module });
      }
    }

    assert.equal(
      mismatchedModules.length,
      0,
      `Mismatched route module ownership:\n${JSON.stringify(mismatchedModules, null, 2)}`
    );
  });
});

