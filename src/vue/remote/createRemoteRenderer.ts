import type {
  RemoteComment,
  RemoteComponent,
  RemoteFragment,
  RemoteRoot,
  RemoteText,
} from '@/dom/remote'
import type { ElementNamespace } from 'vue'

import { createRenderer } from 'vue'

import {
  isRemoteComponent,
  isRemoteText,
} from '@/dom/remote'

type Component<Root extends RemoteRoot = RemoteRoot> = RemoteComponent<string, Root>
type Node<Root extends RemoteRoot = RemoteRoot> =
  | Component<Root>
  | RemoteComment<Root>
  | RemoteText<Root>

type Parent<Root extends RemoteRoot = RemoteRoot> = Component<Root> | Root | RemoteFragment<Root>

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const MATH_ML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML'

const nextSibling = <Root extends RemoteRoot = RemoteRoot>(node: Node<Root>) => {
  const { parent } = node

  if (parent == null) {
    return null
  }

  const { children } = parent

  return (children[children.indexOf(node) + 1] ?? null) as Node<Root> | null
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
  if (isRemoteText(node)) {
    node.update(text)
  } else {
    setElementText(node as Component<Root>, text)
  }
}

const parseStaticContent = (
  content: string,
  namespace: ElementNamespace
): ChildNode[] => {
  if (namespace === 'svg' || namespace === 'mathml') {
    const parser = new DOMParser()
    const namespaceUri = namespace === 'svg' ? SVG_NAMESPACE : MATH_ML_NAMESPACE
    const wrapped = `<root xmlns="${namespaceUri}">${content}</root>`
    const document = parser.parseFromString(wrapped, 'application/xml')
    const root = document.documentElement

    return [...root.childNodes]
  }

  const template = document.createElement('template')
  template.innerHTML = content

  return [...template.content.childNodes]
}

const createFromDOMNode = <Root extends RemoteRoot = RemoteRoot>(
  root: Root,
  node: ChildNode
): Node<Root> | null => {
  if (node.nodeType === Node.TEXT_NODE) {
    return root.createText(node.textContent ?? '') as Node<Root>
  }

  if (node.nodeType === Node.COMMENT_NODE) {
    return root.createComment(node.textContent ?? '') as Node<Root>
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null
  }

  const element = node as Element
  const properties = [...element.attributes].reduce<Record<string, string>>((acc, attribute) => {
    acc[attribute.name] = attribute.value
    return acc
  }, {})

  const component = root.createComponent(element.localName, properties) as Component<Root>
  const children = [...element.childNodes]
    .map(child => createFromDOMNode(root, child))
    .filter((child): child is Node<Root> => child != null)

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
    .map(node => createFromDOMNode(root, node))
    .filter((node): node is Node<Root> => node != null)

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
    if (!isRemoteComponent(element)) {
      throw new Error('Unexpected: Attempt to patch props on a root node')
    }

    element.updateProperties({ [key]: next })
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