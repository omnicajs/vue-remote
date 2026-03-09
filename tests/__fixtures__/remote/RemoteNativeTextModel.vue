<template>
    <input
        data-test="text-model"
        v-model="text"
    >
</template>

<script setup lang="ts">
import { ref } from 'vue'

const text = ref('hello')

defineExpose({
  getText: () => text.value,
  setText: (value: string) => {
    text.value = value
  },
})
</script>
