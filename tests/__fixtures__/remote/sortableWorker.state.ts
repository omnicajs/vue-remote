import { reactive } from 'vue'

export interface SortableTask {
  id: string;
  title: string;
}

export interface SortableWorkerDropSnapshot {
  accepted: boolean;
  itemId: string;
  placement: 'before' | 'after' | 'inside' | null;
  sourceContainerId: string;
  targetContainerId: string | null;
  targetIndex: number | null;
  targetItemId: string | null;
}

export interface SortableWorkerState {
  cancelCount: number;
  items: SortableTask[];
  lastDrop: SortableWorkerDropSnapshot | null;
}

const INITIAL_ITEMS: SortableTask[] = [
  { id: 'task-1', title: 'First' },
  { id: 'task-2', title: 'Second' },
  { id: 'task-3', title: 'Third' },
]

export const sortableWorkerState = reactive<SortableWorkerState>({
  cancelCount: 0,
  items: INITIAL_ITEMS.map(item => ({ ...item })),
  lastDrop: null,
})

export const resetSortableWorkerState = () => {
  sortableWorkerState.cancelCount = 0
  sortableWorkerState.items.splice(0, sortableWorkerState.items.length, ...INITIAL_ITEMS.map(item => ({ ...item })))
  sortableWorkerState.lastDrop = null
}

export const snapshotSortableWorkerState = () => ({
  cancelCount: sortableWorkerState.cancelCount,
  items: sortableWorkerState.items.map(item => ({ ...item })),
  lastDrop: sortableWorkerState.lastDrop == null
    ? null
    : { ...sortableWorkerState.lastDrop },
})
