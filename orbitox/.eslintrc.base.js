/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  rules: {
    // Rule F1 — No `any` in TypeScript
    '@typescript-eslint/no-explicit-any': 'error',

    // Rule F2 — No magic numbers (allow common ones)
    'no-magic-numbers': [
      'warn',
      {
        ignore: [0, 1, -1, 2, 100],
        ignoreArrayIndexes: true,
        ignoreDefaultValues: true,
      },
    ],

    // Import ordering
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],

    // No unused variables (allow underscore prefix)
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],

    // Enforce explicit return types on public methods
    '@typescript-eslint/explicit-function-return-type': [
      'warn',
      { allowExpressions: true, allowTypedFunctionExpressions: true },
    ],

    // No console in production code
    'no-console': ['warn', { allow: ['warn', 'error'] }],

    // Prefer const
    'prefer-const': 'error',

    // No var
    'no-var': 'error',
  },
  ignorePatterns: ['dist', '.next', 'node_modules', 'coverage'],
};
