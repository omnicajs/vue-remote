<template>
    <VCard :id="id">
        <template v-if="title.length > 0" #title>
            {{ title }}
        </template>

        {{ text }}
    </VCard>
</template>

<script lang="ts" setup>
import { VCard } from './components'

defineProps({
  id: {
    type: String,
    required: true,
  },

  title: {
    type: String,
    default: '',
  },

  text: {
    type: String,
    default: '',
  },
})
</script>