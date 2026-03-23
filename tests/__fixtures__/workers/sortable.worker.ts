import SortableListRemote from '../remote/SortableList.remote.vue'
import {
  resetSortableWorkerState,
  snapshotSortableWorkerState,
  sortableWorkerState,
} from '../remote/sortableWorker.state'

import { createWorkerEndpoint } from '../endpoint'

createWorkerEndpoint(SortableListRemote, {
  state: sortableWorkerState,
  components: [],
  resetState: resetSortableWorkerState,
  snapshotState: snapshotSortableWorkerState,
})
