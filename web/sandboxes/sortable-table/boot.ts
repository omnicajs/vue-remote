import type { SortableTableSandboxHandle } from './host'

import { mountSortableTableSandbox } from './host'

interface SandboxConfig {
  labels: {
    booting: string;
    failed: string;
    ready: string;
    resetLabel: string;
    snapshotLabel: string;
    snapshotUnavailable: string;
    unsupported: string;
  };
}

const mounted = new Map<HTMLElement, Promise<SortableTableSandboxHandle> | SortableTableSandboxHandle>()

let listenersBound = false

const cleanupAll = async () => {
  const handles = [...mounted.values()]
  mounted.clear()

  await Promise.all(handles.map(async handle => {
    try {
      const resolved = await handle
      await resolved.destroy()
    } catch {
      // Ignore teardown errors during docs navigation.
    }
  }))
}

export const bootWorkerTableSandboxes = () => {
  const roots = document.querySelectorAll<HTMLElement>('[data-worker-table-sandbox]')

  roots.forEach(root => {
    if (mounted.has(root)) {
      return
    }

    const configElement = root.querySelector<HTMLScriptElement>('[data-sandbox-config]')
    const rootElement = root.querySelector<HTMLElement>('[data-sandbox-root]')

    if (configElement == null || rootElement == null) {
      return
    }

    const config = JSON.parse(configElement.textContent ?? '{}') as SandboxConfig
    const handle = mountSortableTableSandbox({
      rootElement,
    }, config.labels)

    mounted.set(root, handle)
  })

  if (!listenersBound) {
    listenersBound = true
    window.addEventListener('pagehide', () => {
      void cleanupAll()
    })
    document.addEventListener('astro:before-swap', () => {
      void cleanupAll()
    })
  }
}

if (typeof document !== 'undefined') {
  bootWorkerTableSandboxes()
}
