import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cn } from '../src/utils/cn';

describe('Utility cn() Helper (B4)', () => {
  it('merges class names correctly', () => {
    assert.equal(cn('px-2', 'py-1'), 'px-2 py-1');
  });

  it('handles falsy, null, and undefined values cleanly', () => {
    assert.equal(cn('base', false && 'hidden', null, undefined, 'active'), 'base active');
  });

  it('deduplicates and resolves conflicting Tailwind classes using tailwind-merge', () => {
    // p-4 overridden by p-2
    assert.equal(cn('p-4', 'p-2'), 'p-2');
    // text-red-500 overridden by text-blue-500
    assert.equal(cn('text-red-500', 'text-blue-500'), 'text-blue-500');
  });

  it('supports object syntax and arrays', () => {
    assert.equal(cn(['btn', { 'btn-primary': true, 'btn-disabled': false }]), 'btn btn-primary');
  });
});

