import type { ElementNamespace } from 'vue'

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const MATH_ML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML'

export const NODE_TYPE_ELEMENT = 1
export const NODE_TYPE_TEXT = 3
export const NODE_TYPE_COMMENT = 8

const VOID_HTML_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

type NamespaceContext = 'html' | 'svg' | 'mathml'

type ParsedTextNode = {
  type: typeof NODE_TYPE_TEXT,
  text: string,
}

type ParsedCommentNode = {
  type: typeof NODE_TYPE_COMMENT,
  text: string,
}

type ParsedElementNode = {
  type: typeof NODE_TYPE_ELEMENT,
  tag: string,
  properties: Record<string, string>,
  children: ParsedNode[],
}

export type ParsedNode = ParsedTextNode | ParsedCommentNode | ParsedElementNode

export const parseStaticContent = (
  content: string,
  namespace: ElementNamespace
): ParsedNode[] => {
  const parsedWithDom = parseWithDom(content, namespace)

  if (parsedWithDom != null) {
    return parsedWithDom
  }

  return parseWithFallback(content, namespace)
}

const parseWithDom = (
  content: string,
  namespace: ElementNamespace
): ParsedNode[] | null => {
  if (namespace === 'svg' || namespace === 'mathml') {
    if (typeof DOMParser !== 'function') {
      return null
    }

    const parser = new DOMParser()
    const namespaceUri = namespace === 'svg' ? SVG_NAMESPACE : MATH_ML_NAMESPACE
    const wrapped = `<root xmlns="${namespaceUri}">${content}</root>`
    const parsedDocument = parser.parseFromString(wrapped, 'application/xml')
    const root = parsedDocument.documentElement

    return [...root.childNodes]
      .map(toParsedNode)
      .filter((node): node is ParsedNode => node != null)
  }

  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return null
  }

  const template = document.createElement('template')
  template.innerHTML = content

  return [...template.content.childNodes]
    .map(toParsedNode)
    .filter((node): node is ParsedNode => node != null)
}

const toParsedNode = (node: ChildNode): ParsedNode | null => {
  if (node.nodeType === NODE_TYPE_TEXT) {
    return {
      type: NODE_TYPE_TEXT,
      text: node.textContent ?? '',
    }
  }

  if (node.nodeType === NODE_TYPE_COMMENT) {
    return {
      type: NODE_TYPE_COMMENT,
      text: node.textContent ?? '',
    }
  }

  if (node.nodeType !== NODE_TYPE_ELEMENT) {
    return null
  }

  const element = node as Element

  return {
    type: NODE_TYPE_ELEMENT,
    tag: element.localName,
    properties: [...element.attributes].reduce<Record<string, string>>((acc, attribute) => {
      acc[attribute.name] = attribute.value
      return acc
    }, {}),
    children: [...element.childNodes]
      .map(toParsedNode)
      .filter((child): child is ParsedNode => child != null),
  }
}

const parseWithFallback = (
  content: string,
  namespace: ElementNamespace
): ParsedNode[] => {
  const rootNamespace = resolveNamespace(namespace)
  const root: ParsedElementNode = {
    type: NODE_TYPE_ELEMENT,
    tag: '__root__',
    properties: {},
    children: [],
  }

  const stack: Array<{
    node: ParsedElementNode;
    namespace: NamespaceContext;
  }> = [{
    node: root,
    namespace: rootNamespace,
  }]

  let cursor = 0

  const appendText = (text: string) => {
    if (!text) {
      return
    }

    stack[stack.length - 1].node.children.push({
      type: NODE_TYPE_TEXT,
      text: decodeEntities(text),
    })
  }

  while (cursor < content.length) {
    if (!content.startsWith('<', cursor)) {
      const nextTag = content.indexOf('<', cursor)
      const text = nextTag === -1
        ? content.slice(cursor)
        : content.slice(cursor, nextTag)

      appendText(text)
      cursor = nextTag === -1 ? content.length : nextTag
      continue
    }

    if (content.startsWith('<!--', cursor)) {
      const end = content.indexOf('-->', cursor + 4)

      if (end === -1) {
        appendText(content.slice(cursor))
        break
      }

      stack[stack.length - 1].node.children.push({
        type: NODE_TYPE_COMMENT,
        text: content.slice(cursor + 4, end),
      })
      cursor = end + 3
      continue
    }

    if (content.startsWith('</', cursor)) {
      let end = content.indexOf('>', cursor + 2)
      if (end === -1) {
        end = content.length
      }

      const closingTag = content.slice(cursor + 2, end).trim()
      for (let i = stack.length - 1; i > 0; i--) {
        if (normalizeTag(stack[i].node.tag, stack[i].namespace) === normalizeTag(closingTag, stack[i].namespace)) {
          stack.length = i
          break
        }
      }

      cursor = end + 1
      continue
    }

    if (content.startsWith('<!', cursor) || content.startsWith('<?', cursor)) {
      const end = content.indexOf('>', cursor + 2)
      if (end === -1) {
        break
      }

      cursor = end + 1
      continue
    }

    const parentContext = stack[stack.length - 1].namespace
    const open = parseTag(content, cursor, parentContext)
    if (!open) {
      appendText('<')
      cursor += 1
      continue
    }

    stack[stack.length - 1].node.children.push(open.node)

    if (!open.selfClosing && !(parentContext === 'html' && VOID_HTML_TAGS.has(open.node.tag.toLowerCase()))) {
      stack.push({
        node: open.node,
        namespace: getChildNamespace(parentContext, open.node.tag),
      })
    }

    cursor = open.next
  }

  return root.children
}

const parseTag = (
  source: string,
  from: number,
  namespace: NamespaceContext
): { node: ParsedElementNode, selfClosing: boolean, next: number } | null => {
  const isHtmlNamespace = namespace === 'html'
  let cursor = from + 1

  while (cursor < source.length && /\s/.test(source[cursor])) {
    cursor++
  }

  const tagStart = cursor
  while (cursor < source.length && /[^\s/>]/.test(source[cursor])) {
    cursor++
  }

  if (cursor === tagStart) {
    return null
  }

  const rawTag = source.slice(tagStart, cursor)
  const tag = isHtmlNamespace ? rawTag.toLowerCase() : rawTag
  const properties: Record<string, string> = {}
  let selfClosing = false

  while (cursor < source.length) {
    while (cursor < source.length && /\s/.test(source[cursor])) {
      cursor++
    }

    if (source.startsWith('/>', cursor)) {
      selfClosing = true
      cursor += 2
      break
    }

    if (source[cursor] === '>') {
      cursor++
      break
    }

    const attributeStart = cursor
    while (cursor < source.length && /[^\s=/>]/.test(source[cursor])) {
      cursor++
    }

    if (cursor === attributeStart) {
      cursor++
      continue
    }

    const attributeName = source.slice(attributeStart, cursor)
    let attributeValue = ''

    while (cursor < source.length && /\s/.test(source[cursor])) {
      cursor++
    }

    if (source[cursor] === '=') {
      cursor++

      while (cursor < source.length && /\s/.test(source[cursor])) {
        cursor++
      }

      const quote = source[cursor]

      if (quote === '"' || quote === '\'') {
        cursor++
        const valueStart = cursor
        const valueEnd = source.indexOf(quote, cursor)

        if (valueEnd === -1) {
          attributeValue = source.slice(valueStart)
          cursor = source.length
        } else {
          attributeValue = source.slice(valueStart, valueEnd)
          cursor = valueEnd + 1
        }
      } else {
        const valueStart = cursor
        while (cursor < source.length && /[^\s/>]/.test(source[cursor])) {
          cursor++
        }

        attributeValue = source.slice(valueStart, cursor)
      }
    }

    properties[attributeName] = decodeEntities(attributeValue)
  }

  return {
    node: {
      type: NODE_TYPE_ELEMENT,
      tag,
      properties,
      children: [],
    },
    selfClosing,
    next: cursor,
  }
}

const resolveNamespace = (namespace: ElementNamespace): NamespaceContext => {
  if (namespace === 'svg') {
    return 'svg'
  }

  if (namespace === 'mathml') {
    return 'mathml'
  }

  return 'html'
}

const normalizeTag = (tag: string, namespace: NamespaceContext): string => {
  return namespace === 'html'
    ? tag.toLowerCase()
    : tag
}

const getChildNamespace = (
  parentNamespace: NamespaceContext,
  tag: string
): NamespaceContext => {
  const lowerTag = tag.toLowerCase()

  if (parentNamespace === 'html') {
    if (lowerTag === 'svg') {
      return 'svg'
    }

    if (lowerTag === 'math') {
      return 'mathml'
    }
  }

  if (parentNamespace === 'svg' && lowerTag === 'foreignobject') {
    return 'html'
  }

  return parentNamespace
}

const decodeEntities = (value: string) => value.replace(
  /&(#x?[0-9a-fA-F]+|[a-zA-Z][\w-]*);/g,
  (_, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      const decoded = decodeCodePoint(Number.parseInt(entity.slice(2), 16))
      return decoded ?? `&${entity};`
    }

    if (entity.startsWith('#')) {
      const decoded = decodeCodePoint(Number.parseInt(entity.slice(1), 10))
      return decoded ?? `&${entity};`
    }

    switch (entity) {
      case 'amp': return '&'
      case 'apos': return '\''
      case 'gt': return '>'
      case 'lt': return '<'
      case 'nbsp': return '\u00A0'
      case 'quot': return '"'
      default: return `&${entity};`
    }
  }
)

const decodeCodePoint = (value: number): string | null => {
  if (!Number.isInteger(value) || value < 0 || value > 0x10FFFF) {
    return null
  }

  try {
    return String.fromCodePoint(value)
  } catch {
    return null
  }
}
