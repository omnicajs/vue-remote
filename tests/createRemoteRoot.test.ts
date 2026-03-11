import type { UnknownComponent } from '@/dom/remote/tree'

import {
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import {
  createRemoteRoot,
  defineRemoteComponent,
} from '@/dom/remote'
import {
  isRemoteComment,
  isRemoteText,
} from '@/dom/remote/tree'
import { createNoopChannel } from './__fixtures__/channel'

describe('createRemoteRoot', () => {
  describe('createComment', () => {
    test('creates comment', () => {
      const root = createRemoteRoot(createNoopChannel())
      const comment = root.createComment('v-if')

      expect(comment.id).toEqual('1')
      expect(comment.text).toEqual('v-if')
      expect(comment.print()).toEqual('Comment(v-if)')
    })

    test('matches remote comment guard', () => {
      const root = createRemoteRoot(createNoopChannel(), { strict: false })
      const comment = root.createComment('note')
      const text = root.createText('value')

      expect(isRemoteComment(comment)).toBe(true)
      expect(isRemoteComment(text)).toBe(false)
    })
  })

  describe('createComponent', () => {
    test('creates component', () => {
      const VCard = defineRemoteComponent<'VCard', {
        orientation: 'horizontal' | 'vertical',
      }>('VCard', [
        'orientation',
      ])

      const root = createRemoteRoot(createNoopChannel())
      const card = root.createComponent(VCard, {
        orientation: 'horizontal',
      })

      expect(card.id).toEqual('1')
      expect(card.type).toEqual('VCard')
      expect(card.properties).toEqual({ orientation: 'horizontal' })
      expect(card.root).toEqual(root)
      expect(card.progenitor).toBeNull()
      expect(card.parent).toBeNull()
      expect(card.children).toEqual([])
      expect(card.print()).toEqual('VCard:1[]')
    })

    test('creates component with children', () => {
      const root = createRemoteRoot(createNoopChannel(), {
        strict: false,
      })

      const card = root.createComponent('VCard', null, [
        root.createComponent('VImage'),
        root.createComponent('VButton'),
      ])

      expect(card.children).toHaveLength(2)
      expect((card.children[0] as UnknownComponent).type).toEqual('VImage')
      expect((card.children[1] as UnknownComponent).type).toEqual('VButton')
      expect(card.print()).toEqual('VCard:3[\n  VImage:1[],\n  VButton:2[]\n]')
    })

    test('creates component with single child', () => {
      const root = createRemoteRoot(createNoopChannel(), {
        strict: false,
      })

      const card = root.createComponent('VCard', null, root.createComponent('VImage'))

      expect(card.children).toHaveLength(1)
      expect((card.children[0] as UnknownComponent).type).toEqual('VImage')
    })

    test('does not throw error for allowed components', () => {
      const components = [defineRemoteComponent('VCard')]
      const root = createRemoteRoot(createNoopChannel(), { components })

      expect(() => {
        root.createComponent('VCard')
      }).not.toThrow()
    })

    test('throws error for not allowed components', () => {
      const components = [
        defineRemoteComponent('VCard'),
        defineRemoteComponent('VList'),
      ]
      const root = createRemoteRoot(createNoopChannel(), { components })

      expect(() => {
        root.createComponent('VCard')
        root.createComponent('VList')
      }).not.toThrow()

      expect(() => {
        // @ts-expect-error Testing unsupported component
        root.createComponent('VButton')
      }).toThrow('Unsupported component: VButton')
    })

    test('throws error when empty components is set', () => {
      const components: string[] = []
      const root = createRemoteRoot(createNoopChannel(), { components })

      expect(() => {
        root.createComponent('VButton')
      }).toThrow('Unsupported component: VButton')
    })

    test('detaches old fragments, attaches new ones and skips unchanged primitives on update', async () => {
      const channel = vi.fn()
      const root = createRemoteRoot(channel, { strict: false })
      const descriptor = defineRemoteComponent<'VCard', { slot: unknown; count: number }>('VCard', ['slot', 'count'])

      const oldFragment = root.createFragment()
      oldFragment.append('old')

      const component = root.createComponent(descriptor, {
        slot: oldFragment,
        count: 1,
      })

      root.append(component)
      await root.mount()

      const newFragment = root.createFragment()
      newFragment.append('new')

      channel.mockClear()
      component.updateProperties({
        slot: newFragment,
        count: 1,
      })

      expect(oldFragment.parent).toBeNull()
      expect(newFragment.parent).toBe(component)
      expect(channel).toHaveBeenCalledWith(
        expect.any(String),
        component.id,
        expect.objectContaining({
          slot: expect.objectContaining({ kind: 'fragment' }),
        })
      )

      expect(root.createComponent('VButton').remove()).toBeNull()
    })

    test('rejects unsupported descriptor methods on invoke', async () => {
      const root = createRemoteRoot(createNoopChannel(), { strict: false })
      type FocusMethods = { focus: (...payload: unknown[]) => Promise<unknown> }
      const descriptor = defineRemoteComponent<'VInput', {}, FocusMethods>('VInput', [], ['focus'])
      const input = root.createComponent(descriptor)

      await expect(input.invoke('blur')).rejects.toBe('Method blur is not supported')
    })

    test('detaches fragment properties when a component is removed', () => {
      const root = createRemoteRoot(createNoopChannel(), { strict: false })
      const fragment = root.createFragment()
      fragment.append('payload')

      const component = root.createComponent('VCard', { slot: fragment })
      root.append(component)

      expect(fragment.parent).toBe(component)

      component.remove()

      expect(fragment.parent).toBeNull()
    })
  })

  describe('createFragment', () => {
    test('creates fragment', () => {
      const root = createRemoteRoot(createNoopChannel())

      const fragment = root.createFragment()

      expect(fragment.id).toEqual('1')
      expect(fragment.children).toHaveLength(0)
      expect(fragment.root).toEqual(root)
      expect(fragment.progenitor).toBeNull()
      expect(fragment.parent).toBeNull()
      expect(fragment.serialize()).toEqual({
        id: fragment.id,
        kind: 'fragment',
        children: [],
      })
    })
  })

  describe('createText', () => {
    test('creates text', () => {
      const root = createRemoteRoot(createNoopChannel())
      const text = root.createText()

      expect(text.id).toEqual('1')
      expect(text.text).toEqual('')
      expect(text.root).toEqual(root)
      expect(text.progenitor).toBeNull()
      expect(text.parent).toBeNull()
      expect(text.print()).toEqual('Text()')
    })

    test('matches remote text guard', () => {
      const root = createRemoteRoot(createNoopChannel(), { strict: false })
      const text = root.createText('value')

      expect(isRemoteText(text)).toBe(true)
    })
  })
})
