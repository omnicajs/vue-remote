import type {
  Component,
  DefineComponent,
  EmitsOptions,
  Renderer,
} from 'vue'

import type {
  RemoteChannel,
  RemoteReceiver,
  RemoteReceiverAttachableChild,
  RemoteRoot,
} from '@remote-ui/core'

import type { Provider } from './types/vue/host'

import type {
  RemoteComponentType,
  RemoteRootOptions,
} from './types/remote'

import type { None } from './types/scaffolding'

export declare const AttachedRoot: DefineComponent<{
  provider: Provider;
  receiver: RemoteReceiver;
}>

export declare const AttachedSubtree: DefineComponent<{
  root: RemoteReceiverAttachableChild;
  provider: Provider;
  receiver: RemoteReceiver;
}>

export declare const createProvider: (components: {
  [key: string]: Component<NonNullable<unknown>>;
}) => Provider

export declare const createRemoteRenderer: <
  Root extends RemoteRoot = RemoteRoot
>(root: Root) => Renderer<Component<Root> | Root>

export declare const createRemoteRoot: <
  KnownComponentType extends RemoteComponentType = RemoteComponentType,
  AllowedChildrenType extends KnownComponentType | boolean = true
>(channel: RemoteChannel, options: RemoteRootOptions<KnownComponentType> = {}) => RemoteRoot<
  KnownComponentType,
  AllowedChildrenType
>

export declare const defineRemoteComponent: <
  Type extends string,
  Props = None,
  AllowedChildren extends RemoteComponentType | boolean = true,
  Emits extends EmitsOptions | undefined = undefined
> (
  type: Type | RemoteComponentType<Type, Props, AllowedChildren>,
  emits: Emits | undefined = undefined,
  slots: string[] = []
) => DefineComponent<
  Type,
  Props,
  AllowedChildren,
  Emits
>