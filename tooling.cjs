/* eslint-disable @typescript-eslint/no-require-imports, import/newline-after-import */
'use strict'

const tooling = require('./dist/tooling.cjs')
const plugin = tooling.default ?? tooling.vueRemoteToolingPlugin

module.exports = plugin
module.exports.default = plugin

for (const key of Object.keys(tooling)) {
  if (!(key in module.exports)) {
    module.exports[key] = tooling[key]
  }
}
