import type { RemoteEventHandlerStep } from '@/vue/events'

const systemModifiers = ['ctrl', 'shift', 'alt', 'meta'] as const

const keyNames: Record<string, string> = {
  esc: 'escape',
  space: ' ',
  up: 'arrow-up',
  left: 'arrow-left',
  right: 'arrow-right',
  down: 'arrow-down',
  delete: 'backspace',
}

type GuardedEvent = Event & {
  altKey?: boolean;
  button?: number;
  ctrlKey?: boolean;
  key?: string;
  metaKey?: boolean;
  shiftKey?: boolean;
}

const hyphenate = (value: string) => {
  return value
    .replace(/\B([A-Z])/g, '-$1')
    .toLowerCase()
}

const modifierGuards: Record<string, (event: GuardedEvent, modifiers: readonly string[]) => boolean | void> = {
  stop: event => event.stopPropagation(),
  prevent: event => event.preventDefault(),
  self: event => event.target !== event.currentTarget,
  ctrl: event => !event.ctrlKey,
  shift: event => !event.shiftKey,
  alt: event => !event.altKey,
  meta: event => !event.metaKey,
  left: event => 'button' in event && event.button !== 0,
  middle: event => 'button' in event && event.button !== 1,
  right: event => 'button' in event && event.button !== 2,
  exact: (event, modifiers) => systemModifiers.some(
    modifier => event[`${modifier}Key`] && !modifiers.includes(modifier)
  ),
}

const applyKeyGuards = (event: Event, modifiers: readonly string[]) => {
  if (!('key' in event) || typeof event.key !== 'string') {
    return false
  }

  const eventKey = hyphenate(event.key)

  return modifiers.some(modifier => modifier === eventKey || keyNames[modifier] === eventKey)
}

const applyModifierGuards = (event: Event, modifiers: readonly string[]) => {
  const guarded = event as GuardedEvent

  for (const modifier of modifiers) {
    const guard = modifierGuards[modifier]

    if (guard?.(guarded, modifiers)) {
      return false
    }
  }

  return true
}

export const applyEventHandlerSteps = (
  event: Event,
  steps: readonly RemoteEventHandlerStep[]
) => {
  for (const [kind, modifiers] of steps) {
    const passed = kind === 'keys'
      ? applyKeyGuards(event, modifiers)
      : applyModifierGuards(event, modifiers)

    if (!passed) {
      return false
    }
  }

  return true
}
