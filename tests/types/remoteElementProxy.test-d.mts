import {
  describe,
  expectTypeOf,
  test,
} from 'vitest'

import type { ShallowRef } from 'vue'

import type {
  RemoteElementProxy,
  RemoteElementRef,
} from '@/vue/remote/types'
import type { RemoteIntrinsicElements } from '@/vue/tooling'

describe('RemoteElementProxy type tests', () => {
  test('models native refs as remote component proxies', () => {
    expectTypeOf<RemoteElementProxy<'div'>['type']>().toEqualTypeOf<'div'>()
    expectTypeOf<RemoteIntrinsicElements['input']>().toEqualTypeOf<RemoteElementProxy<'input'>>()
    expectTypeOf<RemoteElementProxy<'input'>['properties']>().toMatchTypeOf<{
      value?: unknown;
    }>()
    expectTypeOf<RemoteElementRef<'svg'>>().toEqualTypeOf<Readonly<ShallowRef<RemoteElementProxy<'svg'> | null>>>()

    const proxy = null as unknown as RemoteElementProxy<'div'>
    proxy.updateProperties({ id: 'panel' })

    // @ts-expect-error remote element proxies must not look like DOM elements
    proxy.focus()
  })
})
