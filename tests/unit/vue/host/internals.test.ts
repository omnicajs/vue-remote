import type { Receiver } from '@/dom/host'
import type {
  ReceivedComment,
  ReceivedComponent,
  ReceivedRoot,
  ReceivedText,
} from '@/dom/host/tree'
import type { HostedChild } from '@/vue/host/tree'

import {
  afterEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import { ref, shallowRef } from 'vue'

import {
  KIND_COMPONENT,
  KIND_ROOT,
  KIND_TEXT,
  ROOT_ID,
} from '@/dom/common/tree'

import { REMOTE_SLOT } from '@/vue/internals'
import createProvider from '@/vue/host/createProvider'
import render, { toSlots } from '@/vue/host/render'
import {
  serializeBaseEvent,
  serializeDragEvent,
  serializeEvent,
  serializeFocusEvent,
  serializeInputEvent,
  serializeKeyboardEvent,
  serializeMouseEvent,
  serializePointerEvent,
  serializeTarget,
  serializeTouchList,
  serializeTouchEvent,
  serializeWheelEvent,
} from '@/vue/host/events'

import {
  useComment,
  useComponent,
  useInvokeHandler,
  useText,
} from '@/vue/host/useReceived'

describe('vue/host internals', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test('provider throws for unknown component', () => {
    const provider = createProvider({
      VButton: { name: 'VButton' } as never,
    })

    expect(() => provider.get('VInput')).toThrow('Unknown component: VInput')
  })

  test('serializes select targets and unknown targets', () => {
    const select = document.createElement('select')
    const one = document.createElement('option')
    one.value = 'one'
    one.text = 'One'
    const two = document.createElement('option')
    two.value = 'two'
    two.text = 'Two'
    two.selected = true

    select.append(one, two)
    select.selectedIndex = 1

    expect(serializeTarget(select)).toEqual({
      value: 'two',
      selectedIndex: 1,
      selectedOptions: [{ value: 'two', text: 'Two', selected: true }],
    })

    const input = document.createElement('input')
    input.value = 'test'
    input.checked = true
    expect(serializeTarget(input)).toEqual({ value: 'test', checked: true })

    const textarea = document.createElement('textarea')
    textarea.value = 'area'
    expect(serializeTarget(textarea)).toEqual({ value: 'area' })

    expect(serializeTarget({} as EventTarget)).toEqual({})
  })

  test('serializes focus with related target, drag data transfer and base events fallback', () => {
    vi.stubGlobal('DragEvent', class DragEvent extends Event {})
    vi.stubGlobal('PointerEvent', class PointerEvent extends Event {})

    const related = document.createElement('div')
    const focused = new FocusEvent('focus', { relatedTarget: related })
    const serializedFocus = serializeFocusEvent(focused)

    expect(serializedFocus.relatedTarget).toEqual({ tagName: 'DIV' })

    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' })
    const serializedDrag = serializeDragEvent({
      type: 'dragstart',
      target: null,
      currentTarget: null,
      bubbles: true,
      cancelable: true,
      composed: false,
      defaultPrevented: false,
      eventPhase: 2,
      isTrusted: false,
      clientX: 12,
      clientY: 8,
      button: 0,
      dataTransfer: {
        dropEffect: 'copy',
        effectAllowed: 'all',
        types: ['Files'],
        files: [file],
      },
    } as unknown as DragEvent)

    expect(serializedDrag.dataTransfer).toEqual({
      dropEffect: 'copy',
      effectAllowed: 'all',
      types: ['Files'],
      files: [{
        lastModified: file.lastModified,
        name: 'hello.txt',
        webkitRelativePath: file.webkitRelativePath,
        size: file.size,
        type: 'text/plain',
      }],
    })

    const serializedGeneric = serializeEvent(new Event('change'))
    expect(serializedGeneric).toMatchObject({ type: 'change' })
  })

  test('serializeEvent routes through input, keyboard, pointer, wheel, drag and touch serializers', () => {
    class FakeDragEvent extends Event {
      clientX = 10
      clientY = 20
      button = 0
      dataTransfer = null
    }

    class FakePointerEvent extends Event {
      clientX = 10
      clientY = 20
      button = 0
      height = 1
      isPrimary = true
      pointerId = 1
      pointerType = 'mouse'
      pressure = 0
      tangentialPressure = 0
      tiltX = 0
      tiltY = 0
      twist = 0
      width = 1
    }

    class FakeTouchEvent extends Event {
      altKey = false
      changedTouches = [] as unknown as TouchList
      ctrlKey = false
      metaKey = false
      shiftKey = false
      targetTouches = [] as unknown as TouchList
      touches = [] as unknown as TouchList
    }

    vi.stubGlobal('DragEvent', FakeDragEvent)
    vi.stubGlobal('PointerEvent', FakePointerEvent)
    vi.stubGlobal('TouchEvent', FakeTouchEvent)

    expect(serializeInputEvent(new InputEvent('input', { data: 'x' })).data).toBe('x')
    expect(serializeKeyboardEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter' })).key).toBe('Enter')
    expect(serializeMouseEvent(new MouseEvent('click', { clientX: 1, clientY: 2 })).clientX).toBe(1)
    expect(serializeWheelEvent(new WheelEvent('wheel', { deltaX: 1, deltaY: 2, deltaZ: 3 })).deltaY).toBe(2)
    expect(serializePointerEvent(new FakePointerEvent('pointerdown') as unknown as PointerEvent).pointerId).toBe(1)
    expect(serializeDragEvent(new FakeDragEvent('dragstart') as unknown as DragEvent).dataTransfer).toBeNull()
    expect(serializeTouchEvent(new FakeTouchEvent('touchstart') as unknown as TouchEvent).touches).toEqual([])

    expect(serializeEvent(new InputEvent('input', { data: 'x' }))).toMatchObject({ type: 'input' })
    expect(serializeEvent(new FakeDragEvent('dragstart') as unknown as DragEvent)).toMatchObject({ type: 'dragstart' })
    expect(serializeEvent(new KeyboardEvent('keydown', { key: 'A' }))).toMatchObject({ type: 'keydown' })
    expect(serializeEvent(new FakePointerEvent('pointerdown') as unknown as PointerEvent)).toMatchObject({ type: 'pointerdown' })
    expect(serializeEvent(new WheelEvent('wheel'))).toMatchObject({ type: 'wheel' })
    expect(serializeEvent(new FakeTouchEvent('touchstart') as unknown as TouchEvent)).toMatchObject({ type: 'touchstart' })
    expect(serializeBaseEvent(new Event('plain'))).toMatchObject({ type: 'plain' })
  })

  test('serializes touch lists', () => {
    const [touch] = serializeTouchList([{
      clientX: 1,
      clientY: 2,
      force: 0.5,
      identifier: 7,
      pageX: 3,
      pageY: 4,
      radiusX: 5,
      radiusY: 6,
      rotationAngle: 8,
      screenX: 9,
      screenY: 10,
    }] as unknown as TouchList)

    expect(touch).toEqual({
      clientX: 1,
      clientY: 2,
      force: 0.5,
      identifier: 7,
      pageX: 3,
      pageY: 4,
      radiusX: 5,
      radiusY: 6,
      rotationAngle: 8,
      screenX: 9,
      screenY: 10,
    })
  })

  test('render reports orphan slots and returns null for empty text nodes', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    const orphanSlot = {
      id: '1',
      kind: KIND_COMPONENT,
      type: REMOTE_SLOT,
      ref: ref(null),
      properties: ref({ name: 'header' }),
      children: shallowRef([]),
      update: vi.fn(),
      release: vi.fn(),
    } as unknown as HostedChild

    const emptyText = {
      id: '2',
      kind: KIND_TEXT,
      text: ref(''),
      update: vi.fn(),
      release: vi.fn(),
    } as unknown as HostedChild

    const provider = createProvider()

    expect(render(orphanSlot, provider)).toBeNull()
    expect(error).toHaveBeenCalledOnce()
    expect(render(emptyText, provider)).toBeNull()
  })

  test('toSlots keeps default content and named slots', () => {
    const defaultText = {
      id: 'd',
      kind: KIND_TEXT,
      text: ref('default'),
      update: vi.fn(),
      release: vi.fn(),
    } as unknown as HostedChild

    const slotNode = {
      id: 's',
      kind: KIND_COMPONENT,
      type: REMOTE_SLOT,
      ref: ref(null),
      properties: ref({ name: 'header' }),
      children: shallowRef([defaultText]),
      update: vi.fn(),
      release: vi.fn(),
    } as unknown as HostedChild

    const slots = toSlots([slotNode, defaultText], node => {
      if ('text' in node) {
        return node.text.value
      }

      return null
    })

    expect(slots.default()).toEqual(['default'])
    expect(slots.header?.()).toEqual(['default'])
  })

  test('useReceived helpers update data from receiver tree', () => {
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

  test('invoke handler validates mount state and callable members', () => {
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

  test('invoke handler message without type uses generic printer', () => {
    const nodeWithoutType = {
      id: 'x',
      kind: KIND_TEXT,
    } as unknown as ReceivedComponent

    const invoke = useInvokeHandler(nodeWithoutType, ref(null))
    expect(() => invoke('noop', [])).toThrow('Node [ID=x, KIND=text] not mounted to host environment yet')
  })
})
