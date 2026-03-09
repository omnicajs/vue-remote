import type {
  RemoteComponent,
  RemoteRoot,
} from '@/dom/remote'

import type { Unknown } from '~types/scaffolding'

import {
  isRemoteComponent,
  isRemoteText,
} from '@/dom/remote'

const NATIVE_V_MODEL_TAGS = new Set([
  'input',
  'option',
  'select',
  'textarea',
])

const NATIVE_V_MODEL_ELEMENT = Symbol('native-v-model-element')
const ALLOWED_RUNTIME_EVENTS = new Set([
  'change',
  'compositionend',
  'compositionstart',
  'input',
])

export const INTERNAL_V_MODEL_EVENT_PREFIX = '__vModel:'

type EventListener = (event: NativeVModelEvent) => void

type NativeVModelEvent = Event & {
  readonly currentTarget: NativeVModelElement;
  readonly target: NativeVModelElement;
}

type SerializedEventTarget = {
  checked?: boolean;
  selectedIndex?: number;
  selectedOptions?: Array<{
    selected: boolean;
    text: string;
    value: unknown;
  }>;
  value?: unknown;
}

type SerializedEventLike = {
  currentTarget?: SerializedEventTarget | null;
  target?: SerializedEventTarget | null;
  type?: string;
}

type NativeVModelElement = RemoteComponent<string, RemoteRoot> & {
  _assigning?: boolean;
  _falseValue?: unknown;
  _modelValue?: unknown;
  _trueValue?: unknown;
  _value?: unknown;
  checked?: boolean;
  composing?: boolean;
  dispatchEvent: (event: Event) => boolean;
  multiple?: boolean;
  options?: NativeVModelElement[];
  removeEventListener: (name: string, listener: EventListener) => void;
  selected?: boolean;
  selectedIndex?: number;
  tagName: string;
  type?: string;
  value?: unknown;
  [NATIVE_V_MODEL_ELEMENT]: NativeVModelState;
}

interface NativeVModelState {
  local: Record<string, unknown>;
  runtimeEvents: Map<string, Set<EventListener>>;
  tag: string;
}

const toEventProperty = (name: string) => {
  return `on${name.charAt(0).toUpperCase()}${name.slice(1)}`
}

const toInternalEventProperty = (name: string) => {
  return `${INTERNAL_V_MODEL_EVENT_PREFIX}${toEventProperty(name)}`
}

const normalizeMultiple = (value: unknown) => {
  return value !== false && value != null
}

const normalizeBoolean = (value: unknown) => value === true

const getTag = (component: RemoteComponent<string, RemoteRoot>) => {
  return isNativeVModelElement(component)
    ? component[NATIVE_V_MODEL_ELEMENT].tag
    : component.type
}

const collectOptionText = (option: RemoteComponent<string, RemoteRoot>): string => {
  return option.children.reduce((text, child) => {
    if (isRemoteText(child)) {
      return text + child.text
    }

    if (isRemoteComponent(child)) {
      return text + collectOptionText(child as RemoteComponent<string, RemoteRoot>)
    }

    return text
  }, '')
}

const collectOptions = (component: RemoteComponent<string, RemoteRoot>): NativeVModelElement[] => {
  return component.children.reduce((options, child) => {
    if (!isRemoteComponent(child)) {
      return options
    }

    const node = child as RemoteComponent<string, RemoteRoot>

    if (getTag(node) === 'option') {
      options.push(augmentNativeVModelElement(node))
      return options
    }

    options.push(...collectOptions(node))
    return options
  }, [] as NativeVModelElement[])
}

const assertSupportedRuntimeEvent = (name: string) => {
  if (!ALLOWED_RUNTIME_EVENTS.has(name)) {
    throw new Error(`Native v-model runtime only supports ${[...ALLOWED_RUNTIME_EVENTS].join(', ')} events`)
  }
}

const toRuntimeListener = (listener: unknown): EventListener => {
  if (typeof listener !== 'function') {
    throw new TypeError('Native v-model runtime listener must be a function')
  }

  return listener as EventListener
}

const assertRuntimeEventOptions = (options: unknown) => {
  if (options != null) {
    throw new TypeError('Native v-model runtime does not support addEventListener options')
  }
}

const setLocal = (
  component: NativeVModelElement,
  key: string,
  value: unknown
) => {
  component[NATIVE_V_MODEL_ELEMENT].local[key] = value

  if (key === 'value') {
    component._value = value
  }

  if (key === 'true-value') {
    component._trueValue = value
  }

  if (key === 'false-value') {
    component._falseValue = value
  }
}

const syncFromHost = (
  component: NativeVModelElement,
  key: string,
  value: unknown
) => {
  setLocal(component, key, value)
  component.updateProperties({ [key]: value } as Unknown)
}

const syncOptionSelectionFromTarget = (
  component: NativeVModelElement,
  target: SerializedEventTarget
) => {
  if (component[NATIVE_V_MODEL_ELEMENT].tag !== 'select') {
    return
  }

  const selectedIndex = typeof target.selectedIndex === 'number'
    ? target.selectedIndex
    : -1
  const selectedOptions = target.selectedOptions ?? []
  const normalizedSelected = selectedOptions.map(option => ({
    text: option.text,
    value: String(option.value),
  }))

  collectOptions(component).forEach((option, index) => {
    const optionText = collectOptionText(option)
    const optionValue = String(option._value ?? option.value ?? '')
    const selected = component.multiple
      ? normalizedSelected.some(item => item.value === optionValue && item.text === optionText)
      : index === selectedIndex

    syncFromHost(option, 'selected', selected)
  })
}

const syncFromSerializedEvent = (
  component: NativeVModelElement,
  event: unknown
) => {
  if (event == null || typeof event !== 'object') {
    return
  }

  const serialized = event as SerializedEventLike
  const target = serialized.target ?? serialized.currentTarget

  if (target == null || typeof target !== 'object') {
    return
  }

  if ('value' in target && component[NATIVE_V_MODEL_ELEMENT].tag !== 'select') {
    syncFromHost(component, 'value', target.value)
  }

  if ('checked' in target) {
    syncFromHost(component, 'checked', target.checked === true)
  }

  if ('selectedIndex' in target && !component.multiple) {
    syncFromHost(component, 'selectedIndex', target.selectedIndex ?? -1)
  }

  syncOptionSelectionFromTarget(component, target)
}

const toNativeEvent = (
  component: NativeVModelElement,
  eventName: string,
  event: unknown
) => {
  assertSupportedRuntimeEvent(eventName)
  syncFromSerializedEvent(component, event)

  return {
    type: eventName,
    currentTarget: component,
    target: component,
    preventDefault () {},
    stopImmediatePropagation () {},
    stopPropagation () {},
  } as NativeVModelEvent
}

const updateEventProperty = (
  component: NativeVModelElement,
  eventName: string
) => {
  const state = component[NATIVE_V_MODEL_ELEMENT]
  const runtime = state.runtimeEvents.get(eventName)
  const listeners = runtime ? [...runtime] : []
  const property = toInternalEventProperty(eventName)

  if (listeners.length === 0) {
    component.updateProperties({ [property]: undefined } as Unknown)
    return
  }

  component.updateProperties({
    [property]: (...args: unknown[]) => {
      const nativeEvent = toNativeEvent(component, eventName, args[0])
      listeners.forEach(listener => listener(nativeEvent))
    },
  } as Unknown)
}

const defineStateProperty = (
  component: NativeVModelElement,
  key: string,
  normalize: (value: unknown) => unknown = value => value
) => {
  Object.defineProperty(component, key, {
    enumerable: false,
    configurable: true,
    get () {
      return component[NATIVE_V_MODEL_ELEMENT].local[key]
    },
    set (value) {
      const normalized = normalize(value)
      setLocal(component, key, normalized)
      component.updateProperties({ [key]: normalized } as Unknown)
    },
  })
}

const defineReadonlyProperty = (
  component: NativeVModelElement,
  key: string,
  get: () => unknown
) => {
  Object.defineProperty(component, key, {
    enumerable: false,
    configurable: true,
    get,
  })
}

export const isNativeVModelTag = (type: string) => {
  return NATIVE_V_MODEL_TAGS.has(type)
}

export const isNativeVModelElement = (value: unknown): value is NativeVModelElement => {
  return value != null && NATIVE_V_MODEL_ELEMENT in (value as object)
}

export const augmentNativeVModelElement = <Root extends RemoteRoot>(
  component: RemoteComponent<string, Root>
) => {
  if (isNativeVModelElement(component)) {
    return component as NativeVModelElement & RemoteComponent<string, Root>
  }

  const element = component as unknown as NativeVModelElement

  Object.defineProperty(element, NATIVE_V_MODEL_ELEMENT, {
    value: {
      local: {},
      runtimeEvents: new Map<string, Set<EventListener>>(),
      tag: component.type,
    } satisfies NativeVModelState,
    enumerable: false,
    configurable: false,
    writable: false,
  })

  defineReadonlyProperty(element, 'tagName', () => element[NATIVE_V_MODEL_ELEMENT].tag.toUpperCase())
  defineStateProperty(element, 'value')
  defineStateProperty(element, 'checked', normalizeBoolean)
  defineStateProperty(element, 'selected', normalizeBoolean)
  defineStateProperty(element, 'selectedIndex', value => typeof value === 'number' ? value : -1)
  defineStateProperty(element, 'multiple', normalizeMultiple)
  defineStateProperty(element, 'type')

  defineReadonlyProperty(element, 'options', () => collectOptions(element))

  Object.defineProperty(element, 'addEventListener', {
    value: (name: string, listener: unknown, options?: unknown) => {
      assertSupportedRuntimeEvent(name)
      assertRuntimeEventOptions(options)

      const runtimeListener = toRuntimeListener(listener)

      const state = element[NATIVE_V_MODEL_ELEMENT]
      const listeners = state.runtimeEvents.get(name) ?? new Set<EventListener>()

      listeners.add(runtimeListener)
      state.runtimeEvents.set(name, listeners)

      updateEventProperty(element, name)
    },
    enumerable: false,
    configurable: true,
    writable: true,
  })

  Object.defineProperty(element, 'removeEventListener', {
    value: (name: string, listener: unknown) => {
      assertSupportedRuntimeEvent(name)

      const runtimeListener = toRuntimeListener(listener)

      const state = element[NATIVE_V_MODEL_ELEMENT]
      const listeners = state.runtimeEvents.get(name)

      if (!listeners) {
        return
      }

      listeners.delete(runtimeListener)

      if (listeners.size === 0) {
        state.runtimeEvents.delete(name)
      }

      updateEventProperty(element, name)
    },
    enumerable: false,
    configurable: true,
    writable: true,
  })

  Object.defineProperty(element, 'dispatchEvent', {
    value: (event: Event) => {
      assertSupportedRuntimeEvent(event.type)

      const listeners = element[NATIVE_V_MODEL_ELEMENT].runtimeEvents.get(event.type)
      if (!listeners) {
        return true
      }

      const nativeEvent = toNativeEvent(element, event.type, event)
      listeners.forEach(listener => listener(nativeEvent))

      return true
    },
    enumerable: false,
    configurable: true,
    writable: true,
  })

  return element as NativeVModelElement & RemoteComponent<string, Root>
}

export const patchNativeVModelElementProperty = (
  component: NativeVModelElement,
  key: string,
  value: unknown
) => {
  const normalized = key === 'checked' || key === 'selected'
    ? normalizeBoolean(value)
    : key === 'multiple'
      ? normalizeMultiple(value)
      : key === 'selectedIndex'
        ? (typeof value === 'number' ? value : -1)
        : value

  setLocal(component, key, normalized)
  component.updateProperties({ [key]: value } as Unknown)
}
