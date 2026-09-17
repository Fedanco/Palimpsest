/**
 * markdown-it plugin that tokenizes TeX math without rendering it.
 *
 * Block:  a line starting with `$$`, closed by a line ending with `$$`
 *         (or `$$ ... $$` on one line).
 * Inline: `$...$` and `$$...$$` following pandoc's rules: the opening
 *         delimiter is not followed by whitespace, the closing one is not
 *         preceded by whitespace nor followed by a digit.
 *
 * Token `content` always holds the raw source *including delimiters*, so
 * it can be written back to the file untouched.
 */
import type { MarkdownIt, StateBlock, StateInline } from 'markdown-it'

const DOLLAR = 0x24

function mathBlock(
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean,
): boolean {
  let pos = state.bMarks[startLine]! + state.tShift[startLine]!
  let max = state.eMarks[startLine]!
  if (state.sCount[startLine]! - state.blkIndent >= 4) return false
  if (
    pos + 2 > max ||
    state.src.charCodeAt(pos) !== DOLLAR ||
    state.src.charCodeAt(pos + 1) !== DOLLAR
  ) {
    return false
  }

  const firstLine = state.src.slice(pos + 2, max)
  let nextLine = startLine
  if (firstLine.includes('$$')) {
    // Either `$$ ... $$` on one line (a block), or an inline formula that
    // happens to start a paragraph (`$$x$$ is the ...`): not ours.
    if (!firstLine.trimEnd().endsWith('$$')) return false
    nextLine = startLine + 1
  } else {
    let found = false
    for (nextLine = startLine + 1; nextLine < endLine; nextLine++) {
      pos = state.bMarks[nextLine]! + state.tShift[nextLine]!
      max = state.eMarks[nextLine]!
      if (state.src.slice(pos, max).trimEnd().endsWith('$$')) {
        found = true
        nextLine++
        break
      }
    }
    if (!found) return false
  }
  if (silent) return true

  const token = state.push('math_block', 'div', 0)
  token.block = true
  token.map = [startLine, nextLine]
  token.content = state.getLines(startLine, nextLine, state.blkIndent, true)
  token.markup = '$$'
  state.line = nextLine
  return true
}

function isWhitespace(code: number): boolean {
  return code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d
}
function isDigit(code: number): boolean {
  return code >= 0x30 && code <= 0x39
}

function mathInline(state: StateInline, silent: boolean): boolean {
  const src = state.src
  const start = state.pos
  if (src.charCodeAt(start) !== DOLLAR) return false

  const delim = src.charCodeAt(start + 1) === DOLLAR ? '$$' : '$'
  const contentStart = start + delim.length
  if (contentStart >= state.posMax || isWhitespace(src.charCodeAt(contentStart))) return false

  let close = src.indexOf(delim, contentStart)
  while (close !== -1 && close + delim.length <= state.posMax) {
    const before = src.charCodeAt(close - 1)
    const after = src.charCodeAt(close + delim.length)
    const escaped = before === 0x5c /* \ */
    if (!escaped && !isWhitespace(before) && !(delim === '$' && isDigit(after))) break
    close = src.indexOf(delim, close + 1)
  }
  if (close === -1 || close + delim.length > state.posMax || close === contentStart) return false

  if (!silent) {
    const token = state.push('math_inline', 'span', 0)
    token.content = src.slice(start, close + delim.length)
    token.markup = delim
  }
  state.pos = close + delim.length
  return true
}

export function mathPlugin(md: MarkdownIt): void {
  md.block.ruler.before('fence', 'math_block', mathBlock, {
    alt: ['paragraph', 'blockquote', 'list'],
  })
  md.inline.ruler.before('escape', 'math_inline', mathInline)
}
