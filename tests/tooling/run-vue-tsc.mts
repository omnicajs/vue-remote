import {
  createGlobalTypesWriter,
  createParsedCommandLine,
  createVueLanguagePlugin,
} from '@vue/language-core'
import { runTsc } from '@volar/typescript/lib/quickstart/runTsc.js'
import vueRemoteToolingPlugin from '../../src/vue/tooling/index.ts'

import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const configFileName = path.resolve(currentDirectory, './tsconfig.json')
const tscPath = require.resolve('typescript/lib/tsc')

process.argv = [
  process.argv[0],
  tscPath,
  '--project',
  configFileName,
  '--noEmit',
]

runTsc(tscPath, {
  extraSupportedExtensions: ['.vue'],
  extraExtensionsToRemove: ['.vue'],
}, (typescript, options) => {
  const parsed = createParsedCommandLine(typescript, typescript.sys, configFileName)
  const vueOptions = {
    ...parsed.vueOptions,
    plugins: [
      ...parsed.vueOptions.plugins,
      vueRemoteToolingPlugin,
    ],
  }

  vueOptions.globalTypesPath = createGlobalTypesWriter(vueOptions, typescript.sys.writeFile)

  return [
    createVueLanguagePlugin(typescript, options.options, vueOptions, id => id),
  ]
})
