import {
  describe,
  expect,
  test,
} from 'vitest'

import { createRemoteRoot } from '@/dom/remote'
import {
  collectProxies,
  prepareProxies,
  prepareProxiesUnset,
  proxyFunctionsIn,
} from '@/dom/remote/proxy'

describe('proxyFunctionsIn', () => {
  test('supports fragments, cycles and pre-visited values', () => {
    const root = createRemoteRoot(() => {}, { strict: false })
    const fragment = root.createFragment()

    const source: {
      fn: () => string;
      fragment: typeof fragment;
      self?: unknown;
    } = {
      fn: () => 'ok',
      fragment,
    }
    source.self = source

    const proxied = proxyFunctionsIn(source)
    expect(proxied.fragment).toBe(fragment)
    expect((proxied.self as typeof proxied).self).toBe(proxied.self)

    expect(collectProxies(proxied, new Set([proxied]))).toBeUndefined()
    expect(prepareProxies(source, source, new Set([source]))).toEqual([source, [], true])
    expect(prepareProxiesUnset({ plain: 1 })).toEqual([])
    expect(collectProxies([{ plain: 1 }, { nested: { value: 2 } }])).toEqual([])

    const withProxy = proxyFunctionsIn({ onClick: () => true })
    expect(prepareProxiesUnset(withProxy)).toHaveLength(1)
    expect(prepareProxiesUnset(1)).toEqual([])
    expect(collectProxies([proxyFunctionsIn(() => true)])).toHaveLength(1)
    expect(collectProxies([1])).toEqual([])
  })
})
