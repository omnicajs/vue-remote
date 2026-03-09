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
  Comment,
  createApp,
  createStaticVNode,
  createTextVNode,
  defineComponent,
  h,
  nextTick,
  shallowRef,
  ref,
} from 'vue'

import { createReceiver } from '@/dom/host'
import { createProvider } from '@/vue/host'
import {
  defineRemoteComponent,
  defineRemoteMethod,
  createRemoteRoot,
  createRemoteRenderer,
} from '@/vue/remote'

import { keysOf } from '@/common/scaffolding'

import { VButton } from './__fixtures__/components/VButton.host'
import { VCard } from './__fixtures__/components/VCard.host'

import RemoteButton from './__fixtures__/remote/RemoteButton.vue'
import RemoteCard from './__fixtures__/remote/RemoteCard.vue'
import RemoteNativeTextModel from './__fixtures__/remote/RemoteNativeTextModel.vue'

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'DragEvent', { value: class DragEvent {} })
  Object.defineProperty(window, 'PointerEvent', { value: class PointerEvent {} })
}

describe('HostedTree', () => {
  let el: HTMLElement | null = null

  const createHostApp = (receiver: Receiver, components: {
    [key: string]: Component<NonNullable<unknown>>;
  } = {}) => {
    const provider = createProvider(components)

    return createApp({
      setup (_, { expose }) {
        const tree = ref<{ forceUpdate (): void } | null>(null)
        const _receiver = shallowRef(receiver)
        expose({
          setReceiver: (receiver: Receiver) => _receiver.value = receiver,
          forceUpdate: () => tree.value?.forceUpdate(),
        })
        return () => h(HostedTree, {
          ref: tree,
          provider,
          receiver: _receiver.value,
        })
      },
    })
  }

  const createRemoteApp = async <M extends MethodOptions>(
    component: Component,
    receiver: Receiver,
    components: string[] = keysOf({ VButton, VCard })
  ): Promise<{
    app: App,
    vm: ComponentPublicInstance<None, None, None, None, M>,
  }> => {
    const root = createRemoteRoot(receiver.receive, {
      components,
    })
    const { createApp } = createRemoteRenderer(root)

    const app = createApp(component)

    const vm = app.mount(root) as ComponentPublicInstance<None, None, None, None, M>

    await root.mount()
    await receiver.flush()

    return { app, vm }
  }

  const flushBoundary = async (receiver: Receiver) => {
    await nextTick()
    await receiver.flush()
    await nextTick()
    await receiver.flush()
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

  test('renders static svg content', async () => {
    const receiver = createReceiver()

    createHostApp(receiver).mount(el as HTMLElement)

    await createRemoteApp({
      render: () => h('div', [
        createStaticVNode('<svg viewBox="0 0 16 16"><path d="M1 1h14v14H1z"></path></svg>', 1),
      ]),
    }, receiver)

    expect(el?.innerHTML).toBe('<div><svg viewBox="0 0 16 16"><path d="M1 1h14v14H1z"></path></svg></div>')
  })

  test('renders static spinner svg with animateTransform', async () => {
    const receiver = createReceiver()

    createHostApp(receiver).mount(el as HTMLElement)

    await createRemoteApp({
      render: () => h('div', [
        createStaticVNode(`
          <svg xmlns="http://www.w3.org/2000/svg" version="1.0" fill="currentColor" viewBox="0 0 128 128" style="padding: 2px;">
            <g transform="matrix(-1 0 0 1 128 0)">
              <circle cx="16" cy="64" r="13"/>
              <circle cx="16" cy="64" r="11.344" transform="rotate(45 64 64)"/>
              <circle cx="16" cy="64" r="9.531" transform="rotate(90 64 64)"/>
              <circle cx="16" cy="64" r="7.75" transform="rotate(135 64 64)"/>
              <circle cx="16" cy="64" r="7.063" transform="rotate(180 64 64)"/>
              <circle cx="16" cy="64" r="5.063" transform="rotate(225 64 64)"/>
              <circle cx="16" cy="64" r="4.438" transform="rotate(270 64 64)"/>
              <circle cx="16" cy="64" r="3.375" transform="rotate(315 64 64)"/>
              <animateTransform attributeName="transform" type="rotate" values="0 64 64;315 64 64;270 64 64;225 64 64;180 64 64;135 64 64;90 64 64;45 64 64;" calcMode="discrete" dur="960ms" repeatCount="indefinite"/>
            </g>
          </svg>
        `, 1),
      ]),
    }, receiver)

    const svg = el?.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('version')).toBe('1.0')
    expect(svg?.getAttribute('fill')).toBe('currentColor')
    expect(svg?.getAttribute('viewBox')).toBe('0 0 128 128')
    expect(svg?.querySelectorAll('circle')).toHaveLength(8)

    const animateTransform = svg?.querySelector('animateTransform')
    expect(animateTransform).not.toBeNull()
    expect(animateTransform?.getAttribute('attributeName')).toBe('transform')
    expect(animateTransform?.getAttribute('type')).toBe('rotate')
    expect(animateTransform?.getAttribute('dur')).toBe('960ms')
    expect(animateTransform?.getAttribute('repeatCount')).toBe('indefinite')
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

  test('supports template v-model on text inputs in SFC remote components', async () => {
    const receiver = createReceiver()

    createHostApp(receiver).mount(el as HTMLElement)

    const { vm } = await createRemoteApp<{
      getText (): string;
      setText (value: string): void;
        }>(RemoteNativeTextModel, receiver)

    const input = el?.querySelector('[data-test="text-model"]') as HTMLInputElement

    expect(input.value).toBe('hello')

    input.value = 'world'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    await flushBoundary(receiver)

    expect(vm.getText()).toBe('world')

    vm.setText('remote')

    await flushBoundary(receiver)

    expect(input.value).toBe('remote')
  })

  test('supports template v-model.trim on textarea elements', async () => {
    const receiver = createReceiver()

    createHostApp(receiver).mount(el as HTMLElement)

    const { vm } = await createRemoteApp<{
      getText (): string;
      setText (value: string): void;
        }>(defineComponent({
          template: `
        <textarea
          data-test="trim-model"
          v-model.trim="text"
        />
      `,
          setup (_, { expose }) {
            const text = ref('  hello  ')

            expose({
              getText: () => text.value,
              setText: (value: string) => {
                text.value = value
              },
            })

            return { text }
          },
        }), receiver)

    const textarea = el?.querySelector('[data-test="trim-model"]') as HTMLTextAreaElement

    expect(textarea.value).toBe('  hello  ')

    textarea.value = '  world  '
    textarea.dispatchEvent(new Event('input', { bubbles: true }))

    await flushBoundary(receiver)

    expect(vm.getText()).toBe('world')
    expect(textarea.value).toBe('world')

    vm.setText('  remote  ')

    await flushBoundary(receiver)

    expect(textarea.value).toBe('  remote  ')
  })

  test('supports template v-model on checkbox inputs', async () => {
    const receiver = createReceiver()

    createHostApp(receiver).mount(el as HTMLElement)

    const { vm } = await createRemoteApp<{
      getChecked (): boolean;
      setChecked (value: boolean): void;
        }>(defineComponent({
          template: `
        <input
          data-test="checkbox-model"
          type="checkbox"
          v-model="checked"
        >
      `,
          setup (_, { expose }) {
            const checked = ref(false)

            expose({
              getChecked: () => checked.value,
              setChecked: (value: boolean) => {
                checked.value = value
              },
            })

            return { checked }
          },
        }), receiver)

    const checkbox = el?.querySelector('[data-test="checkbox-model"]') as HTMLInputElement

    expect(checkbox.checked).toBe(false)

    checkbox.checked = true
    checkbox.dispatchEvent(new Event('change', { bubbles: true }))

    await flushBoundary(receiver)

    expect(vm.getChecked()).toBe(true)

    vm.setChecked(false)

    await flushBoundary(receiver)

    expect(checkbox.checked).toBe(false)
  })

  test('supports template v-model on radio inputs', async () => {
    const receiver = createReceiver()

    createHostApp(receiver).mount(el as HTMLElement)

    const { vm } = await createRemoteApp<{
      getPicked (): string;
      setPicked (value: string): void;
        }>(defineComponent({
          template: `
        <div>
          <input
            data-test="radio-one"
            type="radio"
            value="one"
            v-model="picked"
          >
          <input
            data-test="radio-two"
            type="radio"
            value="two"
            v-model="picked"
          >
        </div>
      `,
          setup (_, { expose }) {
            const picked = ref('one')

            expose({
              getPicked: () => picked.value,
              setPicked: (value: string) => {
                picked.value = value
              },
            })

            return { picked }
          },
        }), receiver)

    const first = el?.querySelector('[data-test="radio-one"]') as HTMLInputElement
    const second = el?.querySelector('[data-test="radio-two"]') as HTMLInputElement

    expect(first.checked).toBe(true)
    expect(second.checked).toBe(false)

    second.checked = true
    second.dispatchEvent(new Event('change', { bubbles: true }))

    await flushBoundary(receiver)

    expect(vm.getPicked()).toBe('two')

    vm.setPicked('one')

    await flushBoundary(receiver)

    expect(first.checked).toBe(true)
    expect(second.checked).toBe(false)
  })

  test('supports template v-model on select elements', async () => {
    const receiver = createReceiver()

    createHostApp(receiver).mount(el as HTMLElement)

    const { vm } = await createRemoteApp<{
      getValue (): string;
      setValue (value: string): void;
        }>(defineComponent({
          template: `
        <select
          data-test="select-model"
          v-model="value"
        >
          <option value="one">One</option>
          <option value="two">Two</option>
        </select>
      `,
          setup (_, { expose }) {
            const value = ref('two')

            expose({
              getValue: () => value.value,
              setValue: (next: string) => {
                value.value = next
              },
            })

            return { value }
          },
        }), receiver)

    const select = el?.querySelector('[data-test="select-model"]') as HTMLSelectElement

    expect(select.value).toBe('two')

    select.value = 'one'
    select.dispatchEvent(new Event('change', { bubbles: true }))

    await flushBoundary(receiver)

    expect(vm.getValue()).toBe('one')

    vm.setValue('two')

    await flushBoundary(receiver)

    expect(select.value).toBe('two')
  })

  test('supports template v-model.number on multiple select elements', async () => {
    const receiver = createReceiver()

    createHostApp(receiver).mount(el as HTMLElement)

    const { vm } = await createRemoteApp<{
      getValues (): number[];
      setValues (value: number[]): void;
        }>(defineComponent({
          template: `
        <select
          data-test="select-multiple-model"
          multiple
          v-model.number="values"
        >
          <option :value="1">One</option>
          <option :value="2">Two</option>
          <option :value="3">Three</option>
        </select>
      `,
          setup (_, { expose }) {
            const values = ref([2])

            expose({
              getValues: () => [...values.value],
              setValues: (next: number[]) => {
                values.value = next
              },
            })

            return { values }
          },
        }), receiver)

    const select = el?.querySelector('[data-test="select-multiple-model"]') as HTMLSelectElement
    const [first, second, third] = [...select.options]

    expect(first.selected).toBe(false)
    expect(second.selected).toBe(true)
    expect(third.selected).toBe(false)

    first.selected = true
    second.selected = false
    third.selected = true
    select.dispatchEvent(new Event('change', { bubbles: true }))

    await flushBoundary(receiver)

    expect(vm.getValues()).toEqual([1, 3])

    vm.setValues([2, 3])

    await flushBoundary(receiver)

    expect(first.selected).toBe(false)
    expect(second.selected).toBe(true)
    expect(third.selected).toBe(true)
  })

  test('supports template v-model.lazy on dynamic input types', async () => {
    const receiver = createReceiver()

    createHostApp(receiver).mount(el as HTMLElement)

    const { vm } = await createRemoteApp<{
      getValue (): string;
      setValue (value: string): void;
        }>(defineComponent({
          template: `
        <input
          data-test="dynamic-model"
          :type="type"
          v-model.lazy="value"
        >
      `,
          setup (_, { expose }) {
            const type = ref('text')
            const value = ref('hello')

            expose({
              getValue: () => value.value,
              setValue: (next: string) => {
                value.value = next
              },
            })

            return { type, value }
          },
        }), receiver)

    const input = el?.querySelector('[data-test="dynamic-model"]') as HTMLInputElement

    expect(input.value).toBe('hello')

    input.value = 'draft'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    await flushBoundary(receiver)

    expect(vm.getValue()).toBe('hello')

    input.dispatchEvent(new Event('change', { bubbles: true }))

    await flushBoundary(receiver)

    expect(vm.getValue()).toBe('draft')

    vm.setValue('remote')

    await flushBoundary(receiver)

    expect(input.value).toBe('remote')
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
      target: {},
      currentTarget: {},
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
        return h(RemoteButton, { onClick }, () => 'Click me')
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
      target: {},
      currentTarget: {},
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
      target: {},
      currentTarget: {},
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

  test('calls methods exposed by remote component refs', async () => {
    const receiver = createReceiver()
    const open = vi.fn(async (id: string) => id === 'dialog-1')
    const close = vi.fn(async () => undefined)
    type DialogApi = {
      openDialog: (id: string) => Promise<boolean>;
      closeDialog: () => Promise<void>;
    }

    const VDialog = defineComponent({
      setup (_, { expose }) {
        expose({ open, close })
        return () => h('div', 'Dialog')
      },
    })

    createHostApp(receiver, { VDialog }).mount(el as HTMLElement)

    const RemoteDialog = defineRemoteComponent('VDialog', {
      methods: {
        open: defineRemoteMethod<[id: string], boolean>(),
        close: defineRemoteMethod<[], void>(),
      },
    })

    const { vm } = await createRemoteApp<DialogApi>({
      setup (_, { expose }) {
        const dialog = ref<InstanceType<typeof RemoteDialog> | null>(null)

        expose({
          openDialog: (id: string) => dialog.value?.open(id) ?? Promise.resolve(false),
          closeDialog: () => dialog.value?.close() ?? Promise.resolve(),
        })

        return () => h(RemoteDialog, { ref: dialog })
      },
    }, receiver, ['VButton', 'VCard', 'VDialog'])

    await expect(vm.openDialog('dialog-1')).resolves.toBe(true)
    await expect(vm.closeDialog()).resolves.toBeUndefined()

    expect(open).toHaveBeenCalledWith('dialog-1')
    expect(close).toHaveBeenCalledOnce()
  })

  test('throw error doesn\'t support method when component doesn\'t have it', async () => {
    const receiver = createReceiver()

    createHostApp(receiver).mount(el as HTMLElement)

    const onClick = vi.fn()

    const { vm } = await createRemoteApp<{ click: () => Promise<void> }>({
      setup (_, { expose }) {
        const button = ref<{ invoke: (method: string) => Promise<void> } | null>(null)

        expose({
          click: () => button.value?.invoke('change') ?? Promise.resolve(),
        })

        return () => h('button', {
          ref: button,
          onClick,
        }, 'Click me')
      },
    }, receiver)

    await expect(() => vm.click()).rejects.toThrowError('Node [ID=1, KIND=component, TYPE=button] doesn\'t support method change')
  })

  test('throw error doesn\'t support method when it\'s not a function', async () => {
    const receiver = createReceiver()

    createHostApp(receiver).mount(el as HTMLElement)

    const onClick = vi.fn()

    const { vm } = await createRemoteApp<{ click: () => Promise<void> }>({
      setup (_, { expose }) {
        const button = ref<{ invoke: (method: string) => Promise<void> } | null>(null)

        expose({
          click: () => button.value?.invoke('disabled') ?? Promise.resolve(),
        })

        return () => h('button', {
          ref: button,
          onClick,
        }, 'Click me')
      },
    }, receiver)

    await expect(() => vm.click()).rejects.toThrowError('Node [ID=1, KIND=component, TYPE=button] doesn\'t support method disabled')
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

  test('slots', async () => {
    const receiver = createReceiver()

    createHostApp(receiver, { VButton, VCard }).mount(el as HTMLElement)

    type API = {
      setTitle (content: string): void;
      setText (content: string): void;
    }

    const { vm } = await createRemoteApp<API>({
      setup (_, { expose }) {
        const title = ref('Title')
        const text = ref('Text')

        expose({
          setTitle: (content: string) =>  { title.value = content },
          setText: (content: string) => { text.value = content },
        })

        return () => h(RemoteCard, {
          id: 'card-1',
          title: title.value,
          text: text.value,
        })
      },
    }, receiver)

    await receiver.flush()

    expect(el?.innerHTML).toBe(
      '<section id="card-1" aria-labelledby="card-1-title">' +
        '<div id="card-1-title">Title</div> Text' +
      '</section>'
    )

    vm.setTitle('')

    await nextTick()
    await receiver.flush()

    expect(el?.innerHTML).toBe('<section id="card-1"><!--v-if--> Text</section>')

    vm.setText('')

    await nextTick()
    await receiver.flush()

    expect(el?.innerHTML).toBe('<section id="card-1"><!--v-if--> </section>')

    vm.setTitle('Test')

    await nextTick()
    await receiver.flush()

    expect(el?.innerHTML).toBe(
      '<section id="card-1" aria-labelledby="card-1-title">' +
        '<div id="card-1-title">Test</div> ' +
      '</section>'
    )
  })

  test('renders comment placeholders when conditional content toggles', async () => {
    const receiver = createReceiver()
    const RemoteToggle = defineRemoteComponent('button', ['click'])

    createHostApp(receiver).mount(el as HTMLElement)

    await createRemoteApp({
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
    }, receiver)

    expect(el?.innerHTML).toBe('<section><button>Toggle</button><i data-static="1"></i><span>Visible</span></section>')

    const button = el?.querySelector('button')
    expect(button).not.toBeNull()

    button?.click()
    await nextTick()
    await receiver.flush()

    expect(el?.innerHTML).toBe('<section><button>Toggle</button><i data-static="1"></i><!--v-if--></section>')

    button?.click()
    await nextTick()
    await receiver.flush()

    expect(el?.innerHTML).toBe('<section><button>Toggle</button><i data-static="1"></i><span>Visible</span></section>')
  })

  test('rendered and deleted text when reactive data is changed', async () => {
    const receiver = createReceiver()

    createHostApp(receiver).mount(el as HTMLElement)

    type API = { toggle (): void; }

    const { vm } = await createRemoteApp<API>({
      setup (_, { expose }) {
        const show = ref(true)

        expose({ toggle: () =>  { show.value = !show.value } })

        return () => show.value
          ? createTextVNode('text example')
          : h(Comment, 'comment example')
      },
    }, receiver)

    await receiver.flush()

    expect(el?.innerHTML).toBe('text example')

    vm.toggle()

    await nextTick()
    await receiver.flush()

    expect(el?.innerHTML).not.toBe('text example')
  })

  test('rendered and deleted comment when reactive data is changed', async () => {
    const receiver = createReceiver()

    createHostApp(receiver).mount(el as HTMLElement)

    type API = { toggle (): void; }

    const { vm } = await createRemoteApp<API>({
      setup (_, { expose }) {
        const show = ref(true)

        expose({ toggle: () =>  { show.value = !show.value } })

        return () => show.value ? h(Comment, 'comment example') : ''
      },
    }, receiver)

    await nextTick()
    await receiver.flush()

    expect(el?.innerHTML).toBe('<!--comment example-->')

    vm.toggle()

    await nextTick()
    await receiver.flush()

    expect(el?.innerHTML).not.toBe('<!--comment example-->')
  })

  test('correct rendered after HostedTree is force updated', async () => {
    const receiver = createReceiver()

    const host = createHostApp(receiver).mount(el as HTMLElement) as ComponentPublicInstance<None, None, None, None, {
      forceUpdate (): void;
    }>

    type API = { toggle (): void; }

    const { vm } = await createRemoteApp<API>({
      setup (_, { expose }) {
        const show = ref(true)

        expose({ toggle: () =>  { show.value = !show.value } })

        return () => show.value
          ? createTextVNode('text example')
          : h(Comment, 'comment example')
      },
    }, receiver)

    host.forceUpdate()
    await receiver.flush()

    expect(el?.innerHTML).toBe('text example')

    vm.toggle()
    host.forceUpdate()

    await nextTick()
    await receiver.flush()

    expect(el?.innerHTML).not.toBe('text example')
  })
})
