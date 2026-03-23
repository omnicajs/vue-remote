<template>
    <RemoteSortableContainer
        id="sortable-list"
        class="sortable-list"
        container-id="tasks"
        :accepts="['task']"
        @drop="onDrop"
    >
        <RemoteSortableItem
            v-for="(task, index) in state.items"
            :id="task.id"
            :key="task.id"
            class="sortable-item"
            :container-id="'tasks'"
            :data-testid="`item-${task.id}`"
            :index="index"
            :item-id="task.id"
            :payload="{ taskId: task.id }"
            type="task"
            @dragcancel="state.cancelCount++"
        >
            <div class="sortable-item__content">
                <RemoteDragHandle
                    as="button"
                    class="sortable-item__handle"
                    :data-testid="`handle-${task.id}`"
                    :for="task.id"
                    type="button"
                >
                    Drag
                </RemoteDragHandle>
                <span>{{ task.title }}</span>
            </div>
        </RemoteSortableItem>
    </RemoteSortableContainer>
</template>

<script setup lang="ts">
import type { RemoteSortableEvent } from '@/vue/remote'

import {
  RemoteDragHandle,
  RemoteSortableContainer,
  RemoteSortableItem,
} from '@/vue/remote'

import { sortableWorkerState as state } from './sortableWorker.state'

const moveItem = (from: number, to: number) => {
  if (from === to || from < 0 || to < 0 || from >= state.items.length || to > state.items.length) {
    return
  }

  const [item] = state.items.splice(from, 1)
  state.items.splice(to, 0, item)
}

const onDrop = (event: RemoteSortableEvent) => {
  state.lastDrop = {
    accepted: event.accepted,
    itemId: event.itemId,
    placement: event.placement,
    sourceContainerId: event.sourceContainerId,
    targetContainerId: event.targetContainerId,
    targetIndex: event.targetIndex,
    targetItemId: event.targetItemId,
  }

  if (event.targetIndex == null) {
    return
  }

  const sourceIndex = state.items.findIndex(item => item.id === event.itemId)

  moveItem(sourceIndex, event.targetIndex)
}
</script>
