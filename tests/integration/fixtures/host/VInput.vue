<template>
  <input
      type="text"
      :value="value"
      @input="$emit('update:value', $event.target.value)"
  />
</template>

<script lang="ts" setup>
defineProps({
  value: {
    type: String,
    default: '',
  },
})

defineEmits(['update:value'])
</script>
