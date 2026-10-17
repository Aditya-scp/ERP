import { describe, it, expect } from 'vitest';
import { BRAND } from '@erp/config/brand';

describe('apps/web smoke test', () => {
  it('imports shared branding configuration successfully', () => {
    expect(BRAND.name).toBe('ERP');
  });
});
