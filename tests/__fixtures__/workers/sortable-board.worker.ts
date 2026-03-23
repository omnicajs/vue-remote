import SortableBoardRemote from '../remote/SortableBoard.remote.vue'
import {
  resetSortableBoardWorkerState,
  snapshotSortableBoardWorkerState,
  sortableBoardWorkerState,
} from '../remote/sortableBoardWorker.state'

import { createWorkerEndpoint } from '../endpoint'

createWorkerEndpoint(SortableBoardRemote, {
  state: sortableBoardWorkerState,
  components: ['VCard'],
  resetState: resetSortableBoardWorkerState,
  snapshotState: snapshotSortableBoardWorkerState,
})
