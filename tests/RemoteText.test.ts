import type { RemoteText } from '@/dom/remote'

import {
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import { createRemoteRoot } from '@/dom/remote'
import { isRemoteText } from '@/dom/remote/tree'

import {
  ACTION_REMOVE_CHILD,
  ACTION_UPDATE_TEXT,
} from '@/dom/common/channel'
import { createNoopChannel } from './__fixtures__/channel'

describe('RemoteText', () => {
  test('matches remote text guard', () => {
    const root = createRemoteRoot(createNoopChannel(), { strict: false })
    const text = root.createText('value')

    expect(isRemoteText(text)).toBe(true)
  })

  test('calls channel to update text', () => {
    const channel = vi.fn()

    const root = createRemoteRoot(channel)
    const text = root.createText()

    root.mount()
    root.append(text)

    text.update('updated')

    expect(channel).toHaveBeenCalledWith(ACTION_UPDATE_TEXT, '1', 'updated')
  })

  test('removes itself from a parent', () => {
    const channel = vi.fn()

    let text: RemoteText

    const root = createRemoteRoot(channel)
    const card = root.createComponent('card', null, [
      text = root.createText('Some text'),
    ])

    root.mount()
    root.append(card)

    expect(card.children).toEqual([text])

    expect(text.progenitor).toEqual(root)
    expect(text.parent).toEqual(card)

    text.remove()

    expect(channel).toHaveBeenCalledWith(ACTION_REMOVE_CHILD, card.id, 0)

    expect(card.children).toEqual([])

    expect(text.progenitor).toBeNull()
    expect(text.parent).toBeNull()
  })
})
