import type { RemoteChannel } from '@remote-ui/core'
import type { Endpoint } from '@remote-ui/rpc'

import {
  createApp,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue'

import { createRemoteReceiver } from '@remote-ui/core'

import {
  createEndpoint,
  fromIframe,
} from '@remote-ui/rpc'

import {
  AttachedRoot,
  createProvider,
} from '@/index'

import VButton from '~tests/integration/fixtures/host/VButton.vue'
import VInput from '~tests/integration/fixtures/host/VInput.vue'

const provider = createProvider({
  VButton,
  VInput,
})

type EndpointApi = {
    // starts a remote application
    run (channel: RemoteChannel): Promise<void>;
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
    const receiver = createRemoteReceiver()

    let endpoint: Endpoint<EndpointApi> | null = null

    onMounted(() => {
      endpoint = createEndpoint<EndpointApi>(fromIframe(iframe.value as HTMLIFrameElement, {
        terminate: false,
      }))
    })

    onBeforeUnmount(() => endpoint?.call.release())

    return () => [
      h(AttachedRoot, {
        provider,
        receiver,
      }),

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
  src: `http://${HOSTNAME}:3000/remote/events`,
})
app.mount('#host')