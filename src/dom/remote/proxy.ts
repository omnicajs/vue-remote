import type {
  Unknown,
  UnknownFunction,
} from '~types/scaffolding'

import {
  isFunction,
  isObject,
  keysOf,
  visitArray,
  visitObject,
} from '@/common/scaffolding'

import { isRemoteFragment } from '@/dom/remote/tree'

/**
 * Проксирование функций, передаваемых в свойства компонента. Необходимая мера для того, чтобы избегать вызова
 * старых имплементаций, если функция была заменена непосредственно перед вызовом и контекст хоста не успел обновиться.
 * Методы и другие сложные объекты не передаются непосредственно. Подобное проксирование позволяет перенаправлять старые
 * ссылки на новые объекты.
 */
export type FunctionProxy<F extends UnknownFunction = UnknownFunction> = F & {
  __current: UnknownFunction | undefined;
}

export type FunctionProxyUpdate = [FunctionProxy, UnknownFunction?]

export const isProxy = <F extends UnknownFunction>(value: unknown): value is FunctionProxy<F> => {
  return value instanceof Function && '__current' in value
}

export const toProxy = (value: UnknownFunction) => {
  const _proxy = ((...args: unknown[]) => {
    return _proxy.__current ? _proxy.__current(...args) : undefined
  }) as FunctionProxy

  Object.defineProperty(_proxy, '__current', {
    value,
    configurable: false,
    enumerable: false,
    writable: true,
  })

  return _proxy
}

export function proxyFunctionsIn<T>(
  value: T,
  visited = new Map<unknown, unknown>()
): T {
  if (visited.has(value)) {
    return visited.get(value) as T
  }

  if (isRemoteFragment(value)) {
    visited.set(value, value)
    return value
  }

  if (Array.isArray(value)) {
    return visitArray(value, visited, proxyFunctionsIn) as T
  }

  if (isObject(value)) {
    return visitObject(value, visited, proxyFunctionsIn) as T
  }

  if (isFunction(value)) {
    const proxy = toProxy(value)

    visited.set(value, proxy)

    return proxy as T
  }

  visited.set(value, value)

  return value
}

export const collectProxies = (
  value: unknown,
  visited: Set<unknown> = new Set()
): FunctionProxy[] | undefined => {
  if (visited.has(value)) {
    return undefined
  }

  visited.add(value)

  if (Array.isArray(value)) {
    return value.reduce((all, element) => {
      const nested = collectProxies(element, visited)
      return nested ? [...all, ...nested] : all
    }, [] as FunctionProxy[])
  }

  if (isObject(value)) {
    return keysOf(value).reduce((all, key) => {
      const nested = collectProxies(value[key], visited)
      return nested ? [...all, ...nested] : all
    }, [] as FunctionProxy[])
  }

  return isProxy(value) ? [value] : undefined
}

export const prepareProxiesUnset = (value: unknown): FunctionProxyUpdate[] => {
  return collectProxies(value)?.map(p => [p, undefined]) ?? []
}

export function prepareProxies (
  oldValue: unknown,
  newValue: unknown,
  visited = new Set<unknown>()
): [unknown, FunctionProxyUpdate[], boolean] {
  if (visited.has(oldValue)) {
    return [oldValue, [], true]
  }

  visited.add(oldValue)

  if (isProxy(oldValue)) {
    return isFunction(newValue)
      ? [oldValue, [[oldValue, newValue]], true]
      : [proxyFunctionsIn(newValue), [], false]
  }

  if (Array.isArray(oldValue)) {
    return !Array.isArray(newValue)
      ? [proxyFunctionsIn(newValue), prepareProxiesUnset(oldValue), false]
      : prepareProxiesInArray(oldValue, newValue, visited)
  }

  if (isObject(oldValue) && !isRemoteFragment(oldValue)) {
    return !isObject(newValue)
      ? [proxyFunctionsIn(newValue), prepareProxiesUnset(oldValue), false]
      : prepareProxiesInObject(oldValue, newValue, visited)
  }

  return [newValue, [], oldValue === newValue]
}

function prepareProxiesInObject (
  oldValue: object,
  newValue: object,
  visited: Set<unknown>
): [unknown, FunctionProxyUpdate[], boolean] {
  const normalized: Unknown = {}
  const records: FunctionProxyUpdate[] = []

  let changed = false

  for (const key of keysOf(oldValue)) {
    const oldEl = oldValue[key]

    if (!(key in newValue)) {
      records.push(...prepareProxiesUnset(oldEl))
      changed = true
    }

    const newEl = newValue[key]

    const [updated, record, skip] = prepareProxies(oldEl, newEl, visited)

    records.push(...record)

    if (!skip) {
      normalized[key] = updated
      changed = true
    }
  }

  for (const key of keysOf(newValue)) {
    if (!(key in normalized)) {
      normalized[key] = proxyFunctionsIn(newValue[key])
      changed = true
    }
  }

  return [normalized, records, !changed]
}

function prepareProxiesInArray(
  oldValue: unknown[],
  newValue: unknown[],
  visited: Set<unknown>
): [unknown, FunctionProxyUpdate[], boolean] {
  const normalized: unknown[] = []
  const records: FunctionProxyUpdate[] = []

  let changed = false

  for (let i = 0; i < Math.max(oldValue.length, newValue.length); i++) {
    const oldEl = oldValue[i]
    const newEl = newValue[i]

    if (i >= newValue.length) {
      records.push(...prepareProxiesUnset(oldEl))
      changed = true
      continue
    }

    if (i >= oldValue.length) {
      normalized[i] = proxyFunctionsIn(newEl)
      changed = true
      continue
    }

    const [updated, record, skip] = prepareProxies(oldEl, newEl, visited)

    records.push(...record)

    normalized[i] = skip ? oldEl : updated
    changed = !skip || changed
  }

  return [normalized, records, !changed]
}

export const updateProxies = (records: FunctionProxyUpdate[]) => {
  for (const [fn, current] of records) {
    if (fn.__current !== current) {
      fn.__current = current
    }
  }
}
