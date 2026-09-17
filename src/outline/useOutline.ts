import type { Editor } from '@tiptap/core'
import { useEffect, useState } from 'react'

export interface OutlineEntry {
  pos: number
  level: number
  text: string
}

/** Headings of the document, refreshed on every change. */
export function useOutline(editor: Editor | null): OutlineEntry[] {
  const [entries, setEntries] = useState<OutlineEntry[]>([])

  useEffect(() => {
    if (!editor) return
    const refresh = () => setEntries(collectHeadings(editor))
    refresh()
    editor.on('update', refresh)
    return () => {
      editor.off('update', refresh)
    }
  }, [editor])

  return entries
}

function collectHeadings(editor: Editor): OutlineEntry[] {
  const out: OutlineEntry[] = []
  editor.state.doc.forEach((node, pos) => {
    if (node.type.name === 'heading') {
      out.push({ pos, level: node.attrs.level, text: node.textContent })
    }
  })
  return out
}

/** Position of the heading currently at the top of the viewport. */
export function useActiveHeading(editor: Editor | null, entries: OutlineEntry[]): number | null {
  const [active, setActive] = useState<number | null>(null)

  useEffect(() => {
    if (!editor || entries.length === 0) return
    const scroller = editor.view.dom.closest('.reader-scroll') ?? document.documentElement
    const update = () => {
      const top = scroller.getBoundingClientRect().top + 8
      let current: number | null = null
      for (const entry of entries) {
        const dom = editor.view.nodeDOM(entry.pos)
        if (!(dom instanceof HTMLElement)) continue
        if (dom.getBoundingClientRect().top <= top + 40) current = entry.pos
        else break
      }
      setActive(current ?? entries[0]?.pos ?? null)
    }
    update()
    scroller.addEventListener('scroll', update, { passive: true })
    return () => scroller.removeEventListener('scroll', update)
  }, [editor, entries])

  return active
}

export function scrollToHeading(editor: Editor, pos: number): void {
  const dom = editor.view.nodeDOM(pos)
  if (dom instanceof HTMLElement) dom.scrollIntoView({ block: 'start', behavior: 'auto' })
}
