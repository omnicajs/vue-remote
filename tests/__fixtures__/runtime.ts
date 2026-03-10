import type { Component } from 'vue'

import type { Receiver } from '@/dom/host'

import type {
  WorkerApi,
} from './worker.api'

import {
  createEndpoint,
  fromWebWorker,
} from '@remote-ui/rpc'

import {
  createApp,
  h,
} from 'vue'

import { HostedTree } from '@/vue/host'

import { createProvider } from '@/vue/host'
import { createReceiver } from '@/dom/host'

const createHost = (receiver: Receiver, components: {
  [key: string]: Component<NonNullable<unknown>>;
}) => {
  const provider = createProvider(components)

  return createApp({
    render: () => h(HostedTree, { provider, receiver }),
  })
}

const waitTick = async () => {
  await new Promise<void>(resolve => setTimeout(resolve, 0))
}

export interface WorkerRuntime<Snapshot> {
  readonly container: HTMLElement;
  flushOnce (): Promise<void>;
  flush (): Promise<void>;
  read (): Promise<Snapshot>;
  reset (): Promise<void>;
  unmountHost (): void;
  tearDown (): Promise<void>;
}

export const createWorkerRuntime = async <Snapshot>({
  worker,
  provider,
}: {
  worker: Worker;
  provider: { [key: string]: Component<NonNullable<unknown>> };
}): Promise<WorkerRuntime<Snapshot>> => {
  const container = document.createElement('div')
  const endpoint = createEndpoint<WorkerApi<Snapshot>>(fromWebWorker(worker))
  const receiver = createReceiver()

  document.body.append(container)

  const host = createHost(receiver, provider)
  let hostMounted = false

  host.mount(container)
  hostMounted = true

  const flush = async () => {
    await waitTick()
    await receiver.flush()
    await waitTick()
    await receiver.flush()
  }

  await endpoint.call.run(receiver.receive)
  await flush()

  return {
    container,
    async flushOnce () {
      await waitTick()
      await receiver.flush()
    },
    flush,
    read: () => endpoint.call.getState() as Promise<Snapshot>,
    reset: () => endpoint.call.resetState(),
    unmountHost () {
      if (!hostMounted) {
        return
      }

      host.unmount()
      hostMounted = false
    },
    async tearDown () {
      try {
        await endpoint.call.release()
      } finally {
        endpoint.terminate()
        worker.terminate()
        if (hostMounted) {
          host.unmount()
          hostMounted = false
        }
        container.remove()
      }
    },
  }
}
