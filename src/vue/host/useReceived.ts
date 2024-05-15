import type {
  Component,
  Ref,
  ShallowRef,
} from 'vue'

import type {
  Receiver,
  Received,
  ReceivedChild,
  ReceivedComment,
  ReceivedComponent,
  ReceivedRoot,
  ReceivedText,
} from '@/dom/host'

import type {
  HostedChild,
  HostedComment,
  HostedComponent,
  HostedRoot,
  HostedText,
} from './tree'

import {
  ref,
  shallowRef,
} from 'vue'

import { isFunction } from '@/dom/host'

import {
  KIND_COMMENT,
  KIND_COMPONENT,
  KIND_ROOT,
  KIND_TEXT,
} from '@/dom/host'

export default function (receiver: Receiver): HostedRoot {
  const root = receiver.tree.root
  const children = useChildren(receiver, root)

  return {
    id: root.id,
    kind: KIND_ROOT,
    children: children.ref,
    update () {
      children.load(root)
    },
    release: fuse([
      receiver.tree.updatable<ReceivedRoot>(root, children.load),
      () => children.ref.value.forEach(c => c.release()),
    ]),
  }
}

export function useComment (
  receiver: Receiver,
  node: ReceivedComment
): HostedComment {
  const text = ref(node.text)

  return {
    id: node.id,
    kind: KIND_COMMENT,
    text,
    update () {
      const n = receiver.tree.get<ReceivedComment>(node)
      if (n) {
        text.value = n.text
      }
    },
    release: receiver.tree.updatable(node, (n: ReceivedComment) => {
      text.value = n.text
    }),
  }
}

export function useComponent (receiver: Receiver, node: ReceivedComponent): HostedComponent {
  const _ref = ref<Component<NonNullable<unknown>> | Element | null>(null)
  const properties = ref(node.properties)
  const children = useChildren(receiver, node)

  const load = (node: ReceivedComponent) => {
    properties.value = node.properties
    children.load(node)
  }

  const release = fuse([
    receiver.tree.updatable<ReceivedComponent>(node, load),
    receiver.tree.invokable<ReceivedComponent>(node, useInvokeHandler(node, _ref)),
    () => children.ref.value.forEach(c => c.release()),
  ])

  return {
    id: node.id,
    kind: KIND_COMPONENT,
    type: node.type,
    ref: _ref,
    properties,
    children: children.ref,
    update: () => {
      const n = receiver.tree.get<ReceivedComponent>(node)
      if (n) {
        load(n)
      }
    },
    release,
  }
}

export function useText (
  receiver: Receiver,
  node: ReceivedText
): HostedText {
  const text = ref(node.text)

  return {
    id: node.id,
    kind: KIND_TEXT,
    text,
    update () {
      const c = receiver.tree.get<ReceivedText>(node)
      if (c) {
        text.value = c.text
      }
    },
    release: receiver.tree.updatable(node, (n: ReceivedText) => {
      text.value = n.text
    }),
  }
}

export function useChild (
  receiver: Receiver,
  child: ReceivedChild
): HostedChild {
  switch (child.kind) {
    case KIND_COMMENT:
      return useComment(receiver, child)
    case KIND_COMPONENT:
      return useComponent(receiver, child)
    case KIND_TEXT:
      return useText(receiver, child)
  }
}

export function useChildren <T extends ReceivedComponent | ReceivedRoot>(
  receiver: Receiver,
  node: T
):{ ref: ShallowRef<HostedChild[]>, load: (node: T) => void} {
  const ref = shallowRef(node.children.map(c => useChild(receiver, c)))
  const load = (node: T) => {
    ref.value.forEach(_old => {
      if (!node.children.some(_new => _new.id === _old.id)) {
        _old.release()
      }
    })
    ref.value = node.children.map(_new => {
      return ref.value.find(_old => _old.id === _new.id) ?? useChild(receiver, _new)
    })
  }

  return { ref, load }
}

export function useInvokeHandler (
  node: ReceivedComponent,
  ref: Ref<Component<NonNullable<unknown>> | Element | null>
) {
  return (method: string, payload: unknown[]) => {
    const el = ref.value
    if (el == null) {
      throw new Error(`${print(node)} not mounted to host environment yet`)
    }

    if (!(method in el)) {
      throw new Error(`${print(node)} doesn't support method ${method}`)
    }

    const callable = el[method as keyof typeof el] as unknown
    if (!isFunction(callable)) {
      throw new Error(`${print(node)} doesn't support method ${method}`)
    }

    return callable.call(el, ...payload)
  }
}

function print <T extends Received>(node: T) {
  const { id, kind } = node
  return 'type' in node
    ? `Node [ID=${id}, KIND=${kind}, TYPE=${node.type}]`
    : `Node [ID=${id}, KIND=${kind}]`
}

function fuse (handlers: Array<() => void>) {
  return () => handlers.forEach(fn => fn())
}
