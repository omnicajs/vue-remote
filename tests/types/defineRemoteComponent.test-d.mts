import {
  describe,
  expectTypeOf,
  test,
} from 'vitest'

import { ref } from 'vue'

import type { SchemaType } from '@/dom/remote'

import defineRemoteComponent from '@/vue/remote/defineRemoteComponent'
import defineRemoteMethod from '@/vue/remote/defineRemoteMethod'

describe('defineRemoteComponent type tests', () => {
  test('infers exposed methods from defineRemoteMethod carriers', () => {
    const VDialog = defineRemoteComponent('VDialog', {
      methods: {
        open: defineRemoteMethod<[id: string], boolean>(),
        close: defineRemoteMethod<[], void>(),
      },
    })
    void VDialog

    const dialog = ref<InstanceType<typeof VDialog> | null>(null)

    expectTypeOf(dialog.value?.open).toEqualTypeOf<((id: string) => Promise<boolean>) | undefined>()
    expectTypeOf(dialog.value?.close).toEqualTypeOf<(() => Promise<void>) | undefined>()

    dialog.value?.open('dialog-1')
    dialog.value?.close()
    // @ts-expect-error wrong argument type must be rejected
    dialog.value?.open(1)
  })

  test('enforces schema-aware method keys and signatures', () => {
    type VInputSchema = SchemaType<
      'VInput',
      { modelValue: string },
      {
        focus: () => Promise<void>;
        setSelectionRange: (start: number, end: number) => Promise<void>;
      }
    >

    const VInputType = 'VInput' as VInputSchema

    const VInput = defineRemoteComponent(VInputType, {
      methods: {
        focus: defineRemoteMethod<[], void>(),
        setSelectionRange: defineRemoteMethod<[number, number], void>(),
      },
    })
    void VInput

    const input = ref<InstanceType<typeof VInput> | null>(null)

    expectTypeOf(input.value?.focus).toEqualTypeOf<(() => Promise<void>) | undefined>()
    expectTypeOf(input.value?.setSelectionRange).toEqualTypeOf<((start: number, end: number) => Promise<void>) | undefined>()

    input.value?.setSelectionRange(0, 2)
    // @ts-expect-error schema-aware methods must keep argument tuples
    input.value?.setSelectionRange('0', 2)

    // @ts-expect-error schema-aware methods must reject unknown keys
    defineRemoteComponent(VInputType, {
      methods: {
        scrollToTop: defineRemoteMethod<[], void>(),
      },
    })

    // @ts-expect-error schema-aware methods must reject incompatible signatures
    defineRemoteComponent(VInputType, {
      methods: {
        setSelectionRange: defineRemoteMethod<[value: string], void>(),
      },
    })
  })

  test('supports validator objects and string-array methods', () => {
    const VList = defineRemoteComponent('VList', {
      methods: ['refresh', 'reset'] as const,
    })
    void VList
    const list = ref<InstanceType<typeof VList> | null>(null)

    expectTypeOf(list.value?.refresh).toEqualTypeOf<(() => Promise<void>) | undefined>()
    expectTypeOf(list.value?.reset).toEqualTypeOf<(() => Promise<void>) | undefined>()

    const VRange = defineRemoteComponent('VRange', {
      methods: {
        setRange: (start: number, end: number) => Number.isInteger(start) && Number.isInteger(end),
      },
    })
    void VRange
    const range = ref<InstanceType<typeof VRange> | null>(null)

    expectTypeOf(range.value?.setRange).toEqualTypeOf<((start: number, end: number) => Promise<void>) | undefined>()
    // @ts-expect-error validator tuple should be preserved
    range.value?.setRange('0', 2)
  })
})
