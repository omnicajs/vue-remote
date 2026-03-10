import type { App } from 'vue'
import type { InjectionKey } from 'vue'

import type { RemoteRoot } from '@/dom/remote'

import { getCurrentInstance } from 'vue'

interface RemoteRuntimeController {
  awaitHostCommit (): Promise<void>;
}

const REMOTE_RUNTIME_KEY = Symbol('remote-runtime') as InjectionKey<RemoteRuntimeController>

const controllers = new WeakMap<RemoteRoot, RemoteRuntimeController>()

let activeController: RemoteRuntimeController | null = null

export const registerRemoteRuntime = (
  root: RemoteRoot,
  controller: RemoteRuntimeController
) => {
  controllers.set(root, controller)
}

export const attachRemoteRuntime = (app: App, root: RemoteRoot) => {
  const controller = controllers.get(root)

  if (controller == null) {
    return
  }

  app.provide(REMOTE_RUNTIME_KEY, controller)
  activeController = controller
}

export const detachRemoteRuntime = (root: RemoteRoot) => {
  const controller = controllers.get(root)

  if (controller != null && activeController === controller) {
    activeController = null
  }
}

export const resolveRemoteRuntime = () => {
  const instance = getCurrentInstance()
  const provided = instance?.appContext.provides[REMOTE_RUNTIME_KEY as symbol] as RemoteRuntimeController | undefined

  return provided ?? activeController
}
