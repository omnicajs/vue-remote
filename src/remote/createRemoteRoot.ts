import type {
    RemoteChannel,
    RemoteRoot,
} from '@remote-ui/core'

import type {
    RemoteComponentType,
    RemoteRootOptions,
} from '../../types/remote'

import { createRemoteRoot as _createRemoteRoot } from '@remote-ui/core'

import {
    HTMLTagList,
    MathMLTagList,
    SVGTagList,
} from '@/common/dom'

export default <
    KnownComponentType extends RemoteComponentType = RemoteComponentType,
    AllowedChildrenType extends KnownComponentType | boolean = true
>(channel: RemoteChannel, options: RemoteRootOptions<KnownComponentType> = {}): RemoteRoot<
    KnownComponentType,
    AllowedChildrenType
> => {
    return _createRemoteRoot(channel, {
        ...options,
        components: [
            ...HTMLTagList,
            ...MathMLTagList,
            ...SVGTagList,
            'RemoteComment',
            'RemoteSlot',
            ...(options.components ?? []),
        ],
    }) as RemoteRoot<
        KnownComponentType,
        AllowedChildrenType
    >
}
