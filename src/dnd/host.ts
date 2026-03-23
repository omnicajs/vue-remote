import type {
  DragHandleBinding,
  SortableContainerBinding,
  SortableItemBinding,
  SortablePlacement,
} from '~types/dnd'

export interface DndDragMetrics {
  anchorX: number;
  anchorY: number;
  height: number;
  width: number;
}

export interface DndPendingSession {
  dragMetrics: DndDragMetrics;
  pointerId: number;
  sourceHandleNodeId: string;
  sourceItemNodeId: string;
  start: {
    clientX: number;
    clientY: number;
  };
}

export interface DndResolvedTarget {
  accepted: boolean;
  containerNodeId: string;
  itemNodeId: string | null;
  placement: SortablePlacement;
  targetIndex: number;
}

export interface DndActiveSession extends DndPendingSession {
  pointer: {
    clientX: number;
    clientY: number;
  };
  sessionId: string;
  target: DndResolvedTarget | null;
}

export const DYNAMIC_DND_ATTRIBUTES = [
  'data-dnd-source',
  'data-dnd-dragging',
  'data-dnd-target',
  'data-dnd-drag-over',
  'data-dnd-placement',
  'data-dnd-drop-allowed',
  'data-dnd-drop-forbidden',
]

export const PRESENTATION_DND_ATTRIBUTES = [
  'data-dnd-overlay',
  'data-dnd-placeholder',
]

export const STATIC_DND_ATTRIBUTES = [
  'data-dnd-sortable-container',
  'data-dnd-sortable-item',
  'data-dnd-handle',
]

export const CLONED_DND_ATTRIBUTES = [
  ...STATIC_DND_ATTRIBUTES,
  ...DYNAMIC_DND_ATTRIBUTES,
  ...PRESENTATION_DND_ATTRIBUTES,
  'data-testid',
  'id',
]

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value != null
}

export const isSortableContainerBinding = (value: unknown): value is SortableContainerBinding => {
  return isRecord(value)
    && typeof value.containerId === 'string'
    && (value.orientation === 'vertical' || value.orientation === 'horizontal')
}

export const isSortableItemBinding = (value: unknown): value is SortableItemBinding => {
  return isRecord(value)
    && typeof value.itemId === 'string'
    && typeof value.containerId === 'string'
    && typeof value.type === 'string'
    && typeof value.index === 'number'
}

export const isDragHandleBinding = (value: unknown): value is DragHandleBinding => {
  return isRecord(value) && ('for' in value ? typeof value.for === 'string' || value.for == null : true)
}

export const setAttributeFlag = (element: Element, name: string, active: boolean) => {
  if (active) {
    element.setAttribute(name, 'true')
    return
  }

  element.removeAttribute(name)
}

export const clearAttributes = (element: Element, names: string[]) => {
  names.forEach(name => element.removeAttribute(name))
}

export const getDndPointerDistance = (
  start: DndPendingSession['start'],
  pointer: DndPendingSession['start']
) => {
  return Math.hypot(pointer.clientX - start.clientX, pointer.clientY - start.clientY)
}

export const dndTargetEquals = (left: DndResolvedTarget | null, right: DndResolvedTarget | null) => {
  if (left === right) {
    return true
  }

  /* c8 ignore next 3 -- transient null/non-null comparisons are guarded by the session flow */
  /* v8 ignore next 3 -- transient null/non-null comparisons are guarded by the session flow */
  if (left == null || right == null) {
    return false
  }

  return left.accepted === right.accepted
    && left.containerNodeId === right.containerNodeId
    && left.itemNodeId === right.itemNodeId
    && left.placement === right.placement
    && left.targetIndex === right.targetIndex
}

export const shouldStartDndPointerSession = (event: PointerEvent) => {
  return event.isPrimary !== false && (event.pointerType !== 'mouse' || event.button === 0)
}

export const createDndSessionId = (() => {
  let index = 0

  return () => {
    index += 1

    return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `sortable-session-${index}`
  }
})()
