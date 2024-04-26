import type {
  Channel,
  ReceivedComponent,
} from '@/dom/host'

import type {
  RemoteComment,
  RemoteText,
} from '@/dom/remote'

import type { UnknownComponent } from '@/dom/remote/tree'

import {
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import { createReceiver } from '@/dom/host'

import {
  createRemoteRoot,
  defineRemoteComponent,
} from '@/dom/remote'

import {
  ACTION_MOUNT,
  ACTION_INSERT_CHILD,
  ACTION_REMOVE_CHILD,
  ACTION_UPDATE_TEXT, ACTION_INVOKE,
} from '@/dom/common/channel'

import {
  KIND_COMPONENT,
  KIND_TEXT,
  ROOT_ID,
} from '@/dom/common/tree'

describe('dom/remote', () => {
  describe('RemoteRoot::createComment()', () => {
    test('creates comment', () => {
      const root = createRemoteRoot(() => {})
      const comment = root.createComment('v-if')

      expect(comment.id).toEqual('1')
      expect(comment.text).toEqual('v-if')
    })
  })

  describe('RemoteRoot::createComponent()', () => {
    test('creates component', () => {
      const VCard = defineRemoteComponent<'VCard', {
        orientation: 'horizontal' | 'vertical',
      }>('VCard', [
        'orientation',
      ])

      const root = createRemoteRoot(() => {})
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
    })

    test('creates component with children', () => {
      const root = createRemoteRoot(() => {}, {
        strict: false,
      })

      const card = root.createComponent('VCard', null, [
        root.createComponent('VImage'),
        root.createComponent('VButton'),
      ])

      expect(card.children).toHaveLength(2)
      expect((card.children[0] as UnknownComponent).type).toEqual('VImage')
      expect((card.children[1] as UnknownComponent).type).toEqual('VButton')
    })

    test('creates component with single child', () => {
      const root = createRemoteRoot(() => {}, {
        strict: false,
      })

      const card = root.createComponent('VCard', null, root.createComponent('VImage'))

      expect(card.children).toHaveLength(1)
      expect((card.children[0] as UnknownComponent).type).toEqual('VImage')
    })

    test('does not throw error for allowed components', () => {
      const components = [defineRemoteComponent('VCard')]
      const root = createRemoteRoot(() => {}, { components })

      expect(() => {
        root.createComponent('VCard')
      }).not.toThrow()
    })

    test('throws error for not allowed components', () => {
      const components = [
        defineRemoteComponent('VCard'),
        defineRemoteComponent('VList'),
      ]
      const root = createRemoteRoot(() => {}, { components })

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
      const root = createRemoteRoot(() => {}, { components })

      expect(() => {
        root.createComponent('VButton')
      }).toThrow('Unsupported component: VButton')
    })
  })

  describe('RemoteRoot::createFragment()', () => {
    test('creates fragment', () => {
      const root = createRemoteRoot(() => {})

      const fragment = root.createFragment()

      expect(fragment.id).toEqual('1')
      expect(fragment.children).toHaveLength(0)
      expect(fragment.root).toEqual(root)
      expect(fragment.progenitor).toBeNull()
      expect(fragment.parent).toBeNull()
    })
  })

  describe('RemoteRoot::createText()', () => {
    test('creates text', () => {
      const root = createRemoteRoot(() => {})
      const text = root.createText()

      expect(text.id).toEqual('1')
      expect(text.text).toEqual('')
      expect(text.root).toEqual(root)
      expect(text.progenitor).toBeNull()
      expect(text.parent).toBeNull()
    })
  })

  describe('RemoteRoot::append()', () => {
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
      const root = createRemoteRoot(() => {})

      expect(() => {
        // @ts-expect-error Testing unsupported argument
        root.append({})
      }).toThrow('Cannot append a node that was not created by this remote root')
    })

    test('throws error when calling with a component created by another root', () => {
      const root = createRemoteRoot(() => {})

      expect(() => {
        root.append(createRemoteRoot(() => {}).createComponent('VCard'))
      }).toThrow('Cannot append a node that was not created by this remote root')
    })
  })

  describe('RemoteRoot::insertBefore()', () => {
    test('inserts child before specified one', () => {
      const root = createRemoteRoot(() => {})
      const card = root.createComponent('VCard')

      root.append(card)

      const image = root.createComponent('VImage')

      root.insertBefore(image, card)

      expect(root.children).toHaveLength(2)
      expect(root.children[0]).toEqual(image)
      expect(root.children[1]).toEqual(card)
    })

    test('changes order of components if called on already appended children', () => {
      const root = createRemoteRoot(() => {})
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
      const root = createRemoteRoot(() => {})
      const card = root.createComponent('Card')

      root.append(card)

      expect(() => {
        // @ts-expect-error Testing unsupported argument
        root.insertBefore({}, card)
      }).toThrow('Cannot insert a node that was not created by this remote root')
    })
  })

  describe('RemoteRoot::replace()', () => {
    test('replaces child with another one', () => {
      const root = createRemoteRoot(() => {})
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
      const root = createRemoteRoot(() => {})
      const card = root.createComponent('VCard')

      root.append(card)

      expect(() => {
        // @ts-expect-error Testing unsupported argument
        root.replace({})
      }).toThrow('Cannot append a node that was not created by this remote root')
    })

    test('throws error when calling with a component created by another root', () => {
      const root = createRemoteRoot(() => {})
      const card = root.createComponent('VCard')

      root.append(card)

      expect(() => {
        root.replace(createRemoteRoot(() => {}).createComponent('VImage'))
      }).toThrow('Cannot append a node that was not created by this remote root')
    })
  })

  describe('RemoteRoot::mount()', () => {
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

  describe('RemoteComment', () => {
    test('calls channel to update comment', () => {
      const channel = vi.fn()

      const root = createRemoteRoot(channel)
      const comment = root.createComment()

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

  describe('RemoteComponent', () => {
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

    describe('proxying', () => {
      test('makes proxies for functions', () => {
        const onClickPrev = vi.fn()
        const onClickNext = vi.fn()

        const receiver = createDelayedReceiver()

        const root = createRemoteRoot(receiver.receive)
        const button = root.createComponent('VButton', {
          onClick: onClickPrev,
        })

        root.append(button)
        root.mount()

        receiver.flush()

        button.updateProperties({ onClick: onClickNext })

        receiver.flush()

        const received = receiver.children[0] as ReceivedComponent<{
          onClick: () => void;
        }>

        expect(received).toBeTruthy()

        received.properties.onClick()

        expect(onClickPrev).not.toHaveBeenCalled()
        expect(onClickNext).toHaveBeenCalled()
      })

      test('makes proxies for functions in arrays', () => {
        const onActionPrev = vi.fn()
        const onActionNext = vi.fn()

        type VCardProperties = {
          actions: Array<{ onAction: () => void }>
        }

        const VCard = defineRemoteComponent<'VCard', VCardProperties>('VCard', [
          'actions',
        ])

        const receiver = createDelayedReceiver()

        const root = createRemoteRoot(receiver.receive)
        const card = root.createComponent(VCard, {
          actions: [{ onAction: onActionPrev }],
        })

        root.append(card)
        root.mount()

        receiver.flush()

        const received = receiver.children[0] as ReceivedComponent<VCardProperties>

        expect(received).toBeTruthy()

        received.properties.actions[0].onAction()

        card.updateProperties({ actions: [{ onAction: onActionNext }] })

        received.properties.actions[0].onAction()

        card.updateProperties({ actions: [{ onAction: onActionNext }] })

        received.properties.actions[0].onAction()

        expect(onActionPrev).toHaveBeenCalledOnce()
        expect(onActionNext).toHaveBeenCalledTimes(2)
      })

      test('makes proxies for functions in new entries of arrays', () => {
        const onFirstActionPrev = vi.fn()
        const onFirstActionNext = vi.fn()
        const onSecondAction = vi.fn()

        type VCardProperties = {
          actions: Array<{ onAction: () => void }>
        }

        const VCard = defineRemoteComponent<'VCard', VCardProperties>('VCard', [
          'actions',
        ])

        const receiver = createDelayedReceiver()

        const root = createRemoteRoot(receiver.receive)
        const card = root.createComponent(VCard, {
          actions: [{ onAction: onFirstActionPrev }],
        })

        root.append(card)
        root.mount()

        card.updateProperties({ actions: [
          { onAction: onFirstActionNext },
          { onAction: onSecondAction },
        ] })

        receiver.flush()

        const received = receiver.children[0] as ReceivedComponent<VCardProperties>

        expect(received).toBeTruthy()

        received.properties.actions[0].onAction()
        received.properties.actions[1].onAction()

        expect(onFirstActionPrev).not.toHaveBeenCalled()
        expect(onFirstActionNext).toHaveBeenCalled()
        expect(onSecondAction).toHaveBeenCalled()
      })

      test('makes proxies for functions in deep nested arrays', () => {
        const onFirstActionPrev = vi.fn()
        const onFirstActionNext = vi.fn()
        const onSecondAction = vi.fn()

        type VListProperties = {
          actionGroups: Array<{
            actions: Array<{ onAction: () => void }>
          }>
        }

        const VList = defineRemoteComponent<'VList', VListProperties>('VList', [
          'actionGroups',
        ])

        const receiver = createDelayedReceiver()

        const root = createRemoteRoot(receiver.receive)
        const list = root.createComponent(VList, {
          actionGroups: [{
            actions: [{ onAction: onFirstActionPrev }],
          }],
        })

        root.append(list)
        root.mount()

        list.updateProperties({
          actionGroups: [{
            actions: [
              { onAction: onFirstActionNext },
              { onAction: onSecondAction },
            ],
          }],
        })

        receiver.flush()

        const received = receiver.children[0] as ReceivedComponent<VListProperties>

        expect(received).toBeTruthy()

        const { actionGroups: [{ actions }] } = received.properties

        expect(actions).toHaveLength(2)

        actions[0].onAction()
        actions[1].onAction()

        expect(onFirstActionPrev).not.toHaveBeenCalled()
        expect(onFirstActionNext).toHaveBeenCalled()
        expect(onSecondAction).toHaveBeenCalled()
      })

      test('keeps proxies for removed entries in arrays, if another entry takes the place', () => {
        type VListProperties = {
          filter: Array<() => void>;
        }

        const VList = defineRemoteComponent<'VList', VListProperties>('VList', [
          'filter',
        ])

        const fn1 = vi.fn()
        const fn2 = vi.fn()

        const receiver = createDelayedReceiver()

        const root = createRemoteRoot(receiver.receive)
        const list = root.createComponent(VList, {
          filter: [fn1, fn2],
        })

        root.append(list)
        root.mount()

        const [fn] = list.serialize().properties.filter

        list.updateProperties({
          filter: [fn2],
        })

        // Getting initial properties
        receiver.flush()

        const received = receiver.children[0] as ReceivedComponent<VListProperties>

        received.properties.filter[0]?.()

        fn()

        expect(fn1).not.toHaveBeenCalled()
        expect(fn2).toHaveBeenCalledTimes(2)
      })

      test('unsets proxies for removed keys in arrays', () => {
        type VListProperties = {
          filter: Array<() => void>;
        }

        const VList = defineRemoteComponent<'VList', VListProperties>('VList', [
          'filter',
        ])

        const fn1 = vi.fn()
        const fn2 = vi.fn()

        const receiver = createDelayedReceiver()

        const root = createRemoteRoot(receiver.receive)
        const list = root.createComponent(VList, {
          filter: [fn1, fn2],
        })

        root.append(list)
        root.mount()

        const [, fn] = list.serialize().properties.filter

        fn()

        expect(fn2).toHaveBeenCalledOnce()

        list.updateProperties({
          filter: [fn1],
        })

        // Getting initial properties
        receiver.flush()

        const received = receiver.children[0] as ReceivedComponent<VListProperties>

        received.properties.filter[0]?.()

        fn()

        expect(fn1).toHaveBeenCalledOnce()
        expect(fn2).toHaveBeenCalledOnce()
      })

      test('makes proxies for functions in nested objects', () => {
        type VListProperties = {
          filter: {
            onChange: () => void;
            value: string;
          };
        }

        const VList = defineRemoteComponent<'VList', VListProperties>('VList', [
          'filter',
        ])

        const onClickPrev = vi.fn()
        const onClickNext = vi.fn()

        const receiver = createDelayedReceiver()

        const root = createRemoteRoot(receiver.receive)
        const list = root.createComponent(VList, {
          filter: {
            onChange: onClickPrev,
            value: 'foo',
          },
        })

        root.append(list)
        root.mount()

        list.updateProperties({
          filter: {
            onChange: onClickNext,
            value: 'bar',
          },
        })

        // Getting initial properties
        receiver.flush()

        const received = receiver.children[0] as ReceivedComponent<VListProperties>

        expect(received.properties.filter.value).toBe('bar')

        received.properties.filter.onChange()

        expect(onClickPrev).not.toHaveBeenCalled()
        expect(onClickNext).toHaveBeenCalled()
      })

      test('makes proxies for functions for new keys in nested objects', () => {
        type VListProperties = {
          filter: {
            onChange: () => void;
            onBlur?: () => void;
            value: string;
          };
        }

        const VList = defineRemoteComponent<'VList', VListProperties>('VList', [
          'filter',
        ])

        const onClickPrev = vi.fn()
        const onClickNext = vi.fn()
        const onBlur = vi.fn()

        const receiver = createDelayedReceiver()

        const root = createRemoteRoot(receiver.receive)
        const list = root.createComponent(VList, {
          filter: {
            onChange: onClickPrev,
            value: 'foo',
          },
        })

        root.append(list)
        root.mount()

        list.updateProperties({
          filter: {
            onChange: onClickNext,
            onBlur,
            value: 'bar',
          },
        })

        // Getting initial properties
        receiver.flush()

        const received = receiver.children[0] as ReceivedComponent<VListProperties>

        expect(received.properties.filter.value).toBe('bar')

        received.properties.filter.onChange()
        received.properties.filter.onBlur?.()

        expect(onClickPrev).not.toHaveBeenCalled()
        expect(onClickNext).toHaveBeenCalled()
        expect(onBlur).toHaveBeenCalled()
      })

      test('unsets proxies for removed keys in nested objects', () => {
        type VListProperties = {
          filter: {
            onChange: () => void;
            onBlur?: () => void;
            value: string;
          };
        }

        const VList = defineRemoteComponent<'VList', VListProperties>('VList', [
          'filter',
        ])

        const onChangePrev = vi.fn()
        const onChangeNext = vi.fn()
        const onBlur = vi.fn()

        const receiver = createDelayedReceiver()

        const root = createRemoteRoot(receiver.receive)
        const list = root.createComponent(VList, {
          filter: {
            onChange: onChangePrev,
            onBlur,
            value: 'foo',
          },
        })

        root.append(list)
        root.mount()

        const onBlurProxy = list.serialize().properties.filter.onBlur as typeof onBlur

        onBlurProxy()

        expect(onBlur).toHaveBeenCalledOnce()

        list.updateProperties({
          filter: {
            onChange: onChangeNext,
            value: 'bar',
          },
        })

        // Getting initial properties
        receiver.flush()

        const received = receiver.children[0] as ReceivedComponent<VListProperties>

        expect(received.properties.filter.value).toBe('bar')
        expect(received.properties.filter.onBlur).toBe(undefined)

        received.properties.filter.onChange()
        onBlurProxy()

        expect(onChangePrev).not.toHaveBeenCalled()
        expect(onChangeNext).toHaveBeenCalled()
        expect(onBlur).toHaveBeenCalledOnce()
      })

      test('unsets proxies for values that was replaced with another type', () => {
        type VListProperties = {
          filter: { onChange: () => void; } | [() => void];
        }

        const VList = defineRemoteComponent<'VList', VListProperties>('VList', [
          'filter',
        ])

        const onChange1 = vi.fn()
        const onChange2 = vi.fn()
        const onChange3 = vi.fn()

        const receiver = createDelayedReceiver()

        const root = createRemoteRoot(receiver.receive)
        const list = root.createComponent(VList, {
          filter: { onChange: onChange1 },
        })

        root.append(list)
        root.mount()

        list.updateProperties({
          filter: [onChange2],
        })

        // Getting initial properties
        receiver.flush()

        const received = receiver.children[0] as ReceivedComponent<VListProperties>

        expect(Array.isArray(received.properties.filter)).toBeTruthy()

        const [onChangeInArray] = received.properties.filter as [() => void]

        onChangeInArray()

        expect(onChange1).not.toHaveBeenCalled()
        expect(onChange2).toHaveBeenCalledOnce()

        list.updateProperties({
          filter: { onChange: onChange3 },
        })

        receiver.flush()

        const { onChange: onChangeInObject } = received.properties.filter as { onChange: () => void; }

        onChangeInObject()

        expect(onChange1).not.toHaveBeenCalled()
        expect(onChange2).toHaveBeenCalledOnce()
        expect(onChange3).toHaveBeenCalledOnce()
      })
    })
  })

  describe('RemoteFragment', () => {
    test('appends children', () => {
      const root = createRemoteRoot(() => {})
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
      const root = createRemoteRoot(() => {})
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
      const root = createRemoteRoot(() => {})

      const fragment = root.createFragment()
      const card1 = root.createComponent('VCard')
      const card2 = root.createComponent('VCard')

      fragment.append(card1, card2)

      expect(fragment.children).toEqual([card1, card2])

      fragment.insertBefore(card2, card1)

      expect(fragment.children).toEqual([card2, card1])
    })

    test('replaces children', () => {
      const root = createRemoteRoot(() => {})
      const fragment = root.createFragment()

      fragment.append(root.createComponent('VImage'), 'Some text')

      expect(fragment.children).toHaveLength(2)

      fragment.replace(root.createComponent('VCard'))

      expect(fragment.children).toHaveLength(1)
      expect(fragment.children[0].kind).toEqual(KIND_COMPONENT)
      expect((fragment.children[0] as UnknownComponent).type).toEqual('VCard')
    })

    test('removes children', () => {
      const root = createRemoteRoot(() => {})

      const fragment = root.createFragment()
      const card1 = root.createComponent('VCard')
      const card2 = root.createComponent('VCard')

      fragment.append(card1, card2)

      expect(fragment.children).toEqual([card1, card2])

      fragment.removeChild(card1)

      expect(fragment.children).toEqual([card2])
    })
  })

  describe('RemoteText', () => {
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
})

function createDelayedReceiver () {
  const receiver = createReceiver()
  const enqueued = new Set<() => void>()

  return {
    get children () { return receiver.tree.root.children },

    receive: ((type, ...args) => {
      const perform = () => {
        receiver.receive(type, ...args)
        enqueued.delete(perform)
      }

      enqueued.add(perform)
    }) as Channel,

    flush () {
      const currentlyEnqueued = [...enqueued]
      enqueued.clear()

      for (const perform of currentlyEnqueued) {
        perform()
      }
    },
  }
}