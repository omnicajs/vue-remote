import type {
  ReceivedComponent,
  ReceivedFragment,
  ReceivedText,
} from '@/dom/host/tree'

import {
  describe,
  expect,
  test,
} from 'vitest'

import {
  KIND_COMPONENT,
  KIND_FRAGMENT,
  KIND_TEXT,
  ROOT_ID,
} from '@/dom/common/tree'

import { createContext } from '@/dom/host/context'

describe('createContext', () => {
  test('attaches and detaches fragments nested in component props', () => {
    const context = createContext()

    const fragment = {
      id: 'f1',
      kind: KIND_FRAGMENT,
      children: [{
        id: 't1',
        kind: KIND_TEXT,
        text: 'nested',
        version: 0,
      }],
      version: 0,
    } as unknown as ReceivedFragment

    const component = {
      id: 'c1',
      kind: KIND_COMPONENT,
      type: 'VCard',
      properties: {
        slot: fragment,
        title: 'Card',
      },
      children: [],
      version: 0,
    } as unknown as ReceivedComponent

    context.attach(component)
    expect(context.get(ROOT_ID)).toBe(context.root)
    expect(context.get(component.id)).toBe(component)
    expect(context.get(fragment.id)).toBe(fragment)
    expect(context.get('t1')).toEqual(expect.objectContaining({ kind: KIND_TEXT }))

    const text = { id: 'loose', kind: KIND_TEXT, text: 'value', version: 0 } as ReceivedText
    context.attach(text)
    expect(context.get('loose')).toBe(text)

    context.detach(component)
    context.detach(text)

    expect(context.get(component.id)).toBeNull()
    expect(context.get(fragment.id)).toBeNull()
    expect(context.get('t1')).toBeNull()
    expect(context.get('loose')).toBeNull()
  })
})
