import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

const repository = process.env.GITHUB_REPOSITORY ?? 'omnicajs/vue-remote'
const [owner, repo] = repository.split('/')
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true'
const docsBase = process.env.DOCS_BASE

export default defineConfig({
  output: 'static',
  site: `https://${owner}.github.io`,
  base: isGitHubActions ? `/${repo}` : (docsBase || '/'),
  srcDir: './web',
  outDir: './dist-web',
  cacheDir: './var/cache/astro',
  vite: {
    server: {
      allowedHosts: [
        'astro',
        'docs.vue-remote.test',
        '.vue-remote.test',
        'docs.vue-remote.local',
        '.vue-remote.local',
      ],
    },
  },
  integrations: [
    starlight({
      title: 'Vue Remote',
      description: 'Documentation for @omnicajs/vue-remote',
      locales: {
        root: {
          label: 'English',
          lang: 'en',
        },
        ru: {
          label: 'Русский',
          lang: 'ru',
        },
      },
      defaultLocale: 'root',
      logo: {
        light: './web/assets/logo-light.svg',
        dark: './web/assets/logo-dark.svg',
        alt: 'Vue Remote logo',
      },
      favicon: '/logo-light.svg',
      customCss: [
        './web/assets/starlight-dark-theme-vars.css',
        './web/assets/starlight-light-theme-vars.css',
        './web/styles/starlight-custom.css',
      ],
      credits: false,
      social: [
        {
          icon: 'npm',
          label: 'npm',
          href: 'https://www.npmjs.com/package/@omnicajs/vue-remote',
        },
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/omnicajs/vue-remote',
        },
      ],
      components: {
        Header: './web/components/Header.astro',
        ThemeSelect: './web/components/ThemeSelect.astro',
        LanguageSelect: './web/components/LanguageSelect.astro',
      },
      sidebar: [
        {
          label: 'Introduction',
          translations: {
            ru: 'Введение',
          },
          items: [
            {
              label: 'Introduction',
              translations: {
                ru: 'Обзор',
              },
              link: '/introduction/',
            },
            {
              label: 'Getting Started',
              translations: {
                ru: 'Быстрый старт',
              },
              link: '/getting-started/',
            },
          ],
        },
        {
          label: 'Core Concepts',
          translations: {
            ru: 'Ключевые концепции',
          },
          items: [
            {
              label: 'Host Components',
              translations: {
                ru: 'Компоненты хоста',
              },
              link: '/host-components/',
            },
            {
              label: 'Remote Components',
              translations: {
                ru: 'Компоненты remote',
              },
              link: '/remote-components/',
            },
            {
              label: 'Known Limitations',
              translations: {
                ru: 'Известные ограничения',
              },
              link: '/limitations/',
            },
          ],
        },
        {
          label: 'Runtime And Transports',
          translations: {
            ru: 'Рантайм и транспорты',
          },
          items: [
            {
              label: 'Overview',
              translations: {
                ru: 'Обзор',
              },
              link: '/overview/',
            },
            {
              label: 'Iframe Integration',
              translations: {
                ru: 'Интеграция через iframe',
              },
              link: '/integration/',
            },
            {
              label: 'Web Worker Runtime',
              translations: {
                ru: 'Web Worker Runtime',
              },
              link: '/web-workers/',
            },
            {
              label: 'Window Transport',
              translations: {
                ru: 'Window Transport',
              },
              link: '/window-transport/',
            },
            {
              label: 'MessagePort Transport',
              translations: {
                ru: 'MessagePort Transport',
              },
              link: '/message-port-transport/',
            },
            {
              label: 'Desktop IPC Transport',
              translations: {
                ru: 'Desktop IPC Transport',
              },
              link: '/desktop-ipc-transport/',
            },
            {
              label: 'Socket Transport',
              translations: {
                ru: 'Socket Transport',
              },
              link: '/socket-transport/',
            },
            {
              label: 'In-Memory Transport',
              translations: {
                ru: 'In-Memory Transport',
              },
              link: '/memory-transport/',
            },
            {
              label: 'Transport Comparison',
              translations: {
                ru: 'Сравнение транспортов',
              },
              link: '/transport-comparison/',
            },
          ],
        },
        {
          label: 'Experimental Capabilities',
          translations: {
            ru: 'Экспериментальные возможности',
          },
          items: [
            {
              label: 'Overview',
              translations: {
                ru: 'Обзор',
              },
              link: '/experimental-overview/',
            },
            {
              label: 'BroadcastChannel Transport',
              translations: {
                ru: 'BroadcastChannel Transport',
              },
              link: '/broadcast-channel-transport/',
            },
            {
              label: 'SES And ShadowRealm Runtime',
              translations: {
                ru: 'SES и ShadowRealm Runtime',
              },
              link: '/ses-shadowrealm-runtime/',
            },
            {
              label: 'WASM Sandbox Runtime',
              translations: {
                ru: 'WASM Sandbox Runtime',
              },
              link: '/wasm-sandbox-runtime/',
            },
            {
              label: 'Comparison',
              translations: {
                ru: 'Сравнение',
              },
              link: '/experimental-comparison/',
            },
          ],
        },
      ],
    }),
  ],
})
