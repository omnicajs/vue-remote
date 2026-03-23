export type SortableOrientation = 'vertical' | 'horizontal'
export type SortablePlacement = 'before' | 'after' | 'inside'

export interface RemoteSortablePointer {
  clientX: number;
  clientY: number;
}

export interface RemoteSortableEvent {
  type: string;
  itemId: string;
  sessionId: string;
  sourceContainerId: string;
  targetContainerId: string | null;
  targetIndex: number | null;
  targetItemId: string | null;
  placement: SortablePlacement | null;
  pointer: RemoteSortablePointer;
  payload?: unknown;
  accepted: boolean;
}

export interface SortableContainerBinding {
  containerId: string;
  accepts?: string[];
  orientation: SortableOrientation;
  disabled?: boolean;
  onDragenter?: unknown;
  onDragleave?: unknown;
  onDragmove?: unknown;
  onDrop?: unknown;
}

export interface SortableItemBinding {
  type: string;
  itemId: string;
  containerId: string;
  index: number;
  payload?: unknown;
  disabled?: boolean;
  onDragcancel?: unknown;
  onDragend?: unknown;
  onDragstart?: unknown;
}

export interface DragHandleBinding {
  disabled?: boolean;
  for?: string;
}
