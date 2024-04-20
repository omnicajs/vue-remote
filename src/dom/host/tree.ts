import type {
  SerializedComment,
  SerializedComponent,
  SerializedFragment,
  SerializedRoot,
  SerializedText,
} from '@/dom/common'

import type { Unknown } from '~types/scaffolding'

import {
  isSerializedComment,
  isSerializedComponent,
  isSerializedFragment,
  isSerializedText,
} from '@/dom/common'

import { keysOf } from '@/common/scaffolding'

export interface ReceivedRoot extends SerializedRoot {
  children: ReceivedChild[];
  version: number;
}

export interface ReceivedComment extends SerializedComment {
  version: number;
}

export interface ReceivedComponent<
  Properties extends Unknown = Unknown
> extends SerializedComponent<Properties> {
  children: ReceivedChild[];
  version: number;
}

export interface ReceivedFragment extends SerializedFragment {
  children: ReceivedChild[];
  version: number;
}

export interface ReceivedText extends SerializedText {
  version: number;
}

export type ReceivedParent =
  | ReceivedComponent
  | ReceivedFragment
  | ReceivedRoot

export type ReceivedChild =
  | ReceivedComment
  | ReceivedComponent
  | ReceivedText

export type Received =
  | ReceivedChild
  | ReceivedFragment
  | ReceivedRoot

export type Deserialized<T> = T extends SerializedComment
  ? ReceivedComment
  : T extends SerializedComponent
    ? ReceivedComponent
    : T extends SerializedFragment
      ? ReceivedFragment
      : T extends SerializedText
        ? ReceivedText
        : never

export const addVersion = <T>(value: T): Deserialized<T> => {
  (value as Deserialized<T>).version = 0
  return value as Deserialized<T>
}

type SerializedNode = SerializedComment | SerializedComponent | SerializedFragment | SerializedText

export function deserialize<T extends SerializedNode, R>(
  node: T,
  deserializer: (node: T) => R
) {
  if ('children' in node) {
    node.children.forEach(child => deserialize(child as T, deserializer))
  }

  if (isSerializedComponent(node)) {
    const { properties } = node
    for (const key of keysOf(properties)) {
      const prop = properties[key]
      if (isSerializedFragment(prop)) {
        properties[key] = deserialize(prop as T, deserializer)
      }
    }
  }

  return deserializer(node)
}

export const isReceivedComment = (value: unknown): value is ReceivedComment => {
  return isSerializedComment(value) && 'version' in value
}

export const isReceivedFragment = (value: unknown): value is ReceivedFragment => {
  return isSerializedFragment(value) && 'version' in value
}

export const isReceivedText = (value: unknown): value is ReceivedText => {
  return isSerializedText(value) && 'version' in value
}