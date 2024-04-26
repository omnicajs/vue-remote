import type {
  SchemaType,
  PropertiesOf,
  UnknownType, ChildrenOf,
} from '@/dom/remote/schema'

import type {
  RemoteComponentData,
  TreeContext,
} from '@/dom/remote/context'

import type { FunctionProxyUpdate } from '@/dom/remote/proxy'

import type {
  RemoteComment,
  RemoteComponent,
  RemoteComponentDescriptor,
  RemoteRoot,
  RemoteText,
  SupportedBy,
} from '@/dom/remote/tree'

import type {
  None,
  Unknown,
  UnknownMethods,
} from '~types/scaffolding'

import {
  prepareProxies,
  proxyFunctionsIn,
  updateProxies,
} from '@/dom/remote/proxy'

import {
  isRemoteFragment,
  normalizeChild,
  normalizeChildren,
} from '@/dom/remote/tree'

import {
  capture,
  keysOf,
} from '@/common/scaffolding'

import { ACTION_UPDATE_PROPERTIES } from '@/dom/common/channel'
import { KIND_COMPONENT } from '@/dom/common/tree'

// eslint-disable-next-line max-lines-per-function
export function createRemoteComponent <R extends RemoteRoot, T extends SupportedBy<R>>(
  type: T | RemoteComponentDescriptor<T>,
  properties: PropertiesOf<T> | null | undefined,
  children: Array<
    | RemoteComment<R>
    | RemoteComponent<ChildrenOf<T>, R>
    | RemoteText<R>
    | string
  >,
  root: R,
  context: TreeContext
) {
  const id = context.nextId()
  const descriptor = typeof type === 'object' && 'type' in type ? type : null
  const data = createRemoteComponentData(properties, children, root, context)
  const node = {
    kind: KIND_COMPONENT,
    get id () { return id },
    get type () { return descriptor ? descriptor.type : type as string },
    get root () { return root },
    get children () { return data.children },
    get properties () { return data.properties.original },

    append: (...children) => context.append(
      node, normalizeChildren(children, root)
    ),

    insertBefore: (child, before) => context.insert(
      node, normalizeChild(child, root), before
    ),

    updateProperties: (properties) => updateProperties(
      context,
      node,
      properties
    ),

    replace: (...children) => context.replace(
      node, normalizeChildren(children, root)
    ),

    removeChild: (child) => context.removeChild(node, child),

    remove: () => node.parent ? context.removeChild(node.parent, node) : null,

    invoke: (method, ...payload) => !descriptor || descriptor?.hasMethod(method)
      ? context.invoke(node, method, payload)
      : Promise.reject(`Method ${method} is not supported`),

    serialize: () => ({
      id,
      kind: KIND_COMPONENT,
      type: type as string,
      properties: data.properties.serializable,
      children: data.children.map(c => c.serialize()),
    }),
  } as RemoteComponent<T, R>

  context.collect(node)
  context.components.set(node, data)
  data.children.forEach(c => context.attach(node, c))

  return node
}

export function defineRemoteComponent<
  Type extends string,
  Properties extends Unknown = None,
  Methods extends UnknownMethods = None,
  Children extends UnknownType | false = false
>(
  type: Type,
  properties: Array<keyof Properties> = [],
  methods: Array<keyof Methods> = [],
  children: Supported<Children> = false as Supported<Children>
): RemoteComponentDescriptor<SchemaType<Type, Properties, Methods, Children extends false ? never : Children>> {
  return {
    type,
    hasProperty (name): name is keyof keyof Properties {
      return properties.includes(name as keyof keyof Properties)
    },
    hasMethod (name): name is keyof Methods {
      return methods.includes(name as keyof Methods)
    },
    supports: type => typeof children === 'boolean'
      ? children
      : children.length === 0 || (children as SchemaType<string>[]).includes(type as SchemaType<string>),
  }
}

type Supported<
  Children extends UnknownType | boolean
> = Children extends boolean ? boolean : Array<Children>

// "children" as a prop can be extremely confusing with the "children" of
// a component. In React, a "child" can be anything, but once it reaches
// a host environment (like this remote `Root`), we want "children" to have
// only one meaning: the actual, resolved children components and text.
//
// To enforce this, we delete any prop named "children". We don’t take a copy
// of the properties for performance, so a user calling this function must do so
// with an object that can handle being mutated.
const RESERVED = ['children']

const notReserved = (name: string) => !RESERVED.includes(name)

function createRemoteComponentData <S extends SupportedBy<RemoteRoot>, T extends S>(
  properties: PropertiesOf<T> | null | undefined,
  children: Array<
    | RemoteComment<RemoteRoot<S>>
    | RemoteComponent<ChildrenOf<T>, RemoteRoot<S>>
    | RemoteText<RemoteRoot<S>>
    | string
  >,
  root: RemoteRoot<S>,
  context: TreeContext
): RemoteComponentData {
  const original: Unknown = properties ?? {}
  const serializable: Unknown = {}

  for (const key of keysOf(original).filter(notReserved)) {
    serializable[key] = proxyFunctionsIn(serializeProperty(original[key]))
  }

  return {
    properties: {
      original: capture(original, context.strict),
      serializable,
    },
    children: capture(normalizeChildren(children, root), context.strict),
  }
}

// eslint-disable-next-line max-lines-per-function
function updateProperties<R extends RemoteRoot>(
  context: TreeContext<R>,
  component: RemoteComponent<SupportedBy<R>, R>,
  properties: Unknown
) {
  const componentData = context.components.get(component)!
  const normalized: Unknown = {}
  const records: FunctionProxyUpdate[] = []

  let changed = false

  for (const key of keysOf(properties).filter(notReserved)) {
    const oldOriginal = componentData.properties.original[key]
    const newOriginal = properties[key]

    const oldSerializable = componentData.properties.serializable[key]
    const newSerializable = serializeProperty(newOriginal)

    if (oldSerializable === newSerializable && (newSerializable == null || typeof newSerializable !== 'object')) {
      continue
    }

    const [value, record, skip] = prepareProxies(oldSerializable, newSerializable)

    records.push(...record)

    if (!skip) {
      normalized[key] = value
      changed = true

      if (isRemoteFragment(oldOriginal)) {
        context.detach(oldOriginal)
      }

      if (isRemoteFragment(newOriginal)) {
        context.attach(component, newOriginal)
      }
    }
  }

  return context.update(component, (channel) => {
    if (changed) {
      channel(ACTION_UPDATE_PROPERTIES, component.id, normalized)
    }
  }, () => {
    componentData.properties.original = capture({ ...componentData.properties.original, ...properties }, context.strict)
    componentData.properties.serializable = { ...componentData.properties.serializable, ...normalized }

    updateProxies(records)
  })
}

function serializeProperty (property: unknown) {
  return isRemoteFragment(property)
    ? property.serialize()
    : property
}