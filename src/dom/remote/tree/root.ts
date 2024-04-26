import type { Channel } from '@/dom/common/channel'

import type { TreeContext } from '@/dom/remote/context'

import type {
  RemoteRoot,
  RemoteRootOptions,
  SupportedBy,
} from '@/dom/remote/tree'

import { createTreeContext } from '@/dom/remote/context'

import { createRemoteComment } from '@/dom/remote/tree/comment'
import { createRemoteComponent } from '@/dom/remote/tree/component'
import { createRemoteFragment } from '@/dom/remote/tree/fragment'
import { createRemoteText } from '@/dom/remote/tree/text'

import {
  normalizeChild,
  normalizeChildren,
} from '@/dom/remote/tree'

import {
  addMethod,
  arraify,
  capture,
} from '@/common/scaffolding'

import { ACTION_MOUNT } from '@/dom/common/channel'

import {
  KIND_ROOT,
  ROOT_ID,
} from '@/dom/common/tree'

export function createRemoteRoot<
  Supports extends SupportedBy<RemoteRoot> = SupportedBy<RemoteRoot>
>(channel: Channel, {
  components,
  strict = true,
}: RemoteRootOptions<Supports> = {}): RemoteRoot<Supports> {
  const context = createTreeContext(channel, {
    components,
    strict,
  })

  const root = {
    kind: KIND_ROOT,
    options: capture({ strict, components }, strict),
    get id () { return ROOT_ID },
    get children () { return context.children },
    removeChild: (child) => context.removeChild(root, child),
  } as RemoteRoot<Supports>

  addCreateCommentMethod(root, context)
  addCreateComponentMethod(root, context)
  addCreateFragmentMethod(root, context)
  addCreateTextMethod(root, context)

  addMountMethod(root, context)

  addAppendMethod(root, context)
  addInsertMethod(root, context)
  addReplaceMethod(root, context)

  return root
}

function addCreateCommentMethod<R extends RemoteRoot>(root: R, context: TreeContext<R>) {
  addMethod<R['createComment']>(root, 'createComment', (text = '') => {
    return createRemoteComment(text, root, context)
  })
}

function addCreateComponentMethod<R extends RemoteRoot>(root: R, context: TreeContext<R>) {
  addMethod<R['createComponent']>(root, 'createComponent', (type, ...rest) => {
    const components = root.options.components
    if (components && !components.some(c => c === type || c.type === type)) {
      throw new Error(`Unsupported component: ${type}`)
    }

    const _type = components?.find(c => c === type || c.type === type) ?? type

    const [properties, children, ...restChildren] = rest

    return createRemoteComponent(_type, properties, [
      ...arraify(children ?? []) as R['children'],
      ...restChildren,
    ], root, context)
  })
}

function addCreateFragmentMethod<R extends RemoteRoot>(root: R, context: TreeContext<R>) {
  addMethod(root, 'createFragment', () => createRemoteFragment(root, context))
}

function addCreateTextMethod<R extends RemoteRoot>(root: R, context: TreeContext<R>) {
  addMethod<R['createText']>(root, 'createText', (text = '') => {
    return createRemoteText(text, root, context)
  })
}

function addMountMethod<R extends RemoteRoot>(root: R, context: TreeContext<R>) {
  addMethod<R['mount']>(root, 'mount', () => {
    if (context.mounted) {
      return Promise.resolve()
    }

    context.mounted = true

    return Promise.resolve(context.channel(
      ACTION_MOUNT,
      context.children.map(c => c.serialize())
    ))
  })
}

function addAppendMethod<R extends RemoteRoot>(
  root: R,
  context: TreeContext
) {
  addMethod<R['append']>(root, 'append', (...children) => {
    context.append(root, normalizeChildren(children, root))
  })
}

function addInsertMethod<R extends RemoteRoot>(
  root: R,
  context: TreeContext
) {
  addMethod<R['insertBefore']>(root, 'insertBefore', (
    child,
    before
  ) => {
    context.insert(root, normalizeChild(child, root), before)
  })
}

function addReplaceMethod<R extends RemoteRoot>(
  root: R,
  context: TreeContext
) {
  addMethod<R['replace']>(root, 'replace', (...children) => {
    context.replace(root, normalizeChildren(children, root))
  })
}
