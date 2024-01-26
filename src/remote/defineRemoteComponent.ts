import type { EmitsOptions } from 'vue'

import type {
    DefineComponent,
    RemoteComponentType,
} from '../../types/remote'

import type { None } from '../../types/scaffolding'

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
  Props = None,
  AllowedChildren extends RemoteComponentType | boolean = true,
  Emits extends EmitsOptions | undefined = undefined
> (
  type: Type | RemoteComponentType<Type, Props, AllowedChildren>,
  emits: Emits | undefined = undefined,
  slots: string[] = []
): DefineComponent<
  Type,
  Props,
  AllowedChildren,
  Emits
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
