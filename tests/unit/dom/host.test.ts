import {
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import { createEmitter } from '@/dom/host/emitter'

describe('dom/host', () => {
  describe('emitter', () => {
    test('on & off', () => {
      const emitter = createEmitter()
      const on1 = vi.fn()
      const on2 = vi.fn()

      const off1 = emitter.on('abc', on1)
      const off2 = emitter.on('abc', on2)

      emitter.emit('abc')

      expect(on1).toHaveBeenCalledOnce()
      expect(on2).toHaveBeenCalledOnce()

      emitter.emit('abc')
      emitter.emit('abc')
      emitter.emit('abc')

      expect(on1).toHaveBeenCalledTimes(4)
      expect(on2).toHaveBeenCalledTimes(4)

      off1()

      emitter.emit('abc')
      emitter.emit('abc')
      emitter.emit('abc')

      expect(on1).toHaveBeenCalledTimes(4)
      expect(on2).toHaveBeenCalledTimes(7)

      off2()

      expect(off2).not.toThrow()

      emitter.emit('abc')

      expect(on1).toHaveBeenCalledTimes(4)
      expect(on2).toHaveBeenCalledTimes(7)
    })
  })
})