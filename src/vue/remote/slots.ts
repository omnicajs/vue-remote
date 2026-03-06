import type {
  Slot,
  Slots,
} from 'vue'

import { h } from 'vue'

import { REMOTE_SLOT } from '@/vue/internals'

export const toRemoteSlots = (named: string[], slots: Slots) => {
  const actual = named.filter(slotName => slotName in slots)
  if (actual.length === 0) {
    return slots
  }

  return {
    default: () => [
      ...('default' in slots ? [slots.default?.()] : []),
      ...actual.map(slotName => h(REMOTE_SLOT, { name: slotName }, {
        default: slots[slotName],
      })),
    ],
  }
}

export type NamedRemoteSlots<Names extends string> = Partial<Record<Names, Slot | undefined>>
