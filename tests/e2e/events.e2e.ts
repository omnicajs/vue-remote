import { test, expect } from '@playwright/test'
import { captureCoverage } from './utils'
import process from 'process'

const SERVER = process.env.SERVER || 'localhost'

captureCoverage(test)

test('clear button removes text from input', async ({ page }) => {
  await page.goto(`http://${SERVER}:3000/host/events`)

  await page.getByPlaceholder('vue-remote').fill('playwright@microsoft.com')
  
  await expect(page.getByPlaceholder('vue-remote')).toHaveValue('playwright@microsoft.com')

  await page.getByRole('button', { name: 'Clear' }).click()

  await expect(page.getByPlaceholder('vue-remote')).toHaveValue('')
})