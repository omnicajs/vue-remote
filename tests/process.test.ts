import {
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import { process } from '@/vue/host/render'
import { ref } from 'vue'

describe('process', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'DragEvent', { value: class DragEvent {}, writable: true })
    Object.defineProperty(window, 'PointerEvent', { value: class PointerEvent {}, writable: true })
  })

  test('returns undefined if properties are undefined', () => {
    expect(process(undefined)).toBeUndefined()
  })

  test('replaces javascript: schema with javascript:void(0);', () => {
    const properties = ref({
      href: 'javascript:alert(1)',
      src: 'JAVASCRIPT:alert(2)',
      action: '  javascript:alert(3)  ',
      other: 'http://example.com',
    })

    expect(process(properties)).toEqual({
      href: 'javascript:void(0);',
      src: 'javascript:void(0);',
      action: 'javascript:void(0);',
      other: 'http://example.com',
    })
  })

  test('replaces decoded javascript: schema', () => {
    const properties = ref({
      href: 'java%73cript:alert(1)',
    })

    expect(process(properties)).toEqual({
      href: 'javascript:void(0);',
    })
  })

  test('does not throw on non-URI strings with percent signs', () => {
    const properties = ref({
      width: '28.5%',
      progress: '100%',
      other: 'http://example.com/100%25',
    })

    expect(() => process(properties)).not.toThrow()
    expect(process(properties)).toEqual({
      width: '28.5%',
      progress: '100%',
      other: 'http://example.com/100%25',
    })
  })

  test('wraps event handlers and serializes Event arguments', () => {
    const onClick = vi.fn()
    const properties = ref({
      onClick,
    })
    const result = process(properties) as { onClick: (event: Event, payload: string) => void }

    expect(typeof result.onClick).toBe('function')

    result.onClick(new MouseEvent('click'), 'extra')

    expect(onClick).toHaveBeenCalledTimes(1)

    const [arg1, arg2] = onClick.mock.calls[0]

    expect(arg1).toMatchObject({ type: 'click' })
    expect(arg1).not.toBeInstanceOf(MouseEvent)
    expect(arg2).toBe('extra')
  })

  test('event handler handles missing property on execution', () => {
    const properties = ref<{ onClick?: () => void }>({
      onClick: vi.fn(),
    })

    const result = process(properties) as { onClick: () => void }

    delete properties.value.onClick

    expect(() => result.onClick()).not.toThrow()
  })
})
