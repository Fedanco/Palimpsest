import { describe, expect, it } from 'vitest'
import { detectShape, splitLinesKeepEol, stripBom, toEol } from './eol.ts'

describe('detectShape', () => {
  it('detects LF, no BOM, final newline', () => {
    expect(detectShape('a\nb\n')).toEqual({ bom: false, eol: '\n', tail: '\n' })
  })
  it('detects CRLF and missing final newline', () => {
    expect(detectShape('a\r\nb')).toEqual({ bom: false, eol: '\r\n', tail: '' })
  })
  it('keeps trailing blank lines in the tail', () => {
    expect(detectShape('a\r\nb\r\n\r\n').tail).toBe('\r\n\r\n')
  })
  it('detects BOM', () => {
    expect(detectShape('﻿a\n')).toEqual({ bom: true, eol: '\n', tail: '\n' })
  })
  it('picks the dominant EOL in mixed files', () => {
    expect(detectShape('a\r\nb\r\nc\n').eol).toBe('\r\n')
    expect(detectShape('a\nb\nc\r\n').eol).toBe('\n')
  })
})

describe('splitLinesKeepEol', () => {
  it('round-trips by concatenation', () => {
    for (const t of ['', 'a', 'a\n', 'a\r\nb', 'a\r\nb\r\n', '\n\n', 'x\n\r\ny']) {
      expect(splitLinesKeepEol(t).join('')).toBe(t)
    }
  })
  it('keeps terminators attached to their line', () => {
    expect(splitLinesKeepEol('a\r\nb\nc')).toEqual(['a\r\n', 'b\n', 'c'])
  })
})

it('stripBom / toEol', () => {
  expect(stripBom('﻿x')).toBe('x')
  expect(stripBom('x')).toBe('x')
  expect(toEol('a\nb\n', '\r\n')).toBe('a\r\nb\r\n')
  expect(toEol('a\nb\n', '\n')).toBe('a\nb\n')
})
