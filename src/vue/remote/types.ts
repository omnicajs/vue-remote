import type { RemoteComponent, SchemaType } from '@/dom/remote'
import type {
  NativeElements,
  ShallowRef,
} from 'vue'

type ReservedNativeElementProperty =
  | 'key'
  | 'ref'
  | 'ref_for'
  | 'ref_key'

export type RemoteElementTagName = Extract<keyof NativeElements, string>

export type RemoteElementProperties<
  Tag extends RemoteElementTagName,
> = Omit<NativeElements[Tag], ReservedNativeElementProperty>

export type RemoteElementSchema<
  Tag extends RemoteElementTagName,
> = SchemaType<Tag, RemoteElementProperties<Tag>>

export type RemoteElementProxy<
  Tag extends RemoteElementTagName = RemoteElementTagName,
> = RemoteComponent<RemoteElementSchema<Tag>>

export type RemoteElementRef<
  Tag extends RemoteElementTagName = RemoteElementTagName,
> = Readonly<ShallowRef<RemoteElementProxy<Tag> | null>>
