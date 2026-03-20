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

interface StarlightLocaleConfig {
  label: string;
  lang?: string;
}

interface StarlightUserConfigStub {
  components: {
    Search?: string;
  };
  isMultilingual?: boolean;
  locales?: Record<string, StarlightLocaleConfig>;
  pagefind?: boolean;
}

declare module 'virtual:starlight/user-config' {
  const config: StarlightUserConfigStub
  export default config
}

declare module 'virtual:starlight/project-context' {
  const context: {
    trailingSlash?: 'always' | 'ignore' | 'never';
  }
  export default context
}

declare module 'virtual:starlight/components/LanguageSelect' {
  import type { AstroComponentFactory } from 'astro/runtime/server/index.js'

  const Component: AstroComponentFactory
  export default Component
}

declare module 'virtual:starlight/components/Search' {
  import type { AstroComponentFactory } from 'astro/runtime/server/index.js'

  const Component: AstroComponentFactory
  export default Component
}

declare module 'virtual:starlight/components/SiteTitle' {
  import type { AstroComponentFactory } from 'astro/runtime/server/index.js'

  const Component: AstroComponentFactory
  export default Component
}

declare module 'virtual:starlight/components/SocialIcons' {
  import type { AstroComponentFactory } from 'astro/runtime/server/index.js'

  const Component: AstroComponentFactory
  export default Component
}

declare module 'virtual:starlight/components/ThemeSelect' {
  import type { AstroComponentFactory } from 'astro/runtime/server/index.js'

  const Component: AstroComponentFactory
  export default Component
}

declare namespace App {
  interface Locals {
    starlightRoute: {
      locale?: string | null;
    };
    t: (key: string) => string;
  }
}
