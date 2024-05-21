import type {
  Component,
  Ref,
  ShallowRef,
} from 'vue'

import type {
  Id,
  KIND_COMPONENT,
  KIND_ROOT,
} from '@/dom/host'

import type { Unknown } from '~types/scaffolding'

import {
  KIND_COMMENT,
  KIND_TEXT,
} from '@/dom/host'

import { REMOTE_SLOT } from '@/vue/internals'

export interface HostedNode {
  id: Id;
  update (): void;
  release (): void;
}

export interface HostedComment extends HostedNode {
  kind: typeof KIND_COMMENT;
  text: Ref<string>;
}

export interface HostedComponent<Properties extends Unknown = Unknown> extends HostedNode {
  kind: typeof KIND_COMPONENT;
  type: string,
  /** Is used for linking with tree generated by Vue */
  ref: Ref<Component<NonNullable<unknown>> | Element | null>;
  properties: Ref<Properties>;
  children: ShallowRef<HostedChild[]>;
}

export type HostedChild = HostedComment | HostedComponent | HostedText

export interface HostedRoot extends HostedNode {
  kind: typeof KIND_ROOT;
  update (force?: boolean): void;
  children: ShallowRef<HostedChild[]>;
}

export interface HostedText extends HostedNode {
  kind: typeof KIND_TEXT;
  text: Ref<string>;
}

export const isComment = (node: HostedChild): node is HostedComment => node.kind === KIND_COMMENT
export const isSlot = (node: HostedChild): node is HostedComponent<{ name: string }> => {
  return 'type' in node && node.type === REMOTE_SLOT
}
export const isText = (node: HostedChild): node is HostedText => node.kind === KIND_TEXT