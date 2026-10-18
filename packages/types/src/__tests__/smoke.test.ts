import { describe, it, expect } from 'vitest';
import type { Role } from '../index';

describe('packages/types', () => {
  it('exports base role types', () => {
    const roles: Role[] = ['super_admin', 'school_admin', 'accountant', 'teacher', 'student', 'parent'];
    expect(roles).toHaveLength(6);
  });
});
