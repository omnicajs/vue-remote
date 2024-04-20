export type { Channel } from '@/dom/host'

export type { UpdateHandler } from '@/dom/host'

export type {
  Receiver,
  ReceivedTree,
} from '@/dom/host'

export type {
  Received,
  ReceivedChild,
  ReceivedComment,
  ReceivedComponent,
  ReceivedFragment,
  ReceivedParent,
  ReceivedRoot,
  ReceivedText,
} from '@/dom/host'

export { default as HostedTree } from '@/vue/host/HostedTree'

export { default as createProvider } from '@/vue/host/createProvider'
export { createReceiver } from '@/dom/host'

export {
  ACTION_MOUNT,
  ACTION_INSERT_CHILD,
  ACTION_REMOVE_CHILD,
  ACTION_UPDATE_PROPERTIES,
  ACTION_UPDATE_TEXT,
  KIND_COMMENT,
  KIND_COMPONENT,
  KIND_FRAGMENT,
  KIND_ROOT,
  KIND_TEXT,
  ROOT_ID,
} from '@/dom/host'
