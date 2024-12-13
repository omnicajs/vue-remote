import type {
  Slot,
  VNode,
} from 'vue'

import type { Provider } from '~types/vue/host'

import type { Unknown } from '~types/scaffolding'

import type { HostedChild } from './tree'

import {
  createCommentVNode,
  h,
} from 'vue'

import { isDOMTag } from '@/common/dom'

import { isFunction } from '@/dom/host'

import {
  isComment,
  isSlot,
  isText,
} from './tree'

import { serializeEvent } from '@/vue/host/events'

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

  return normalized.startsWith('javascript:') || decodeURIComponent(normalized).startsWith('javascript:')
}

export const process = (properties: Unknown | undefined): Unknown | undefined => {
  if (properties === undefined) {
    return undefined
  }

  const result: Record<keyof typeof properties, unknown> = {}
  for (const key in properties) {
    const v = properties[key]
    if (typeof v === 'string' && isJavaScriptSchema(v)) {
      result[key] = 'javascript:void(0);'
      continue
    }

    result[key] = /^on[A-Z]/.test(key) && isFunction(v)
      ? (...args: unknown[]) => v(...args.map(arg => arg instanceof Event ? serializeEvent(arg) : arg))
      : v
  }

  return result
}

const render = (node: HostedChild, provider: Provider): VNode | string | null => {
  if ('type' in node) {
    if (isSlot(node)) {
      console.error('Found an orphan remote slot', node)
      return null
    }

    const props = { ...process(node.properties.value), ref: node.ref }
    const children = node.children.value

    return isDOMTag(node.type)
      ? h(node.type, props, children.map(child => render(child, provider)))
      : h(provider.get(node.type), { ...props, key: node.id }, toSlots(
        children, child => render(child, provider)
      ))
  }

  return isComment(node)
    ? createCommentVNode(node.text.value)
    : isText(node) && node.text.value.length > 0
      ? node.text.value
      : null
}

export default render
