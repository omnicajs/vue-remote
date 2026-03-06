import {
  describe,
  expect,
  test,
} from 'vitest'

import {
  defineComponent,
  h,
} from 'vue'

import { toRemoteSlots } from '@/vue/remote/slots'

describe('toRemoteSlots', () => {
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
