import type { TreeContext } from '@/dom/remote/context'

import type {
  RemoteRoot,
  RemoteText,
} from '@/dom/remote/tree'

import { ACTION_UPDATE_TEXT } from '@/dom/common/channel'
import { KIND_TEXT } from '@/dom/common/tree'

export const createRemoteText = <Root extends RemoteRoot>(
  content: string,
  root: Root,
  context: TreeContext
) => {
  const id = context.nextId()
  const data = { text: content }
  const node = {
    kind: KIND_TEXT,
    get id () { return id },
    get root () { return root },
    get text () { return data.text },
    update: (text) => context.update(
      node,
      channel => channel(ACTION_UPDATE_TEXT, node.id, text),
      () => data.text = text
    ),
    serialize: () => ({ id, kind: KIND_TEXT, text: data.text }),
    remove: () => node.parent?.removeChild(node),
    print: () => `Text(${data.text})`,
  } as RemoteText<Root>

  context.collect(node)

  return node
}
