import {
  REMOTE_LIFECYCLE_REASON_RUNTIME_UNAVAILABLE,
  RemoteLifecycleError,
} from '@/common/lifecycle'

import {
  nextTick as vueNextTick,
} from 'vue'

import { resolveRemoteRuntime } from '@/vue/remote/runtime'

export default function nextTick (): Promise<void>
export default function nextTick<T, R> (this: T, callback: (this: T) => R): Promise<Awaited<R>>
export default function nextTick<T, R> (this: T, callback?: (this: T) => R) {
  return vueNextTick().then(async () => {
    const runtime = resolveRemoteRuntime()

    if (runtime == null) {
      throw new RemoteLifecycleError(
        REMOTE_LIFECYCLE_REASON_RUNTIME_UNAVAILABLE,
        'Remote nextTick requires an active remote runtime bound to a host renderer'
      )
    }

    await runtime.awaitHostCommit()
    return callback?.call(this)
  })
}
