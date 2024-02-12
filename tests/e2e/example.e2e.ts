import { test, expect } from '@playwright/test'
import process from 'process'

const SERVER = process.env.SERVER || 'localhost'

test('showed hidden text after button was clicked', async ({ page }) => {
  await page.goto(`http://${SERVER}:3000/host/1`)

  await page.getByRole('button', { name: 'Do' }).click()
  await expect(page.getByText('hidden text')).toBeVisible()
})