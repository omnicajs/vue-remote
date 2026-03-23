import {
  hasRemoteSfcAttribute,
  isRemoteModuleRequest,
  rewriteRemoteEventHelperImports,
  stripQuery,
} from './bundler'

const remoteVueFiles = new Set<string>()

type LoaderContext = {
  resourcePath?: string;
  resourceQuery?: string;
}

export const transformRemoteEventHelpersForWebpack = (
  source: string,
  resourcePath: string,
  resourceQuery = ''
) => {
  if (/\.vue$/i.test(resourcePath) && resourceQuery.length === 0 && hasRemoteSfcAttribute(source)) {
    remoteVueFiles.add(resourcePath)
    return source
  }

  const fileName = stripQuery(resourcePath)

  if (!isRemoteModuleRequest(fileName, resourceQuery, remoteVueFiles)) {
    return source
  }

  return rewriteRemoteEventHelperImports(source) ?? source
}

export default function vueRemoteWebpackLoader(this: LoaderContext, source: string) {
  return transformRemoteEventHelpersForWebpack(
    source,
    this.resourcePath ?? '',
    this.resourceQuery ?? ''
  )
}
