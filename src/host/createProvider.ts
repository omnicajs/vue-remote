import type { Component } from 'vue'
import type { Provider } from '~types/host'

export default (components: {
  [key: string]: Component<NonNullable<unknown>>;
} = {}): Provider => {
  const registry = new Map(Object.entries(components))

  return {
    get (type) {
      const value = registry.get(type)
      if (value == null) {
        throw new Error(`Unknown component: ${type}`)
      }
      return value
    },
  }
}