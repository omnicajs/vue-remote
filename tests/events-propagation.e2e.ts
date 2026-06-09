import type { WorkerRuntime } from './__fixtures__/runtime'

import {
  afterEach,
  describe,
  expect,
  test,
} from 'vitest'

import { VButton } from './__fixtures__/components/VButton.host'
import { VInput } from './__fixtures__/components/VInput.host'
import { VSlotFrame } from './__fixtures__/components/VSlotFrame.host'

import { createWorkerRuntime } from './__fixtures__/runtime'

const createEventsPropagationRuntime = () => createWorkerRuntime<{
  clicks: number;
  slotClicks: number;
  text: string;
}>({
  worker: new Worker(new URL('./__fixtures__/workers/events-propagation.worker.ts', import.meta.url), {
    type: 'module',
  }),
  provider: {
    VButton,
    VInput,
    VSlotFrame,
  },
})

describe('eventsPropagation', () => {
  let runtime: WorkerRuntime<{
    clicks: number;
    slotClicks: number;
    text: string;
  }> | null = null

  afterEach(async () => {
    if (runtime) {
      await runtime.tearDown()
      runtime = null
    }
  })

  test('delivers host click events to remote handlers and updates remote DOM', async () => {
    runtime = await createEventsPropagationRuntime()

    const button = runtime.container.querySelector('#propagation-button')
    const counter = runtime.container.querySelector('#propagation-counter')

    if (!(button instanceof HTMLButtonElement) || !(counter instanceof HTMLElement)) {
      throw new Error('Propagation controls were not rendered')
    }

    expect(counter.textContent).toBe('Clicks: 0')

    button.click()

    await expect.poll(async () => {
      await runtime?.flush()
      return counter.textContent
    }).toBe('Clicks: 1')

    button.click()

    await expect.poll(async () => {
      await runtime?.flush()
      return counter.textContent
    }).toBe('Clicks: 2')

    await expect.poll(async () => {
      await runtime?.flush()
      return (await runtime?.read())?.clicks
    }).toBe(2)
  })

  test('clears remote model after click on host button', async () => {
    runtime = await createEventsPropagationRuntime()

    const input = runtime.container.querySelector('#propagation-input')
    const clear = runtime.container.querySelector('#propagation-clear')

    if (!(input instanceof HTMLInputElement) || !(clear instanceof HTMLButtonElement)) {
      throw new Error('Clear controls were not rendered')
    }

    input.value = 'playwright@microsoft.com'
    input.dispatchEvent(new Event('input', {
      bubbles: true,
      cancelable: true,
      composed: true,
    }))

    await expect.poll(async () => {
      await runtime?.flush()
      return input.value
    }).toBe('playwright@microsoft.com')

    clear.click()

    await expect.poll(async () => {
      await runtime?.flush()
      return input.value
    }).toBe('')

    await expect.poll(async () => {
      await runtime?.flush()
      return (await runtime?.read())?.text
    }).toBe('')
  })

  test('delivers native button clicks from a remote named slot when optional event constructors are missing', async () => {
    runtime = await createEventsPropagationRuntime()

    const originalDragEvent = window.DragEvent
    const originalPointerEvent = window.PointerEvent
    const originalTouchEvent = window.TouchEvent

    Object.defineProperty(window, 'DragEvent', {
      configurable: true,
      value: undefined,
    })
    Object.defineProperty(window, 'PointerEvent', {
      configurable: true,
      value: undefined,
    })
    Object.defineProperty(window, 'TouchEvent', {
      configurable: true,
      value: undefined,
    })

    try {
      const button = runtime.container.querySelector('#propagation-slot-button')
      const counter = runtime.container.querySelector('#propagation-slot-counter')

      if (!(button instanceof HTMLButtonElement) || !(counter instanceof HTMLElement)) {
        throw new Error('Named slot controls were not rendered')
      }

      expect(counter.textContent).toBe('Slot clicks: 0')
      expect(button.textContent).toBe('Show filters')

      button.click()

      await expect.poll(async () => {
        await runtime?.flush()
        return {
          button: button.textContent,
          counter: counter.textContent,
          slotClicks: (await runtime?.read())?.slotClicks,
        }
      }).toEqual({
        button: 'Hide filters',
        counter: 'Slot clicks: 1',
        slotClicks: 1,
      })
    } finally {
      Object.defineProperty(window, 'DragEvent', {
        configurable: true,
        value: originalDragEvent,
      })
      Object.defineProperty(window, 'PointerEvent', {
        configurable: true,
        value: originalPointerEvent,
      })
      Object.defineProperty(window, 'TouchEvent', {
        configurable: true,
        value: originalTouchEvent,
      })
    }
  })
})
