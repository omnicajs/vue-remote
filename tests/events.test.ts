import {
  afterEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import {
  serializeBaseEvent,
  serializeDragEvent,
  serializeEvent,
  serializeFocusEvent,
  serializeInputEvent,
  serializeKeyboardEvent,
  serializeMouseEvent,
  serializeNativeVModelEvent,
  serializePointerEvent,
  serializeTarget,
  serializeTouchList,
  serializeTouchEvent,
  serializeWheelEvent,
} from '@/vue/host/events'

describe('events', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
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
    expect(serializeNativeVModelEvent(new Event('input'))).toEqual({
      type: 'input',
      target: null,
      currentTarget: null,
    })
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

  test('routes through input, keyboard, pointer, wheel, drag and touch serializers', () => {
    class FakeDragEvent extends Event {
      altKey = true
      clientX = 10
      clientY = 20
      button = 0
      ctrlKey = false
      dataTransfer = null
      metaKey = true
      shiftKey = false
    }

    class FakePointerEvent extends Event {
      altKey = false
      clientX = 10
      clientY = 20
      button = 0
      ctrlKey = true
      height = 1
      isPrimary = true
      metaKey = false
      pointerId = 1
      pointerType = 'mouse'
      pressure = 0
      shiftKey = true
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
    expect(serializeMouseEvent(new MouseEvent('click', {
      clientX: 1,
      clientY: 2,
      altKey: true,
      ctrlKey: false,
      metaKey: true,
      shiftKey: true,
    }))).toMatchObject({
      clientX: 1,
      altKey: true,
      ctrlKey: false,
      metaKey: true,
      shiftKey: true,
    })
    expect(serializeWheelEvent(new WheelEvent('wheel', {
      deltaX: 1,
      deltaY: 2,
      deltaZ: 3,
      altKey: true,
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
    }))).toMatchObject({
      deltaY: 2,
      altKey: true,
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
    })
    expect(serializePointerEvent(new FakePointerEvent('pointerdown') as unknown as PointerEvent)).toMatchObject({
      pointerId: 1,
      altKey: false,
      ctrlKey: true,
      metaKey: false,
      shiftKey: true,
    })
    expect(serializeDragEvent(new FakeDragEvent('dragstart') as unknown as DragEvent)).toMatchObject({
      dataTransfer: null,
      altKey: true,
      ctrlKey: false,
      metaKey: true,
      shiftKey: false,
    })
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
})
