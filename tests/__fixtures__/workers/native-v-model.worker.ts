import NativeVModelWorkerRemote from '../remote/NativeVModelWorker.remote.vue'

import {
  nativeVModelWorkerState,
  resetNativeVModelWorkerState,
  snapshotNativeVModelWorkerState,
} from '../remote/nativeVModelWorker.state'

import { createWorkerEndpoint } from '../endpoint'

createWorkerEndpoint(NativeVModelWorkerRemote, {
  state: nativeVModelWorkerState,
  components: [],
  resetState: () => {
    resetNativeVModelWorkerState()
  },
  snapshotState: () => snapshotNativeVModelWorkerState(),
})
