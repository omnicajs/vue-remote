import {
  afterEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import {
  createStaticVNode,
  defineComponent,
  h,
} from 'vue'

import {
  createRemoteRenderer,
  createRemoteRoot,
  KIND_COMPONENT,
  KIND_COMMENT,
  KIND_TEXT,
} from '@/vue/remote'

import type {
  RemoteComment,
  RemoteComponent,
  RemoteRoot,
  RemoteText,
} from '@/vue/remote'
import { createNoopChannel } from './__fixtures__/channel'

type RemoteNode =
  | RemoteComment<RemoteRoot>
  | RemoteComponent<string, RemoteRoot>
  | RemoteText<RemoteRoot>

function assertComponent (node: RemoteNode): asserts node is RemoteComponent<string, RemoteRoot> {
  expect(node.kind).toBe(KIND_COMPONENT)
}

function assertText (node: RemoteNode): asserts node is RemoteText<RemoteRoot> {
  expect(node.kind).toBe(KIND_TEXT)
}

describe('createRemoteRenderer', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('parses static svg content without DOM API', () => {
    vi.stubGlobal('document', undefined)
    vi.stubGlobal('DOMParser', undefined)

    const root = createRemoteRoot(createNoopChannel(), {
      strict: false,
    })
    const { createApp } = createRemoteRenderer(root)

    createApp({
      render: () => h('div', [
        createStaticVNode('<svg viewBox="0 0 16 16"><path d="M1 1h14v14H1z"></path></svg>', 1),
      ]),
    }).mount(root)

    expect(root.children).toHaveLength(1)

    const container = root.children[0]
    assertComponent(container)
    expect(container.type).toBe('div')
    expect(container.children).toHaveLength(1)

    const svg = container.children[0]
    assertComponent(svg)
    expect(svg.type).toBe('svg')
    expect(svg.properties).toEqual({ viewBox: '0 0 16 16' })

    const path = svg.children[0]
    assertComponent(path)
    expect(path.type).toBe('path')
    expect(path.properties).toEqual({ d: 'M1 1h14v14H1z' })
  })

  test('decodes entities and handles void html tags without DOM API', () => {
    vi.stubGlobal('document', undefined)
    vi.stubGlobal('DOMParser', undefined)

    const root = createRemoteRoot(createNoopChannel(), {
      strict: false,
    })
    const { createApp } = createRemoteRenderer(root)

    createApp({
      render: () => h('section', [
        createStaticVNode('<div>Hello&nbsp;<img src="logo.png">World</div>', 1),
      ]),
    }).mount(root)

    const section = root.children[0]
    assertComponent(section)
    expect(section.type).toBe('section')

    const div = section.children[0]
    assertComponent(div)
    expect(div.type).toBe('div')
    expect(div.children).toHaveLength(3)

    const textBefore = div.children[0]
    assertText(textBefore)
    expect(textBefore.text).toBe('Hello\u00A0')

    const image = div.children[1]
    assertComponent(image)
    expect(image.type).toBe('img')
    expect(image.properties).toEqual({ src: 'logo.png' })

    const textAfter = div.children[2]
    assertText(textAfter)
    expect(textAfter.text).toBe('World')
  })

  test('creates comment nodes from static content without DOM API', () => {
    vi.stubGlobal('document', undefined)
    vi.stubGlobal('DOMParser', undefined)

    const root = createRemoteRoot(createNoopChannel(), {
      strict: false,
    })
    const { createApp } = createRemoteRenderer(root)

    createApp({
      render: () => h('div', [
        createStaticVNode('<!--loader-->', 1),
      ]),
    }).mount(root)

    const container = root.children[0]
    assertComponent(container)

    expect(container.children).toHaveLength(1)
    expect(container.children[0].kind).toBe(KIND_COMMENT)
  })

  test('creates placeholder text node when static content is empty', () => {
    vi.stubGlobal('document', undefined)
    vi.stubGlobal('DOMParser', undefined)

    const root = createRemoteRoot(createNoopChannel(), {
      strict: false,
    })
    const { createApp } = createRemoteRenderer(root)

    createApp({
      render: () => h('div', [
        createStaticVNode('', 1),
      ]),
    }).mount(root)

    const container = root.children[0]
    assertComponent(container)
    expect(container.children).toHaveLength(1)

    const placeholder = container.children[0]
    assertText(placeholder)
    expect(placeholder.text).toBe('')
  })

  test('limits native v-model runtime listeners to supported events', () => {
    const root = createRemoteRoot(createNoopChannel(), {
      strict: false,
    })
    const { createApp } = createRemoteRenderer(root)

    createApp(defineComponent({
      template: '<input v-model="value">',
      setup: () => ({
        value: 'hello',
      }),
    })).mount(root)

    const input = root.children[0]
    assertComponent(input)

    expect(input.properties).toHaveProperty('__vModel:onInput')
    expect(input.properties).toHaveProperty('__vModel:onChange')
    expect(input.properties).toHaveProperty('__vModel:onCompositionstart')
    expect(input.properties).toHaveProperty('__vModel:onCompositionend')
    expect(input.properties).not.toHaveProperty('onInput')

    expect(() => (input as typeof input & {
      addEventListener: (name: string, listener: () => void, options?: unknown) => void;
    }).addEventListener('click', () => {})).toThrow(/only supports/)

    expect(() => (input as typeof input & {
      addEventListener: (name: string, listener: () => void, options?: unknown) => void;
    }).addEventListener('input', () => {}, { capture: true })).toThrow(/does not support addEventListener options/)

    expect(() => (input as typeof input & {
      dispatchEvent: (event: Event) => boolean;
    }).dispatchEvent(new Event('click'))).toThrow(/only supports/)
  })
})
