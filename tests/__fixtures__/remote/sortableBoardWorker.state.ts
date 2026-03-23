import { reactive } from 'vue'

export interface SortableBoardItem {
  id: string;
  title: string;
}

export interface SortableBoardDropSnapshot {
  accepted: boolean;
  itemId: string;
  placement: 'before' | 'after' | 'inside' | null;
  sourceContainerId: string;
  targetContainerId: string | null;
  targetIndex: number | null;
  targetItemId: string | null;
}

export interface SortableBoardState {
  active: SortableBoardItem[];
  done: SortableBoardItem[];
  dragCancels: number;
  dragEnds: number;
  dragEnters: number;
  dragLeaves: number;
  dragMoves: number;
  dragStarts: number;
  horizontal: SortableBoardItem[];
  lastDrop: SortableBoardDropSnapshot | null;
}

const INITIAL_ACTIVE: SortableBoardItem[] = [
  { id: 'task-a', title: 'Alpha' },
  { id: 'task-b', title: 'Beta' },
]

const INITIAL_DONE: SortableBoardItem[] = []

const INITIAL_HORIZONTAL: SortableBoardItem[] = [
  { id: 'lane-a', title: 'Lane A' },
  { id: 'lane-b', title: 'Lane B' },
]

export const sortableBoardWorkerState = reactive<SortableBoardState>({
  active: INITIAL_ACTIVE.map(item => ({ ...item })),
  done: INITIAL_DONE.map(item => ({ ...item })),
  dragCancels: 0,
  dragEnds: 0,
  dragEnters: 0,
  dragLeaves: 0,
  dragMoves: 0,
  dragStarts: 0,
  horizontal: INITIAL_HORIZONTAL.map(item => ({ ...item })),
  lastDrop: null,
})

export const resetSortableBoardWorkerState = () => {
  sortableBoardWorkerState.active.splice(0, sortableBoardWorkerState.active.length, ...INITIAL_ACTIVE.map(item => ({ ...item })))
  sortableBoardWorkerState.done.splice(0, sortableBoardWorkerState.done.length, ...INITIAL_DONE.map(item => ({ ...item })))
  sortableBoardWorkerState.horizontal.splice(0, sortableBoardWorkerState.horizontal.length, ...INITIAL_HORIZONTAL.map(item => ({ ...item })))
  sortableBoardWorkerState.dragCancels = 0
  sortableBoardWorkerState.dragEnds = 0
  sortableBoardWorkerState.dragEnters = 0
  sortableBoardWorkerState.dragLeaves = 0
  sortableBoardWorkerState.dragMoves = 0
  sortableBoardWorkerState.dragStarts = 0
  sortableBoardWorkerState.lastDrop = null
}

export const snapshotSortableBoardWorkerState = () => ({
  active: sortableBoardWorkerState.active.map(item => ({ ...item })),
  done: sortableBoardWorkerState.done.map(item => ({ ...item })),
  dragCancels: sortableBoardWorkerState.dragCancels,
  dragEnds: sortableBoardWorkerState.dragEnds,
  dragEnters: sortableBoardWorkerState.dragEnters,
  dragLeaves: sortableBoardWorkerState.dragLeaves,
  dragMoves: sortableBoardWorkerState.dragMoves,
  dragStarts: sortableBoardWorkerState.dragStarts,
  horizontal: sortableBoardWorkerState.horizontal.map(item => ({ ...item })),
  lastDrop: sortableBoardWorkerState.lastDrop == null
    ? null
    : { ...sortableBoardWorkerState.lastDrop },
})
