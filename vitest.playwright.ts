import {
  defineConfig,
  mergeConfig,
} from 'vitest/config'

import { playwright } from '@vitest/browser-playwright'

import vue from '@vitejs/plugin-vue'

import basic from './vite.config.basic'

export default mergeConfig(basic, defineConfig({
  plugins: [
    vue(),
  ],

  test: {
    include: ['tests/**/*.e2e.ts'],
    exclude: [
      'tests/e2e/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-web/**',
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      reportsDirectory: 'coverage/playwright',
      reporter: ['json'],
    },
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: process.argv.includes('--coverage')
        ? [{ browser: 'chromium' }]
        : [
          { browser: 'chromium' },
          { browser: 'firefox' },
        ],
    },
  },
}))
