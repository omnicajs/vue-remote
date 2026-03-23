import type { PluginOption } from 'vite'

import {
  hasRemoteSfcAttribute,
  isRemoteModuleRequest,
  rewriteRemoteEventHelperImports,
  stripQuery,
} from './bundler'

export const vueRemoteVitePlugin = (): PluginOption => {
  const remoteVueFiles = new Set<string>()

  return [
    {
      name: '@omnicajs/vue-remote/vite-scan',
      enforce: 'pre',

      transform (code, id) {
        const fileName = stripQuery(id)

        if (/\.vue$/i.test(fileName) && !id.includes('?vue') && hasRemoteSfcAttribute(code)) {
          remoteVueFiles.add(fileName)
        }

        return null
      },
    },
    {
      name: '@omnicajs/vue-remote/vite',
      enforce: 'post',

      transform (code, id) {
        const fileName = stripQuery(id)

        if (/\.remote\.vue$/i.test(fileName)) {
          remoteVueFiles.add(fileName)
        }

        const resourceQuery = id.slice(fileName.length)
        if (!isRemoteModuleRequest(fileName, resourceQuery, remoteVueFiles)) {
          return null
        }

        return rewriteRemoteEventHelperImports(code)
      },
    },
  ]
}

export default vueRemoteVitePlugin
