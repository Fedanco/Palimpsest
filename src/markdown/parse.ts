import type { Node as PmNode, Schema } from '@tiptap/pm/model'
import MarkdownIt from 'markdown-it'
import type { MarkdownIt as MarkdownItInstance, Token } from 'markdown-it'
import markdownItMark from 'markdown-it-mark'
import { MarkdownParser, type ParseSpec } from 'prosemirror-markdown'
import { detectShape, splitLinesKeepEol, stripBom, type TextShape } from './eol.ts'
import { mathPlugin } from './mathPlugin.ts'

/** Everything needed to write the document back to disk. */
export interface SourceMeta {
  shape: TextShape
  /** Text before the first block (usually empty or blank lines). */
  prefix: string
}

export interface ParsedDocument {
  doc: PmNode
  meta: SourceMeta
}

/** Shared markdown-it instance. `typographer` must stay off: it rewrites text. */
export const markdownIt = new MarkdownIt('default', {
  html: true,
  linkify: false,
  typographer: false,
})
  .use(markdownItMark)
  .use(mathPlugin)

function listIsTight(tokens: readonly Token[], i: number): boolean {
  for (let j = i + 1; j < tokens.length; j++) {
    const tok = tokens[j]!
    if (tok.type === 'bullet_list_close' || tok.type === 'ordered_list_close') return true
    if (tok.type === 'paragraph_open' && !tok.hidden) return false
  }
  return true
}

function trimEnd(s: string): string {
  return s.replace(/\n+$/, '')
}

/** markdown-it token → Tiptap node/mark. Anything missing here makes the block raw. */
const tokenSpec: Record<string, ParseSpec> = {
  paragraph: { block: 'paragraph' },
  heading: { block: 'heading', getAttrs: (tok) => ({ level: Number(tok.tag.slice(1)) }) },
  blockquote: { block: 'blockquote' },
  bullet_list: {
    block: 'bulletList',
    getAttrs: (tok, tokens, i) => ({ tight: listIsTight(tokens, i), bullet: tok.markup || '*' }),
  },
  ordered_list: {
    block: 'orderedList',
    getAttrs: (tok, tokens, i) => ({
      start: Number(tok.attrGet('start') ?? 1),
      tight: listIsTight(tokens, i),
      delimiter: tok.markup || '.',
    }),
  },
  list_item: { block: 'listItem' },
  fence: {
    block: 'codeBlock',
    getAttrs: (tok) => ({ language: tok.info.trim() || null }),
    noCloseToken: true,
  },
  code_block: { block: 'codeBlock', noCloseToken: true },
  hr: { node: 'horizontalRule' },
  hardbreak: { node: 'hardBreak' },
  math_block: {
    node: 'rawBlock',
    getAttrs: (tok) => ({ kind: 'math', text: trimEnd(tok.content) }),
  },
  html_block: {
    node: 'rawBlock',
    getAttrs: (tok) => ({ kind: 'html', text: trimEnd(tok.content) }),
  },
  math_inline: { node: 'rawInline', getAttrs: (tok) => ({ kind: 'math', text: tok.content }) },
  html_inline: { node: 'rawInline', getAttrs: (tok) => ({ kind: 'html', text: tok.content }) },
  image: {
    node: 'rawInline',
    getAttrs: (tok) => {
      const title = tok.attrGet('title')
      const text = `![${tok.content}](${tok.attrGet('src') ?? ''}${title ? ` "${title}"` : ''})`
      return { kind: 'image', text }
    },
  },
  em: { mark: 'italic' },
  strong: { mark: 'bold' },
  s: { mark: 'strike' },
  mark: { mark: 'highlight' },
  code_inline: { mark: 'code', noCloseToken: true },
  link: {
    mark: 'link',
    getAttrs: (tok) => ({ href: tok.attrGet('href'), title: tok.attrGet('title') }),
  },
}

/** One top-level Markdown block: its tokens and the line it starts on. */
interface BlockTokens {
  tokens: Token[]
  startLine: number
}

function groupTopLevel(tokens: Token[]): BlockTokens[] {
  const groups: BlockTokens[] = []
  let i = 0
  while (i < tokens.length) {
    const open = tokens[i]!
    let j = i
    if (open.nesting === 1) {
      while (j < tokens.length && !(tokens[j]!.level === 0 && tokens[j]!.nesting === -1)) j++
    }
    const startLine = open.map?.[0]
    if (startLine === undefined) throw new Error(`Top-level token ${open.type} has no source map`)
    groups.push({ tokens: tokens.slice(i, j + 1), startLine })
    i = j + 1
  }
  return groups
}

/**
 * Parses a Markdown file into a ProseMirror document whose top-level nodes
 * each carry the exact source they came from (`src` attribute, including
 * the blank lines that follow the block).
 */
export function parseMarkdown(text: string, schema: Schema): ParsedDocument {
  const shape = detectShape(text)
  const body = stripBom(text)
  const lines = splitLinesKeepEol(body)
  const tokens = markdownIt.parse(body.replace(/\r\n/g, '\n'), {})
  const groups = groupTopLevel(tokens)

  // prosemirror-markdown only uses the tokenizer through `.parse(text)`.
  // Feeding it pre-tokenized blocks lets us parse one block at a time and
  // fall back to a raw block when a token has no mapping.
  let current: Token[] = []
  const parser = new MarkdownParser(
    schema,
    { parse: () => current } as unknown as MarkdownItInstance,
    tokenSpec,
  )

  const blocks: PmNode[] = []
  let prefix = lines.slice(0, groups[0]?.startLine ?? 0).join('')
  if (groups.length === 0) {
    // A file with no blocks (empty, or blank lines only) still needs one
    // paragraph to be a valid document. Giving it the whole text as `src`
    // keeps it "intact", so saving writes the file back unchanged.
    prefix = ''
    blocks.push(schema.nodes.paragraph!.create({ src: body }))
  }
  groups.forEach((group, k) => {
    const endLine = groups[k + 1]?.startLine ?? lines.length
    const src = lines.slice(group.startLine, endLine).join('')
    let node: PmNode
    try {
      current = group.tokens
      const parsed = parser.parse('')
      if (parsed.childCount !== 1) throw new Error('block produced no node')
      node = parsed.child(0)
    } catch {
      const kind = group.tokens[0]!.type === 'table_open' ? 'table' : 'unknown'
      node = schema.nodes.rawBlock!.create({
        kind,
        text: trimEnd(src.replace(/\r\n/g, '\n')),
      })
    }
    blocks.push(node.type.create({ ...node.attrs, src }, node.content, node.marks))
  })

  const doc = schema.topNodeType.createAndFill(null, blocks)
  if (!doc) throw new Error('could not build document')
  return { doc, meta: { shape, prefix } }
}
