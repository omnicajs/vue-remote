export interface SerializedEvent {
  type: Event['type'];
  bubbles: Event['bubbles'];
}

export interface SerializedInputEvent extends SerializedEvent {
  isTrusted: InputEvent['isTrusted'];
  data: InputEvent['data'];
  target: {
    value: HTMLInputElement['value'] | HTMLTextAreaElement['value'];
  };
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

interface EventMapDistinct {
  'input': [InputEvent, SerializedInputEvent];
  'keyboard': [KeyboardEvent, SerializedKeyboardEvent];
  'mouse': [MouseEvent, SerializedMouseEvent];
}

interface EvenMap extends EventMapDistinct {
  'basic': [Event, SerializedEvent];
}

type IsExactlyEvent<E> = E extends Event ? (Event extends E ? true : false) : false

type EventType<E extends Event> = {
  [K in keyof EventMapDistinct]: IsExactlyEvent<E> extends true ? 'basic' : (E extends EventMapDistinct[K][0] ? K : never);
}[keyof EventMapDistinct]

export type SerializedEventType<E extends Event> = EvenMap[EventType<E>][1]