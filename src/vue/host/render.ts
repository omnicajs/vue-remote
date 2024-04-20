import type {
  Slot,
  VNode,
} from 'vue'

import type { Provider } from '~types/vue/host'

import type { Unknown } from '~types/scaffolding'

import type { Received } from '@/dom/host'
import type { Hosted } from '@/vue/host/useReceived'

import {
  createCommentVNode,
  h,
} from 'vue'

import { isDOMTag } from '@/common/dom'

import {
  isFunction,
  isReceivedComment,
  isReceivedText,
} from '@/dom/host'

import { serializeEvent } from '@/vue/host/events'

import { REMOTE_SLOT } from '@/vue/internals'

export const isSlot = (node: Received) => 'type' in node && node.type === REMOTE_SLOT

export const toSlots = (children: Hosted[], render: (hosted: Hosted) => VNode | string | null) => {
  const defaultSlot: Hosted[] = []
  const slots: Record<string, Hosted[]> = {}

  children.forEach(hosted => {
    const { node: { value: node }, properties } = hosted

    if (node === null || isReceivedText(node) && node.text.length === 0) {
      return
    }

    if (isSlot(node)) {
      const slotName = (properties.value as { name: string }).name
      slots[slotName] = [
        ...(slots[slotName] ?? []),
        ...hosted.children.value,
      ]
    } else {
      defaultSlot.push(hosted)
    }
  })

  return {
    ...(Object.keys(slots).reduce((named, slotName) => {
      return { ...named, [slotName]: (() => slots[slotName].map(render)) as Slot }
    }, {})),
    default: () => defaultSlot.map(render),
  } as Record<string, Slot>
}

export const process = (properties: Unknown | undefined): Unknown | undefined => {
  if (properties === undefined) {
    return undefined
  }

  const result: Record<keyof typeof properties, unknown> = {}
  for (const key in properties) {
    const v = properties[key]
    result[key] = /^on[A-Z]/.test(key) && isFunction(v)
      ? (...args: unknown[]) => v(...args.map(arg => arg instanceof Event ? serializeEvent(arg) : arg))
      : v
  }

  return result
}

const render = (hosted: Hosted, provider: Provider): VNode | string | null => {
  const {
    node: { value: node },
    children: { value: children },
    ref,
  } = hosted

  if ('type' in node) {
    if (isSlot(node)) {
      console.error('Found an orphan remote slot', node)
      return null
    }

    const props = { ...process(hosted.properties.value), ref }

    return isDOMTag(node.type)
      ? h(node.type, props, children.map(child => render(child, provider)))
      : h(provider.get(node.type), { ...props, key: node.id }, toSlots(
        children, child => render(child, provider)
      ))
  }

  return isReceivedComment(node)
    ? createCommentVNode(node.text)
    : isReceivedText(node) && node.text.length > 0
      ? node.text
      : null
}

export default render
