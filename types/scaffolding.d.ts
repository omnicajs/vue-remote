/* eslint-disable @typescript-eslint/no-explicit-any */
export type AnyFunction = (...payload: any[]) => Promise<unknown>

export type None = Record<string, never>
export type Unknown = Record<string, unknown>
export type UnknownFunction = (...args: unknown[]) => unknown
export type UnknownMethods = Record<string, AnyFunction>

export type NonOptionalKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? never : K;
}[keyof T]

export type IfAllKeysOptional<O, If, Else = never> = O extends None
  ? If
  : NonOptionalKeys<O> extends { length: 0; }
    ? If
    : Else
