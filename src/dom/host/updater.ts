import type {
  Received,
} from '@/dom/host/tree'

export type UpdateHandler<T extends Received = Received> = (value: T) => void

export const createUpdater = () => {
  const handlers = new Map<string, Set<UpdateHandler>>()
  const updates = new Set<Received>()

  let timeout: Promise<void> | null = null

  const flush = () => timeout ?? Promise.resolve()
  const enqueueUpdate = (received: Received) => {
    timeout = timeout ?? new Promise((resolve) => {
      setTimeout(() => {
        const awaiting = [...updates]

        timeout = null
        updates.clear()

        for (const received of awaiting) {
          call(handlers, received)
        }

        resolve()
      }, 0)
    })

    updates.add(received)

    return timeout
  }

  const register = <T extends Received>({ id }: Pick<T, 'id'>, handler: UpdateHandler<T>) => {
    add(handlers, id, handler as UpdateHandler)

    return () => remove(handlers, id, handler as UpdateHandler)
  }

  return {
    enqueueUpdate,
    register,
    flush,
  }
}

function add (all: Map<string, Set<UpdateHandler>>, id: Received['id'], handler: UpdateHandler) {
  let handlers = all.get(id)
  if (handlers == null) {
    handlers = new Set()
    all.set(id, handlers)
  }

  handlers.add(handler)
}

function call (all: Map<string, Set<UpdateHandler>>, received: Received) {
  const handlers = all.get(received.id)
  if (handlers) {
    for (const handler of handlers) {
      handler(received)
    }
  }
}

function remove (all: Map<string, Set<UpdateHandler>>, id: Received['id'], subscriber: UpdateHandler) {
  const handlers = all.get(id)
  if (handlers) {
    handlers.delete(subscriber as UpdateHandler)
    if (handlers.size === 0) {
      all.delete(id)
    }
  }
}
