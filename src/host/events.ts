import type {
  SerializedEvent,
  SerializedEventType,
  SerializedInputEvent,
  SerializedKeyboardEvent,
  SerializedMouseEvent,
} from '~types/events'

export const serializeBaseEvent = (event: Event): SerializedEvent => {
  return {
    type: event.type,
    bubbles: event.bubbles,
  }
}

export const serializeInputEvent = (event: InputEvent): SerializedInputEvent => {
  return {
    ...serializeBaseEvent(event),
    isTrusted: event.isTrusted,
    data: event.data,
    target: {
      value: (event.target as HTMLInputElement | HTMLTextAreaElement).value,
    },
  }
}

export const serializeKeyboardEvent = (event: KeyboardEvent): SerializedKeyboardEvent => {
  return {
    ...serializeBaseEvent(event),
    key: event.key,
    code: event.code,
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    shiftKey: event.shiftKey,
    metaKey: event.metaKey,
  }
}

export const serializeMouseEvent = (event: MouseEvent): SerializedMouseEvent => {
  return {
    ...serializeBaseEvent(event),
    clientX: event.clientX,
    clientY: event.clientY,
    button: event.button,
  }
}

export const serializeEvent = <E extends Event>(event: E): SerializedEventType<E> => {
  if (event instanceof InputEvent) {
    return serializeInputEvent(event)
  }

  if (event instanceof KeyboardEvent) {
    return serializeKeyboardEvent(event)
  }

  if (event instanceof MouseEvent) {
    return serializeMouseEvent(event)
  }

  return serializeBaseEvent(event)
}
