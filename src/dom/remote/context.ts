import type { Channel } from '@/dom/common/channel'

import type {
  RemoteComponent,
  RemoteComponentOption,
  RemoteFragment,
  RemoteRoot,
  RemoteRootOptions,
  SchemaOf,
  SupportedBy,
  UnknownChild,
  UnknownNode,
  UnknownParent,
} from '@/dom/remote/tree'

import { isRemoteFragment } from '@/dom/remote/tree'

import {
  addMethod,
  capture,
} from '@/common/scaffolding'

import {
  ACTION_INSERT_CHILD,
  ACTION_REMOVE_CHILD,
  ACTION_INVOKE,
} from '@/dom/common/channel'

import {
  KIND_COMPONENT,
  KIND_FRAGMENT,
  KIND_ROOT,
} from '@/dom/common/tree'

export interface RemoteComponentData {
  properties: {
    original: { readonly [key: string]: unknown };
    serializable: { readonly [key: string]: unknown };
  };
  children: ReadonlyArray<UnknownChild>;
}

export interface RemoteFragmentData {
  children: ReadonlyArray<UnknownChild>;
}

export interface TreeData<R extends RemoteRoot = RemoteRoot> {
  strict: boolean;
  mounted: boolean;
  channel: Channel;
  nodes: WeakSet<UnknownNode>;
  progenitors: WeakMap<UnknownNode, UnknownParent>;
  parents: WeakMap<UnknownNode, UnknownParent>;
  components: WeakMap<RemoteComponent<SupportedBy<R>, R>, RemoteComponentData>;
  fragments: WeakMap<
    RemoteFragment<R>,
    RemoteFragmentData
  >;
  children: R['children'];
}

export interface TreeContext<R extends RemoteRoot = RemoteRoot> extends TreeData<R> {
  nextId (): string;

  collect (node: UnknownNode): void

  attach (parent: UnknownParent, node: UnknownNode): void;

  detach (node: UnknownNode): void;

  append (parent: UnknownParent, children: UnknownChild[]): void;

  insert (
    parent: UnknownParent,
    child: UnknownChild,
    before: UnknownChild | undefined | null
  ): void;

  update (
    node: UnknownChild | UnknownParent,
    remote: (channel: Channel) => void | Promise<void>,
    local: () => void
  ): void;

  replace (
    parent: UnknownParent,
    children: UnknownChild[]
  ): void;

  removeChild (
    parent: UnknownParent,
    child: UnknownChild
  ): void;

  invoke (
    node: RemoteComponent<SupportedBy<R>, R>,
    method: string,
    payload: unknown[]
  ): Promise<unknown>
}

const traverse = (element: UnknownNode, each: (item: UnknownNode) => void) => {
  const _traverse = (element: UnknownNode) => {
    if ('children' in element) {
      for (const child of element.children) {
        each(child)
        _traverse(child)
      }
    }
  }

  _traverse(element)
}

function attach (
  context: TreeData,
  parent: UnknownParent,
  node: UnknownNode
) {
  const { progenitors, parents } = context
  const progenitor = parent.kind === KIND_ROOT ? parent : parent.progenitor

  if (progenitor) {
    progenitors.set(node, progenitor)
  }

  parents.set(node, parent)

  attachFragments(context, node)

  traverse(node, (descendant) => {
    if (progenitor) {
      progenitors.set(descendant, progenitor)
    }

    attachFragments(context, descendant)
  })
}

function attachFragments (context: TreeData, node: UnknownNode) {
  if (node.kind === KIND_COMPONENT) {
    Object.values(node.properties).forEach(prop => {
      if (isRemoteFragment(prop)) {
        attach(context, node, prop)
      }
    })
  }
}

function detach (context: TreeData, node: UnknownNode) {
  const { progenitors, parents } = context

  progenitors.delete(node)
  parents.delete(node)

  traverse(node, (descendant) => {
    progenitors.delete(descendant)
    detachFragments(context, descendant)
  })

  detachFragments(context, node)
}

function detachFragments (context: TreeData, node: UnknownNode) {
  if (node.kind !== KIND_COMPONENT) {
    return
  }

  const properties = node.properties
  for (const key of Object.keys(properties)) {
    const p = properties[key]
    if (isRemoteFragment(p)) {
      detach(context, p)
    }
  }
}

const update = (
  context: TreeData,
  node: UnknownChild | UnknownParent,
  remote: (channel: Channel) => void | Promise<void>,
  local: () => void
) => {
  if (context.mounted && (node.kind === KIND_ROOT || node.progenitor?.kind === KIND_ROOT)) {
    // should only create context once async queue is cleared
    remote(context.channel)

    // technically, we should be waiting for the remote update to apply,
    // then apply it locally. The implementation below is too naive because
    // it allows local updates to get out of sync with remote ones.
    // if (remoteResult == null || !('then' in remoteResult)) {
    //   local();
    //   return;
    // } else {
    //   return remoteResult.then(() => {
    //     local();
    //   });
    // }
  }

  local()
}

type ParentData = TreeData | RemoteComponentData | RemoteFragmentData

function dataOf (context: TreeData, parent: UnknownParent): ParentData | undefined {
  switch (parent?.kind) {
    case KIND_COMPONENT:
      return context.components.get(parent)
    case KIND_FRAGMENT:
      return context.fragments.get(parent)
    case KIND_ROOT:
      return context
  }
}

const insertToArray = <T>(target: T[], el: T, before: T | undefined | null) => {
  if (before == null) {
    target.push(el)
  } else {
    target.splice(target.indexOf(before), 0, el)
  }

  return target
}

const remoteFromArray = <T>(target: T[] | readonly T[], index: number) => {
  const result = [...target]
  result.splice(index, 1)
  return result
}

const insert = (
  context: TreeData,
  parent: UnknownParent,
  child: UnknownChild,
  before: UnknownChild | undefined | null = null
) => {
  const currentParent = child.parent
  const currentIndex = currentParent?.children.indexOf(child) ?? -1

  attach(context, parent, child)

  let newChildren: UnknownChild[]

  const parentData = dataOf(context, parent)!

  if (currentParent) {
    const currentParentData = dataOf(context, currentParent)!
    const currentChildren = remoteFromArray(currentParentData.children, currentIndex)

    if (currentParent === parent) {
      newChildren = currentChildren
    } else {
      currentParentData.children = capture(currentChildren, context.strict)

      newChildren = [...parentData.children]
    }
  } else {
    newChildren = [...parentData.children]
  }

  parentData.children = capture(insertToArray(newChildren, child, before), context.strict)
}

const appendChild = (
  context: TreeData,
  parent: UnknownParent,
  child: UnknownChild
) => {
  if (!context.nodes.has(child)) {
    throw new Error('Cannot append a node that was not created by this remote root')
  }

  const currentParent = child.parent
  const currentIndex = currentParent?.children.indexOf(child) ?? -1

  return update(context, parent, (channel) => {
    channel(
      ACTION_INSERT_CHILD,
      parent.id,
      currentIndex < 0
        ? parent.children.length
        : parent.children.length - 1,
      child.serialize(),
      currentParent ? currentParent.id : false
    )
  }, () => insert(context, parent, child))
}

const insertBefore = (
  context: TreeData,
  parent: UnknownParent,
  child: UnknownChild,
  before: UnknownChild | undefined | null
) => {
  if (!context.nodes.has(child)) {
    throw new Error('Cannot insert a node that was not created by this remote root')
  }

  if (before && before.id === child.id) return
  if (before && !parent.children.includes(before)) {
    throw new DOMException(
      'Cannot add a child before an element that is not a child of the target parent.',
      'HierarchyRequestError'
    )
  }

  const oldIndex = parent.children.indexOf(child) ?? -1
  const oldParent = child.parent

  const beforeIndex = before ? parent.children.indexOf(before) : -1

  return update(context, parent,  (channel) => channel(
    ACTION_INSERT_CHILD,
    parent.id,
    beforeIndex < 0
      ? parent.children.length
      : oldIndex < 0 || oldIndex > beforeIndex ? beforeIndex : beforeIndex - 1,
    child.serialize(),
    oldParent ? oldParent.id : false
  ), () => insert(context, parent, child, before))
}

/** @TODO: Объединение удаления нескольких узлов в один запрос */
const removeChild = (
  context: TreeData,
  parent: UnknownParent,
  child: UnknownChild
) => {
  const data = dataOf(context, parent)!

  return update(context, parent, (channel) => channel(
    ACTION_REMOVE_CHILD,
    parent.id,
    parent.children.indexOf(child)
  ), () => {
    detach(context, child)

    data.children = capture(remoteFromArray(
      data.children,
      data.children.indexOf(child)
    ), context.strict)
  })
}

const addAttachMethod = (context: TreeData) => addMethod(context, 'attach', (
  parent: UnknownParent,
  node: UnknownNode
) => attach(context, parent, node))

const addDetachMethod = (context: TreeData) => addMethod(context, 'detach', (
  node: UnknownNode
) => detach(context, node))

const addAppendMethod = (context: TreeData) => addMethod(context, 'append', (
  parent: UnknownParent,
  children: UnknownChild[]
) => {
  for (const child of children) {
    appendChild(context, parent, child)
  }
})

const addUpdateMethod = (context: TreeData) => addMethod(context, 'update', (
  node: UnknownChild | UnknownParent,
  remote: (channel: Channel) => void | Promise<void>,
  local: () => void
) => update(context, node, remote, local))

const addReplaceMethod = (context: TreeData) => addMethod(context, 'replace', (
  parent: UnknownParent,
  children: UnknownChild[]
) => {
  for (const child of parent.children) {
    removeChild(context, parent, child)
  }

  for (const child of children) {
    appendChild(context, parent, child)
  }
})

type CollectMethod = TreeContext['collect']

const addCollectMethod = (context: TreeData) => addMethod<CollectMethod>(context, 'collect', node => {
  if (context.nodes.has(node)) {
    return
  }

  context.nodes.add(node)

  Object.defineProperty(node, 'parent', {
    get: () => context.parents.get(node) ?? null,
    configurable: true,
    enumerable: true,
  })

  Object.defineProperty(node, 'progenitor', {
    get: () => context.progenitors.get(node) ?? null,
    configurable: true,
    enumerable: true,
  })
})

type InvokeMethod = TreeContext['invoke']

const addInvokeMethod = (context: TreeData) => addMethod<InvokeMethod>(context, 'invoke', (
  node,
  method,
  payload
) => {
  if (!context.nodes.has(node)) {
    throw new Error('Cannot invoke method for a node that was not created by this remote root')
  }

  return new Promise((resolve, reject) => {
    context.channel(
      ACTION_INVOKE,
      node.id,
      method,
      payload,
      resolve,
      reject
    )
  })
})

const createRemoteRootData = <S extends RemoteComponentOption = RemoteComponentOption>(
  channel: Channel,
  { components, strict = true }: RemoteRootOptions<S> = {}
) => {
  if (strict) {
    Object.freeze(components)
  }

  return {
    strict,
    mounted: false,
    channel,
    children: [],
    nodes: new WeakSet(),
    parents: new WeakMap(),
    progenitors: new WeakMap(),
    components: new WeakMap(),
    fragments: new WeakMap(),
  } as TreeData<RemoteRoot<SchemaOf<S>>>
}

export const createTreeContext = <S extends RemoteComponentOption = RemoteComponentOption>(
  channel: Channel,
  options: RemoteRootOptions<S> = {}
): TreeContext<RemoteRoot<SchemaOf<S>>> => {
  const context = createRemoteRootData(channel, options)

  let lastId = 0

  addMethod(context, 'nextId', () => `${++lastId}`)

  addCollectMethod(context)

  addAttachMethod(context)
  addDetachMethod(context)
  addAppendMethod(context)
  addUpdateMethod(context)

  addMethod(context, 'insert', (
    parent: UnknownParent,
    child: UnknownChild,
    before: UnknownChild | undefined | null
  ) => insertBefore(context, parent, child, before))

  addMethod(context, 'removeChild', (
    parent: UnknownParent,
    child: UnknownChild
  ) => removeChild(context, parent, child))

  addReplaceMethod(context)
  addInvokeMethod(context)

  return context as TreeContext<RemoteRoot<SchemaOf<S>>>
}
