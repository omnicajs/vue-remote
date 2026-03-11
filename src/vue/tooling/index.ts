import type { VueEmbeddedCode, VueLanguagePlugin } from '@vue/language-core'
import type * as TypeScript from 'typescript'

export type {
  RemoteElementProperties,
  RemoteElementProxy,
  RemoteElementRef,
  RemoteElementSchema,
  RemoteElementTagName,
} from '@/vue/remote/types'

import type { RemoteElementProxy, RemoteElementTagName } from '@/vue/remote/types'
import { replaceSourceRange } from 'muggle-string'

const REMOTE_SFC_PATTERN = /\.remote\.vue$/i
const SCRIPT_EMBEDDED_CODE_PATTERN = /^script_(?:c|m)?(?:j|t)sx?$/
const REMOTE_SFC_ATTRIBUTE = 'remote'

export type RemoteIntrinsicElements = {
  [Tag in RemoteElementTagName]: RemoteElementProxy<Tag>;
}

const injectRemoteIntrinsicElements = (embeddedFile: VueEmbeddedCode) => {
  embeddedFile.content.unshift(
    'type __VLS_Elements = import(\'@omnicajs/vue-remote/tooling\').RemoteIntrinsicElements;\n'
  )
}

type NullTemplateRefBinding = {
  callEnd: number;
  callStart: number;
  kind: 'ref' | 'shallowRef';
  tag: string;
}

type TemplateNode = {
  children?: unknown[];
  props?: unknown[];
  tag?: string;
  tagType?: number;
  type: number;
}

type TemplateNodeProperty = {
  name?: string;
  type: number;
  value?: {
    content: string;
  } | null;
}

const TYPE_CAST_BY_KIND = {
  ref: 'Ref',
  shallowRef: 'ShallowRef',
} as const

const isTemplateNode = (value: unknown): value is TemplateNode => {
  return typeof value === 'object'
    && value != null
    && 'type' in value
    && typeof (value as { type: unknown }).type === 'number'
}

const isElementNode = (node: unknown): node is TemplateNode => {
  return isTemplateNode(node) && node.type === 1
}

const isStaticRefAttribute = (property: unknown): property is TemplateNodeProperty => {
  if (typeof property !== 'object' || property == null) {
    return false
  }

  const candidate = property as TemplateNodeProperty

  return candidate.type === 6
    && candidate.name === 'ref'
    && candidate.value != null
}

const collectNativeTemplateRefs = (root: unknown) => {
  const refs = new Map<string, string>()

  if (!isTemplateNode(root) || !Array.isArray(root.children)) {
    return refs
  }

  const visit = (nodes: unknown[]) => {
    for (const node of nodes) {
      if (!isElementNode(node)) {
        continue
      }

      if (node.tagType === 0 && node.tag != null) {
        const refAttribute = node.props?.find(isStaticRefAttribute)

        if (refAttribute?.value?.content) {
          refs.set(refAttribute.value.content, node.tag)
        }
      }

      visit(Array.isArray(node.children) ? node.children : [])
    }
  }

  visit(root.children)
  return refs
}

const collectNullTemplateRefBindings = (
  ts: typeof TypeScript,
  ast: TypeScript.SourceFile | undefined,
  templateRefs: Map<string, string>
) => {
  const bindings: NullTemplateRefBinding[] = []

  if (ast == null || templateRefs.size === 0) {
    return bindings
  }

  const visit = (node: TypeScript.Node, parents: TypeScript.Node[]) => {
    const parent = parents[parents.length - 1]

    if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && (node.expression.text === 'ref' || node.expression.text === 'shallowRef')
      && node.arguments.length > 0
      && node.arguments[0].kind === ts.SyntaxKind.NullKeyword
      && ts.isVariableDeclaration(parent)
      && ts.isIdentifier(parent.name)
    ) {
      const tag = templateRefs.get(parent.name.text)

      if (tag != null) {
        bindings.push({
          callStart: node.getStart(ast),
          callEnd: node.getEnd(),
          kind: node.expression.text,
          tag,
        })
      }
    }

    ts.forEachChild(node, child => {
      if (ts.isFunctionLike(node)) {
        return
      }

      parents.push(node)
      visit(child, parents)
      parents.pop()
    })
  }

  visit(ast, [ast])
  return bindings
}

const injectNullTemplateRefCasts = (
  embeddedFile: VueEmbeddedCode,
  sourceName: string,
  bindings: NullTemplateRefBinding[]
) => {
  for (const binding of bindings) {
    replaceSourceRange(
      embeddedFile.content,
      sourceName,
      binding.callStart,
      binding.callStart,
      '('
    )
    replaceSourceRange(
      embeddedFile.content,
      sourceName,
      binding.callEnd,
      binding.callEnd,
      ` as import('vue').${TYPE_CAST_BY_KIND[binding.kind]}<import('@omnicajs/vue-remote/tooling').RemoteIntrinsicElements['${binding.tag}'] | null>)`
    )
  }
}

const hasRemoteAttribute = (value: { attrs?: Record<string, string | true> } | null | undefined) => {
  return value?.attrs?.[REMOTE_SFC_ATTRIBUTE] === true
}

const isRemoteSfc = (
  fileName: string,
  sfc: {
    script?: { attrs?: Record<string, string | true> } | null;
    scriptSetup?: { attrs?: Record<string, string | true> } | null;
  }
) => {
  return REMOTE_SFC_PATTERN.test(fileName)
    || hasRemoteAttribute(sfc.script)
    || hasRemoteAttribute(sfc.scriptSetup)
}

const isScriptEmbeddedCode = (embeddedFile: VueEmbeddedCode) => {
  return SCRIPT_EMBEDDED_CODE_PATTERN.test(embeddedFile.id)
}

export const vueRemoteToolingPlugin: VueLanguagePlugin = (context) => ({
  version: 2.1,
  name: '@omnicajs/vue-remote/tooling',
  order: 100,
  resolveEmbeddedCode (fileName, sfc, embeddedFile) {
    if (!isRemoteSfc(fileName, sfc) || !isScriptEmbeddedCode(embeddedFile)) {
      return
    }

    injectRemoteIntrinsicElements(embeddedFile)

    if (sfc.scriptSetup == null) {
      return
    }

    const templateRefs = collectNativeTemplateRefs(sfc.template?.ast)
    const bindings = collectNullTemplateRefBindings(
      context.modules.typescript,
      sfc.scriptSetup.ast,
      templateRefs
    )

    injectNullTemplateRefCasts(embeddedFile, sfc.scriptSetup.name, bindings)
  },
})

export default vueRemoteToolingPlugin
