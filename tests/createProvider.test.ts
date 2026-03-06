import {
  describe,
  expect,
  test,
} from 'vitest'

import createProvider from '@/vue/host/createProvider'

describe('createProvider', () => {
  test('throws for unknown components', () => {
    const provider = createProvider({
      VButton: { name: 'VButton' } as never,
    })

    expect(() => provider.get('VInput')).toThrow('Unknown component: VInput')
  })
})
