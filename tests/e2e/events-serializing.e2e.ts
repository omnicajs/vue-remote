import type { Page } from '@playwright/test'

import {
  expect,
  test,
} from '@playwright/test'

import { captureCoverage } from './utils'

import process from 'process'

const SERVER = process.env.SERVER || 'localhost'

captureCoverage(test)

const getSerializedEvent =  async (page: Page, type: string) => {
  const json = await page.locator('#events-json').inputValue()
  return JSON.parse(json).find((event: Event) => event.type === type)
}

test('serialized InputEvent', async ({ page }) => {
  await page.goto(`http://${SERVER}:3000/host/events-serializing`)
  await page.getByPlaceholder('vue-remote').fill('playwright@microsoft.com')

  expect(await getSerializedEvent(page, 'input')).toEqual(expect.objectContaining({
    type: 'input',
    bubbles: true,
    cancelable: false,
    composed:  true,
    data: 'playwright@microsoft.com',
    defaultPrevented: false,
    eventPhase: 2,
    isTrusted: true,
    target: { value: 'playwright@microsoft.com' },
  }))
})

test('serialized FocusEvent', async ({ page }) => {
  await page.goto(`http://${SERVER}:3000/host/events-serializing`)
  await page.getByPlaceholder('vue-remote').focus()

  expect(await getSerializedEvent(page, 'focus')).toEqual(expect.objectContaining({
    type: 'focus',
    bubbles: false,
    cancelable: false,
    composed:  true,
    defaultPrevented: false,
    eventPhase: 2,
    isTrusted: true,
    relatedTarget: null,
  }))
})

test('serialized KeyboardEvent', async ({ page }) => {
  await page.goto(`http://${SERVER}:3000/host/events-serializing`)
  await page.getByPlaceholder('vue-remote').press('Enter')

  expect(await getSerializedEvent(page, 'keydown')).toEqual(expect.objectContaining({
    type: 'keydown',
    key: 'Enter',
    code: 'Enter',
    altKey:  false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
  }))
})

test('serialized MouseEvent', async ({ page }) => {
  await page.goto(`http://${SERVER}:3000/host/events-serializing`)
  await page.getByRole('button', { name: 'Clear' }).dispatchEvent('mousedown')

  expect(await getSerializedEvent(page, 'mousedown')).toEqual(expect.objectContaining({
    type: 'mousedown',
    bubbles: true,
    button: 0,
    cancelable: true,
    clientX: 0,
    clientY: 0,
    composed: true,
    defaultPrevented: false,
    eventPhase: 2,
    isTrusted: false,
  }))
})

test('serialized PointerEvent', async ({ page }) => {
  await page.goto(`http://${SERVER}:3000/host/events-serializing`)
  await page.getByRole('button', { name: 'Clear' }).dispatchEvent('pointerdown')

  expect(await getSerializedEvent(page, 'pointerdown')).toEqual(expect.objectContaining({
    type: 'pointerdown',
    bubbles: true,
    button: 0,
    cancelable: true,
    clientX: 0,
    clientY: 0,
    composed: true,
    defaultPrevented: false,
    eventPhase: 2,
    isTrusted: false,
  }))
})

test('serialized WheelEvent', async ({ page }) => {
  await page.goto(`http://${SERVER}:3000/host/events-serializing`)
  await page.getByPlaceholder('vue-remote').dispatchEvent('wheel')

  expect(await getSerializedEvent(page, 'wheel')).toEqual(expect.objectContaining({
    DOM_DELTA_LINE: 1,
    DOM_DELTA_PAGE: 2,
    DOM_DELTA_PIXEL: 0,
    bubbles: true,
    button: 0,
    cancelable: true,
    clientX: 0,
    clientY: 0,
    composed: true,
    defaultPrevented: false,
    deltaMode: 0,
    deltaX: 0,
    deltaY: 0,
    deltaZ: 0,
    eventPhase: 2,
    isTrusted: false,
    type: 'wheel',
  }))
})

test('serialized TouchEvent', async ({ page }) => {
  await page.goto(`http://${SERVER}:3000/host/events-serializing`)
  await page.getByRole('button', { name: 'Clear' }).tap()

  expect(await getSerializedEvent(page, 'touchstart')).toEqual(expect.objectContaining({
    altKey: false,
    bubbles: true,
    cancelable: true,
    changedTouches: [{
      clientX: expect.any(Number),
      clientY: expect.any(Number),
      pageX: expect.any(Number),
      pageY: expect.any(Number),
      force: 1,
      identifier: 0,
      radiusX: 1,
      radiusY: 1,
      rotationAngle: 0,
      screenX: expect.any(Number),
      screenY: expect.any(Number),
    }],
    composed: true,
    ctrlKey: false,
    defaultPrevented: false,
    eventPhase: 2,
    isTrusted: true,
    metaKey: false,
    shiftKey: false,
    targetTouches: [{
      clientX: expect.any(Number),
      clientY: expect.any(Number),
      pageX: expect.any(Number),
      pageY: expect.any(Number),
      force: 1,
      identifier: 0,
      radiusX: 1,
      radiusY: 1,
      rotationAngle: 0,
      screenX: expect.any(Number),
      screenY: expect.any(Number),
    }],
    touches: [{
      clientX: expect.any(Number),
      clientY: expect.any(Number),
      force: 1,
      identifier: 0,
      pageX: expect.any(Number),
      pageY: expect.any(Number),
      radiusX: 1,
      radiusY: 1,
      rotationAngle: 0,
      screenX: expect.any(Number),
      screenY: expect.any(Number),
    }],
    type: 'touchstart',
  }))
})

test('serialized DragEvent', async ({ page }) => {
  await page.goto(`http://${SERVER}:3000/host/events-serializing`)
  await page.getByRole('button', { name: 'Clear' }).dispatchEvent('dragstart', {
    dataTransfer: await page.evaluateHandle(() => new DataTransfer()),
  })

  expect(await getSerializedEvent(page, 'dragstart')).toEqual(expect.objectContaining({
    bubbles: true,
    button: 0,
    cancelable: true,
    clientX: 0,
    clientY: 0,
    composed: true,
    dataTransfer: {
      effectAllowed : 'none',
      dropEffect: 'none',
      files: [],
      types: [],
    },
    defaultPrevented: false,
    eventPhase: 2,
    isTrusted: false,
    type: 'dragstart',
  }))
})