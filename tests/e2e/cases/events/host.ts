import type { Channel } from '@/dom/host'
import type { Endpoint } from '@remote-ui/rpc'

import { HostedTree } from '@/vue/host'

import {
  createApp,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue'

import { createReceiver } from '@/dom/host'
import { createProvider } from '@/vue/host'

import {
  createEndpoint,
  fromIframe,
} from '@remote-ui/rpc'

import VButton from '~tests/integration/fixtures/host/VButton.vue'
import VInput from '~tests/integration/fixtures/host/VInput.vue'

const provider = createProvider({
  VButton,
  VInput,
})

type EndpointApi = {
    // starts a remote application
    run (channel: Channel): Promise<void>;
    // useful to tell a remote application that it is time to quit
    release (): void;
}

const RemoteApp = defineComponent({
  name: 'RemoteApp',

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
        onLoad: () => endpoint?.call?.run(receiver.receive),
      }),
    ]
  },
})

const HOSTNAME = 'process.env.SERVER'

const app = createApp(RemoteApp, {
  src: `http://${HOSTNAME}:3000/remote/events`,
})
app.mount('#host')