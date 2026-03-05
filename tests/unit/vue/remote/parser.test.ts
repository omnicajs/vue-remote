import {
  afterEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import {
  NODE_TYPE_COMMENT,
  NODE_TYPE_ELEMENT,
  NODE_TYPE_TEXT,
  parseStaticContent,
} from '@/vue/remote/parser'

describe('vue/remote/parser', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test('parses SVG content with DOMParser and skips unsupported node types', () => {
    const nodes = parseStaticContent('<?pi value?><path d="M1 1"/><!--marker-->tail', 'svg')

    expect(nodes).toEqual([
      {
        type: NODE_TYPE_ELEMENT,
        tag: 'path',
        properties: { d: 'M1 1' },
        children: [],
      },
      {
        type: NODE_TYPE_COMMENT,
        text: 'marker',
      },
      {
        type: NODE_TYPE_TEXT,
        text: 'tail',
      },
    ])
  })

  test('parses MathML content with DOMParser when available', () => {
    const nodes = parseStaticContent('<mi>x</mi>', 'mathml')

    expect(nodes).toEqual([
      {
        type: NODE_TYPE_ELEMENT,
        tag: 'mi',
        properties: {},
        children: [{ type: NODE_TYPE_TEXT, text: 'x' }],
      },
    ])
  })

  test('uses fallback parser when DOMParser is unavailable for XML namespaces', () => {
    vi.stubGlobal('DOMParser', undefined)
    vi.stubGlobal('document', undefined)

    const nodes = parseStaticContent('<Math><mi>x</mi></Math>', 'mathml')

    expect(nodes).toEqual([
      {
        type: NODE_TYPE_ELEMENT,
        tag: 'Math',
        properties: {},
        children: [
          {
            type: NODE_TYPE_ELEMENT,
            tag: 'mi',
            properties: {},
            children: [{ type: NODE_TYPE_TEXT, text: 'x' }],
          },
        ],
      },
    ])
  })

  test('switches namespace to HTML inside foreignObject', () => {
    vi.stubGlobal('DOMParser', undefined)
    vi.stubGlobal('document', undefined)

    const nodes = parseStaticContent('<svg><foreignObject><DIV data-v=1>Body</DIV></foreignObject></svg>', 'svg')
    const div = (nodes[0] as { children: Array<{ children: Array<{ tag: string }> }> }).children[0].children[0]

    expect(div.tag).toBe('div')
  })

  test('supports malformed tags, declarations and unclosed comments in fallback parser', () => {
    vi.stubGlobal('DOMParser', undefined)
    vi.stubGlobal('document', undefined)

    const nodes = parseStaticContent('<!DOCTYPE html><  >ok<!--broken', undefined)

    expect(nodes).toEqual([
      { type: NODE_TYPE_TEXT, text: '<' },
      { type: NODE_TYPE_TEXT, text: '  >ok' },
      { type: NODE_TYPE_TEXT, text: '<!--broken' },
    ])
  })

  test('handles malformed closings, unterminated declarations and math namespace switch in HTML fallback', () => {
    vi.stubGlobal('DOMParser', undefined)
    vi.stubGlobal('document', undefined)

    const nodes = parseStaticContent('<math><mi>x</mi></math></broken<!', undefined)

    expect(nodes).toEqual([
      {
        type: NODE_TYPE_ELEMENT,
        tag: 'math',
        properties: {},
        children: [{
          type: NODE_TYPE_ELEMENT,
          tag: 'mi',
          properties: {},
          children: [{ type: NODE_TYPE_TEXT, text: 'x' }],
        }],
      },
    ])
  })

  test('handles unmatched closing tags and unfinished declarations', () => {
    vi.stubGlobal('DOMParser', undefined)
    vi.stubGlobal('document', undefined)

    expect(parseStaticContent('<div></span></div>', undefined)).toEqual([
      {
        type: NODE_TYPE_ELEMENT,
        tag: 'div',
        properties: {},
        children: [],
      },
    ])

    expect(parseStaticContent('<!', undefined)).toEqual([])
  })

  test('parses attributes (quoted, unquoted, unterminated) and self-closing tags', () => {
    vi.stubGlobal('DOMParser', undefined)
    vi.stubGlobal('document', undefined)

    const nodes = parseStaticContent('<a x="1" y=\'2\' z=3 w="unterminated/>', undefined)

    expect(nodes).toEqual([
      {
        type: NODE_TYPE_ELEMENT,
        tag: 'a',
        properties: {
          x: '1',
          y: '2',
          z: '3',
          w: 'unterminated/>',
        },
        children: [],
      },
    ])
  })

  test('parses self-closing tags and skips malformed attributes in fallback parser', () => {
    vi.stubGlobal('DOMParser', undefined)
    vi.stubGlobal('document', undefined)

    const nodes = parseStaticContent('<div flag   =   1 \"bad\" ok=2/><br/></div>', undefined)

    expect(nodes).toEqual([
      {
        type: NODE_TYPE_ELEMENT,
        tag: 'div',
        properties: {
          flag: '1',
          '"bad"': '',
          ok: '2',
        },
        children: [],
      },
      {
        type: NODE_TYPE_ELEMENT,
        tag: 'br',
        properties: {},
        children: [],
      },
    ])
  })

  test('skips broken attributes when attribute name cannot be parsed', () => {
    vi.stubGlobal('DOMParser', undefined)
    vi.stubGlobal('document', undefined)

    const nodes = parseStaticContent('<div =broken ok=1></div>', undefined)

    expect(nodes).toEqual([
      {
        type: NODE_TYPE_ELEMENT,
        tag: 'div',
        properties: {
          broken: '',
          ok: '1',
        },
        children: [],
      },
    ])
  })

  test('decodes named, numeric and invalid entities', () => {
    vi.stubGlobal('DOMParser', undefined)
    vi.stubGlobal('document', undefined)

    const [node] = parseStaticContent(
      '&amp;&apos;&gt;&lt;&nbsp;&quot;&custom;&#65;&#x41;&#99999999;&#x110000;',
      undefined
    )

    expect(node).toEqual({
      type: NODE_TYPE_TEXT,
      text: '&\'><\u00A0"&custom;AA&#99999999;&#x110000;',
    })
  })

  test('keeps numeric entities when String.fromCodePoint throws', () => {
    vi.stubGlobal('DOMParser', undefined)
    vi.stubGlobal('document', undefined)

    vi.spyOn(String, 'fromCodePoint').mockImplementation(() => {
      throw new Error('boom')
    })

    const [node] = parseStaticContent('&#65;&#x41;', undefined)

    expect(node).toEqual({
      type: NODE_TYPE_TEXT,
      text: '&#65;&#x41;',
    })
  })

  test('normalizes null textContent from DOMParser nodes', () => {
    class FakeDOMParser {
      parseFromString () {
        return {
          documentElement: {
            childNodes: [
              { nodeType: NODE_TYPE_TEXT, textContent: null },
              { nodeType: NODE_TYPE_COMMENT, textContent: null },
            ],
          },
        }
      }
    }

    vi.stubGlobal('DOMParser', FakeDOMParser)

    expect(parseStaticContent('ignored', 'svg')).toEqual([
      { type: NODE_TYPE_TEXT, text: '' },
      { type: NODE_TYPE_COMMENT, text: '' },
    ])
  })
})
