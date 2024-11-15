export type {
  Channel,
  SchemaType,
  TypeOf,
  PropertiesOf,
  ChildrenOf,
  UnknownType,
  RemoteComment,
  RemoteComponent,
  RemoteComponentDescriptor,
  RemoteFragment,
  RemoteRoot,
  RemoteRootOptions,
  RemoteText,
  SchemaOf,
  SupportedBy,
} from '@/dom/remote'

export { default as createRemoteRenderer } from '@/vue/remote/createRemoteRenderer'
export { default as createRemoteRoot } from '@/vue/remote/createRemoteRoot'
export { default as defineRemoteComponent } from '@/vue/remote/defineRemoteComponent'

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
} from '@/dom/remote'
