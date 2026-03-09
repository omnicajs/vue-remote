import type { WorkerRuntime } from './__fixtures__/runtime'

import {
  afterEach,
  describe,
  expect,
  test,
} from 'vitest'

import { createWorkerRuntime } from './__fixtures__/runtime'

describe('nativeVModelWorker', () => {
  let runtime: WorkerRuntime<{
    eventInfo: {
      isEventInstance: boolean;
      targetHasAddEventListener: boolean;
      targetKeys: string[];
      type: string;
    };
    text: string;
  }> | null = null

  afterEach(async () => {
    if (runtime) {
      await runtime.tearDown()
      runtime = null
    }
  })

  test('keeps native v-model working across worker boundary and preserves event isolation', async () => {
    runtime = await createWorkerRuntime({
      worker: new Worker(new URL('./__fixtures__/workers/native-v-model.worker.ts', import.meta.url), {
        type: 'module',
      }),
      provider: {},
    })

    const input = runtime.container.querySelector('#native-v-model-input')
    const mirror = runtime.container.querySelector('#native-v-model-text')

    if (!(input instanceof HTMLInputElement) || !(mirror instanceof HTMLElement)) {
      throw new Error('Native v-model worker controls were not rendered')
    }

    expect(input.value).toBe('')
    expect(mirror.textContent).toBe('')

    input.value = 'from host'
    input.dispatchEvent(new InputEvent('input', {
      data: 't',
      bubbles: true,
      cancelable: true,
      composed: true,
    }))

    await expect.poll(async () => {
      await runtime?.flush()
      return {
        text: mirror.textContent,
        snapshot: await runtime?.read(),
      }
    }).toMatchObject({
      text: 'from host',
      snapshot: {
        text: 'from host',
        eventInfo: {
          isEventInstance: false,
          targetHasAddEventListener: false,
          targetKeys: ['checked', 'value'],
          type: 'input',
        },
      },
    })
  })
})
