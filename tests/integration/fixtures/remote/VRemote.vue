<template>
    <VButton @click="$emit('click')">
        <slot />
    </VButton>
</template>

<script lang="ts">
import { VButton }  from './components'

export default {
  components: {
    VButton,
  },

  emits: ['click'],
}
</script>  