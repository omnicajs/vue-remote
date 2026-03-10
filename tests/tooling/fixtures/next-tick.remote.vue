<template>
    <VDialog />
</template>

<script setup lang="ts">
import {
  defineRemoteComponent,
  nextTick,
} from '@omnicajs/vue-remote/remote'

const VDialog = defineRemoteComponent('VDialog')

void nextTick()

nextTick(() => VDialog)
</script>
