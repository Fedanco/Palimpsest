/**
 * Byte-level properties of a Markdown file that must survive a round-trip
 * untouched: byte order mark, dominant line ending, final newline.
 */

export type Eol = '\n' | '\r\n'

export interface TextShape {
  /** True when the file starts with a UTF-8 BOM (U+FEFF). */
  bom: boolean
  /** Dominant line ending, used for blocks we have to re-serialize. */
  eol: Eol
  /** The run of line endings the file ends with ("" when there is none). */
  tail: string
}

const BOM = '﻿'

export function detectShape(text: string): TextShape {
  const bom = text.startsWith(BOM)
  const body = bom ? text.slice(1) : text
  const crlf = (body.match(/\r\n/g) ?? []).length
  const lf = (body.match(/(?<!\r)\n/g) ?? []).length
  return {
    bom,
    eol: crlf > lf ? '\r\n' : '\n',
    tail: /(\r?\n)+$/.exec(body)?.[0] ?? '',
  }
}

/** Strips the BOM, if present. Line endings are left alone. */
export function stripBom(text: string): string {
  return text.startsWith(BOM) ? text.slice(1) : text
}

/**
 * Splits text into lines, each one keeping its own terminator
 * ("\n", "\r\n", or nothing for the last line). Concatenating the result
 * gives back the input byte for byte.
 */
export function splitLinesKeepEol(text: string): string[] {
  const lines: string[] = []
  let start = 0
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') {
      lines.push(text.slice(start, i + 1))
      start = i + 1
    }
  }
  if (start < text.length) lines.push(text.slice(start))
  return lines
}

/** Converts LF-only text (what serializers produce) to the document's EOL. */
export function toEol(text: string, eol: Eol): string {
  return eol === '\n' ? text : text.replace(/\n/g, eol)
}
