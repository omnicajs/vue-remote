import type { UnknownFunction } from '~types/scaffolding'

export const REMOTE_EVENT_HANDLER_MARKER = '__omnicajs/vue-remote:event-handler__'

export type RemoteEventHandlerStepKind = 'keys' | 'modifiers'

export type RemoteEventHandlerStep = readonly [
  kind: RemoteEventHandlerStepKind,
  modifiers: readonly string[],
]

export type RemoteEventHandler<F extends UnknownFunction = UnknownFunction> = readonly [
  marker: typeof REMOTE_EVENT_HANDLER_MARKER,
  callback: F,
  steps: readonly RemoteEventHandlerStep[],
]

const eventHandlerCache = new WeakMap<object, Map<string, RemoteEventHandler>>()

const isObject = (value: unknown): value is object => {
  return (typeof value === 'object' && value != null) || typeof value === 'function'
}

export const isRemoteEventHandler = (value: unknown): value is RemoteEventHandler => {
  return Array.isArray(value)
    && value.length === 3
    && value[0] === REMOTE_EVENT_HANDLER_MARKER
    && typeof value[1] === 'function'
    && Array.isArray(value[2])
}

export const isEventHandler = (value: unknown): value is UnknownFunction | RemoteEventHandler => {
  return typeof value === 'function' || isRemoteEventHandler(value)
}

export const normalizeEventHandler = (value: unknown) => {
  if (typeof value === 'function') {
    return {
      callback: value,
      steps: [] as RemoteEventHandlerStep[],
    }
  }

  if (isRemoteEventHandler(value)) {
    return {
      callback: value[1],
      steps: value[2].map(([kind, modifiers]) => [kind, [...modifiers]] as RemoteEventHandlerStep),
    }
  }

  return undefined
}

export const wrapEventHandler = (
  value: unknown,
  kind: RemoteEventHandlerStepKind,
  modifiers: readonly string[]
) => {
  if (!isEventHandler(value) || modifiers.length === 0 || !isObject(value)) {
    return value
  }

  const cacheKey = `${kind}:${modifiers.join('.')}`
  const cached = eventHandlerCache.get(value)?.get(cacheKey)

  if (cached != null) {
    return cached
  }

  const wrapped: RemoteEventHandler = isRemoteEventHandler(value)
    ? [
      REMOTE_EVENT_HANDLER_MARKER,
      value[1],
      [[kind, [...modifiers]], ...value[2]],
    ]
    : [
      REMOTE_EVENT_HANDLER_MARKER,
      value,
      [[kind, [...modifiers]]],
    ]

  const cache = eventHandlerCache.get(value) ?? new Map<string, RemoteEventHandler>()
  cache.set(cacheKey, wrapped)
  eventHandlerCache.set(value, cache)

  return wrapped
}
