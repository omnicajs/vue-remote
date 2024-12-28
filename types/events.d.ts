export interface SerializedEvent {
  type: Event['type'];
  target: SerializedTarget | null;
  currentTarget: SerializedTarget | null;
  bubbles: Event['bubbles'];
  cancelable: Event['cancelable']; 
  composed: Event['composed'];  
  defaultPrevented: Event['defaultPrevented'];  
  eventPhase: Event['eventPhase'];  
  isTrusted: Event['isTrusted']; 
}

export interface SerializedFile {
  lastModified: File['lastModified'];
  name: File['webkitRelativePath'];   
  webkitRelativePath: File['webkitRelativePath'];
  size: Blob['size'];
  type: Blob['type'];
}

export interface SerializedDataTransfer {
  dropEffect: DataTransfer['dropEffect'];
  effectAllowed: DataTransfer['effectAllowed'];
  types: DataTransfer['types'];
  files: SerializedFile[];
}

export interface SerializedTarget {}

export interface SerializedInputEventTarget {
  value: string;
}

export interface SerializedInputEvent extends SerializedEvent {
  isTrusted: InputEvent['isTrusted'];
  data: InputEvent['data'];
  target: SerializedInputEventTarget;
}

export interface SerializedDragEvent extends SerializedMouseEvent {
  dataTransfer: SerializedDataTransfer | null
}

export interface SerializedFocusEvent extends SerializedEvent {
  relatedTarget: { tagName: HTMLElement['tagName'] } | null;
}

export interface SerializedKeyboardEvent extends SerializedEvent {
  key: KeyboardEvent['key'];
  code: KeyboardEvent['code'];
  altKey: KeyboardEvent['altKey'];
  ctrlKey: KeyboardEvent['ctrlKey'];
  shiftKey: KeyboardEvent['shiftKey'];
  metaKey: KeyboardEvent['metaKey'];
}

export interface SerializedMouseEvent extends SerializedEvent {
  type: MouseEvent['type'],
  clientX: MouseEvent['clientX'],
  clientY: MouseEvent['clientY'],
  button: MouseEvent['button'],
}

export interface SerializedPointerEvent extends SerializedMouseEvent {
  height: PointerEvent['height'];
  isPrimary: PointerEvent['isPrimary'];
  pointerId: PointerEvent['pointerId'];
  pointerType: PointerEvent['pointerType'];
  pressure: PointerEvent['pressure'];
  tangentialPressure: PointerEvent['tangentialPressure'];
  tiltX: PointerEvent['tiltX'];
  tiltY: PointerEvent['tiltY'];
  twist: PointerEvent['twist'];
  width: PointerEvent['width'];
}

export interface SerializedTouch {
  clientX: Touch['clientX'];
  clientY: Touch['clientY'];
  force: Touch['force'];
  identifier: Touch['identifier'];
  pageX: Touch['pageX'];
  pageY: Touch['pageY'];
  radiusX: Touch['radiusX'];
  radiusY: Touch['radiusY'];
  rotationAngle: Touch['rotationAngle'];
  screenX: Touch['screenX'];
  screenY: Touch['screenY'];
}

export interface SerializedTouchEvent extends SerializedEvent {
  altKey: TouchEvent['altKey'];
  changedTouches: SerializedTouch[];
  ctrlKey: TouchEvent['ctrlKey'];
  metaKey: TouchEvent['metaKey'];
  shiftKey: TouchEvent['shiftKey'];
  targetTouches: SerializedTouch[];
  touches: SerializedTouch[];
}

export interface SerializedWheelEvent extends SerializedMouseEvent {
  deltaMode: WheelEvent['deltaMode'];
  deltaX: WheelEvent['deltaX'];
  deltaY: WheelEvent['deltaY'];
  deltaZ: WheelEvent['deltaZ'];
  DOM_DELTA_PIXEL: WheelEvent['DOM_DELTA_PIXEL'];
  DOM_DELTA_LINE: WheelEvent['DOM_DELTA_LINE'];
  DOM_DELTA_PAGE: WheelEvent['DOM_DELTA_PAGE'];
}

interface EventMapDistinct {
  'input': [InputEvent, SerializedInputEvent];
  'drag': [DragEvent, SerializedDragEvent];
  'focus': [FocusEvent, SerializedFocusEvent];
  'keyboard': [KeyboardEvent, SerializedKeyboardEvent];
  'mouse': [MouseEvent, SerializedMouseEvent];
  'pointer': [PointerEvent, SerializedPointerEvent];
  'touch': [TouchEvent, SerializedTouchEvent];
  'wheel': [WheelEvent, SerializedWheelEvent];
}

interface EvenMap extends EventMapDistinct {
  'basic': [Event, SerializedEvent];
}

type IsExactlyEvent<E, T> = E extends T ? (T extends E ? true : false) : false

type EventType<E extends Event> = {
  [K in keyof EventMapDistinct]: IsExactlyEvent<E, Event> extends true 
      ? 'basic' : (IsExactlyEvent<E, EventMapDistinct[K][0]> extends true ? K : never);
}[keyof EventMapDistinct]

export type SerializedEventType<E extends Event> = EvenMap[EventType<E>][1]