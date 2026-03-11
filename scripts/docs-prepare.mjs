import fs from 'node:fs'
import path from 'node:path'

const astroDir = path.resolve('.astro')
const targetDir = path.resolve('var/.astro')
const docsFallbacks = [
  {
    sourceDocsDir: path.resolve('web/content/docs/es'),
    targetDocsDir: path.resolve('web/content/docs/es-mx'),
    overrideDocsDir: path.resolve('web/content/docs-overrides/es-mx'),
    sourceI18nFile: path.resolve('web/content/i18n/es.yml'),
    targetI18nFile: path.resolve('web/content/i18n/es-MX.yml'),
    overrideI18nFile: path.resolve('web/content/i18n-overrides/es-MX.yml'),
    replacements: [
      ['/es/', '/es-mx/'],
      ['locale="es"', 'locale="es-mx"'],
    ],
  },
]

function resetPath(filePath) {
  let stats = null

  try {
    stats = fs.lstatSync(filePath)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return
    }

    throw error
  }

  if (stats.isDirectory() && !stats.isSymbolicLink()) {
    fs.rmSync(filePath, { recursive: true, force: true })
    return
  }

  fs.rmSync(filePath, { recursive: true, force: true })
}

function applyReplacements(content, replacements) {
  let nextContent = content

  for (const [searchValue, replaceValue] of replacements) {
    nextContent = nextContent.replaceAll(searchValue, replaceValue)
  }

  return nextContent
}

function pathExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
}

function syncDocsFallback({
  sourceDocsDir,
  targetDocsDir,
  overrideDocsDir,
  sourceI18nFile,
  targetI18nFile,
  overrideI18nFile,
  replacements,
}) {
  resetPath(targetDocsDir)
  fs.mkdirSync(targetDocsDir, { recursive: true })

  for (const entry of fs.readdirSync(sourceDocsDir, { withFileTypes: true })) {
    if (!entry.isFile()) {
      continue
    }

    const sourceFile = path.join(sourceDocsDir, entry.name)
    const targetFile = path.join(targetDocsDir, entry.name)
    const sourceContent = fs.readFileSync(sourceFile, 'utf8')
    const targetContent = applyReplacements(sourceContent, replacements)

    fs.writeFileSync(targetFile, targetContent)
  }

  if (overrideDocsDir && pathExists(overrideDocsDir)) {
    for (const entry of fs.readdirSync(overrideDocsDir, { withFileTypes: true })) {
      if (!entry.isFile()) {
        continue
      }

      const sourceFile = path.join(overrideDocsDir, entry.name)
      const targetFile = path.join(targetDocsDir, entry.name)
      fs.writeFileSync(targetFile, fs.readFileSync(sourceFile, 'utf8'))
    }
  }

  resetPath(targetI18nFile)
  const i18nSourceFile = overrideI18nFile && pathExists(overrideI18nFile)
    ? overrideI18nFile
    : sourceI18nFile
  fs.writeFileSync(targetI18nFile, fs.readFileSync(i18nSourceFile, 'utf8'))
}

for (const fallback of docsFallbacks) {
  syncDocsFallback(fallback)
}

fs.mkdirSync(targetDir, { recursive: true })

let stats = null

try {
  stats = fs.lstatSync(astroDir)
} catch (error) {
  if (error && typeof error === 'object' && 'code' in error && error.code !== 'ENOENT') {
    throw error
  }
}

if (stats?.isSymbolicLink()) {
  process.exit(0)
}

if (stats) {
  fs.rmSync(astroDir, { recursive: true, force: true })
}

fs.symlinkSync(targetDir, astroDir, 'dir')
