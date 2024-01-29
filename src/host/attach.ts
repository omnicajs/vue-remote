import type { Ref, ShallowRef } from 'vue'

import type {
    RemoteReceiver,
    RemoteReceiverAttachable as Attachable,
    RemoteReceiverAttachableChild as AttachableChild,
} from '@remote-ui/core'

import type {
    Attached,
    ShallowAttached,
} from '../../types/host'

import type { Unknown } from '../../types/scaffolding'

import {
    computed,
    shallowRef,
    watch,
} from 'vue'

import {
    retain,
    release,
} from '@remote-ui/core'

const isUpdated = <T extends Attachable>(a: T | null, b: T | null): boolean => {
    return a?.id !== b?.id || a?.version !== b?.version
}

// eslint-disable-next-line max-lines-per-function
export const shallowAttach = <T extends Attachable>(
    receiver: RemoteReceiver,
    attachable: T
): ShallowAttached<T> => {
    const node = shallowRef<T | null>({ ...attachable })

    const attachableRef = shallowRef(attachable)
    const receiverRef = shallowRef(receiver)

    const updateAttached = () => {
        const newAttached = receiverRef.value.attached.get(attachableRef.value)

        if (isUpdated(newAttached, node.value)) {
            node.value = newAttached && { ...newAttached }
        }
    }

    let stopListening: () => void = () => {}

    const updateListener = () => {
        stopListening()
        stopListening = receiverRef.value.attached.subscribe(
            attachableRef.value,
            updateAttached
        )
    }

    const update = () => {
        updateListener()
        updateAttached()
    }

    const props: Ref<Unknown | undefined> = computed(() => {
        const a = node.value as T | null
        return a && 'props' in a ? a.props as Unknown | undefined : undefined
    })

    const stopWatchRefs = watch([receiverRef, attachableRef], update)
    const stopWatchProps = watch(props, (
        newProps,
        oldProps
    ) => {
        release(oldProps)
        retain(newProps)
    })

    return {
        node: node as ShallowRef<T | null>,
        props,
        update,
        release: () => {
            stopWatchRefs()
            stopWatchProps()
            stopListening()
            release(props.value)
        },
    }
}

const childrenOf = (parent: Attachable | null) => {
    return parent && 'children' in parent ? parent.children : []
}

type AttachFn<A extends Attachable = Attachable> = (attachable: A) => Attached<A>

const attachChildren = <T extends Attachable>(
    node: ShallowRef<T | null>,
    attach: AttachFn<AttachableChild>
) => {
    const attached: ShallowRef<Attached[]> = shallowRef(childrenOf(node.value).map(attach))

    const update = () => attached.value.forEach(({ update }) => update())
    const release = () => attached.value.forEach(({ release }) => release())

    const stopWatch = watch(node, () => {
        release()
        attached.value = childrenOf(node.value).map(attach)
        update()
    })

    return {
        attached,
        update,
        release,
        stopWatch,
    }
}

export const attach = <T extends Attachable>(
    receiver: RemoteReceiver,
    attachable: T
): Attached<T> => {
    const parent = shallowAttach(receiver, attachable)
    const children = attachChildren(
        parent.node,
        (child: AttachableChild) => attach(receiver, child)
    )

    return {
        node: parent.node,
        props: parent.props,
        children: children.attached,
        // TODO: Check if parent update invokes children update because of watch in attachChildren method
        update: () => {
            parent.update()
            children.update()
        },
        release: () => {
            children.stopWatch()
            children.release()
            parent.release()
        },
    }
}
