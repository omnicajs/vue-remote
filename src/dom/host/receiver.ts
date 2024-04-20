import type {
  Channel,
  Runner,
} from '@/dom/common/channel'

import type { Context } from './context'
import type { EventHandler } from './emitter'
import type { InvokeHandler } from './invoker'
import type { UpdateHandler } from './updater'

import type {
  Received,
  ReceivedChild,
  ReceivedComment,
  ReceivedComponent,
  ReceivedFragment,
  ReceivedParent,
  ReceivedRoot,
  ReceivedText,
} from '@/dom/host/tree'

import {
  retain,
  release,
} from '@remote-ui/rpc'

import { createChannel } from '@/dom/common'
import { createContext } from './context'
import { createEmitter } from './emitter'
import { createInvoker } from './invoker'
import { createUpdater } from './updater'

import {
  addVersion,
  deserialize,
  isReceivedFragment,
} from '@/dom/host/tree'

import {
  addMethod,
  keysOf,
} from '@/common/scaffolding'

import { isSerializedFragment } from '@/dom/common/tree'

export interface ReceivedTree {
  readonly root: ReceivedRoot;
  get<T extends Received>({ id }: Pick<T, 'id'>): T | null;
  invokable<T extends Received>({ id }: Pick<T, 'id'>, handler: InvokeHandler): () => void;
  updatable<T extends Received>({ id }: Pick<T, 'id'>, handler: UpdateHandler<T>): () => void;
}

export interface Receiver {
  readonly receive: Channel;
  readonly tree: ReceivedTree;
  readonly state: 'mounted' | 'unmounted';
  on (event: 'mount', handler: EventHandler): () => void;
  flush (): Promise<void>;
}

type Updater = ReturnType<typeof createUpdater>
type Emitter = ReturnType<typeof createEmitter>

const attach = <T extends ReceivedChild | ReceivedFragment>(node: T, context: Context) => {
  retain(node)
  context.attach(node)
  return node
}

const insert = <T>(target: T[], el: T, after: number) => {
  if (after === target.length) {
    target.push(el)
  } else {
    target.splice(after, 0, el)
  }
}

const remove = <T>(target: T[], criteria: (el: T) => boolean) => {
  const at = target.findIndex(criteria)
  return at > 0 ? target.splice(at, 1)[0] : undefined
}

const awaitUpdate = (node: Received, updater: Updater) => {
  node.version += 1
  return updater.enqueueUpdate(node)
}

const enqueueUpdate = (node: Received, updater: Updater) => {
  // noinspection JSIgnoredPromiseFromCall
  awaitUpdate(node, updater)
}

const addMountMethod = (
  context: Context,
  updater: Updater,
  emitter: Emitter
) => addMethod<Runner['mount']>(context, 'mount', (children) => {
  const root = context.root

  root.children = children.map(c => {
    const node = deserialize(c, addVersion)

    retain(node)
    context.attach(node)

    return node
  })

  awaitUpdate(root, updater).then(() => {
    context.state = 'mounted'
    emitter.emit('mount')
  })
})

const addInsertMethod = (
  context: Context,
  updater: Updater
) => addMethod<Runner['insertChild']>(context, 'insertChild', (
  parentId,
  after,
  child,
  oldParentId
) => {
  const parent = context.get(parentId) as ReceivedParent
  const oldParent = parentId === oldParentId
    ? parent
    : oldParentId !== false
      ? context.get<ReceivedParent>(oldParentId)
      : undefined

  let received: ReceivedChild

  if (oldParent) {
    received = remove(oldParent.children, c => c.id === child.id)!

    if (parentId !== oldParentId) {
      enqueueUpdate(oldParent, updater)
    }
  } else {
    received = attach(deserialize(child, addVersion), context)
  }

  insert(parent.children, received, after)
  enqueueUpdate(parent, updater)
})

const addRemoveMethod = (
  context: Context,
  updater: Updater
) => addMethod<Runner['removeChild']>(context, 'removeChild', (id, index) => {
  const node = context.get(id) as ReceivedParent
  const [removed] = node.children.splice(index, 1)

  context.detach(removed)

  awaitUpdate(node, updater).then(() => release(removed))
})

const addUpdatePropertiesMethod = (
  context: Context,
  updater: Updater
) => addMethod<Runner['updateProperties']>(context, 'updateProperties', (id, newProperties) => {
  const component = context.get(id) as ReceivedComponent

  const oldProperties = { ...component.properties }

  retain(newProperties)
  keysOf(newProperties).forEach(key => {
    const newProp = newProperties[key]
    const oldProp = oldProperties[key]
    if (isReceivedFragment(oldProp)) {
      context.detach(oldProp)
    }
    if (isSerializedFragment(newProp)) {
      context.attach(deserialize(newProp, addVersion))
    }
  })

  Object.assign(component.properties, newProperties)

  awaitUpdate(component, updater).then(() => {
    keysOf(newProperties).forEach(k => release(oldProperties[k]))
  })
})

const addUpdateTextMethod = (
  context: Context,
  updater: Updater
) => addMethod<Runner['updateText']>(context, 'updateText', (id, text) => {
  const node = context.get(id) as ReceivedComment | ReceivedText

  node.text = text

  enqueueUpdate(node, updater)
})

const addInvokeMethod = (
  context: Context,
  invoker: ReturnType<typeof createInvoker>
) => {
  addMethod<Runner['invoke']>(context, 'invoke', (
    id,
    method,
    payload,
    resolve,
    reject
  ) => {
    invoker.invoke(id, method, payload, resolve, reject)
  })
}

interface ReceiverContext extends Context, Runner {}

export function createReceiver(): Receiver {
  const context = createContext() as ReceiverContext
  const emitter = createEmitter()
  const invoker = createInvoker()
  const updater = createUpdater()

  addMountMethod(context, updater, emitter)
  addInsertMethod(context, updater)
  addUpdatePropertiesMethod(context, updater)
  addUpdateTextMethod(context, updater)
  addRemoveMethod(context, updater)
  addInvokeMethod(context, invoker)

  return {
    get state () { return context.state },

    receive: createChannel(context),

    tree: {
      get root () { return context.root },

      get <T extends Received>({ id }: Pick<T, 'id'>) {
        return context.get<T>(id)
      },

      invokable <T extends Received>({ id }: Pick<T, 'id'>, handler: InvokeHandler) {
        return invoker.register(id, handler)
      },

      updatable <T extends Received>({ id }: Pick<T, 'id'>, handler: UpdateHandler<T>) {
        return updater.register({ id }, handler)
      },
    },

    on: (event, handler) => emitter.on(event, handler),

    flush: () => updater.flush(),
  }
}
