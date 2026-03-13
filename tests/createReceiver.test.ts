import type { ReceivedChild } from '@/dom/host'
import type { ReceivedComponent } from '@/dom/host/tree'
import type { RemoteText } from '@/dom/remote'

import {
  assert,
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import {
  KIND_COMMENT,
  KIND_COMPONENT,
  KIND_TEXT,
} from '@/dom/common/tree'
import {
  ACTION_INSERT_CHILD,
  ACTION_MOUNT,
} from '@/dom/common/channel'

import { createReceiver } from '@/dom/host'
import { createRemoteRoot } from '@/dom/remote'

const expectComment = (text: string) => expect.objectContaining({ kind: KIND_COMMENT, text })

const expectElement = (type: string, children: ReceivedChild[]) => expect.objectContaining({
  kind: KIND_COMPONENT,
  type,
  properties: {},
  children,
})

const expectText = (text: string) => expect.objectContaining({ kind: KIND_TEXT, text })

describe('createReceiver', () => {
  test('mounts a remote tree and emits mount once', async () => {
    const onMounted = vi.fn()

    const receiver = createReceiver()

    receiver.on('mount', onMounted)

    expect(receiver.state).toEqual('unmounted')

    const root = createRemoteRoot(receiver.receive)

    const card = root.createComponent('VCard')
    const button = root.createComponent('button', null, 'Click me')

    card.append(button)
    root.append(root.createComment('Card below'))
    root.append(card)

    await root.mount()
    await receiver.flush()

    expect(onMounted).toHaveBeenCalledOnce()
    expect(receiver.state).toEqual('mounted')
    expect(receiver.tree.root.children).toEqual([
      expectComment('Card below'),
      expect.objectContaining({
        id: card.id,
        kind: KIND_COMPONENT,
        type: 'VCard',
        properties: {},
        children: [expectElement('button', [expectText('Click me')])],
      }),
    ])
  })

  test('applies remote tree updates in order', async () => {
    const receiver = createReceiver()

    const root = createRemoteRoot(receiver.receive)

    const carrots = root.createComponent('li', null, 'Carrots')
    const onions = root.createComponent('li', null, 'Onions')
    const potatoes = root.createComponent('li', null, 'Potatoes')
    const tomatoes = root.createComponent('li', null, 'Tomatoes')

    const list = root.createComponent('ul', null, [
      carrots,
      onions,
      potatoes,
      tomatoes,
    ])

    await root.mount()
    await receiver.flush()

    expect(receiver.state).toEqual('mounted')
    expect(receiver.tree.root.children).toEqual([])

    const comment = root.createComment('List above')

    root.append(list, comment)

    await receiver.flush()

    expect(receiver.tree.root.children).toEqual([
      expectElement('ul', [
        expectElement('li', [expectText('Carrots')]),
        expectElement('li', [expectText('Onions')]),
        expectElement('li', [expectText('Potatoes')]),
        expectElement('li', [expectText('Tomatoes')]),
      ]),
      expectComment('List above'),
    ])

    list.removeChild(onions)

    await receiver.flush()

    expect(receiver.tree.root.children).toEqual([
      expectElement('ul', [
        expectElement('li', [expectText('Carrots')]),
        expectElement('li', [expectText('Potatoes')]),
        expectElement('li', [expectText('Tomatoes')]),
      ]),
      expectComment('List above'),
    ])

    list.insertBefore(root.createComponent('li', null, 'Apples'), carrots)
    list.insertBefore(tomatoes, potatoes)

    await receiver.flush()

    expect(receiver.tree.root.children).toEqual([
      expectElement('ul', [
        expectElement('li', [expectText('Apples')]),
        expectElement('li', [expectText('Carrots')]),
        expectElement('li', [expectText('Tomatoes')]),
        expectElement('li', [expectText('Potatoes')]),
      ]),
      expectComment('List above'),
    ])

    const text = tomatoes.children[0] as RemoteText

    text.update('Tomatoes "Cherry"')

    await receiver.flush()

    expect(receiver.tree.root.children).toEqual([
      expectElement('ul', [
        expectElement('li', [expectText('Apples')]),
        expectElement('li', [expectText('Carrots')]),
        expectElement('li', [expectText('Tomatoes "Cherry"')]),
        expectElement('li', [expectText('Potatoes')]),
      ]),
      expectComment('List above'),
    ])

    list.append(comment)

    expect(receiver.tree.root.children).toEqual(expect.arrayContaining([
      expectElement('ul', expect.arrayContaining([
        expectElement('li', [expectText('Apples')]),
        expectElement('li', [expectText('Carrots')]),
        expectElement('li', [expectText('Tomatoes "Cherry"')]),
        expectElement('li', [expectText('Potatoes')]),
        expectComment('List above'),
      ])),
    ]))
  })

  test('replaces fragment props and keeps receiver context in sync', async () => {
    const receiver = createReceiver()
    const root = createRemoteRoot(receiver.receive, { strict: false })

    const oldFragment = root.createFragment()
    oldFragment.append('old')

    const card = root.createComponent('VCard', {
      slot: oldFragment,
    })

    root.append(card)
    await root.mount()
    await receiver.flush()

    const mountedCard = receiver.tree.root.children[0] as ReceivedComponent<{
      slot: { id: string };
    }>

    const oldFragmentId = mountedCard.properties.slot.id
    expect(receiver.tree.get({ id: oldFragmentId })).toBeTruthy()

    const newFragment = root.createFragment()
    newFragment.append('new')

    card.updateProperties({ slot: newFragment })
    await receiver.flush()

    const updatedCard = receiver.tree.root.children[0] as ReceivedComponent<{
      slot: { id: string };
    }>

    expect(updatedCard.properties.slot.id).not.toBe(oldFragmentId)
    expect(receiver.tree.get({ id: oldFragmentId })).toBeNull()
    expect(receiver.tree.get({ id: updatedCard.properties.slot.id })).toBeTruthy()
  })

  test('moves the first child between parents', async () => {
    const receiver = createReceiver()
    const root = createRemoteRoot(receiver.receive)

    const owner = root.createComponent('Owner')
    const hijacker = root.createComponent('Hijacker')
    const card = root.createComponent('Card')

    owner.append(card)
    root.append(owner, hijacker)

    await root.mount()
    await receiver.flush()

    expect((receiver.tree.root.children[0] as ReceivedComponent).children).toHaveLength(1)
    expect((receiver.tree.root.children[1] as ReceivedComponent).children).toHaveLength(0)

    hijacker.append(card)
    await receiver.flush()

    expect((receiver.tree.root.children[0] as ReceivedComponent).children).toHaveLength(0)
    expect((receiver.tree.root.children[1] as ReceivedComponent).children).toHaveLength(1)
  })

  test('invokes registered methods on received nodes', async () => {
    const receiver = createReceiver()

    const root = createRemoteRoot(receiver.receive)
    const list = root.createComponent('VList')

    root.append(list)

    await root.mount()
    await receiver.flush()

    receiver.tree.invokable({ id: list.id }, (method, payload) => {
      switch (method) {
        case 'sum':
          return (payload as number[]).reduce((sum, value) => sum + value, 0)
        case 'multiply':
          return (payload as [number[]])[0].reduce((product, value) => product * value, 1)
        default:
          throw new Error('This methods is not supported')
      }
    })

    expect(await list.invoke('sum', 1, 2, 3, 4)).toEqual(10)
    expect(await list.invoke('multiply', [1, 2, 3, 4])).toEqual(24)

    try {
      await list.invoke('unsupported')
      assert.fail('__This invocation should fail__')
    } catch (error) {
      expect(error).toEqual('This methods is not supported')
    }
  })

  test('awaits async invoke handlers before replying to remote nodes', async () => {
    const receiver = createReceiver()

    const root = createRemoteRoot(receiver.receive)
    const dialog = root.createComponent('VDialog')

    root.append(dialog)

    await root.mount()
    await receiver.flush()

    receiver.tree.invokable({ id: dialog.id }, async (method, payload) => {
      if (method === 'open') {
        return payload[0]
      }

      throw new Error('Unsupported async method')
    })

    await expect(dialog.invoke('open', 'dialog-1')).resolves.toBe('dialog-1')
    await expect(dialog.invoke('close')).rejects.toBe('Unsupported async method')
  })

  test('keeps channel processing for malformed inserts with a missing old child', () => {
    const receiver = createReceiver()

    receiver.receive(ACTION_MOUNT, [{
      id: '1',
      kind: KIND_COMPONENT,
      type: 'Owner',
      properties: {},
      children: [],
    }, {
      id: '2',
      kind: KIND_COMPONENT,
      type: 'Hijacker',
      properties: {},
      children: [],
    }])

    receiver.receive(
      ACTION_INSERT_CHILD,
      '2',
      0,
      {
        id: '3',
        kind: KIND_COMPONENT,
        type: 'Card',
        properties: {},
        children: [],
      },
      '1'
    )

    const hijacker = receiver.tree.root.children[1] as {
      children: unknown[];
    }
    expect(hijacker.children).toEqual([undefined])
  })
})
