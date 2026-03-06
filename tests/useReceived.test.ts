import type { Receiver } from '@/dom/host'
import type {
  ReceivedComment,
  ReceivedComponent,
  ReceivedRoot,
  ReceivedText,
} from '@/dom/host/tree'

import {
  afterEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import { ref } from 'vue'

import {
  KIND_COMPONENT,
  KIND_ROOT,
  KIND_TEXT,
  ROOT_ID,
} from '@/dom/common/tree'

import {
  useComment,
  useComponent,
  useInvokeHandler,
  useText,
} from '@/vue/host/useReceived'

describe('useReceived', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test('updates hosted values from receiver tree records', () => {
    const subscriptions = new Map<string, (node: unknown) => void>()
    const records = new Map<string, unknown>()

    const receiver = {
      tree: {
        get: <T extends { id: string }>({ id }: T) => (records.get(id) ?? null) as T | null,
        updatable: <T extends { id: string }>({ id }: T, handler: (node: T) => void) => {
          subscriptions.set(id, handler as (node: unknown) => void)
          return () => subscriptions.delete(id)
        },
        invokable: () => () => {},
        root: {
          id: ROOT_ID,
          kind: KIND_ROOT,
          children: [],
          version: 0,
        } as ReceivedRoot,
      },
    } as unknown as Receiver

    const commentNode = {
      id: 'comment-1',
      kind: 'comment',
      text: 'old',
      version: 0,
    } as ReceivedComment
    records.set(commentNode.id, { ...commentNode, text: 'new' })

    const hostedComment = useComment(receiver, commentNode)
    hostedComment.update()
    expect(hostedComment.text.value).toBe('new')

    subscriptions.get(commentNode.id)?.({ ...commentNode, text: 'stream' })
    expect(hostedComment.text.value).toBe('stream')

    const componentNode = {
      id: 'component-1',
      kind: KIND_COMPONENT,
      type: 'button',
      properties: { disabled: false },
      children: [],
      version: 0,
    } as ReceivedComponent
    records.set(componentNode.id, { ...componentNode, properties: { disabled: true } })

    const hostedComponent = useComponent(receiver, componentNode)
    hostedComponent.update()
    expect(hostedComponent.properties.value).toEqual({ disabled: true })

    const textNode = {
      id: 'text-1',
      kind: KIND_TEXT,
      text: 'old',
      version: 0,
    } as ReceivedText
    const hostedText = useText(receiver, textNode)
    records.set(textNode.id, { ...textNode, text: 'new' })
    hostedText.update()
    expect(hostedText.text.value).toBe('new')

    records.delete(commentNode.id)
    records.delete(componentNode.id)
    records.delete(textNode.id)

    hostedComment.update()
    hostedComponent.update()
    hostedText.update()

    expect(hostedComment.text.value).toBe('stream')
    expect(hostedComponent.properties.value).toEqual({ disabled: true })
    expect(hostedText.text.value).toBe('new')
  })

  test('validates mount state and callable members in invoke handler', () => {
    const node = {
      id: '1',
      kind: KIND_COMPONENT,
      type: 'button',
      properties: {},
      children: [],
      version: 0,
    } as ReceivedComponent

    const missingMount = useInvokeHandler(node, ref(null))
    expect(() => missingMount('focus', [])).toThrow('not mounted to host environment yet')

    const element = { disabled: true, focus: vi.fn() }
    const invoke = useInvokeHandler(node, ref(element as unknown as Element))

    invoke('focus', [])
    expect(element.focus).toHaveBeenCalledOnce()

    expect(() => invoke('disabled', [])).toThrow('doesn\'t support method disabled')
  })

  test('prints generic messages for nodes without a type', () => {
    const nodeWithoutType = {
      id: 'x',
      kind: KIND_TEXT,
    } as unknown as ReceivedComponent

    const invoke = useInvokeHandler(nodeWithoutType, ref(null))
    expect(() => invoke('noop', [])).toThrow('Node [ID=x, KIND=text] not mounted to host environment yet')
  })
})
