import type {
    DefineComponent,
    PropType,
    Slot,
    VNode,
} from 'vue'

import type {
    RemoteReceiver,
    RemoteReceiverAttachableChild as Attachable,
} from '@remote-ui/core'

import type {
    Attached,
    Provider,
} from '../../types/host'

import type {
    Unknown,
} from '../../types/scaffolding'

import {
    createCommentVNode,
    defineComponent,
    h,
    onMounted,
    onUnmounted,
} from 'vue'

import { isElement as _isElement } from '@/common/dom'
import { attach } from './attach'
import { serializeEvent } from './events'

import { InternalNodeType } from '@/internals'

const eventSafe = (props: Unknown | undefined): Unknown | undefined => {
    if (props === undefined) {
        return undefined
    }

    const result: Record<keyof typeof props, unknown> = {}
    for (const key in props) {
        const fn = props[key]
        if (/^on[A-Z]/.test(key) && typeof fn === 'function') {
            result[key] = (...args: unknown[]) => fn(...args.map(arg => {
                if (arg instanceof Event) {
                    return serializeEvent(arg)
                }

                return arg
            }))
        } else {
            result[key] = props[key]
        }
    }

    return result
}

const isComment = (node: Attachable) => 'type' in node && node.type === InternalNodeType.RemoteComment
const isElement = (node: Attachable) => 'type' in node && _isElement(node.type)
const isSlot = (node: Attachable) => 'type' in node && node.type === InternalNodeType.RemoteSlot

const toSlots = (children: Attached[], render: (attached: Attached) => VNode | string | null) => {
    const defaultSlot: Attached[] = []
    const slots: Record<string, Attached[]> = {}
    children.forEach(attached => {
        const { node, props } = attached

        if (node.value === null) {
            return
        }

        if ('type' in node.value && isSlot(node.value)) {
            const slotName = (props.value as { name: string }).name
            slots[slotName] = [
                ...(slots[slotName] ?? []),
                ...attached.children.value,
            ]
        } else {
            defaultSlot.push(attached)
        }
    })

    return {
        ...(Object.keys(slots).reduce((named, slotName) => {
            return { ...named, [slotName]: (() => slots[slotName].map(render)) as Slot }
        }, {})),
        default: () => defaultSlot.map(render),
    } as Record<string, Slot>
}

const render = (attached: Attached, provider: Provider): VNode | string | null => {
    const { node, children } = attached

    if (node.value === null) {
        return null
    }

    if ('type' in node.value) {
        if (isComment(node.value)) {
            return createCommentVNode((attached.props.value as { text?: string }).text)
        }

        if (isSlot(node.value)) {
            console.error('Found an orphan remote slot', node.value)
            return null
        }

        const type = node.value.type
        const slots = toSlots(children.value, child => render(child, provider))

        return isElement(node.value)
            ? h(type, eventSafe(attached.props.value), children.value.map(child => render(child, provider)))
            : h(provider.get(type), { ...eventSafe(attached.props.value), key: node.value.id }, slots)
    }

    return 'text' in node.value && node.value.text.length > 0
        ? node.value.text
        : null
}

export default /*#__PURE__*/ defineComponent({
    name: 'AttachedSubtree',

    props: {
        root: {
            type: Object as PropType<Attachable>,
            required: true,
        },

        provider: {
            type: Object as PropType<Provider>,
            required: true,
        },

        receiver: {
            type: Object as PropType<RemoteReceiver>,
            required: true,
        },
    },

    setup (props) {
        const attached = attach(
            props.receiver,
            props.root
        )

        onMounted(attached.update)
        onUnmounted(attached.release)

        return () => render(attached, props.provider)
    },
}) as DefineComponent<{
    root: Attachable;
    provider: Provider;
    receiver: RemoteReceiver;
}>
