import type { ReceivedChild } from '@/dom/host'
import type { RemoteText } from '@/dom/remote'

import {
  assert,
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import { createReceiver } from '@/dom/host'
import { createRemoteRoot } from '@/dom/remote'

import {
  KIND_COMMENT,
  KIND_COMPONENT,
  KIND_TEXT,
} from '@/dom/common/tree'

const expectComment = (text: string) => expect.objectContaining({ kind: KIND_COMMENT, text })

const expectElement = (type: string, children: ReceivedChild[]) =>  expect.objectContaining({
  kind: KIND_COMPONENT,
  type,
  properties: {},
  children,
})

const expectText = (text: string) => expect.objectContaining({ kind: KIND_TEXT, text })

describe('dom/consistency', () => {
  test('remote tree is mounted correctly', async () => {
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

  test('remote tree is updated correctly', async () => {
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

  test('calls method', async () => {
    const receiver = createReceiver()

    const root = createRemoteRoot(receiver.receive)
    const list = root.createComponent('VList')

    root.append(list)

    await root.mount()
    await receiver.flush()

    receiver.tree.invokable({ id: list.id }, (method, payload) => {
      switch (method) {
        case 'sum':
          return (payload as number[]).reduce((sum, v) => sum + v, 0)
        case 'multiply':
          return (payload as [number[]])[0].reduce((sum, v) => sum * v, 1)
        default:
          throw new Error('This methods is not supported')
      }
    })

    expect(await list.invoke('sum', 1, 2, 3, 4)).toEqual(10)
    expect(await list.invoke('multiply', [1, 2, 3, 4])).toEqual(24)

    try {
      await list.invoke('unsupported')
      assert.fail('__This invocation should fail__')
    } catch (e) {
      expect(e).toEqual('This methods is not supported')
    }
  })
})