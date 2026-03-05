import {
  afterEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import {
  KIND_COMPONENT,
  KIND_FRAGMENT,
  KIND_TEXT,
  ROOT_ID,
} from '@/dom/common/tree'
import {
  ACTION_INSERT_CHILD,
  ACTION_MOUNT,
} from '@/dom/common/channel'

import { createContext } from '@/dom/host/context'
import { createInvoker } from '@/dom/host/invoker'
import { createReceiver } from '@/dom/host/receiver'
import {
  createUpdater,
  type UpdateHandler,
} from '@/dom/host/updater'

import {
  addVersion,
  deserialize,
  isReceivedComment,
  isReceivedFragment,
  isReceivedText,
} from '@/dom/host/tree'
import type {
  ReceivedComponent,
  ReceivedFragment,
  ReceivedText,
} from '@/dom/host/tree'

describe('dom/host internals', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test('invoker handles missing handlers, thrown values and idempotent unregister', () => {
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

  test('context attach/detach handles fragments in component props', () => {
    const context = createContext()

    const fragment = {
      id: 'f1',
      kind: KIND_FRAGMENT,
      children: [{
        id: 't1',
        kind: KIND_TEXT,
        text: 'nested',
        version: 0,
      }],
      version: 0,
    } as unknown as ReceivedFragment

    const component = {
      id: 'c1',
      kind: KIND_COMPONENT,
      type: 'VCard',
      properties: {
        slot: fragment,
        title: 'Card',
      },
      children: [],
      version: 0,
    } as unknown as ReceivedComponent

    context.attach(component)
    expect(context.get(ROOT_ID)).toBe(context.root)
    expect(context.get(component.id)).toBe(component)
    expect(context.get(fragment.id)).toBe(fragment)
    expect(context.get('t1')).toEqual(expect.objectContaining({ kind: KIND_TEXT }))

    const text = { id: 'loose', kind: KIND_TEXT, text: 'value', version: 0 } as ReceivedText
    context.attach(text)
    expect(context.get('loose')).toBe(text)

    context.detach(component)
    context.detach(text)

    expect(context.get(component.id)).toBeNull()
    expect(context.get(fragment.id)).toBeNull()
    expect(context.get('t1')).toBeNull()
    expect(context.get('loose')).toBeNull()
  })

  test('updater unregister keeps handlers until the last subscriber', async () => {
    vi.useFakeTimers()

    const updater = createUpdater()
    const received = { id: '1', kind: KIND_TEXT, text: '', version: 0 } as ReceivedText
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

  test('deserialization guards work for both positive and negative cases', () => {
    const comment = deserialize({ id: 'c', kind: 'comment', text: 'x' }, addVersion)
    const fragment = deserialize({ id: 'f', kind: 'fragment', children: [] }, addVersion)
    const text = deserialize({ id: 't', kind: 'text', text: 'x' }, addVersion)

    expect(isReceivedComment(comment)).toBe(true)
    expect(isReceivedComment({ kind: 'comment' })).toBe(false)
    expect(isReceivedComment({ kind: 'text', version: 1 })).toBe(false)

    expect(isReceivedFragment(fragment)).toBe(true)
    expect(isReceivedFragment({ kind: 'fragment' })).toBe(false)
    expect(isReceivedFragment({ kind: 'comment', version: 1 })).toBe(false)

    expect(isReceivedText(text)).toBe(true)
    expect(isReceivedText({ kind: 'text' })).toBe(false)
    expect(isReceivedText({ kind: 'comment', version: 1 })).toBe(false)
  })

  test('receiver keeps channel processing for malformed inserts with missing old child', () => {
    const receiver = createReceiver()

    receiver.receive(ACTION_MOUNT, [{
      id: '1',
      kind: KIND_COMPONENT,
      type: 'Owner',
      properties: {},
      children: [],
    }, {
      id: '2',
      kind: KIND_COMPONENT,
      type: 'Hijacker',
      properties: {},
      children: [],
    }])

    receiver.receive(
      ACTION_INSERT_CHILD,
      '2',
      0,
      {
        id: '3',
        kind: KIND_COMPONENT,
        type: 'Card',
        properties: {},
        children: [],
      },
      '1'
    )

    const hijacker = receiver.tree.root.children[1] as {
      children: unknown[];
    }
    expect(hijacker.children).toEqual([undefined])
  })
})
