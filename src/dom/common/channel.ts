import type {
  Id,
  SerializedChild,
} from '@/dom/common/tree'

import type { Unknown } from '~types/scaffolding'

export const ACTION_MOUNT = 'mount'
export const ACTION_INSERT_CHILD = 'insert-child'
export const ACTION_REMOVE_CHILD = 'remove-child'
export const ACTION_UPDATE_TEXT = 'update-text'
export const ACTION_UPDATE_PROPERTIES = 'update-properties'
export const ACTION_INVOKE = 'invoke'

export interface Runner {
  mount (children: SerializedChild[]): void;

  insertChild (
    parentId: Id,
    after: number,
    child: SerializedChild,
    oldParentId: Id | false
  ): void;

  removeChild (parentId: Id, at: number): void;

  updateProperties (id: Id, properties: Unknown): void;

  updateText (id: Id, text: string): void;

  invoke (
    id: Id,
    method: string,
    payload: unknown[],
    resolve: (result: unknown) => void,
    reject: (reason?: unknown) => void
  ): void;
}

interface RunnerActionMap {
  [ACTION_MOUNT]: Runner['mount'];
  [ACTION_INSERT_CHILD]: Runner['insertChild'];
  [ACTION_REMOVE_CHILD]: Runner['removeChild'];
  [ACTION_UPDATE_PROPERTIES]: Runner['updateProperties'];
  [ACTION_UPDATE_TEXT]: Runner['updateText'];
  [ACTION_INVOKE]: Runner['invoke'];
}

export type RunnerAction = keyof RunnerActionMap
export type RunnerMethod<T extends RunnerAction> = RunnerActionMap[T]
export type RunnerPayload<T extends RunnerAction> = Parameters<RunnerActionMap[T]>

export type RunnerCallee<T extends RunnerAction> = (...args: RunnerPayload<T>) => ReturnType<RunnerActionMap[T]>

export interface Channel {
  <A extends RunnerAction>(action: A, ...payload: RunnerPayload<A>): void | Promise<void>;
}

export function createChannel({
  mount,
  insertChild,
  removeChild,
  updateProperties,
  updateText,
  invoke,
}: Runner): Channel {
  const methods = new Map<RunnerAction, RunnerMethod<RunnerAction>>([
    [ACTION_MOUNT, mount],
    [ACTION_INSERT_CHILD, insertChild],
    [ACTION_REMOVE_CHILD, removeChild],
    [ACTION_UPDATE_PROPERTIES, updateProperties],
    [ACTION_UPDATE_TEXT, updateText],
    [ACTION_INVOKE, invoke],
  ])

  return <A extends RunnerAction>(
    type: A,
    ...payload: RunnerPayload<A>
  ) => (methods.get(type)! as RunnerCallee<A>)(...payload)
}
