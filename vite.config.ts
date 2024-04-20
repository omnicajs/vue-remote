import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

import path from 'node:path'
import url from 'node:url'

import {
  dependencies,
  peerDependencies,
} from './package.json'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    lib: {
      name: '@omnicajs/vue-remote',
      formats: ['es', 'cjs'],
      entry: {
        host: path.resolve(__dirname, './src/vue/host/index.ts'),
        remote: path.resolve(__dirname, './src/vue/remote/index.ts'),
      },
      fileName: (format, name) => `${name}.${{
        es: 'mjs',
        cjs: 'cjs',
      }[format]}`,
    },
    minify: false,
    rollupOptions: {
      external: [
        ...Object.keys(dependencies),
        ...Object.keys(peerDependencies),
      ],
      output: {
        exports: 'named',
        dir: path.join(__dirname, '/dist'),
        globals: { vue: 'Vue' },
      },
    },
  },

  plugins: [dts({ rollupTypes: true })],
})