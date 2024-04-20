import type { Id } from '@/dom/common'

export type InvokeHandler = (method: string, payload: unknown[]) => void

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
        resolve(handler(method, payload))
      } catch (e) {
        reject(e instanceof Error ? e.message : e)
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