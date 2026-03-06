import {
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import { createRemoteRoot } from '@/dom/remote'
import { isRemoteComponent } from '@/dom/remote/tree'

import { ACTION_INVOKE } from '@/dom/common/channel'

describe('RemoteComponent', () => {
  test('matches remote component guard and prints raw text children', () => {
    const root = createRemoteRoot(() => {}, { strict: false })
    const component = root.createComponent('VPrintable', null, 'raw')

    expect(isRemoteComponent(component)).toBe(true)
    expect(isRemoteComponent(root.createComment('note'))).toBe(false)
    expect(component.print()).toContain('raw')
  })

  test('appends children', () => {
    const root = createRemoteRoot(() => {})
    const card = root.createComponent('VCard')
    const image = root.createComponent('VImage')
    const button = root.createComponent('VButton')

    card.append(image, button)

    expect(image.parent).toEqual(card)
    expect(image.progenitor).toBeNull()

    expect(button.parent).toEqual(card)
    expect(button.progenitor).toBeNull()

    root.append(card)

    expect(image.progenitor).toEqual(root)
    expect(button.progenitor).toEqual(root)
  })

  test('takes children from another parent', () => {
    const root = createRemoteRoot(() => {})
    const owner = root.createComponent('VList')
    const hijacker = root.createComponent('VList')
    const card = root.createComponent('VCard')
    const image = root.createComponent('VImage')
    const button = root.createComponent('VButton')

    root.append(owner, hijacker)

    card.append(image, button)

    expect(card.progenitor).toBeNull()
    expect(card.parent).toBeNull()
    expect(image.progenitor).toBeNull()
    expect(button.progenitor).toBeNull()

    owner.append(card)

    expect(owner.children).toEqual([card])
    expect(hijacker.children).toEqual([])
    expect(card.progenitor).toEqual(root)
    expect(card.parent).toEqual(owner)
    expect(image.progenitor).toEqual(root)
    expect(button.progenitor).toEqual(root)

    hijacker.append(card)

    expect(owner.children).toEqual([])
    expect(hijacker.children).toEqual([card])
    expect(card.progenitor).toEqual(root)
    expect(card.parent).toEqual(hijacker)
    expect(image.progenitor).toEqual(root)
    expect(button.progenitor).toEqual(root)
  })

  test('inserts child before another one', () => {
    const root = createRemoteRoot(() => {})
    const card = root.createComponent('VCard')
    const image = root.createComponent('VImage')
    const button = root.createComponent('VButton')

    card.append(button)

    expect(card.children).toEqual([button])

    card.insertBefore(image, button)

    expect(card.children).toEqual([image, button])
  })

  test('replaces children', () => {
    const root = createRemoteRoot(() => {})
    const card = root.createComponent('VCard')
    const image1 = root.createComponent('VImage')
    const image2 = root.createComponent('VImage')
    const button = root.createComponent('VButton')

    card.append(image1, button)
    root.append(card)

    expect(card.children).toEqual([image1, button])
    expect(image1.progenitor).toEqual(root)
    expect(image2.progenitor).toBeNull()
    expect(button.progenitor).toEqual(root)

    card.replace(button, image2)

    expect(card.children).toEqual([button, image2])
    expect(image1.progenitor).toBeNull()
    expect(image2.progenitor).toEqual(root)
    expect(button.progenitor).toEqual(root)
  })

  test('removes child', () => {
    const root = createRemoteRoot(() => {})
    const card = root.createComponent('VCard')
    const image = root.createComponent('VImage')
    const button = root.createComponent('VButton')

    card.append(image, button)
    root.append(card)

    expect(card.children).toEqual([image, button])
    expect(image.progenitor).toEqual(root)
    expect(button.progenitor).toEqual(root)

    card.removeChild(button)

    expect(card.children).toEqual([image])
    expect(image.progenitor).toEqual(root)
    expect(button.progenitor).toBeNull()
  })

  test('removes itself from a root', () => {
    const root = createRemoteRoot(() => {})
    const card = root.createComponent('VCard')
    const image = root.createComponent('VImage')
    const button = root.createComponent('VButton')

    card.append(image, button)
    root.append(card)

    expect(card.progenitor).toEqual(root)
    expect(image.progenitor).toEqual(root)
    expect(button.progenitor).toEqual(root)

    card.remove()

    expect(card.progenitor).toBeNull()
    expect(image.progenitor).toBeNull()
    expect(button.progenitor).toBeNull()
  })

  test('removes itself from a parent', () => {
    const root = createRemoteRoot(() => {})
    const list = root.createComponent('VList')
    const card = root.createComponent('VCard')
    const image = root.createComponent('VImage')
    const button = root.createComponent('VButton')

    card.append(image, button)
    list.append(card)
    root.append(list)

    expect(list.progenitor).toEqual(root)
    expect(card.progenitor).toEqual(root)
    expect(image.progenitor).toEqual(root)
    expect(button.progenitor).toEqual(root)

    card.remove()

    expect(list.progenitor).toEqual(root)
    expect(card.progenitor).toBeNull()
    expect(image.progenitor).toBeNull()
    expect(button.progenitor).toBeNull()
  })

  test('calls method', () => {
    const channel = vi.fn()
    const root = createRemoteRoot(channel)

    const list = root.createComponent('VList')

    root.append(list)

    list.invoke('fn1', 1, 2, 3)
    list.invoke('fn2', [1, 2, 3])

    expect(channel).toHaveBeenCalledWith(
      ACTION_INVOKE,
      list.id,
      'fn1',
      [1, 2, 3],
      expect.any(Function),
      expect.any(Function)
    )

    expect(channel).toHaveBeenCalledWith(
      ACTION_INVOKE,
      list.id,
      'fn2',
      [[1, 2, 3]],
      expect.any(Function),
      expect.any(Function)
    )
  })

})
