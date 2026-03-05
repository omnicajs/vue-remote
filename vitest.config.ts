import {
  defineConfig,
  mergeConfig,
} from 'vitest/config'

// @ts-ignore
import vue from '@vitejs/plugin-vue'
import svg from 'vite-svg-loader'

import basic from './vite.config.basic'

export default mergeConfig(basic, defineConfig({
  plugins: [
    svg(),
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
