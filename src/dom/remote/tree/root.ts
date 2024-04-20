import type { Channel } from '@/dom/common/channel'

import type { RemoteRootContext } from '@/dom/remote/context'

import type { UnknownType } from '@/dom/remote/schema'

import type {
  Accepts,
  RemoteComponentDescriptor,
  RemoteRoot,
  RemoteRootOptions,
} from '@/dom/remote/tree'

import { createRemoteRootContext } from '@/dom/remote/context'

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
  Supports extends UnknownType = UnknownType,
  Children extends Supports | boolean = true,
>(channel: Channel, {
  components,
  strict = true,
}: RemoteRootOptions<Supports> = {}): RemoteRoot<Supports, Children> {
  const context = createRemoteRootContext(channel, {
    components,
    strict,
  })

  const root = {
    kind: KIND_ROOT,
    options: capture({ strict, components }, strict),
    get id () { return ROOT_ID },
    get children () { return context.children },
    removeChild: (child) => context.removeChild(root, child),
  } as RemoteRoot<Supports, Children>

  addCreateCommentMethod(root, context)
  addCreateComponentMethod(root, context, components)
  addCreateFragmentMethod(root, context)
  addCreateTextMethod(root, context)

  addMountMethod(root, context)

  addAppendMethod(root, context)
  addInsertMethod(root, context)
  addReplaceMethod(root, context)

  return root
}

function addCreateCommentMethod<
  Components extends UnknownType = UnknownType,
  Children extends Components | boolean = true
>(
  root: RemoteRoot<Components, Children>,
  context: RemoteRootContext
) {
  addMethod<RemoteRoot<Components, Children>['createComment']>(root, 'createComment', (text = '') => {
    return createRemoteComment(text, root, context)
  })
}

function addCreateComponentMethod<
  Components extends UnknownType = UnknownType,
  Children extends Components | boolean = true
>(
  root: RemoteRoot<Components, Children>,
  context: RemoteRootContext,
  components: ReadonlyArray<Components | RemoteComponentDescriptor<Components>> | undefined
) {
  addMethod<RemoteRoot<Components, Children>['createComponent']>(root, 'createComponent', (type, ...rest) => {
    if (components && !components.some(c => c === type || c.type === type)) {
      throw new Error(`Unsupported component: ${type}`)
    }

    const _type = components?.find(c => c === type || c.type === type) ?? type

    const [properties, children, ...restChildren] = rest

    return createRemoteComponent(_type, properties, [
      ...arraify(children ?? []) as Accepts<Children, RemoteRoot<Components, Children>, true>[],
      ...restChildren,
    ], root, context)
  })
}

function addCreateFragmentMethod<
  Components extends UnknownType = UnknownType,
  Children extends Components | boolean = true
>(
  root: RemoteRoot<Components, Children>,
  context: RemoteRootContext
) {
  addMethod(root, 'createFragment', () => createRemoteFragment(root, context))
}

function addCreateTextMethod<
  Components extends UnknownType = UnknownType,
  Children extends Components | boolean = true
>(
  root: RemoteRoot<Components, Children>,
  context: RemoteRootContext
) {
  addMethod<RemoteRoot<Components, Children>['createText']>(root, 'createText', (text = '') => {
    return createRemoteText(text, root, context)
  })
}

function addMountMethod<
  Components extends UnknownType = UnknownType,
  Children extends Components | boolean = true
>(
  root: RemoteRoot<Components, Children>,
  context: RemoteRootContext
) {
  addMethod(root, 'mount', () => {
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

function addAppendMethod<
  Components extends UnknownType = UnknownType,
  Children extends Components | boolean = true
>(
  root: RemoteRoot<Components, Children>,
  context: RemoteRootContext
) {
  addMethod<RemoteRoot<Components, Children>['append']>(root, 'append', (...children) => {
    context.append(root, normalizeChildren(children, root))
  })
}

function addInsertMethod<
  Components extends UnknownType = UnknownType,
  Children extends Components | boolean = true
>(
  root: RemoteRoot<Components, Children>,
  context: RemoteRootContext
) {
  addMethod<RemoteRoot<Components, Children>['insertBefore']>(root, 'insertBefore', (
    child,
    before
  ) => {
    context.insert(root, normalizeChild(child, root), before)
  })
}

function addReplaceMethod<
  Components extends UnknownType = UnknownType,
  Children extends Components | boolean = true
>(
  root: RemoteRoot<Components, Children>,
  context: RemoteRootContext
) {
  addMethod<RemoteRoot<Components, Children>['replace']>(root, 'replace', (...children) => {
    context.replace(root, normalizeChildren(children, root))
  })
}
