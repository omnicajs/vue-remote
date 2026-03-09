<template>
    <div ref="panel" />
    <input ref="input" />
    <svg ref="icon" />
    <VDialog ref="dialog" />
</template>

<script setup lang="ts">
import type { Ref, ShallowRef } from 'vue'

import type {
  RemoteElementProxy,
  RemoteElementRef,
} from '@omnicajs/vue-remote/remote'

import { ref, shallowRef, useTemplateRef } from 'vue'

import {
  defineRemoteComponent,
  defineRemoteMethod,
} from '@omnicajs/vue-remote/remote'

const expectPanelRef = (value: RemoteElementRef<'div'>) => { void value }
const expectInputRef = (value: Ref<RemoteElementProxy<'input'> | null>) => { void value }
const expectIconRef = (value: ShallowRef<RemoteElementProxy<'svg'> | null>) => { void value }

const VDialog = defineRemoteComponent('VDialog', {
  methods: {
    open: defineRemoteMethod<[id: string], boolean>(),
  },
})

const panel = useTemplateRef('panel')
const input = ref(null)
const icon = shallowRef(null)
const dialog = useTemplateRef('dialog')

expectPanelRef(panel)
expectInputRef(input)
expectIconRef(icon)

panel.value?.updateProperties({
  id: 'panel',
})

dialog.value?.open('dialog-1')

// @ts-expect-error native remote refs stay behind the boundary and are not DOM elements
panel.value?.focus()

// @ts-expect-error SVG refs in remote templates must not expose DOM-only APIs
icon.value?.getBBox()

// @ts-expect-error host component refs must remain component instances, not remote element proxies
dialog.value?.updateProperties({
  open: true,
})
</script>
