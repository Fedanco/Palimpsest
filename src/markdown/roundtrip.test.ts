import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { history, undo } from '@tiptap/pm/history'
import { EditorState, TextSelection } from '@tiptap/pm/state'
import { describe, expect, it } from 'vitest'
import { schema } from '../editor/extensions.ts'
import { createSourceTrackingPlugin } from '../editor/extensions/SourceTracking.ts'
import { parseMarkdown, serializeMarkdown } from './index.ts'

const fixturesDir = join(import.meta.dirname, '..', '..', 'fixtures')
const read = (name: string) => readFileSync(join(fixturesDir, name), 'utf8')

function stateFor(text: string) {
  const { doc, meta } = parseMarkdown(text, schema)
  const state = EditorState.create({ doc, plugins: [createSourceTrackingPlugin(), history()] })
  return { state, meta }
}

/** Lines that differ between two texts (LF-normalized), for readable assertions. */
function changedLines(before: string, after: string): { removed: string[]; added: string[] } {
  const a = before.split(/\r?\n/)
  const b = after.split(/\r?\n/)
  const setA = new Set(a)
  const setB = new Set(b)
  return { removed: a.filter((l) => !setB.has(l)), added: b.filter((l) => !setA.has(l)) }
}

describe('untouched round-trip is byte-identical', () => {
  for (const name of ['marker-like.md', 'bom-lf.md', 'no-final-newline.md']) {
    it(name, () => {
      const text = read(name)
      const { doc, meta } = parseMarkdown(text, schema)
      expect(serializeMarkdown(doc, meta)).toBe(text)
    })
  }

  it('generated big handout (if present)', () => {
    const file = join(fixturesDir, 'generated', 'big-handout.md')
    if (!existsSync(file)) return
    const text = readFileSync(file, 'utf8')
    const t0 = performance.now()
    const { doc, meta } = parseMarkdown(text, schema)
    const t1 = performance.now()
    const out = serializeMarkdown(doc, meta)
    const t2 = performance.now()
    console.log(
      `big-handout: ${text.length} chars, ${doc.childCount} blocks, parse ${(t1 - t0).toFixed(0)} ms, serialize ${(t2 - t1).toFixed(0)} ms`,
    )
    expect(out).toBe(text)
    expect(t1 - t0).toBeLessThan(3000)
  })

  it('handles odd shapes: empty file, only blank lines, leading blank lines', () => {
    for (const text of ['', '\n', '\n\n\n', '\n\n# Title\n', 'plain', '\r\n\r\ntext\r\n\r\n']) {
      const { doc, meta } = parseMarkdown(text, schema)
      expect(serializeMarkdown(doc, meta)).toBe(text)
    }
  })
})

describe('what the parser understands', () => {
  it('keeps math, html and tables as raw nodes', () => {
    const { doc } = parseMarkdown(read('marker-like.md'), schema)
    const kinds: string[] = []
    doc.forEach((n) => {
      if (n.type.name === 'rawBlock') kinds.push(n.attrs.kind)
    })
    // `<span id=...></span>` on its own line is inline HTML inside a paragraph, not an html_block.
    expect(kinds).toEqual(['math', 'math', 'table', 'html'])

    const inlineKinds = new Set<string>()
    doc.descendants((n) => {
      if (n.type.name === 'rawInline') inlineKinds.add(n.attrs.kind)
    })
    expect([...inlineKinds].sort()).toEqual(['html', 'image', 'math'])
  })

  it('maps inline formatting and highlights to marks', () => {
    const { doc } = parseMarkdown('a **b** *c* `d` ==e== ~~f~~ [g](h)\n', schema)
    const marks: string[] = []
    doc.descendants((n) => {
      if (n.isText) marks.push(n.marks.map((m) => m.type.name).join('+') || '-')
    })
    expect(marks).toEqual([
      '-',
      'bold',
      '-',
      'italic',
      '-',
      'code',
      '-',
      'highlight',
      '-',
      'strike',
      '-',
      'link',
    ])
  })

  it('does not swallow a paragraph that starts with inline $$', () => {
    const { doc } = parseMarkdown('$$x$$ is a formula\nand $$y$$ too\n', schema)
    expect(doc.childCount).toBe(1)
    expect(doc.child(0).type.name).toBe('paragraph')
  })
})

describe('editing rewrites only the touched block', () => {
  it('fixing a typo in one paragraph leaves every other byte alone', () => {
    const text = read('marker-like.md')
    const { state, meta } = stateFor(text)

    // Find "Some assumptions we make throughout:" and change "make" → "keep".
    let target = -1
    state.doc.descendants((n, pos) => {
      if (n.isText && n.text?.includes('assumptions we make')) target = pos + n.text.indexOf('make')
    })
    expect(target).toBeGreaterThan(0)
    const edited = state.apply(state.tr.insertText('keep', target, target + 4))
    const out = serializeMarkdown(edited.doc, meta)

    const { removed, added } = changedLines(text, out)
    expect(removed).toEqual(['Some assumptions we make throughout:'])
    expect(added).toEqual(['Some assumptions we keep throughout:'])
    expect(out.includes('\r\n')).toBe(true)
  })

  it('highlighting a phrase adds ==...== and nothing else', () => {
    const text = read('marker-like.md')
    const { state, meta } = stateFor(text)
    let from = -1
    state.doc.descendants((n, pos) => {
      if (n.isText && n.text?.includes('local non-satiation')) from = pos + n.text.indexOf('local')
    })
    const to = from + 'local non-satiation'.length
    const highlight = schema.marks.highlight!
    const edited = state.apply(state.tr.addMark(from, to, highlight.create()))
    const out = serializeMarkdown(edited.doc, meta)

    const { removed, added } = changedLines(text, out)
    expect(removed).toEqual(['* local non-satiation.'])
    expect(added).toEqual(['* ==local non-satiation==.'])
  })

  it('undo restores the original bytes', () => {
    const text = read('marker-like.md')
    const { state, meta } = stateFor(text)
    const edited = state.apply(state.tr.insertText('XYZ', 3))
    expect(serializeMarkdown(edited.doc, meta)).not.toBe(text)

    let undone = edited
    undo(edited, (tr) => {
      undone = edited.apply(tr)
    })
    expect(serializeMarkdown(undone.doc, meta)).toBe(text)
  })

  it('splitting a paragraph with Enter dirties both halves only', () => {
    const text = 'first\n\nsecond paragraph here\n\nthird\n'
    const { state, meta } = stateFor(text)
    // Enter right after "second ", then delete the dangling space, as a user would.
    const pos = 1 + 'first'.length + 2 + 'second '.length
    const tr = state.tr.setSelection(TextSelection.create(state.doc, pos)).split(pos)
    tr.delete(pos - 1, pos)
    const edited = state.apply(tr)
    expect(serializeMarkdown(edited.doc, meta)).toBe('first\n\nsecond\n\nparagraph here\n\nthird\n')
  })

  it('deleting a whole block keeps its neighbours verbatim', () => {
    const text = 'first  \n\n\n* keep   me\n\n\nthird\n'
    const { state, meta } = stateFor(text)
    const second = state.doc.child(1)
    const from = state.doc.child(0).nodeSize
    const edited = state.apply(state.tr.delete(from, from + second.nodeSize))
    expect(serializeMarkdown(edited.doc, meta)).toBe('first  \n\n\nthird\n')
  })

  it('appending a new block after the last one', () => {
    const text = '# Title\n\nlast line'
    const { state, meta } = stateFor(text)
    const para = schema.nodes.paragraph!.create(null, schema.text('new'))
    const edited = state.apply(state.tr.insert(state.doc.content.size, para))
    expect(serializeMarkdown(edited.doc, meta)).toBe('# Title\n\nlast line\n\nnew')
  })
})

describe('serializer quality on touched blocks (review the snapshot by eye)', () => {
  it('re-serializing every block of the marker-like fixture', async () => {
    const text = read('marker-like.md')
    const { doc, meta } = parseMarkdown(text, schema)
    const dirty = doc.type.create(
      null,
      doc.children.map((n) => n.type.create({ ...n.attrs, src: null }, n.content, n.marks)),
    )
    const out = serializeMarkdown(dirty, meta).replace(/\r\n/g, '\n')
    await expect(out).toMatchFileSnapshot('./__snapshots__/marker-like.all-dirty.md')
  })
})
