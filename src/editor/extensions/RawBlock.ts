import { Node, mergeAttributes } from '@tiptap/core'

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
})
