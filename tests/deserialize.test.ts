import type { ReceivedComponent } from '@/dom/host/tree'

import {
  describe,
  expect,
  test,
} from 'vitest'

import {
  isSerializedComment,
  isSerializedText,
} from '@/dom/common/tree'

import {
  addVersion,
  deserialize,
  isReceivedComment,
  isReceivedFragment,
  isReceivedText,
} from '@/dom/host/tree'

describe('deserialize', () => {
  test('matches serialized comment and text guards', () => {
    expect(isSerializedComment({ kind: 'comment' })).toBe(true)
    expect(isSerializedComment({ kind: 'text' })).toBe(false)
    expect(isSerializedComment(null)).toBe(false)

    expect(isSerializedText({ kind: 'text' })).toBe(true)
    expect(isSerializedText({ kind: 'comment' })).toBe(false)
    expect(isSerializedText(null)).toBe(false)
  })

  test('matches received node guards', () => {
    expect(isReceivedComment({ kind: 'comment', version: 0 })).toBe(true)
    expect(isReceivedComment({ kind: 'comment' })).toBe(false)
    expect(isReceivedComment({ kind: 'text', version: 0 })).toBe(false)

    expect(isReceivedText({ kind: 'text', version: 0 })).toBe(true)
    expect(isReceivedText({ kind: 'text' })).toBe(false)
    expect(isReceivedText({ kind: 'comment', version: 0 })).toBe(false)

    expect(isReceivedFragment({ kind: 'fragment', version: 0 })).toBe(true)
    expect(isReceivedFragment({ kind: 'fragment' })).toBe(false)
    expect(isReceivedFragment({ kind: 'comment', version: 0 })).toBe(false)
  })

  test('adds version to deserialized fragment properties', () => {
    const fragment = { id: 'fragment-1', kind: 'fragment', children: [] } as const

    const component = deserialize({
      id: 'component-1',
      kind: 'component',
      type: 'VCard',
      properties: {
        slot: fragment,
      },
      children: [],
    }, addVersion) as ReceivedComponent<{
      slot: typeof fragment & { version: number };
    }>

    expect(component.properties.slot.version).toBe(0)
  })
})
