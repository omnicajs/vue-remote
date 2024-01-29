import type {
  RemoteReceiver,
} from '@remote-ui/core'

import {
  Component,
} from '@vue/runtime-core'

import type {
  SerializedMouseEvent,
} from '../types/events'

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals'

import AttachedRoot from '@/host/AttachedRoot'

import { createApp, h } from 'vue'

import {
  createRemoteRoot,
  createRemoteReceiver,
} from '@remote-ui/core'

import createProvider from '@/host/createProvider'

import createRemoteRenderer from '@/remote/createRemoteRenderer'

import VRemote from './fixtures/remote/VRemote.vue'
import VButton from './fixtures/host/VButton.vue'

describe('vue', () => {
  let el: HTMLElement | null = null;

  const createHostApp = (receiver: RemoteReceiver, components: {
    [key: string]: Component<NonNullable<unknown>>;
  } = {}) => {
    const provider = createProvider(components)

    return createApp({
      render: () => h(AttachedRoot, {
        provider,
        receiver,
      }),
    })
  }

  const createRemoteApp = async (component: Component, receiver: RemoteReceiver) => {
    const root = createRemoteRoot(receiver.receive)
    const { createApp} = createRemoteRenderer(root)

    const app = createApp(component)

    app.mount(root)

    await root.mount()
    await receiver.flush()

    return app
  }

  beforeEach(() => {
    el = document.createElement('div')
    document.body.append(el)
  })

  afterEach(() => {
    el?.remove()
    el = null
  })

  test.each`
    tag       | expected
    ${'a'}    | ${'<a>Test content</a>'}
    ${'b'}    | ${'<b>Test content</b>'}
    ${'i'}    | ${'<i>Test content</i>'}
    ${'div'}  | ${'<div>Test content</div>'}
    ${'span'} | ${'<span>Test content</span>'}
  `('renders <$tag> element', async ({ tag, expected }) => {
    const receiver = createRemoteReceiver()

    createHostApp(receiver).mount(el as HTMLElement)

    await createRemoteApp({
      render: () => h(tag, 'Test content'),
    }, receiver)

    expect(el?.innerHTML).toBe(expected)
  })

  test('processes click events on elements', async () => {
    const receiver = createRemoteReceiver()

    createHostApp(receiver).mount(el as HTMLElement)

    const onClick = jest.fn()

    await createRemoteApp({
      render: () => h('button', { onClick }, 'Click me'),
    }, receiver)

    await el?.querySelector('button')?.click()
    await receiver.flush()

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledWith({
      type: 'click',
      bubbles: true,
      button: 0,
      clientX: 0,
      clientY: 0,
    } as SerializedMouseEvent)
  })

  test('processes events on components', async () => {
    const receiver = createRemoteReceiver()

    createHostApp(receiver, {
      VButton,
    }).mount(el as HTMLElement)

    const onClick = jest.fn()

    await createRemoteApp({
      render () {
        return h(VRemote, { onClick }, () => 'Click me')
      },
    }, receiver)

    expect(el?.innerHTML).toBe('<button>Click me</button>')

    await el?.querySelector('button')?.click()
    await receiver.flush()

    expect(onClick).toHaveBeenCalledTimes(1)

    await el?.querySelector('button')?.click()
    await receiver.flush()

    expect(onClick).toHaveBeenCalledTimes(2)
  })
})