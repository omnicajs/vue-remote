import type { WorkerRuntime } from './__fixtures__/runtime'

import {
  afterEach,
  describe,
  expect,
  test,
} from 'vitest'

import { REMOTE_LIFECYCLE_REASON_HOST_UNMOUNTED } from '@/vue/remote'

import { VNextTickProbe } from './__fixtures__/components/VNextTickProbe.host'
import { createWorkerRuntime } from './__fixtures__/runtime'

const isExpectedHostUnmountError = (value: unknown) => {
  return value instanceof Error
    && value.name === 'RemoteLifecycleError'
    && 'reason' in value
    && value.reason === REMOTE_LIFECYCLE_REASON_HOST_UNMOUNTED
}

const waitForExpectedUnmountRejection = () => new Promise<void>((resolve) => {
  const handle = (event: PromiseRejectionEvent) => {
    if (!isExpectedHostUnmountError(event.reason)) {
      return
    }

    event.preventDefault()
    window.removeEventListener('unhandledrejection', handle)
    resolve()
  }

  window.addEventListener('unhandledrejection', handle)
})

const withSuppressedExpectedHostUnmountError = async <T>(run: () => Promise<T>) => {
  const originalConsoleError = window.console.error

  window.console.error = (...args) => {
    if (args.some(isExpectedHostUnmountError)) {
      return
    }

    originalConsoleError(...args)
  }

  try {
    return await run()
  } finally {
    window.console.error = originalConsoleError
  }
}

describe('remote nextTick', () => {
  let runtime: WorkerRuntime<{
    count: number;
    observedText: string | null;
    rejectionReason: string | null;
    status: 'idle' | 'waiting' | 'committed' | 'rejected';
  }> | null = null

  afterEach(async () => {
    if (runtime) {
      await runtime.tearDown()
      runtime = null
    }
  })

  test('waits for a real host commit before continuing', async () => {
    runtime = await createWorkerRuntime({
      worker: new Worker(new URL('./__fixtures__/workers/next-tick.worker.ts', import.meta.url), {
        type: 'module',
      }),
      provider: {
        VNextTickProbe,
      },
    })
    const activeRuntime = runtime

    const trigger = activeRuntime.container.querySelector('#next-tick-trigger')
    const count = activeRuntime.container.querySelector('#next-tick-count')
    const observed = activeRuntime.container.querySelector('#next-tick-observed')
    const probe = activeRuntime.container.querySelector('#next-tick-probe')
    const status = activeRuntime.container.querySelector('#next-tick-status')

    if (
      !(trigger instanceof HTMLButtonElement) ||
      !(count instanceof HTMLElement) ||
      !(observed instanceof HTMLElement) ||
      !(probe instanceof HTMLElement) ||
      !(status instanceof HTMLElement)
    ) {
      throw new Error('nextTick worker controls were not rendered')
    }

    trigger.click()

    await expect.poll(async () => {
      await activeRuntime.flush()
      return {
        count: count.textContent,
        observed: observed.textContent,
        probe: probe.textContent,
        status: status.textContent,
        snapshot: await activeRuntime.read(),
      }
    }).toEqual({
      count: 'Count: 1',
      observed: 'Observed: Value: 1',
      probe: 'Value: 1',
      status: 'Status: committed',
      snapshot: {
        count: 1,
        observedText: 'Value: 1',
        rejectionReason: null,
        status: 'committed',
      },
    })
  })

  test('rejects nextTick with host unmount reason when host is torn down mid-wait', async () => {
    runtime = await createWorkerRuntime({
      worker: new Worker(new URL('./__fixtures__/workers/next-tick.worker.ts', import.meta.url), {
        type: 'module',
      }),
      provider: {
        VNextTickProbe,
      },
    })
    const activeRuntime = runtime

    const trigger = activeRuntime.container.querySelector('#next-tick-trigger')

    if (!(trigger instanceof HTMLButtonElement)) {
      throw new Error('nextTick worker trigger was not rendered')
    }

    await withSuppressedExpectedHostUnmountError(async () => {
      const rejection = waitForExpectedUnmountRejection()

      trigger.click()
      activeRuntime.unmountHost()
      await rejection

      await expect.poll(async () => {
        return activeRuntime.read()
      }).toEqual({
        count: 1,
        observedText: null,
        rejectionReason: REMOTE_LIFECYCLE_REASON_HOST_UNMOUNTED,
        status: 'rejected',
      })
    })
  })
})
