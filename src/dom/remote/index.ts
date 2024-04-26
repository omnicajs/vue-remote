export type { Channel } from '@/dom/common/channel'

export type {
  SchemaType,
  TypeOf,
  PropertiesOf,
  MethodsOf,
  ChildrenOf,
  UnknownType,
} from './schema'

export type {
  RemoteComment,
  RemoteComponent,
  RemoteComponentDescriptor,
  RemoteComponentOption,
  RemoteFragment,
  RemoteRoot,
  RemoteRootOptions,
  RemoteText,
  SchemaOf,
  SupportedBy,
} from './tree'

export {
  release,
  retain,
} from '@remote-ui/rpc'

export { createChannel } from '@/dom/common/channel'
export { createRemoteRoot } from './tree/root'
export { defineRemoteComponent } from './tree/component'

export {
  isRemoteComment,
  isRemoteComponent,
  isRemoteFragment,
  isRemoteText,
} from './tree'

export {
  ACTION_MOUNT,
  ACTION_INSERT_CHILD,
  ACTION_REMOVE_CHILD,
  ACTION_UPDATE_PROPERTIES,
  ACTION_UPDATE_TEXT,
} from '@/dom/common/channel'

export {
  KIND_COMMENT,
  KIND_COMPONENT,
  KIND_FRAGMENT,
  KIND_ROOT,
  KIND_TEXT,
  ROOT_ID,
} from '@/dom/common/tree'
