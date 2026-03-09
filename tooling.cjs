/* eslint-disable @typescript-eslint/no-require-imports, import/newline-after-import */
'use strict'

const fs = require('node:fs')
const path = require('node:path')

const sourceToolingPath = path.join(__dirname, 'src/vue/tooling/index.ts')
const tooling = fs.existsSync(sourceToolingPath)
  ? require(sourceToolingPath)
  : require('./dist/tooling.cjs')
const plugin = tooling.default ?? tooling.vueRemoteToolingPlugin

module.exports = plugin
module.exports.default = plugin

for (const key of Object.keys(tooling)) {
  if (!(key in module.exports)) {
    module.exports[key] = tooling[key]
  }
}
