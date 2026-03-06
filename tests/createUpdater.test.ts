import type {
  ReceivedText,
} from '@/dom/host/tree'

import {
  afterEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import {
  createUpdater,
  type UpdateHandler,
} from '@/dom/host/updater'

describe('createUpdater', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test('keeps handlers until the last subscriber unregisters', async () => {
    vi.useFakeTimers()

    const updater = createUpdater()
    const received = { id: '1', kind: 'text', text: '', version: 0 } as unknown as ReceivedText
    const handler1: UpdateHandler = vi.fn()
    const handler2: UpdateHandler = vi.fn()

    const off1 = updater.register(received, handler1)
    const off2 = updater.register(received, handler2)

    off1()
    off1()

    const pending = updater.enqueueUpdate(received)
    vi.runAllTimers()
    await pending

    expect(handler1).not.toHaveBeenCalled()
    expect(handler2).toHaveBeenCalledOnce()

    off2()
    off2()

    const second = updater.enqueueUpdate(received)
    vi.runAllTimers()
    await second

    expect(handler2).toHaveBeenCalledOnce()
  })
})
