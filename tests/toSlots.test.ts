import type { HostedChild } from '@/vue/host/tree'

import {
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import {
  shallowRef,
  ref,
} from 'vue'

import {
  KIND_COMPONENT,
  KIND_TEXT,
} from '@/dom/common/tree'

import { REMOTE_SLOT } from '@/vue/internals'
import { toSlots } from '@/vue/host/render'

describe('toSlots', () => {
  test('keeps default content and named slots', () => {
    const defaultText = {
      id: 'd',
      kind: KIND_TEXT,
      text: ref('default'),
      update: vi.fn(),
      release: vi.fn(),
    } as unknown as HostedChild

    const slotNode = {
      id: 's',
      kind: KIND_COMPONENT,
      type: REMOTE_SLOT,
      ref: ref(null),
      properties: ref({ name: 'header' }),
      children: shallowRef([defaultText]),
      update: vi.fn(),
      release: vi.fn(),
    } as unknown as HostedChild

    const slots = toSlots([slotNode, defaultText], node => {
      if ('text' in node) {
        return node.text.value
      }

      return null
    })

    expect(slots.default()).toEqual(['default'])
    expect(slots.header?.()).toEqual(['default'])
  })
})
