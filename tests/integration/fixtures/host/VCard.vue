<template>
    <section
        :id="id"
        :aria-labelledby="'title' in $slots ? id + '-title' : undefined"
    >
        <div
            v-if="'title' in $slots"
            :id="id + '-title'"
        >
            <slot name="title" />
        </div>

        <slot />
    </section>
</template>

<script lang="ts" setup>
defineProps({
  id: {
    type: String,
    required: true,
  },
})
</script>