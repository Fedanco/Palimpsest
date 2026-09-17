// Generates fixtures/generated/big-handout.md: a ~200-page handout
// (about 100k words) for measuring parse, render and outline performance.
// Run with: npm run fixture:big
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CHAPTERS = 20
const SECTIONS_PER_CHAPTER = 10
const PARAGRAPHS_PER_SECTION = 6

const words =
  'utility preference budget demand price wealth equilibrium marginal substitution elasticity consumer firm cost revenue profit market welfare surplus tax subsidy'.split(
    ' ',
  )

let seed = 42
function rand(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return seed / 0x7fffffff
}
function sentence(): string {
  const n = 8 + Math.floor(rand() * 12)
  const ws = Array.from({ length: n }, () => words[Math.floor(rand() * words.length)])
  ws[0] = ws[0]![0]!.toUpperCase() + ws[0]!.slice(1)
  return ws.join(' ') + '.'
}
function paragraph(): string {
  return Array.from({ length: 3 + Math.floor(rand() * 4) }, sentence).join(' ')
}

const out: string[] = ['# Big Handout', '', 'Generated file for performance tests.', '']
for (let c = 1; c <= CHAPTERS; c++) {
  out.push(`## Chapter ${c}`, '')
  for (let s = 1; s <= SECTIONS_PER_CHAPTER; s++) {
    out.push(`### ${c}.${s} Section`, '')
    for (let p = 0; p < PARAGRAPHS_PER_SECTION; p++) {
      out.push(paragraph(), '')
      if (p === 2) out.push(`$$ U_{${c}${s}}(x) = \\sum_i \\alpha_i \\log x_i $$`, '')
      if (p === 4) out.push('* first point', '* second point', '* third point', '')
    }
  }
}

const dir = join(import.meta.dirname, '..', 'fixtures', 'generated')
mkdirSync(dir, { recursive: true })
const file = join(dir, 'big-handout.md')
const text = out.join('\n')
writeFileSync(file, text)
console.log(`${file}: ${text.length} chars, ${text.split(/\s+/).length} words`)
