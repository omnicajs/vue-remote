import type { WorkerRuntime } from './__fixtures__/runtime'

import {
  afterEach,
  describe,
  expect,
  test,
} from 'vitest'

import { VButton } from './__fixtures__/components/VButton.host'
import { VInput } from './__fixtures__/components/VInput.host'

import { createWorkerRuntime } from './__fixtures__/runtime'

describe('eventsPropagation', () => {
  let runtime: WorkerRuntime<{
    clicks: number;
    text: string;
  }> | null = null

  afterEach(async () => {
    if (runtime) {
      await runtime.tearDown()
      runtime = null
    }
  })

  test('delivers host click events to remote handlers and updates remote DOM', async () => {
    runtime = await createWorkerRuntime<{
      clicks: number;
      text: string;
    }>({
      worker: new Worker(new URL('./__fixtures__/workers/events-propagation.worker.ts', import.meta.url), {
        type: 'module',
      }),
      provider: {
        VButton: VButton,
        VInput: VInput,
      },
    })

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
    runtime = await createWorkerRuntime<{
      clicks: number;
      text: string;
    }>({
      worker: new Worker(new URL('./__fixtures__/workers/events-propagation.worker.ts', import.meta.url), {
        type: 'module',
      }),
      provider: {
        VButton: VButton,
        VInput: VInput,
      },
    })

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
})
