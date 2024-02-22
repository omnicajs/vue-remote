import type {
  InputPluginOption,
  OutputOptions,
  RollupOptions,
} from 'rollup'

import vue from 'rollup-plugin-vue'
import resolve from '@rollup/plugin-node-resolve'

import path from 'node:path'
import url from 'node:url'

import clean from 'rollup-plugin-delete'
import typescript from 'rollup-plugin-typescript2'
import commonjs from '@rollup/plugin-commonjs'
import replace from '@rollup/plugin-replace'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

const output: OutputOptions = {
  exports: 'named',
  dir: path.join(__dirname, '/dist'),
  sourcemap: true,
}

const plugins: InputPluginOption = [
  replace({
    preventAssignment: true,
    'process.env.NODE_ENV': JSON.stringify('production'),
    __buildDate__: () => JSON.stringify(new Date()),
  }),
  commonjs(),
  vue(),
  resolve({
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.vue'],
  }),
  typescript(),

]

export default [{
  input: path.join(__dirname, 'host.ts'),
  output: {
    ...output,
    format: 'esm',
    entryFileNames: 'host.js',
  },
  
  plugins: [
    clean({ targets: path.join(__dirname, '/dist'), }),
      ...plugins,
  ],
}, 
{
  input: path.join(__dirname, 'remote.ts'),
  output: {
    ...output,
    format: 'esm',
    entryFileNames: 'remote.js',
  },
  plugins,
}] as RollupOptions[]