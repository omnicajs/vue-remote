import {
  defineConfig,
  mergeConfig,
} from 'vitest/config'

import { playwright } from '@vitest/browser-playwright'
// @ts-ignore
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
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [
        { browser: 'chromium' },
        { browser: 'firefox' },
      ],
    },
  },
}))
