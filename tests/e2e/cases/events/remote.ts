import type { Component } from 'vue'
import type { Channel } from '@/dom/remote'

import {
  defineComponent,
  h,
  ref,
} from 'vue'

import {
  createEndpoint,
  fromInsideIframe,
  release,
  retain,
} from '@remote-ui/rpc'

import {
  createRemoteRenderer,
  createRemoteRoot,
  defineRemoteComponent,
} from '@/vue/remote'

const createApp = async <
  Props extends Record<string, unknown> | undefined = undefined
>(channel: Channel, component: Component<Props>) => {
  const remoteRoot = createRemoteRoot(channel, {
    components: [
      'VButton',
      'VInput',
    ],
  })

  await remoteRoot.mount()

  const app = createRemoteRenderer(remoteRoot).createApp(component)

  app.mount(remoteRoot)

  return app
}

let onRelease = () => {}

const endpoint = createEndpoint(fromInsideIframe())

const VButton = defineRemoteComponent('VButton')
const VInput = defineRemoteComponent('VInput', [
  'update:value',
] as unknown as {
    'update:value': (value: string) => true,
})

endpoint.expose({
  async run (channel) {
    retain(channel)

    const app = await createApp(channel, defineComponent({
      setup () {
        const text = ref('')

        return () => [
          h(VInput, { 'onUpdate:value': (value: string) => text.value = value, value: text.value, placeholder: 'vue-remote' }),
          h(VButton, { onClick: () => {
            text.value = ''
            console.log('text.value', text.value)
          } }, 'Clear'),
        ]
      },
    }))

    onRelease = () => {
      release(channel)

      app.unmount()
    }
  },

  release () {
    onRelease()
  },
})