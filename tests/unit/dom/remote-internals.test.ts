import {
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import {
  KIND_COMMENT,
  KIND_TEXT,
} from '@/dom/common/tree'

import { createTreeContext } from '@/dom/remote/context'
import {
  collectProxies,
  prepareProxiesUnset,
  prepareProxies,
  proxyFunctionsIn,
} from '@/dom/remote/proxy'

import {
  createRemoteRoot,
  defineRemoteComponent,
} from '@/dom/remote'

import {
  isRemoteComment,
  isRemoteComponent,
  isRemoteText,
} from '@/dom/remote/tree'

type InvokeSchemaMethods = {
  focus: () => Promise<void>;
  setSelectionRange: (start: number, end: number) => Promise<void>;
}

const invokeTypingRoot = createRemoteRoot(() => {}, { strict: false })
const invokeTypingDescriptor = defineRemoteComponent<'VInput', {}, InvokeSchemaMethods>(
  'VInput',
  [],
  ['focus', 'setSelectionRange']
)
const invokeTypingInput = invokeTypingRoot.createComponent(invokeTypingDescriptor)
invokeTypingInput.invoke('focus')
invokeTypingInput.invoke('setSelectionRange', 0, 2)
// @ts-expect-error invoke must respect method argument tuples
invokeTypingInput.invoke('setSelectionRange', '0', 2)

describe('dom/remote internals', () => {
  test('proxy utilities support fragments, cycles and pre-visited values', () => {
    const root = createRemoteRoot(() => {}, { strict: false })
    const fragment = root.createFragment()

    const source: {
      fn: () => string;
      fragment: typeof fragment;
      self?: unknown;
    } = {
      fn: () => 'ok',
      fragment,
    }
    source.self = source

    const proxied = proxyFunctionsIn(source)
    expect(proxied.fragment).toBe(fragment)
    expect((proxied.self as typeof proxied).self).toBe(proxied.self)

    expect(collectProxies(proxied, new Set([proxied]))).toBeUndefined()
    expect(prepareProxies(source, source, new Set([source]))).toEqual([source, [], true])
    expect(prepareProxiesUnset({ plain: 1 })).toEqual([])
    expect(collectProxies([{ plain: 1 }, { nested: { value: 2 } }])).toEqual([])

    const withProxy = proxyFunctionsIn({ onClick: () => true })
    expect(prepareProxiesUnset(withProxy)).toHaveLength(1)
    expect(prepareProxiesUnset(1)).toEqual([])
    expect(collectProxies([proxyFunctionsIn(() => true)])).toHaveLength(1)
    expect(collectProxies([1])).toEqual([])
  })

  test('descriptor checks props/methods/children support branches', () => {
    type FocusMethods = { focus: (...payload: unknown[]) => Promise<unknown> }
    const descriptor = defineRemoteComponent<'VCard', { title: string }, FocusMethods, 'VButton'>(
      'VCard',
      ['title'],
      ['focus'],
      ['VButton']
    )

    expect(descriptor.hasProperty('title')).toBe(true)
    expect(descriptor.hasProperty('subtitle')).toBe(false)
    expect(descriptor.hasMethod('focus')).toBe(true)
    expect(descriptor.hasMethod('blur')).toBe(false)
    expect(descriptor.supports('VButton')).toBe(true)
    expect(descriptor.supports('VInput')).toBe(false)

    const allowAll = defineRemoteComponent('VAny', [], [], true)
    const allowNone = defineRemoteComponent('VAny', [], [], false)
    const allowByEmptyList = defineRemoteComponent<'VAny', {}, {}, 'VAnyChild'>('VAny', [], [], [] as Array<'VAnyChild'>)

    expect(allowAll.supports('Whatever')).toBe(true)
    expect(allowNone.supports('Whatever')).toBe(false)
    expect(allowByEmptyList.supports('Whatever')).toBe(true)
  })

  test('component updates detach old fragments, attach new ones and skip unchanged primitives', async () => {
    const channel = vi.fn()
    const root = createRemoteRoot(channel, { strict: false })
    const descriptor = defineRemoteComponent<'VCard', { slot: unknown; count: number }>('VCard', ['slot', 'count'])

    const oldFragment = root.createFragment()
    oldFragment.append('old')

    const component = root.createComponent(descriptor, {
      slot: oldFragment,
      count: 1,
    })

    root.append(component)
    await root.mount()

    const newFragment = root.createFragment()
    newFragment.append('new')

    channel.mockClear()
    component.updateProperties({
      slot: newFragment,
      count: 1,
    })

    expect(oldFragment.parent).toBeNull()
    expect(newFragment.parent).toBe(component)
    expect(channel).toHaveBeenCalledWith(
      expect.any(String),
      component.id,
      expect.objectContaining({
        slot: expect.objectContaining({ kind: 'fragment' }),
      })
    )

    expect(root.createComponent('VButton').remove()).toBeNull()
  })

  test('component invoke rejects unsupported descriptor methods', async () => {
    const root = createRemoteRoot(() => {}, { strict: false })
    type FocusMethods = { focus: (...payload: unknown[]) => Promise<unknown> }
    const descriptor = defineRemoteComponent<'VInput', {}, FocusMethods>('VInput', [], ['focus'])
    const input = root.createComponent(descriptor)

    await expect(input.invoke('blur')).rejects.toBe('Method blur is not supported')
  })

  test('insertBefore handles self-reference and non-child anchors', () => {
    const root = createRemoteRoot(() => {}, { strict: false })
    const first = root.createComponent('VFirst')
    const second = root.createComponent('VSecond')
    const foreign = root.createComponent('VForeign')
    const newcomer = root.createComponent('VNewcomer')

    root.append(first, second)
    root.insertBefore(first, first)
    expect(root.children).toEqual([first, second])

    root.insertBefore(first, second)
    expect(root.children).toEqual([first, second])

    root.insertBefore(second, first)
    expect(root.children).toEqual([second, first])

    root.insertBefore(newcomer, second)
    expect(root.children).toEqual([newcomer, second, first])

    expect(() => root.insertBefore(foreign, root.createComponent('VMissing'))).toThrow(
      'Cannot add a child before an element that is not a child of the target parent.'
    )
  })

  test('type guards and node serialization cover comment/text/fragment branches', () => {
    const root = createRemoteRoot(() => {}, { strict: false })
    const comment = root.createComment('note')
    const text = root.createText('value')
    const fragment = root.createFragment()

    fragment.append(comment, text)

    expect(isRemoteComment(comment)).toBe(true)
    expect(isRemoteComment(text)).toBe(false)
    expect(isRemoteComponent(comment)).toBe(false)
    expect(isRemoteComponent(root.createComponent('VComponent'))).toBe(true)
    expect(isRemoteText(text)).toBe(true)
    expect(comment.root).toBe(root)

    expect(fragment.serialize()).toEqual({
      id: fragment.id,
      kind: 'fragment',
      children: [
        { id: comment.id, kind: KIND_COMMENT, text: 'note' },
        { id: text.id, kind: KIND_TEXT, text: 'value' },
      ],
    })

    const printable = root.createComponent('VPrintable', null, 'raw')
    expect(printable.print()).toContain('raw')
  })

  test('tree context ignores duplicate collect and rejects invoke for foreign nodes', () => {
    const context = createTreeContext(() => {})
    const fakeNode = {
      id: 'n1',
      kind: KIND_TEXT,
      text: '',
      serialize: () => ({ id: 'n1', kind: KIND_TEXT, text: '' }),
    } as never

    context.collect(fakeNode)
    context.collect(fakeNode)

    expect(() => context.invoke({ id: 'x' } as never, 'method', [])).toThrow(
      'Cannot invoke method for a node that was not created by this remote root'
    )
  })

  test('detaches fragment properties when component is removed', () => {
    const root = createRemoteRoot(() => {}, { strict: false })
    const fragment = root.createFragment()
    fragment.append('payload')

    const component = root.createComponent('VCard', { slot: fragment })
    root.append(component)

    expect(fragment.parent).toBe(component)

    component.remove()

    expect(fragment.parent).toBeNull()
  })
})
