import {
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import { createRemoteRoot } from '@/dom/remote'

import {
  ACTION_INSERT_CHILD,
  ACTION_MOUNT,
} from '@/dom/common/channel'

import { ROOT_ID } from '@/dom/common/tree'
import { createNoopChannel } from './__fixtures__/channel'

describe('createRemoteRoot', () => {
  describe('append', () => {
    test('does not call channel if not mounted yet', () => {
      const channel = vi.fn()

      const root = createRemoteRoot(channel)
      const card = root.createComponent('VCard')

      root.append(card)

      expect(root.children).toHaveLength(1)
      expect(card.progenitor).toEqual(root)
      expect(card.parent).toEqual(root)
      expect(channel).toHaveBeenCalledTimes(0)
    })

    test('calls channel if already mounted', () => {
      const channel = vi.fn()

      const root = createRemoteRoot(channel)
      const card = root.createComponent('VCard')

      root.mount()
      root.append(card)

      expect(root.children).toHaveLength(1)
      expect(card.progenitor).toEqual(root)
      expect(card.parent).toEqual(root)
      expect(channel).toHaveBeenCalledTimes(2)
      expect(channel).toHaveBeenCalledWith(
        ACTION_INSERT_CHILD,
        ROOT_ID,
        0,
        expect.objectContaining({
          id: '1',
          type: 'VCard',
          properties: {},
          children: [],
        }),
        false
      )
    })

    test('throws error when calling with invalid arguments', () => {
      const root = createRemoteRoot(createNoopChannel())

      expect(() => {
        // @ts-expect-error Testing unsupported argument
        root.append({})
      }).toThrow('Cannot append a node that was not created by this remote root')
    })

    test('throws error when calling with a component created by another root', () => {
      const root = createRemoteRoot(createNoopChannel())

      expect(() => {
        root.append(createRemoteRoot(createNoopChannel()).createComponent('VCard'))
      }).toThrow('Cannot append a node that was not created by this remote root')
    })
  })

  describe('insertBefore', () => {
    test('inserts child before specified one', () => {
      const root = createRemoteRoot(createNoopChannel())
      const card = root.createComponent('VCard')

      root.append(card)

      const image = root.createComponent('VImage')

      root.insertBefore(image, card)

      expect(root.children).toHaveLength(2)
      expect(root.children[0]).toEqual(image)
      expect(root.children[1]).toEqual(card)
    })

    test('changes order of components if called on already appended children', () => {
      const root = createRemoteRoot(createNoopChannel())
      const card = root.createComponent('VCard')

      root.append(card)

      const image = root.createComponent('VImage')

      root.append(image)

      expect(root.children).toHaveLength(2)
      expect(root.children[0]).toEqual(card)
      expect(root.children[1]).toEqual(image)

      root.insertBefore(image, card)

      expect(root.children).toHaveLength(2)
      expect(root.children[0]).toEqual(image)
      expect(root.children[1]).toEqual(card)
    })

    test('throws error when calling with invalid arguments', () => {
      const root = createRemoteRoot(createNoopChannel())
      const card = root.createComponent('Card')

      root.append(card)

      expect(() => {
        // @ts-expect-error Testing unsupported argument
        root.insertBefore({}, card)
      }).toThrow('Cannot insert a node that was not created by this remote root')
    })

    test('handles self-reference and non-child anchors', () => {
      const root = createRemoteRoot(createNoopChannel(), { strict: false })
      const first = root.createComponent('VFirst')
      const second = root.createComponent('VSecond')
      const foreign = root.createComponent('VForeign')
      const newcomer = root.createComponent('VNewcomer')

      root.append(first, second)
      root.insertBefore(first, first)
      expect(root.children).toEqual([first, second])

      root.insertBefore(first, second)
      expect(root.children).toEqual([first, second])

      root.insertBefore(second, first)
      expect(root.children).toEqual([second, first])

      root.insertBefore(newcomer, second)
      expect(root.children).toEqual([newcomer, second, first])

      expect(() => root.insertBefore(foreign, root.createComponent('VMissing'))).toThrow(
        'Cannot add a child before an element that is not a child of the target parent.'
      )
    })
  })

  describe('replace', () => {
    test('replaces child with another one', () => {
      const root = createRemoteRoot(createNoopChannel())
      const card = root.createComponent('VCard')

      root.append(card)

      expect(root.children).toHaveLength(1)
      expect(root.children[0]).toEqual(card)

      const image = root.createComponent('VImage')

      root.replace(image)

      expect(root.children).toHaveLength(1)
      expect(root.children[0]).toEqual(image)
    })

    test('throws error when calling with invalid arguments', () => {
      const root = createRemoteRoot(createNoopChannel())
      const card = root.createComponent('VCard')

      root.append(card)

      expect(() => {
        // @ts-expect-error Testing unsupported argument
        root.replace({})
      }).toThrow('Cannot append a node that was not created by this remote root')
    })

    test('throws error when calling with a component created by another root', () => {
      const root = createRemoteRoot(createNoopChannel())
      const card = root.createComponent('VCard')

      root.append(card)

      expect(() => {
        root.replace(createRemoteRoot(createNoopChannel()).createComponent('VImage'))
      }).toThrow('Cannot append a node that was not created by this remote root')
    })
  })

  describe('mount', () => {
    test('sends empty children list if no children appended before first call', () => {
      const channel = vi.fn()

      createRemoteRoot(channel).mount()

      expect(channel).toHaveBeenCalledWith(ACTION_MOUNT, [])
    })

    test('subsequent calls does not call channel again', async () => {
      const channel = vi.fn()

      const root = createRemoteRoot(channel)

      await root.mount()
      await root.mount()
      await root.mount()
      await root.mount()

      expect(channel).toHaveBeenCalledOnce()
    })

    test('send children list on first call', () => {
      const channel = vi.fn()

      const root = createRemoteRoot(channel)
      const card = root.createComponent('VCard')

      root.append(card)
      root.mount()

      expect(card.progenitor).toEqual(root)
      expect(card.parent).toEqual(root)
      expect(channel).toHaveBeenCalledOnce()
      expect(channel).toHaveBeenCalledWith(
        ACTION_MOUNT,
        [expect.objectContaining({
          id: '1',
          type: 'VCard',
          properties: {},
          children: [],
        })]
      )
    })
  })
})
