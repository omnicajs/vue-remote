<template>
    <input
        type="text"
        :value="value"
        :placeholder="placeholder"
        @input="$emit('update:value', ($event.target as HTMLInputElement | null)?.value)"
    />
</template>

<script lang="ts" setup>
defineProps({
  value: {
    type: String,
    default: '',
  },

  placeholder: {
    type: String,
    default: '',
  },
})

defineEmits(['update:value'])
</script>
