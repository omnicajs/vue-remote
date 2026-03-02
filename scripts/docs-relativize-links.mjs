import fs from 'node:fs/promises'
import path from 'node:path'

const projectRoot = process.cwd()
const distDir = path.join(projectRoot, 'dist-web')
const docsBaseRaw = (process.env.DOCS_BASE || '').trim()

function normalizeBase (input) {
  if (input === '' || input === '/') {
    return '/'
  }

  const withLeadingSlash = input.startsWith('/') ? input : `/${input}`
  return withLeadingSlash.replace(/\/?$/, '/')
}

const docsBase = normalizeBase(docsBaseRaw)
const shouldRelativizeLinks = docsBase === '/'

async function walkHtmlFiles (dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...await walkHtmlFiles(fullPath))
      continue
    }

    if (entry.isFile() && fullPath.endsWith('.html')) {
      files.push(fullPath)
    }
  }

  return files
}

function toPosix (input) {
  return input.replace(/\\/g, '/')
}

function makePrefix (htmlFile) {
  const from = path.dirname(htmlFile)
  const rel = toPosix(path.relative(from, distDir))

  if (!rel) {
    return '.'
  }

  return rel
}

function rewriteHtmlLinks (html, prefix) {
  const normalized = html.replace(/(href|src)=("|')\/\.\//g, '$1=$2/')

  return normalized.replace(
    /(href|src)=("|')\/(?!\/)/g,
    (_, attr, quote) => `${attr}=${quote}${prefix}/`
  )
}

function rewriteHtmlLinksWithBase (html, base) {
  const normalizedBase = normalizeBase(base)
  const baseWithoutTrailingSlash = normalizedBase.endsWith('/')
    ? normalizedBase.slice(0, -1)
    : normalizedBase

  return html.replace(
    /(href|src)=("|')\/(?!\/)([^"']*)\2/g,
    (fullMatch, attr, quote, rawPath) => {
      const normalizedPath = rawPath.replace(/^\.\//, '')
      const currentValue = `/${normalizedPath}`

      if (
        currentValue === baseWithoutTrailingSlash ||
        currentValue.startsWith(normalizedBase)
      ) {
        return fullMatch
      }

      const nextValue = normalizedPath === ''
        ? normalizedBase
        : `${normalizedBase}${normalizedPath}`

      return `${attr}=${quote}${nextValue}${quote}`
    }
  )
}

async function main () {
  const htmlFiles = await walkHtmlFiles(distDir)

  await Promise.all(htmlFiles.map(async (htmlFile) => {
    const source = await fs.readFile(htmlFile, 'utf8')
    const updated = shouldRelativizeLinks
      ? rewriteHtmlLinks(source, makePrefix(htmlFile))
      : rewriteHtmlLinksWithBase(source, docsBase)

    if (updated !== source) {
      await fs.writeFile(htmlFile, updated, 'utf8')
    }
  }))
}

await main()
