import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/**
 * Flat ESLint config.
 *
 * Beyond the usual correctness rules, this file enforces two of the five
 * architectural invariants (see ARCHITECTURE.md and `npm run test:arch`).
 * Lint is used for the two that are *about imports*, because a lint rule gives
 * immediate editor feedback that a test cannot. The other three are assertions
 * about content and derived state, and they live in
 * src/domain/__tests__/boundaries.test.ts.
 *
 * Layer boundaries are expressed once here and reused, so the content layer and
 * the app layer cannot drift apart in their understanding of the rules.
 */

/** Shared: the UI may never reach into the content layer directly. */
const NO_DIRECT_CONTENT_IMPORTS = {
  patterns: [
    {
      group: ['@content/*', '@content/**', '**/content/*', '**/content/**'],
      message:
        'UI code must not import from content/. Read the curriculum through the registry in src/content/ (selectors). See ARCHITECTURE.md.',
    },
  ],
}

/** Shared: the domain layer stays pure — no React, no app, no features, no content. */
const DOMAIN_ISOLATION = {
  patterns: [
    {
      group: ['react', 'react-dom', 'react/*', 'react-dom/*'],
      message: 'src/domain/ must stay framework-free so it can be tested without a DOM.',
    },
    {
      group: ['@/app/*', '**/src/app/*', '@/features/*', '**/src/features/*'],
      message:
        'src/domain/ must not depend on the app or feature layers. Dependencies point one way.',
    },
    {
      group: ['@content/*', '@content/**', '**/content/*', '**/content/**'],
      message:
        'src/domain/ takes plain data as arguments rather than importing content. Composition happens in src/app/ hooks.',
    },
  ],
}

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'playwright-report/**'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx,mts}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },

  // Invariant 1: layer boundaries for the UI.
  {
    files: ['src/components/**/*.{ts,tsx}', 'src/features/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', NO_DIRECT_CONTENT_IMPORTS] },
  },

  // Invariant 2: domain purity.
  {
    files: ['src/domain/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', DOMAIN_ISOLATION] },
  },

  // Tests and scripts are allowed to reach anything; they are the verification layer.
  {
    files: ['**/__tests__/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}', 'scripts/**/*.ts'],
    rules: { 'no-restricted-imports': 'off', 'no-console': 'off' },
  },
)
