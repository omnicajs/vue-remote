export type RemoteMethodValidator<Args extends unknown[] = unknown[]> = (...args: Args) => boolean

export interface RemoteMethodCarrier<
  Args extends unknown[] = [],
  Result = void,
> {
  readonly __remoteMethod: true;
  readonly validator?: RemoteMethodValidator<Args>;
  readonly result?: Result;
}

export const isRemoteMethod = (value: unknown): value is RemoteMethodCarrier => {
  return typeof value === 'object' && value != null && '__remoteMethod' in value
}

export default function defineRemoteMethod<
  Args extends unknown[] = [],
  Result = void,
> (
  validator?: RemoteMethodValidator<Args>
): RemoteMethodCarrier<Args, Result> {
  return {
    __remoteMethod: true,
    validator,
  }
}
