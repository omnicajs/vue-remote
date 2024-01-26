import type {
  Component,
  Ref,
  ShallowRef,
} from 'vue'

import type { RemoteReceiverAttachable as Attachable } from '@remote-ui/core'
import type { Unknown } from './scaffolding'

export interface ShallowAttached<T extends Attachable = Attachable> {
  node: ShallowRef<T | null>;
  props: Ref<Unknown | undefined>;
  update (): void;
  release (): void;
}

export interface Attached<T extends Attachable = Attachable> extends ShallowAttached<T> {
  children: ShallowRef<Attached[]>;
}

export interface Provider {
  get (type: string): Component<NonNullable<unknown>>;
}