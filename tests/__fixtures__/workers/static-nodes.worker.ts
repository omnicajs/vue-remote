import StaticNodesRemote from '../components/StaticNodes.remote.vue'

import { createWorkerEndpoint } from '../endpoint'

const state = {}

createWorkerEndpoint(StaticNodesRemote, {
  state,
  components: [],
  resetState: () => {},
  snapshotState: () => ({}),
})
