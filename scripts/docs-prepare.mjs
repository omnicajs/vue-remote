import fs from 'node:fs'
import path from 'node:path'

const astroDir = path.resolve('.astro')
const targetDir = path.resolve('var/.astro')

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
