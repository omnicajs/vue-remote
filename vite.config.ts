import type { LibraryFormats } from 'vite'

import { defineConfig } from 'vite'
import { mergeConfig } from 'vite'

import dts from 'vite-plugin-dts'

import basic from './vite.config.basic'
import path from 'node:path'

import {
  dependencies,
  peerDependencies,
} from './package.json'

const formats = ['es', 'cjs'] satisfies LibraryFormats[]

export default mergeConfig(basic, defineConfig({
  build: {
    lib: {
      name: '@omnicajs/vue-remote',
      entry: {
        host: path.resolve(__dirname, './src/vue/host/index.ts'),
        remote: path.resolve(__dirname, './src/vue/remote/index.ts'),
      },
    },
    minify: false,
    rollupOptions: {
      external: [
        ...Object.keys(dependencies),
        ...Object.keys(peerDependencies),
      ],
      output: formats.map((format) => {
        const ext = format === 'es' ? 'mjs' : 'cjs'
        return {
          format,
          exports: 'named',
          dir: path.join(__dirname, '/dist'),
          globals: { vue: 'Vue' },
          entryFileNames: `[name].${ext}`,
          chunkFileNames: `common.${ext}`,
        }
      }),
    },
  },

  plugins: [dts({
    include: ['src'],
    rollupTypes: true,
  })],
}))
