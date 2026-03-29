import {
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import { process } from '@/vue/host/render'
import {
  withKeys,
  withModifiers,
} from '@/vue/remote'
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

  test('keeps vnode lifecycle hook arrays untouched', () => {
    const mounted = vi.fn()
    const updated = vi.fn()
    const mountHooks = [mounted, null]
    const updateHooks = [updated]
    const properties = ref({
      onVnodeMounted: mountHooks,
      onVnodeUpdated: updateHooks,
    })
    const result = process(properties) as {
      onVnodeMounted: typeof mountHooks;
      onVnodeUpdated: typeof updateHooks;
    }

    expect(Array.isArray(result.onVnodeMounted)).toBe(true)
    expect(Array.isArray(result.onVnodeUpdated)).toBe(true)
    expect(result.onVnodeMounted).toStrictEqual(mountHooks)
    expect(result.onVnodeUpdated).toStrictEqual(updateHooks)
  })

  test('applies host-side stop and prevent modifiers before serializing events', () => {
    const onClick = vi.fn()
    const properties = ref({
      onClick: withModifiers(onClick, ['stop', 'prevent']),
    })
    const result = process(properties) as { onClick: (event: MouseEvent) => void }
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    })

    const stopPropagation = vi.spyOn(event, 'stopPropagation')
    const preventDefault = vi.spyOn(event, 'preventDefault')

    result.onClick(event)

    expect(stopPropagation).toHaveBeenCalledOnce()
    expect(preventDefault).toHaveBeenCalledOnce()
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({
      type: 'click',
      defaultPrevented: true,
    }))
  })

  test('filters self modifiers on the host against the real event target', () => {
    const onClick = vi.fn()
    const properties = ref({
      onClick: withModifiers(onClick, ['self']),
    })
    const result = process(properties) as { onClick: (event: MouseEvent) => void }

    const parent = document.createElement('div')
    const child = document.createElement('span')
    const childEvent = new MouseEvent('click', { bubbles: true })

    Object.defineProperty(childEvent, 'target', { value: child, configurable: true })
    Object.defineProperty(childEvent, 'currentTarget', { value: parent, configurable: true })

    result.onClick(childEvent)
    expect(onClick).not.toHaveBeenCalled()

    const selfEvent = new MouseEvent('click', { bubbles: true })

    Object.defineProperty(selfEvent, 'target', { value: parent, configurable: true })
    Object.defineProperty(selfEvent, 'currentTarget', { value: parent, configurable: true })

    result.onClick(selfEvent)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test('supports nested key and exact modifiers transported from the remote side', () => {
    const onKeydown = vi.fn()
    const properties = ref({
      onKeydown: withKeys(withModifiers(onKeydown, ['exact']), ['enter']),
    })
    const result = process(properties) as { onKeydown: (event: KeyboardEvent) => void }

    result.onKeydown(new KeyboardEvent('keydown', { key: 'Escape' }))
    result.onKeydown(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }))
    result.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }))

    expect(onKeydown).toHaveBeenCalledTimes(1)
    expect(onKeydown).toHaveBeenCalledWith(expect.objectContaining({
      type: 'keydown',
      key: 'Enter',
    }))
  })

  test('processes array-shaped keyboard handlers without leaking native events', () => {
    const onEnter = vi.fn()
    const onSpace = vi.fn()
    const properties = ref({
      onKeydown: [
        withKeys(withModifiers(onEnter, ['prevent']), ['enter']),
        [
          'noop',
          withKeys(withModifiers(onSpace, ['prevent']), ['space']),
        ],
      ],
    })
    const result = process(properties) as { onKeydown: (event: KeyboardEvent) => void }

    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    })

    expect(() => result.onKeydown(escape)).not.toThrow()
    expect(onEnter).not.toHaveBeenCalled()
    expect(onSpace).not.toHaveBeenCalled()

    const enter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    })

    expect(() => result.onKeydown(enter)).not.toThrow()
    expect(enter.defaultPrevented).toBe(true)
    expect(onEnter).toHaveBeenCalledTimes(1)
    expect(onEnter).toHaveBeenCalledWith(expect.objectContaining({
      type: 'keydown',
      key: 'Enter',
      defaultPrevented: true,
    }))
    expect(onEnter.mock.calls[0]?.[0]).not.toBeInstanceOf(KeyboardEvent)

    const space = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      cancelable: true,
    })

    expect(() => result.onKeydown(space)).not.toThrow()
    expect(space.defaultPrevented).toBe(true)
    expect(onSpace).toHaveBeenCalledTimes(1)
    expect(onSpace).toHaveBeenCalledWith(expect.objectContaining({
      type: 'keydown',
      key: ' ',
      defaultPrevented: true,
    }))
    expect(onSpace.mock.calls[0]?.[0]).not.toBeInstanceOf(KeyboardEvent)
  })

  test('keeps option-suffixed event props working with transported modifiers', () => {
    const onClick = vi.fn()
    const properties = ref({
      onClickCaptureOnce: withModifiers(onClick, ['stop']),
    })
    const result = process(properties) as { onClickCaptureOnce: (event: MouseEvent) => void }
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    })

    const stopPropagation = vi.spyOn(event, 'stopPropagation')

    result.onClickCaptureOnce(event)

    expect(stopPropagation).toHaveBeenCalledOnce()
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
