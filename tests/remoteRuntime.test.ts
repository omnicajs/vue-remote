import {
  describe,
  expect,
  test,
} from 'vitest'

import {
  createApp,
  defineComponent,
  h,
} from 'vue'

import {
  REMOTE_LIFECYCLE_REASON_RUNTIME_UNAVAILABLE,
  createRemoteRenderer,
  createRemoteRoot,
  nextTick as remoteNextTick,
} from '@/vue/remote'

import {
  attachRemoteRuntime,
  detachRemoteRuntime,
  registerRemoteRuntime,
  resolveRemoteRuntime,
} from '@/vue/remote/runtime'

describe('remote runtime', () => {
  test('rejects nextTick when no active remote runtime exists', async () => {
    await expect(remoteNextTick()).rejects.toMatchObject({
      name: 'RemoteLifecycleError',
      reason: REMOTE_LIFECYCLE_REASON_RUNTIME_UNAVAILABLE,
    })
  })

  test('ignores attaching an unregistered root and clears active runtime on detach', () => {
    const app = createApp(defineComponent({
      render: () => null,
    }))
    const unregisteredRoot = {} as ReturnType<typeof createRemoteRoot>

    attachRemoteRuntime(app, unregisteredRoot)
    expect(resolveRemoteRuntime()).toBeNull()

    const root = createRemoteRoot(() => {}, { strict: false })
    const controller = {
      awaitHostCommit: () => Promise.resolve(),
    }

    registerRemoteRuntime(root, controller)
    attachRemoteRuntime(app, root)

    expect(resolveRemoteRuntime()).toBe(controller)

    detachRemoteRuntime(root)

    expect(resolveRemoteRuntime()).toBeNull()
  })

  test('detaches active runtime when remote app mount fails', async () => {
    const root = createRemoteRoot(() => {}, { strict: false })
    const { createApp } = createRemoteRenderer(root)
    const app = createApp(defineComponent({
      setup: () => {
        throw new Error('render failure')
      },
    }))
    app.config.warnHandler = () => {}

    expect(() => app.mount(root)).toThrow('render failure')
    detachRemoteRuntime(root)
  })

  test('detaches active runtime when remote app unmounts', () => {
    const root = createRemoteRoot(() => {}, { strict: false })
    const { createApp } = createRemoteRenderer(root)
    const app = createApp(defineComponent({
      render: () => h('div', 'ok'),
    }))

    app.mount(root)
    app.unmount()
    detachRemoteRuntime(root)
  })
})
