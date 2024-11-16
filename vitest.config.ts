import type { UserConfig } from 'vite'

import {
  defineConfig,
  mergeConfig,
} from 'vitest/config'

import { join } from 'node:path'

import vue from '@vitejs/plugin-vue'

const buildConfig = {
  resolve: {
    alias: {
      '@': join(__dirname, './src/'),
    },
  },
  plugins: [
    vue(),
  ],
} satisfies UserConfig

const testConfig = defineConfig({
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'istanbul',
      include: ['src/**'],
    },
  },
})

export default mergeConfig(
  buildConfig,
  testConfig
)
