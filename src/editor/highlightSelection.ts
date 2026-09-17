import type { Editor } from '@tiptap/core'

/**
 * Applies or removes the highlight mark on whatever the reader has selected
 * with the mouse. In reading mode the editor is not focused, so we map the
 * browser selection to document positions ourselves.
 */
export function toggleHighlightOnDomSelection(editor: Editor): boolean {
  const range = editorSelectionRange(editor)
  if (!range) return false
  const { from, to } = range
  const type = editor.schema.marks.highlight
  if (!type) return false

  const { doc, tr } = editor.state
  const alreadyHighlighted = doc.rangeHasMark(from, to, type)
  if (alreadyHighlighted) tr.removeMark(from, to, type)
  else tr.addMark(from, to, type.create())
  editor.view.dispatch(tr)
  window.getSelection()?.removeAllRanges()
  return true
}

/** The current browser selection as document positions, if it lies inside the editor. */
export function editorSelectionRange(editor: Editor): { from: number; to: number } | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null
  const range = sel.getRangeAt(0)
  const dom = editor.view.dom
  if (!dom.contains(range.startContainer) || !dom.contains(range.endContainer)) return null
  try {
    const from = editor.view.posAtDOM(range.startContainer, range.startOffset)
    const to = editor.view.posAtDOM(range.endContainer, range.endOffset)
    if (from === to) return null
    return { from: Math.min(from, to), to: Math.max(from, to) }
  } catch {
    return null
  }
}
