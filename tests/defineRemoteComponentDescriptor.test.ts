import {
  describe,
  expect,
  test,
} from 'vitest'

import { defineRemoteComponent } from '@/dom/remote'

describe('defineRemoteComponentDescriptor', () => {
  test('checks properties, methods and supported children', () => {
    type FocusMethods = { focus: (...payload: unknown[]) => Promise<unknown> }
    const descriptor = defineRemoteComponent<'VCard', { title: string }, FocusMethods, 'VButton'>(
      'VCard',
      ['title'],
      ['focus'],
      ['VButton']
    )

    expect(descriptor.hasProperty('title')).toBe(true)
    expect(descriptor.hasProperty('subtitle')).toBe(false)
    expect(descriptor.hasMethod('focus')).toBe(true)
    expect(descriptor.hasMethod('blur')).toBe(false)
    expect(descriptor.supports('VButton')).toBe(true)
    expect(descriptor.supports('VInput')).toBe(false)

    const allowAll = defineRemoteComponent('VAny', [], [], true)
    const allowNone = defineRemoteComponent('VAny', [], [], false)
    const allowByEmptyList = defineRemoteComponent<'VAny', {}, {}, 'VAnyChild'>('VAny', [], [], [] as Array<'VAnyChild'>)

    expect(allowAll.supports('Whatever')).toBe(true)
    expect(allowNone.supports('Whatever')).toBe(false)
    expect(allowByEmptyList.supports('Whatever')).toBe(true)
  })
})
