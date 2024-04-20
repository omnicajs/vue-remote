import type {
  Component,
  EmitsOptions,
  MethodOptions,
} from 'vue'

import type { SchemaType } from '@/dom/remote'

import type {
  None,
  Unknown,
  UnknownMethods,
} from '~types/scaffolding'

import { defineComponent, h } from 'vue'
import { toRemoteSlots } from './slots'

type EventEmit = (event: string, ...args: unknown[]) => void
type EventHandler = (...args: unknown[]) => void

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

const fallthroughEvents = <Emits extends EmitsOptions | undefined = undefined>(
  emits: Emits,
  emit: EventEmit
): Record<string, EventHandler> => {
  if (emits === undefined) {
    return {}
  }

  const events: string[] = Array.isArray(emits) ? emits : Object.keys(emits)

  return events.reduce((processed, event) => {
    processed['on' + capitalize(event)] = (...args: unknown[]) => emit(event, ...args)

    return processed
  }, {} as Record<string, EventHandler>)
}

export default <
  Type extends string,
  Props extends Unknown = None,
  Methods extends UnknownMethods = None,
  Children extends SchemaType<string> | boolean = true,
  Emits extends EmitsOptions | undefined = undefined
> (
  type: Type | SchemaType<Type, Props, Methods, Children>,
  emits: Emits | undefined = undefined,
  slots: string[] = []
): Component<
  Unknown,
  Props,
  None,
  None,
  MethodOptions,
  Emits extends undefined ? None : Emits
> => defineComponent({
  name: type,
  inheritAttrs: false,
  ...(emits ? { emits } : {}),
  setup (_, { attrs, emit, slots: internalSlots }) {
    return () => h(type, {
      ...attrs,
      ...fallthroughEvents(emits, emit),
    }, toRemoteSlots(slots, internalSlots))
  },
})
