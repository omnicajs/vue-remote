import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import {
  addVersion,
  deserialize,
  isReceivedComment,
  isReceivedFragment,
  isReceivedText,
} from '@/dom/host/tree'

import type { Receiver } from '@/dom/host'
import type { Component } from 'vue'

import { createReceiver } from '@/dom/host'
import { HostedTree } from '@/vue/host'
import createProvider from '@/vue/host/createProvider'
import {
  createRemoteRenderer,
  createRemoteRoot,
  defineRemoteComponent,
} from '@/vue/remote'

import {
  Comment,
  createApp,
  createStaticVNode,
  h,
  nextTick,
  ref,
  shallowRef,
} from 'vue'

const createHostApp = (
  receiver: Receiver,
  components: {
    [key: string]: Component<NonNullable<unknown>>;
  } = {}
) => {
  const provider = createProvider(components)

  return createApp({
    setup () {
      const current = shallowRef(receiver)

      return () => h(HostedTree, {
        provider,
        receiver: current.value,
      })
    },
  })
}

describe('coverage bridges', () => {
  beforeEach(() => {
    vi.stubGlobal('DragEvent', class DragEvent extends Event {})
    vi.stubGlobal('PointerEvent', class PointerEvent extends Event {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('covers host tree deserialize and type guards in browser runtime', () => {
    const fragment = { id: 'fragment-1', kind: 'fragment', children: [] } as const
    const component = deserialize({
      id: 'component-1',
      kind: 'component',
      type: 'VCard',
      properties: {
        slot: fragment,
      },
      children: [],
    }, addVersion) as unknown as {
      properties: { slot: { version: number } };
    }

    expect(component.properties.slot.version).toBe(0)

    expect(isReceivedComment({ kind: 'comment', version: 0 })).toBe(true)
    expect(isReceivedComment({ kind: 'comment' })).toBe(false)
    expect(isReceivedComment({ kind: 'text', version: 0 })).toBe(false)

    expect(isReceivedFragment({ kind: 'fragment', version: 0 })).toBe(true)
    expect(isReceivedFragment({ kind: 'fragment' })).toBe(false)
    expect(isReceivedFragment({ kind: 'comment', version: 0 })).toBe(false)

    expect(isReceivedText({ kind: 'text', version: 0 })).toBe(true)
    expect(isReceivedText({ kind: 'text' })).toBe(false)
    expect(isReceivedText({ kind: 'comment', version: 0 })).toBe(false)
  })

  test('renders and updates comments on host via v-if toggled by button clicks', async () => {
    const hostReceiver = createReceiver()

    const element = document.createElement('div')
    document.body.append(element)

    const hostApp = createHostApp(hostReceiver)
    hostApp.mount(element)

    const root = createRemoteRoot(hostReceiver.receive)
    const remote = createRemoteRenderer(root)
    const RemoteToggle = defineRemoteComponent('button', ['click'])

    remote.createApp({
      setup () {
        const shown = ref(true)

        return () => h('section', [
          h(RemoteToggle, {
            onClick: () => {
              shown.value = !shown.value
            },
          }, () => 'Toggle'),
          createStaticVNode('<i data-static="1"></i>', 1),
          shown.value
            ? h('span', 'Visible')
            : h(Comment, 'v-if'),
        ])
      },
    }).mount(root)

    await root.mount()
    await hostReceiver.flush()

    expect(element.innerHTML).toBe('<section><button>Toggle</button><i data-static="1"></i><span>Visible</span></section>')

    const button = element.querySelector('button')
    expect(button).not.toBeNull()

    button?.click()
    await nextTick()
    await hostReceiver.flush()

    expect(element.innerHTML).toBe('<section><button>Toggle</button><i data-static="1"></i><!--v-if--></section>')

    button?.click()
    await nextTick()
    await hostReceiver.flush()

    expect(element.innerHTML).toBe('<section><button>Toggle</button><i data-static="1"></i><span>Visible</span></section>')

    hostApp.unmount()
    element.remove()
  })
})
