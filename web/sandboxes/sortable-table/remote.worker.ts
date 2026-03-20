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

interface RoadmapRow {
  accent: 'amber' | 'blue' | 'mint';
  eta: string;
  id: string;
  owner: string;
  status: 'Blocked' | 'In review' | 'Ready';
  task: string;
}

interface TableSnapshot {
  lastAction: string;
  rowIds: string[];
}

interface SandboxWorkerApi {
  release (): void;
  run (channel: Channel, labels: SandboxUiLabels): Promise<void>;
}

interface SandboxUiLabels {
  booting: string;
  failed: string;
  ready: string;
  resetLabel: string;
  snapshotLabel: string;
  snapshotUnavailable?: string;
  unsupported: string;
}

const endpoint = createEndpoint<SandboxWorkerApi>(self as unknown as MessageEndpoint)

const initialRows = (): RoadmapRow[] => ([
  {
    accent: 'mint',
    eta: 'Today',
    id: 'row-1',
    owner: 'Dina',
    status: 'Ready',
    task: 'Publish the sortable DnD API guide',
  },
  {
    accent: 'amber',
    eta: 'Tomorrow',
    id: 'row-2',
    owner: 'Marco',
    status: 'Blocked',
    task: 'Validate overlay geometry for table rows',
  },
  {
    accent: 'blue',
    eta: 'Mon',
    id: 'row-3',
    owner: 'Aya',
    status: 'In review',
    task: 'Document worker sandbox behavior end to end',
  },
  {
    accent: 'mint',
    eta: 'Wed',
    id: 'row-4',
    owner: 'Nora',
    status: 'Ready',
    task: 'Wire live examples into the docs navigation',
  },
])

const cloneSnapshot = (rows: RoadmapRow[], lastAction: string): TableSnapshot => ({
  lastAction,
  rowIds: rows.map(row => row.id),
})

const rows = ref<RoadmapRow[]>(initialRows())
const lastAction = ref('Drag rows by their handle to reorder the release queue.')
let uiLabels: SandboxUiLabels = {
  booting: '',
  failed: '',
  ready: '',
  resetLabel: 'Reset table',
  snapshotLabel: 'Snapshot',
  unsupported: '',
}

let releaseRemote = () => {}

const moveRow = (event: RemoteSortableEvent) => {
  if (!event.accepted || event.targetIndex == null) {
    lastAction.value = `Drop ignored for ${event.itemId}.`
    return
  }

  const sourceIndex = rows.value.findIndex(row => row.id === event.itemId)

  if (sourceIndex < 0) {
    lastAction.value = `Row ${event.itemId} was not found.`
    return
  }

  const [row] = rows.value.splice(sourceIndex, 1)
  const nextIndex = Math.min(Math.max(event.targetIndex, 0), rows.value.length)

  rows.value.splice(nextIndex, 0, row)
  lastAction.value = `"${row.task}" moved to position ${nextIndex + 1}.`
}

const setDragStart = (row: RoadmapRow) => {
  lastAction.value = `Dragging "${row.task}".`
}

const setDragCancel = (row: RoadmapRow) => {
  lastAction.value = `Drag canceled for "${row.task}".`
}

const resetTable = () => {
  rows.value = initialRows()
  lastAction.value = 'Drag rows by their handle to reorder the release queue.'
}

const statusClassName = (status: RoadmapRow['status']) => {
  switch (status) {
    case 'Blocked':
      return 'sandbox-table__status sandbox-table__status--blocked'
    case 'In review':
      return 'sandbox-table__status sandbox-table__status--review'
    default:
      return 'sandbox-table__status sandbox-table__status--ready'
  }
}

const TableApp = defineComponent({
  name: 'WorkerSortableTableSandbox',

  setup () {
    const renderGrip = () => h('svg', {
      'aria-hidden': 'true',
      class: 'sandbox-table__grip',
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

    const renderRow = (row: RoadmapRow, index: number) => {
      return h(RemoteSortableItem, {
        as: 'tr',
        class: `sandbox-table__row sandbox-table__row--${row.accent}`,
        containerId: 'release-table',
        'data-testid': `sandbox-row-${row.id}`,
        index,
        itemId: row.id,
        onDragcancel: () => setDragCancel(row),
        onDragstart: () => setDragStart(row),
        type: 'release-row',
      }, {
        default: () => [
          h('td', { class: 'sandbox-table__cell sandbox-table__cell--rank' }, [
            h('div', { class: 'sandbox-table__rank-slot' }, [
              h('span', {
                class: 'sandbox-table__rank',
                'data-testid': `sandbox-rank-${row.id}`,
              }, `#${String(index + 1).padStart(2, '0')}`),
              h(RemoteDragHandle, {
                as: 'button',
                'aria-label': `Drag ${row.task}`,
                class: 'sandbox-table__handle',
                'data-testid': `sandbox-handle-${row.id}`,
                type: 'button',
              }, {
                default: renderGrip,
              }),
            ]),
          ]),
          h('td', { class: 'sandbox-table__cell' }, [
            h('div', { class: 'sandbox-table__task' }, [
              h('p', { class: 'sandbox-table__task-title' }, row.task),
              h('span', { class: 'sandbox-table__task-meta' }, row.id),
            ]),
          ]),
          h('td', { class: 'sandbox-table__cell' }, [
            h('span', { class: 'sandbox-table__owner' }, row.owner),
          ]),
          h('td', { class: 'sandbox-table__cell' }, [
            h('span', { class: 'sandbox-table__eta' }, row.eta),
          ]),
          h('td', { class: 'sandbox-table__cell' }, [
            h('span', { class: statusClassName(row.status) }, row.status),
          ]),
        ],
      })
    }

    return () => h('div', { class: 'worker-table-sandbox__runtime' }, [
      h('div', { class: 'worker-table-sandbox__toolbar' }, [
        h('span', {
          class: 'worker-table-sandbox__status',
          'data-sandbox-status': '',
        }, uiLabels.ready),
        h('button', {
          class: 'worker-table-sandbox__reset',
          'data-sandbox-reset': '',
          onClick: resetTable,
          type: 'button',
        }, uiLabels.resetLabel),
      ]),
      h('div', { class: 'worker-table-sandbox__preview' }, [
        h('div', { class: 'sandbox-table-demo' }, [
          h('div', { class: 'sandbox-table-demo__toolbar' }, [
            h('p', { class: 'sandbox-table-demo__eyebrow' }, 'Release queue'),
            h('p', { class: 'sandbox-table-demo__caption' }, lastAction.value),
          ]),
          h('div', { class: 'sandbox-table-shell' }, [
            h('table', {
              class: 'sandbox-table',
              'data-testid': 'sandbox-table',
            }, [
              h('thead', { class: 'sandbox-table__head' }, [
                h('tr', [
                  h('th', 'Rank'),
                  h('th', 'Task'),
                  h('th', 'Owner'),
                  h('th', 'ETA'),
                  h('th', 'Status'),
                ]),
              ]),
              h(RemoteSortableContainer, {
                as: 'tbody',
                accepts: ['release-row'],
                class: 'sandbox-table__body',
                containerId: 'release-table',
                'data-testid': 'sandbox-table-body',
                onDrop: moveRow,
                orientation: 'vertical',
              }, {
                default: () => rows.value.map((row, index) => renderRow(row, index)),
              }),
            ]),
          ]),
        ]),
      ]),
      h('div', {
        class: 'worker-table-sandbox__snapshot',
        'data-sandbox-snapshot-wrap': '',
      }, [
        h('div', { class: 'worker-table-sandbox__snapshot-title' }, uiLabels.snapshotLabel),
        h('pre', {
          class: 'worker-table-sandbox__snapshot-code',
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

    const app = createRemoteRenderer(root).createApp(TableApp)
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
