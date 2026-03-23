import type { UnknownFunction } from '~types/scaffolding'

import { wrapEventHandler } from '@/vue/events'

export const withModifiers = <F extends UnknownFunction>(
  fn: F,
  modifiers: string[]
): F => {
  return wrapEventHandler(fn, 'modifiers', modifiers) as F
}

export const withKeys = <F extends UnknownFunction>(
  fn: F,
  modifiers: string[]
): F => {
  return wrapEventHandler(fn, 'keys', modifiers) as F
}
