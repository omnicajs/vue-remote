# `@omnicajs/vue-remote`

Proxy renderer for [Vue.js v3](https://v3.vuejs.org) based on `@remote-ui/rpc` and designed to provide necessary tools
for embedding remote applications into your main application.

## Installation

Using `yarn`:

```
yarn add @omnicajs/vue-remote
```

or, using `npm`:

```
npm install @omnicajs/vue-remote --save
```

## Usage

### Basic example

Host application:

```typescript
import type { PropType } from 'vue'
import type { Channel } from '@omnicejs/vue-remote/host'
import type { Endpoint } from '@remote-ui/rpc'

import {
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
} from '@omnicajs/vue-remote/host'

const provider = createProvider({
  VButton: defineComponent({
    props: {
      appearance: {
        type: String as PropType<'elevated' | 'outline' | 'text' | 'tonal'>,
        default: 'elevated',
      },
    },

    setup (props, { attrs, slots }) {
      return () => h('button', {
        ...attrs,
        class: [{
          ['v-button']: true,
          ['v-button' + props.appearance]: true,
        }, attrs.class],
      }, slots)
    },
  }),

  VInput: defineComponent({
    props: {
      type: {
        type: HTMLInputElement['type'],
        default: 'text',
      },

      value: {
        type: String,
        default: '',
      },
    },

    emits: ['update:value'],

    setup (props, { attrs, emit }) {
      return () => h('input', {
        ...attrs,
        ...props,
        onInput: (event) => emit('update:value', (event.target as HTMLInputElement).value),
      })
    },
  }),
})

type EndpointApi = {
  // starts a remote application
  run (channel: RemoteChannel, api: {
    doSomethingOnHost (): void;
  }): Promise<void>;
  // useful to tell a remote application that it is time to quit
  release (): void;
}

export default defineComponent({
  name: 'RemoteApp',

  props: {
    src: {
      type: String,
      required: true,
    },
  },

  setup () {
    const iframe = ref<HTMLIFrameElement | null>(null)
    const receiver = createRemoteReceiver()
    
    let endpoint: Endpoint | null = null

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
          endpoint?.call?.run(receiver.receive, {
            doSomethingOnHost (text: string) {
              // some logic to interact with host application
            },
          })
        },
      }),
    ]
  },
})
```

Remote application:

```typescript
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
} from '@omnicajs/vue-remote'

const createApp = async (channel, component, props) => {
  const root = createRemoteRoot(channel, {
    components: [
      'VButton',
      'VInput',
    ],
  })

  await root.mount()

  const app = createRemoteRenderer(root).createApp(component, props)

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
  async run (channel, api) {
    retain(channel)
    retain(api)

    const app = await createApp(channel, defineComponent({
      setup () {
        const text = ref('')

        return () => [
          h(VInput, { 'onUpdate:value': (value: string) => text.value = value }),
          h(VButton, { onClick: () => api.doSomethingOnHost(text.value) }, 'Do'),
        ]
      },
    }), {
        api,
    })

    onRelease = () => {
      release(channel)
      release(api)
    
      app.unmount()
    }
  },

  release () {
    onRelease()
  },
})
```

### Host environment

#### `HostedTree`

This component is used to interpret the instructions given from remote applications and transfer them into virtual dom,
that is processed by vue on the host into a real DOM.

Consumes:
* provider &ndash; instance of [`Provider`](types/vue/host.d.ts); used to determine what component should be used to
  render, if the given instruction doesn't belong to native DOM elements or vue slots;
* receiver &ndash; a channel to communicate with remote application.

#### `createProvider(keyValuePairs)`

Creates provider consumed by `HostedTree`. The only argument contains key-value pairs, where key is a component name
and value is the component constructor. You can call `createProvider` without that argument, if your remote app doesn't
rely on any host's component.

### Remote environment

#### `createRemoteRenderer()`

This method creates proxy renderer for Vue.js v3 that outputs instructions
to a [`@omnicajs/vue-remote/remote` `RemoteRoot`](https://github.com/omnicajs/vue-remote/blob/main/src/dom/remote/tree.ts) object.
The key feature of the library that provides a possibility to inject 3d-party logic through an isolated sandbox (iframe
for example, but not limited to).

To run a Vue application, you should call this method supplying a remote root (`RemoteRoot`).

#### `createRemoteRoot()`

Creates a `RemoteRoot` object consumed by the `createRemoteRenderer()` method.

#### `defineRemoteComponent()`

The way of defining Vue components that represent remote components provided by a host. We used this method in the
example above to define `VButton` & `VInput` components.

Also, you can specify the remote component’s prop types, which become the prop types of the generated Vue component:

```typescript
import { defineRemoteComponent } from '@omnicajs/vue-remote/remote'

export default defineRemoteComponent<'VButton', {
  appearance?: 'elevated' | 'outline' | 'text' | 'tonal'
}>('VButton', [
  'click',
] as unknown as {
  'click': () => true,
})
```
