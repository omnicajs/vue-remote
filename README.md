# `@omnicajs/vue-remote`

[![codecov](https://codecov.io/gh/omnicajs/vue-remote/branch/main/graph/badge.svg)](https://codecov.io/gh/omnicajs/vue-remote)
[![Tests Status](https://github.com/omnicajs/vue-remote/actions/workflows/tests.yml/badge.svg)](https://github.com/omnicajs/vue-remote/actions)
[![npm version](https://badge.fury.io/js/%40omnicajs%2Fvue-remote.svg)](https://www.npmjs.com/package/@omnicajs/vue-remoteomnicajs/vue-remote)

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

### Install packages

```bash
make node_modules
```

### Tests

Vitest. Unit and integrations tests
```bash
make tests
```
or without using docker
```bash
yarn test
```
```bash
yarn test:coverage
```

Playwright. E2E tests
```bash
make e2e
```

or without using docker

```bash
yarn e2e:build
```
Launch server and don't close it before tests have finished
```bash
yarn e2e:serve
```
```bash
yarn e2e:test
```

## Description

Vue-remote lets you take tree-like structures created in a sandboxed JavaScript environment, 
and render them to the DOM in a different JavaScript environment. This allows you to isolate potentially-untrusted code
off the main thread, but still allow that code to render a controlled set of UI elements to the main page.

The easiest way to use vue-remote is to synchronize elements between a hidden iframe and the top-level page.

To use vue-remote, you’ll need a web project that is able to run two JavaScript environments: the “host” environment, 
which runs on the main HTML page and renders actual UI elements, and the “remote” environment, which is sandboxed 
and renders an invisible version of tree-like structures that will be mirrored by the host.

Next, on the “host” HTML page, you will need to create a “receiver”. This object will be responsible for receiving
the updates from the remote environment, and mapping them to actual DOM elements.

Vue-remote use [postMessage](https://developer.mozilla.org/ru/docs/Web/API/Window/postMessage) events from the iframe, 
in order to pass changes in the remote tree to receiver

See more about remote rendering: 
* [remote-rendering-with-web-workers](https://portal.gitnation.org/contents/remote-rendering-with-web-workers)
* [remote-dom](https://github.com/Shopify/remote-dom)
* [Remote Rendering: Shopify’s Take on Extensible UI](https://shopify.engineering/remote-rendering-ui-extensibility)

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

// Here we are defining Vue components provided by a host
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
  run (channel: Channel, api: {
    doSomethingOnHost (): void;
  }): Promise<void>;
  // useful to tell a remote application that it is time to quit
  release (): void;
}

const hostApp = defineComponent({
  props: {
    src: {
      type: String,
      required: true,
    },
  },

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

// src - remoteApp url
const app = createApp(hostApp, {src: 'localhost/remote'})
app.mount('#host')
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

  app.mount(root)

  return app
}

let onRelease = () => {}

// In order to proxy function properties and methods between environments,
// we need a library that can serialize functions over `postMessage`.
const endpoint = createEndpoint(fromInsideIframe())

const VButton = defineRemoteComponent('VButton')
const VInput = defineRemoteComponent('VInput', [
  'update:value',
] as unknown as {
  'update:value': (value: string) => true,
})

endpoint.expose({
  // This `run()` method will kick off the process of synchronizing
  // changes between environments. It will be called on the host.
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

### `createReceiver`

Creates a `Receiver` object. This object can accept the instructions from the remote application and reconstruct them into a virtual dom on the host. 
The virtual dom can then be used by Vue to render a real DOM in the host.

#### `createRemoteRoot()`

Creates a `RemoteRoot` object consumed by the `createRemoteRenderer()` method.

This function is used to create a `RemoteRoot`. It takes a `Channel` and an options object as arguments. 
The options object can include a components array and a strict boolean. 

The components array is used when creating a `RemoteRoot` in the remote environment. This array should contain the names 
of the components that the remote environment is allowed to render. These components are defined in the host environment 
and are provided to the remote environment through the `Provider` object.

The purpose of this array is to control what components the remote environment can use. This is important for security
and control over what the remote environment can do. By specifying the components in this array,
you ensure that the remote environment can only render the components that you have explicitly allowed.

Here's an example of how you might use it:

```typescript
const root = createRemoteRoot(channel, {
  components: ['Button', 'Input', 'List'], // These are the components that the remote environment can render
  strict: true,
});
```

In this example, the remote environment is only allowed to render the `Button`, `Input`, and `List` components. 
These components would be defined in the host environment and provided to the remote environment through the `Provider` object.

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
