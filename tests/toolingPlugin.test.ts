import type {
  Code,
  VueLanguagePluginReturn,
} from '@vue/language-core'

import {
  describe,
  expect,
  test,
} from 'vitest'

import { parse as parseTemplate } from '@vue/compiler-dom'
import { toString } from 'muggle-string'
import ts from 'typescript'

import {
  vueRemoteToolingPlugin,
} from '@/vue/tooling'
import { rewriteRemoteEventHelperImports } from '@/vue/bundler'
import { vueRemoteVitePlugin } from '@/vue/vite-plugin'
import vueRemoteWebpackLoader, { transformRemoteEventHelpersForWebpack } from '@/vue/webpack-loader'

const HELPER_IMPORT = 'type __VLS_Elements = import(\'@omnicajs/vue-remote/tooling\').RemoteIntrinsicElements;\n'

const createEmbeddedCode = (code: string, id = 'script_ts', source = 'fixture.ts') => {
  return {
    id,
    content: [[code, source, 0, {}]] as Code[],
  }
}

const createPlugin = (): VueLanguagePluginReturn => {
  const plugin = vueRemoteToolingPlugin({
    modules: {
      typescript: ts,
    },
  } as never)

  return Array.isArray(plugin) ? plugin[0] : plugin
}

const createScriptAst = (code: string) => {
  return ts.createSourceFile('fixture.ts', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
}

const createRemoteScriptSetup = (code: string, isRemote = false) => {
  return {
    ast: createScriptAst(code),
    attrs: isRemote ? { remote: true } : {},
    name: 'fixture.ts',
  }
}

describe('vueRemoteToolingPlugin', () => {
  test('skips non-remote files and non-script embedded code', () => {
    const plugin = createPlugin()
    const code = 'const panel = ref(null)\n'
    const sfc = {
      scriptSetup: createRemoteScriptSetup(code),
      template: {
        ast: parseTemplate('<div ref="panel" />'),
      },
    }

    const nonRemote = createEmbeddedCode(code)
    plugin.resolveEmbeddedCode?.('fixture.vue', sfc as never, nonRemote as never)
    expect(toString(nonRemote.content)).toBe(code)

    const nonScript = createEmbeddedCode(code, 'template')
    plugin.resolveEmbeddedCode?.('fixture.remote.vue', sfc as never, nonScript as never)
    expect(toString(nonScript.content)).toBe(code)
  })

  test('injects intrinsic helper import even when script setup is missing', () => {
    const plugin = createPlugin()
    const embedded = createEmbeddedCode('')

    plugin.resolveEmbeddedCode?.('fixture.remote.vue', {
      scriptSetup: null,
      template: {
        ast: parseTemplate('<div ref="panel" />'),
      },
    } as never, embedded as never)

    expect(toString(embedded.content)).toBe(HELPER_IMPORT)
  })

  test('treats remote script setup attribute as an alternative marker', () => {
    const plugin = createPlugin()
    const code = 'const panel = ref(null)\n'
    const embedded = createEmbeddedCode(code)

    plugin.resolveEmbeddedCode?.('fixture.vue', {
      scriptSetup: createRemoteScriptSetup(code, true),
      template: {
        ast: parseTemplate('<div ref="panel" />'),
      },
    } as never, embedded as never)

    expect(toString(embedded.content)).toContain(HELPER_IMPORT)
    expect(toString(embedded.content)).toContain('const panel = (ref(null) as import(\'vue\').Ref<import(\'@omnicajs/vue-remote/tooling\').RemoteIntrinsicElements[\'div\'] | null>)')
  })

  test('leaves script unchanged when script setup ast is unavailable', () => {
    const plugin = createPlugin()
    const code = 'const panel = ref(null)\n'
    const embedded = createEmbeddedCode(code)

    plugin.resolveEmbeddedCode?.('fixture.remote.vue', {
      scriptSetup: {
        ast: undefined,
        attrs: {},
        name: 'fixture.ts',
      },
      template: {
        ast: parseTemplate('<div ref="panel" />'),
      },
    } as never, embedded as never)

    expect(toString(embedded.content)).toBe(`${HELPER_IMPORT}${code}`)
  })

  test('leaves script unchanged when template ast is unavailable', () => {
    const plugin = createPlugin()
    const code = 'const panel = ref(null)\n'
    const embedded = createEmbeddedCode(code)

    plugin.resolveEmbeddedCode?.('fixture.remote.vue', {
      scriptSetup: createRemoteScriptSetup(code),
      template: {
        ast: undefined,
      },
    } as never, embedded as never)

    expect(toString(embedded.content)).toBe(`${HELPER_IMPORT}${code}`)
  })

  test('leaves script unchanged when template has no native static refs', () => {
    const plugin = createPlugin()
    const code = 'const dialog = ref(null)\n'
    const embedded = createEmbeddedCode(code)

    plugin.resolveEmbeddedCode?.('fixture.remote.vue', {
      scriptSetup: createRemoteScriptSetup(code),
      template: {
        ast: parseTemplate('<VDialog ref="dialog" /><div :ref="dynamic" />'),
      },
    } as never, embedded as never)

    expect(toString(embedded.content)).toBe(`${HELPER_IMPORT}${code}`)
  })

  test('tolerates malformed template nodes while collecting refs', () => {
    const plugin = createPlugin()
    const code = 'const panel = ref(null)\n'
    const embedded = createEmbeddedCode(code)

    plugin.resolveEmbeddedCode?.('fixture.remote.vue', {
      scriptSetup: createRemoteScriptSetup(code),
      template: {
        ast: {
          type: 0,
          children: [
            { type: 2 },
            {
              type: 1,
              tag: 'section',
              tagType: 0,
              props: [null],
            },
          ],
        },
      },
    } as never, embedded as never)

    expect(toString(embedded.content)).toBe(`${HELPER_IMPORT}${code}`)
  })

  test('injects casts for matching native template refs and skips unsupported bindings', () => {
    const plugin = createPlugin()
    const code = [
      'import { ref, shallowRef } from \'vue\'',
      'const panel = ref(null)',
      'const icon = shallowRef(null)',
      'const input = ref(null)',
      'const preset = ref(\'ready\')',
      'const stray = ref(null)',
      'const hiddenFactory = () => {',
      '  const hidden = ref(null)',
      '  return hidden',
      '}',
      '',
    ].join('\n')
    const embedded = createEmbeddedCode(code)

    plugin.resolveEmbeddedCode?.('fixture.remote.vue', {
      scriptSetup: createRemoteScriptSetup(code),
      template: {
        ast: parseTemplate([
          '<div ref="panel" />',
          '<svg ref="icon" />',
          '<div><input ref="input" /></div>',
          '<VDialog ref="dialog" />',
          '<div :ref="dynamic" />',
          '<span ref="hidden" />',
        ].join('')),
      },
    } as never, embedded as never)

    const transformed = toString(embedded.content)

    expect(transformed).toContain(HELPER_IMPORT)
    expect(transformed).toContain('const panel = (ref(null) as import(\'vue\').Ref<import(\'@omnicajs/vue-remote/tooling\').RemoteIntrinsicElements[\'div\'] | null>)')
    expect(transformed).toContain('const icon = (shallowRef(null) as import(\'vue\').ShallowRef<import(\'@omnicajs/vue-remote/tooling\').RemoteIntrinsicElements[\'svg\'] | null>)')
    expect(transformed).toContain('const input = (ref(null) as import(\'vue\').Ref<import(\'@omnicajs/vue-remote/tooling\').RemoteIntrinsicElements[\'input\'] | null>)')
    expect(transformed).not.toContain('preset = (ref')
    expect(transformed).not.toContain('stray = (ref')
    expect(transformed).not.toContain('hidden = (ref')
    expect(transformed).not.toContain('dialog')
  })

  test('treats remote script attribute as an alternative marker', () => {
    const plugin = createPlugin()
    const embedded = createEmbeddedCode('')

    plugin.resolveEmbeddedCode?.('fixture.vue', {
      script: {
        attrs: { remote: true },
      },
      scriptSetup: null,
      template: {
        ast: parseTemplate('<div ref="panel" />'),
      },
    } as never, embedded as never)

    expect(toString(embedded.content)).toBe(HELPER_IMPORT)
  })

  test('rewrites Vue event helper imports to remote runtime helpers', () => {
    const code = [
      'import { withModifiers as _withModifiers, withKeys as _withKeys, openBlock as _openBlock } from "vue"',
      'const click = _withModifiers(submit, ["stop"])',
      'const keydown = _withKeys(click, ["enter"])',
      '_openBlock()',
      '',
    ].join('\n')

    expect(rewriteRemoteEventHelperImports(code)).toBe([
      'import { withModifiers as _withModifiers, withKeys as _withKeys } from \'@omnicajs/vue-remote/remote\'',
      'import { openBlock as _openBlock } from "vue"',
      'const click = _withModifiers(submit, ["stop"])',
      'const keydown = _withKeys(click, ["enter"])',
      '_openBlock()',
      '',
    ].join('\n'))
  })

  test('leaves helper imports untouched when no supported helpers can be extracted', () => {
    const code = 'import { ref, withModifiers as } from "vue"\n'

    expect(rewriteRemoteEventHelperImports(code)).toBeNull()
  })

  test('vite plugin rewrites helper imports for remote modules only', async () => {
    const [scanPlugin, rewritePlugin] = vueRemoteVitePlugin() as Array<{
      transform?: (code: string, id: string) => unknown;
    }>
    const remoteId = '/workspace/Component.remote.vue?vue&type=template&lang.js'
    const code = 'import { withModifiers as _withModifiers } from "vue"\n'

    expect(await rewritePlugin.transform?.(code, remoteId)).toBe(
      'import { withModifiers as _withModifiers } from \'@omnicajs/vue-remote/remote\'\n'
    )

    await scanPlugin.transform?.('<script setup remote>const n = 1</script>', '/workspace/Component.vue')

    expect(await rewritePlugin.transform?.(code, '/workspace/Component.vue?vue&type=template&lang.js')).toBe(
      'import { withModifiers as _withModifiers } from \'@omnicajs/vue-remote/remote\'\n'
    )

    expect(await rewritePlugin.transform?.(code, '/workspace/Component.vue?vue&type=template&lang.js&plain=1')).toBe(
      'import { withModifiers as _withModifiers } from \'@omnicajs/vue-remote/remote\'\n'
    )

    expect(await rewritePlugin.transform?.(code, '/workspace/Plain.vue?vue&type=template&lang.js')).toBeNull()
  })

  test('vite scan plugin ignores virtual Vue blocks', async () => {
    const [scanPlugin] = vueRemoteVitePlugin() as Array<{
      transform?: (code: string, id: string) => unknown;
    }>

    expect(await scanPlugin.transform?.('<script setup remote>const n = 1</script>', '/workspace/Component.vue?vue&type=script&lang.ts')).toBeNull()
  })

  test('webpack transform rewrites helper imports for .remote.vue modules', () => {
    const code = 'import { withModifiers as _withModifiers } from "vue"\n'

    expect(transformRemoteEventHelpersForWebpack(
      code,
      '/workspace/RemoteWidget.remote.vue',
      '?vue&type=template&id=123&lang.js'
    )).toBe('import { withModifiers as _withModifiers } from \'@omnicajs/vue-remote/remote\'\n')
  })

  test('webpack transform tracks <script remote> SFCs before rewriting their compiled modules', () => {
    const source = '<script setup remote lang="ts">const n = 1</script>'
    const code = 'import { withKeys as _withKeys } from "vue"\n'
    const file = '/workspace/TrackedWidget.vue'

    expect(transformRemoteEventHelpersForWebpack(source, file)).toBe(source)
    expect(transformRemoteEventHelpersForWebpack(
      code,
      file,
      '?vue&type=template&id=456&lang.js'
    )).toBe('import { withKeys as _withKeys } from \'@omnicajs/vue-remote/remote\'\n')
  })

  test('webpack transform leaves non-remote modules and non-helper imports unchanged', () => {
    const plainCode = 'import { withModifiers as _withModifiers } from "vue"\n'
    const remoteCodeWithoutHelpers = 'import { ref } from "vue"\n'

    expect(transformRemoteEventHelpersForWebpack(
      plainCode,
      '/workspace/PlainWidget.vue',
      '?vue&type=template&id=789&lang.js'
    )).toBe(plainCode)

    expect(transformRemoteEventHelpersForWebpack(
      remoteCodeWithoutHelpers,
      '/workspace/RemoteWidget.remote.vue',
      '?vue&type=template&id=789&lang.js'
    )).toBe(remoteCodeWithoutHelpers)
  })

  test('webpack loader falls back to empty context fields', () => {
    expect(vueRemoteWebpackLoader.call({}, 'import { ref } from "vue"\n')).toBe('import { ref } from "vue"\n')
  })
})
