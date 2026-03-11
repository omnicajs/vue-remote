import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

const repository = process.env.GITHUB_REPOSITORY ?? 'omnicajs/vue-remote'
const [owner, repo] = repository.split('/')
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true'
const docsBase = process.env.DOCS_BASE

export default defineConfig({
  output: 'static',
  site: `https://${owner}.github.io`,
  base: docsBase || (isGitHubActions ? `/${repo}` : '/'),
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
        es: {
          label: 'Español',
          lang: 'es',
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
            es: 'Introducción',
            ru: 'Введение',
          },
          items: [
            {
              label: 'Introduction',
              translations: {
                es: 'Introducción',
                ru: 'Обзор',
              },
              link: '/introduction/',
            },
            {
              label: 'Getting Started',
              translations: {
                es: 'Primeros pasos',
                ru: 'Быстрый старт',
              },
              link: '/getting-started/',
            },
            {
              label: 'Versions',
              translations: {
                es: 'Versiones',
                ru: 'Версии',
              },
              link: '/versions/',
            },
          ],
        },
        {
          label: 'Core Concepts',
          translations: {
            es: 'Conceptos clave',
            ru: 'Ключевые концепции',
          },
          items: [
            {
              label: 'Host Components',
              translations: {
                es: 'Componentes del host',
                ru: 'Компоненты хоста',
              },
              link: '/host-components/',
            },
            {
              label: 'Remote Components',
              translations: {
                es: 'Componentes remotos',
                ru: 'Компоненты remote',
              },
              link: '/remote-components/',
            },
            {
              label: 'Known Limitations',
              translations: {
                es: 'Limitaciones conocidas',
                ru: 'Известные ограничения',
              },
              link: '/limitations/',
            },
          ],
        },
        {
          label: 'Runtime And Transports',
          translations: {
            es: 'Runtime y transportes',
            ru: 'Рантайм и транспорты',
          },
          items: [
            {
              label: 'Overview',
              translations: {
                es: 'Resumen',
                ru: 'Обзор',
              },
              link: '/overview/',
            },
            {
              label: 'Iframe Integration',
              translations: {
                es: 'Integración con iframe',
                ru: 'Интеграция через iframe',
              },
              link: '/integration/',
            },
            {
              label: 'Web Worker Runtime',
              translations: {
                es: 'Runtime de Web Worker',
                ru: 'Web Worker Runtime',
              },
              link: '/web-workers/',
            },
            {
              label: 'Window Transport',
              translations: {
                es: 'Transporte Window',
                ru: 'Window Transport',
              },
              link: '/window-transport/',
            },
            {
              label: 'MessagePort Transport',
              translations: {
                es: 'Transporte MessagePort',
                ru: 'MessagePort Transport',
              },
              link: '/message-port-transport/',
            },
            {
              label: 'Desktop IPC Transport',
              translations: {
                es: 'Transporte IPC de escritorio',
                ru: 'Desktop IPC Transport',
              },
              link: '/desktop-ipc-transport/',
            },
            {
              label: 'Socket Transport',
              translations: {
                es: 'Transporte Socket',
                ru: 'Socket Transport',
              },
              link: '/socket-transport/',
            },
            {
              label: 'In-Memory Transport',
              translations: {
                es: 'Transporte en memoria',
                ru: 'In-Memory Transport',
              },
              link: '/memory-transport/',
            },
            {
              label: 'Transport Comparison',
              translations: {
                es: 'Comparación de transportes',
                ru: 'Сравнение транспортов',
              },
              link: '/transport-comparison/',
            },
          ],
        },
        {
          label: 'Experimental Capabilities',
          translations: {
            es: 'Capacidades experimentales',
            ru: 'Экспериментальные возможности',
          },
          items: [
            {
              label: 'Overview',
              translations: {
                es: 'Resumen',
                ru: 'Обзор',
              },
              link: '/experimental-overview/',
            },
            {
              label: 'BroadcastChannel Transport',
              translations: {
                es: 'Transporte BroadcastChannel',
                ru: 'BroadcastChannel Transport',
              },
              link: '/broadcast-channel-transport/',
            },
            {
              label: 'SES And ShadowRealm Runtime',
              translations: {
                es: 'Runtime de SES y ShadowRealm',
                ru: 'SES и ShadowRealm Runtime',
              },
              link: '/ses-shadowrealm-runtime/',
            },
            {
              label: 'WASM Sandbox Runtime',
              translations: {
                es: 'Runtime de sandbox WASM',
                ru: 'WASM Sandbox Runtime',
              },
              link: '/wasm-sandbox-runtime/',
            },
            {
              label: 'Comparison',
              translations: {
                es: 'Comparación',
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
