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
})
