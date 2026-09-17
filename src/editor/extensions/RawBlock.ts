import { Node, mergeAttributes } from '@tiptap/core'
import { markdownIt } from '../../markdown/parse.ts'

export type RawBlockKind = 'math' | 'html' | 'table' | 'unknown'

/**
 * A top-level block the Markdown parser could not (or should not) turn into
 * rich content: display math, raw HTML, tables, anything exotic. It is shown
 * as-is, cannot be edited inline, and is written back byte for byte.
 */
export const RawBlock = Node.create({
  name: 'rawBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,
  code: true,

  addAttributes() {
    return {
      kind: { default: 'unknown' as RawBlockKind, rendered: false },
      text: { default: '', rendered: false },
    }
  },

  parseHTML() {
    return [{ tag: 'pre[data-raw-block]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'pre',
      mergeAttributes(HTMLAttributes, { 'data-raw-block': node.attrs.kind, class: 'raw-block' }),
      ['code', {}, node.attrs.text],
    ]
  },

  addNodeView() {
    return ({ node }) => {
      const kind: RawBlockKind = node.attrs.kind
      const text: string = node.attrs.text
      const dom = document.createElement('div')
      dom.className = `raw-block raw-${kind}`
      dom.contentEditable = 'false'
      if (kind === 'table' || kind === 'html') {
        // Tables and HTML read far better rendered than as source. The file
        // is the reader's own, so rendering its HTML is acceptable here.
        dom.innerHTML = markdownIt.render(text)
      } else {
        const pre = document.createElement('pre')
        const code = document.createElement('code')
        code.textContent = text
        pre.appendChild(code)
        dom.appendChild(pre)
      }
      return { dom }
    }
  },
})
