import EventModifiersRemote from '../remote/EventModifiers.remote.vue'
import {
  eventModifiersWorkerState,
  resetEventModifiersWorkerState,
  snapshotEventModifiersWorkerState,
} from '../remote/eventModifiersWorker.state'

import { createWorkerEndpoint } from '../endpoint'

createWorkerEndpoint(EventModifiersRemote, {
  state: eventModifiersWorkerState,
  components: ['VButton'],
  resetState: resetEventModifiersWorkerState,
  snapshotState: snapshotEventModifiersWorkerState,
})
