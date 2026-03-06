import type { HostedChild } from '@/vue/host/tree'

import {
  afterEach,
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
import createProvider from '@/vue/host/createProvider'
import render from '@/vue/host/render'

describe('render', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test('reports orphan slots and returns null for empty text nodes', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    const orphanSlot = {
      id: '1',
      kind: KIND_COMPONENT,
      type: REMOTE_SLOT,
      ref: ref(null),
      properties: ref({ name: 'header' }),
      children: shallowRef([]),
      update: vi.fn(),
      release: vi.fn(),
    } as unknown as HostedChild

    const emptyText = {
      id: '2',
      kind: KIND_TEXT,
      text: ref(''),
      update: vi.fn(),
      release: vi.fn(),
    } as unknown as HostedChild

    const provider = createProvider()

    expect(render(orphanSlot, provider)).toBeNull()
    expect(error).toHaveBeenCalledOnce()
    expect(render(emptyText, provider)).toBeNull()
  })
})
