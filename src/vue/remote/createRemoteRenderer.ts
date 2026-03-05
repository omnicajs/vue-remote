import type {
  RemoteComment,
  RemoteComponent,
  RemoteFragment,
  RemoteRoot,
  RemoteText,
} from '@/dom/remote'
import type { ElementNamespace } from 'vue'
import type { ParsedNode } from '@/vue/remote/parser'

import { createRenderer } from 'vue'

import {
  isRemoteText,
} from '@/dom/remote'

import {
  NODE_TYPE_COMMENT,
  NODE_TYPE_TEXT,
  parseStaticContent,
} from '@/vue/remote/parser'

type Component<Root extends RemoteRoot = RemoteRoot> = RemoteComponent<string, Root>
type Node<Root extends RemoteRoot = RemoteRoot> =
  | Component<Root>
  | RemoteComment<Root>
  | RemoteText<Root>

type Parent<Root extends RemoteRoot = RemoteRoot> = Component<Root> | Root | RemoteFragment<Root>

const nextSibling = <Root extends RemoteRoot = RemoteRoot>(node: Node<Root>) => {
  return (node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null) as Node<Root> | null
}

const setElementText = <Root extends RemoteRoot = RemoteRoot>(
  element: Root | Component<Root>,
  text: string
) => {
  const [node] = element.children
  if (node && isRemoteText(node)) {
    node.update(text)
  } else {
    element.replace(text)
  }
}

const setText = <Root extends RemoteRoot = RemoteRoot>(
  node: Node<Root>,
  text: string
) => {
  (node as RemoteText<Root> | RemoteComment<Root>).update(text)
}

const createFromParsedNode = <Root extends RemoteRoot = RemoteRoot>(
  root: Root,
  node: ParsedNode
): Node<Root> => {
  if (node.type === NODE_TYPE_TEXT) {
    return root.createText(node.text) as Node<Root>
  }

  if (node.type === NODE_TYPE_COMMENT) {
    return root.createComment(node.text) as Node<Root>
  }

  const component = root.createComponent(node.tag, node.properties) as Component<Root>
  const children = node.children
    .map(child => createFromParsedNode(root, child))

  children.forEach(child => component.append(child))

  return component
}

const insertStaticContent = <Root extends RemoteRoot = RemoteRoot>(
  root: Root,
  content: string,
  parent: Parent<Root>,
  anchor: Node<Root> | null,
  namespace: ElementNamespace
): [Node<Root>, Node<Root>] => {
  const nodes = parseStaticContent(content, namespace)
    .map(node => createFromParsedNode(root, node))

  if (nodes.length === 0) {
    const placeholder = root.createText('') as Node<Root>
    parent.insertBefore(placeholder, anchor)
    return [placeholder, placeholder]
  }

  nodes.forEach((node) => parent.insertBefore(node, anchor))

  return [nodes[0], nodes[nodes.length - 1]]
}

export default <Root extends RemoteRoot = RemoteRoot>(root: Root) => createRenderer<
  Node<Root>,
  Component<Root> | Root
>({
  patchProp (element, key, _, next) {
    (element as Component<Root>).updateProperties({ [key]: next })
  },

  insert: (child, parent, anchor) => parent.insertBefore(child, anchor),
  remove: node => node.parent?.removeChild(node),
  createElement: type => root.createComponent(type) as Component<Root> | Root,
  createText: text => root.createText(text) as Node<Root>,
  createComment: text => root.createComment(text) as Node<Root>,
  parentNode: node => node.parent,
  nextSibling,
  setText,
  setElementText,

  insertStaticContent: (content, parent, anchor, namespace) => {
    return insertStaticContent(root, content, parent as Parent<Root>, anchor as Node<Root> | null, namespace)
  },
})
