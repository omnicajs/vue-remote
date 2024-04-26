import type { Receiver } from '@/dom/host'

import type {
  App,
  Component,
  ComponentPublicInstance,
  MethodOptions,
} from 'vue'

import type {
  SerializedMouseEvent,
  SerializedFocusEvent,
} from '~types/events'

import type {
  None,
} from '~types/scaffolding'

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import { HostedTree } from '@/vue/host'

import {
  createApp,
  h,
  nextTick,
  shallowRef,
  ref,
} from 'vue'

import { createReceiver } from '@/dom/host'
import { createProvider } from '@/vue/host'
import { createRemoteRoot } from '@/dom/remote'
import { createRemoteRenderer } from '@/vue/remote'

import VButton from './fixtures/host/VButton.vue'
import VRemote from './fixtures/remote/VRemote.vue'

Object.defineProperty(window, 'DragEvent', { value: class DragEvent {} }) // fix ReferenceError: DragEvent is not defined
Object.defineProperty(window, 'PointerEvent', { value: class PointerEvent {} }) // fix ReferenceError: PointerEvent is not defined

describe('vue', () => {
  let el: HTMLElement | null = null

  const createHostApp = (receiver: Receiver, components: {
    [key: string]: Component<NonNullable<unknown>>;
  } = {}) => {
    const provider = createProvider(components)

    return createApp({
      setup (_, { expose }) {
        const _receiver = shallowRef(receiver)
        expose({
          setReceiver: (receiver: Receiver) => _receiver.value = receiver,
        })
        return () => h(HostedTree, {
          provider,
          receiver: _receiver.value,
        })
      },
    })
  }

  const createRemoteApp = async <M extends MethodOptions>(
    component: Component<None, None, None, None, M>,
    receiver: Receiver
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
    const receiver = createReceiver()

    createHostApp(receiver).mount(el as HTMLElement)

    await createRemoteApp({
      render: () => h(tag, 'Test content'),
    }, receiver)

    expect(el?.innerHTML).toBe(expected)
  })

  test('patches text when reactive data is changed', async () => {
    const receiver = createReceiver()

    createHostApp(receiver).mount(el as HTMLElement)

    const { vm } = await createRemoteApp<{ increment (): void; }>({
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

  test('processes clicks on elements', async () => {
    const receiver = createReceiver()

    createHostApp(receiver).mount(el as HTMLElement)

    const onClick = vi.fn()

    await createRemoteApp({
      render: () => h('button', { onClick }, 'Click me'),
    }, receiver)

    el?.querySelector('button')?.click()
    await receiver.flush()

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledWith({
      type: 'click',
      bubbles: true,
      button: 0,
      cancelable: true,
      clientX: 0,
      clientY: 0,
      composed: true,
      defaultPrevented: false,
      eventPhase: 2,
      isTrusted: false,
    } as SerializedMouseEvent)
  })

  test('processes events on components', async () => {
    const receiver = createReceiver()

    createHostApp(receiver, {
      VButton,
    }).mount(el as HTMLElement)

    const onClick = vi.fn()

    await createRemoteApp({
      render () {
        return h(VRemote, { onClick }, () => 'Click me')
      },
    }, receiver)

    expect(el?.innerHTML).toBe('<button>Click me</button>')

    el?.querySelector('button')?.click()
    await receiver.flush()

    expect(onClick).toHaveBeenCalledTimes(1)

    el?.querySelector('button')?.click()
    await receiver.flush()

    expect(onClick).toHaveBeenCalledTimes(2)
  })

  test('processes FocusEvent on elements', async () => {
    const receiver = createReceiver()

    createHostApp(receiver).mount(el as HTMLElement)

    const onClick = vi.fn()

    await createRemoteApp({
      render: () => h('button', { onClick }, 'Click me'),
    }, receiver)

    el?.querySelector('button')?.dispatchEvent(new FocusEvent('click', {
      relatedTarget: null,
    }))

    await receiver.flush()

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledWith({
      type: 'click',
      bubbles: false,
      cancelable: false,
      composed: false,
      defaultPrevented: false,
      eventPhase: 2,
      isTrusted: false,
      relatedTarget: null,
    } as SerializedFocusEvent)
  })

  test('calls methods of elements', async () => {
    const receiver = createReceiver()

    createHostApp(receiver).mount(el as HTMLElement)

    const onClick = vi.fn()

    const { vm } = await createRemoteApp<{ click: () => Promise<void> }>({
      setup (_, { expose }) {
        const button = ref<{ invoke: (method: string) => Promise<void> } | null>(null)

        expose({
          click: () => button.value?.invoke('click') ?? Promise.resolve(),
        })

        return () => h('button', {
          ref: button,
          onClick,
        }, 'Click me')
      },
    }, receiver)

    await vm.click()
    await receiver.flush()

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledWith({
      type: 'click',
      bubbles: true,
      button: 0,
      cancelable: true,
      clientX: 0,
      clientY: 0,
      composed: true,
      defaultPrevented: false,
      eventPhase: 2,
      isTrusted: false,
    } as SerializedMouseEvent)
  })

  test('can reuse existing HostingTree if receiver was replaced', async () => {
    const receiver1 = createReceiver()
    const receiver2 = createReceiver()

    const host1 = createHostApp(receiver1)
    const host2 = createHostApp(receiver2)

    const vm = host1.mount(el as HTMLElement) as ComponentPublicInstance<None, None, None, None, {
      setReceiver (receiver: Receiver): void;
    }>

    host2.mount(document.createElement('div'))

    await createRemoteApp({
      render: () => h('div', 'HTMLDivElement'),
    }, receiver1)

    await createRemoteApp({
      render: () => h('span', 'HTMLSpanElement'),
    }, receiver2)

    await receiver1.flush()
    await receiver2.flush()

    expect(el?.innerHTML).toBe('<div>HTMLDivElement</div>')

    vm.setReceiver(receiver2)

    await nextTick()

    expect(el?.innerHTML).toBe('<span>HTMLSpanElement</span>')
  })
})