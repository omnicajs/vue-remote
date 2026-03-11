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
        ja: {
          label: '日本語',
          lang: 'ja',
        },
        zh: {
          label: '简体中文',
          lang: 'zh-CN',
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
            ja: 'イントロダクション',
            'zh-CN': '简介',
            ru: 'Введение',
          },
          items: [
            {
              label: 'Introduction',
              translations: {
                es: 'Introducción',
                ja: '紹介',
                'zh-CN': '介绍',
                ru: 'Обзор',
              },
              link: '/introduction/',
            },
            {
              label: 'Getting Started',
              translations: {
                es: 'Primeros pasos',
                ja: 'クイックスタート',
                'zh-CN': '快速开始',
                ru: 'Быстрый старт',
              },
              link: '/getting-started/',
            },
            {
              label: 'Versions',
              translations: {
                es: 'Versiones',
                ja: 'バージョン',
                'zh-CN': '版本',
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
            ja: 'コアコンセプト',
            'zh-CN': '核心概念',
            ru: 'Ключевые концепции',
          },
          items: [
            {
              label: 'Host Components',
              translations: {
                es: 'Componentes del host',
                ja: 'ホストコンポーネント',
                'zh-CN': '宿主组件',
                ru: 'Компоненты хоста',
              },
              link: '/host-components/',
            },
            {
              label: 'Remote Components',
              translations: {
                es: 'Componentes remotos',
                ja: 'リモートコンポーネント',
                'zh-CN': '远程组件',
                ru: 'Компоненты remote',
              },
              link: '/remote-components/',
            },
            {
              label: 'Known Limitations',
              translations: {
                es: 'Limitaciones conocidas',
                ja: '既知の制限',
                'zh-CN': '已知限制',
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
            ja: 'ランタイムとトランスポート',
            'zh-CN': '运行时与传输',
            ru: 'Рантайм и транспорты',
          },
          items: [
            {
              label: 'Overview',
              translations: {
                es: 'Resumen',
                ja: '概要',
                'zh-CN': '概览',
                ru: 'Обзор',
              },
              link: '/overview/',
            },
            {
              label: 'Iframe Integration',
              translations: {
                es: 'Integración con iframe',
                ja: 'Iframe 統合',
                'zh-CN': 'Iframe 集成',
                ru: 'Интеграция через iframe',
              },
              link: '/integration/',
            },
            {
              label: 'Web Worker Runtime',
              translations: {
                es: 'Runtime de Web Worker',
                ja: 'Web Worker ランタイム',
                'zh-CN': 'Web Worker 运行时',
                ru: 'Web Worker Runtime',
              },
              link: '/web-workers/',
            },
            {
              label: 'Window Transport',
              translations: {
                es: 'Transporte Window',
                ja: 'Window トランスポート',
                'zh-CN': 'Window 传输',
                ru: 'Window Transport',
              },
              link: '/window-transport/',
            },
            {
              label: 'MessagePort Transport',
              translations: {
                es: 'Transporte MessagePort',
                ja: 'MessagePort トランスポート',
                'zh-CN': 'MessagePort 传输',
                ru: 'MessagePort Transport',
              },
              link: '/message-port-transport/',
            },
            {
              label: 'Desktop IPC Transport',
              translations: {
                es: 'Transporte IPC de escritorio',
                ja: 'デスクトップ IPC トランスポート',
                'zh-CN': '桌面 IPC 传输',
                ru: 'Desktop IPC Transport',
              },
              link: '/desktop-ipc-transport/',
            },
            {
              label: 'Socket Transport',
              translations: {
                es: 'Transporte Socket',
                ja: 'Socket トランスポート',
                'zh-CN': 'Socket 传输',
                ru: 'Socket Transport',
              },
              link: '/socket-transport/',
            },
            {
              label: 'In-Memory Transport',
              translations: {
                es: 'Transporte en memoria',
                ja: 'インメモリトランスポート',
                'zh-CN': '内存传输',
                ru: 'In-Memory Transport',
              },
              link: '/memory-transport/',
            },
            {
              label: 'Transport Comparison',
              translations: {
                es: 'Comparación de transportes',
                ja: 'トランスポート比較',
                'zh-CN': '传输方式对比',
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
            ja: '実験的機能',
            'zh-CN': '实验能力',
            ru: 'Экспериментальные возможности',
          },
          items: [
            {
              label: 'Overview',
              translations: {
                es: 'Resumen',
                ja: '概要',
                'zh-CN': '概览',
                ru: 'Обзор',
              },
              link: '/experimental-overview/',
            },
            {
              label: 'BroadcastChannel Transport',
              translations: {
                es: 'Transporte BroadcastChannel',
                ja: 'BroadcastChannel トランスポート',
                'zh-CN': 'BroadcastChannel 传输',
                ru: 'BroadcastChannel Transport',
              },
              link: '/broadcast-channel-transport/',
            },
            {
              label: 'SES And ShadowRealm Runtime',
              translations: {
                es: 'Runtime de SES y ShadowRealm',
                ja: 'SES / ShadowRealm ランタイム',
                'zh-CN': 'SES 与 ShadowRealm 运行时',
                ru: 'SES и ShadowRealm Runtime',
              },
              link: '/ses-shadowrealm-runtime/',
            },
            {
              label: 'WASM Sandbox Runtime',
              translations: {
                es: 'Runtime de sandbox WASM',
                ja: 'WASM サンドボックスランタイム',
                'zh-CN': 'WASM 沙箱运行时',
                ru: 'WASM Sandbox Runtime',
              },
              link: '/wasm-sandbox-runtime/',
            },
            {
              label: 'Comparison',
              translations: {
                es: 'Comparación',
                ja: '比較',
                'zh-CN': '对比',
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
