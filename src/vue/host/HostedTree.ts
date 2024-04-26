import type {
  DefineComponent,
  PropType,
} from 'vue'

import type { Receiver } from '@/dom/host'
import type { Provider } from '~types/vue/host'

import {
  defineComponent,
  onMounted,
  onUnmounted,
  shallowRef,
  watch,
} from 'vue'

import { isReceivedText } from '@/dom/host'

import render from './render'
import useReceived from './useReceived'

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

  setup (props) {
    const receiver = shallowRef(props.receiver)
    watch(() => props.receiver, () => receiver.value = props.receiver)

    const root = shallowRef(receiver.value.tree.root)
    const tree = shallowRef(useReceived(receiver, root))
    watch(receiver, () => {
      tree.value.release()
      root.value = receiver.value.tree.root
      tree.value = useReceived(receiver, root)
    })

    onMounted(tree.value.update)
    onUnmounted(tree.value.release)

    return () => tree.value.children.value
      .filter(({ node }) => !isReceivedText(node.value) || node.value.text.length > 0)
      .map(root => render(root, props.provider))
  },
}) as DefineComponent<{
    provider: Provider;
    receiver: Receiver;
}>
