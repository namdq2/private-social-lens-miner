import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      '@angular-eslint/prefer-standalone': [
        'off'
      ],
      '@typescript-eslint/ban-ts-comment': [
        'off'
      ],
      '@typescript-eslint/no-inferrable-types': [
        'off'
      ],
      '@typescript-eslint/no-empty-function': [
        'warn'
      ],
      '@typescript-eslint/no-explicit-any': [
        'warn'
      ]
    },
  },
  {
    files: ['**/*.html'],
    // Override or add rules here
    rules: {
      '@angular-eslint/template/click-events-have-key-events': [
        'off'
      ],
      '@angular-eslint/template/interactive-supports-focus': [
        'off'
      ],
    },
  },
];
