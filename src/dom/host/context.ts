import type { Id } from '@/dom/common'

import type {
  Received,
  ReceivedChild,
  ReceivedFragment,
  ReceivedRoot,
} from './tree'

import { isReceivedFragment } from './tree'

import {
  addMethod,
  keysOf,
} from '@/common/scaffolding'

import {
  KIND_COMPONENT,
  KIND_ROOT,
  ROOT_ID,
} from '@/dom/common'

export interface Context {
  readonly root: ReceivedRoot;
  state: 'mounted' | 'unmounted';
  get <T extends Received = Received> (id: Id): T | null;
  attach (child: ReceivedChild | ReceivedFragment): void;
  detach (child: ReceivedChild | ReceivedFragment): void;
}

export const createContext = () => {
  const root: ReceivedRoot = {
    id: ROOT_ID,
    kind: KIND_ROOT,
    children: [],
    version: 0,
  }

  const all = new Map<Id, Received>([[ROOT_ID, root]])
  const context = {
    get root () { return root },

    state: 'unmounted',

    get (id: Id): Received | null {
      return all.get(id) ?? null
    },
  } as Context

  addMethod<Context['attach']>(context, 'attach', node => attach(all, node))
  addMethod<Context['detach']>(context, 'detach', node => detach(all, node))

  return context
}

function attach (nodes: Map<string, Received>, child: ReceivedChild | ReceivedFragment) {
  nodes.set(child.id, child)

  if (child.kind === KIND_COMPONENT) {
    const { properties } = child
    keysOf(properties).forEach((key) => {
      const prop = properties[key]
      if (isReceivedFragment(prop)) {
        attach(nodes, prop)
      }
    })
  }

  if ('children' in child) {
    child.children.forEach(c => attach(nodes, c))
  }
}

function detach (nodes: Map<string, Received>, child: ReceivedChild | ReceivedFragment) {
  nodes.delete(child.id)

  if (child.kind === KIND_COMPONENT) {
    const { properties } = child

    keysOf(properties).forEach((key) => {
      const prop = properties[key]
      if (isReceivedFragment(prop)) {
        detach(nodes, prop)
      }
    })
  }

  if ('children' in child) {
    child.children.forEach(c => detach(nodes, c))
  }
}