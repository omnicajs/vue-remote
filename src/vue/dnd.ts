export const INTERNAL_DND_CONTAINER_PROP = '__dnd:container'
export const INTERNAL_DND_ITEM_PROP = '__dnd:item'
export const INTERNAL_DND_HANDLE_PROP = '__dnd:handle'

export const INTERNAL_DND_PROP_NAMES = new Set([
  INTERNAL_DND_CONTAINER_PROP,
  INTERNAL_DND_ITEM_PROP,
  INTERNAL_DND_HANDLE_PROP,
])

export type {
  DragHandleBinding,
  RemoteSortableEvent,
  RemoteSortablePointer,
  SortableContainerBinding,
  SortableItemBinding,
  SortableOrientation,
  SortablePlacement,
} from '@/dnd'
