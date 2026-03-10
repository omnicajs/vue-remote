export const REMOTE_LIFECYCLE_REASON_HOST_DISCONNECTED = 'host-disconnected'
export const REMOTE_LIFECYCLE_REASON_HOST_UNMOUNTED = 'host-unmounted'
export const REMOTE_LIFECYCLE_REASON_RECEIVER_REPLACED = 'receiver-replaced'
export const REMOTE_LIFECYCLE_REASON_RUNTIME_UNAVAILABLE = 'runtime-unavailable'

export type RemoteLifecycleReason =
  | typeof REMOTE_LIFECYCLE_REASON_HOST_DISCONNECTED
  | typeof REMOTE_LIFECYCLE_REASON_HOST_UNMOUNTED
  | typeof REMOTE_LIFECYCLE_REASON_RECEIVER_REPLACED
  | typeof REMOTE_LIFECYCLE_REASON_RUNTIME_UNAVAILABLE

export class RemoteLifecycleError extends Error {
  readonly reason: RemoteLifecycleReason

  constructor(
    reason: RemoteLifecycleReason = REMOTE_LIFECYCLE_REASON_HOST_DISCONNECTED,
    message = 'Remote host lifecycle no longer allows awaiting a commit'
  ) {
    super(message)
    this.name = 'RemoteLifecycleError'
    this.reason = reason
  }
}
