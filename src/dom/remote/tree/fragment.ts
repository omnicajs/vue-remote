import type {
  RemoteFragmentData,
  RemoteRootContext,
} from '@/dom/remote/context'

import type {
  RemoteFragment,
  UnknownRoot,
} from '@/dom/remote/tree'

import {
  normalizeChild,
  normalizeChildren,
} from '@/dom/remote/tree'

import { capture } from '@/common/scaffolding'

import { KIND_FRAGMENT } from '@/dom/common/tree'

export const createRemoteFragment = <Root extends UnknownRoot>(
  root: Root,
  context: RemoteRootContext
) => {
  const id = context.nextId()
  const data: RemoteFragmentData = { children: capture([], context.strict) }
  const fragment = {
    kind: KIND_FRAGMENT,
    get id () { return id },
    get root () { return root },
    get children () { return data.children },
    append: (...children) => context.append(fragment, normalizeChildren(children, root)),
    insertBefore: (child, before) => context.insert(
      fragment, normalizeChild(child, root), before
    ),
    replace: (...children) => context.replace(fragment, normalizeChildren(children, root)),
    removeChild: (child) => context.removeChild(fragment, child),
    serialize: () => ({
      id,
      kind: KIND_FRAGMENT,
      children: data.children.map(c => c.serialize()),
    }),
  } as RemoteFragment<Root>

  context.collect(fragment)
  context.fragments.set(fragment, data)

  return fragment
}