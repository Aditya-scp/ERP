import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/.expo/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/*.d.ts',
      '**/supabase/.temp/**',
      '**/supabase/.branches/**'
    ],
  },
  {
    files: ['packages/core/**/*.ts', 'packages/types/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'packages/core and packages/types must be runtime agnostic.' },
        { name: 'document', message: 'packages/core and packages/types must be runtime agnostic.' },
        { name: 'localStorage', message: 'packages/core and packages/types must be runtime agnostic.' },
        { name: 'navigator', message: 'packages/core and packages/types must be runtime agnostic.' },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react-dom/*'],
              message: 'packages/core and packages/types must not import React DOM APIs.'
            },
            {
              group: ['react-native', 'react-native/*', 'expo', 'expo-*', 'nativewind'],
              message: 'packages/core and packages/types must not import React Native or Expo APIs.'
            }
          ]
        }
      ]
    }
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error'
    }
  }
);
