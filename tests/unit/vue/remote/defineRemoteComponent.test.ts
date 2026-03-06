import {
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import {
  defineComponent,
  h,
} from 'vue'

import defineRemoteComponent from '@/vue/remote/defineRemoteComponent'
import defineRemoteMethod from '@/vue/remote/defineRemoteMethod'
import { toRemoteSlots } from '@/vue/remote/slots'

type RenderFn = () => ReturnType<typeof h>
type SetupContext = {
  attrs: Record<string, unknown>;
  emit: (event: string, ...args: unknown[]) => void;
  expose: (methods: Record<string, (...args: unknown[]) => unknown>) => void;
  slots: Record<string, unknown>;
}

type ComponentWithSetup = {
  setup: (props: unknown, context: SetupContext) => RenderFn;
}

describe('vue/remote/defineRemoteComponent', () => {
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

  test('creates fallthrough handlers for object-form emits', () => {
    const RemoteButton = defineRemoteComponent('button', {
      click: null,
      submit: null,
    })

    const emit = vi.fn()
    const render = (RemoteButton as unknown as ComponentWithSetup).setup({}, {
      attrs: {},
      emit,
      expose: () => undefined,
      slots: {},
    })

    const vnode = render()
    const onClick = vnode.props?.onClick as ((...args: unknown[]) => void) | undefined
    const onSubmit = vnode.props?.onSubmit as ((...args: unknown[]) => void) | undefined

    expect(typeof onClick).toBe('function')
    expect(typeof onSubmit).toBe('function')

    onClick?.(1, 2)
    onSubmit?.('payload')

    expect(emit).toHaveBeenCalledWith('click', 1, 2)
    expect(emit).toHaveBeenCalledWith('submit', 'payload')
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
})

describe('vue/remote/slots', () => {
  test('returns original slots when named slots are not provided', () => {
    const original = {
      default: () => [h(defineComponent({ render: () => h('span', 'default') }))],
    }

    expect(toRemoteSlots(['header'], {})).toEqual({})
    expect(toRemoteSlots([], original)).toBe(original)
  })

  test('creates remote slot wrappers with and without default slot', () => {
    const withDefault = toRemoteSlots(['header'], {
      default: () => [h('span', 'Default')],
      header: () => [h('span', 'Header')],
    })

    expect(withDefault.default?.()).toHaveLength(2)

    const withoutDefault = toRemoteSlots(['header'], {
      header: () => [h('span', 'Header')],
    })

    expect(withoutDefault.default?.()).toHaveLength(1)
  })
})
