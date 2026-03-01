import {
  defineConfig,
  mergeConfig,
} from 'vitest/config'

// @ts-ignore
import vue from '@vitejs/plugin-vue'

import basic from './vite.config.basic'

export default mergeConfig(basic, defineConfig({
  plugins: [
    vue(),
  ],

  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      reportsDirectory: 'coverage/vitest',
      reporter: ['json'],
    },
  },
}))
