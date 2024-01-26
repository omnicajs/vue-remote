import type {
  InputPluginOption,
  OutputOptions,
  RollupOptions,
} from 'rollup'

import path from 'node:path'
import url from 'node:url'

import clean from 'rollup-plugin-delete'
import typescript from '@rollup/plugin-typescript'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

const input = path.join(__dirname, '/src/index.ts')

const output: OutputOptions = {
  exports: 'named',
  dir: path.join(__dirname, '/dist'),
  sourcemap: true,
  globals: {
    vue: 'Vue',
  },
}

const plugins: InputPluginOption = [
  typescript({
    sourceMap: true,
  }),
]

export default [{
  input,
  output: {
    ...output,
    format: 'cjs',
    entryFileNames: 'index.cjs',
  },
  plugins: [
    clean({ targets: 'dist/*' }),
    ...plugins,
  ],
  external: ['@remote-ui/core', 'vue'],
}, {
  input,
  output: {
    ...output,
    format: 'esm',
    entryFileNames: 'index.mjs',
  },
  plugins,
  external: ['@remote-ui/core', 'vue'],
}] as RollupOptions[]