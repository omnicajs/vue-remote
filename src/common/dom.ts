const HTMLTagList: string[] = [
  'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base', 'bdi', 'bdo',
  'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'cite', 'code', 'col', 'colgroup',
  'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'em', 'embed', 'fieldset',
  'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header',
  'hgroup', 'hr', 'html', 'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'keygen', 'label', 'legend',
  'li', 'link', 'main', 'map', 'mark', 'menu', 'menuitem', 'meta', 'meter', 'nav', 'noscript',
  'object', 'ol', 'optgroup', 'option', 'output', 'p', 'param', 'picture', 'pre', 'progress',
  'q', 'rp', 'rt', 'ruby', 's', 'samp', 'script', 'section', 'select', 'small', 'source', 'span',
  'strong', 'style', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'textarea', 'tfoot', 'th',
  'thead', 'time', 'title', 'tr', 'track', 'u', 'ul', 'var', 'video', 'wbr',
]

const MathMLTagList: string[] = [
  'math', 'maction', 'maligngroup', 'malignmark', 'menclose', 'merror',
  'mfenced', 'mfrac', 'mglyph', 'mi', 'mlabeledtr', 'mlongdiv', 'mmultiscripts',
  'mn', 'mo', 'mover', 'mpadded', 'mphantom', 'mroot', 'mrow', 'ms', 'mscarries',
  'mscarry', 'msgroup', 'msline', 'mstack', 'mspace', 'msqrt', 'msrow',
  'mstyle', 'msub', 'msup', 'msubsup', 'mtable', 'mtd', 'mtext', 'mtr', 'munder',
  'munderover', 'none', 'semantics', 'annotation', 'annotation-xml',
]

const SVGTagList: string[] = [
  'a', 'altGlyph', 'altGlyphDef', 'altGlyphItem', 'animate', 'animateColor',
  'animateMotion', 'animateTransform', 'circle', 'clipPath', 'color-profile',
  'cursor', 'defs', 'desc', 'discard', 'ellipse', 'feBlend',
  'feColorMatrix', 'feComponentTransfer', 'feComposite', 'feConvolveMatrix',
  'feDiffuseLighting', 'feDisplacementMap', 'feDistantLight', 'feDropShadow',
  'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR', 'feGaussianBlur',
  'feImage', 'feMerge', 'feMergeNode', 'feMorphology', 'feOffset',
  'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile', 'feTurbulence',
  'filter', 'font', 'font-face', 'font-face-format', 'font-face-name',
  'font-face-src', 'font-face-uri', 'foreignObject', 'g', 'glyph', 'glyphRef',
  'hkern', 'image', 'line', 'linearGradient', 'marker', 'mask', 'metadata',
  'missing-glyph', 'mpath', 'path', 'pattern', 'polygon', 'polyline',
  'radialGradient', 'rect', 'script', 'set', 'stop', 'style', 'svg', 'switch',
  'symbol', 'text', 'textPath', 'title', 'tref', 'tspan', 'use', 'view', 'vkern',
]

const isHTMLElement = (tag: string) => HTMLTagList.includes(tag)
const isMathMLElement = (tag: string) => MathMLTagList.includes(tag)
const isSVGElement = (tag: string) => SVGTagList.includes(tag)

const isElement = (tag: string) => isHTMLElement(tag) ||
  isMathMLElement(tag) ||
  isSVGElement(tag)

export {
  HTMLTagList,
  MathMLTagList,
  SVGTagList,
  isElement,
  isHTMLElement,
  isMathMLElement,
  isSVGElement,
}