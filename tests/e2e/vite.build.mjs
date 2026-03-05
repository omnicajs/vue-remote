import { build } from 'vite'
import { fileURLToPath } from 'node:url'
import { readdirSync } from 'node:fs'
import { rm } from 'node:fs/promises'

import vue from '@vitejs/plugin-vue'
import svgLoader from 'vite-svg-loader'

import path from 'node:path'
import process from 'node:process'

import { Timer, millisecondsToTime } from './timer.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const timer = new Timer()

const scan = source =>
  readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

const configure = (__case, filename) => ({
  configFile: false,
  build: {
    rollupOptions: {
      input: path.join(__case, filename + '.ts'),
      output: {
        format: 'es',
        entryFileNames: filename + '.js',
      },
    },
    outDir: path.join(__case, 'dist'),
    emptyOutDir: false,
    minify: false,
    sourcemap: true,
  },
  plugins: [svgLoader(), vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../..', 'src'),
      '~tests': path.resolve(__dirname, '../..', 'tests'),
    },
    extensions: ['.js', '.ts', '.vue'],
  },
  define: {
    preventAssignment: true,
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env.SERVER': JSON.stringify(process.env.SERVER || 'localhost'),
    __buildDate__: JSON.stringify(new Date()),
  },
})

try {
  for (const directory of scan(path.join(__dirname, 'cases'))) {
    if (!directory) continue

    const __case = path.join(__dirname, 'cases', directory)

    timer.start(directory)

    await rm(path.join(__case, 'dist'), { force: true, recursive: true })

    console.info(`clean dist directory ${directory} was completed`)
    console.info('host.ts and remote.ts builds have been started')

    await build(configure(__case, 'host'))
    await build(configure(__case, 'remote'))

    console.info(`host.ts and remote.ts builds were completed in ${millisecondsToTime(timer.end(directory))}`)
  }
} catch (e) {
  console.log(e)
}
