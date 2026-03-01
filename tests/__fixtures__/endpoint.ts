import type { MessageEndpoint } from '@remote-ui/rpc'

import type { Component } from 'vue'

import type { WorkerApi } from './worker.api'

import {
  createEndpoint,
  release,
  retain,
} from '@remote-ui/rpc'

import {
  createRemoteRenderer,
  createRemoteRoot,
} from '@/vue/remote'

const clone = <T>(value: T): T => {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value)) as T
}

interface CreateWorkerEndpointOptions<State, Snapshot> {
  state: State;
  components: string[];
  resetState (state: State): void;
  snapshotState (state: State): Snapshot;
}

export const createWorkerEndpoint = <State, Snapshot>(
  component: Component,
  {
    state,
    components,
    resetState,
    snapshotState,
  }: CreateWorkerEndpointOptions<State, Snapshot>
) => {
  const endpoint = createEndpoint<WorkerApi<Snapshot>>(self as unknown as MessageEndpoint)

  let onRelease = () => {}

  endpoint.expose({
    async run (channel) {
      onRelease()
      resetState(state)

      retain(channel)

      const root = createRemoteRoot(channel, { components })
      const app = createRemoteRenderer(root).createApp(component)

      app.mount(root)
      await root.mount()

      onRelease = () => {
        app.unmount()
        release(channel)
      }
    },

    getState () {
      return clone(snapshotState(state))
    },

    resetState () {
      resetState(state)
    },

    release () {
      onRelease()
      onRelease = () => {}
    },
  })

  return endpoint
}
