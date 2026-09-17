import { Extension } from '@tiptap/core'
import type { Node as PmNode } from '@tiptap/pm/model'
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state'
import {
  AddMarkStep,
  AddNodeMarkStep,
  AttrStep,
  RemoveMarkStep,
  RemoveNodeMarkStep,
  ReplaceAroundStep,
  ReplaceStep,
  type Step,
} from '@tiptap/pm/transform'

/** Top-level node types that can carry their original Markdown source. */
export const SOURCE_BLOCK_TYPES = [
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'codeBlock',
  'blockquote',
  'horizontalRule',
  'rawBlock',
]

export const sourceTrackingKey = new PluginKey('sourceTracking')

/**
 * Every top-level block remembers the exact slice of the file it came from
 * (`src`). Any transaction that touches a block clears its `src`, so the
 * serializer knows it has to rewrite that block and only that block.
 * Undo/redo restore the previous document, `src` included, so they are
 * left alone.
 */
export const SourceTracking = Extension.create({
  name: 'sourceTracking',

  addGlobalAttributes() {
    return [
      {
        types: SOURCE_BLOCK_TYPES,
        attributes: {
          src: { default: null, rendered: false, keepOnSplit: false },
        },
      },
      {
        types: ['bulletList', 'orderedList'],
        attributes: {
          // Markdown "tight" lists (no blank line between items).
          tight: { default: true, rendered: false },
        },
      },
      {
        types: ['bulletList'],
        attributes: {
          // The marker used in the file: `*`, `-` or `+`.
          bullet: { default: '*', rendered: false },
        },
      },
      {
        types: ['orderedList'],
        attributes: {
          // `1.` or `1)`.
          delimiter: { default: '.', rendered: false },
        },
      },
    ]
  },

  addProseMirrorPlugins() {
    return [createSourceTrackingPlugin()]
  },
})

/** The ProseMirror plugin behind the extension, usable headlessly in tests. */
export function createSourceTrackingPlugin(): Plugin {
  return new Plugin({
    key: sourceTrackingKey,
    appendTransaction(transactions, _oldState, newState) {
      const positions = new Set<number>()
      for (const range of touchedRanges(transactions)) {
        for (const pos of blocksTouchedBy(newState.doc, range)) positions.add(pos)
      }
      if (positions.size === 0) return null

      let tr: Transaction | null = null
      for (const pos of positions) {
        const node = newState.doc.nodeAt(pos)
        if (!node || !('src' in node.attrs) || node.attrs.src === null) continue
        tr ??= newState.tr
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: null })
      }
      // The appended transaction joins the same undo event as the edit
      // (prosemirror-history groups "appendedTransaction" metas), so undo
      // brings `src` back together with the content.
      return tr
    },
  })
}

interface TouchedRange {
  from: number
  to: number
  /**
   * True when the original range started and ended between top-level
   * blocks, i.e. whole blocks were inserted or removed and no surviving
   * block had its content changed.
   */
  clean: boolean
}

/** Ranges (in the final document) affected by the given transactions. */
export function touchedRanges(transactions: readonly Transaction[]): TouchedRange[] {
  const out: TouchedRange[] = []
  transactions.forEach((tr, t) => {
    if (!tr.docChanged || tr.getMeta('history$')) return
    const laterTrs = transactions.slice(t + 1).map((later) => later.mapping)
    tr.steps.forEach((step, i) => {
      const range = stepRange(step, tr.docs[i]!)
      if (!range) return
      const map = step.getMap()
      let from = map.map(range.from, -1)
      let to = map.map(range.to, 1)
      const rest = tr.mapping.slice(i + 1)
      from = rest.map(from, -1)
      to = rest.map(to, 1)
      for (const m of laterTrs) {
        from = m.map(from, -1)
        to = m.map(to, 1)
      }
      out.push({ from, to, clean: range.clean })
    })
  })
  return out
}

function stepRange(step: Step, docBefore: PmNode): TouchedRange | null {
  if (step instanceof ReplaceStep || step instanceof ReplaceAroundStep) {
    const $from = docBefore.resolve(step.from)
    const $to = docBefore.resolve(step.to)
    return { from: step.from, to: step.to, clean: $from.depth === 0 && $to.depth === 0 }
  }
  if (step instanceof AddMarkStep || step instanceof RemoveMarkStep) {
    return { from: step.from, to: step.to, clean: false }
  }
  if (
    step instanceof AttrStep ||
    step instanceof AddNodeMarkStep ||
    step instanceof RemoveNodeMarkStep
  ) {
    // Attribute changes on a top-level block (including our own `src`
    // reset) never require re-serialization of neighbours.
    return { from: step.pos, to: step.pos, clean: docBefore.resolve(step.pos).depth === 0 }
  }
  return null
}

/** Positions of the top-level blocks of `doc` that the range touches. */
export function blocksTouchedBy(doc: PmNode, range: TouchedRange): number[] {
  const hits: number[] = []
  doc.forEach((node, offset) => {
    const start = offset
    const end = offset + node.nodeSize
    const overlaps = range.clean
      ? start < range.to && end > range.from
      : start <= range.to && end >= range.from
    if (overlaps) hits.push(start)
  })
  return hits
}
