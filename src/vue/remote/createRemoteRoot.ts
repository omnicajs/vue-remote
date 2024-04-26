import type {
  Channel,
  RemoteRoot,
  RemoteRootOptions,
  SupportedBy,
} from '@/dom/remote'

import { createRemoteRoot as _createRemoteRoot } from '@/dom/remote'

import {
  HTMLTagList,
  MathMLTagList,
  SVGTagList,
} from '@/common/dom'

import { REMOTE_SLOT } from '@/vue/internals'

export default <Supports extends SupportedBy<RemoteRoot> = SupportedBy<RemoteRoot>>(
  channel: Channel,
  options: RemoteRootOptions<Supports> = {}
): RemoteRoot<Supports> => _createRemoteRoot(channel, {
  ...options,
  components: [
    ...HTMLTagList,
    ...MathMLTagList,
    ...SVGTagList,
    REMOTE_SLOT,
    ...(options.components ?? []),
  ] as RemoteRootOptions<Supports>['components'],
}) as RemoteRoot<Supports>
