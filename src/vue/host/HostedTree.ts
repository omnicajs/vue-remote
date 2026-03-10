import type {
  DefineComponent,
  PropType,
} from 'vue'

import type { Receiver } from '@/dom/host'
import type { Provider } from '~types/vue/host'

import {
  defineComponent,
  onUnmounted,
  shallowRef,
  watch,
} from 'vue'

import {
  REMOTE_LIFECYCLE_REASON_HOST_UNMOUNTED,
  REMOTE_LIFECYCLE_REASON_RECEIVER_REPLACED,
  RemoteLifecycleError,
} from '@/common/lifecycle'
import {
  RECEIVER_ATTACH_HOST,
  RECEIVER_DETACH_HOST,
} from '@/dom/host/receiver'

import { isText } from './tree'

import render from './render'
import useReceived from './useReceived'

const connectReceiver = (receiver: Receiver) => {
  ;(receiver as Receiver & {
    [RECEIVER_ATTACH_HOST]?: () => void;
  })[RECEIVER_ATTACH_HOST]?.()
}

const disconnectReceiver = (receiver: Receiver, reason: RemoteLifecycleError) => {
  ;(receiver as Receiver & {
    [RECEIVER_DETACH_HOST]?: (reason?: unknown) => void;
  })[RECEIVER_DETACH_HOST]?.(reason)
}

export default /*#__PURE__*/ defineComponent({
  name: 'HostedTree',

  props: {
    provider: {
      type: Object as PropType<Provider>,
      required: true,
    },

    receiver: {
      type: Object as PropType<Receiver>,
      required: true,
    },
  },

  setup (props, { expose }) {
    let currentReceiver = props.receiver
    connectReceiver(currentReceiver)

    const tree = shallowRef(useReceived(props.receiver))

    watch(() => props.receiver, (receiver) => {
      tree.value.release()
      disconnectReceiver(currentReceiver, new RemoteLifecycleError(
        REMOTE_LIFECYCLE_REASON_RECEIVER_REPLACED,
        'Remote host commit was aborted because the HostedTree receiver binding was replaced'
      ))
      currentReceiver = receiver
      connectReceiver(currentReceiver)
      tree.value = useReceived(receiver)
    })

    expose({
      forceUpdate: () => tree.value.update(),
    })

    onUnmounted(() => {
      disconnectReceiver(currentReceiver, new RemoteLifecycleError(
        REMOTE_LIFECYCLE_REASON_HOST_UNMOUNTED,
        'Remote host commit was aborted because HostedTree was unmounted'
      ))
      tree.value.release()
    })

    return () => tree.value.children.value
      .filter(child => !isText(child) || child.text.value.length > 0)
      .map(root => render(root, props.provider))
  },
}) as DefineComponent<{
    provider: Provider;
    receiver: Receiver;
}>
