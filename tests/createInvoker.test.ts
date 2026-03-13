import {
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import { createInvoker } from '@/dom/host/invoker'

describe('createInvoker', () => {
  test('handles missing handlers, thrown values and idempotent unregister', () => {
    const invoker = createInvoker()
    const resolve = vi.fn()
    const reject = vi.fn()

    invoker.invoke('1', 'ping', [], resolve, reject)
    expect(reject).toHaveBeenLastCalledWith('No handler for node [ID=1]')

    const off = invoker.register('1', () => {
      // eslint-disable-next-line no-throw-literal
      throw 'broken'
    })

    invoker.invoke('1', 'ping', [], resolve, reject)
    expect(reject).toHaveBeenLastCalledWith('broken')

    off()
    off()
  })

  test('unwraps async handler results before resolving transport callbacks', async () => {
    const invoker = createInvoker()
    const resolve = vi.fn()
    const reject = vi.fn()

    invoker.register('1', (method) => {
      if (method === 'ping') {
        return Promise.resolve('pong')
      }

      return Promise.reject(new Error('broken async'))
    })

    invoker.invoke('1', 'ping', [], resolve, reject)
    await Promise.resolve()

    expect(resolve).toHaveBeenCalledWith('pong')
    expect(reject).not.toHaveBeenCalled()

    invoker.invoke('1', 'boom', [], resolve, reject)
    await Promise.resolve()

    expect(reject).toHaveBeenLastCalledWith('broken async')
  })
})
