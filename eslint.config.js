import globals from 'globals'

import pluginJs from '@eslint/js'
import pluginImport from 'eslint-plugin-import'
import pluginTs from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'

import vueParser from 'vue-eslint-parser'

export default [
  { files: ['**/*.{js,mjs,cjs,ts,vue}'] },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  pluginJs.configs.recommended,
  ...pluginTs.configs.recommended,
  pluginImport.flatConfigs.recommended,
  pluginImport.flatConfigs.typescript,
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: pluginTs.parser },
    },
  },
  {
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
      }],
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',

      'brace-style': ['error', '1tbs', {
        allowSingleLine: true,
      }],
      'comma-dangle': ['error', {
        arrays: 'always-multiline',
        exports: 'always-multiline',
        functions: 'never',
        imports: 'always-multiline',
        objects: 'always-multiline',
      }],
      'indent': ['error', 2, {
        'ignoreComments': true,
        'SwitchCase': 1,
      }],
      'keyword-spacing': ['error', {
        before: true,
        after: true,
        overrides: {
          catch: { before: true, after: true },
        },
      }],
      'linebreak-style': [2, 'unix'],
      'no-debugger': 'error',
      'no-empty': 'off',
      'no-multiple-empty-lines': ['error', {
        max: 1,
        maxBOF: 0,
        maxEOF: 0,
      }],
      'no-new-wrappers': 'error',
      'no-prototype-builtins': 'error',
      'no-shadow-restricted-names': 'error',
      'no-throw-literal': 'error',
      'no-trailing-spaces': ['error'],
      'no-unsafe-optional-chaining': 'off',
      'no-useless-escape': 'off',
      'object-curly-spacing': ['error', 'always'],
      'quotes': ['error', 'single'],
      'semi': ['error', 'never'],
      'space-infix-ops': ['error', { 'int32Hint': false }],

      'import/export': 'error',
      'import/newline-after-import': 'error',
      'import/no-absolute-path': 'error',
      'import/no-cycle': 'error',
      'import/no-duplicates': 'off',
      'import/no-empty-named-blocks': 'error',
      'import/no-named-as-default': 'off',
      'import/no-self-import': 'error',
      'import/no-unresolved': 'off',
      'import/no-useless-path-segments': 'error',
    },
  },
  {
    files: ['**/*.vue'],
    rules: {
      'indent': 'off',
      'vue/html-indent': ['error', 4, {
        alignAttributesVertically: true,
        attribute: 1,
        closeBracket: 0,
        ignores: [],
      }],
      'vue/max-attributes-per-line': ['error', {
        singleline: 4,
        multiline: {
          max: 1,
        },
      }],
      'vue/script-indent': ['error', 2, {
        baseIndent: 0,
        ignores: [],
        switchCase: 1,
      }],
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      'max-lines-per-function': 'off',
    },
  },
  { ignores: ['dist/*'] },
  { ignores: ['**/dist/*'] },
]
