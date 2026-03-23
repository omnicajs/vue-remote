import type { WorkerRuntime } from './__fixtures__/runtime'

import {
  afterEach,
  describe,
  expect,
  test,
} from 'vitest'

import { VButton } from './__fixtures__/components/VButton.host'
import { createWorkerRuntime } from './__fixtures__/runtime'

describe('eventModifiers', () => {
  let runtime: WorkerRuntime<{
    componentClicks: number;
    componentDefaultPrevented: boolean;
    domClicks: number;
    domDefaultPrevented: boolean;
    keyHits: number;
    parentClicks: number;
    selfClicks: number;
  }> | null = null

  afterEach(async () => {
    if (runtime) {
      await runtime.tearDown()
      runtime = null
    }
  })

  test('applies template event modifiers through the remote boundary', async () => {
    runtime = await createWorkerRuntime<{
      componentClicks: number;
      componentDefaultPrevented: boolean;
      domClicks: number;
      domDefaultPrevented: boolean;
      keyHits: number;
      parentClicks: number;
      selfClicks: number;
    }>({
      worker: new Worker(new URL('./__fixtures__/workers/event-modifiers.worker.ts', import.meta.url), {
        type: 'module',
      }),
      provider: {
        VButton,
      },
    })

    const domButton = runtime.container.querySelector('#modifier-dom')
    const selfRoot = runtime.container.querySelector('#modifier-self')
    const selfChild = runtime.container.querySelector('#modifier-self-child')
    const keyButton = runtime.container.querySelector('#modifier-key')
    const componentButton = runtime.container.querySelector('#modifier-component')

    if (
      !(domButton instanceof HTMLButtonElement)
      || !(selfRoot instanceof HTMLDivElement)
      || !(selfChild instanceof HTMLSpanElement)
      || !(keyButton instanceof HTMLButtonElement)
      || !(componentButton instanceof HTMLButtonElement)
    ) {
      throw new Error('Modifier fixtures were not rendered')
    }

    await runtime.reset()

    const domClick = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    })

    domButton.dispatchEvent(domClick)

    await expect.poll(async () => {
      await runtime?.flush()
      return await runtime?.read()
    }).toMatchObject({
      domClicks: 1,
      domDefaultPrevented: true,
      parentClicks: 0,
    })

    selfChild.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    }))
    selfRoot.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    }))

    keyButton.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: false,
      bubbles: true,
      cancelable: true,
    }))
    keyButton.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    }))

    const componentClick = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    })

    componentButton.dispatchEvent(componentClick)
    componentButton.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    }))

    await expect.poll(async () => {
      await runtime?.flush()
      return await runtime?.read()
    }).toMatchObject({
      componentClicks: 1,
      componentDefaultPrevented: true,
      domClicks: 1,
      keyHits: 1,
      parentClicks: 4,
      selfClicks: 1,
    })

    expect(componentClick.defaultPrevented).toBe(true)
  })
})
