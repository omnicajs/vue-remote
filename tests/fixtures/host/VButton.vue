<template>
    <button :disabled="disabled" @click="$emit('click')">
        <slot />
    </button>
</template>

<script lang="ts">
export default {
  name: 'VButton',
  props: ['disabled'],
  emits: ['click'],
}
</script>