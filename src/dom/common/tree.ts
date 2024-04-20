import type { Unknown } from '~types/scaffolding'

export type Id = string

export const KIND_COMMENT = 'comment'
export const KIND_COMPONENT = 'component'
export const KIND_FRAGMENT = 'fragment'
export const KIND_ROOT = 'root'
export const KIND_TEXT = 'text'

export const ROOT_ID = '~'

export interface SerializedRoot {
  id: typeof ROOT_ID;
  kind: typeof KIND_ROOT;
  children: SerializedChild[];
}

export interface SerializedComment {
  id: Id;
  kind: typeof KIND_COMMENT;
  text: string;
}

export interface SerializedComponent<Properties extends Unknown = Unknown> {
  id: Id;
  kind: typeof KIND_COMPONENT;
  type: string;
  properties: Properties;
  children: SerializedChild[];
}

export interface SerializedFragment {
  id: Id;
  kind: typeof KIND_FRAGMENT;
  children: SerializedChild[];
}

export interface SerializedText {
  id: Id;
  kind: typeof KIND_TEXT;
  text: string;
}

export type SerializedChild =
  | SerializedComment
  | SerializedComponent
  | SerializedText

export const isSerializedComment = (value: unknown): value is SerializedComment => {
  return value != null && (value as SerializedComment).kind === KIND_COMMENT
}

export const isSerializedComponent = (value: unknown): value is SerializedComponent => {
  return value != null && (value as SerializedComponent).kind === KIND_COMPONENT
}

export const isSerializedFragment = (value: unknown): value is SerializedFragment => {
  return value != null && (value as SerializedFragment).kind === KIND_FRAGMENT
}

export const isSerializedText = (value: unknown): value is SerializedText => {
  return value != null && (value as SerializedText).kind === KIND_TEXT
}
