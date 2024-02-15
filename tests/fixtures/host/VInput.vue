<template>
  <input type="text" :value="value" @input="$emit('input')">
</template>

<script lang="ts" setup>
defineProps({
  value: {
    type: String,
    default: '',
  }
})

defineEmits(['update:value'])
</script>
