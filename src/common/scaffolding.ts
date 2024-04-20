import type {
  Unknown,
  UnknownFunction,
} from '~types/scaffolding'

export const addMethod = <F, T extends object = object>(o: T, name: string, fn: F) => {
  return Object.defineProperty(o, name, {
    value: fn,
    configurable: true,
    writable: false,
    enumerable: false,
  })
}

type A<T> = T extends unknown[] ? T : T[]

export const arraify = <T> (value: T): A<T> => Array.isArray(value)
  ? [...value] as A<T>
  : [value] as A<T>

export const capture = <T extends object>(o: T, freeze: boolean) => {
  return freeze ? Object.freeze(o) : o
}

export const isFunction = (value: unknown): value is UnknownFunction => {
  return typeof value === 'function'
}

export const isObject = (value: unknown): value is object => {
  if (value == null || typeof value !== 'object') {
    return false
  }

  const prototype = Object.getPrototypeOf(value)

  return prototype == null || prototype === Object.prototype
}

export const keysOf = <T extends object>(o: T) => Object.keys(o) as Array<keyof T>

export const visitArray = (
  value: unknown[],
  visited: Map<unknown, unknown>,
  visit: (value: unknown, visited: Map<unknown, unknown>) => unknown
) => {
  const result: unknown[] = []
  visited.set(value, result)

  for (const nested of value) {
    result.push(visit(nested, visited))
  }

  return result
}

export const visitObject = (
  value: object,
  visited: Map<unknown, unknown>,
  visit: (value: unknown, visited: Map<unknown, unknown>) => unknown
) => {
  const result: Unknown = {}
  visited.set(value, result)

  for (const key of keysOf(value)) {
    result[key] = visit(value[key], visited)
  }

  return result
}