const REMOTE_SFC_PATTERN = /\.remote\.vue$/i
const REMOTE_SCRIPT_PATTERN = /\.remote\.(?:c|m)?(?:j|t)sx?$/i
const REMOTE_EVENT_HELPERS = new Set(['withKeys', 'withModifiers'])
const REMOTE_EVENT_HELPERS_IMPORT = '@omnicajs/vue-remote/remote'

const isRemoteScript = (fileName: string) => {
  return REMOTE_SCRIPT_PATTERN.test(fileName)
}

export const stripQuery = (id: string) => {
  return id.replace(/\?.*$/, '')
}

export const hasRemoteSfcAttribute = (code: string) => {
  return /<script\b[^>]*\bremote\b/i.test(code)
}

export const isRemoteModuleRequest = (
  fileName: string,
  resourceQuery = '',
  remoteVueFiles: ReadonlySet<string> = new Set()
) => {
  if (remoteVueFiles.has(fileName) || REMOTE_SFC_PATTERN.test(fileName) || isRemoteScript(fileName)) {
    return true
  }

  return /\.vue$/i.test(fileName)
    && resourceQuery.includes('vue')
    && remoteVueFiles.has(fileName)
}

const parseImportSpecifier = (specifier: string) => {
  const match = /^([$\w]+)(?:\s+as\s+([$\w]+))?$/.exec(specifier.trim())

  if (match == null) {
    return undefined
  }

  return {
    imported: match[1],
    raw: specifier.trim(),
  }
}

export const rewriteRemoteEventHelperImports = (code: string) => {
  let changed = false
  const helperImports = new Set<string>()

  const transformed = code.replace(
    /import\s*{([^}]+)}\s*from\s*(['"])vue\2\s*;?/g,
    (statement: string, specifiers: string, quote: string) => {
      const parsed = specifiers
        .split(',')
        .map((specifier: string) => parseImportSpecifier(specifier))
        .filter((value): value is NonNullable<typeof value> => value != null)

      const keep = parsed.filter(({ imported }: { imported: string }) => !REMOTE_EVENT_HELPERS.has(imported))
      const extract = parsed.filter(({ imported }: { imported: string }) => REMOTE_EVENT_HELPERS.has(imported))

      if (extract.length === 0) {
        return statement
      }

      changed = true
      extract.forEach(({ raw }: { raw: string }) => helperImports.add(raw))

      return keep.length > 0
        ? `import { ${keep.map(({ raw }: { raw: string }) => raw).join(', ')} } from ${quote}vue${quote}\n`
        : ''
    }
  )

  if (!changed || helperImports.size === 0) {
    return null
  }

  return `import { ${[...helperImports].join(', ')} } from '${REMOTE_EVENT_HELPERS_IMPORT}'\n${transformed}`
}
