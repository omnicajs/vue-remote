<template>
    <div :data-placeholder="apiKey">
        {{ address }}
    </div>
</template>

<script setup lang="ts">

import { onMounted } from 'vue'

defineProps({
  address: {
    type: String,
    default: '0',
  },

  apiKey: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['change'])

onMounted(() => {
  setInterval(() => emit('change', Math.random().toString()), 500)
})
</script>