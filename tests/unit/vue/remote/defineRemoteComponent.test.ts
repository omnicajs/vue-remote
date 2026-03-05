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
import { toRemoteSlots } from '@/vue/remote/slots'

type RenderFn = () => ReturnType<typeof h>
type SetupContext = {
  attrs: Record<string, unknown>;
  emit: (event: string, ...args: unknown[]) => void;
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
      slots: {},
    })

    const vnode = render()

    expect(vnode.props).toEqual({ id: 'x' })
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
