import {
  defineComponent,
  h,
  ref,
} from 'vue'

import {
  defineRemoteComponent,
  defineRemoteMethod,
  nextTick,
  REMOTE_LIFECYCLE_REASON_HOST_UNMOUNTED,
} from '@/vue/remote'

import { createWorkerEndpoint } from '../endpoint'

const VNextTickProbe = defineRemoteComponent('VNextTickProbe', {
  methods: {
    readText: defineRemoteMethod<[], string>(),
  },
})

const state = {
  count: 0,
  observedText: null as string | null,
  rejectionReason: null as string | null,
  status: 'idle' as 'idle' | 'waiting' | 'committed' | 'rejected',
}

createWorkerEndpoint(defineComponent({
  setup () {
    const count = ref(0)
    const observedText = ref<string | null>(null)
    const probe = ref<InstanceType<typeof VNextTickProbe> | null>(null)
    const status = ref<typeof state.status>('idle')

    const syncState = () => {
      state.count = count.value
      state.observedText = observedText.value
      state.status = status.value
    }

    const runScenario = async () => {
      observedText.value = null
      state.rejectionReason = null
      count.value += 1
      status.value = 'waiting'
      syncState()

      try {
        await nextTick()
        observedText.value = await probe.value?.readText() ?? null
        status.value = 'committed'
        syncState()
      } catch (error) {
        status.value = 'rejected'
        state.rejectionReason = error instanceof Error && 'reason' in error
          ? String(error.reason)
          : REMOTE_LIFECYCLE_REASON_HOST_UNMOUNTED
        syncState()
      }
    }

    return () => h('section', { id: 'next-tick-root' }, [
      h('button', {
        id: 'next-tick-trigger',
        onClick: runScenario,
      }, 'Run nextTick'),
      h(VNextTickProbe, {
        ref: probe,
        value: count.value,
      }),
      h('p', { id: 'next-tick-count' }, `Count: ${count.value}`),
      h('p', { id: 'next-tick-observed' }, `Observed: ${observedText.value ?? 'pending'}`),
      h('p', { id: 'next-tick-status' }, `Status: ${status.value}`),
    ])
  },
}), {
  state,
  components: ['VNextTickProbe'],
  resetState: (state) => {
    state.count = 0
    state.observedText = null
    state.rejectionReason = null
    state.status = 'idle'
  },
  snapshotState: (state) => ({
    count: state.count,
    observedText: state.observedText,
    rejectionReason: state.rejectionReason,
    status: state.status,
  }),
})
