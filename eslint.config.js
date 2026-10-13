import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import security from 'eslint-plugin-security';
import promise from 'eslint-plugin-promise';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import n from 'eslint-plugin-n';
import importX from 'eslint-plugin-import-x';
import jsdoc from 'eslint-plugin-jsdoc';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'generated/**',
      '*.config.js',
      '*.config.mjs',
    ],
  },

  {
    files: ['**/*.{ts,tsx}'],

    plugins: {
      jsdoc,
    },

    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      security.configs.recommended,
      promise.configs['flat/recommended'],
      sonarjs.configs.recommended,
      unicorn.configs.recommended,
      n.configs['flat/recommended'],
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
    ],

    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: true,
      },
    },

    settings: {
      'import-x/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },

    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-expect-error': 'allow-with-description',
          minimumDescriptionLength: 10,
        },
      ],

      'no-debugger': 'error',
      'no-eval': 'error',
      'no-constant-condition': 'error',
      'no-unreachable': 'error',
      'no-duplicate-imports': 'error',
      'no-warning-comments': ['error', { terms: ['TODO', 'FIXME', 'HACK'], location: 'start' }],
      'no-console': 'error',
      'no-constructor-return': 'error',
      'no-inner-declarations': 'error',
      'no-promise-executor-return': 'error',
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unreachable-loop': 'error',
      'no-use-before-define': 'error',
      'no-useless-assignment': 'error',
      'block-scoped-var': 'error',
      'default-case': 'error',
      eqeqeq: ['error', 'always'],
      'max-depth': ['error', 4],
      'max-lines': ['error', { max: 1000, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 100, skipBlankLines: true, skipComments: true }],
      'max-nested-callbacks': ['error', 4],
      'max-params': ['error', 10],
      'no-bitwise': 'error',
      'no-continue': 'error',
      'no-else-return': 'error',
      'no-eq-null': 'error',
      'no-inline-comments': 'error',
      'no-lone-blocks': 'error',
      'no-lonely-if': 'error',
      'no-loop-func': 'error',
      'no-nested-ternary': 'error',
      'no-unneeded-ternary': 'error',
      'no-useless-concat': 'error',
      'no-useless-rename': 'error',
      'no-useless-return': 'error',
      'no-var': 'error',
      'dot-notation': ['error', { allowPattern: '^[a-z]+(-[a-z]+)+$' }],
      'default-param-last': ['error'],

      'promise/always-return': 'error',
      'promise/no-nesting': 'error',
      'promise/no-return-in-finally': 'error',
      'promise/catch-or-return': 'error',

      'import-x/no-duplicates': 'error',
      'import-x/no-unresolved': 'error',

      'sonarjs/cognitive-complexity': ['error', 15],
      'sonarjs/no-duplicate-string': ['warn', { threshold: 3 }],

      'jsdoc/require-jsdoc': [
        'error',
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: true,
            FunctionExpression: true,
          },
        },
      ],
      'jsdoc/require-description': 'error',
      'jsdoc/require-param': 'error',
      'jsdoc/require-returns': 'error',
    },
  },

  {
    files: ['*.config.js', '*.config.mjs'],
    languageOptions: {
      globals: globals.node,
    },
    extends: [js.configs.recommended],
  },

  {
    files: ['src/**/tests/**/*.test.ts', 'vitest.config.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },

  prettier,
);
