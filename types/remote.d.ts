import type {
  Component,
  EmitsOptions,
  MethodOptions,
} from 'vue'

import type {
  PropsForRemoteComponent,
  RemoteComponentType as _RemoteComponentType,
} from '@remote-ui/core'

import type {
  None,
  Unknown,
} from './scaffolding'

export type RemoteComponentType<
  Type extends string = string,
  Props = Unknown,
  AllowedChildren extends _RemoteComponentType<string, Unknown> | boolean = true
> = _RemoteComponentType<Type, Props, AllowedChildren>

export interface RemoteRootOptions<KnownComponentType extends RemoteComponentType> {
  readonly strict?: boolean;
  readonly components?: ReadonlyArray<KnownComponentType>;
}

export type DefineComponent<
  Type extends string,
  Props = None,
  AllowedChildren extends RemoteComponentType | boolean = true,
  Emits extends EmitsOptions | undefined = undefined
> = Component<
  Unknown,
  PropsForRemoteComponent<_RemoteComponentType<Type, Props, AllowedChildren>>,
  None,
  None,
  MethodOptions,
  Emits extends undefined ? None : Emits
>