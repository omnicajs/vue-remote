export type EventType = string
export type EventHandler = () => void

export const createEmitter = () => {
  const handlers = new Map<EventType, Set<EventHandler>>

  const emit = (event: EventType) => {
    const eventHandlers = handlers.get(event)
    if (eventHandlers) {
      for (const handle of eventHandlers) {
        handle()
      }
    }
  }

  const on = (event: EventType, handler: EventHandler) => {
    let eventHandlers = handlers.get(event)
    if (eventHandlers == null) {
      eventHandlers = new Set()
      handlers.set(event, eventHandlers)
    }

    eventHandlers.add(handler)

    return () => {
      const eventHandlers = handlers.get(event)
      if (eventHandlers) {
        eventHandlers.delete(handler)

        if (eventHandlers.size === 0) {
          handlers.delete(event)
        }
      }
    }
  }

  return { emit, on }
}