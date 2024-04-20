export type {
  Id,
  Channel,
} from '@/dom/common'

export type { UpdateHandler } from './updater'

export type {
  Receiver,
  ReceivedTree,
} from './receiver'

export type {
  Received,
  ReceivedChild,
  ReceivedComment,
  ReceivedComponent,
  ReceivedFragment,
  ReceivedParent,
  ReceivedRoot,
  ReceivedText,
} from './tree'

export { createReceiver } from './receiver'

export { isFunction } from '@/common/scaffolding'

export {
  isReceivedComment,
  isReceivedFragment,
  isReceivedText,
} from './tree'

export {
  createChannel,
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
} from '@/dom/common'
