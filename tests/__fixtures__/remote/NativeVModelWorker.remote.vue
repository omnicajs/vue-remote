<template>
    <section id="native-v-model-root">
        <input
            id="native-v-model-input"
            v-model="text"
            @input="capture"
        >

        <p id="native-v-model-text">
            {{ text }}
        </p>
    </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

import {
  captureNativeVModelWorkerEvent,
  nativeVModelWorkerState,
} from './nativeVModelWorker.state'

const text = ref('')

watch(text, (value) => {
  nativeVModelWorkerState.text = value
}, {
  immediate: true,
})

const capture = (event: unknown) => {
  captureNativeVModelWorkerEvent(event)
}
</script>
