import type {
  SerializedEvent,
  SerializedFile,
  SerializedDataTransfer,
  SerializedEventType,
  SerializedInputEvent,
  SerializedDragEvent,
  SerializedFocusEvent,
  SerializedKeyboardEvent,
  SerializedMouseEvent,
  SerializedPointerEvent,
  SerializedTouch,
  SerializedTouchEvent,
  SerializedWheelEvent,
} from '~types/events'

export const serializeBaseEvent = (event: Event): SerializedEvent => {
  return {
    type: event.type,
    bubbles: event.bubbles,
    cancelable: event.cancelable,
    composed: event.composed,
    defaultPrevented: event.defaultPrevented,
    eventPhase: event.eventPhase,
    isTrusted: event.isTrusted,
  }
}

const serializeFiles = (files: FileList): SerializedFile[] => {
  return [...files].map(file => ({
    lastModified: file.lastModified,
    name: file.name,
    webkitRelativePath: file.webkitRelativePath,
    size: file.size,
    type: file.type,
  }))
}

const serializeDataTransfer = (dataTransfer: DataTransfer): SerializedDataTransfer => {
  return {
    dropEffect: dataTransfer.dropEffect,
    effectAllowed: dataTransfer.effectAllowed,
    types: dataTransfer.types,
    files: serializeFiles(dataTransfer.files),
  }
}

export const serializeDragEvent = (event: DragEvent): SerializedDragEvent => {
  return {
    ...serializeMouseEvent(event),
    dataTransfer: event.dataTransfer ? serializeDataTransfer(event.dataTransfer) : null,
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

export const serializeFocusEvent = (event: FocusEvent): SerializedFocusEvent => {
  return {
    ...serializeBaseEvent(event),
    relatedTarget: event.relatedTarget ? { tagName: (event.relatedTarget as HTMLElement).tagName } : null,
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

export const serializePointerEvent = (event: PointerEvent): SerializedPointerEvent => {
  return {
    ...serializeMouseEvent(event),
    height: event.height,
    isPrimary: event.isPrimary,
    pointerId: event.pointerId,
    pointerType: event.pointerType,
    pressure: event.pressure,
    tangentialPressure: event.tangentialPressure,
    tiltX: event.tiltX,
    tiltY: event.tiltY,
    twist: event.twist,
    width: event.width,
  }
}

export const serializeTouchList = (touchList: TouchList): SerializedTouch[] => {
  return [...touchList].map(touch => ({
    clientX: touch.clientX,   
    clientY: touch.clientY,
    force: touch.force,    
    identifier: touch.identifier,
    pageX: touch.pageX,
    pageY: touch.pageY,
    radiusX: touch.radiusX,
    radiusY: touch.radiusY,
    rotationAngle: touch.rotationAngle,
    screenX: touch.screenX, 
    screenY: touch.screenY,
  }))
}

export const serializeTouchEvent = (event: TouchEvent): SerializedTouchEvent => {
  return {
    ...serializeBaseEvent(event),
    altKey: event.altKey,
    changedTouches: serializeTouchList(event.changedTouches),
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    shiftKey: event.shiftKey,
    targetTouches: serializeTouchList(event.targetTouches),
    touches: serializeTouchList(event.touches),
  }
}

export const serializeWheelEvent = (event: WheelEvent): SerializedWheelEvent => {
  return {
    ...serializeMouseEvent(event),
    deltaMode: event.deltaMode,
    deltaX: event.deltaX,
    deltaY: event.deltaY,
    deltaZ: event.deltaZ,
    DOM_DELTA_PIXEL: event.DOM_DELTA_PIXEL,
    DOM_DELTA_LINE: event.DOM_DELTA_LINE,
    DOM_DELTA_PAGE: event.DOM_DELTA_PAGE,
  }
}

export const serializeEvent = <E extends Event>(event: E): SerializedEventType<E> => {
  if (event instanceof InputEvent) {
    return serializeInputEvent(event)
  }

  if (event instanceof DragEvent) {
    return serializeDragEvent(event)
  }

  if (event instanceof FocusEvent) {
    return serializeFocusEvent(event)
  }

  if (event instanceof KeyboardEvent) {
    return serializeKeyboardEvent(event)
  }

  if (event instanceof PointerEvent) {
    return serializePointerEvent(event)
  }

  if (event instanceof WheelEvent) {
    return serializeWheelEvent(event)
  }

  if (event instanceof MouseEvent) {
    return serializeMouseEvent(event)
  }

  if (event instanceof TouchEvent) {
    return serializeTouchEvent(event)
  }

  return serializeBaseEvent(event)
}
