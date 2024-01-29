import type {
    RemoteComponent,
    RemoteRoot,
    RemoteText,
} from '@remote-ui/core'

import { createRenderer } from 'vue'

import {
    isRemoteText,
    isRemoteComponent,
} from '@remote-ui/core'

import { InternalNodeType } from '@/internals'

type Component<Root extends RemoteRoot = RemoteRoot> = RemoteComponent<string, Root>
type Node<Root extends RemoteRoot = RemoteRoot> = Component<Root> | RemoteText<Root>

const nextSibling = <Root extends RemoteRoot = RemoteRoot>(node: Node<Root>) => {
    const { parent } = node

    if (parent == null) {
        return null
    }

    const { children } = parent

    return (children[children.indexOf(node) + 1] ?? null) as Node<Root> | null
}

const setElementText = <Root extends RemoteRoot = RemoteRoot>(
    element: Component<Root>,
    text: string
) => {
    const [node] = element.children
    if (node && isRemoteText(node)) {
        node.update(text)
    } else {
        element.replaceChildren(text)
    }
}

const setText = <Root extends RemoteRoot = RemoteRoot>(
    node: Node<Root>,
    text: string
) => {
    if (isRemoteText(node)) {
        node.update(text)
    } else {
        setElementText(node as Component<Root>, text)
    }
}

export default <Root extends RemoteRoot = RemoteRoot>(root: Root) => createRenderer<
  Node<Root>,
  Component<Root> | Root
>({
    patchProp (element, key, _, next) {
        if (!isRemoteComponent(element)) {
            throw new Error('Unexpected: Attempt to patch props on a root node')
        }

        element.updateProps({ [key]: next })
    },

    insert: (child, parent, anchor) => parent.insertBefore(child, anchor),
    remove: node => node.parent?.removeChild(node),
    createElement: type => root.createComponent(type) as Component<Root> | Root,
    createText: text => root.createText(text) as Node<Root>,
    createComment: text =>  root.createComponent(InternalNodeType.RemoteComment, { text }) as Component<Root>,
    parentNode: node => node.parent,
    nextSibling,
    setText,
    setElementText,
})