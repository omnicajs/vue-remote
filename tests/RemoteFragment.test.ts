import type { UnknownComponent } from '@/dom/remote/tree'

import {
  describe,
  expect,
  test,
} from 'vitest'

import { createRemoteRoot } from '@/dom/remote'

import {
  KIND_COMPONENT,
  KIND_TEXT,
} from '@/dom/common/tree'
import { createNoopChannel } from './__fixtures__/channel'

describe('RemoteFragment', () => {
  test('appends children', () => {
    const root = createRemoteRoot(createNoopChannel())
    const fragment = root.createFragment()

    fragment.append(
      root.createComponent('VImage'),
      'Some text'
    )

    expect(fragment.children).toHaveLength(2)
    expect(fragment.children[0].kind).toEqual(KIND_COMPONENT)
    expect(fragment.children[1].kind).toEqual(KIND_TEXT)
  })

  test('inserts child before another one', () => {
    const root = createRemoteRoot(createNoopChannel())
    const fragment = root.createFragment()

    const image = root.createComponent('VImage')

    fragment.append(image)

    expect(fragment.children).toEqual([image])

    const card1 = root.createComponent('VCard')

    fragment.insertBefore(card1, image)

    expect(fragment.children).toEqual([card1, image])

    const card2 = root.createComponent('VCard')

    fragment.insertBefore(card2, image)

    expect(fragment.children).toEqual([card1, card2, image])
  })

  test('reorders children', () => {
    const root = createRemoteRoot(createNoopChannel())

    const fragment = root.createFragment()
    const card1 = root.createComponent('VCard')
    const card2 = root.createComponent('VCard')

    fragment.append(card1, card2)

    expect(fragment.children).toEqual([card1, card2])

    fragment.insertBefore(card2, card1)

    expect(fragment.children).toEqual([card2, card1])
  })

  test('replaces children', () => {
    const root = createRemoteRoot(createNoopChannel())
    const fragment = root.createFragment()

    fragment.append(root.createComponent('VImage'), 'Some text')

    expect(fragment.children).toHaveLength(2)

    fragment.replace(root.createComponent('VCard'))

    expect(fragment.children).toHaveLength(1)
    expect(fragment.children[0].kind).toEqual(KIND_COMPONENT)
    expect((fragment.children[0] as UnknownComponent).type).toEqual('VCard')
  })

  test('removes children', () => {
    const root = createRemoteRoot(createNoopChannel())

    const fragment = root.createFragment()
    const card1 = root.createComponent('VCard')
    const card2 = root.createComponent('VCard')

    fragment.append(card1, card2)

    expect(fragment.children).toEqual([card1, card2])

    fragment.removeChild(card1)

    expect(fragment.children).toEqual([card2])
  })
})
