import type {
  None,
  Unknown,
  UnknownMethods,
} from '~types/scaffolding'

export interface Schema<
  Type extends string,
  Properties extends Unknown = None,
  Methods extends UnknownMethods = UnknownMethods,
  Children extends Schema<string, Unknown> | boolean = true,
> {
  readonly type?: Type;
  readonly properties?: Properties;
  readonly methods?: Methods;
  readonly children?: Children;
}

export type SchemaType<
  Type extends string,
  Properties extends Unknown = None,
  Methods extends UnknownMethods = UnknownMethods,
  Children extends SchemaType<string, Unknown> | boolean = true,
> = Type & Schema<Type, Properties, Methods, Children>

export type TypeOf<T> = T extends SchemaType<
  infer Type,
  Unknown,
  UnknownMethods,
  SchemaType<string> | boolean
> ? Type : never

export type PropertiesOf<T> = T extends SchemaType<
  string,
  infer Properties,
  UnknownMethods,
  SchemaType<string, Unknown> | boolean
> ? Properties : never

export type MethodsOf<T> = T extends SchemaType<
  string,
  Unknown,
  infer Methods,
  SchemaType<string, Unknown> | boolean
> ? Methods : never

export type ChildrenOf<Type> = Type extends SchemaType<
  string,
  Unknown,
  UnknownMethods,
  infer Children
> ? Children : never

export type UnknownType = SchemaType<string, Unknown>
