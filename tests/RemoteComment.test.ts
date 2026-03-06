import type { RemoteComment } from '@/dom/remote'

import {
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import { createRemoteRoot } from '@/dom/remote'

import {
  ACTION_REMOVE_CHILD,
  ACTION_UPDATE_TEXT,
} from '@/dom/common/channel'

describe('RemoteComment', () => {
  test('calls channel to update comment', () => {
    const channel = vi.fn()

    const root = createRemoteRoot(channel)
    const comment = root.createComment()

    expect(comment.root).toBe(root)

    root.mount()
    root.append(comment)

    comment.update('updated')

    expect(channel).toHaveBeenCalledWith(ACTION_UPDATE_TEXT, '1', 'updated')
  })

  test('removes itself from a parent', () => {
    const channel = vi.fn()

    let comment: RemoteComment

    const root = createRemoteRoot(channel)
    const card = root.createComponent('card', null, [
      comment = root.createComment('Some comment'),
    ])

    root.mount()
    root.append(card)

    expect(card.children).toEqual([comment])

    expect(comment.progenitor).toEqual(root)
    expect(comment.parent).toEqual(card)

    comment.remove()

    expect(channel).toHaveBeenCalledWith(ACTION_REMOVE_CHILD, card.id, 0)

    expect(card.children).toEqual([])

    expect(comment.progenitor).toBeNull()
    expect(comment.parent).toBeNull()
  })
})
