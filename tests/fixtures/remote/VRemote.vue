<template>
    <VButton @click="$emit('click')">
        <slot />
    </VButton>
</template>

<script lang="ts">
import VButton from './VButton'

export default {
  components: {
    VButton,
  },

  emits: ['click'],
}
</script>