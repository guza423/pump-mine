import js from '@eslint/js';
import parser from '@typescript-eslint/parser';
import globals from 'globals';
import react from 'eslint-plugin-react';

export default [
  {
    ignores: ['dist/**', 'android/**', 'node_modules/**'],
  },
  {
    files: ['src/**/*.tsx'],
    languageOptions: {
      parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: { react },
    settings: { react: { version: 'detect' } },
    rules: {
      ...js.configs.recommended.rules,
      'no-undef': 'error',
      'react/jsx-no-undef': 'error',
      'no-unused-vars': 'off',
      'no-empty': 'off',
      'no-useless-escape': 'off',
    },
  },
];
