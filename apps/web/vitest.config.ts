import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'app/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/e2e/**', '**/dist/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app'),
      '@erp/config': path.resolve(__dirname, '../../packages/config/src'),
      '@erp/core': path.resolve(__dirname, '../../packages/core/src'),
      '@erp/types': path.resolve(__dirname, '../../packages/types/src'),
      '@erp/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
});
