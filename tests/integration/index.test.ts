import type {
  RemoteReceiver,
} from '@remote-ui/core'

import type {
  App,
  Component,
  ComponentPublicInstance,
  MethodOptions,
} from 'vue'

import type {
  SerializedMouseEvent,
} from '~types/events'

import type {
  None,
} from '~types/scaffolding'

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals'

import AttachedRoot from '@/host/AttachedRoot'

import {
  createApp,
  h,
  nextTick,
  ref,
} from 'vue'

import {
  createRemoteRoot,
  createRemoteReceiver,
} from '@remote-ui/core'

import createProvider from '@/host/createProvider'

import createRemoteRenderer from '@/remote/createRemoteRenderer'

import VButton from './fixtures/host/VButton.vue'
import VRemote from './fixtures/remote/VRemote.vue'

describe('vue', () => {
  let el: HTMLElement | null = null

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

  const createRemoteApp = async <M extends MethodOptions>(
    component: Component<None, None, None, None, M>,
    receiver: RemoteReceiver
  ): Promise<{
    app: App,
    vm: ComponentPublicInstance<None, None, None, None, M>,
  }> => {
    const root = createRemoteRoot(receiver.receive)
    const { createApp } = createRemoteRenderer(root)

    const app = createApp(component)

    const vm = app.mount(root) as ComponentPublicInstance<None, None, None, None, M>

    await root.mount()
    await receiver.flush()

    return { app, vm }
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

  test('patches text when reactive data is changed', async () => {
    const receiver = createRemoteReceiver()

    createHostApp(receiver).mount(el as HTMLElement)

    const { vm } = await createRemoteApp<{
      increment (): void;
        }>({
          setup (_, { expose }) {
            const count = ref(0)

            expose({
              increment: () => count.value++,
            })

            return () => h('span', count.value)
          },
        }, receiver)

    expect(el?.innerHTML).toBe('<span>0</span>')

    vm.increment()

    await nextTick()
    await receiver.flush()

    expect(el?.innerHTML).toBe('<span>1</span>')
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