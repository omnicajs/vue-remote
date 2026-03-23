<template>
    <section class="sortable-board">
        <RemoteSortableContainer
            id="board-active"
            class="board-column"
            container-id="active"
            :accepts="['task']"
            @dragenter="state.dragEnters++"
            @dragleave="state.dragLeaves++"
            @dragmove="state.dragMoves++"
            @drop="event => onDrop('active', event)"
        >
            <RemoteSortableItem
                v-for="(item, index) in state.active"
                :id="item.id === 'task-a' ? `card-${item.id}` : item.id"
                :key="item.id"
                :as="item.id === 'task-a' ? VCard : 'div'"
                class="board-item"
                container-id="active"
                :data-testid="`active-item-${item.id}`"
                :index="index"
                :item-id="item.id"
                type="task"
                @dragcancel="state.dragCancels++"
                @dragend="state.dragEnds++"
                @dragstart="state.dragStarts++"
            >
                <RemoteDragHandle
                    as="button"
                    class="board-item__handle"
                    :data-testid="`active-handle-${item.id}`"
                    :for="item.id === 'task-a' ? item.id : undefined"
                    type="button"
                >
                    Drag
                </RemoteDragHandle>
                <span>{{ item.title }}</span>
            </RemoteSortableItem>
        </RemoteSortableContainer>

        <RemoteSortableContainer
            id="board-done"
            class="board-column"
            container-id="done"
            :accepts="['task']"
            @drop="event => onDrop('done', event)"
        >
            <div v-if="state.done.length === 0" class="board-empty">Done</div>
            <RemoteSortableItem
                v-for="(item, index) in state.done"
                :id="item.id"
                :key="item.id"
                class="board-item"
                container-id="done"
                :data-testid="`done-item-${item.id}`"
                :index="index"
                :item-id="item.id"
                type="task"
                @dragcancel="state.dragCancels++"
                @dragend="state.dragEnds++"
                @dragstart="state.dragStarts++"
            >
                <RemoteDragHandle
                    as="button"
                    class="board-item__handle"
                    :data-testid="`done-handle-${item.id}`"
                    :for="item.id"
                    type="button"
                >
                    Drag
                </RemoteDragHandle>
                <span>{{ item.title }}</span>
            </RemoteSortableItem>
        </RemoteSortableContainer>

        <RemoteSortableContainer
            id="board-reject"
            class="board-column"
            container-id="reject"
            :accepts="['note']"
        >
            <div class="board-empty">Reject</div>
        </RemoteSortableContainer>

        <RemoteSortableContainer
            id="board-horizontal"
            class="board-row"
            container-id="horizontal"
            orientation="horizontal"
            :accepts="['lane']"
            @drop="event => onDrop('horizontal', event)"
        >
            <RemoteSortableItem
                v-for="(item, index) in state.horizontal"
                :id="item.id"
                :key="item.id"
                class="board-pill"
                container-id="horizontal"
                :data-testid="`horizontal-item-${item.id}`"
                :index="index"
                :item-id="item.id"
                type="lane"
                @dragcancel="state.dragCancels++"
                @dragend="state.dragEnds++"
                @dragstart="state.dragStarts++"
            >
                <RemoteDragHandle
                    as="button"
                    class="board-pill__handle"
                    :data-testid="`horizontal-handle-${item.id}`"
                    type="button"
                >
                    Drag
                </RemoteDragHandle>
                <span>{{ item.title }}</span>
            </RemoteSortableItem>
        </RemoteSortableContainer>
    </section>
</template>

<script setup lang="ts">
import type { RemoteSortableEvent } from '@/vue/remote'

import {
  RemoteDragHandle,
  RemoteSortableContainer,
  RemoteSortableItem,
} from '@/vue/remote'

import { VCard } from './components'
import { sortableBoardWorkerState as state } from './sortableBoardWorker.state'

const containers = {
  active: state.active,
  done: state.done,
  horizontal: state.horizontal,
}

const moveBetween = (
  sourceContainerId: keyof typeof containers,
  targetContainerId: keyof typeof containers,
  itemId: string,
  targetIndex: number
) => {
  const source = containers[sourceContainerId]
  const target = containers[targetContainerId]
  const sourceIndex = source.findIndex(item => item.id === itemId)

  if (sourceIndex < 0) {
    return
  }

  const [item] = source.splice(sourceIndex, 1)
  target.splice(targetIndex, 0, item)
}

const rememberDrop = (event: RemoteSortableEvent) => {
  state.lastDrop = {
    accepted: event.accepted,
    itemId: event.itemId,
    placement: event.placement,
    sourceContainerId: event.sourceContainerId,
    targetContainerId: event.targetContainerId,
    targetIndex: event.targetIndex,
    targetItemId: event.targetItemId,
  }
}

const onDrop = (
  containerId: keyof typeof containers,
  event: RemoteSortableEvent
) => {
  rememberDrop(event)

  if (event.targetContainerId == null || event.targetIndex == null) {
    return
  }

  moveBetween(containerId === 'horizontal' ? 'horizontal' : event.sourceContainerId as keyof typeof containers, event.targetContainerId as keyof typeof containers, event.itemId, event.targetIndex)
}
</script>
