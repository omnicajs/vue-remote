import type {
  DefineComponent,
  EmitsOptions,
  MethodOptions,
  SlotsType,
} from 'vue'

import type { SchemaType } from '@/dom/remote'
import type {
  MethodsOf,
  PropertiesOf,
  UnknownType,
} from '@/dom/remote'

import type {
  None,
  Unknown,
  UnknownMethods,
} from '~types/scaffolding'
import type {
  RemoteMethodCarrier,
  RemoteMethodValidator,
} from './defineRemoteMethod'

import {
  defineComponent,
  getCurrentInstance,
  h,
  ref,
  type SetupContext,
} from 'vue'
import { isRemoteMethod } from './defineRemoteMethod'
import { toRemoteSlots } from './slots'

type EventHandler = (...args: unknown[]) => void
type AnyRemoteMethodValidator = {
  bivarianceHack (...args: unknown[]): boolean;
}['bivarianceHack']
type LooseRemoteMethodCarrier = {
  readonly __remoteMethod: true;
  readonly validator?: AnyRemoteMethodValidator;
}
type LooseRemoteMethodDefinition = AnyRemoteMethodValidator | LooseRemoteMethodCarrier
type LooseRemoteMethodMap = Record<string, LooseRemoteMethodDefinition>
type LooseRemoteMethodDeclarations = readonly string[] | LooseRemoteMethodMap
type RemoteSlotDefinitions = Record<string, unknown>
type RemoteMethodKey<Methods> = Extract<keyof Methods, string>
type SchemaMethodValidator<Method> = Method extends (...args: infer Args) => unknown
  ? RemoteMethodValidator<Args>
  : never
type SchemaMethodCarrier<Method> = Method extends (...args: infer Args) => infer Result
  ? RemoteMethodCarrier<Args, Awaited<Result>>
  : never
type StrictSchemaMethodDeclarations<
  SchemaMethods extends UnknownMethods,
  DeclaredMethods,
> = DeclaredMethods extends undefined
  ? undefined
  : DeclaredMethods extends readonly string[]
    ? Exclude<DeclaredMethods[number], RemoteMethodKey<SchemaMethods>> extends never
      ? DeclaredMethods
      : never
    : DeclaredMethods extends Record<string, unknown>
      ? Exclude<keyof DeclaredMethods, RemoteMethodKey<SchemaMethods>> extends never
        ? {
          [Key in keyof DeclaredMethods]:
            Key extends keyof SchemaMethods
              ? DeclaredMethods[Key] extends SchemaMethodValidator<SchemaMethods[Key]> | SchemaMethodCarrier<SchemaMethods[Key]>
                ? DeclaredMethods[Key]
                : never
              : never;
        }
        : never
      : never
type ExposedRemoteMethod<Method> = Method extends RemoteMethodCarrier<infer Args, infer Result>
  ? (...args: Args) => Promise<Result>
  : Method extends (...args: infer Args) => boolean
    ? (...args: Args) => Promise<void>
    : never
type ExposedRemoteMethods<Methods> = Methods extends readonly string[]
  ? { [Key in Methods[number]]: () => Promise<void> }
  : Methods extends Record<string, unknown>
    ? { [Key in keyof Methods]: ExposedRemoteMethod<Methods[Key]> }
    : None
type RemoteMethodNames<Methods> = Methods extends readonly string[]
  ? Methods[number][]
  : Methods extends Record<string, unknown>
    ? Array<Extract<keyof Methods, string>>
    : []
type RemoteSlotsDefinition<Slots extends RemoteSlotDefinitions> = Slots & {
  default?: (...args: never[]) => unknown;
}
type RemoteSlotsType<Slots extends RemoteSlotDefinitions> = SlotsType<RemoteSlotsDefinition<Slots>>
type DefineRemoteComponentOptions<
  Emits extends EmitsOptions | undefined,
  Slots extends RemoteSlotDefinitions,
  Methods extends LooseRemoteMethodDeclarations | undefined,
> = {
  emits?: Emits;
  slots?: ReadonlyArray<Extract<keyof Slots, string>>;
  methods?: Methods;
}
type NormalizedDefineRemoteComponentOptions<
  Emits extends EmitsOptions | undefined,
  Methods extends LooseRemoteMethodDeclarations | undefined,
> = {
  emits: Emits | undefined;
  slots: string[];
  methods: Methods | undefined;
}
type RemoteComponentRef = {
  invoke (method: string, ...args: unknown[]): Promise<unknown>;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
const eventOptionModifiers = ['Capture', 'Once', 'Passive']

const isEventHandlerKey = (key: string, event: string) => {
  const base = 'on' + capitalize(event)

  if (!key.startsWith(base)) {
    return false
  }

  let suffix = key.slice(base.length)

  while (suffix.length > 0) {
    const matched = eventOptionModifiers.find(modifier => suffix.startsWith(modifier))

    if (matched == null) {
      return false
    }

    suffix = suffix.slice(matched.length)
  }

  return true
}

const fallthroughEvents = <Emits extends EmitsOptions | undefined = undefined>(
  emits: Emits,
  props: Record<string, unknown> | null | undefined
): Record<string, EventHandler> => {
  if (emits === undefined || props == null) {
    return {}
  }

  const events: string[] = Array.isArray(emits) ? emits : Object.keys(emits)

  return Object.keys(props).reduce((processed, key) => {
    if (!events.some(event => isEventHandlerKey(key, event))) {
      return processed
    }

    const handler = props[key]

    if (typeof handler === 'function' || Array.isArray(handler)) {
      processed[key] = handler as EventHandler
    }

    return processed
  }, {} as Record<string, EventHandler>)
}

type DefineRemoteComponentComponent<
  Props extends Unknown = None,
  Emits extends EmitsOptions | undefined = undefined,
  Methods extends MethodOptions = MethodOptions,
  Slots extends RemoteSlotDefinitions = None,
> = DefineComponent<
  Props,
  Unknown,
  None,
  None,
  Methods,
  Emits extends undefined ? None : Emits
> & {
  new (): {
    $slots: RemoteSlotsDefinition<Slots>;
  };
}

type ResolvedProps<
  Type extends string,
  Props extends Unknown = None,
> = Type extends SchemaType<string, infer SchemaProps, UnknownMethods, UnknownType>
  ? SchemaProps
  : Props
type LooseComponentType = string & {
  readonly type?: never;
  readonly properties?: never;
  readonly methods?: never;
  readonly children?: never;
}

function defineRemoteComponent<
  Type extends SchemaType<string, Unknown, UnknownMethods, UnknownType>,
  Slots extends RemoteSlotDefinitions = None,
  Emits extends EmitsOptions | undefined = undefined,
  DeclaredMethods = undefined,
> (
  type: Type,
  options: {
    emits?: Emits;
    slots?: ReadonlyArray<Extract<keyof Slots, string>>;
    methods?: StrictSchemaMethodDeclarations<MethodsOf<Type>, DeclaredMethods>;
  }
): DefineRemoteComponentComponent<
  PropertiesOf<Type>,
  Emits,
  ExposedRemoteMethods<StrictSchemaMethodDeclarations<MethodsOf<Type>, DeclaredMethods>>,
  Slots
>
function defineRemoteComponent<
  Type extends string,
  Props extends Unknown = None,
  Slots extends RemoteSlotDefinitions = None,
  Emits extends EmitsOptions | undefined = undefined,
  Methods extends LooseRemoteMethodDeclarations | undefined = undefined,
> (
  type: LooseComponentType & Type,
  options: DefineRemoteComponentOptions<Emits, Slots, Methods>
): DefineRemoteComponentComponent<
  Props,
  Emits,
  ExposedRemoteMethods<Methods>,
  Slots
>
function defineRemoteComponent<
  Type extends string,
  Props extends Unknown = None,
  Methods extends UnknownMethods = None,
  Children extends SchemaType<string, Unknown> = never,
  Emits extends EmitsOptions | undefined = undefined
> (
  type: Type | SchemaType<Type, Props, Methods, Children>,
  emits?: Emits,
  slots?: string[]
): DefineRemoteComponentComponent<Props, Emits>
function defineRemoteComponent<
  Type extends string,
  Props extends Unknown = None,
  Slots extends RemoteSlotDefinitions = None,
  Methods extends LooseRemoteMethodDeclarations | undefined = undefined,
  Emits extends EmitsOptions | undefined = undefined,
> (
  type: Type,
  emitsOrOptions?: Emits | DefineRemoteComponentOptions<Emits, Slots, Methods>,
  legacySlots: string[] = []
): DefineRemoteComponentComponent<ResolvedProps<Type, Props>, Emits, ExposedRemoteMethods<Methods>, Slots> {
  const options = normalizeOptions(emitsOrOptions, legacySlots)
  const methods = options.methods
  const methodNames = getMethodNames(methods)

  const component = defineComponent<
    ResolvedProps<Type, Props>,
    Emits extends undefined ? None : Emits,
    string,
    RemoteSlotsType<Slots>
  >((props, { attrs, expose, slots: internalSlots }: SetupContext<Emits extends undefined ? None : Emits, RemoteSlotsType<Slots>>) => {
    const remote = ref<RemoteComponentRef | null>(null)
    const instance = getCurrentInstance()
    const assignRemote = (value: unknown | null) => {
      if (value != null) {
        remote.value = value as RemoteComponentRef
      }
    }

    if (methodNames.length > 0) {
      expose(createExposedMethods(methods, methodNames, remote))
    }

    return () => h(type, {
      ref: assignRemote,
      ...props,
      ...attrs,
      ...fallthroughEvents(options.emits, instance?.vnode.props as Record<string, unknown> | null | undefined),
    }, toRemoteSlots(options.slots, internalSlots as never))
  }, {
    name: type,
    inheritAttrs: false,
    emits: options.emits as Emits extends undefined ? None : Emits,
    slots: undefined as unknown as RemoteSlotsType<Slots>,
  })

  return component as unknown as DefineRemoteComponentComponent<ResolvedProps<Type, Props>, Emits, ExposedRemoteMethods<Methods>, Slots>
}

function isOptionsForm (value: unknown): value is DefineRemoteComponentOptions<EmitsOptions | undefined, RemoteSlotDefinitions, LooseRemoteMethodDeclarations | undefined> {
  if (typeof value !== 'object' || value == null || Array.isArray(value)) {
    return false
  }

  if ('emits' in value || 'methods' in value) {
    return true
  }

  return 'slots' in value && Array.isArray(value.slots)
}

function normalizeOptions<
  Emits extends EmitsOptions | undefined,
  Slots extends RemoteSlotDefinitions,
  Methods extends LooseRemoteMethodDeclarations | undefined,
> (
  emitsOrOptions?: Emits | DefineRemoteComponentOptions<Emits, Slots, Methods>,
  legacySlots: string[] = []
) : NormalizedDefineRemoteComponentOptions<Emits, Methods> {
  if (isOptionsForm(emitsOrOptions)) {
    return {
      emits: emitsOrOptions.emits as Emits | undefined,
      slots: [...(emitsOrOptions.slots ?? [])],
      methods: emitsOrOptions.methods as Methods | undefined,
    }
  }

  return {
    emits: emitsOrOptions as Emits | undefined,
    slots: legacySlots,
    methods: undefined as Methods,
  }
}

function getMethodNames<Methods extends LooseRemoteMethodDeclarations | undefined> (
  methods: Methods
): RemoteMethodNames<Methods> {
  if (methods == null) {
    return [] as RemoteMethodNames<Methods>
  }

  return (Array.isArray(methods) ? [...methods] : Object.keys(methods)) as RemoteMethodNames<Methods>
}

function createExposedMethods<Methods extends LooseRemoteMethodDeclarations | undefined> (
  methods: Methods,
  methodNames: RemoteMethodNames<Methods>,
  remote: { value: RemoteComponentRef | null }
): ExposedRemoteMethods<Methods> {
  return methodNames.reduce((exposed, methodName) => {
    exposed[methodName] = (...args: unknown[]) => {
      const validator = resolveMethodValidator(methods, methodName)
      const validation = validateRemoteMethod(validator, methodName, args)
      if (validation != null) {
        return validation
      }

      if (remote.value == null) {
        return Promise.reject(new Error(`Remote component ${methodName} is not available`))
      }

      return remote.value.invoke(methodName, ...args)
    }

    return exposed
  }, {} as Record<string, (...args: unknown[]) => Promise<unknown>>) as ExposedRemoteMethods<Methods>
}

function resolveMethodValidator<Methods extends LooseRemoteMethodDeclarations | undefined> (
  methods: Methods,
  methodName: string
) {
  if (methods == null || Array.isArray(methods)) {
    return undefined
  }

  const method = (methods as LooseRemoteMethodMap)[methodName]
  if (typeof method === 'function') {
    return method
  }

  if (isRemoteMethod(method)) {
    return method.validator
  }

  return undefined
}

function validateRemoteMethod (
  validator: ((...args: unknown[]) => boolean) | undefined,
  methodName: string,
  args: unknown[]
) {
  if (validator == null) {
    return null
  }

  try {
    if (validator(...args)) {
      return null
    }

    return Promise.reject(new Error(`Method ${methodName} rejected the provided arguments`))
  } catch (error) {
    return Promise.reject(error)
  }
}

export default defineRemoteComponent
