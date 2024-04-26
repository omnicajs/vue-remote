import type { Channel } from '@/vue/host'
import type { Endpoint } from '@remote-ui/rpc'
import type { Provider } from '~types/vue/host'

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

import {
  createEndpoint,
  fromIframe,
} from '@remote-ui/rpc'

export type EndpointApi = {
  run (channel: Channel): Promise<void>;
  release (): void;
}

export const mount = (provider: Provider, src: string) => {
  const app = createApp(defineComponent({
    setup () {
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
          src,
          style: { display: 'none' } as CSSStyleDeclaration,
          onLoad: () => endpoint?.call?.run(receiver.receive),
        }),
      ]
    },
  }))

  app.mount('#host')

  return app
}

const HOSTNAME = 'process.env.SERVER'

export const src = (caseName: string) => `http://${HOSTNAME}:3000/remote/${caseName}`
