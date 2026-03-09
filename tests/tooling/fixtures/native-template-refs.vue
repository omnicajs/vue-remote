<template>
    <div ref="panel" />
    <VDialog ref="dialog" />
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'

import {
  defineRemoteComponent,
  defineRemoteMethod,
} from '@omnicajs/vue-remote/remote'

const VDialog = defineRemoteComponent('VDialog', {
  methods: {
    open: defineRemoteMethod<[id: string], boolean>(),
  },
})

const panel = useTemplateRef('panel')
const dialog = useTemplateRef('dialog')

panel.value?.focus()
dialog.value?.open('dialog-1')

// @ts-expect-error plain Vue SFC refs should keep DOM element typing
panel.value?.updateProperties({
  id: 'panel',
})

// @ts-expect-error host component refs still expose component instance methods only
dialog.value?.updateProperties({
  open: true,
})
</script>
