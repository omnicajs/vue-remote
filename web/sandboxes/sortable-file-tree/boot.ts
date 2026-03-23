import type { SortableFileTreeSandboxHandle } from './host'

import { mountSortableFileTreeSandbox } from './host'

interface SandboxConfig {
  labels: {
    addFileLabel: string;
    addFolderLabel: string;
    booting: string;
    cancelLabel: string;
    collapseLabel: string;
    deleteLabel: string;
    dragCanceledAction: string;
    draggingAction: string;
    emptyFolderLabel: string;
    expandLabel: string;
    failed: string;
    fileAddedAction: string;
    fileKindLabel: string;
    folderAddedAction: string;
    folderKindLabel: string;
    initialAction: string;
    movedAction: string;
    newFileName: string;
    newFolderName: string;
    ready: string;
    removedAction: string;
    renameLabel: string;
    renamedAction: string;
    resetLabel: string;
    rootEyebrow: string;
    saveLabel: string;
    snapshotLabel: string;
    snapshotUnavailable: string;
    unsupported: string;
  };
}

const mounted = new Map<HTMLElement, Promise<SortableFileTreeSandboxHandle> | SortableFileTreeSandboxHandle>()

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

export const bootWorkerFileTreeSandboxes = () => {
  const roots = document.querySelectorAll<HTMLElement>('[data-worker-file-tree-sandbox]')

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
    const handle = mountSortableFileTreeSandbox({
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
  bootWorkerFileTreeSandboxes()
}
