import type {
  Channel,
  RemoteComponentDescriptor,
  RemoteRoot,
  RemoteRootOptions,
  UnknownType,
} from '@/dom/remote'

import { createRemoteRoot as _createRemoteRoot } from '@/dom/remote'

import {
  HTMLTagList,
  MathMLTagList,
  SVGTagList,
} from '@/common/dom'

import { REMOTE_SLOT } from '@/vue/internals'

export default <
  Supports extends UnknownType = UnknownType,
  Children extends Supports | boolean = true
>(channel: Channel, options: RemoteRootOptions<Supports> = {}): RemoteRoot<
  Supports,
  Children
> => _createRemoteRoot(channel, {
  ...options,
  components: [
    ...HTMLTagList,
    ...MathMLTagList,
    ...SVGTagList,
    REMOTE_SLOT,
    ...(options.components ?? []),
  ] as Array<Supports | RemoteComponentDescriptor<Supports>>,
}) as RemoteRoot<Supports, Children>
