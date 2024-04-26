import type {
  Id,
  SerializedComment,
  SerializedComponent,
  SerializedFragment,
  SerializedText,
  KIND_ROOT,
} from '@/dom/common/tree'

import type {
  SchemaType,
  TypeOf,
  PropertiesOf,
  MethodsOf,
  ChildrenOf,
  UnknownType,
} from '@/dom/remote/schema'

import type {
  IfAllKeysOptional,
  Unknown,
  UnknownMethods,
} from '~types/scaffolding'

import {
  KIND_COMMENT,
  KIND_COMPONENT,
  KIND_FRAGMENT,
  KIND_TEXT,
} from '@/dom/common/tree'

export interface RemoteNode {
  readonly id: Id;
}

export interface RemoteRoot<
  Supports extends SchemaType<string, Unknown, UnknownMethods, UnknownType> = SchemaType<string, Unknown, UnknownMethods, UnknownType>
> extends RemoteNode {
  readonly kind: typeof KIND_ROOT
  readonly options: RemoteRootOptions<Supports>
  readonly children: ReadonlyArray<
    | RemoteComment<RemoteRoot<Supports>>
    | RemoteComponent<Supports, RemoteRoot<Supports>>
    | RemoteText<RemoteRoot<Supports>>
  >

  append (
    ...children: Array<
      | RemoteComment<RemoteRoot<Supports>>
      | RemoteComponent<Supports, RemoteRoot<Supports>>
      | RemoteText<RemoteRoot<Supports>>
      | string
    >
  ): void | Promise<void>;

  insertBefore (
    child:
      | RemoteComment<RemoteRoot<Supports>>
      | RemoteComponent<Supports, RemoteRoot<Supports>>
      | RemoteText<RemoteRoot<Supports>>,
    before?:
      | RemoteComment<RemoteRoot<Supports>>
      | RemoteComponent<Supports, RemoteRoot<Supports>>
      | RemoteText<RemoteRoot<Supports>>
      | null,
  ): void | Promise<void>;

  replace (
    ...children: Array<
      | RemoteComment<RemoteRoot<Supports>>
      | RemoteComponent<Supports, RemoteRoot<Supports>>
      | RemoteText<RemoteRoot<Supports>>
      | string
    >
  ): void | Promise<void>;

  removeChild (
    child:
      | RemoteComment<RemoteRoot<Supports>>
      | RemoteComponent<Supports, RemoteRoot<Supports>>
      | RemoteText<RemoteRoot<Supports>>
  ): void | Promise<void>;

  createComment (text?: string): RemoteComment<RemoteRoot<Supports>>;

  createComponent<Type extends Supports>(
    type: Type | RemoteComponentDescriptor<Type>,
    ...rest: IfAllKeysOptional<
      PropertiesOf<Type>,
      | [(PropertiesOf<Type> | null)?, ...Array<
        | RemoteComment<RemoteRoot<Supports>>
        | RemoteComponent<ChildrenOf<Supports>, RemoteRoot<Supports>>
        | RemoteText<RemoteRoot<Supports>>
        | string
      >]
      | [(PropertiesOf<Type> | null)?, Array<
        | RemoteComment<RemoteRoot<Supports>>
        | RemoteComponent<ChildrenOf<Supports>, RemoteRoot<Supports>>
        | RemoteText<RemoteRoot<Supports>>
        | string
      >?],
      | [PropertiesOf<Type>, ...Array<
        | RemoteComment<RemoteRoot<Supports>>
        | RemoteComponent<ChildrenOf<Supports>, RemoteRoot<Supports>>
        | RemoteText<RemoteRoot<Supports>>
        | string
      >]
      | [PropertiesOf<Type>, Array<
        | RemoteComment<RemoteRoot<Supports>>
        | RemoteComponent<ChildrenOf<Supports>, RemoteRoot<Supports>>
        | RemoteText<RemoteRoot<Supports>>
        | string
      >?]
    >
  ): RemoteComponent<Type, RemoteRoot<Supports>>;

  createFragment (): RemoteFragment<RemoteRoot<Supports>>;

  createText (text?: string): RemoteText<RemoteRoot<Supports>>;

  mount (): Promise<void>;
}

export interface RemoteRootOptions<
  Supports extends RemoteComponentOption = RemoteComponentOption
> {
  readonly strict?: boolean;
  readonly components?: ReadonlyArray<Supports>;
}

export interface RemoteComment<Root extends RemoteRoot = RemoteRoot> extends RemoteNode {
  readonly kind: typeof KIND_COMMENT;
  readonly root: Root;
  readonly progenitor: RemoteComponent<SupportedBy<Root>, Root> | Root | null;
  readonly parent: RemoteComponent<SupportedBy<Root>, Root> | Root | null;
  readonly text: string;
  update (text: string): void | Promise<void>;
  remove (): void | Promise<void>;
  serialize (): SerializedComment;
}

export type RemoteComponentOption<
  Type extends SupportedBy<RemoteRoot> = SupportedBy<RemoteRoot>
> = Type | RemoteComponentDescriptor<Type>

export type SchemaOf<D> = D extends RemoteComponentDescriptor<infer S1>
  ? S1
  : D extends RemoteComponentOption<infer S2>
    ? S2
    : never

export interface RemoteComponentDescriptor<
  Type extends SupportedBy<RemoteRoot>
> {
  type: Type;
  hasProperty (name: string | keyof PropertiesOf<Type>): name is keyof PropertiesOf<Type>;
  hasMethod (name: string | keyof MethodsOf<Type>): name is keyof MethodsOf<Type>;
  supports (name: string): boolean;
}

export type SupportedBy<Root> = Root extends RemoteRoot<infer S>
  ? S
  : never

export interface RemoteComponent<
  Type extends SupportedBy<RemoteRoot>,
  Root extends RemoteRoot = RemoteRoot,
> extends RemoteNode {
  readonly kind: typeof KIND_COMPONENT;
  readonly type: TypeOf<Type>;
  readonly root: Root;
  readonly progenitor: RemoteComponent<SupportedBy<Root>, Root> | Root | null;
  readonly parent: RemoteComponent<SupportedBy<Root>, Root> | Root | null;
  readonly properties: PropertiesOf<Type>;
  readonly children: ReadonlyArray<
    | RemoteComment<Root>
    | RemoteComponent<ChildrenOf<Type>, Root>
    | RemoteText<Root>
  >;

  invoke (method: string, ...payload: unknown[]): Promise<unknown>;

  updateProperties (properties: Partial<PropertiesOf<Type>>): void | Promise<void>;

  append (...children: Array<
    | RemoteComment<Root>
    | RemoteComponent<ChildrenOf<Type>, Root>
    | RemoteText<Root>
    | string
  >): void | Promise<void>;

  insertBefore (
    child:
      | RemoteComment<Root>
      | RemoteComponent<ChildrenOf<Type>, Root>
      | RemoteText<Root>,
    before?:
      | RemoteComment<Root>
      | RemoteComponent<ChildrenOf<Type>, Root>
      | RemoteText<Root>
      | null
  ): void | Promise<void>;

  replace (...children: Array<
    | RemoteComment<Root>
    | RemoteComponent<ChildrenOf<Type>, Root>
    | RemoteText<Root>
    | string
  >): void | Promise<void>;

  removeChild (
    child:
      | RemoteComment<Root>
      | RemoteComponent<ChildrenOf<Type>, Root>
      | RemoteText<Root>
  ): void | Promise<void>;

  remove (): void | Promise<void>;

  serialize (): SerializedComponent<PropertiesOf<Type>>;
}

export interface RemoteFragment<Root extends RemoteRoot = RemoteRoot> extends RemoteNode {
  readonly kind: typeof KIND_FRAGMENT;
  readonly root: Root;
  readonly progenitor: RemoteComponent<SupportedBy<Root>, Root> | Root | null;
  readonly parent: RemoteComponent<SupportedBy<Root>, Root> | Root | null;
  readonly children: ReadonlyArray<
    | RemoteComment<Root>
    | RemoteComponent<SupportedBy<Root>, Root>
    | RemoteText<Root>
  >;

  append (
    ...children: Array<
      | RemoteComment<Root>
      | RemoteComponent<SupportedBy<Root>, Root>
      | RemoteText<Root>
      | string
    >
  ): void | Promise<void>;

  insertBefore(
    child:
      | RemoteComment<Root>
      | RemoteComponent<SupportedBy<Root>, Root>
      | RemoteText<Root>,
    before?:
      | RemoteComment<Root>
      | RemoteComponent<SupportedBy<Root>, Root>
      | RemoteText<Root>
      | null,
  ): void | Promise<void>;

  replace (
    ...children: Array<
      | RemoteComment<Root>
      | RemoteComponent<SupportedBy<Root>, Root>
      | RemoteText<Root>
      | string
    >
  ): void | Promise<void>;

  removeChild (
    child:
      | RemoteComment<Root>
      | RemoteComponent<SupportedBy<Root>, Root>
      | RemoteText<Root>,
  ): void | Promise<void>;

  serialize (): SerializedFragment;
}

export interface RemoteText<Root extends RemoteRoot = RemoteRoot> extends RemoteNode {
  readonly kind: typeof KIND_TEXT;
  readonly root: Root;
  readonly progenitor: RemoteComponent<SupportedBy<Root>, Root> | Root | null;
  readonly parent: RemoteComponent<SupportedBy<Root>, Root> | Root | null;
  readonly text: string;
  update (text: string): void | Promise<void>;
  serialize (): SerializedText;
  remove (): void | Promise<void>;
}

export type UnknownComponent = RemoteComponent<UnknownType>
export type UnknownChild = RemoteComment | RemoteComponent<UnknownType> | RemoteText
export type UnknownNode = UnknownChild | RemoteFragment
export type UnknownParent =
  | RemoteRoot
  | RemoteComponent<SchemaType<string, Unknown, UnknownMethods, UnknownType>>
  | RemoteFragment

export function isRemoteComment<
  Root extends RemoteRoot = RemoteRoot,
>(value: unknown): value is RemoteComment<Root> {
  return value != null && (value as RemoteComment<Root>).kind === KIND_COMMENT
}

export function isRemoteComponent<
  Type extends UnknownType = UnknownType,
  Root extends RemoteRoot = RemoteRoot,
>(value: unknown): value is RemoteComponent<Type, Root> {
  return value != null && (value as RemoteComponent<Type, Root>).kind === KIND_COMPONENT
}

export function isRemoteFragment<
  Root extends RemoteRoot = RemoteRoot,
>(value: unknown): value is RemoteFragment<Root> {
  return value != null && (value as RemoteFragment<Root>).kind === KIND_FRAGMENT
}

export function isRemoteText<
  Root extends RemoteRoot = RemoteRoot,
>(value: unknown): value is RemoteText<Root> {
  return value != null && (value as RemoteText<Root>).kind === KIND_TEXT
}

export const normalizeChild = (
  child: UnknownChild | string,
  root: RemoteRoot
): UnknownChild => typeof child === 'string' ? root.createText(child) : child

export const normalizeChildren = (
  children: Array<UnknownChild | string>,
  root: RemoteRoot
) => children.map((child) => normalizeChild(child, root))
