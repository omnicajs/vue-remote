import {
  describe,
  expectTypeOf,
  test,
} from 'vitest'

import {
  createChannel,
  createRemoteRoot,
  defineRemoteComponent,
} from '@/dom/remote'

describe('dom remote invoke type tests', () => {
  test('preserves method tuples and return types', () => {
    type InvokeSchemaMethods = {
      focus: () => Promise<void>;
      setSelectionRange: (start: number, end: number) => Promise<void>;
      isFocused: () => Promise<boolean>;
    }

    const root = createRemoteRoot(createChannel({
      mount: () => {},
      insertChild: () => {},
      removeChild: () => {},
      updateProperties: () => {},
      updateText: () => {},
      invoke: (_id, _method, _payload, resolve) => resolve(undefined),
      systemCall: async () => undefined,
    }), { strict: false })
    const descriptor = defineRemoteComponent<'VInput', {}, InvokeSchemaMethods>(
      'VInput',
      [],
      ['focus', 'setSelectionRange', 'isFocused']
    )
    const input = root.createComponent(descriptor)

    expectTypeOf(input.invoke('focus')).toEqualTypeOf<Promise<void>>()
    expectTypeOf(input.invoke('isFocused')).toEqualTypeOf<Promise<boolean>>()

    input.invoke('focus')
    input.invoke('setSelectionRange', 0, 2)
    // @ts-expect-error invoke must respect method argument tuples
    input.invoke('setSelectionRange', '0', 2)
  })
})
