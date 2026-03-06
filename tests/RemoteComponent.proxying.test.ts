import type {
  Channel,
  ReceivedComponent,
} from '@/dom/host'

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

describe('RemoteComponent.proxying', () => {
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
