import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const DEFAULT_OUT = 'var/screenshots/screenshot.png'
const DEFAULT_WIDTH = 1440
const DEFAULT_HEIGHT = 900
const DEFAULT_WAIT_MS = 0
const DEFAULT_TIMEOUT_MS = 45000

const printUsageAndExit = (message) => {
  if (message) {
    console.error(message)
  }

  console.error('Usage:')
  console.error('  node scripts/playwright/capture.mjs --url <URL> [options]')
  console.error('')
  console.error('Options:')
  console.error(`  --out <path>          Output file path (default: ${DEFAULT_OUT})`)
  console.error('  --host <host>         Host header override')
  console.error(`  --width <px>          Viewport width (default: ${DEFAULT_WIDTH})`)
  console.error(`  --height <px>         Viewport height (default: ${DEFAULT_HEIGHT})`)
  console.error(`  --wait-ms <ms>        Extra wait after load (default: ${DEFAULT_WAIT_MS})`)
  console.error(`  --timeout-ms <ms>     Navigation timeout (default: ${DEFAULT_TIMEOUT_MS})`)
  console.error('  --full-page           Capture full page')

  process.exit(1)
}

const parseIntegerOption = (name, value) => {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) {
    printUsageAndExit(`Invalid value for ${name}: "${value}"`)
  }

  return parsed
}

const parseArgs = (argv) => {
  const options = {
    out: DEFAULT_OUT,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    waitMs: DEFAULT_WAIT_MS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    fullPage: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--full-page') {
      options.fullPage = true
      continue
    }

    const value = argv[index + 1]
    if (value == null) {
      printUsageAndExit(`Missing value for ${arg}`)
    }

    switch (arg) {
      case '--url':
        options.url = value
        break
      case '--out':
        options.out = value
        break
      case '--host':
        options.host = value
        break
      case '--width':
        options.width = parseIntegerOption('--width', value)
        break
      case '--height':
        options.height = parseIntegerOption('--height', value)
        break
      case '--wait-ms':
        options.waitMs = parseIntegerOption('--wait-ms', value)
        break
      case '--timeout-ms':
        options.timeoutMs = parseIntegerOption('--timeout-ms', value)
        break
      default:
        printUsageAndExit(`Unknown option: ${arg}`)
    }

    index += 1
  }

  if (!options.url) {
    printUsageAndExit('Missing required option: --url')
  }

  return options
}

const run = async () => {
  const options = parseArgs(process.argv.slice(2))

  await fs.mkdir(path.dirname(options.out), { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: {
      width: options.width,
      height: options.height,
    },
    extraHTTPHeaders: options.host ? { host: options.host } : undefined,
  })

  try {
    const page = await context.newPage()
    await page.goto(options.url, {
      waitUntil: 'networkidle',
      timeout: options.timeoutMs,
    })

    if (options.waitMs > 0) {
      await page.waitForTimeout(options.waitMs)
    }

    await page.screenshot({
      path: options.out,
      fullPage: options.fullPage,
    })
  } finally {
    await context.close()
    await browser.close()
  }

  console.log(`Screenshot saved to ${options.out}`)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
