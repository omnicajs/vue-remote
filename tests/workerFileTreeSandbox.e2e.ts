import type { SortableFileTreeSandboxHandle } from '../web/sandboxes/sortable-file-tree/host'

import {
  afterEach,
  describe,
  expect,
  test,
} from 'vitest'
import { page } from 'vitest/browser'

import sandboxCss from '../web/components/WorkerFileTreeSandbox.css?raw'
import { mountSortableFileTreeSandbox } from '../web/sandboxes/sortable-file-tree/host'

interface SnapshotNode {
  children?: SnapshotNode[];
  id: string;
  kind: 'file' | 'folder';
  name: string;
}

interface FileTreeSnapshot {
  lastAction: string;
  tree: SnapshotNode[];
}

const labels = {
  addFileLabel: 'Add file',
  addFolderLabel: 'Add folder',
  booting: 'Booting dedicated Worker runtime...',
  cancelLabel: 'Cancel',
  collapseLabel: 'Collapse folder',
  deleteLabel: 'Delete',
  dragCanceledAction: 'Drag canceled.',
  draggingAction: 'Dragging node.',
  emptyFolderLabel: 'Drop files or folders here',
  expandLabel: 'Expand folder',
  failed: 'Worker sandbox failed',
  fileAddedAction: 'File created.',
  fileKindLabel: 'File',
  folderAddedAction: 'Folder created.',
  folderKindLabel: 'Folder',
  initialAction: 'Manage folders and files, then drag nodes to reorder or move them.',
  movedAction: 'Node moved.',
  newFileName: 'new-file.ts',
  newFolderName: 'new-folder',
  ready: 'Running in a dedicated Worker runtime',
  removedAction: 'Node removed.',
  renameLabel: 'Rename',
  renamedAction: 'Name updated.',
  resetLabel: 'Reset tree',
  rootEyebrow: 'Workspace tree',
  saveLabel: 'Save',
  snapshotLabel: 'Live remote snapshot',
  snapshotUnavailable: 'Remote snapshot is unavailable.',
  unsupported: 'This browser does not support module workers.',
}

const pointer = (
  type: string,
  coordinates: { clientX: number; clientY: number },
  options: Partial<PointerEventInit> = {}
) => new PointerEvent(type, {
  bubbles: true,
  button: 0,
  clientX: coordinates.clientX,
  clientY: coordinates.clientY,
  composed: true,
  isPrimary: true,
  pointerId: 23,
  pointerType: 'mouse',
  ...options,
})

const center = (element: Element) => {
  const rect = element.getBoundingClientRect()

  return {
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
  }
}

const upperHalf = (element: Element) => {
  const rect = element.getBoundingClientRect()

  return {
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height * 0.25,
  }
}

const required = <T>(value: T | null | undefined, message: string): T => {
  if (value == null) {
    throw new Error(message)
  }

  return value
}

const readSnapshot = (element: HTMLElement) => {
  return JSON.parse(element.textContent ?? '{}') as FileTreeSnapshot
}

const installSandboxStyles = () => {
  const style = document.createElement('style')

  style.dataset.testid = 'worker-file-tree-sandbox-styles'
  style.textContent = sandboxCss
  document.head.append(style)
}

const findSnapshotNode = (nodes: SnapshotNode[], id: string): SnapshotNode | null => {
  for (const node of nodes) {
    if (node.id === id) {
      return node
    }

    const nested = node.children == null
      ? null
      : findSnapshotNode(node.children, id)

    if (nested != null) {
      return nested
    }
  }

  return null
}

describe('workerFileTreeSandbox', () => {
  let handle: SortableFileTreeSandboxHandle | null = null

  afterEach(async () => {
    if (handle != null) {
      await handle.destroy()
      handle = null
    }

    document.body.innerHTML = ''
    document.head.querySelectorAll<HTMLStyleElement>('style[data-testid="worker-file-tree-sandbox-styles"]').forEach(node => node.remove())
  })

  test('mounts a dedicated worker sandbox and edits the file tree inline', async () => {
    await page.viewport(1440, 1200)
    installSandboxStyles()

    const root = document.createElement('section')
    root.className = 'worker-file-tree-sandbox'
    const runtimeRoot = document.createElement('div')

    root.append(runtimeRoot)
    document.body.append(root)

    handle = await mountSortableFileTreeSandbox({
      rootElement: runtimeRoot,
    }, labels)

    await expect.poll(() => {
      return root.querySelector<HTMLElement>('[data-sandbox-status]')?.textContent ?? null
    }).toBe(labels.ready)

    const snapshotElement = required(
      root.querySelector<HTMLElement>('[data-sandbox-snapshot]'),
      'Worker file tree snapshot was not rendered'
    )

    const renameButton = required(
      root.querySelector<HTMLButtonElement>('[data-testid="sandbox-rename-file-package-json"]'),
      'Rename button for package.json was not rendered'
    )

    renameButton.click()

    await expect.poll(() => {
      return root.querySelector<HTMLInputElement>('[data-testid="sandbox-input-file-package-json"]') != null
    }).toBe(true)

    const renameInput = required(
      root.querySelector<HTMLInputElement>('[data-testid="sandbox-input-file-package-json"]'),
      'Rename input for package.json was not rendered'
    )

    renameInput.value = 'workspace.json'
    renameInput.dispatchEvent(new Event('input', { bubbles: true }))

    await expect.poll(() => {
      return root.querySelector<HTMLButtonElement>('[data-testid="sandbox-save-file-package-json"]') != null
    }).toBe(true)

    const saveRename = required(
      root.querySelector<HTMLButtonElement>('[data-testid="sandbox-save-file-package-json"]'),
      'Save button for package.json rename was not rendered'
    )

    saveRename.click()

    await expect.poll(() => {
      return findSnapshotNode(readSnapshot(snapshotElement).tree, 'file-package-json')?.name ?? null
    }).toBe('workspace.json')

    const addRootFolder = required(
      root.querySelector<HTMLButtonElement>('[data-testid="sandbox-root-add-folder"]'),
      'Root add-folder button was not rendered'
    )

    addRootFolder.click()

    await expect.poll(() => {
      return root.querySelector<HTMLInputElement>('[data-testid^="sandbox-input-folder-"]') != null
    }).toBe(true)

    const newFolderInput = required(
      root.querySelector<HTMLInputElement>('[data-testid^="sandbox-input-folder-"]'),
      'Input for the new folder was not rendered'
    )

    newFolderInput.value = 'playground'
    newFolderInput.dispatchEvent(new Event('input', { bubbles: true }))

    await expect.poll(() => {
      return root.querySelector<HTMLButtonElement>('[data-testid^="sandbox-save-folder-"]') != null
    }).toBe(true)

    const saveNewFolder = required(
      root.querySelector<HTMLButtonElement>('[data-testid^="sandbox-save-folder-"]'),
      'Save button for the new folder was not rendered'
    )

    saveNewFolder.click()

    await expect.poll(() => {
      return readSnapshot(snapshotElement).tree.some(node => node.kind === 'folder' && node.name === 'playground')
    }).toBe(true)

    const deleteDocs = required(
      root.querySelector<HTMLButtonElement>('[data-testid="sandbox-delete-folder-docs"]'),
      'Delete button for docs was not rendered'
    )

    deleteDocs.click()

    await expect.poll(() => {
      return findSnapshotNode(readSnapshot(snapshotElement).tree, 'folder-docs')
    }).toBe(null)

    expect(readSnapshot(snapshotElement).lastAction).toBe(labels.removedAction)
  })

  test('moves a file into an empty nested folder through drag and drop', async () => {
    await page.viewport(1440, 1200)
    installSandboxStyles()

    const root = document.createElement('section')
    root.className = 'worker-file-tree-sandbox'
    const runtimeRoot = document.createElement('div')

    root.append(runtimeRoot)
    document.body.append(root)

    handle = await mountSortableFileTreeSandbox({
      rootElement: runtimeRoot,
    }, labels)

    await expect.poll(() => {
      return root.querySelector<HTMLElement>('[data-sandbox-status]')?.textContent ?? null
    }).toBe(labels.ready)

    const preview = required(
      root.querySelector<HTMLElement>('.worker-file-tree-sandbox__preview'),
      'Worker file tree preview was not rendered'
    )
    const snapshotElement = required(
      root.querySelector<HTMLElement>('[data-sandbox-snapshot]'),
      'Worker file tree snapshot was not rendered'
    )

    const startHandle = required(
      preview.querySelector<HTMLButtonElement>('[data-testid="sandbox-handle-file-dnd-ts"]'),
      'Drag handle for dnd.ts was not rendered'
    )
    const targetContainer = required(
      preview.querySelector<HTMLElement>('[data-testid="sandbox-children-folder-fixtures"]'),
      'Children container for fixtures was not rendered'
    )

    const start = center(startHandle)
    const target = center(targetContainer)

    startHandle.dispatchEvent(pointer('pointerdown', start))
    document.dispatchEvent(pointer('pointermove', {
      clientX: start.clientX + 12,
      clientY: start.clientY + 12,
    }))
    document.dispatchEvent(pointer('pointermove', target))

    await expect.poll(() => targetContainer.getAttribute('data-dnd-drop-allowed')).toBe('true')
    await expect.poll(() => document.querySelector('[data-dnd-overlay="true"] .sandbox-tree__row') != null).toBe(true)

    document.dispatchEvent(pointer('pointerup', target))

    await expect.poll(() => {
      return findSnapshotNode(readSnapshot(snapshotElement).tree, 'folder-fixtures')?.children?.map(child => child.id) ?? []
    }).toEqual(['file-dnd-ts'])

    await expect.poll(() => {
      return findSnapshotNode(readSnapshot(snapshotElement).tree, 'folder-src')?.children?.some(child => child.id === 'file-dnd-ts') ?? false
    }).toBe(false)

    expect(readSnapshot(snapshotElement).lastAction).toBe(labels.movedAction)
  })

  test('keeps nested list height stable while reordering inside the same folder', async () => {
    await page.viewport(1440, 1200)
    installSandboxStyles()

    const root = document.createElement('section')
    root.className = 'worker-file-tree-sandbox'
    const runtimeRoot = document.createElement('div')

    root.append(runtimeRoot)
    document.body.append(root)

    handle = await mountSortableFileTreeSandbox({
      rootElement: runtimeRoot,
    }, labels)

    await expect.poll(() => {
      return root.querySelector<HTMLElement>('[data-sandbox-status]')?.textContent ?? null
    }).toBe(labels.ready)

    const preview = required(
      root.querySelector<HTMLElement>('.worker-file-tree-sandbox__preview'),
      'Worker file tree preview was not rendered'
    )
    const nestedContainer = required(
      preview.querySelector<HTMLElement>('[data-testid="sandbox-children-folder-vue"]'),
      'Nested vue folder container was not rendered'
    )
    const startHandle = required(
      preview.querySelector<HTMLButtonElement>('[data-testid="sandbox-handle-file-remote-ts"]'),
      'Drag handle for remote.ts was not rendered'
    )
    const targetRow = required(
      preview.querySelector<HTMLElement>('[data-testid="sandbox-row-file-host-ts"]'),
      'Target row for host.ts was not rendered'
    )

    const beforeHeight = nestedContainer.getBoundingClientRect().height
    const start = center(startHandle)
    const target = upperHalf(targetRow)

    startHandle.dispatchEvent(pointer('pointerdown', start))
    document.dispatchEvent(pointer('pointermove', {
      clientX: start.clientX + 12,
      clientY: start.clientY + 12,
    }))
    document.dispatchEvent(pointer('pointermove', target))

    await expect.poll(() => {
      return document.querySelector('[data-dnd-overlay="true"] .sandbox-tree__row') != null
    }).toBe(true)

    const duringHeight = nestedContainer.getBoundingClientRect().height

    expect(Math.abs(duringHeight - beforeHeight)).toBeLessThan(1)
    expect(preview.querySelector('[data-dnd-placeholder="true"]')).not.toBeNull()

    document.dispatchEvent(pointer('pointerup', target))
  })
})
