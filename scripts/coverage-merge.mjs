import fs from 'node:fs'
import path from 'node:path'

const vitestPath = path.resolve('coverage/vitest/coverage-final.json')
const playwrightPath = path.resolve('coverage/playwright/coverage-final.json')
const outDir = path.resolve('coverage/.nyc_output')
const outPath = path.join(outDir, 'merged.json')
const reportPath = path.resolve('coverage/coverage-final.json')

const readJson = (targetPath) => {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Coverage file not found: ${targetPath}`)
  }

  return JSON.parse(fs.readFileSync(targetPath, 'utf8'))
}

const vitest = readJson(vitestPath)
const playwright = readJson(playwrightPath)

const merged = structuredClone(vitest)

for (const [file, browserCoverage] of Object.entries(playwright)) {
  const baseCoverage = merged[file]

  // Baseline is vitest coverage. Browser coverage can only add hits
  // to already known counters, and cannot expand denominator.
  if (baseCoverage == null) {
    continue
  }

  for (const key of Object.keys(baseCoverage.s)) {
    if (key in browserCoverage.s) {
      baseCoverage.s[key] += browserCoverage.s[key]
    }
  }

  for (const key of Object.keys(baseCoverage.f)) {
    if (key in browserCoverage.f) {
      baseCoverage.f[key] += browserCoverage.f[key]
    }
  }

  for (const key of Object.keys(baseCoverage.b)) {
    const baseBranches = baseCoverage.b[key]
    const browserBranches = browserCoverage.b[key]

    if (!Array.isArray(baseBranches) || !Array.isArray(browserBranches)) {
      continue
    }

    for (let i = 0; i < baseBranches.length; i += 1) {
      if (i < browserBranches.length) {
        baseBranches[i] += browserBranches[i]
      }
    }
  }
}

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(merged))
fs.writeFileSync(reportPath, JSON.stringify(merged))
