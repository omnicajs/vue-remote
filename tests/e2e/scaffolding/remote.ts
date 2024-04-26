import type { Channel } from '@/dom/common'
import type { Component } from 'vue'
import type { EndpointApi } from '~tests/e2e/scaffolding/host'

import type {
  RemoteRoot,
  RemoteRootOptions,
  SupportedBy,
} from '@/vue/remote'

import {
  createRemoteRenderer,
  createRemoteRoot,
} from '@/vue/remote'

import {
  createEndpoint as _createEndpoint,
  fromInsideIframe,
  release,
  retain,
} from '@remote-ui/rpc'

export const createApp = async <
  Props extends Record<string, unknown> | undefined = undefined,
  Supports extends SupportedBy<RemoteRoot> = SupportedBy<RemoteRoot>
>(
  channel: Channel,
  component: Component<Props>,
  options: RemoteRootOptions<Supports> = {}
) => {
  const root = createRemoteRoot(channel, options)
  await root.mount()

  const app = createRemoteRenderer(root).createApp(component)

  app.mount(root)

  return app
}

export const createEndpoint = () => _createEndpoint<EndpointApi>(fromInsideIframe())

export function run <
  Props extends Record<string, unknown> | undefined = undefined,
  Supports extends SupportedBy<RemoteRoot> = SupportedBy<RemoteRoot>
>(
  component: Component<Props>,
  options: RemoteRootOptions<Supports> = {}
) {
  const endpoint = createEndpoint()

  let onRelease = () => {}

  endpoint.expose({
    async run (channel) {
      retain(channel)

      const app = await createApp(channel, component, options)

      onRelease = () => {
        release(channel)

        app.unmount()
      }
    },

    release () { onRelease() },
  })

  return endpoint
}
