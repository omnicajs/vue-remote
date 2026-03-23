import {
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import {
  createApp,
  defineComponent,
  h,
  nextTick,
  useTemplateRef,
} from 'vue'
import type {
  ShallowRef,
  VNode,
} from 'vue'

import defineRemoteComponent from '@/vue/remote/defineRemoteComponent'
import defineRemoteMethod from '@/vue/remote/defineRemoteMethod'

type RenderFn = () => VNode
type SetupContext = {
  attrs: Record<string, unknown>;
  emit: (event: string, ...args: unknown[]) => void;
  expose: (methods: Record<string, (...args: unknown[]) => unknown>) => void;
  slots: Record<string, unknown>;
}

type ComponentWithSetup = {
  setup: (props: unknown, context: SetupContext) => RenderFn;
}

describe('defineRemoteComponent', () => {
  test('does not add fallthrough handlers when emits are undefined', () => {
    const RemoteDiv = defineRemoteComponent('div')
    const emit = vi.fn()

    const render = (RemoteDiv as unknown as ComponentWithSetup).setup({}, {
      attrs: { id: 'x' },
      emit,
      expose: () => undefined,
      slots: {},
    })

    const vnode = render()

    expect(vnode.props).toEqual(expect.objectContaining({ id: 'x' }))
  })

  test('passes through parent handlers for declared emits', () => {
    const container = document.createElement('div')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const onClick = vi.fn()
    const onClickExtra = vi.fn()
    const onSubmit = vi.fn()
    const onClickInvalid = vi.fn()
    const RemoteForm = defineRemoteComponent('form', {
      click: null,
      submit: null,
    })
    const App = defineComponent({
      setup () {
        return () => h(RemoteForm, {
          onClickCaptureOnce: [onClick, onClickExtra],
          onSubmit,
          onClickCustom: onClickInvalid,
        })
      },
    })
    const app = createApp(App)

    app.mount(container)

    const form = container.querySelector('form')
    form?.dispatchEvent(new Event('click'))
    form?.dispatchEvent(new Event('click'))
    form?.dispatchEvent(new Event('submit', { cancelable: true }))

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClickExtra).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onClickInvalid).not.toHaveBeenCalled()

    app.unmount()
    warn.mockRestore()
  })

  test('supports legacy array emits and skips non-callable matching props', () => {
    const container = document.createElement('div')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const onClick = vi.fn()
    const RemoteButton = defineRemoteComponent('button', ['click'])
    const App = defineComponent({
      setup () {
        return () => h('div', [
          h(RemoteButton, { id: 'valid', onClick }),
          h(RemoteButton, { id: 'invalid', onClick: 'noop' as never }),
        ])
      },
    })
    const app = createApp(App)

    app.mount(container)

    const buttons = container.querySelectorAll('button')
    buttons.item(0).dispatchEvent(new Event('click'))
    buttons.item(1).dispatchEvent(new Event('click'))

    expect(onClick).toHaveBeenCalledTimes(1)

    app.unmount()
    warn.mockRestore()
  })

  test('creates exposed methods that delegate to invoke', async () => {
    const invoke = vi.fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(undefined)
    let exposed: Record<string, (...args: unknown[]) => Promise<unknown>> = {}

    const RemoteDialog = defineRemoteComponent('VDialog', {
      methods: {
        open: defineRemoteMethod<[id: string], boolean>(),
        close: defineRemoteMethod<[], void>(),
      },
    })

    const render = (RemoteDialog as unknown as ComponentWithSetup).setup({}, {
      attrs: {},
      emit: vi.fn(),
      expose: methods => { exposed = methods as typeof exposed },
      slots: {},
    })

    const vnode = render()
    const assignRef = vnode.props?.ref as ((value: { invoke: typeof invoke } | null) => void) | undefined
    assignRef?.({ invoke })

    await expect(exposed.open('dialog-1')).resolves.toBe(true)
    await expect(exposed.close()).resolves.toBeUndefined()

    expect(invoke).toHaveBeenNthCalledWith(1, 'open', 'dialog-1')
    expect(invoke).toHaveBeenNthCalledWith(2, 'close')
  })

  test('rejects invalid method arguments before invoke is called', async () => {
    const invoke = vi.fn().mockResolvedValue(undefined)
    let exposed: Record<string, (...args: unknown[]) => Promise<unknown>> = {}

    const RemoteInput = defineRemoteComponent('VInput', {
      methods: {
        setSelectionRange: (start: number, end: number) => Number.isInteger(start) && Number.isInteger(end),
      },
    })

    const render = (RemoteInput as unknown as ComponentWithSetup).setup({}, {
      attrs: {},
      emit: vi.fn(),
      expose: methods => { exposed = methods as typeof exposed },
      slots: {},
    })

    const vnode = render()
    const assignRef = vnode.props?.ref as ((value: { invoke: typeof invoke } | null) => void) | undefined
    assignRef?.({ invoke })

    await expect(exposed.setSelectionRange(0, 2)).resolves.toBeUndefined()
    await expect(exposed.setSelectionRange(0.5, 2)).rejects.toThrow('Method setSelectionRange rejected the provided arguments')
    expect(invoke).toHaveBeenCalledTimes(1)
    expect(invoke).toHaveBeenCalledWith('setSelectionRange', 0, 2)
  })

  test('supports string-array methods and rejects calls before the remote ref is assigned', async () => {
    let exposed: Record<string, (...args: unknown[]) => Promise<unknown>> = {}

    const RemoteInput = defineRemoteComponent('VInput', {
      methods: ['focus'],
    })

    const render = (RemoteInput as unknown as ComponentWithSetup).setup({}, {
      attrs: {},
      emit: vi.fn(),
      expose: methods => { exposed = methods as typeof exposed },
      slots: {},
    })

    const vnode = render()
    const assignRef = vnode.props?.ref as ((value: unknown | null) => void) | undefined
    assignRef?.(null)

    await expect(exposed.focus()).rejects.toThrow('Remote component focus is not available')
  })

  test('falls back to invoking methods when runtime declarations are not remote validators', async () => {
    const invoke = vi.fn().mockResolvedValue('ok')
    let exposed: Record<string, (...args: unknown[]) => Promise<unknown>> = {}

    const RemoteInput = defineRemoteComponent('VInput', {
      methods: {
        focus: {} as never,
      },
    })

    const render = (RemoteInput as unknown as ComponentWithSetup).setup({}, {
      attrs: {},
      emit: vi.fn(),
      expose: methods => { exposed = methods as typeof exposed },
      slots: {},
    })

    const vnode = render()
    const assignRef = vnode.props?.ref as ((value: { invoke: typeof invoke } | null) => void) | undefined
    assignRef?.({ invoke })

    await expect(exposed.focus()).resolves.toBe('ok')
    expect(invoke).toHaveBeenCalledWith('focus')
  })

  test('rejects when a method validator throws', async () => {
    const invoke = vi.fn().mockResolvedValue(undefined)
    let exposed: Record<string, (...args: unknown[]) => Promise<unknown>> = {}
    const error = new Error('Broken validator')

    const RemoteInput = defineRemoteComponent('VInput', {
      methods: {
        focus: () => {
          throw error
        },
      },
    })

    const render = (RemoteInput as unknown as ComponentWithSetup).setup({}, {
      attrs: {},
      emit: vi.fn(),
      expose: methods => { exposed = methods as typeof exposed },
      slots: {},
    })

    const vnode = render()
    const assignRef = vnode.props?.ref as ((value: { invoke: typeof invoke } | null) => void) | undefined
    assignRef?.({ invoke })

    await expect(exposed.focus()).rejects.toBe(error)
    expect(invoke).not.toHaveBeenCalled()
  })

  test('treats malformed slots options as legacy emits at runtime', () => {
    const container = document.createElement('div')
    const onSlots = vi.fn()
    const RemoteDiv = defineRemoteComponent('div', {
      slots: 'header',
    } as never)
    const App = defineComponent({
      setup () {
        return () => h(RemoteDiv, {
          onSlots,
        })
      },
    })
    const app = createApp(App)

    app.mount(container)

    const div = container.querySelector('div')
    div?.dispatchEvent(new Event('slots'))

    expect(onSlots).toHaveBeenCalledTimes(1)

    app.unmount()
  })

  test('supports template refs without readonly warnings', async () => {
    const invoke = vi.fn().mockResolvedValue(true)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const container = document.createElement('div')
    let dialog: Readonly<ShallowRef<{ open: (id: string) => Promise<boolean> } | null>> | undefined

    const RemoteDialog = defineRemoteComponent('VDialog', {
      methods: {
        open: defineRemoteMethod<[id: string], boolean>(),
      },
    })
    const HostDialog = defineComponent({
      name: 'VDialog',
      setup (_, { expose }) {
        expose({ invoke })

        return () => null
      },
    })
    const Parent = defineComponent({
      components: { RemoteDialog },
      template: '<RemoteDialog ref="dialog" />',
      setup () {
        dialog = useTemplateRef<{ open: (id: string) => Promise<boolean> }>('dialog')

        return { dialog }
      },
    })

    const app = createApp(Parent)
    app.component('VDialog', HostDialog)
    app.mount(container)
    await nextTick()

    expect(typeof dialog?.value?.open).toBe('function')
    expect(warn).not.toHaveBeenCalled()

    app.unmount()
    warn.mockRestore()
  })

})
