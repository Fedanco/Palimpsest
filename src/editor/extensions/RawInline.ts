import { Node, mergeAttributes } from '@tiptap/core'

export type RawInlineKind = 'math' | 'html' | 'image'

/**
 * Inline content kept as opaque source text: `$formula$`, inline HTML,
 * images. Serialized verbatim, never escaped.
 */
export const RawInline = Node.create({
  name: 'rawInline',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  code: true,

  addAttributes() {
    return {
      kind: { default: 'math' as RawInlineKind, rendered: false },
      text: { default: '', rendered: false },
    }
  },

  parseHTML() {
    return [{ tag: 'code[data-raw-inline]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'code',
      mergeAttributes(HTMLAttributes, { 'data-raw-inline': node.attrs.kind, class: 'raw-inline' }),
      node.attrs.text,
    ]
  },
})
