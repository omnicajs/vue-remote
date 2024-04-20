import type { Component } from 'vue'

export interface Provider {
  get (type: string): Component<NonNullable<unknown>>;
}