import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repository = process.env.GITHUB_REPOSITORY ?? 'omnicajs/vue-remote'
const [owner, repo] = repository.split('/')
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true'
const docsBase = process.env.DOCS_BASE
const rootDir = fileURLToPath(new URL('.', import.meta.url))
const withMexicanSpanish = (translations: Record<string, string>) => (
  'es' in translations && !('es-MX' in translations)
    ? { ...translations, 'es-MX': translations.es }
    : translations
)

export default defineConfig({
  output: 'static',
  site: `https://${owner}.github.io`,
  base: docsBase || (isGitHubActions ? `/${repo}` : '/'),
  srcDir: './web',
  outDir: './dist-web',
  cacheDir: './var/cache/astro',
  vite: {
    resolve: {
      alias: {
        '@': path.resolve(rootDir, './src'),
        '@omnicajs/vue-remote/host': path.resolve(rootDir, './src/vue/host/index.ts'),
        '@omnicajs/vue-remote/remote': path.resolve(rootDir, './src/vue/remote/index.ts'),
      },
    },
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
        'es-mx': {
          label: 'Español (MX)',
          lang: 'es-MX',
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
          translations: withMexicanSpanish({
            es: 'Introducción',
            ja: 'イントロダクション',
            'zh-CN': '简介',
            ru: 'Введение',
          }),
          items: [
            {
              label: 'Introduction',
              translations: withMexicanSpanish({
                es: 'Introducción',
                ja: '紹介',
                'zh-CN': '介绍',
                ru: 'Обзор',
              }),
              link: '/introduction/',
            },
            {
              label: 'Getting Started',
              translations: withMexicanSpanish({
                es: 'Primeros pasos',
                ja: 'クイックスタート',
                'zh-CN': '快速开始',
                ru: 'Быстрый старт',
              }),
              link: '/getting-started/',
            },
            {
              label: 'Event Modifiers',
              translations: withMexicanSpanish({
                es: 'Modificadores de eventos',
                ja: 'イベント修飾子',
                'zh-CN': '事件修饰符',
                ru: 'Модификаторы событий',
              }),
              link: '/event-modifiers/',
            },
            {
              label: 'Versions',
              translations: withMexicanSpanish({
                es: 'Versiones',
                ja: 'バージョン',
                'zh-CN': '版本',
                ru: 'Версии',
              }),
              link: '/versions/',
            },
          ],
        },
        {
          label: 'Core Concepts',
          translations: withMexicanSpanish({
            es: 'Conceptos clave',
            ja: 'コアコンセプト',
            'zh-CN': '核心概念',
            ru: 'Ключевые концепции',
          }),
          items: [
            {
              label: 'Host Components',
              translations: withMexicanSpanish({
                es: 'Componentes del host',
                ja: 'ホストコンポーネント',
                'zh-CN': '宿主组件',
                ru: 'Компоненты хоста',
              }),
              link: '/host-components/',
            },
            {
              label: 'Remote Components',
              translations: withMexicanSpanish({
                es: 'Componentes remotos',
                ja: 'リモートコンポーネント',
                'zh-CN': '远程组件',
                ru: 'Компоненты remote',
              }),
              link: '/remote-components/',
            },
            {
              label: 'Sortable Drag and Drop',
              translations: withMexicanSpanish({
                es: 'Arrastrar y soltar ordenable',
                ja: '並べ替えドラッグ＆ドロップ',
                'zh-CN': '可排序拖放',
                ru: 'Перетаскивание и сортировка',
              }),
              link: '/sortable-dnd/',
            },
            {
              label: 'Known Limitations',
              translations: withMexicanSpanish({
                es: 'Limitaciones conocidas',
                ja: '既知の制限',
                'zh-CN': '已知限制',
                ru: 'Известные ограничения',
              }),
              link: '/limitations/',
            },
          ],
        },
        {
          label: 'Runtime And Transports',
          translations: withMexicanSpanish({
            es: 'Runtime y transportes',
            ja: 'ランタイムとトランスポート',
            'zh-CN': '运行时与传输',
            ru: 'Рантайм и транспорты',
          }),
          items: [
            {
              label: 'Overview',
              translations: withMexicanSpanish({
                es: 'Resumen',
                ja: '概要',
                'zh-CN': '概览',
                ru: 'Обзор',
              }),
              link: '/overview/',
            },
            {
              label: 'Iframe Integration',
              translations: withMexicanSpanish({
                es: 'Integración con iframe',
                ja: 'Iframe 統合',
                'zh-CN': 'Iframe 集成',
                ru: 'Интеграция через iframe',
              }),
              link: '/integration/',
            },
            {
              label: 'Web Worker Runtime',
              translations: withMexicanSpanish({
                es: 'Runtime de Web Worker',
                ja: 'Web Worker ランタイム',
                'zh-CN': 'Web Worker 运行时',
                ru: 'Web Worker Runtime',
              }),
              link: '/web-workers/',
            },
            {
              label: 'Window Transport',
              translations: withMexicanSpanish({
                es: 'Transporte Window',
                ja: 'Window トランスポート',
                'zh-CN': 'Window 传输',
                ru: 'Window Transport',
              }),
              link: '/window-transport/',
            },
            {
              label: 'MessagePort Transport',
              translations: withMexicanSpanish({
                es: 'Transporte MessagePort',
                ja: 'MessagePort トランスポート',
                'zh-CN': 'MessagePort 传输',
                ru: 'MessagePort Transport',
              }),
              link: '/message-port-transport/',
            },
            {
              label: 'Desktop IPC Transport',
              translations: withMexicanSpanish({
                es: 'Transporte IPC de escritorio',
                ja: 'デスクトップ IPC トランスポート',
                'zh-CN': '桌面 IPC 传输',
                ru: 'Desktop IPC Transport',
              }),
              link: '/desktop-ipc-transport/',
            },
            {
              label: 'Socket Transport',
              translations: withMexicanSpanish({
                es: 'Transporte Socket',
                ja: 'Socket トランスポート',
                'zh-CN': 'Socket 传输',
                ru: 'Socket Transport',
              }),
              link: '/socket-transport/',
            },
            {
              label: 'In-Memory Transport',
              translations: withMexicanSpanish({
                es: 'Transporte en memoria',
                ja: 'インメモリトランスポート',
                'zh-CN': '内存传输',
                ru: 'In-Memory Transport',
              }),
              link: '/memory-transport/',
            },
            {
              label: 'Transport Comparison',
              translations: withMexicanSpanish({
                es: 'Comparación de transportes',
                ja: 'トランスポート比較',
                'zh-CN': '传输方式对比',
                ru: 'Сравнение транспортов',
              }),
              link: '/transport-comparison/',
            },
          ],
        },
        {
          label: 'Experimental Capabilities',
          translations: withMexicanSpanish({
            es: 'Capacidades experimentales',
            ja: '実験的機能',
            'zh-CN': '实验能力',
            ru: 'Экспериментальные возможности',
          }),
          items: [
            {
              label: 'Overview',
              translations: withMexicanSpanish({
                es: 'Resumen',
                ja: '概要',
                'zh-CN': '概览',
                ru: 'Обзор',
              }),
              link: '/experimental-overview/',
            },
            {
              label: 'BroadcastChannel Transport',
              translations: withMexicanSpanish({
                es: 'Transporte BroadcastChannel',
                ja: 'BroadcastChannel トランスポート',
                'zh-CN': 'BroadcastChannel 传输',
                ru: 'BroadcastChannel Transport',
              }),
              link: '/broadcast-channel-transport/',
            },
            {
              label: 'SES And ShadowRealm Runtime',
              translations: withMexicanSpanish({
                es: 'Runtime de SES y ShadowRealm',
                ja: 'SES / ShadowRealm ランタイム',
                'zh-CN': 'SES 与 ShadowRealm 运行时',
                ru: 'SES и ShadowRealm Runtime',
              }),
              link: '/ses-shadowrealm-runtime/',
            },
            {
              label: 'WASM Sandbox Runtime',
              translations: withMexicanSpanish({
                es: 'Runtime de sandbox WASM',
                ja: 'WASM サンドボックスランタイム',
                'zh-CN': 'WASM 沙箱运行时',
                ru: 'WASM Sandbox Runtime',
              }),
              link: '/wasm-sandbox-runtime/',
            },
            {
              label: 'Comparison',
              translations: withMexicanSpanish({
                es: 'Comparación',
                ja: '比較',
                'zh-CN': '对比',
                ru: 'Сравнение',
              }),
              link: '/experimental-comparison/',
            },
          ],
        },
        {
          label: 'Sandboxes',
          translations: withMexicanSpanish({
            es: 'Sandboxes interactivos',
            ja: 'サンドボックス',
            'zh-CN': '交互式沙盒',
            ru: 'Песочницы',
          }),
          items: [
            {
              label: 'Worker Kanban Board',
              translations: withMexicanSpanish({
                es: 'Tablero kanban en Worker',
                ja: 'Worker カンバンボード',
                'zh-CN': 'Worker 看板',
                ru: 'Канбан-доска в Worker',
              }),
              link: '/worker-kanban-sandbox/',
            },
          ],
        },
      ],
    }),
  ],
})
