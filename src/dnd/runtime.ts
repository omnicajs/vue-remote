import type { DragHandleBinding, RemoteSortableEvent, SortableContainerBinding, SortableItemBinding } from '~types/dnd'
import type { DndActiveSession, DndPendingSession, DndResolvedTarget } from './host'

import {
  CLONED_DND_ATTRIBUTES,
  clearAttributes,
  createDndSessionId,
  dndTargetEquals,
  DYNAMIC_DND_ATTRIBUTES,
  getDndPointerDistance,
  setAttributeFlag,
  shouldStartDndPointerSession,
  STATIC_DND_ATTRIBUTES,
} from './host'
import { createDndOverlayPresentation } from './presentation'

export interface DndNodeBindings {
  container?: SortableContainerBinding;
  handle?: DragHandleBinding;
  item?: SortableItemBinding;
}

export interface DndRegisteredNode extends DndNodeBindings {
  element: Element;
  nodeId: string;
  releaseHandle?: () => void;
}

export interface DndHostEngine {
  destroy (): void;
  syncNode (nodeId: string, element: Element | null, bindings: DndNodeBindings): void;
  unregisterNode (nodeId: string): void;
}

export interface DndHostEngineTestHook {
  createSortableEvent (target: DndResolvedTarget | null): RemoteSortableEvent | null;
  disableTextSelection (): void;
  onKeyDown (event: KeyboardEvent): void;
  onPointerCancel (event: PointerEvent): void;
  onPointerMove (event: PointerEvent): void;
  onPointerUp (event: PointerEvent): void;
  resolveSourceItemNodeId (handle: DndRegisteredNode, target: EventTarget | null): string | null;
  resolveTarget (pointer: DndActiveSession['pointer']): DndResolvedTarget | null;
  setActive (session: DndActiveSession | null): void;
  setPending (session: DndPendingSession | null): void;
  targetEquals (left: DndResolvedTarget | null, right: DndResolvedTarget | null): boolean;
  updateStyles (): void;
}

interface DndHostEngineOptions {
  callListener (listener: unknown, event: RemoteSortableEvent): void;
}

const DRAG_DISTANCE_THRESHOLD = 4

export const createDndHostEngine = (
  options: DndHostEngineOptions
): DndHostEngine & { __unsafe?: DndHostEngineTestHook } => {
  const nodes = new Map<string, DndRegisteredNode>()
  const containerNodeIdsByContainerId = new Map<string, string>()
  const itemNodeIdsByItemId = new Map<string, string>()
  const handleNodeIdsByElement = new Map<Element, string>()
  const itemNodeIdsByElement = new Map<Element, string>()
  const containerNodeIdsByElement = new Map<Element, string>()
  const styledElements = new Set<Element>()
  const overlay = document.createElement('div')

  let pending: DndPendingSession | null = null
  let active: DndActiveSession | null = null
  let listening = false
  let placeholder: Element | null = null
  let previousUserSelect: string | null = null
  let previousSourceDisplay: string | null = null
  let sourceElementCollapsed: HTMLElement | null = null
  let sourceNodeIdForOverlay: string | null = null

  overlay.setAttribute('data-dnd-overlay', 'true')
  overlay.hidden = true
  document.body.append(overlay)

  const getNode = (nodeId: string | null | undefined) => {
    return nodeId == null ? undefined : nodes.get(nodeId)
  }

  const getSourceItem = () => getNode(active?.sourceItemNodeId ?? pending?.sourceItemNodeId)?.item

  const getContainerNodeIdByItem = (item: SortableItemBinding) => {
    return containerNodeIdsByContainerId.get(item.containerId)
  }

  const getTargetContainer = (target: DndResolvedTarget | null) => {
    return getNode(target?.containerNodeId)?.container
  }

  const getTargetItem = (target: DndResolvedTarget | null) => {
    return getNode(target?.itemNodeId)?.item
  }

  const clearClonedAttributes = (element: Element) => {
    clearAttributes(element, CLONED_DND_ATTRIBUTES)
  }

  const clonePresentationElement = (element: Element) => {
    const clone = element.cloneNode(true) as Element

    clearClonedAttributes(clone)
    clone.querySelectorAll('*').forEach(node => clearClonedAttributes(node))
    clone.setAttribute('aria-hidden', 'true')

    return clone
  }

  const cloneOverlayElement = (element: Element) => {
    const clone = clonePresentationElement(element)

    return createDndOverlayPresentation(element, clone)
  }

  const removePlaceholder = () => {
    placeholder?.remove()
    placeholder = null
  }

  const restoreCollapsedSourceElement = () => {
    if (sourceElementCollapsed == null) {
      return
    }

    if (previousSourceDisplay == null) {
      sourceElementCollapsed.style.removeProperty('display')
    } else {
      sourceElementCollapsed.style.display = previousSourceDisplay
    }

    previousSourceDisplay = null
    sourceElementCollapsed = null
  }

  const collapseSourceElement = (sourceNode: DndRegisteredNode) => {
    if (!(sourceNode.element instanceof HTMLElement)) {
      restoreCollapsedSourceElement()
      return
    }

    if (sourceElementCollapsed === sourceNode.element) {
      return
    }

    restoreCollapsedSourceElement()
    previousSourceDisplay = sourceNode.element.style.display || null
    sourceNode.element.style.display = 'none'
    sourceElementCollapsed = sourceNode.element
  }

  const hideOverlay = () => {
    overlay.hidden = true
    overlay.replaceChildren()
    overlay.style.removeProperty('--dnd-overlay-width')
    sourceNodeIdForOverlay = null
  }

  const cleanupPresentation = () => {
    hideOverlay()
    removePlaceholder()
    restoreCollapsedSourceElement()
  }

  const getPlaceholder = (sourceNode: DndRegisteredNode) => {
    if (placeholder == null || placeholder.getAttribute('data-dnd-placeholder-source') !== sourceNode.nodeId) {
      placeholder = clonePresentationElement(sourceNode.element)
      placeholder.setAttribute('data-dnd-placeholder', 'true')
      placeholder.setAttribute('data-dnd-placeholder-source', sourceNode.nodeId)
    }

    return placeholder
  }

  const syncOverlay = (sourceNode: DndRegisteredNode, session: DndActiveSession) => {
    const sourceRect = sourceNode.element.getBoundingClientRect()
    const pointer = session.pointer ?? session.start
    const dragMetrics = session.dragMetrics ?? {
      anchorX: Math.min(Math.max(pointer.clientX - sourceRect.left, 0), sourceRect.width),
      anchorY: Math.min(Math.max(pointer.clientY - sourceRect.top, 0), sourceRect.height),
      height: sourceRect.height,
      width: sourceRect.width,
    }

    if (sourceNodeIdForOverlay !== sourceNode.nodeId || overlay.childElementCount === 0) {
      overlay.replaceChildren(cloneOverlayElement(sourceNode.element))
      overlay.style.setProperty('--dnd-overlay-width', `${dragMetrics.width}px`)
      overlay.hidden = false
      sourceNodeIdForOverlay = sourceNode.nodeId
    }

    overlay.style.transform = `translate3d(${pointer.clientX - dragMetrics.anchorX}px, ${pointer.clientY - dragMetrics.anchorY}px, 0)`
  }

  const syncPlaceholder = (sourceNode: DndRegisteredNode, session: DndActiveSession) => {
    const target = session.target

    if (target == null || !target.accepted) {
      removePlaceholder()
      restoreCollapsedSourceElement()
      return
    }

    const nextPlaceholder = getPlaceholder(sourceNode)

    if (target.itemNodeId != null) {
      const targetNode = getNode(target.itemNodeId)
      const targetElement = targetNode?.element
      const parent = targetElement?.parentElement

      if (targetElement == null || parent == null) {
        removePlaceholder()
        restoreCollapsedSourceElement()
        return
      }

      if (
        sourceNode.element.parentElement === parent
        && (
          (target.placement === 'before' && sourceNode.element.nextElementSibling === targetElement)
          || (target.placement === 'after' && sourceNode.element.previousElementSibling === targetElement)
        )
      ) {
        removePlaceholder()
        restoreCollapsedSourceElement()
        return
      }

      if (target.placement === 'after') {
        parent.insertBefore(nextPlaceholder, targetElement.nextSibling)
      } else {
        parent.insertBefore(nextPlaceholder, targetElement)
      }

      if (sourceNode.element.parentElement === parent) {
        collapseSourceElement(sourceNode)
      } else {
        restoreCollapsedSourceElement()
      }

      return
    }

    const containerElement = getNode(target.containerNodeId)?.element

    if (containerElement == null) {
      removePlaceholder()
      restoreCollapsedSourceElement()
      return
    }

    const sourceItem = sourceNode.item

    if (sourceItem != null && sourceItem.containerId === getTargetContainer(target)?.containerId && target.targetIndex === sourceItem.index) {
      removePlaceholder()
      restoreCollapsedSourceElement()
      return
    }

    const firstChild = [...containerElement.children]
      .find(node => node !== sourceNode.element && node !== placeholder)

    if (firstChild != null) {
      removePlaceholder()
      restoreCollapsedSourceElement()
      return
    }

    containerElement.append(nextPlaceholder)

    if (sourceNode.element.parentElement === containerElement) {
      collapseSourceElement(sourceNode)
    } else {
      restoreCollapsedSourceElement()
    }
  }

  const syncPresentation = () => {
    if (active == null) {
      cleanupPresentation()
      return
    }

    const sourceNode = getNode(active.sourceItemNodeId)

    if (sourceNode == null) {
      cleanupPresentation()
      return
    }

    syncOverlay(sourceNode, active)
    syncPlaceholder(sourceNode, active)
  }

  const cleanupStyles = () => {
    styledElements.forEach(element => clearAttributes(element, DYNAMIC_DND_ATTRIBUTES))
    styledElements.clear()
  }

  const restoreTextSelection = () => {
    if (previousUserSelect == null) {
      return
    }

    document.body.style.userSelect = previousUserSelect
    previousUserSelect = null
  }

  const disableTextSelection = () => {
    if (previousUserSelect != null) {
      return
    }

    previousUserSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'
  }

  const updateStyles = () => {
    cleanupStyles()

    if (active == null) {
      syncPresentation()
      return
    }

    const sourceNode = getNode(active.sourceItemNodeId)

    if (sourceNode != null) {
      setAttributeFlag(sourceNode.element, 'data-dnd-source', true)
      setAttributeFlag(sourceNode.element, 'data-dnd-dragging', true)
      styledElements.add(sourceNode.element)
    }

    if (active.target == null) {
      return
    }

    const targetNode = getNode(active.target.itemNodeId ?? active.target.containerNodeId)
    const containerNode = getNode(active.target.containerNodeId)

    if (containerNode != null) {
      setAttributeFlag(containerNode.element, 'data-dnd-drag-over', true)
      styledElements.add(containerNode.element)
    }

    if (targetNode != null) {
      setAttributeFlag(targetNode.element, 'data-dnd-target', true)
      setAttributeFlag(targetNode.element, 'data-dnd-drop-allowed', active.target.accepted)
      setAttributeFlag(targetNode.element, 'data-dnd-drop-forbidden', !active.target.accepted)
      targetNode.element.setAttribute('data-dnd-placement', active.target.placement)
      styledElements.add(targetNode.element)
    }

    syncPresentation()
  }

  const createSortableEvent = (target: DndResolvedTarget | null): RemoteSortableEvent | null => {
    const source = getSourceItem()

    if (source == null) {
      return null
    }

    const pointer = active?.pointer ?? pending?.start

    if (pointer == null) {
      return null
    }

    return {
      accepted: target?.accepted ?? false,
      itemId: source.itemId,
      payload: source.payload,
      placement: target?.placement ?? null,
      pointer: {
        clientX: pointer.clientX,
        clientY: pointer.clientY,
      },
      sessionId: active?.sessionId ?? '',
      sourceContainerId: source.containerId,
      targetContainerId: getTargetContainer(target)?.containerId ?? null,
      targetIndex: target?.targetIndex ?? null,
      targetItemId: getTargetItem(target)?.itemId ?? null,
      type: source.type,
    }
  }

  const getContainerItems = (containerId: string) => {
    return [...nodes.values()]
      .filter((node): node is DndRegisteredNode & { item: SortableItemBinding } => node.item?.containerId === containerId)
      .sort((left, right) => left.item.index - right.item.index)
  }

  const normalizeTargetIndex = (
    source: SortableItemBinding,
    targetContainerId: string,
    rawIndex: number
  ) => {
    return source.containerId === targetContainerId && rawIndex > source.index
      ? rawIndex - 1
      : rawIndex
  }

  const resolveItemAtPoint = (start: Element | null) => {
    let current: Element | null = start

    while (current != null) {
      const nodeId = itemNodeIdsByElement.get(current)

      if (nodeId != null) {
        return nodes.get(nodeId)
      }

      current = current.parentElement
    }

    return undefined
  }

  const resolveContainerAtPoint = (start: Element | null) => {
    let current: Element | null = start

    while (current != null) {
      const nodeId = containerNodeIdsByElement.get(current)

      if (nodeId != null) {
        return nodes.get(nodeId)
      }

      current = current.parentElement
    }

    return undefined
  }

  const resolveSourceItemNodeId = (handle: DndRegisteredNode, target: EventTarget | null) => {
    if (handle.handle?.for != null) {
      return itemNodeIdsByItemId.get(handle.handle.for) ?? null
    }

    return target instanceof Element
      ? resolveItemAtPoint(target)?.nodeId ?? null
      : null
  }

  const resolveTarget = (pointer: DndActiveSession['pointer']) => {
    const sourceNode = getNode(active?.sourceItemNodeId)
    const source = sourceNode?.item

    if (sourceNode == null || source == null) {
      return null
    }

    const rootDocument = sourceNode.element.ownerDocument
    const hoveredElement = rootDocument.elementFromPoint(pointer.clientX, pointer.clientY)
    let hoveredItemNode = resolveItemAtPoint(hoveredElement)
    const hoveredContainerAtPoint = resolveContainerAtPoint(hoveredElement)

    if (hoveredItemNode?.nodeId === sourceNode.nodeId) {
      hoveredItemNode = undefined
    }

    if (
      hoveredItemNode?.item != null
      && hoveredContainerAtPoint != null
      && hoveredContainerAtPoint.nodeId !== getContainerNodeIdByItem(hoveredItemNode.item)
    ) {
      hoveredItemNode = undefined
    }

    const hoveredContainerNode = hoveredItemNode?.item != null
      ? getNode(getContainerNodeIdByItem(hoveredItemNode.item))
      : hoveredContainerAtPoint

    if (hoveredContainerNode == null) {
      return null
    }

    const container = hoveredContainerNode.container

    if (container == null || container.disabled) {
      return null
    }

    const accepted = container.accepts == null
      || container.accepts.length === 0
      || container.accepts.includes(source.type)

    const items = getContainerItems(container.containerId)
      .filter(node => node.item != null && node.item.disabled !== true)

    if (hoveredItemNode?.item != null) {
      const rect = hoveredItemNode.element.getBoundingClientRect()
      const placement = container.orientation === 'horizontal'
        ? pointer.clientX < rect.left + rect.width / 2 ? 'before' : 'after'
        : pointer.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
      const rawIndex = placement === 'before'
        ? hoveredItemNode.item.index
        : hoveredItemNode.item.index + 1

      return {
        accepted,
        containerNodeId: hoveredContainerNode.nodeId,
        itemNodeId: hoveredItemNode.nodeId,
        placement,
        targetIndex: normalizeTargetIndex(source, container.containerId, rawIndex),
      } satisfies DndResolvedTarget
    }

    const itemsExcludingSource = items.filter(node => node.nodeId !== sourceNode.nodeId)

    if (itemsExcludingSource.length === 0) {
      return {
        accepted,
        containerNodeId: hoveredContainerNode.nodeId,
        itemNodeId: null,
        placement: 'inside',
        targetIndex: 0,
      } satisfies DndResolvedTarget
    }

    const coordinate = container.orientation === 'horizontal' ? pointer.clientX : pointer.clientY

    for (const node of itemsExcludingSource) {
      const rect = node.element.getBoundingClientRect()
      const midpoint = container.orientation === 'horizontal'
        ? rect.left + rect.width / 2
        : rect.top + rect.height / 2

      if (coordinate < midpoint) {
        return {
          accepted,
          containerNodeId: hoveredContainerNode.nodeId,
          itemNodeId: node.nodeId,
          placement: 'before',
          targetIndex: normalizeTargetIndex(source, container.containerId, node.item!.index),
        } satisfies DndResolvedTarget
      }
    }

    const last = itemsExcludingSource[itemsExcludingSource.length - 1]!

    return {
      accepted,
      containerNodeId: hoveredContainerNode.nodeId,
      itemNodeId: last.nodeId,
      placement: 'after',
      targetIndex: normalizeTargetIndex(source, container.containerId, last.item!.index + 1),
    } satisfies DndResolvedTarget
  }

  const removeGlobalListeners = () => {
    if (!listening) {
      return
    }

    listening = false
    document.removeEventListener('pointermove', onPointerMove)
    document.removeEventListener('pointerup', onPointerUp)
    document.removeEventListener('pointercancel', onPointerCancel)
    window.removeEventListener('keydown', onKeyDown)
  }

  const releaseCapture = (session: DndPendingSession | DndActiveSession | null) => {
    if (session == null) {
      return
    }

    const element = getNode(session.sourceHandleNodeId)?.element

    try {
      element?.releasePointerCapture?.(session.pointerId)
    } catch {
      // Pointer capture can already be gone when the session is finishing.
    }
  }

  const finishSession = (kind: 'cancel' | 'end') => {
    if (active?.target != null) {
      const leaveEvent = createSortableEvent(active.target)
      const container = getTargetContainer(active.target)

      if (container != null && leaveEvent != null) {
        options.callListener(container.onDragleave, leaveEvent)
      }
    }

    const session = active
    const source = getSourceItem()
    const finalEvent = createSortableEvent(active?.target ?? null)

    releaseCapture(active)
    restoreTextSelection()

    active = null
    pending = null
    removeGlobalListeners()
    updateStyles()

    if (source == null || finalEvent == null) {
      return
    }

    if (kind === 'cancel') {
      options.callListener(source.onDragcancel, finalEvent)
      return
    }

    if (session?.target?.accepted === true) {
      const container = getTargetContainer(session.target)
      options.callListener(container?.onDrop, finalEvent)
    }

    options.callListener(source.onDragend, finalEvent)
  }

  const startActiveSession = (event: PointerEvent) => {
    const currentPending = pending as DndPendingSession
    const source = getNode(currentPending.sourceItemNodeId)?.item

    if (source == null || source.disabled) {
      pending = null
      removeGlobalListeners()
      return
    }

    active = {
      ...currentPending,
      pointer: {
        clientX: event.clientX,
        clientY: event.clientY,
      },
      dragMetrics: currentPending.dragMetrics,
      sessionId: createDndSessionId(),
      target: null,
    }
    pending = null

    disableTextSelection()
    const session = active as DndActiveSession
    session.target = resolveTarget(session.pointer)
    updateStyles()

    const dragStartEvent = createSortableEvent(session.target)

    options.callListener(source.onDragstart, dragStartEvent!)
    const container = getTargetContainer(session.target)

    if (container != null) {
      options.callListener(container.onDragenter, dragStartEvent!)
      options.callListener(container.onDragmove, dragStartEvent!)
    }
  }

  function onPointerMove (event: PointerEvent) {
    if (active != null && event.pointerId !== active.pointerId) {
      return
    }

    if (pending != null && active == null) {
      if (event.pointerId !== pending.pointerId) {
        return
      }

      if (getDndPointerDistance(pending.start, {
        clientX: event.clientX,
        clientY: event.clientY,
      }) < DRAG_DISTANCE_THRESHOLD) {
        return
      }

      startActiveSession(event)
    }

    if (active == null) {
      return
    }

    active.pointer = {
      clientX: event.clientX,
      clientY: event.clientY,
    }

    const previousTarget = active.target
    const nextTarget = resolveTarget(active.pointer)

    if (!dndTargetEquals(previousTarget, nextTarget) && previousTarget != null) {
      const leaveEvent = createSortableEvent(previousTarget)
      const container = getTargetContainer(previousTarget)

      if (container != null && leaveEvent != null) {
        options.callListener(container.onDragleave, leaveEvent)
      }
    }

    active.target = nextTarget

    if (!dndTargetEquals(previousTarget, nextTarget) && nextTarget != null) {
      const enterEvent = createSortableEvent(nextTarget)
      const container = getTargetContainer(nextTarget)
      options.callListener(container?.onDragenter, enterEvent!)
    }

    const moveEvent = createSortableEvent(active.target)
    const container = getTargetContainer(active.target)

    if (container != null && moveEvent != null) {
      options.callListener(container.onDragmove, moveEvent)
    }

    updateStyles()

    if (event.cancelable) {
      event.preventDefault()
    }
  }

  function onPointerUp (event: PointerEvent) {
    if (active != null && event.pointerId !== active.pointerId) {
      return
    }

    if (pending != null && active == null) {
      releaseCapture(pending)
      pending = null
      removeGlobalListeners()
      return
    }

    if (active == null) {
      return
    }

    active.pointer = {
      clientX: event.clientX,
      clientY: event.clientY,
    }
    active.target = resolveTarget(active.pointer)
    updateStyles()
    finishSession('end')
  }

  function onPointerCancel (event: PointerEvent) {
    if (active != null && event.pointerId === active.pointerId) {
      finishSession('cancel')
      return
    }

    if (pending != null && event.pointerId === pending.pointerId) {
      releaseCapture(pending)
      pending = null
      removeGlobalListeners()
    }
  }

  function onKeyDown (event: KeyboardEvent) {
    if (event.key === 'Escape' && active != null) {
      finishSession('cancel')
    }
  }

  const addGlobalListeners = () => {
    if (listening) {
      return
    }

    listening = true
    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
    document.addEventListener('pointercancel', onPointerCancel)
    window.addEventListener('keydown', onKeyDown)
  }

  const updateStaticAttributes = (node: DndRegisteredNode) => {
    setAttributeFlag(node.element, 'data-dnd-sortable-container', node.container != null)
    setAttributeFlag(node.element, 'data-dnd-sortable-item', node.item != null)
    setAttributeFlag(node.element, 'data-dnd-handle', node.handle != null)
  }

  const clearNodeIndexes = (node: DndRegisteredNode) => {
    if (node.container != null && containerNodeIdsByContainerId.get(node.container.containerId) === node.nodeId) {
      containerNodeIdsByContainerId.delete(node.container.containerId)
    }

    if (node.item != null && itemNodeIdsByItemId.get(node.item.itemId) === node.nodeId) {
      itemNodeIdsByItemId.delete(node.item.itemId)
    }

    handleNodeIdsByElement.delete(node.element)
    itemNodeIdsByElement.delete(node.element)
    containerNodeIdsByElement.delete(node.element)
    clearAttributes(node.element, STATIC_DND_ATTRIBUTES)
    clearAttributes(node.element, DYNAMIC_DND_ATTRIBUTES)
    node.releaseHandle?.()
  }

  const syncNode = (nodeId: string, element: Element | null, bindings: DndNodeBindings) => {
    const current = nodes.get(nodeId)

    if (current != null) {
      clearNodeIndexes(current)
      nodes.delete(nodeId)
    }

    if (element == null || (bindings.container == null && bindings.item == null && bindings.handle == null)) {
      updateStyles()
      return
    }

    const next: DndRegisteredNode = {
      container: bindings.container,
      element,
      handle: bindings.handle,
      item: bindings.item,
      nodeId,
    }

    if (bindings.container != null) {
      containerNodeIdsByContainerId.set(bindings.container.containerId, nodeId)
      containerNodeIdsByElement.set(element, nodeId)
    }

    if (bindings.item != null) {
      itemNodeIdsByItemId.set(bindings.item.itemId, nodeId)
      itemNodeIdsByElement.set(element, nodeId)
    }

    if (bindings.handle != null) {
      const onPointerDown = (event: Event) => {
        if (!(event instanceof PointerEvent)) {
          return
        }

        if (!shouldStartDndPointerSession(event)) {
          return
        }

        const handleNode = nodes.get(nodeId)

        if (handleNode?.handle?.disabled) {
          return
        }

        const sourceItemNodeId = resolveSourceItemNodeId(handleNode as DndRegisteredNode, event.target)
        const source = sourceItemNodeId == null ? null : nodes.get(sourceItemNodeId)?.item
        const sourceElement = sourceItemNodeId == null ? null : nodes.get(sourceItemNodeId)?.element

        if (sourceItemNodeId == null || source == null || source.disabled || sourceElement == null) {
          return
        }

        const sourceRect = sourceElement.getBoundingClientRect()

        pending = {
          dragMetrics: {
            anchorX: Math.min(Math.max(event.clientX - sourceRect.left, 0), sourceRect.width),
            anchorY: Math.min(Math.max(event.clientY - sourceRect.top, 0), sourceRect.height),
            height: sourceRect.height,
            width: sourceRect.width,
          },
          pointerId: event.pointerId,
          sourceHandleNodeId: nodeId,
          sourceItemNodeId,
          start: {
            clientX: event.clientX,
            clientY: event.clientY,
          },
        }

        try {
          handleNode?.element.setPointerCapture?.(event.pointerId)
        } catch {
          // Some environments do not allow pointer capture for synthetic tests.
        }

        addGlobalListeners()
      }

      element.addEventListener('pointerdown', onPointerDown)
      handleNodeIdsByElement.set(element, nodeId)
      next.releaseHandle = () => element.removeEventListener('pointerdown', onPointerDown)
    }

    updateStaticAttributes(next)
    nodes.set(nodeId, next)
    updateStyles()
  }

  const unregisterNode = (nodeId: string) => {
    const node = nodes.get(nodeId)

    if (node == null) {
      return
    }

    clearNodeIndexes(node)
    nodes.delete(nodeId)

    if (active?.sourceItemNodeId === nodeId || active?.sourceHandleNodeId === nodeId) {
      finishSession('cancel')
      return
    }

    if (pending?.sourceItemNodeId === nodeId || pending?.sourceHandleNodeId === nodeId) {
      releaseCapture(pending)
      pending = null
      removeGlobalListeners()
    }

    updateStyles()
  }

  const api = {
    destroy () {
      removeGlobalListeners()
      releaseCapture(active ?? pending)
      cleanupStyles()
      cleanupPresentation()
      restoreTextSelection()
      nodes.forEach(node => clearNodeIndexes(node))
      nodes.clear()
      containerNodeIdsByContainerId.clear()
      itemNodeIdsByItemId.clear()
      handleNodeIdsByElement.clear()
      itemNodeIdsByElement.clear()
      containerNodeIdsByElement.clear()
      active = null
      pending = null
      overlay.remove()
    },
    syncNode,
    unregisterNode,
  } as DndHostEngine & { __unsafe?: DndHostEngineTestHook }

  api.__unsafe = {
    createSortableEvent,
    disableTextSelection,
    onKeyDown,
    onPointerCancel,
    onPointerMove,
    onPointerUp,
    resolveSourceItemNodeId,
    resolveTarget,
    setActive (session) {
      active = session
    },
    setPending (session) {
      pending = session
    },
    targetEquals: dndTargetEquals,
    updateStyles,
  }

  return api
}
