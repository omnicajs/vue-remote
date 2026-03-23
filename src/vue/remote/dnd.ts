import type { Component, PropType } from 'vue'
import type {
  DragHandleBinding,
  RemoteSortableEvent,
  SortableContainerBinding,
  SortableItemBinding,
  SortableOrientation,
} from '@/dnd'

import {
  defineComponent,
  h,
} from 'vue'

import {
  INTERNAL_DND_CONTAINER_PROP,
  INTERNAL_DND_HANDLE_PROP,
  INTERNAL_DND_ITEM_PROP,
} from '@/vue/dnd'

type RenderTag = string | Component
type SortableListener = (event: RemoteSortableEvent) => void

const toContainerBinding = (
  props: {
    accepts?: string[];
    containerId: string;
    disabled: boolean;
    onDragenter?: SortableListener;
    onDragleave?: SortableListener;
    onDragmove?: SortableListener;
    onDrop?: SortableListener;
    orientation: SortableOrientation;
  }
): SortableContainerBinding => ({
  accepts: props.accepts,
  containerId: props.containerId,
  disabled: props.disabled,
  onDragenter: props.onDragenter,
  onDragleave: props.onDragleave,
  onDragmove: props.onDragmove,
  onDrop: props.onDrop,
  orientation: props.orientation,
})

const toItemBinding = (
  props: {
    containerId: string;
    disabled: boolean;
    index: number;
    itemId: string;
    onDragcancel?: SortableListener;
    onDragend?: SortableListener;
    onDragstart?: SortableListener;
    payload?: unknown;
    type: string;
  }
): SortableItemBinding => ({
  containerId: props.containerId,
  disabled: props.disabled,
  index: props.index,
  itemId: props.itemId,
  onDragcancel: props.onDragcancel,
  onDragend: props.onDragend,
  onDragstart: props.onDragstart,
  payload: props.payload,
  type: props.type,
})

const toHandleBinding = (
  props: {
    disabled: boolean;
    for?: string;
  }
): DragHandleBinding => ({
  disabled: props.disabled,
  for: props.for,
})

export const RemoteSortableContainer = defineComponent({
  name: 'RemoteSortableContainer',
  inheritAttrs: false,

  props: {
    as: {
      type: [String, Object, Function] as PropType<RenderTag>,
      default: 'div',
    },
    accepts: {
      type: Array as PropType<string[]>,
      default: undefined,
    },
    containerId: {
      type: String,
      required: true,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    onDragenter: {
      type: Function as PropType<SortableListener>,
      default: undefined,
    },
    onDragleave: {
      type: Function as PropType<SortableListener>,
      default: undefined,
    },
    onDragmove: {
      type: Function as PropType<SortableListener>,
      default: undefined,
    },
    onDrop: {
      type: Function as PropType<SortableListener>,
      default: undefined,
    },
    orientation: {
      type: String as PropType<SortableOrientation>,
      default: 'vertical',
    },
  },

  setup (props, { attrs, slots }) {
    return () => h(props.as, {
      ...attrs,
      [INTERNAL_DND_CONTAINER_PROP]: toContainerBinding(props),
    }, slots.default?.())
  },
})

export const RemoteSortableItem = defineComponent({
  name: 'RemoteSortableItem',
  inheritAttrs: false,

  props: {
    as: {
      type: [String, Object, Function] as PropType<RenderTag>,
      default: 'div',
    },
    containerId: {
      type: String,
      required: true,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    index: {
      type: Number,
      required: true,
    },
    itemId: {
      type: String,
      required: true,
    },
    onDragcancel: {
      type: Function as PropType<SortableListener>,
      default: undefined,
    },
    onDragend: {
      type: Function as PropType<SortableListener>,
      default: undefined,
    },
    onDragstart: {
      type: Function as PropType<SortableListener>,
      default: undefined,
    },
    payload: {
      type: null as unknown as PropType<unknown>,
      default: undefined,
    },
    type: {
      type: String,
      required: true,
    },
  },

  setup (props, { attrs, slots }) {
    return () => h(props.as, {
      ...attrs,
      [INTERNAL_DND_ITEM_PROP]: toItemBinding(props),
    }, slots.default?.())
  },
})

export const RemoteDragHandle = defineComponent({
  name: 'RemoteDragHandle',
  inheritAttrs: false,

  props: {
    as: {
      type: [String, Object, Function] as PropType<RenderTag>,
      default: 'span',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    for: {
      type: String,
      default: undefined,
    },
  },

  setup (props, { attrs, slots }) {
    return () => h(props.as, {
      ...attrs,
      [INTERNAL_DND_HANDLE_PROP]: toHandleBinding(props),
    }, slots.default?.())
  },
})
