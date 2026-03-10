import {
  describe,
  expect,
  test,
} from 'vitest'

import {
  ACTION_SYSTEM_CALL,
  REMOTE_LIFECYCLE_REASON_HOST_DISCONNECTED,
  REMOTE_LIFECYCLE_REASON_HOST_UNMOUNTED,
  SYSTEM_CALL_AWAIT_HOST_COMMIT,
} from '@/vue/remote'

import { createReceiver } from '@/dom/host'
import {
  RECEIVER_ATTACH_HOST,
  RECEIVER_DETACH_HOST,
} from '@/dom/host/receiver'

describe('receiver systemCall', () => {
  test('rejects unsupported system calls', async () => {
    const receiver = createReceiver()

    await expect(receiver.receive(
      ACTION_SYSTEM_CALL,
      'unknown-system-call',
      []
    )).rejects.toMatchObject({
      name: 'RemoteLifecycleError',
      message: 'Unsupported remote system call: unknown-system-call',
    })
  })

  test('rejects await-host-commit when host is not attached', async () => {
    const receiver = createReceiver()

    await expect(receiver.receive(
      ACTION_SYSTEM_CALL,
      SYSTEM_CALL_AWAIT_HOST_COMMIT,
      []
    )).rejects.toMatchObject({
      name: 'RemoteLifecycleError',
      reason: REMOTE_LIFECYCLE_REASON_HOST_DISCONNECTED,
    })
  })

  test('uses the default host-unmounted reason when host detaches without explicit error', async () => {
    const receiver = createReceiver() as ReturnType<typeof createReceiver> & {
      [RECEIVER_ATTACH_HOST](): void;
      [RECEIVER_DETACH_HOST](reason?: unknown): void;
    }

    receiver[RECEIVER_ATTACH_HOST]()
    receiver[RECEIVER_DETACH_HOST]()

    await expect(receiver.receive(
      ACTION_SYSTEM_CALL,
      SYSTEM_CALL_AWAIT_HOST_COMMIT,
      []
    )).rejects.toMatchObject({
      name: 'RemoteLifecycleError',
      reason: REMOTE_LIFECYCLE_REASON_HOST_UNMOUNTED,
    })
  })

  test('rejects pending await-host-commit when host detaches during the wait', async () => {
    const receiver = createReceiver() as ReturnType<typeof createReceiver> & {
      [RECEIVER_ATTACH_HOST](): void;
      [RECEIVER_DETACH_HOST](reason?: unknown): void;
    }

    receiver[RECEIVER_ATTACH_HOST]()

    const pending = receiver.receive(
      ACTION_SYSTEM_CALL,
      SYSTEM_CALL_AWAIT_HOST_COMMIT,
      []
    )

    receiver[RECEIVER_DETACH_HOST]('session closed')

    await expect(pending).rejects.toMatchObject({
      name: 'RemoteLifecycleError',
      reason: REMOTE_LIFECYCLE_REASON_HOST_DISCONNECTED,
    })
  })
})
