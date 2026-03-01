import fs from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const manifestPath = path.join(projectRoot, '.pages-store', 'versions.json')
const packagePath = path.join(projectRoot, 'package.json')
const refType = process.env.REF_TYPE
const refName = process.env.REF_NAME
const outputPath = process.env.GITHUB_OUTPUT

const fallbackLatest = `v${JSON.parse(fs.readFileSync(packagePath, 'utf8')).version}`
const semverPattern = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/

function normalizeTag (value) {
  if (typeof value !== 'string') {
    return ''
  }

  const normalized = value.trim()
  if (!normalized) {
    return ''
  }

  return normalized.startsWith('v') ? normalized : `v${normalized}`
}

function parseVersion (value) {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  const match = semverPattern.exec(normalized)
  if (!match) {
    return null
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? '',
  }
}

function comparePrerelease (left, right) {
  if (!left && !right) {
    return 0
  }

  if (!left) {
    return 1
  }

  if (!right) {
    return -1
  }

  const leftParts = left.split('.')
  const rightParts = right.split('.')
  const length = Math.max(leftParts.length, rightParts.length)

  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index]
    const rightPart = rightParts[index]

    if (leftPart === undefined) {
      return -1
    }

    if (rightPart === undefined) {
      return 1
    }

    const leftNumber = Number(leftPart)
    const rightNumber = Number(rightPart)
    const leftIsNumber = Number.isInteger(leftNumber) && String(leftNumber) === leftPart
    const rightIsNumber = Number.isInteger(rightNumber) && String(rightNumber) === rightPart

    if (leftIsNumber && rightIsNumber && leftNumber !== rightNumber) {
      return leftNumber > rightNumber ? 1 : -1
    }

    if (leftIsNumber !== rightIsNumber) {
      return leftIsNumber ? -1 : 1
    }

    if (leftPart !== rightPart) {
      return leftPart > rightPart ? 1 : -1
    }
  }

  return 0
}

function compareVersions (left, right) {
  const leftParsed = parseVersion(left)
  const rightParsed = parseVersion(right)

  if (leftParsed && rightParsed) {
    if (leftParsed.major !== rightParsed.major) {
      return leftParsed.major > rightParsed.major ? -1 : 1
    }

    if (leftParsed.minor !== rightParsed.minor) {
      return leftParsed.minor > rightParsed.minor ? -1 : 1
    }

    if (leftParsed.patch !== rightParsed.patch) {
      return leftParsed.patch > rightParsed.patch ? -1 : 1
    }

    const prerelease = comparePrerelease(leftParsed.prerelease, rightParsed.prerelease)
    return prerelease === 0 ? 0 : -prerelease
  }

  if (leftParsed) {
    return -1
  }

  if (rightParsed) {
    return 1
  }

  return left.localeCompare(right)
}

function unique (values) {
  const set = new Set()

  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      const normalized = value.trim()
      set.add(normalized.startsWith('v') ? normalized : `v${normalized}`)
    }
  }

  return [...set]
}

function writeOutput (name, value) {
  if (!outputPath) {
    return
  }

  fs.appendFileSync(outputPath, `${name}=${value}\n`)
}

let manifest = { latest: fallbackLatest, versions: [] }

if (fs.existsSync(manifestPath)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    manifest = {
      latest: typeof parsed.latest === 'string' && parsed.latest.trim().length > 0
        ? parsed.latest.trim()
        : fallbackLatest,
      versions: Array.isArray(parsed.versions) ? parsed.versions : [],
    }
  } catch {
    manifest = { latest: fallbackLatest, versions: [] }
  }
}

const versions = unique(manifest.versions)
const currentTag = normalizeTag(refName)

if (refType === 'tag' && currentTag) {
  versions.push(currentTag)
}

const sortedVersions = unique(versions).sort(compareVersions)
const latest = sortedVersions[0] ?? manifest.latest ?? fallbackLatest
const isLatest = currentTag !== '' && currentTag === latest

fs.writeFileSync(
  manifestPath,
  `${JSON.stringify({
    latest,
    versions: sortedVersions,
    updatedAt: new Date().toISOString(),
  }, null, 2)}\n`,
  'utf8'
)

writeOutput('latest', latest)
writeOutput('current_tag', currentTag)
writeOutput('is_latest', isLatest ? 'true' : 'false')
