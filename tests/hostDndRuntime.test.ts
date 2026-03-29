import type { Ref } from 'vue'

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import { ref } from 'vue'

import {
  INTERNAL_DND_CONTAINER_PROP,
  INTERNAL_DND_HANDLE_PROP,
  INTERNAL_DND_ITEM_PROP,
} from '@/vue/dnd'
import { createHostDndRuntime } from '@/vue/host/dnd'

if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
  class FakePointerEvent extends MouseEvent {
    readonly isPrimary: boolean
    readonly pointerId: number
    readonly pointerType: string

    constructor (type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.isPrimary = init.isPrimary ?? true
      this.pointerId = init.pointerId ?? 1
      this.pointerType = init.pointerType ?? 'mouse'
    }
  }

  Object.defineProperty(window, 'PointerEvent', { value: FakePointerEvent })
  Object.defineProperty(globalThis, 'PointerEvent', { value: FakePointerEvent })
}

const pointer = (
  type: string,
  coordinates: { clientX: number; clientY: number },
  options: Partial<PointerEventInit> = {}
) => new PointerEvent(type, {
  bubbles: true,
  button: 0,
  clientX: coordinates.clientX,
  clientY: coordinates.clientY,
  composed: true,
  isPrimary: true,
  pointerId: 1,
  pointerType: 'mouse',
  ...options,
})

const keyboard = (key: string) => new KeyboardEvent('keydown', { bubbles: true, key })

const setRect = (
  element: Element,
  rect: { bottom: number; height: number; left: number; right: number; top: number; width: number; }
) => {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      ...rect,
      x: rect.left,
      y: rect.top,
      toJSON: () => rect,
    }),
  })
}

const bindNode = (
  runtime: ReturnType<typeof createHostDndRuntime>,
  nodeId: string,
  properties: Ref<Record<string, unknown> | undefined>,
  element: Element,
  {
    props = {},
    shape = 'el',
  }: {
    props?: Record<string, unknown>;
    shape?: 'el' | 'proxy' | 'subTree';
  } = {}
) => {
  const bound = runtime.bind(nodeId, properties, props) as Record<string, (payload: unknown) => void>
  const vnode = shape === 'subTree'
    ? { component: { subTree: { el: element } } }
    : shape === 'proxy'
      ? { component: { proxy: { $el: element } } }
      : { el: element }

  bound.onVnodeMounted(vnode)

  return {
    bound,
    update () {
      bound.onVnodeUpdated(vnode)
    },
    unmount () {
      bound.onVnodeUnmounted(vnode)
    },
  }
}

describe('hostDndRuntime', () => {
  let runtime: ReturnType<typeof createHostDndRuntime>
  let elementFromPoint: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    runtime = createHostDndRuntime()
    if (typeof document.elementFromPoint !== 'function') {
      Object.defineProperty(document, 'elementFromPoint', {
        configurable: true,
        value: () => null,
        writable: true,
      })
    }
    elementFromPoint = vi.spyOn(document as Document & {
      elementFromPoint: typeof document.elementFromPoint;
    }, 'elementFromPoint').mockReturnValue(null)
  })

  afterEach(() => {
    runtime.destroy()
    elementFromPoint?.mockRestore()
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  const testHook = () => {
    return (runtime as typeof runtime & {
      __unsafe: {
        createSortableEvent: (target: unknown) => unknown;
        disableTextSelection: () => void;
        onPointerMove: (event: PointerEvent) => void;
        onPointerUp: (event: PointerEvent) => void;
        resolveSourceItemNodeId: (handle: unknown, target: EventTarget | null) => string | null;
        resolveTarget: (pointer: { clientX: number; clientY: number }) => unknown;
        resolveVNodeElement: (vnode: unknown) => Element | null;
        setActive: (session: unknown) => void;
        setPending: (session: unknown) => void;
        targetEquals: (left: unknown, right: unknown) => boolean;
        updateStyles: () => void;
      };
    }).__unsafe
  }

  test('merges vnode hooks, resolves elements from different vnode shapes, and clears registrations on destroy', () => {
    const mounted = vi.fn()
    const updated = vi.fn()
    const unmounted = vi.fn()
    const container = document.createElement('section')
    const item = document.createElement('article')
    const handle = document.createElement('button')

    document.body.append(container, item)
    item.append(handle)

    const containerBinding = ref({
      [INTERNAL_DND_CONTAINER_PROP]: {
        containerId: 'tasks',
        orientation: 'vertical',
      },
    })
    const itemBinding = ref({
      [INTERNAL_DND_ITEM_PROP]: {
        containerId: 'tasks',
        index: 0,
        itemId: 'task-1',
        type: 'task',
      },
    })
    const handleBinding = ref<Record<string, unknown> | undefined>({
      [INTERNAL_DND_HANDLE_PROP]: {
        for: 'task-1',
      },
    })

    const mountedContainer = bindNode(runtime, 'container', containerBinding, container, {
      props: {
        onVnodeMounted: [mounted, null],
        onVnodeUpdated: updated,
        onVnodeUnmounted: unmounted,
      },
      shape: 'subTree',
    })
    const mountedItem = bindNode(runtime, 'item', itemBinding, item, {
      shape: 'proxy',
    })
    const mountedHandle = bindNode(runtime, 'handle', handleBinding, handle)

    expect(mounted).toHaveBeenCalledOnce()
    expect(container.getAttribute('data-dnd-sortable-container')).toBe('true')
    expect(item.getAttribute('data-dnd-sortable-item')).toBe('true')
    expect(handle.getAttribute('data-dnd-handle')).toBe('true')

    mountedContainer.update()
    expect(updated).toHaveBeenCalledOnce()

    handleBinding.value = {
      [INTERNAL_DND_HANDLE_PROP]: {
        for: 123,
      } as unknown as Record<string, unknown>,
    }
    mountedHandle.update()
    expect(handle.hasAttribute('data-dnd-handle')).toBe(false)

    mountedContainer.unmount()
    mountedItem.unmount()
    expect(unmounted).toHaveBeenCalledOnce()

    runtime.destroy()
    expect(container.hasAttribute('data-dnd-sortable-container')).toBe(false)
  })

  test('ignores invalid pointer starts and cleans pending sessions before drag activation', () => {
    const item = document.createElement('div')
    const handle = document.createElement('button')
    document.body.append(item)
    item.append(handle)

    const start = vi.fn()
    const end = vi.fn()
    const cancel = vi.fn()

    bindNode(runtime, 'item', ref({
      [INTERNAL_DND_ITEM_PROP]: {
        containerId: 'tasks',
        index: 0,
        itemId: 'task-1',
        onDragcancel: cancel,
        onDragend: end,
        onDragstart: start,
        type: 'task',
      },
    }), item)
    bindNode(runtime, 'handle', ref({
      [INTERNAL_DND_HANDLE_PROP]: {
        disabled: false,
      },
    }), handle)

    handle.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    handle.dispatchEvent(pointer('pointerdown', { clientX: 10, clientY: 10 }, { button: 1 }))
    document.dispatchEvent(pointer('pointerup', { clientX: 10, clientY: 10 }))
    expect(start).not.toHaveBeenCalled()

    handle.dispatchEvent(pointer('pointerdown', { clientX: 10, clientY: 10 }))
    document.dispatchEvent(pointer('pointercancel', { clientX: 10, clientY: 10 }))
    expect(cancel).not.toHaveBeenCalled()

    runtime.destroy()

    const disabledRuntime = createHostDndRuntime()
    const disabledItem = document.createElement('div')
    const disabledHandle = document.createElement('button')
    document.body.append(disabledItem)
    disabledItem.append(disabledHandle)

    bindNode(disabledRuntime, 'disabled-item', ref({
      [INTERNAL_DND_ITEM_PROP]: {
        containerId: 'tasks',
        disabled: true,
        index: 0,
        itemId: 'task-disabled',
        onDragstart: start,
        type: 'task',
      },
    }), disabledItem)
    bindNode(disabledRuntime, 'disabled-handle', ref({
      [INTERNAL_DND_HANDLE_PROP]: {
        disabled: true,
      },
    }), disabledHandle)

    disabledHandle.dispatchEvent(pointer('pointerdown', { clientX: 10, clientY: 10 }))
    document.dispatchEvent(pointer('pointermove', { clientX: 30, clientY: 30 }))

    expect(start).not.toHaveBeenCalled()
    disabledRuntime.destroy()
  })

  test('handles forbidden, inside, before, horizontal and cancel flows through runtime events', () => {
    const activeContainer = document.createElement('div')
    const doneContainer = document.createElement('div')
    const rejectContainer = document.createElement('div')
    const horizontalContainer = document.createElement('div')
    const taskA = document.createElement('div')
    const taskB = document.createElement('div')
    const taskAHandle = document.createElement('button')
    const taskBHandle = document.createElement('button')
    const laneA = document.createElement('div')
    const laneB = document.createElement('div')
    const laneAHandle = document.createElement('button')
    const laneBHandle = document.createElement('button')

    document.body.append(activeContainer, doneContainer, rejectContainer, horizontalContainer)
    activeContainer.append(taskA, taskB)
    taskA.append(taskAHandle)
    taskB.append(taskBHandle)
    horizontalContainer.append(laneA, laneB)
    laneA.append(laneAHandle)
    laneB.append(laneBHandle)

    setRect(taskA, { bottom: 40, height: 40, left: 0, right: 100, top: 0, width: 100 })
    setRect(taskB, { bottom: 90, height: 40, left: 0, right: 100, top: 50, width: 100 })
    setRect(laneA, { bottom: 40, height: 40, left: 0, right: 80, top: 0, width: 80 })
    setRect(laneB, { bottom: 40, height: 40, left: 90, right: 170, top: 0, width: 80 })

    const activeEnter = vi.fn()
    const activeLeave = vi.fn()
    const activeMove = vi.fn()
    const doneDrop = vi.fn()
    const doneEnter = vi.fn()
    const doneLeave = vi.fn()
    const doneMove = vi.fn()
    const taskStart = vi.fn()
    const taskEnd = vi.fn()
    const taskCancel = vi.fn()
    const horizontalDrop = vi.fn()
    const horizontalStart = vi.fn()
    const horizontalEnd = vi.fn()

    bindNode(runtime, 'active-container', ref({
      [INTERNAL_DND_CONTAINER_PROP]: {
        accepts: ['task'],
        containerId: 'active',
        onDragenter: activeEnter,
        onDragleave: activeLeave,
        onDragmove: activeMove,
        orientation: 'vertical',
      },
    }), activeContainer)
    bindNode(runtime, 'done-container', ref({
      [INTERNAL_DND_CONTAINER_PROP]: {
        accepts: ['task'],
        containerId: 'done',
        onDragenter: doneEnter,
        onDragleave: doneLeave,
        onDragmove: doneMove,
        onDrop: doneDrop,
        orientation: 'vertical',
      },
    }), doneContainer)
    bindNode(runtime, 'reject-container', ref({
      [INTERNAL_DND_CONTAINER_PROP]: {
        accepts: ['note'],
        containerId: 'reject',
        orientation: 'vertical',
      },
    }), rejectContainer)
    bindNode(runtime, 'task-a', ref({
      [INTERNAL_DND_ITEM_PROP]: {
        containerId: 'active',
        index: 0,
        itemId: 'task-a',
        onDragcancel: taskCancel,
        onDragend: taskEnd,
        onDragstart: taskStart,
        type: 'task',
      },
    }), taskA)
    bindNode(runtime, 'task-b', ref({
      [INTERNAL_DND_ITEM_PROP]: {
        containerId: 'active',
        index: 1,
        itemId: 'task-b',
        onDragcancel: taskCancel,
        type: 'task',
      },
    }), taskB)
    bindNode(runtime, 'task-a-handle', ref({
      [INTERNAL_DND_HANDLE_PROP]: {
        for: 'task-a',
      },
    }), taskAHandle)
    bindNode(runtime, 'task-b-handle', ref({
      [INTERNAL_DND_HANDLE_PROP]: {},
    }), taskBHandle)

    bindNode(runtime, 'horizontal-container', ref({
      [INTERNAL_DND_CONTAINER_PROP]: {
        accepts: ['lane'],
        containerId: 'horizontal',
        onDrop: horizontalDrop,
        orientation: 'horizontal',
      },
    }), horizontalContainer)
    bindNode(runtime, 'lane-a', ref({
      [INTERNAL_DND_ITEM_PROP]: {
        containerId: 'horizontal',
        index: 0,
        itemId: 'lane-a',
        type: 'lane',
      },
    }), laneA)
    bindNode(runtime, 'lane-b', ref({
      [INTERNAL_DND_ITEM_PROP]: {
        containerId: 'horizontal',
        index: 1,
        itemId: 'lane-b',
        onDragend: horizontalEnd,
        onDragstart: horizontalStart,
        type: 'lane',
      },
    }), laneB)
    bindNode(runtime, 'lane-a-handle', ref({
      [INTERNAL_DND_HANDLE_PROP]: {
        for: 'lane-a',
      },
    }), laneAHandle)
    bindNode(runtime, 'lane-b-handle', ref({
      [INTERNAL_DND_HANDLE_PROP]: {},
    }), laneBHandle)

    elementFromPoint.mockReturnValue(rejectContainer)
    taskBHandle.dispatchEvent(pointer('pointerdown', { clientX: 10, clientY: 60 }))
    document.dispatchEvent(pointer('pointermove', { clientX: 20, clientY: 70 }))
    document.dispatchEvent(pointer('pointermove', { clientX: 150, clientY: 10 }))

    expect(rejectContainer.getAttribute('data-dnd-drop-forbidden')).toBe('true')

    document.dispatchEvent(pointer('pointerup', { clientX: 150, clientY: 10 }))
    expect(taskEnd).not.toHaveBeenCalled()
    expect(doneDrop).not.toHaveBeenCalled()

    elementFromPoint.mockReturnValue(doneContainer)
    taskAHandle.dispatchEvent(pointer('pointerdown', { clientX: 10, clientY: 10 }, { pointerId: 2 }))
    document.dispatchEvent(pointer('pointermove', { clientX: 20, clientY: 20 }, { pointerId: 2 }))
    document.dispatchEvent(pointer('pointermove', { clientX: 200, clientY: 20 }, { pointerId: 2 }))
    expect(doneContainer.getAttribute('data-dnd-placement')).toBe('inside')
    document.dispatchEvent(pointer('pointerup', { clientX: 200, clientY: 20 }, { pointerId: 2 }))

    expect(doneDrop).toHaveBeenCalledWith(expect.objectContaining({
      placement: 'inside',
      targetContainerId: 'done',
      targetIndex: 0,
      targetItemId: null,
    }))
    expect(taskStart).toHaveBeenCalled()
    expect(taskEnd).toHaveBeenCalled()
    expect(doneEnter).toHaveBeenCalled()
    expect(doneMove).toHaveBeenCalled()

    elementFromPoint.mockReturnValue(laneA)
    laneBHandle.dispatchEvent(pointer('pointerdown', { clientX: 120, clientY: 20 }, { pointerId: 3 }))
    document.dispatchEvent(pointer('pointermove', { clientX: 100, clientY: 20 }, { pointerId: 3 }))
    document.dispatchEvent(pointer('pointermove', { clientX: 10, clientY: 20 }, { pointerId: 3 }))
    document.dispatchEvent(pointer('pointerup', { clientX: 10, clientY: 20 }, { pointerId: 3 }))

    expect(horizontalDrop).toHaveBeenCalledWith(expect.objectContaining({
      itemId: 'lane-b',
      placement: 'before',
      targetItemId: 'lane-a',
    }))
    expect(horizontalStart).toHaveBeenCalled()
    expect(horizontalEnd).toHaveBeenCalled()

    elementFromPoint.mockReturnValue(taskB)
    taskBHandle.dispatchEvent(pointer('pointerdown', { clientX: 10, clientY: 60 }, { pointerId: 4 }))
    document.dispatchEvent(pointer('pointermove', { clientX: 30, clientY: 70 }, { pointerId: 4 }))
    window.dispatchEvent(keyboard('Escape'))
    expect(taskCancel).toHaveBeenCalled()

    elementFromPoint.mockReturnValue(taskB)
    taskBHandle.dispatchEvent(pointer('pointerdown', { clientX: 10, clientY: 60 }, { pointerId: 5 }))
    document.dispatchEvent(pointer('pointermove', { clientX: 30, clientY: 70 }, { pointerId: 5 }))
    document.dispatchEvent(pointer('pointercancel', { clientX: 30, clientY: 70 }, { pointerId: 5 }))
    expect(taskCancel).toHaveBeenCalledTimes(2)
  })

  test('invokes array-shaped dnd listeners for item and container bindings', () => {
    const doneContainer = document.createElement('div')
    const task = document.createElement('div')
    const handle = document.createElement('button')

    document.body.append(doneContainer)
    doneContainer.append(task)
    task.append(handle)

    const dragStartFirst = vi.fn()
    const dragStartSecond = vi.fn()
    const dropFirst = vi.fn()
    const dropSecond = vi.fn()

    bindNode(runtime, 'done-container', ref({
      [INTERNAL_DND_CONTAINER_PROP]: {
        accepts: ['task'],
        containerId: 'done',
        onDrop: [
          dropFirst,
          ['noop', dropSecond],
        ],
        orientation: 'vertical',
      },
    }), doneContainer)
    bindNode(runtime, 'task', ref({
      [INTERNAL_DND_ITEM_PROP]: {
        containerId: 'done',
        index: 0,
        itemId: 'task-1',
        onDragstart: [
          dragStartFirst,
          [null, dragStartSecond],
        ],
        type: 'task',
      },
    }), task)
    bindNode(runtime, 'handle', ref({
      [INTERNAL_DND_HANDLE_PROP]: {
        for: 'task-1',
      },
    }), handle)

    setRect(task, { bottom: 40, height: 40, left: 0, right: 100, top: 0, width: 100 })
    elementFromPoint.mockReturnValue(doneContainer)

    handle.dispatchEvent(pointer('pointerdown', { clientX: 10, clientY: 10 }, { pointerId: 21 }))
    document.dispatchEvent(pointer('pointermove', { clientX: 30, clientY: 30 }, { pointerId: 21 }))
    document.dispatchEvent(pointer('pointerup', { clientX: 30, clientY: 30 }, { pointerId: 21 }))

    expect(dragStartFirst).toHaveBeenCalledTimes(1)
    expect(dragStartSecond).toHaveBeenCalledTimes(1)
    expect(dropFirst).toHaveBeenCalledTimes(1)
    expect(dropSecond).toHaveBeenCalledTimes(1)

    expect(dragStartFirst).toHaveBeenCalledWith(expect.objectContaining({
      itemId: 'task-1',
      sourceContainerId: 'done',
    }))
    expect(dropFirst).toHaveBeenCalledWith(expect.objectContaining({
      itemId: 'task-1',
      targetContainerId: 'done',
    }))
  })

  test('renders built-in drag overlay and placeholder without sandbox-specific host logic', () => {
    const sourceContainer = document.createElement('div')
    const targetContainer = document.createElement('div')
    const sourceItem = document.createElement('article')
    const sourceHandle = document.createElement('button')
    const emptyState = document.createElement('div')

    document.body.append(sourceContainer, targetContainer)
    sourceContainer.append(sourceItem)
    sourceItem.append(sourceHandle)
    targetContainer.append(emptyState)

    setRect(sourceItem, { bottom: 60, height: 40, left: 10, right: 110, top: 20, width: 100 })

    bindNode(runtime, 'source-container', ref({
      [INTERNAL_DND_CONTAINER_PROP]: {
        containerId: 'source',
        orientation: 'vertical',
      },
    }), sourceContainer)
    bindNode(runtime, 'target-container', ref({
      [INTERNAL_DND_CONTAINER_PROP]: {
        containerId: 'target',
        orientation: 'vertical',
      },
    }), targetContainer)
    bindNode(runtime, 'source-item', ref({
      [INTERNAL_DND_ITEM_PROP]: {
        containerId: 'source',
        index: 0,
        itemId: 'task-1',
        type: 'task',
      },
    }), sourceItem)
    bindNode(runtime, 'source-handle', ref({
      [INTERNAL_DND_HANDLE_PROP]: {
        for: 'task-1',
      },
    }), sourceHandle)

    elementFromPoint.mockReturnValue(targetContainer)

    sourceHandle.dispatchEvent(pointer('pointerdown', { clientX: 35, clientY: 35 }, { pointerId: 12 }))
    document.dispatchEvent(pointer('pointermove', { clientX: 50, clientY: 55 }, { pointerId: 12 }))

    const overlay = document.querySelector('[data-dnd-overlay="true"]')
    expect(overlay).toBeInstanceOf(HTMLElement)
    expect(overlay instanceof HTMLElement && overlay.hidden).toBe(false)
    expect(overlay?.firstElementChild).not.toBeNull()
    expect(targetContainer.querySelector('[data-dnd-placeholder="true"]')).toBeNull()
    expect(targetContainer.firstElementChild).toBe(emptyState)

    document.dispatchEvent(pointer('pointerup', { clientX: 50, clientY: 55 }, { pointerId: 12 }))

    expect(overlay instanceof HTMLElement && overlay.hidden).toBe(true)
    expect(targetContainer.querySelector('[data-dnd-placeholder="true"]')).toBeNull()
  })

  test('uses a dedicated overlay presentation adapter for table rows', () => {
    const table = document.createElement('table')
    const tbody = document.createElement('tbody')
    const row = document.createElement('tr')
    const handleCell = document.createElement('td')
    const labelCell = document.createElement('td')
    const handle = document.createElement('button')
    const targetRow = document.createElement('tr')
    const targetCell = document.createElement('td')

    document.body.append(table)
    table.append(tbody)
    tbody.append(row, targetRow)
    row.append(handleCell, labelCell)
    handleCell.append(handle)
    labelCell.textContent = 'Task'
    targetRow.append(targetCell)
    targetCell.textContent = 'Target'

    setRect(row, { bottom: 56, height: 36, left: 10, right: 230, top: 20, width: 220 })
    setRect(handleCell, { bottom: 56, height: 36, left: 10, right: 70, top: 20, width: 60 })
    setRect(labelCell, { bottom: 56, height: 36, left: 70, right: 230, top: 20, width: 160 })
    setRect(targetRow, { bottom: 96, height: 36, left: 10, right: 230, top: 60, width: 220 })

    bindNode(runtime, 'container', ref({
      [INTERNAL_DND_CONTAINER_PROP]: {
        containerId: 'rows',
        orientation: 'vertical',
      },
    }), tbody)
    bindNode(runtime, 'row', ref({
      [INTERNAL_DND_ITEM_PROP]: {
        containerId: 'rows',
        index: 0,
        itemId: 'row-1',
        type: 'row',
      },
    }), row)
    bindNode(runtime, 'target-row', ref({
      [INTERNAL_DND_ITEM_PROP]: {
        containerId: 'rows',
        index: 1,
        itemId: 'row-2',
        type: 'row',
      },
    }), targetRow)
    bindNode(runtime, 'handle', ref({
      [INTERNAL_DND_HANDLE_PROP]: {
        for: 'row-1',
      },
    }), handle)

    elementFromPoint.mockReturnValue(targetRow)

    handle.dispatchEvent(pointer('pointerdown', { clientX: 30, clientY: 38 }, { pointerId: 14 }))
    document.dispatchEvent(pointer('pointermove', { clientX: 36, clientY: 82 }, { pointerId: 14 }))

    const overlay = document.querySelector('[data-dnd-overlay="true"]')
    const overlayTable = overlay?.firstElementChild
    const overlayRow = overlay?.querySelector('tr')
    const overlayCells = overlay?.querySelectorAll('td')

    expect(overlayTable?.tagName).toBe('TABLE')
    expect(overlay?.querySelector('tbody')).not.toBeNull()
    expect(overlayRow?.tagName).toBe('TR')
    expect(overlayCells).toHaveLength(2)
    expect((overlayCells?.[0] as HTMLElement | undefined)?.style.width).toBe('60px')
    expect((overlayCells?.[1] as HTMLElement | undefined)?.style.width).toBe('160px')

    document.dispatchEvent(pointer('pointerup', { clientX: 36, clientY: 82 }, { pointerId: 14 }))
  })

  test('collapses the source slot while reordering inside the same container', () => {
    const container = document.createElement('div')
    const sourceItem = document.createElement('article')
    const sourceHandle = document.createElement('button')
    const targetItem = document.createElement('article')

    document.body.append(container)
    container.append(sourceItem, targetItem)
    sourceItem.append(sourceHandle)
    sourceItem.style.display = 'grid'

    setRect(sourceItem, { bottom: 60, height: 40, left: 10, right: 110, top: 20, width: 100 })
    setRect(targetItem, { bottom: 110, height: 40, left: 10, right: 110, top: 70, width: 100 })

    bindNode(runtime, 'container', ref({
      [INTERNAL_DND_CONTAINER_PROP]: {
        containerId: 'tasks',
        orientation: 'vertical',
      },
    }), container)
    bindNode(runtime, 'source-item', ref({
      [INTERNAL_DND_ITEM_PROP]: {
        containerId: 'tasks',
        index: 0,
        itemId: 'task-1',
        type: 'task',
      },
    }), sourceItem)
    bindNode(runtime, 'target-item', ref({
      [INTERNAL_DND_ITEM_PROP]: {
        containerId: 'tasks',
        index: 1,
        itemId: 'task-2',
        type: 'task',
      },
    }), targetItem)
    bindNode(runtime, 'source-handle', ref({
      [INTERNAL_DND_HANDLE_PROP]: {
        for: 'task-1',
      },
    }), sourceHandle)

    elementFromPoint.mockReturnValue(targetItem)

    sourceHandle.dispatchEvent(pointer('pointerdown', { clientX: 35, clientY: 35 }, { pointerId: 13 }))
    document.dispatchEvent(pointer('pointermove', { clientX: 40, clientY: 100 }, { pointerId: 13 }))

    const placeholder = container.querySelector('[data-dnd-placeholder="true"]')

    expect(placeholder).toBeInstanceOf(Element)
    expect(sourceItem.style.display).toBe('none')

    document.dispatchEvent(pointer('pointerup', { clientX: 40, clientY: 100 }, { pointerId: 13 }))

    expect(container.querySelector('[data-dnd-placeholder="true"]')).toBeNull()
    expect(sourceItem.style.display).toBe('grid')
  })

  test('collapses and restores an explicit display value for inside placement in the same container', () => {
    const container = document.createElement('div')
    const sourceItem = document.createElement('article')

    document.body.append(container)
    container.append(sourceItem)
    sourceItem.style.display = 'grid'

    bindNode(runtime, 'container', ref({
      [INTERNAL_DND_CONTAINER_PROP]: {
        containerId: 'tasks',
        orientation: 'vertical',
      },
    }), container)
    bindNode(runtime, 'source-item', ref({
      [INTERNAL_DND_ITEM_PROP]: {
        containerId: 'tasks',
        index: 0,
        itemId: 'task-1',
        type: 'task',
      },
    }), sourceItem)

    const hook = testHook()

    hook.setActive({
      dragMetrics: {
        anchorX: 10,
        anchorY: 10,
        height: 40,
        width: 100,
      },
      pointer: {
        clientX: 20,
        clientY: 20,
      },
      pointerId: 21,
      sessionId: 'session-same-container',
      sourceHandleNodeId: 'missing-handle',
      sourceItemNodeId: 'source-item',
      start: {
        clientX: 20,
        clientY: 20,
      },
      target: {
        accepted: true,
        containerNodeId: 'container',
        itemNodeId: null,
        placement: 'inside',
        targetIndex: 1,
      },
    })

    hook.updateStyles()

    expect(sourceItem.style.display).toBe('none')
    expect(container.querySelector('[data-dnd-placeholder="true"]')).toBeInstanceOf(Element)

    hook.setActive(null)
    hook.updateStyles()

    expect(container.querySelector('[data-dnd-placeholder="true"]')).toBeNull()
    expect(sourceItem.style.display).toBe('grid')
  })

  test('handles non-html sources and defensive style-sync branches', () => {
    const svgNamespace = 'http://www.w3.org/2000/svg'
    const svgContainer = document.createElement('div')
    const svgSource = document.createElementNS(svgNamespace, 'svg')
    const svgHandle = document.createElementNS(svgNamespace, 'rect')
    const fallbackTarget = document.createElement('div')
    const htmlContainer = document.createElement('div')
    const htmlSource = document.createElement('article')

    document.body.append(svgContainer, htmlContainer)
    svgContainer.append(svgSource, fallbackTarget)
    svgSource.append(svgHandle)
    htmlContainer.append(htmlSource)

    setRect(svgSource, { bottom: 60, height: 40, left: 10, right: 110, top: 20, width: 100 })
    setRect(fallbackTarget, { bottom: 110, height: 40, left: 10, right: 110, top: 70, width: 100 })
    setRect(htmlSource, { bottom: 60, height: 40, left: 200, right: 300, top: 20, width: 100 })

    bindNode(runtime, 'svg-container', ref({
      [INTERNAL_DND_CONTAINER_PROP]: {
        containerId: 'vector',
        orientation: 'vertical',
      },
    }), svgContainer)
    bindNode(runtime, 'svg-source', ref({
      [INTERNAL_DND_ITEM_PROP]: {
        containerId: 'vector',
        index: 0,
        itemId: 'vector-1',
        type: 'vector',
      },
    }), svgSource)
    bindNode(runtime, 'svg-handle', ref({
      [INTERNAL_DND_HANDLE_PROP]: {
        for: 'vector-1',
      },
    }), svgHandle)
    bindNode(runtime, 'fallback-target', ref({
      [INTERNAL_DND_ITEM_PROP]: {
        containerId: 'vector',
        index: 1,
        itemId: 'vector-2',
        type: 'vector',
      },
    }), fallbackTarget)
    bindNode(runtime, 'html-container', ref({
      [INTERNAL_DND_CONTAINER_PROP]: {
        containerId: 'html',
        orientation: 'vertical',
      },
    }), htmlContainer)
    bindNode(runtime, 'html-source', ref({
      [INTERNAL_DND_ITEM_PROP]: {
        containerId: 'html',
        index: 0,
        itemId: 'html-1',
        type: 'html',
      },
    }), htmlSource)

    elementFromPoint.mockReturnValue(fallbackTarget)

    svgHandle.dispatchEvent(pointer('pointerdown', { clientX: 35, clientY: 35 }, { pointerId: 22 }))
    document.dispatchEvent(pointer('pointermove', { clientX: 40, clientY: 100 }, { pointerId: 22 }))

    const overlay = document.querySelector('[data-dnd-overlay="true"]')
    expect(overlay).toBeInstanceOf(HTMLElement)
    expect(overlay instanceof HTMLElement && overlay.hidden).toBe(false)
    expect(svgSource.style.display).toBe('')

    document.dispatchEvent(pointer('pointerup', { clientX: 40, clientY: 100 }, { pointerId: 22 }))

    const hook = testHook()

    hook.setActive({
      dragMetrics: {
        anchorX: 10,
        anchorY: 10,
        height: 40,
        width: 100,
      },
      pointer: {
        clientX: 220,
        clientY: 30,
      },
      pointerId: 23,
      sessionId: 'missing-container',
      sourceHandleNodeId: 'missing-handle',
      sourceItemNodeId: 'html-source',
      start: {
        clientX: 220,
        clientY: 30,
      },
      target: {
        accepted: true,
        containerNodeId: 'missing-container',
        itemNodeId: null,
        placement: 'inside',
        targetIndex: 0,
      },
    })
    hook.updateStyles()

    hook.setActive({
      dragMetrics: {
        anchorX: 10,
        anchorY: 10,
        height: 40,
        width: 100,
      },
      pointer: {
        clientX: 220,
        clientY: 30,
      },
      pointerId: 24,
      sessionId: 'missing-source',
      sourceHandleNodeId: 'missing-handle',
      sourceItemNodeId: 'missing-source',
      start: {
        clientX: 220,
        clientY: 30,
      },
      target: null,
    })
    hook.updateStyles()

    hook.setActive(null)
    hook.updateStyles()
  })

  test('cancels active or pending drags when registered nodes are unmounted', () => {
    const container = document.createElement('div')
    const item = document.createElement('div')
    const handle = document.createElement('button')
    const secondHandle = document.createElement('button')
    document.body.append(container)
    container.append(item)
    item.append(handle, secondHandle)

    const cancel = vi.fn()

    bindNode(runtime, 'container', ref({
      [INTERNAL_DND_CONTAINER_PROP]: {
        containerId: 'tasks',
        orientation: 'vertical',
      },
    }), container)
    const mountedItem = bindNode(runtime, 'item', ref({
      [INTERNAL_DND_ITEM_PROP]: {
        containerId: 'tasks',
        index: 0,
        itemId: 'task-1',
        onDragcancel: cancel,
        type: 'task',
      },
    }), item)
    const mountedHandle = bindNode(runtime, 'handle', ref({
      [INTERNAL_DND_HANDLE_PROP]: {
        for: 'task-1',
      },
    }), handle)

    elementFromPoint.mockReturnValue(item)
    handle.dispatchEvent(pointer('pointerdown', { clientX: 10, clientY: 10 }, { pointerId: 6 }))
    mountedHandle.unmount()

    bindNode(runtime, 'second-handle', ref({
      [INTERNAL_DND_HANDLE_PROP]: {
        for: 'task-1',
      },
    }), secondHandle)

    secondHandle.dispatchEvent(pointer('pointerdown', { clientX: 10, clientY: 10 }, { pointerId: 7 }))
    document.dispatchEvent(pointer('pointermove', { clientX: 30, clientY: 30 }, { pointerId: 7 }))
    mountedItem.unmount()
  })

  test('covers null targets, mismatched pointer ids, and missing source guards', () => {
    const container = document.createElement('div')
    const item = document.createElement('div')
    const handle = document.createElement('button')
    const orphanHandle = document.createElement('button')
    document.body.append(container, orphanHandle)
    container.append(item)
    item.append(handle)

    const dragEnd = vi.fn()
    const dragStart = vi.fn()

    bindNode(runtime, 'container', ref({
      [INTERNAL_DND_CONTAINER_PROP]: {
        containerId: 'tasks',
        orientation: 'vertical',
      },
    }), container)
    bindNode(runtime, 'item', ref({
      [INTERNAL_DND_ITEM_PROP]: {
        containerId: 'tasks',
        index: 0,
        itemId: 'task-1',
        onDragend: dragEnd,
        onDragstart: dragStart,
        type: 'task',
      },
    }), item)
    bindNode(runtime, 'handle', ref({
      [INTERNAL_DND_HANDLE_PROP]: {},
    }), handle)
    bindNode(runtime, 'orphan-handle', ref({
      [INTERNAL_DND_HANDLE_PROP]: {},
    }), orphanHandle)

    elementFromPoint.mockReturnValue(null)

    orphanHandle.dispatchEvent(pointer('pointerdown', { clientX: 5, clientY: 5 }, { pointerId: 10 }))
    document.dispatchEvent(pointer('pointermove', { clientX: 20, clientY: 20 }, { pointerId: 10 }))

    handle.dispatchEvent(pointer('pointerdown', { clientX: 10, clientY: 10 }, { pointerId: 11 }))
    document.dispatchEvent(pointer('pointermove', { clientX: 30, clientY: 30 }, { pointerId: 99 }))
    document.dispatchEvent(pointer('pointermove', { clientX: 10, clientY: 10 }, { pointerId: 11 }))
    document.dispatchEvent(pointer('pointermove', { clientX: 30, clientY: 30 }, {
      cancelable: false,
      pointerId: 11,
    }))
    document.dispatchEvent(pointer('pointermove', { clientX: 31, clientY: 31 }, { pointerId: 11 }))
    document.dispatchEvent(pointer('pointerup', { clientX: 31, clientY: 31 }, { pointerId: 100 }))
    window.dispatchEvent(keyboard('Enter'))
    document.dispatchEvent(pointer('pointerup', { clientX: 31, clientY: 31 }, { pointerId: 11 }))
    document.dispatchEvent(pointer('pointerup', { clientX: 31, clientY: 31 }, { pointerId: 11 }))
    document.dispatchEvent(pointer('pointercancel', { clientX: 31, clientY: 31 }, { pointerId: 100 }))

    expect(dragStart).toHaveBeenCalledOnce()
    expect(dragEnd).toHaveBeenCalledOnce()
    expect(item.hasAttribute('data-dnd-dragging')).toBe(false)
  })

  test('covers pending cleanup, disabled targets, undefined props and session fallbacks', () => {
    const originalCrypto = globalThis.crypto
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { randomUUID: undefined },
    })

    const container = document.createElement('div')
    const disabledContainer = document.createElement('div')
    const item = document.createElement('div')
    const handle = document.createElement('button')

    document.body.append(container, disabledContainer)
    container.append(item)
    item.append(handle)

    setRect(item, { bottom: 40, height: 40, left: 0, right: 100, top: 0, width: 100 })

    const nullProps = runtime.bind('null-props', ref(undefined), undefined)
    expect(nullProps).toMatchObject({
      onVnodeMounted: expect.any(Function),
      onVnodeUnmounted: expect.any(Function),
      onVnodeUpdated: expect.any(Function),
    })
    bindNode(runtime, 'container', ref({
      [INTERNAL_DND_CONTAINER_PROP]: {
        containerId: 'tasks',
        orientation: 'vertical',
      },
    }), container)
    bindNode(runtime, 'disabled-container', ref({
      [INTERNAL_DND_CONTAINER_PROP]: {
        containerId: 'disabled',
        disabled: true,
        orientation: 'vertical',
      },
    }), disabledContainer)
    const itemBinding = ref<Record<string, unknown> | undefined>({
      [INTERNAL_DND_ITEM_PROP]: {
        containerId: 'tasks',
        index: 0,
        itemId: 'task-1',
        type: 'task',
      },
    })
    bindNode(runtime, 'item', itemBinding, item)
    bindNode(runtime, 'handle', ref({
      [INTERNAL_DND_HANDLE_PROP]: {
        for: 'task-1',
      },
    }), handle)

    elementFromPoint.mockReturnValue(null)

    handle.dispatchEvent(pointer('pointerdown', { clientX: 10, clientY: 10 }, { pointerId: 20 }))
    handle.dispatchEvent(pointer('pointerdown', { clientX: 11, clientY: 11 }, { pointerId: 21 }))
    document.dispatchEvent(pointer('pointerup', { clientX: 11, clientY: 11 }, { pointerId: 21 }))
    document.dispatchEvent(pointer('pointerup', { clientX: 11, clientY: 11 }, { pointerId: 21 }))
    window.dispatchEvent(keyboard('Tab'))

    handle.dispatchEvent(pointer('pointerdown', { clientX: 10, clientY: 10 }, { pointerId: 22 }))
    itemBinding.value = undefined
    document.dispatchEvent(pointer('pointermove', { clientX: 30, clientY: 30 }, { pointerId: 22 }))

    itemBinding.value = {
      [INTERNAL_DND_ITEM_PROP]: {
        containerId: 'tasks',
        index: 0,
        itemId: 'task-1',
        type: 'task',
      },
    }
    bindNode(runtime, 'item-restored', itemBinding, item)

    handle.dispatchEvent(pointer('pointerdown', { clientX: 10, clientY: 10 }, { pointerId: 23 }))
    document.dispatchEvent(pointer('pointermove', { clientX: 30, clientY: 30 }, { pointerId: 23, cancelable: true }))
    elementFromPoint.mockReturnValue(disabledContainer)
    document.dispatchEvent(pointer('pointermove', { clientX: 35, clientY: 35 }, { pointerId: 23, cancelable: true }))
    document.dispatchEvent(pointer('pointerup', { clientX: 35, clientY: 35 }, { pointerId: 999 }))
    document.dispatchEvent(pointer('pointerup', { clientX: 35, clientY: 35 }, { pointerId: 23 }))
    document.dispatchEvent(pointer('pointercancel', { clientX: 35, clientY: 35 }, { pointerId: 999 }))

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: originalCrypto,
    })
  })

  test('covers remaining defensive internals through the runtime test hook', () => {
    const container = document.createElement('div')
    const disabledContainer = document.createElement('div')
    const item = document.createElement('div')
    const handle = document.createElement('button')
    document.body.append(container, disabledContainer)
    container.append(item)
    item.append(handle)

    bindNode(runtime, 'container', ref({
      [INTERNAL_DND_CONTAINER_PROP]: {
        containerId: 'tasks',
        orientation: 'vertical',
      },
    }), container)
    bindNode(runtime, 'disabled-container', ref({
      [INTERNAL_DND_CONTAINER_PROP]: {
        containerId: 'disabled',
        disabled: true,
        orientation: 'vertical',
      },
    }), disabledContainer)
    bindNode(runtime, 'item', ref({
      [INTERNAL_DND_ITEM_PROP]: {
        containerId: 'tasks',
        index: 0,
        itemId: 'task-1',
        type: 'task',
      },
    }), item)

    const unsafe = testHook()

    expect(unsafe.resolveVNodeElement({})).toBeNull()
    expect(unsafe.targetEquals(null, {
      accepted: true,
      containerNodeId: 'container',
      itemNodeId: null,
      placement: 'inside',
      targetIndex: 0,
    })).toBe(false)

    unsafe.disableTextSelection()
    unsafe.disableTextSelection()

    unsafe.setActive({
      pointerId: 1,
      sessionId: 'session',
      sourceHandleNodeId: 'handle',
      sourceItemNodeId: 'missing',
      start: { clientX: 0, clientY: 0 },
      target: null,
    })
    unsafe.updateStyles()
    expect(unsafe.resolveTarget({ clientX: 10, clientY: 10 })).toBeNull()
    expect(unsafe.resolveSourceItemNodeId({
      handle: {},
      nodeId: 'handle',
    }, null)).toBeNull()
    expect(unsafe.resolveSourceItemNodeId({
      handle: {
        for: 'missing-item',
      },
      nodeId: 'handle',
    }, item)).toBeNull()

    unsafe.setActive({
      pointerId: 2,
      sessionId: 'session',
      sourceHandleNodeId: 'handle',
      sourceItemNodeId: 'item',
      start: { clientX: 0, clientY: 0 },
      target: {
        accepted: true,
        containerNodeId: 'container',
        itemNodeId: 'missing-target',
        placement: 'inside',
        targetIndex: 0,
      },
    })
    unsafe.updateStyles()

    unsafe.setActive({
      pointerId: 3,
      sessionId: 'session',
      sourceHandleNodeId: 'handle',
      sourceItemNodeId: 'item',
      start: { clientX: 0, clientY: 0 },
      target: null,
    })
    unsafe.setPending({
      pointerId: 3,
      sourceHandleNodeId: 'handle',
      sourceItemNodeId: 'item',
    })
    expect(unsafe.createSortableEvent(null)).toBeNull()

    unsafe.setActive(null)
    unsafe.setPending({
      pointerId: 4,
      sourceHandleNodeId: 'handle',
      sourceItemNodeId: 'item',
      start: { clientX: 10, clientY: 10 },
    })
    expect(unsafe.createSortableEvent(null)).toMatchObject({
      accepted: false,
      sessionId: '',
      targetContainerId: null,
    })

    unsafe.setPending({
      pointerId: 5,
      sourceHandleNodeId: 'handle',
      sourceItemNodeId: 'missing',
      start: { clientX: 10, clientY: 10 },
    })
    unsafe.onPointerMove(pointer('pointermove', { clientX: 30, clientY: 30 }, { pointerId: 5 }))

    unsafe.setActive(null)
    unsafe.setPending(null)
    unsafe.onPointerMove(pointer('pointermove', { clientX: 30, clientY: 30 }))

    unsafe.setActive({
      pointer: { clientX: 30, clientY: 30 },
      pointerId: 6,
      sessionId: 'session',
      sourceHandleNodeId: 'handle',
      sourceItemNodeId: 'item',
      start: { clientX: 10, clientY: 10 },
      target: null,
    })
    elementFromPoint.mockReturnValue(disabledContainer)
    const move = pointer('pointermove', { clientX: 35, clientY: 35 }, { pointerId: 6, cancelable: true })
    const preventDefault = vi.fn()
    move.preventDefault = preventDefault
    unsafe.onPointerMove(move)
    expect(preventDefault).toHaveBeenCalled()

    unsafe.setActive({
      pointer: { clientX: 30, clientY: 30 },
      pointerId: 7,
      sessionId: 'session',
      sourceHandleNodeId: 'handle',
      sourceItemNodeId: 'item',
      start: { clientX: 10, clientY: 10 },
      target: {
        accepted: true,
        containerNodeId: 'missing-container',
        itemNodeId: null,
        placement: 'inside',
        targetIndex: 0,
      },
    })
    elementFromPoint.mockReturnValue(disabledContainer)
    unsafe.onPointerMove(pointer('pointermove', { clientX: 36, clientY: 36 }, { pointerId: 7 }))

    unsafe.setActive({
      pointer: { clientX: 30, clientY: 30 },
      pointerId: 8,
      sessionId: 'session',
      sourceHandleNodeId: 'handle',
      sourceItemNodeId: 'item',
      start: { clientX: 10, clientY: 10 },
      target: {
        accepted: true,
        containerNodeId: 'missing-container',
        itemNodeId: null,
        placement: 'inside',
        targetIndex: 0,
      },
    })
    unsafe.onPointerUp(pointer('pointerup', { clientX: 40, clientY: 40 }, { pointerId: 8 }))

    unsafe.setActive(null)
    unsafe.setPending(null)
    unsafe.onPointerUp(pointer('pointerup', { clientX: 40, clientY: 40 }))
  })
})
