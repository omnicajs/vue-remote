import type { RemoteChannel } from '@remote-ui/core'
import type { Component } from 'vue'

import type {
  SerializedEvent,
  SerializedDragEvent,
  SerializedInputEvent,
  SerializedFocusEvent,
  SerializedKeyboardEvent,
  SerializedMouseEvent,
  SerializedPointerEvent,
  SerializedTouchEvent,
  SerializedWheelEvent,
} from '~types/events'

import {
  defineComponent,
  h,
  ref,
  reactive,  
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
} from '@/index'

const createApp = async <
  Props extends Record<string, unknown> | undefined = undefined
>(channel: RemoteChannel, component: Component<Props>) => {
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

endpoint.expose({
  async run (channel) {
    retain(channel)

    const app = await createApp(channel, defineComponent({
      setup () {
        const text = ref('')
        const events = reactive<SerializedEvent[]>([])

        return () => [
          h('input', { 
            onInput: (event: SerializedInputEvent) => {text.value = event.target.value; events.push(event)}, 
            onFocus: (event: SerializedFocusEvent) => events.push(event),
            onBlur: (event: SerializedFocusEvent) => events.push(event),
            onKeydown: (event: SerializedKeyboardEvent) => events.push(event),
            onWheel: (event: SerializedWheelEvent) => events.push(event),
            value: text.value, 
            placeholder: 'vue-remote',
          }),
          h('button', { 
            onMousedown: (event: SerializedMouseEvent) => { text.value = ''; events.push(event) },
            onPointerdown: (event: SerializedPointerEvent) => { text.value = ''; events.push(event) },
            onTouchstart: (event: SerializedTouchEvent) => events.push(event),
            onDragstart: (event: SerializedDragEvent) => events.push(event),
          }, 'Clear'),
          h('input', { id: 'events-json', type: 'hidden', value: JSON.stringify(events) }),
        ]
      } }))

    onRelease = () => {
      release(channel)

      app.unmount()
    }
  },

  release () {
    onRelease()
  },
})