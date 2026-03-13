import type { Id } from '@/dom/common'

import { isFunction } from '@/common/scaffolding'

export type InvokeHandler = (method: string, payload: unknown[]) => unknown

const normalizeReason = (reason?: unknown) => reason instanceof Error
  ? reason.message
  : reason

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> => {
  if (value == null || (typeof value !== 'object' && typeof value !== 'function')) {
    return false
  }

  return isFunction((value as { then?: unknown }).then)
}

export const createInvoker = () => {
  const handlers = new Map<Id, InvokeHandler>

  const invoke = (
    id: Id,
    method: string,
    payload: unknown[],
    resolve: (result: unknown) => void,
    reject: (reason?: unknown) => void
  ) => {
    const handler = handlers.get(id)
    if (handler) {
      try {
        const result = handler(method, payload)

        if (isPromiseLike(result)) {
          result.then(resolve, reason => reject(normalizeReason(reason)))
          return
        }

        resolve(result)
      } catch (e) {
        reject(normalizeReason(e))
      }
    } else {
      reject(`No handler for node [ID=${id}]`)
    }
  }

  const register = (id: Id, handler: InvokeHandler) => {
    handlers.set(id, handler)

    return () => {
      if (handlers.has(id)) {
        handlers.delete(id)
      }
    }
  }

  return { invoke, register }
}
