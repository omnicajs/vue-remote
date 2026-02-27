declare module '@astrojs/starlight' {
  import type { AstroIntegration } from 'astro'

  const starlight: (options?: Record<string, unknown>) => AstroIntegration
  export default starlight
}

declare module '@astrojs/starlight/loaders' {
  export function docsLoader(...args: unknown[]): unknown
  export function i18nLoader(...args: unknown[]): unknown
}

declare module '@astrojs/starlight/schema' {
  export function docsSchema(...args: unknown[]): unknown
  export function i18nSchema(...args: unknown[]): unknown
}

declare module 'astro:content' {
  export function defineCollection(config: unknown): unknown
}
