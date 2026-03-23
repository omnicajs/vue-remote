import type { MessageEndpoint } from '@remote-ui/rpc'
import type { Channel } from '@omnicajs/vue-remote/host'
import type { RemoteSortableEvent } from '@omnicajs/vue-remote/remote'

import {
  createEndpoint,
  release,
  retain,
} from '@remote-ui/rpc'
import {
  RemoteDragHandle,
  RemoteSortableContainer,
  RemoteSortableItem,
  createRemoteRenderer,
  createRemoteRoot,
} from '@omnicajs/vue-remote/remote'
import {
  defineComponent,
  h,
  ref,
} from 'vue'

type FolderContainerId = `children:${string}`

interface FileNode {
  id: string;
  kind: 'file';
  name: string;
}

interface FolderNode {
  children: FileTreeNode[];
  expanded: boolean;
  id: string;
  kind: 'folder';
  name: string;
}

type FileTreeNode = FileNode | FolderNode

interface FileTreeSnapshot {
  lastAction: string;
  tree: Array<{
    children?: FileTreeSnapshot['tree'];
    id: string;
    kind: 'file' | 'folder';
    name: string;
  }>;
}

interface SandboxWorkerApi {
  release (): void;
  run (channel: Channel, labels: SandboxUiLabels): Promise<void>;
}

interface SandboxUiLabels {
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
  snapshotUnavailable?: string;
  unsupported: string;
}

const endpoint = createEndpoint<SandboxWorkerApi>(self as unknown as MessageEndpoint)

const ROOT_CONTAINER_ID = 'children:root' satisfies FolderContainerId

const initialTree = (): FileTreeNode[] => ([
  {
    children: [
      {
        children: [
          {
            id: 'file-host-ts',
            kind: 'file',
            name: 'host.ts',
          },
          {
            id: 'file-remote-ts',
            kind: 'file',
            name: 'remote.ts',
          },
        ],
        expanded: true,
        id: 'folder-vue',
        kind: 'folder',
        name: 'vue',
      },
      {
        children: [],
        expanded: true,
        id: 'folder-fixtures',
        kind: 'folder',
        name: 'fixtures',
      },
      {
        id: 'file-dnd-ts',
        kind: 'file',
        name: 'dnd.ts',
      },
    ],
    expanded: true,
    id: 'folder-src',
    kind: 'folder',
    name: 'src',
  },
  {
    children: [
      {
        id: 'file-introduction-mdx',
        kind: 'file',
        name: 'introduction.mdx',
      },
      {
        id: 'file-sortable-mdx',
        kind: 'file',
        name: 'sortable-dnd.mdx',
      },
    ],
    expanded: true,
    id: 'folder-docs',
    kind: 'folder',
    name: 'docs',
  },
  {
    id: 'file-package-json',
    kind: 'file',
    name: 'package.json',
  },
])

const isFolder = (node: FileTreeNode): node is FolderNode => node.kind === 'folder'

const cloneNode = (node: FileTreeNode): FileTreeNode => {
  if (!isFolder(node)) {
    return { ...node }
  }

  return {
    ...node,
    children: node.children.map(cloneNode),
  }
}

const cloneSnapshot = (nodes: FileTreeNode[], lastAction: string): FileTreeSnapshot => ({
  lastAction,
  tree: nodes.map(node => {
    if (!isFolder(node)) {
      return {
        id: node.id,
        kind: node.kind,
        name: node.name,
      }
    }

    return {
      children: cloneSnapshot(node.children, lastAction).tree,
      id: node.id,
      kind: node.kind,
      name: node.name,
    }
  }),
})

const replaceNode = (
  nodes: FileTreeNode[],
  id: string,
  updater: (node: FileTreeNode) => FileTreeNode
): FileTreeNode[] => {
  return nodes.map(node => {
    if (node.id === id) {
      return updater(node)
    }

    if (!isFolder(node)) {
      return node
    }

    return {
      ...node,
      children: replaceNode(node.children, id, updater),
    }
  })
}

const removeNode = (
  nodes: FileTreeNode[],
  id: string
): {
  nextNodes: FileTreeNode[];
  removed: FileTreeNode | null;
} => {
  let removed: FileTreeNode | null = null
  const nextNodes: FileTreeNode[] = []

  nodes.forEach(node => {
    if (node.id === id) {
      removed = node
      return
    }

    if (!isFolder(node)) {
      nextNodes.push(node)
      return
    }

    const nested = removeNode(node.children, id)

    if (nested.removed != null) {
      removed = nested.removed
      nextNodes.push({
        ...node,
        children: nested.nextNodes,
      })
      return
    }

    nextNodes.push(node)
  })

  return {
    nextNodes,
    removed,
  }
}

const insertNode = (
  nodes: FileTreeNode[],
  folderId: string,
  index: number,
  node: FileTreeNode
): FileTreeNode[] => {
  if (folderId === 'root') {
    const nextNodes = [...nodes]
    nextNodes.splice(Math.min(Math.max(index, 0), nextNodes.length), 0, node)
    return nextNodes
  }

  return nodes.map(entry => {
    if (!isFolder(entry)) {
      return entry
    }

    if (entry.id === folderId) {
      const nextChildren = [...entry.children]
      nextChildren.splice(Math.min(Math.max(index, 0), nextChildren.length), 0, node)

      return {
        ...entry,
        children: nextChildren,
        expanded: true,
      }
    }

    return {
      ...entry,
      children: insertNode(entry.children, folderId, index, node),
    }
  })
}

const containerFolderId = (containerId: string) => {
  return containerId === ROOT_CONTAINER_ID
    ? 'root'
    : containerId.replace(/^children:/, '')
}

const nodeContainsFolder = (node: FileTreeNode, folderId: string): boolean => {
  if (!isFolder(node)) {
    return false
  }

  if (node.id === folderId) {
    return true
  }

  return node.children.some(child => nodeContainsFolder(child, folderId))
}

const rows = ref<FileTreeNode[]>(initialTree())
const editingId = ref<string | null>(null)
const editingName = ref('')
const lastAction = ref('Manage folders and files, then drag nodes to reorder or move them.')

let nextNodeIndex = 1
let uiLabels: SandboxUiLabels = {
  addFileLabel: 'Add file',
  addFolderLabel: 'Add folder',
  booting: '',
  cancelLabel: 'Cancel',
  collapseLabel: 'Collapse',
  deleteLabel: 'Delete',
  dragCanceledAction: 'Drag canceled.',
  draggingAction: 'Dragging node.',
  emptyFolderLabel: 'Drop items here',
  expandLabel: 'Expand',
  failed: '',
  fileAddedAction: 'File created.',
  fileKindLabel: 'File',
  folderAddedAction: 'Folder created.',
  folderKindLabel: 'Folder',
  initialAction: 'Manage folders and files, then drag nodes to reorder or move them.',
  movedAction: 'Node moved.',
  newFileName: 'new-file.ts',
  newFolderName: 'new-folder',
  ready: '',
  removedAction: 'Node removed.',
  renameLabel: 'Rename',
  renamedAction: 'Name updated.',
  resetLabel: 'Reset tree',
  rootEyebrow: 'Workspace tree',
  saveLabel: 'Save',
  snapshotLabel: 'Snapshot',
  unsupported: '',
}

let releaseRemote = () => {}

const createNodeId = (prefix: 'file' | 'folder') => {
  nextNodeIndex += 1
  return `${prefix}-${nextNodeIndex}`
}

const clearEditing = () => {
  editingId.value = null
  editingName.value = ''
}

const setRows = (nextRows: FileTreeNode[]) => {
  rows.value = nextRows.map(cloneNode)
}

const startRename = (node: FileTreeNode) => {
  editingId.value = node.id
  editingName.value = node.name
}

const commitRename = (nodeId: string) => {
  const nextName = editingName.value.trim()

  if (nextName.length === 0) {
    return
  }

  setRows(replaceNode(rows.value, nodeId, node => ({
    ...node,
    name: nextName,
  })))
  clearEditing()
  lastAction.value = uiLabels.renamedAction
}

const toggleFolder = (folderId: string) => {
  setRows(replaceNode(rows.value, folderId, node => {
    if (!isFolder(node)) {
      return node
    }

    return {
      ...node,
      expanded: !node.expanded,
    }
  }))
}

const addNode = (parentFolderId: string, kind: 'file' | 'folder') => {
  const nextNode: FileTreeNode = kind === 'file'
    ? {
      id: createNodeId('file'),
      kind: 'file',
      name: uiLabels.newFileName,
    }
    : {
      children: [],
      expanded: true,
      id: createNodeId('folder'),
      kind: 'folder',
      name: uiLabels.newFolderName,
    }

  setRows(insertNode(rows.value, parentFolderId, Number.MAX_SAFE_INTEGER, nextNode))
  startRename(nextNode)
  lastAction.value = kind === 'file'
    ? uiLabels.fileAddedAction
    : uiLabels.folderAddedAction
}

const deleteNode = (nodeId: string) => {
  const removed = removeNode(rows.value, nodeId)

  if (removed.removed == null) {
    return
  }

  setRows(removed.nextNodes)

  if (editingId.value === nodeId) {
    clearEditing()
  }

  lastAction.value = uiLabels.removedAction
}

const resetTree = () => {
  nextNodeIndex = 1
  clearEditing()
  rows.value = initialTree()
  lastAction.value = uiLabels.initialAction
}

const setDragStart = () => {
  lastAction.value = uiLabels.draggingAction
}

const setDragCancel = () => {
  lastAction.value = uiLabels.dragCanceledAction
}

const moveNode = (event: RemoteSortableEvent) => {
  if (!event.accepted || event.targetContainerId == null || event.targetIndex == null) {
    return
  }

  const sourceRemoval = removeNode(rows.value, event.itemId)
  const removedNode = sourceRemoval.removed

  if (removedNode == null) {
    return
  }

  const targetFolderId = containerFolderId(event.targetContainerId)

  if (
    isFolder(removedNode)
    && targetFolderId !== 'root'
    && nodeContainsFolder(removedNode, targetFolderId)
  ) {
    lastAction.value = uiLabels.dragCanceledAction
    return
  }

  setRows(insertNode(sourceRemoval.nextNodes, targetFolderId, event.targetIndex, removedNode))
  lastAction.value = uiLabels.movedAction
}

const gripIcon = () => h('svg', {
  'aria-hidden': 'true',
  class: 'sandbox-tree__grip',
  fill: 'none',
  viewBox: '0 0 8 12',
}, [
  h('circle', { cx: '1.5', cy: '1.5', fill: 'currentColor', r: '1' }),
  h('circle', { cx: '6.5', cy: '1.5', fill: 'currentColor', r: '1' }),
  h('circle', { cx: '1.5', cy: '6', fill: 'currentColor', r: '1' }),
  h('circle', { cx: '6.5', cy: '6', fill: 'currentColor', r: '1' }),
  h('circle', { cx: '1.5', cy: '10.5', fill: 'currentColor', r: '1' }),
  h('circle', { cx: '6.5', cy: '10.5', fill: 'currentColor', r: '1' }),
])

const icon = (path: string, viewBox = '0 0 16 16') => h('svg', {
  'aria-hidden': 'true',
  class: 'sandbox-tree__action-icon',
  fill: 'none',
  viewBox,
}, [
  h('path', {
    d: path,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '1.5',
    stroke: 'currentColor',
  }),
])

const addFileIcon = () => icon('M8 3.25v9.5M3.25 8h9.5')
const addFolderIcon = () => h('svg', {
  'aria-hidden': 'true',
  class: 'sandbox-tree__action-icon',
  fill: 'none',
  viewBox: '0 0 16 16',
}, [
  h('path', {
    d: 'M2.75 5.25h3l1.1 1.5h6.4v5.5H2.75z',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '1.4',
    stroke: 'currentColor',
  }),
  h('path', {
    d: 'M8 8.25v3.5M6.25 10h3.5',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '1.4',
    stroke: 'currentColor',
  }),
])
const renameIcon = () => icon('M3 11.75l2.9-.65 5.55-5.55-2.25-2.25-5.55 5.55L3 11.75zM8.4 4.35l2.25 2.25')
const deleteIcon = () => icon('M5.5 5.5v5M8 5.5v5M10.5 5.5v5M4.5 3.5h7M6 3.5v-1h4v1M4.75 3.5l.5 8h5.5l.5-8')
const saveIcon = () => icon('M3.5 8.25l2.6 2.6 6.4-6.4')
const cancelIcon = () => icon('M4.25 4.25l7.5 7.5M11.75 4.25l-7.5 7.5')
const folderIcon = (title: string) => h('svg', {
  'aria-label': title,
  class: 'sandbox-tree__node-icon',
  fill: 'none',
  role: 'img',
  title,
  viewBox: '0 0 16 16',
}, [
  h('path', {
    d: 'M2.5 5.25h3.1l1.2 1.55h6.7v4.95H2.5z',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '1.5',
    stroke: 'currentColor',
  }),
])
const fileIcon = (title: string) => h('svg', {
  'aria-label': title,
  class: 'sandbox-tree__node-icon',
  fill: 'none',
  role: 'img',
  title,
  viewBox: '0 0 16 16',
}, [
  h('path', {
    d: 'M5 2.75h4.5l2 2v8.5H5z',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '1.5',
    stroke: 'currentColor',
  }),
  h('path', {
    d: 'M9.5 2.75v2h2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '1.5',
    stroke: 'currentColor',
  }),
])

const TreeApp = defineComponent({
  name: 'WorkerSortableFileTreeSandbox',

  setup () {
    const renderRowActions = (node: FileTreeNode) => {
      if (editingId.value === node.id) {
        return [
          h('button', {
            'aria-label': uiLabels.saveLabel,
            class: 'sandbox-tree__action',
            'data-testid': `sandbox-save-${node.id}`,
            onClick: () => commitRename(node.id),
            title: uiLabels.saveLabel,
            type: 'button',
          }, saveIcon()),
          h('button', {
            'aria-label': uiLabels.cancelLabel,
            class: 'sandbox-tree__action',
            'data-testid': `sandbox-cancel-${node.id}`,
            onClick: clearEditing,
            title: uiLabels.cancelLabel,
            type: 'button',
          }, cancelIcon()),
        ]
      }

      return [
        isFolder(node)
          ? h('button', {
            'aria-label': uiLabels.addFileLabel,
            class: 'sandbox-tree__action',
            'data-testid': `sandbox-add-file-${node.id}`,
            onClick: () => addNode(node.id, 'file'),
            title: uiLabels.addFileLabel,
            type: 'button',
          }, addFileIcon())
          : null,
        isFolder(node)
          ? h('button', {
            'aria-label': uiLabels.addFolderLabel,
            class: 'sandbox-tree__action',
            'data-testid': `sandbox-add-folder-${node.id}`,
            onClick: () => addNode(node.id, 'folder'),
            title: uiLabels.addFolderLabel,
            type: 'button',
          }, addFolderIcon())
          : null,
        h('button', {
          'aria-label': uiLabels.renameLabel,
          class: 'sandbox-tree__action',
          'data-testid': `sandbox-rename-${node.id}`,
          onClick: () => startRename(node),
          title: uiLabels.renameLabel,
          type: 'button',
        }, renameIcon()),
        h('button', {
          'aria-label': uiLabels.deleteLabel,
          class: 'sandbox-tree__action sandbox-tree__action--danger',
          'data-testid': `sandbox-delete-${node.id}`,
          onClick: () => deleteNode(node.id),
          title: uiLabels.deleteLabel,
          type: 'button',
        }, deleteIcon()),
      ].filter(Boolean)
    }

    const renderNode = (
      node: FileTreeNode,
      containerId: FolderContainerId,
      depth: number,
      index: number
    ): ReturnType<typeof h> => {
      const nodeClassName = `sandbox-tree__node sandbox-tree__node--${node.kind}`
      const rowClassName = `sandbox-tree__row sandbox-tree__row--${node.kind}`
      const childrenContainerId = `children:${node.id}` as FolderContainerId

      return h(RemoteSortableItem, {
        as: 'div',
        class: nodeClassName,
        containerId,
        'data-testid': `sandbox-node-${node.id}`,
        index,
        itemId: node.id,
        onDragcancel: setDragCancel,
        onDragstart: setDragStart,
        style: {
          '--tree-depth': String(depth),
        },
        type: 'fs-node',
      }, {
        default: () => [
          h('div', {
            class: rowClassName,
            'data-testid': `sandbox-row-${node.id}`,
          }, [
            h(RemoteDragHandle, {
              as: 'button',
              'aria-label': `Drag ${node.name}`,
              class: 'sandbox-tree__handle',
              'data-testid': `sandbox-handle-${node.id}`,
              type: 'button',
            }, {
              default: gripIcon,
            }),
            h('div', { class: 'sandbox-tree__row-main' }, [
              isFolder(node)
                ? h('button', {
                  'aria-label': node.expanded ? uiLabels.collapseLabel : uiLabels.expandLabel,
                  class: 'sandbox-tree__toggle',
                  'data-testid': `sandbox-toggle-${node.id}`,
                  onClick: () => toggleFolder(node.id),
                  type: 'button',
                }, node.expanded ? '−' : '+')
                : null,
              isFolder(node)
                ? folderIcon(uiLabels.folderKindLabel)
                : fileIcon(uiLabels.fileKindLabel),
              editingId.value === node.id
                ? h('input', {
                  class: 'sandbox-tree__input',
                  'data-testid': `sandbox-input-${node.id}`,
                  onInput: (event: Event) => {
                    const target = event.target

                    if (
                      typeof target === 'object'
                      && target != null
                      && 'value' in target
                      && typeof target.value === 'string'
                    ) {
                      editingName.value = target.value
                    }
                  },
                  onKeydown: (event: KeyboardEvent) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      commitRename(node.id)
                    }

                    if (event.key === 'Escape') {
                      event.preventDefault()
                      clearEditing()
                    }
                  },
                  value: editingName.value,
                })
                : h('div', { class: 'sandbox-tree__meta' }, [
                  h('span', { class: 'sandbox-tree__name' }, node.name),
                ]),
            ]),
            h('div', { class: 'sandbox-tree__row-actions' }, renderRowActions(node)),
          ]),
          isFolder(node) && node.expanded
            ? h(RemoteSortableContainer, {
              as: 'div',
              accepts: ['fs-node'],
              class: node.children.length === 0
                ? 'sandbox-tree__list sandbox-tree__children sandbox-tree__children--empty'
                : 'sandbox-tree__list sandbox-tree__children',
              containerId: childrenContainerId,
              'data-testid': `sandbox-children-${node.id}`,
              onDrop: moveNode,
              orientation: 'vertical',
            }, {
              default: () => node.children.length > 0
                ? node.children.map((child, childIndex) => renderNode(child, childrenContainerId, depth + 1, childIndex))
                : [
                  h('div', {
                    class: 'sandbox-tree__empty',
                    'data-testid': `sandbox-empty-${node.id}`,
                  }, uiLabels.emptyFolderLabel),
                ],
            })
            : null,
        ],
      })
    }

    return () => h('div', { class: 'worker-file-tree-sandbox__runtime' }, [
      h('div', { class: 'worker-file-tree-sandbox__toolbar' }, [
        h('span', {
          class: 'worker-file-tree-sandbox__status',
          'data-sandbox-status': '',
        }, uiLabels.ready),
        h('button', {
          class: 'worker-file-tree-sandbox__reset',
          'data-sandbox-reset': '',
          onClick: resetTree,
          type: 'button',
        }, uiLabels.resetLabel),
      ]),
      h('div', { class: 'worker-file-tree-sandbox__preview' }, [
        h('div', { class: 'sandbox-tree' }, [
          h('div', { class: 'sandbox-tree__toolbar' }, [
            h('p', { class: 'sandbox-tree__eyebrow' }, uiLabels.rootEyebrow),
            h('p', { class: 'sandbox-tree__caption' }, lastAction.value),
            h('div', { class: 'sandbox-tree__actions' }, [
              h('button', {
                'aria-label': uiLabels.addFileLabel,
                class: 'sandbox-tree__toolbar-action',
                'data-testid': 'sandbox-root-add-file',
                onClick: () => addNode('root', 'file'),
                title: uiLabels.addFileLabel,
                type: 'button',
              }, addFileIcon()),
              h('button', {
                'aria-label': uiLabels.addFolderLabel,
                class: 'sandbox-tree__toolbar-action',
                'data-testid': 'sandbox-root-add-folder',
                onClick: () => addNode('root', 'folder'),
                title: uiLabels.addFolderLabel,
                type: 'button',
              }, addFolderIcon()),
            ]),
          ]),
          h(RemoteSortableContainer, {
            as: 'div',
            accepts: ['fs-node'],
            class: 'sandbox-tree__list sandbox-tree__list--root',
            containerId: ROOT_CONTAINER_ID,
            'data-testid': 'sandbox-tree-root',
            onDrop: moveNode,
            orientation: 'vertical',
          }, {
            default: () => rows.value.map((node, index) => renderNode(node, ROOT_CONTAINER_ID, 0, index)),
          }),
        ]),
      ]),
      h('div', {
        class: 'worker-file-tree-sandbox__snapshot',
        'data-sandbox-snapshot-wrap': '',
      }, [
        h('div', { class: 'worker-file-tree-sandbox__snapshot-title' }, uiLabels.snapshotLabel),
        h('pre', {
          class: 'worker-file-tree-sandbox__snapshot-code',
          'data-sandbox-snapshot': '',
        }, JSON.stringify(cloneSnapshot(rows.value, lastAction.value), null, 2)),
      ]),
    ])
  },
})

endpoint.expose({
  async run (channel: Channel, labels: SandboxUiLabels) {
    uiLabels = labels
    retain(channel)

    const root = createRemoteRoot(channel)
    await root.mount()

    const app = createRemoteRenderer(root).createApp(TreeApp)
    app.mount(root)

    releaseRemote = () => {
      app.unmount()
      release(channel)
    }
  },

  release () {
    releaseRemote()
    releaseRemote = () => {}
  },
})
