import type { VNode } from 'vue'
import type { HostedChild } from '@/vue/host/tree'

import {
  afterEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import {
  shallowRef,
  ref,
} from 'vue'

import {
  KIND_COMPONENT,
  KIND_TEXT,
} from '@/dom/common/tree'

import { REMOTE_SLOT } from '@/vue/internals'
import createProvider from '@/vue/host/createProvider'
import {
  process,
  default as render,
} from '@/vue/host/render'

describe('render', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test('reports orphan slots and returns null for empty text nodes', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    const orphanSlot = {
      id: '1',
      kind: KIND_COMPONENT,
      type: REMOTE_SLOT,
      ref: ref(null),
      properties: ref({ name: 'header' }),
      children: shallowRef([]),
      update: vi.fn(),
      release: vi.fn(),
    } as unknown as HostedChild

    const emptyText = {
      id: '2',
      kind: KIND_TEXT,
      text: ref(''),
      update: vi.fn(),
      release: vi.fn(),
    } as unknown as HostedChild

    const provider = createProvider()

    expect(render(orphanSlot, provider)).toBeNull()
    expect(error).toHaveBeenCalledOnce()
    expect(render(emptyText, provider)).toBeNull()
  })

  test('serializes internal native v-model listeners with restricted payload', () => {
    vi.stubGlobal('DragEvent', class DragEvent {})
    vi.stubGlobal('PointerEvent', class PointerEvent {})

    const publicHandler = vi.fn()
    const internalHandler = vi.fn()
    const properties = ref({
      onInput: publicHandler,
      '__vModel:onInput': internalHandler,
    })

    const props = process(properties)
    const input = document.createElement('input')

    input.value = 'hello'

    const event = new Event('input', { bubbles: true })

    Object.defineProperty(event, 'target', {
      value: input,
      configurable: true,
    })

    Object.defineProperty(event, 'currentTarget', {
      value: input,
      configurable: true,
    })

    ;(props?.onInput as (event: Event) => void)(event)

    expect(publicHandler).toHaveBeenCalledWith(expect.objectContaining({
      type: 'input',
      bubbles: true,
      target: {
        value: 'hello',
        checked: false,
      },
      currentTarget: {
        value: 'hello',
        checked: false,
      },
    }))

    expect(internalHandler).toHaveBeenCalledWith({
      type: 'input',
      target: {
        value: 'hello',
        checked: false,
      },
      currentTarget: {
        value: 'hello',
        checked: false,
      },
    })
  })

  test('processes undefined and merges internal handlers while syncing select vnode hooks', () => {
    expect(process(undefined)).toBeUndefined()

    const internalOnly = vi.fn()
    const internalProps = process(ref({
      '__vModel:onChange': internalOnly,
    }))

    const selectMountHook = vi.fn()
    const selectUpdateHook = vi.fn()
    const nestedOption = {
      id: 'nested-option',
      kind: KIND_COMPONENT,
      type: 'option',
      ref: ref(null),
      properties: ref({ selected: true }),
      children: shallowRef([]),
      update: vi.fn(),
      release: vi.fn(),
    } as unknown as HostedChild
    const option = {
      id: 'option',
      kind: KIND_COMPONENT,
      type: 'option',
      ref: ref(null),
      properties: ref({ selected: false }),
      children: shallowRef([]),
      update: vi.fn(),
      release: vi.fn(),
    } as unknown as HostedChild
    const nestedGroup = {
      id: 'group',
      kind: KIND_COMPONENT,
      type: 'optgroup',
      ref: ref(null),
      properties: ref({}),
      children: shallowRef([nestedOption]),
      update: vi.fn(),
      release: vi.fn(),
    } as unknown as HostedChild
    const text = {
      id: 'text',
      kind: KIND_TEXT,
      text: ref('ignored'),
      update: vi.fn(),
      release: vi.fn(),
    } as unknown as HostedChild
    const select = {
      id: 'select',
      kind: KIND_COMPONENT,
      type: 'select',
      ref: ref(null),
      properties: ref({
        onVnodeMounted: [selectMountHook, null],
        onVnodeUpdated: selectUpdateHook,
        selectedIndex: 1,
      }),
      children: shallowRef([text, nestedGroup, option]),
      update: vi.fn(),
      release: vi.fn(),
    } as unknown as HostedChild

    const internalEvent = new Event('change')
    const selectElement = document.createElement('select')
    selectElement.append(
      document.createElement('option'),
      document.createElement('option')
    )

    ;(internalProps?.onChange as (event: Event) => void)(internalEvent)
    expect(internalOnly).toHaveBeenCalledWith({
      type: 'change',
      target: null,
      currentTarget: null,
    })

    const vnode = render(select, createProvider()) as VNode
    expect(vnode).not.toBeNull()

    ;(vnode.props as Record<string, (payload: unknown) => void>).onVnodeMounted({
      el: document.createElement('div'),
    })
    ;(vnode.props as Record<string, (payload: unknown) => void>).onVnodeUpdated({
      el: selectElement,
    })

    expect(selectMountHook).toHaveBeenCalledOnce()
    expect(selectUpdateHook).toHaveBeenCalledOnce()
    expect(selectElement.options[0].selected).toBe(false)
    expect(selectElement.options[1].selected).toBe(true)
    expect(selectElement.selectedIndex).toBe(1)
  })
})
