import type { Slots } from 'vue'

import { h } from 'vue'

import { InternalNodeType } from '@/internals'

export const toRemoteSlots = (named: string[], slots: Slots) => {
  const actual = named.filter(slotName => slotName in slots)
  if (actual.length === 0) {
    return slots
  }

  return {
    default: () => [
      ...('default' in slots ? [slots.default?.()] : []),
      ...actual.map(slotName => h(InternalNodeType.RemoteSlot, { name: slotName }, {
        default: slots[slotName],
      })),
    ],
  }
}
