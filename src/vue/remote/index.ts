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

export type {
  RemoteElementProperties,
  RemoteElementProxy,
  RemoteElementRef,
  RemoteElementSchema,
  RemoteElementTagName,
} from '@/vue/remote/types'

export type { RemoteLifecycleReason } from '@/common/lifecycle'

export { default as createRemoteRenderer } from '@/vue/remote/createRemoteRenderer'
export { default as createRemoteRoot } from '@/vue/remote/createRemoteRoot'
export { default as defineRemoteComponent } from '@/vue/remote/defineRemoteComponent'
export { default as defineRemoteMethod } from '@/vue/remote/defineRemoteMethod'
export { default as nextTick } from '@/vue/remote/nextTick'
export {
  withKeys,
  withModifiers,
} from '@/vue/remote/events'

export {
  RemoteLifecycleError,
  REMOTE_LIFECYCLE_REASON_HOST_DISCONNECTED,
  REMOTE_LIFECYCLE_REASON_HOST_UNMOUNTED,
  REMOTE_LIFECYCLE_REASON_RECEIVER_REPLACED,
  REMOTE_LIFECYCLE_REASON_RUNTIME_UNAVAILABLE,
} from '@/common/lifecycle'

export {
  ACTION_MOUNT,
  ACTION_INSERT_CHILD,
  ACTION_REMOVE_CHILD,
  ACTION_SYSTEM_CALL,
  ACTION_UPDATE_PROPERTIES,
  ACTION_UPDATE_TEXT,
  KIND_COMMENT,
  KIND_COMPONENT,
  KIND_FRAGMENT,
  KIND_ROOT,
  KIND_TEXT,
  ROOT_ID,
  SYSTEM_CALL_AWAIT_HOST_COMMIT,
} from '@/dom/remote'
