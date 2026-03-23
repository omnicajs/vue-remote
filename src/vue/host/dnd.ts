import type { Ref, VNode } from 'vue'
import type { Unknown } from '~types/scaffolding'
import type { DndHostEngineTestHook, DndNodeBindings, RemoteSortableEvent } from '@/dnd'

import {
  createDndHostEngine,
  isDragHandleBinding,
  isSortableContainerBinding,
  isSortableItemBinding,
} from '@/dnd'
import { normalizeEventHandler } from '@/vue/events'

import {
  INTERNAL_DND_CONTAINER_PROP,
  INTERNAL_DND_HANDLE_PROP,
  INTERNAL_DND_ITEM_PROP,
} from '@/vue/dnd'

type VNodeHook = ((payload: VNode) => void) | Array<((payload: VNode) => void) | null> | null | undefined

export interface HostDndRuntime {
  bind (
    nodeId: string,
    properties: Ref<Unknown | undefined>,
    props: Unknown | undefined
  ): Unknown | undefined;
  destroy (): void;
}

interface HostDndRuntimeTestHook extends DndHostEngineTestHook {
  resolveVNodeElement (vnode: VNode): Element | null;
}

const invokeVNodeHook = (hook: VNodeHook, payload: VNode) => {
  if (typeof hook === 'function') {
    hook(payload)
    return
  }

  if (!Array.isArray(hook)) {
    return
  }

  hook.forEach(fn => {
    if (typeof fn === 'function') {
      fn(payload)
    }
  })
}

const mergeVNodeHook = (current: VNodeHook, next: (payload: VNode) => void) => {
  return (payload: VNode) => {
    invokeVNodeHook(current, payload)
    next(payload)
  }
}

const resolveVNodeElement = (vnode: VNode) => {
  if (vnode.el instanceof Element) {
    return vnode.el
  }

  const subtreeElement = vnode.component?.subTree?.el

  if (subtreeElement instanceof Element) {
    return subtreeElement
  }

  const componentElement = (vnode.component?.proxy as { $el?: unknown } | null)?.$el

  return componentElement instanceof Element
    ? componentElement
    : null
}

const extractBindings = (properties: Unknown | undefined): DndNodeBindings => {
  const container = properties?.[INTERNAL_DND_CONTAINER_PROP]
  const item = properties?.[INTERNAL_DND_ITEM_PROP]
  const handle = properties?.[INTERNAL_DND_HANDLE_PROP]

  return {
    container: isSortableContainerBinding(container) ? container : undefined,
    handle: isDragHandleBinding(handle) ? handle : undefined,
    item: isSortableItemBinding(item) ? item : undefined,
  }
}

const callListener = (listener: unknown, event: RemoteSortableEvent) => {
  const normalized = normalizeEventHandler(listener)
  normalized?.callback(event)
}

export const createHostDndRuntime = (): HostDndRuntime => {
  const engine = createDndHostEngine({ callListener })

  const api = {
    bind (nodeId, properties, props) {
      const next = props == null ? {} : { ...props }

      next.onVnodeMounted = mergeVNodeHook(next.onVnodeMounted as VNodeHook, vnode => {
        engine.syncNode(nodeId, resolveVNodeElement(vnode), extractBindings(properties.value))
      })
      next.onVnodeUpdated = mergeVNodeHook(next.onVnodeUpdated as VNodeHook, vnode => {
        engine.syncNode(nodeId, resolveVNodeElement(vnode), extractBindings(properties.value))
      })
      next.onVnodeUnmounted = mergeVNodeHook(next.onVnodeUnmounted as VNodeHook, () => {
        engine.unregisterNode(nodeId)
      })

      return next
    },

    destroy () {
      engine.destroy()
    },
  } as HostDndRuntime & {
    __unsafe?: HostDndRuntimeTestHook;
  }

  api.__unsafe = {
    ...engine.__unsafe!,
    resolveVNodeElement,
  }

  return api
}
