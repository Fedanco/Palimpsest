import type { Editor } from '@tiptap/core'
import { scrollToHeading, useActiveHeading, useOutline } from './useOutline.ts'

export function Outline({ editor }: { editor: Editor | null }) {
  const entries = useOutline(editor)
  const active = useActiveHeading(editor, entries)

  if (!editor) return null
  if (entries.length === 0) {
    return (
      <nav className="outline">
        <p className="outline-empty">No headings</p>
      </nav>
    )
  }

  return (
    <nav className="outline" aria-label="Table of contents">
      <ul>
        {entries.map((entry) => (
          <li
            key={entry.pos}
            className={`outline-item level-${entry.level}${entry.pos === active ? ' is-active' : ''}`}
          >
            <button type="button" onClick={() => scrollToHeading(editor, entry.pos)}>
              {entry.text || '(untitled)'}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
