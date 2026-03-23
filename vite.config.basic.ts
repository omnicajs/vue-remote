import { defineConfig } from 'vite'

import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@omnicajs/vue-remote/host': path.resolve(__dirname, './src/vue/host/index.ts'),
      '@omnicajs/vue-remote/remote': path.resolve(__dirname, './src/vue/remote/index.ts'),
      '@omnicajs/vue-remote/tooling': path.resolve(__dirname, './src/vue/tooling/index.ts'),
      '@omnicajs/vue-remote/vite-plugin': path.resolve(__dirname, './src/vue/vite-plugin.ts'),
      '@omnicajs/vue-remote/webpack-loader': path.resolve(__dirname, './src/vue/webpack-loader.ts'),
    },
  },
})
