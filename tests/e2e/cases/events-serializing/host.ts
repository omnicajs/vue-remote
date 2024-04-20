import type { Channel } from '@/dom/host'
import type { Endpoint } from '@remote-ui/rpc'

import {
  createApp,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue'

import {
  createEndpoint,
  fromIframe,
} from '@remote-ui/rpc'

import {
  HostedTree,
  createProvider,
  createReceiver,
} from '@/vue/host'

const provider = createProvider()

type EndpointApi = {
    run (channel: Channel): Promise<void>;
    release (): void;
}

const RemoteApp = defineComponent({
  props: {
    src: {
      type: String,
      required: true,
    },
  },

  setup (props) {
    const iframe = ref<HTMLIFrameElement | null>(null)
    const receiver = createReceiver()

    let endpoint: Endpoint<EndpointApi> | null = null

    onMounted(() => {
      endpoint = createEndpoint<EndpointApi>(fromIframe(iframe.value as HTMLIFrameElement, {
        terminate: false,
      }))
    })

    onBeforeUnmount(() => endpoint?.call.release())

    return () => [
      h(HostedTree, { provider, receiver }),
      h('iframe', {
        ref: iframe,
        src: props.src,
        style: { display: 'none' } as CSSStyleDeclaration,
        onLoad: () => {
          endpoint?.call?.run(receiver.receive)
        },
      }),
    ]
  },
})

const HOSTNAME = 'process.env.SERVER'

const app = createApp(RemoteApp, {
  src: `http://${HOSTNAME}:3000/remote/events-serializing`,
})
app.mount('#host')