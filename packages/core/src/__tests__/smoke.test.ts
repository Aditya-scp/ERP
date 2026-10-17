import { describe, it, expect } from 'vitest';
import { roundHalfUp, CORE_VERSION } from '../index';

describe('packages/core business calculations', () => {
  it('exports version constant', () => {
    expect(CORE_VERSION).toBe('1.0.0');
  });

  it('performs half-up rounding away from zero', () => {
    expect(roundHalfUp(1883.25)).toBe(1883);
    expect(roundHalfUp(249.5)).toBe(250);
    expect(roundHalfUp(-1883.25)).toBe(-1883);
    expect(roundHalfUp(-249.5)).toBe(-250);
  });
});
