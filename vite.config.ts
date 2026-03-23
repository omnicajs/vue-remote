import type { ExtractorMessage } from '@microsoft/api-extractor'
import type { LibraryFormats } from 'vite'

import { ExtractorLogLevel } from '@microsoft/api-extractor'

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
        tooling: path.resolve(__dirname, './src/vue/tooling/index.ts'),
        'vite-plugin': path.resolve(__dirname, './src/vue/vite-plugin.ts'),
        'webpack-loader': path.resolve(__dirname, './src/vue/webpack-loader.ts'),
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
    rollupOptions: {
      messageCallback(message: ExtractorMessage) {
        // API Extractor still bundles TypeScript 5.8.x, so TS 5.9 projects
        // currently get a noisy compatibility notice on every entrypoint.
        if (message.messageId === 'console-compiler-version-notice') {
          message.logLevel = ExtractorLogLevel.None
        }
      },
    },
  })],
}))
