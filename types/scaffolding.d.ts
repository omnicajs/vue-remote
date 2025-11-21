export type None = Record<string, never>
export type Unknown = Record<string, unknown>
export type UnknownFunction = (...args: unknown[]) => unknown
export type UnknownMethods = Record<string, (...payload: unknown[]) => Promise<unknown>>

export type NonOptionalKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? never : K;
}[keyof T]

export type IfAllKeysOptional<O, If, Else = never> = O extends None
  ? If
  : NonOptionalKeys<O> extends { length: 0; }
    ? If
    : Else
