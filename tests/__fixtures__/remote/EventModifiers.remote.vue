<template>
    <section id="modifier-parent" @click="state.parentClicks++">
        <button id="modifier-dom" @click.stop.prevent="onDomClick">DOM</button>
        <div id="modifier-self" @click.self="state.selfClicks++">
            <span id="modifier-self-child">Inner</span>
        </div>
        <button id="modifier-key" @keydown.ctrl.enter.exact="state.keyHits++">Key</button>
        <VButton id="modifier-component" @click.once.prevent="onComponentClick">
            Component
        </VButton>
    </section>
</template>

<script setup lang="ts">
import { VButton } from './components'
import { eventModifiersWorkerState as state } from './eventModifiersWorker.state'

const onDomClick = (event: MouseEvent) => {
  state.domClicks++
  state.domDefaultPrevented = event.defaultPrevented
}

const onComponentClick = (event: MouseEvent) => {
  state.componentClicks++
  state.componentDefaultPrevented = event.defaultPrevented
}
</script>
