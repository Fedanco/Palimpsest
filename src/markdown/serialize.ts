import type { Mark, Node as PmNode } from '@tiptap/pm/model'
import { MarkdownSerializer } from 'prosemirror-markdown'
import { toEol, type Eol } from './eol.ts'
import type { SourceMeta } from './parse.ts'

// Serialization is synchronous, so one flag is enough to remember that we
// are inside an autolink (`<https://...>`), where text must not be escaped.
let inAutolink = false

/** Serializer for the blocks that were touched. Node names follow Tiptap's schema. */
export const blockSerializer = new MarkdownSerializer(
  {
    paragraph(state, node) {
      state.renderInline(node)
      state.closeBlock(node)
    },
    heading(state, node) {
      state.write('#'.repeat(node.attrs.level) + ' ')
      state.renderInline(node, false)
      state.closeBlock(node)
    },
    blockquote(state, node) {
      state.wrapBlock('> ', null, node, () => state.renderContent(node))
    },
    codeBlock(state, node) {
      const backticks = node.textContent.match(/`{3,}/gm)
      const fence = backticks ? backticks.sort().slice(-1)[0] + '`' : '```'
      state.write(fence + (node.attrs.language || '') + '\n')
      state.text(node.textContent, false)
      state.write('\n')
      state.write(fence)
      state.closeBlock(node)
    },
    bulletList(state, node) {
      const bullet: string = node.attrs.bullet ?? '*'
      state.renderList(node, '  ', () => bullet + ' ')
    },
    orderedList(state, node) {
      const start: number = node.attrs.start ?? 1
      const delimiter: string = node.attrs.delimiter ?? '.'
      const maxW = String(start + node.childCount - 1).length
      const space = ' '.repeat(maxW + 2)
      state.renderList(node, space, (i) => {
        const nStr = String(start + i)
        return ' '.repeat(maxW - nStr.length) + nStr + delimiter + ' '
      })
    },
    listItem(state, node) {
      state.renderContent(node)
    },
    horizontalRule(state, node) {
      state.write('---')
      state.closeBlock(node)
    },
    hardBreak(state, node, parent, index) {
      for (let i = index + 1; i < parent.childCount; i++) {
        if (parent.child(i).type !== node.type) {
          state.write('\\\n')
          return
        }
      }
    },
    rawBlock(state, node) {
      state.text(node.attrs.text, false)
      state.closeBlock(node)
    },
    rawInline(state, node) {
      state.text(node.attrs.text, false)
    },
    text(state, node) {
      state.text(node.text ?? '', !inAutolink)
    },
  },
  {
    italic: { open: '*', close: '*', mixable: true, expelEnclosingWhitespace: true },
    bold: { open: '**', close: '**', mixable: true, expelEnclosingWhitespace: true },
    strike: { open: '~~', close: '~~', mixable: true, expelEnclosingWhitespace: true },
    highlight: { open: '==', close: '==', mixable: true, expelEnclosingWhitespace: true },
    underline: { open: '<u>', close: '</u>', mixable: true, expelEnclosingWhitespace: true },
    link: {
      open(_state, mark, parent, index) {
        inAutolink = isPlainUrl(mark, parent, index)
        return inAutolink ? '<' : '['
      },
      close(_state, mark) {
        const wasAutolink = inAutolink
        inAutolink = false
        if (wasAutolink) return '>'
        const href = String(mark.attrs.href).replace(/[()"]/g, '\\$&')
        const title = mark.attrs.title ? ` "${String(mark.attrs.title).replace(/"/g, '\\"')}"` : ''
        return `](${href}${title})`
      },
      mixable: true,
    },
    code: {
      open(_state, _mark, parent, index) {
        return backticksFor(parent.child(index), -1)
      },
      close(_state, _mark, parent, index) {
        return backticksFor(parent.child(index - 1), 1)
      },
      escape: false,
    },
  },
)

function backticksFor(node: PmNode, side: number): string {
  const ticks = /`+/g
  let len = 0
  if (node.isText) {
    let m: RegExpExecArray | null
    while ((m = ticks.exec(node.text ?? ''))) len = Math.max(len, m[0].length)
  }
  let result = len > 0 && side > 0 ? ' `' : '`'
  for (let i = 0; i < len; i++) result += '`'
  if (len > 0 && side < 0) result += ' '
  return result
}

function isPlainUrl(mark: Mark, parent: PmNode, index: number): boolean {
  if (mark.attrs.title || !/^\w+:/.test(String(mark.attrs.href))) return false
  const content = parent.child(index)
  if (
    !content.isText ||
    content.text !== mark.attrs.href ||
    content.marks[content.marks.length - 1] !== mark
  ) {
    return false
  }
  return index === parent.childCount - 1 || !mark.isInSet(parent.child(index + 1).marks)
}

/** Markdown for one top-level block, LF line endings, no trailing newline. */
export function serializeBlock(node: PmNode): string {
  const wrapper = node.type.schema.topNodeType.create(null, [node])
  return blockSerializer.serialize(wrapper, { tightLists: true })
}

const endsWithBlankLine = (s: string) => /(\r?\n)(\r?\n)$/.test(s)
const endsWithEol = (s: string) => /\r?\n$/.test(s)

/**
 * Writes the document back as Markdown. Blocks that still carry their
 * original `src` are copied verbatim; the others are re-serialized.
 */
export function serializeMarkdown(doc: PmNode, meta: SourceMeta): string {
  const eol: Eol = meta.shape.eol
  let out = meta.prefix
  const count = doc.childCount

  doc.forEach((node, _offset, index) => {
    const last = index === count - 1
    const next = last ? null : doc.child(index + 1)
    const src: string | null = node.attrs.src ?? null

    if (src !== null) {
      if (last) {
        // Whatever followed this block originally, the file now ends here.
        out += src.replace(/(\r?\n)+$/, '') + meta.shape.tail
      } else {
        out += src
        if (next && next.attrs.src == null && !endsWithBlankLine(out)) {
          if (!endsWithEol(out)) out += eol
          out += eol
        }
      }
      return
    }

    out += toEol(serializeBlock(node), eol)
    if (last) {
      out += meta.shape.tail
    } else {
      out += eol + eol
    }
  })

  return (meta.shape.bom ? '﻿' : '') + out
}
