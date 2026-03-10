import {
  describe,
  expect,
  test,
} from 'vitest'

import { parse as parseTemplate } from '@vue/compiler-dom'
import { toString } from 'muggle-string'
import ts from 'typescript'

import vueRemoteToolingPlugin from '@/vue/tooling'

const HELPER_IMPORT = 'type __VLS_Elements = import(\'@omnicajs/vue-remote/tooling\').RemoteIntrinsicElements;\n'

const createEmbeddedCode = (code: string, id = 'script_ts', source = 'fixture.ts') => {
  return {
    id,
    content: [[code, source, 0]] as string[],
  }
}

const createPlugin = () => {
  return vueRemoteToolingPlugin({
    modules: {
      typescript: ts,
    },
  } as never)
}

const createScriptAst = (code: string) => {
  return ts.createSourceFile('fixture.ts', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
}

describe('vueRemoteToolingPlugin', () => {
  test('skips non-remote files and non-script embedded code', () => {
    const plugin = createPlugin()
    const code = 'const panel = ref(null)\n'
    const sfc = {
      scriptSetup: {
        ast: createScriptAst(code),
        name: 'fixture.ts',
      },
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

  test('leaves script unchanged when script setup ast is unavailable', () => {
    const plugin = createPlugin()
    const code = 'const panel = ref(null)\n'
    const embedded = createEmbeddedCode(code)

    plugin.resolveEmbeddedCode?.('fixture.remote.vue', {
      scriptSetup: {
        ast: undefined,
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
      scriptSetup: {
        ast: createScriptAst(code),
        name: 'fixture.ts',
      },
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
      scriptSetup: {
        ast: createScriptAst(code),
        name: 'fixture.ts',
      },
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
      scriptSetup: {
        ast: createScriptAst(code),
        name: 'fixture.ts',
      },
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
      scriptSetup: {
        ast: createScriptAst(code),
        name: 'fixture.ts',
      },
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
})
