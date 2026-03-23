import {
  defineConfig,
  mergeConfig,
} from 'vitest/config'

// @ts-ignore
import vue from '@vitejs/plugin-vue'
import svg from 'vite-svg-loader'

import basic from './vite.config.basic'
import { vueRemoteVitePlugin } from './src/vue/vite-plugin'

export default mergeConfig(basic, defineConfig({
  plugins: [
    svg(),
    vue(),
    vueRemoteVitePlugin(),
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
