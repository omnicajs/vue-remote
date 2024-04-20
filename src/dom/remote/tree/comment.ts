import type { RemoteRootContext } from '@/dom/remote/context'

import type {
  RemoteComment,
  UnknownRoot,
} from '@/dom/remote/tree'

import { ACTION_UPDATE_TEXT } from '@/dom/common/channel'
import { KIND_COMMENT } from '@/dom/common/tree'

export const createRemoteComment = <Root extends UnknownRoot>(
  content: string,
  root: Root,
  context: RemoteRootContext
) => {
  const id = context.nextId()
  const data = { text: content }
  const node = {
    kind: KIND_COMMENT,
    get id () { return id },
    get root () { return root },
    get text () { return data.text },
    update: (text) => context.update(
      node,
      channel => channel(ACTION_UPDATE_TEXT, node.id, text),
      () => data.text = text
    ),
    serialize: () => ({ id, kind: KIND_COMMENT, text: data.text }),
    remove: () => node.parent?.removeChild(node),
  } as RemoteComment<Root>

  context.collect(node)

  return node
}
