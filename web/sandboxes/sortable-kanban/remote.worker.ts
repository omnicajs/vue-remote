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

type LaneId = 'backlog' | 'doing' | 'done'

interface BoardCard {
  accent: 'amber' | 'blue' | 'mint';
  id: string;
  title: string;
}

interface BoardSnapshot {
  lanes: Record<LaneId, BoardCard[]>;
  lastAction: string;
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

const laneOrder: LaneId[] = ['backlog', 'doing', 'done']
const laneTitles: Record<LaneId, string> = {
  backlog: 'Backlog',
  doing: 'In progress',
  done: 'Done',
}

const initialLanes = (): Record<LaneId, BoardCard[]> => ({
  backlog: [
    {
      accent: 'mint',
      id: 'task-1',
      title: 'Shape the public DnD contract',
    },
    {
      accent: 'amber',
      id: 'task-2',
      title: 'Verify worker transport behavior',
    },
  ],
  doing: [
    {
      accent: 'blue',
      id: 'task-3',
      title: 'Document the sortable runtime',
    },
  ],
  done: [
    {
      accent: 'mint',
      id: 'task-4',
      title: 'Cover host runtime with e2e tests',
    },
  ],
})

const cloneSnapshot = (
  lanes: Record<LaneId, BoardCard[]>,
  lastAction: string
): BoardSnapshot => ({
  lanes: {
    backlog: lanes.backlog.map(card => ({ ...card })),
    doing: lanes.doing.map(card => ({ ...card })),
    done: lanes.done.map(card => ({ ...card })),
  },
  lastAction,
})

const lanes = ref<Record<LaneId, BoardCard[]>>(initialLanes())
const lastAction = ref('Drag cards between columns or reorder them inside a lane.')
let uiLabels: SandboxUiLabels = {
  booting: '',
  failed: '',
  ready: '',
  resetLabel: 'Reset',
  snapshotLabel: 'Snapshot',
  unsupported: '',
}

let releaseRemote = () => {}

const moveCard = (event: RemoteSortableEvent) => {
  if (!event.accepted || event.targetContainerId == null || event.targetIndex == null) {
    lastAction.value = `Drop ignored for ${event.itemId}.`
    return
  }

  const sourceLane = event.sourceContainerId as LaneId
  const targetLane = event.targetContainerId as LaneId
  const sourceCards = lanes.value[sourceLane]
  const targetCards = lanes.value[targetLane]
  const sourceIndex = sourceCards.findIndex(card => card.id === event.itemId)

  if (sourceIndex < 0) {
    lastAction.value = `Card ${event.itemId} was not found.`
    return
  }

  const [card] = sourceCards.splice(sourceIndex, 1)
  const nextIndex = Math.min(Math.max(event.targetIndex, 0), targetCards.length)

  targetCards.splice(nextIndex, 0, card)
  lastAction.value = `"${card.title}" moved to ${laneTitles[targetLane]}.`
}

const setDragStart = (card: BoardCard) => {
  lastAction.value = `Dragging "${card.title}".`
}

const setDragCancel = (card: BoardCard) => {
  lastAction.value = `Drag canceled for "${card.title}".`
}

const resetBoard = () => {
  lanes.value = initialLanes()
  lastAction.value = 'Drag cards between columns or reorder them inside a lane.'
}

const BoardApp = defineComponent({
  name: 'WorkerKanbanBoardSandbox',

  setup () {
    const renderCard = (laneId: LaneId, card: BoardCard, index: number) => {
      return h(RemoteSortableItem, {
        as: 'article',
        class: `sandbox-card sandbox-card--${card.accent}`,
        containerId: laneId,
        'data-testid': `sandbox-card-${card.id}`,
        index,
        itemId: card.id,
        onDragcancel: () => setDragCancel(card),
        onDragstart: () => setDragStart(card),
        type: 'task',
      }, {
        default: () => [
          h('div', { class: 'sandbox-card__header' }, [
            h(RemoteDragHandle, {
              as: 'button',
              class: 'sandbox-card__handle',
              'data-testid': `sandbox-handle-${card.id}`,
            }, {
              default: () => 'Drag',
            }),
            h('span', { class: 'sandbox-card__eyebrow' }, card.id),
          ]),
          h('p', { class: 'sandbox-card__title' }, card.title),
        ],
      })
    }

    const renderLane = (laneId: LaneId) => {
      const cards = lanes.value[laneId]

      return h('section', {
        class: 'sandbox-lane',
        'data-testid': `sandbox-lane-${laneId}`,
      }, [
        h('header', { class: 'sandbox-lane__header' }, [
          h('h3', {
            class: 'sandbox-lane__title',
            'data-testid': `sandbox-lane-title-${laneId}`,
          }, laneTitles[laneId]),
          h('span', { class: 'sandbox-lane__count' }, String(cards.length)),
        ]),
        h(RemoteSortableContainer, {
          as: 'div',
          accepts: ['task'],
          class: cards.length > 0
            ? 'sandbox-lane__cards'
            : 'sandbox-lane__cards sandbox-lane__cards--empty',
          containerId: laneId,
          onDrop: moveCard,
          orientation: 'vertical',
        }, {
          default: () => cards.length > 0
            ? cards.map((card, index) => renderCard(laneId, card, index))
            : [
              h('div', { class: 'sandbox-lane__empty' }, 'Drop a card here'),
            ],
        }),
      ])
    }

    return () => h('div', { class: 'worker-kanban-sandbox__runtime' }, [
      h('div', { class: 'worker-kanban-sandbox__toolbar' }, [
        h('span', {
          class: 'worker-kanban-sandbox__status',
          'data-sandbox-status': '',
        }, uiLabels.ready),
        h('button', {
          class: 'worker-kanban-sandbox__reset',
          'data-sandbox-reset': '',
          onClick: resetBoard,
          type: 'button',
        }, uiLabels.resetLabel),
      ]),
      h('div', { class: 'worker-kanban-sandbox__preview' }, [
        h('div', { class: 'sandbox-board' }, [
          h('div', { class: 'sandbox-board__toolbar' }, [
            h('p', { class: 'sandbox-board__caption' }, lastAction.value),
          ]),
          h('div', { class: 'sandbox-board__lanes' }, laneOrder.map(renderLane)),
        ]),
      ]),
      h('div', {
        class: 'worker-kanban-sandbox__snapshot',
        'data-sandbox-snapshot-wrap': '',
      }, [
        h('div', { class: 'worker-kanban-sandbox__snapshot-title' }, uiLabels.snapshotLabel),
        h('pre', {
          class: 'worker-kanban-sandbox__snapshot-code',
          'data-sandbox-snapshot': '',
        }, JSON.stringify(cloneSnapshot(lanes.value, lastAction.value), null, 2)),
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

    const app = createRemoteRenderer(root).createApp(BoardApp)
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
