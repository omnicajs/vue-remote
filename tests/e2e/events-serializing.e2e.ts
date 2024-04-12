import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { captureCoverage } from './utils'
import process from 'process'

const SERVER = process.env.SERVER || 'localhost'

captureCoverage(test)

const getSerializedEvent =  async (page: Page, type: string) => {
  const jsonEl = page.locator('#events-json')
  const json = await jsonEl.inputValue()
  return JSON.parse(json).find((event: Event ) => event.type === type)
}

test('serialized InputEvent', async ({ page }) => {
  await page.goto(`http://${SERVER}:3000/host/events-serializing`)

  await page.getByPlaceholder('vue-remote').fill('playwright@microsoft.com')

  const serializedInputEvent = await getSerializedEvent(page, 'input')

  expect(serializedInputEvent).toEqual(expect.objectContaining({
    bubbles: true,
    cancelable: false,
    composed:  true,
    data: 'playwright@microsoft.com',
    defaultPrevented: false,
    eventPhase: 2,
    isTrusted: true,
    target: { value: 'playwright@microsoft.com' },
    type: 'input',
  }))
})

test('serialized FocusEvent', async ({ page }) => {
  await page.goto(`http://${SERVER}:3000/host/events-serializing`)

  await page.getByPlaceholder('vue-remote').focus()

  const serializedInputEvent = await getSerializedEvent(page, 'focus')

  expect(serializedInputEvent).toEqual(expect.objectContaining({
    bubbles: false,
    cancelable: false,
    composed:  true,
    defaultPrevented: false,
    eventPhase: 2,
    isTrusted: true,
    relatedTarget: null,
    type: 'focus',
  }))
})

test('serialized KeyboardEvent', async ({ page }) => {
  await page.goto(`http://${SERVER}:3000/host/events-serializing`)

  await page.getByPlaceholder('vue-remote').press('Enter')

  const serializedInputEvent = await getSerializedEvent(page, 'keydown')

  expect(serializedInputEvent).toEqual(expect.objectContaining({
    key: 'Enter',
    code: 'Enter',
    altKey:  false,
    ctrlKey: false,
    shiftKey: false,
    metaKey: false,
    type: 'keydown',
  }))
})

test('serialized MouseEvent', async ({ page }) => {
  await page.goto(`http://${SERVER}:3000/host/events-serializing`)
  
  await page.getByRole('button', { name: 'Clear' }).dispatchEvent('mousedown')

  const serializedMouseEvent = await getSerializedEvent(page, 'mousedown')
  
  expect(serializedMouseEvent).toEqual(expect.objectContaining({
    bubbles: true,
    button: 0,
    cancelable: true,
    clientX: 0,
    clientY: 0,
    composed: true,
    defaultPrevented: false,
    eventPhase: 2,
    isTrusted: false,
    type: 'mousedown',
  }))
})

test('serialized PointerEvent', async ({ page }) => {
  await page.goto(`http://${SERVER}:3000/host/events-serializing`)

  await page.getByRole('button', { name: 'Clear' }).dispatchEvent('pointerdown')

  const serializedMouseEvent = await getSerializedEvent(page, 'pointerdown')

  expect(serializedMouseEvent).toEqual(expect.objectContaining({
    bubbles: true,
    button: 0,
    cancelable: true,
    clientX: 0,
    clientY: 0,
    composed: true,
    defaultPrevented: false,
    eventPhase: 2,
    isTrusted: false,
    type: 'pointerdown',
  }))
})

test('serialized WheelEvent', async ({ page }) => {
  await page.goto(`http://${SERVER}:3000/host/events-serializing`)

  await page.getByPlaceholder('vue-remote').dispatchEvent('wheel')
  const serializedInputEvent = await getSerializedEvent(page, 'wheel')

  expect(serializedInputEvent).toEqual(expect.objectContaining({
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

const serializedTouchEvent = {
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
}

test('serialized TouchEvent', async ({ page }) => {
  await page.goto(`http://${SERVER}:3000/host/events-serializing`)

  await page.getByRole('button', { name: 'Clear' }).tap()

  const serializedInputEvent = await getSerializedEvent(page, 'touchstart')

  expect(serializedInputEvent).toEqual(expect.objectContaining(serializedTouchEvent))
})

test('serialized DragEvent', async ({ page }) => {
  await page.goto(`http://${SERVER}:3000/host/events-serializing`)

  const dataTransfer = await page.evaluateHandle(() => new DataTransfer())
  await page.getByRole('button', { name: 'Clear' }).dispatchEvent('dragstart', { dataTransfer })

  const serializedInputEvent = await getSerializedEvent(page, 'dragstart')

  expect(serializedInputEvent).toEqual(expect.objectContaining({
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