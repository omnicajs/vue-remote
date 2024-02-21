import { test, expect } from '@playwright/test'

test('showed hidden text after button was clicked', async ({ page }) => {
  await page.goto('http://localhost:3000/host/1')

  await page.getByRole('button', { name: 'Do' }).click()
  await expect(page.getByText('hidden text')).toBeVisible()
})