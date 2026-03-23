import type { Channel } from '@omnicajs/vue-remote/host'

import { createEndpoint, fromWebWorker } from '@remote-ui/rpc'
import {
  createApp,
  h,
} from 'vue'

import {
  HostedTree,
  createProvider,
  createReceiver,
} from '@omnicajs/vue-remote/host'

interface SandboxWorkerApi {
  release (): void;
  run (channel: Channel, labels: SortableKanbanSandboxLabels): Promise<void>;
}

export interface SortableKanbanSandboxLabels {
  booting: string;
  failed: string;
  ready: string;
  resetLabel: string;
  snapshotLabel: string;
  snapshotUnavailable?: string;
  unsupported: string;
}

export interface SortableKanbanSandboxElements {
  rootElement: HTMLElement;
}

export interface SortableKanbanSandboxHandle {
  destroy (): Promise<void>;
}

export const mountSortableKanbanSandbox = async (
  elements: SortableKanbanSandboxElements,
  labels: SortableKanbanSandboxLabels
): Promise<SortableKanbanSandboxHandle> => {
  const { rootElement } = elements

  if (typeof Worker === 'undefined') {
    rootElement.textContent = labels.unsupported

    return {
      async destroy () {},
    }
  }

  rootElement.textContent = labels.booting

  const receiver = createReceiver()
  const provider = createProvider()
  const host = createApp({
    render: () => h(HostedTree, { provider, receiver }),
  })
  const worker = new Worker(new URL('./remote.worker.ts', import.meta.url), {
    type: 'module',
  })
  const endpoint = createEndpoint<SandboxWorkerApi>(fromWebWorker(worker))
  let destroyed = false

  const destroy = async () => {
    if (destroyed) {
      return
    }

    destroyed = true

    try {
      await endpoint.call.release()
    } catch {
      // Worker teardown should not block page cleanup.
    } finally {
      endpoint.terminate()
      worker.terminate()
      host.unmount()
      rootElement.innerHTML = ''
    }
  }

  try {
    host.mount(rootElement)
    await endpoint.call.run(receiver.receive, labels)
  } catch (error) {
    await destroy()
    rootElement.textContent = `${labels.failed}: ${error instanceof Error ? error.message : String(error)}`
  }

  return {
    destroy,
  }
}
