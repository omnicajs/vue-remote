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

export interface RemoteRootOptions<Supports extends SchemaType<string, Unknown>> {
  readonly strict?: boolean;
  readonly components?: ReadonlyArray<Supports | RemoteComponentDescriptor<Supports>>;
}

export interface RemoteRoot<
  Supports extends UnknownType = UnknownType,
  Children extends Supports | boolean = true,
> extends RemoteNode {
  readonly kind: typeof KIND_ROOT
  readonly children: ReadonlyArray<Accepts<Children, RemoteRoot<Supports, Children>>>
  readonly options: RemoteRootOptions<SchemaType<string, Unknown>>

  append (
    ...children: Accepts<Children, RemoteRoot<Supports, Children>, true>[]
  ): void | Promise<void>;

  insertBefore (
    child: Accepts<Children, RemoteRoot<Supports, Children>>,
    before?: Accepts<Children, RemoteRoot<Supports, Children>> | null,
  ): void | Promise<void>;

  replace (
    ...children: Accepts<Children, RemoteRoot<Supports, Children>, true>[]
  ): void | Promise<void>;

  removeChild (
    child: Accepts<Children, RemoteRoot<Supports, Children>>,
  ): void | Promise<void>;

  createComment (text?: string): RemoteComment<RemoteRoot<Supports, Children>>;

  createComponent<Type extends Supports>(
    type: Type | RemoteComponentDescriptor<Type>,
    ...rest: IfAllKeysOptional<
      PropertiesOf<Type>,
      [(PropertiesOf<Type> | null)?, ...Accepts<Children, RemoteRoot<Supports, Children>, true>[]]
      | [(PropertiesOf<Type> | null)?, Accepts<Children, RemoteRoot<Supports, Children>, true>[]?],
      [PropertiesOf<Type>, ...Accepts<Children, RemoteRoot<Supports, Children>, true>[]]
      | [PropertiesOf<Type>, Accepts<Children, RemoteRoot<Supports, Children>, true>[]?]
    >
  ): RemoteComponent<Type, RemoteRoot<Supports, Children>>;

  createFragment (): RemoteFragment<RemoteRoot<Supports, Children>>;

  createText (text?: string): RemoteText<RemoteRoot<Supports, Children>>;

  mount (): Promise<void>;
}

export interface RemoteComment<Root extends UnknownRoot = UnknownRoot> extends RemoteNode {
  readonly kind: typeof KIND_COMMENT;
  readonly root: Root;
  readonly progenitor: RemoteComponent<UnknownType, Root> | Root | null;
  readonly parent: RemoteComponent<UnknownType, Root> | Root | null;
  readonly text: string;
  update (text: string): void | Promise<void>;
  remove (): void | Promise<void>;
  serialize (): SerializedComment;
}

export interface RemoteComponentDescriptor<
  Type extends SchemaType<string, Unknown, UnknownMethods, UnknownType | boolean>
> {
  type: Type;
  hasProperty (name: string | keyof PropertiesOf<Type>): name is keyof PropertiesOf<Type>;
  hasMethod (name: string | keyof MethodsOf<Type>): name is keyof MethodsOf<Type>;
  supports (name: string): boolean;
}

export interface RemoteComponent<
  Type extends UnknownType,
  Root extends UnknownRoot = UnknownRoot,
> extends RemoteNode {
  readonly kind: typeof KIND_COMPONENT;
  readonly type: TypeOf<Type>;
  readonly root: Root;
  readonly progenitor: RemoteComponent<UnknownType, Root> | Root | null;
  readonly parent: RemoteComponent<UnknownType, Root> | Root | null;
  readonly properties: PropertiesOf<Type>;
  readonly children: ReadonlyArray<Accepts<ChildrenOf<Type>, Root>>;

  invoke (method: string, ...payload: unknown[]): Promise<unknown>;

  updateProperties (properties: Partial<PropertiesOf<Type>>): void | Promise<void>;

  append (...children: Accepts<ChildrenOf<Type>, Root, true>[]): void | Promise<void>;

  insertBefore (
    child: Accepts<ChildrenOf<Type>, Root>,
    before?: Accepts<ChildrenOf<Type>, Root> | null,
  ): void | Promise<void>;

  replace (...children: Accepts<ChildrenOf<Type>, Root, true>[]): void | Promise<void>;

  removeChild (child: Accepts<ChildrenOf<Type>, Root>): void | Promise<void>;

  remove (): void | Promise<void>;

  serialize (): SerializedComponent<PropertiesOf<Type>>;
}

export interface RemoteFragment<Root extends UnknownRoot = UnknownRoot> extends RemoteNode {
  readonly kind: typeof KIND_FRAGMENT;
  readonly root: Root;
  readonly progenitor: RemoteComponent<UnknownType, Root> | Root | null;
  readonly parent: RemoteComponent<UnknownType, Root> | Root | null;
  readonly children: ReadonlyArray<Accepts<ChildrenOf<UnknownType>, Root>>;

  append (
    ...children: Accepts<ChildrenOf<UnknownType>, Root, true>[]
  ): void | Promise<void>;

  insertBefore(
    child: Accepts<ChildrenOf<UnknownType>, Root>,
    before?: Accepts<ChildrenOf<UnknownType>, Root> | null,
  ): void | Promise<void>;

  replace (
    ...children: Accepts<ChildrenOf<UnknownType>, Root, true>[]
  ): void | Promise<void>;

  removeChild (
    child: Accepts<ChildrenOf<UnknownType>, Root>,
  ): void | Promise<void>;

  serialize (): SerializedFragment;
}

export interface RemoteText<Root extends UnknownRoot = UnknownRoot> extends RemoteNode {
  readonly kind: typeof KIND_TEXT;
  readonly root: Root;
  readonly progenitor: RemoteComponent<UnknownType, Root> | Root | null;
  readonly parent: RemoteComponent<UnknownType, Root> | Root | null;
  readonly text: string;
  update (text: string): void | Promise<void>;
  serialize (): SerializedText;
  remove (): void | Promise<void>;
}

type AcceptsComponents<Children, Root extends UnknownRoot> = Children extends UnknownType
  ? RemoteComponent<Children, Root>
  : never

type AcceptsText<
  Root extends UnknownRoot,
  Raw extends boolean = false,
> = Raw extends true
  ? RemoteText<Root> | string
  : RemoteText<Root>

export type Accepts<
  Children extends UnknownType | boolean,
  Root extends UnknownRoot,
  Raw extends boolean = false,
> = Children extends true
  ? RemoteComment<Root> | RemoteComponent<UnknownType, Root> | AcceptsText<Root, Raw>
  : Children extends false
    ? never
    : RemoteComment<Root> | AcceptsComponents<Children, Root> | AcceptsText<Root, Raw>

export type UnknownRoot = RemoteRoot<UnknownType, UnknownType | boolean>
export type UnknownComponent<Root extends UnknownRoot = UnknownRoot> = RemoteComponent<UnknownType, Root>
export type UnknownChild<Root extends UnknownRoot = UnknownRoot> =
  | RemoteComment<Root>
  | RemoteComponent<UnknownType, Root>
  | RemoteText<Root>

export type UnknownNode<Root extends UnknownRoot = UnknownRoot> = UnknownChild<Root> | RemoteFragment<Root>
export type UnknownParent<Root extends UnknownRoot = UnknownRoot> =
  | Root
  | RemoteComponent<UnknownType, Root>
  | RemoteFragment<Root>

export function isRemoteComment<
  Root extends UnknownRoot = UnknownRoot,
>(value: unknown): value is RemoteComment<Root> {
  return value != null && (value as RemoteComment<Root>).kind === KIND_COMMENT
}

export function isRemoteComponent<
  Type extends UnknownType = UnknownType,
  Root extends UnknownRoot = UnknownRoot,
>(value: unknown): value is RemoteComponent<Type, Root> {
  return value != null && (value as RemoteComponent<Type, Root>).kind === KIND_COMPONENT
}

export function isRemoteFragment<
  Root extends UnknownRoot = UnknownRoot,
>(value: unknown): value is RemoteFragment<Root> {
  return value != null && (value as RemoteFragment<Root>).kind === KIND_FRAGMENT
}

export function isRemoteText<
  Root extends UnknownRoot = UnknownRoot,
>(value: unknown): value is RemoteText<Root> {
  return value != null && (value as RemoteText<Root>).kind === KIND_TEXT
}

export const normalizeChild = (
  child: UnknownChild | string,
  root: UnknownRoot
): UnknownChild => typeof child === 'string' ? root.createText(child) : child

export const normalizeChildren = (
  children: Array<UnknownChild | string>,
  root: UnknownRoot
) => children.map((child) => normalizeChild(child, root))
