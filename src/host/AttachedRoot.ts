import type { PropType } from 'vue'
import type { RemoteReceiver } from '@remote-ui/core'
import type { Provider } from '../../types/host'

import AttachedSubtree from './AttachedSubtree'

import {
    defineComponent,
    h,
    onMounted,
    onUnmounted,
} from 'vue'

import { shallowAttach } from './attach'

import {
    KIND_COMPONENT,
    KIND_TEXT,
} from '@remote-ui/core'

export default /*#__PURE__*/ defineComponent({
    name: 'RemoteRenderer',

    props: {
        provider: {
            type: Object as PropType<Provider>,
            required: true,
        },

        receiver: {
            type: Object as PropType<RemoteReceiver>,
            required: true,
        },
    },

    setup (props) {
        const {
            node,
            update,
            release,
        } = shallowAttach(props.receiver, props.receiver.attached.root)

        onMounted(update)
        onUnmounted(release)

        return () => node.value?.children.filter(root => !('text' in root) || !!root.text).map(root => {
            const type = 'type' in root ? root.type : null
            const key = ({
                [KIND_COMPONENT]: type === 'RemoteComment' ? type : 'RemoteComponent-' + (type ?? ''),
                [KIND_TEXT]: 'RemoteText',
            }[root.kind]) + '-' + root.id

            return h(AttachedSubtree, {
                key,
                root,
                provider: props.provider,
                receiver: props.receiver,
            })
        })
    },
})
