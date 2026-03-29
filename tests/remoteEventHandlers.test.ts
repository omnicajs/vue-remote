import {
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import {
  isEventHandler,
  isRemoteEventHandler,
  normalizeEventHandler,
  normalizeEventHandlers,
  wrapEventHandler,
} from '@/vue/events'
import { applyEventHandlerSteps } from '@/vue/host/modifiers'

describe('remote event handlers', () => {
  test('returns original values when wrapping is not applicable', () => {
    const handler = vi.fn()

    expect(normalizeEventHandler(handler)).toEqual({
      callback: handler,
      steps: [],
    })
    expect(wrapEventHandler(handler, 'modifiers', [])).toBe(handler)
    expect(wrapEventHandler('noop', 'modifiers', ['stop'])).toBe('noop')
    expect(normalizeEventHandler('noop')).toBeUndefined()
  })

  test('caches wrapped handlers and preserves nested steps', () => {
    const handler = vi.fn()

    const withStop = wrapEventHandler(handler, 'modifiers', ['stop'])
    const withStopAgain = wrapEventHandler(handler, 'modifiers', ['stop'])
    const withEnter = wrapEventHandler(withStop, 'keys', ['enter'])

    expect(withStopAgain).toBe(withStop)
    expect(isEventHandler(withEnter)).toBe(true)
    expect(isRemoteEventHandler(withEnter)).toBe(true)
    expect(normalizeEventHandler(withEnter)).toEqual({
      callback: handler,
      steps: [
        ['keys', ['enter']],
        ['modifiers', ['stop']],
      ],
    })
  })

  test('normalizes arrays of remote event handlers', () => {
    const first = vi.fn()
    const second = vi.fn()
    const withPrevent = wrapEventHandler(first, 'modifiers', ['prevent'])
    const withEnter = wrapEventHandler(second, 'keys', ['enter'])

    expect(normalizeEventHandlers([withPrevent, withEnter])).toEqual([
      {
        callback: first,
        steps: [['modifiers', ['prevent']]],
      },
      {
        callback: second,
        steps: [['keys', ['enter']]],
      },
    ])
  })

  test('flattens nested arrays of remote event handlers', () => {
    const first = vi.fn()
    const second = vi.fn()
    const third = vi.fn()

    expect(normalizeEventHandlers([
      wrapEventHandler(first, 'modifiers', ['stop']),
      [
        wrapEventHandler(second, 'keys', ['left']),
        [wrapEventHandler(third, 'keys', ['right'])],
      ],
    ])).toEqual([
      {
        callback: first,
        steps: [['modifiers', ['stop']]],
      },
      {
        callback: second,
        steps: [['keys', ['left']]],
      },
      {
        callback: third,
        steps: [['keys', ['right']]],
      },
    ])
  })

  test('ignores unsupported values in mixed handler arrays', () => {
    const local = vi.fn()
    const remote = vi.fn()

    expect(normalizeEventHandlers([
      null,
      'noop',
      { handle: true },
      [local, wrapEventHandler(remote, 'modifiers', ['self'])],
    ])).toEqual([
      {
        callback: local,
        steps: [],
      },
      {
        callback: remote,
        steps: [['modifiers', ['self']]],
      },
    ])
  })

  test('preserves remote tuple boundaries while flattening outer arrays', () => {
    const handler = vi.fn()
    const wrapped = wrapEventHandler(
      wrapEventHandler(handler, 'modifiers', ['prevent']),
      'keys',
      ['enter']
    )

    expect(normalizeEventHandlers([[wrapped]])).toEqual([
      {
        callback: handler,
        steps: [
          ['keys', ['enter']],
          ['modifiers', ['prevent']],
        ],
      },
    ])
  })
})

describe('event modifier guards', () => {
  test('applies key guards and aliases', () => {
    expect(applyEventHandlerSteps({} as unknown as Event, [['keys', ['enter']]])).toBe(false)
    expect(applyEventHandlerSteps({ key: 'Escape' } as unknown as Event, [['keys', ['esc']]])).toBe(true)
    expect(applyEventHandlerSteps({ key: 'ArrowRight' } as unknown as Event, [['keys', ['right']]])).toBe(true)
    expect(applyEventHandlerSteps({ key: 'A' } as unknown as Event, [['keys', ['enter']]])).toBe(false)
  })

  test('runs modifier guards for propagation, system keys and exact matching', () => {
    const stopPropagation = vi.fn()
    const preventDefault = vi.fn()
    const target = {}

    expect(applyEventHandlerSteps({
      stopPropagation,
      preventDefault,
      target,
      currentTarget: target,
      ctrlKey: true,
      shiftKey: true,
      altKey: true,
      metaKey: true,
    } as unknown as Event, [[
      'modifiers',
      ['stop', 'prevent', 'self', 'ctrl', 'shift', 'alt', 'meta'],
    ]])).toBe(true)

    expect(stopPropagation).toHaveBeenCalledTimes(1)
    expect(preventDefault).toHaveBeenCalledTimes(1)

    expect(applyEventHandlerSteps({
      target: {},
      currentTarget: {},
    } as unknown as Event, [['modifiers', ['self']]])).toBe(false)

    expect(applyEventHandlerSteps({ ctrlKey: false } as unknown as Event, [['modifiers', ['ctrl']]])).toBe(false)
    expect(applyEventHandlerSteps({ shiftKey: false } as unknown as Event, [['modifiers', ['shift']]])).toBe(false)
    expect(applyEventHandlerSteps({ altKey: false } as unknown as Event, [['modifiers', ['alt']]])).toBe(false)
    expect(applyEventHandlerSteps({ metaKey: false } as unknown as Event, [['modifiers', ['meta']]])).toBe(false)

    expect(applyEventHandlerSteps({ ctrlKey: true } as unknown as Event, [['modifiers', ['exact']]])).toBe(false)
    expect(applyEventHandlerSteps({ ctrlKey: true } as unknown as Event, [['modifiers', ['exact', 'ctrl']]])).toBe(true)
  })

  test('runs mouse button guards and ignores unknown modifiers', () => {
    expect(applyEventHandlerSteps({} as unknown as Event, [['modifiers', ['left']]])).toBe(true)
    expect(applyEventHandlerSteps({ button: 1 } as unknown as Event, [['modifiers', ['left']]])).toBe(false)
    expect(applyEventHandlerSteps({ button: 0 } as unknown as Event, [['modifiers', ['middle']]])).toBe(false)
    expect(applyEventHandlerSteps({ button: 0 } as unknown as Event, [['modifiers', ['right']]])).toBe(false)
    expect(applyEventHandlerSteps({} as unknown as Event, [['modifiers', ['unknown']]])).toBe(true)
  })
})
