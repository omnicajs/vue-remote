import type { Slot } from 'vue'
import type { VNode } from 'vue'
import type { Ref } from 'vue'

import type { Provider } from '~types/vue/host'
import type { HostDndRuntime } from '@/vue/host/dnd'

import type { Unknown } from '~types/scaffolding'

import type { HostedChild } from './tree'

import {
  createCommentVNode,
  h,
} from 'vue'

import { isDOMTag } from '@/common/dom'

import { isFunction } from '@/dom/host'
import { normalizeEventHandlers } from '@/vue/events'

import {
  isComment,
  isSlot,
  isText,
} from './tree'

import {
  serializeEvent,
  serializeNativeVModelEvent,
} from '@/vue/host/events'
import { applyEventHandlerSteps } from '@/vue/host/modifiers'

import { INTERNAL_V_MODEL_EVENT_PREFIX } from '@/vue/remote/nativeVModel'
import { INTERNAL_DND_PROP_NAMES } from '@/vue/dnd'

const collectOptionSelection = (children: HostedChild[]) => {
  return children.reduce((selection, child) => {
    if (!('type' in child)) {
      return selection
    }

    if (child.type === 'option') {
      selection.push(Boolean(child.properties.value?.selected))
      return selection
    }

    selection.push(...collectOptionSelection(child.children.value))
    return selection
  }, [] as boolean[])
}

const invokeVNodeHook = (hook: unknown, ...args: unknown[]) => {
  if (typeof hook === 'function') {
    hook(...args)
    return
  }

  if (Array.isArray(hook)) {
    hook.forEach(fn => {
      if (typeof fn === 'function') {
        fn(...args)
      }
    })
  }
}

const syncSelectValue = (element: Element, children: HostedChild[], props: Unknown | undefined) => {
  if (!(element instanceof HTMLSelectElement)) {
    return
  }

  const selection = collectOptionSelection(children)

  selection.forEach((selected, index) => {
    const option = element.options.item(index)

    if (option && option.selected !== selected) {
      option.selected = selected
    }
  })

  if (
    !element.multiple &&
    typeof props?.selectedIndex === 'number' &&
    element.selectedIndex !== props.selectedIndex
  ) {
    element.selectedIndex = props.selectedIndex
  }
}

const withSelectSync = (props: Unknown, children: HostedChild[]) => {
  return {
    ...props,
    onVnodeMounted: (vnode: VNode) => {
      invokeVNodeHook(props.onVnodeMounted, vnode)
      syncSelectValue(vnode.el as Element, children, props)
    },
    onVnodeUpdated: (vnode: VNode) => {
      invokeVNodeHook(props.onVnodeUpdated, vnode)
      syncSelectValue(vnode.el as Element, children, props)
    },
  }
}

export const toSlots = (children: HostedChild[], render: (hosted: HostedChild) => VNode | string | null) => {
  const defaultSlot: HostedChild[] = []
  const slots: Record<string, HostedChild[]> = {}

  children.forEach(child => {
    if (isSlot(child)) {
      const slotName = (child.properties.value as { name: string }).name
      slots[slotName] = [
        ...(slots[slotName] ?? []),
        ...child.children.value,
      ]
    } else if (!isText(child) || child.text.value.length > 0) {
      defaultSlot.push(child)
    }
  })

  return {
    ...(Object.keys(slots).reduce((named, slotName) => {
      return { ...named, [slotName]: (() => slots[slotName].map(render)) as Slot }
    }, {})),
    default: () => defaultSlot.map(render),
  } as Record<string, Slot>
}

const isJavaScriptSchema = (value: string) => {
  const normalized = value.trim().toLowerCase()

  if (normalized.startsWith('javascript:')) {
    return true
  }

  try {
    return decodeURIComponent(normalized).startsWith('javascript:')
  } catch {
    return false
  }
}

const isVNodeHook = (key: string) => {
  return /^onVnode[A-Z]/.test(key)
}

const createEventHandler = (
  properties: Ref<Unknown | undefined>,
  key: string,
  serialize: (event: Event) => unknown = serializeEvent
) => {
  return (...args: unknown[]) => {
    const normalizedHandlers = normalizeEventHandlers(properties.value?.[key])

    if (normalizedHandlers == null) {
      return
    }

    const [event] = args
    let result: unknown

    for (const handler of normalizedHandlers) {
      if (event instanceof Event && !applyEventHandlerSteps(event, handler.steps)) {
        continue
      }

      result = handler.callback(...args.map(arg => arg instanceof Event ? serialize(arg) : arg))
    }

    return result
  }
}

const mergeEventHandlers = (first: unknown, second: unknown) => {
  if (!isFunction(first)) {
    return second
  }

  return (...args: unknown[]) => {
    first(...args)
    return (second as (...args: unknown[]) => unknown)(...args)
  }
}

export const process = (properties: Ref<Unknown | undefined> | undefined): Unknown | undefined => {
  if (properties === undefined) {
    return undefined
  }

  const result: Record<keyof Unknown, unknown> = {}
  const runtimeVModelHandlers: Record<string, unknown> = {}

  for (const key in properties.value) {
    const v = properties.value[key]

    if (INTERNAL_DND_PROP_NAMES.has(key)) {
      continue
    }

    if (typeof v === 'string' && isJavaScriptSchema(v)) {
      result[key] = 'javascript:void(0);'
      continue
    }

    if (key.startsWith(INTERNAL_V_MODEL_EVENT_PREFIX) && isFunction(v)) {
      const publicKey = key.slice(INTERNAL_V_MODEL_EVENT_PREFIX.length)

      runtimeVModelHandlers[publicKey] = createEventHandler(
        properties,
        key,
        serializeNativeVModelEvent
      )

      continue
    }

    result[key] = /^on[A-Z]/.test(key) && !isVNodeHook(key) && normalizeEventHandlers(v) != null
      ? createEventHandler(properties, key)
      : v
  }

  for (const key in runtimeVModelHandlers) {
    result[key] = mergeEventHandlers(result[key], runtimeVModelHandlers[key])
  }

  return result
}

const render = (
  node: HostedChild,
  provider: Provider,
  dndRuntime?: HostDndRuntime
): VNode | string | null => {
  if ('type' in node) {
    if (isSlot(node)) {
      console.error('Found an orphan remote slot', node)
      return null
    }

    const children = node.children.value
    const processed = { ...process(node.properties), ref: node.ref } as Unknown
    const props = dndRuntime?.bind(
      node.id,
      node.properties,
      node.type === 'select' ? withSelectSync(processed, children) : processed
    ) ?? (node.type === 'select' ? withSelectSync(processed, children) : processed)

    return isDOMTag(node.type)
      ? h(
        node.type,
        props,
        children.map(child => render(child, provider, dndRuntime))
      )
      : h(provider.get(node.type), { ...props, key: node.id }, toSlots(
        children, child => render(child, provider, dndRuntime)
      ))
  }

  return isComment(node)
    ? createCommentVNode(node.text.value)
    : isText(node) && node.text.value.length > 0
      ? node.text.value
      : null
}

export default render
