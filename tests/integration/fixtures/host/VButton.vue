<template>
    <button :disabled="disabled" @click="$emit('click')">
        <slot />
    </button>
</template>

<script lang="ts" setup>
defineProps({
  disabled: {
    type: Boolean,
    default: false,
  }
})

defineEmits(['click'])
</script>