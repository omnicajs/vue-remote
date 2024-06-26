/**
 * @author Alex Kanunnikov lifeart
 * @see original https://github.com/lifeart/demo-ember-vite/blob/master/e2e/utils/index.ts
 */

import type {
  Browser,
  BrowserContext,
  Page,
  test,
} from '@playwright/test'

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

import v8toIstanbul from 'v8-to-istanbul'

type Options = {
  reportAnonymousScripts: boolean;
  resetOnNavigation: boolean;
}

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '../..')
const coverageResultsTempDir = path.join(ROOT, 'coverage')

function shouldCaptureCoverageForFile(url: string) {
  return url.includes('/dist/')
}
function filePathFromUrl(url: string) {
  return path.join(__dirname, url.split('3000').pop() as string)
}

function UUID() {
  return crypto.randomBytes(16).toString('hex')
}

function saveCoverage(result: string) {
  if (!fs.existsSync(coverageResultsTempDir)) {
    fs.mkdirSync(coverageResultsTempDir)
  }
  fs.writeFileSync(
    path.join(coverageResultsTempDir, `playwright-${UUID()}-coverage.json`),
    result
  )
}

const knownContexts = new WeakSet()
const knownBrowsers = new WeakSet()
const knownPages = new WeakSet()
const pagesWithEnabledCoverage = new WeakSet()

async function stopCodeCoverage(page: Page) {
  if (!pagesWithEnabledCoverage.has(page)) return
  const jsCoverage = await page.coverage.stopJSCoverage()
  for (const entry of jsCoverage) {
    try {
      const source = entry.source
      if (!source) {
        continue
      }
      if (!shouldCaptureCoverageForFile(entry.url)) {
        continue
      }
      const fName = filePathFromUrl(entry.url)
      const converter = v8toIstanbul(fName, 0, {
        source,
      }, (path) => !path.includes('/src/'))
      await converter.load()
      converter.applyCoverage(entry.functions)
      const result = converter.toIstanbul()
      const keys = Object.keys(result)
      if (keys.length) {
        saveCoverage(JSON.stringify(result))
      }
    } catch (e) {
      console.error(`Unable to process coverage for ${entry.scriptId}:${entry.url}`)
    }
  }

  pagesWithEnabledCoverage.delete(page)
}

async function startCodeCoverage(page: Page, options: Options) {
  if (pagesWithEnabledCoverage.has(page)) return
  pagesWithEnabledCoverage.add(page)
  // https://playwright.dev/docs/api/class-coverage#coverage-start-js-coverage-option-reset-on-navigation
  // we assume that we testing our SPA, and there is no needs to reset coverage between page navigations
  await page.coverage.startJSCoverage(options)
}

function patchPageClose(page: Page) {
  if (knownPages.has(page)) return page
  const originalClose = page.close.bind(page)
  page.close = async function () {
    await stopCodeCoverage(page)
    return await originalClose()
  }
  knownPages.add(page)
  return page
}

function patchNewPage(context: BrowserContext, options: Options) {
  if (knownContexts.has(context)) return
  const originalCreatePage = context.newPage.bind(context)
  context.newPage = async function () {
    const page = await originalCreatePage()
    knownContexts.add(page.context())
    page.on('load', async () => {
      await startCodeCoverage(page, options)
    })
    return patchPageClose(page)
  }
  knownContexts.add(context)
}

function patchNewContext(browser: Browser, options: Options) {
  if (knownBrowsers.has(browser)) return
  const originalCreateContext = browser.newContext.bind(browser)
  browser.newContext = async function () {
    const context = await originalCreateContext()
    patchNewPage(context, options)
    knownContexts.add(context)
    return context
  }
  knownBrowsers.add(browser)
}

export function captureCoverage(
  testConstructor: typeof test,
  options = {
    reportAnonymousScripts: false,
    resetOnNavigation: false,
  }
) {
    // console.log('process.env.CI', process.env.CI);
  testConstructor.beforeEach(async ({ browser }) => {
    if (browser.browserType().name() !== 'chromium') {
            // Skipping coverage for non-chromium browsers
      return
    }
        // check for browser type
    patchNewContext(browser, options)
    browser.contexts().forEach((context) => {
      patchNewPage(context, options)
      context.pages().forEach((page) => {
        patchPageClose(page)
      })
    })
  })

  testConstructor.afterEach(async ({ context, browser }) => {
    if (browser.browserType().name() !== 'chromium') {
      return
    }
    for (const page of context.pages()) {
      await stopCodeCoverage(page)
    }
  })
}
