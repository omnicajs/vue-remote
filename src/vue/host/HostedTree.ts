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

import { isText } from './tree'

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

  setup (props, { expose }) {
    const tree = shallowRef(useReceived(props.receiver))

    tree.value.update()

    watch(() => props.receiver, () => {
      tree.value.release()
      tree.value = useReceived(props.receiver)
      tree.value.update()
    })
    
    expose({
      forceUpdate: () => tree.value.update(true),
    })

    onUnmounted(tree.value.release)

    return () => tree.value.children.value
      .filter(child => !isText(child) || child.text.value.length > 0)
      .map(root => render(root, props.provider))
  },
}) as DefineComponent<{
    provider: Provider;
    receiver: Receiver;
}>
