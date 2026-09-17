import { EditorContent, useEditor } from '@tiptap/react'
import { useEffect, useMemo, useState } from 'react'
import { extensions, schema } from '../editor/extensions.ts'
import { toggleHighlightOnDomSelection } from '../editor/highlightSelection.ts'
import type { OpenedFile } from '../file/fsAccess.ts'
import { useAutosave } from '../file/useAutosave.ts'
import { parseMarkdown } from '../markdown/index.ts'
import { Outline } from '../outline/Outline.tsx'
import { StatusBar } from './StatusBar.tsx'

interface ReaderProps {
  file: OpenedFile
  onOpenAnother: () => void
  onReload: () => void
}

/** One open file: reading view, outline, highlighter, inline editing, autosave. */
export function Reader({ file, onOpenAnother, onReload }: ReaderProps) {
  const parsed = useMemo(() => parseMarkdown(file.text, schema), [file.text])
  const [editing, setEditing] = useState(false)

  const editor = useEditor(
    {
      extensions,
      content: parsed.doc.toJSON(),
      editable: false,
      editorProps: { attributes: { class: 'reading', spellcheck: 'false' } },
      onCreate: ({ editor }) => setEditing(editor.isEditable),
      onUpdate: ({ editor }) => setEditing(editor.isEditable),
      // Fires on setEditable too: Tiptap emits a transaction for it.
      onTransaction: ({ editor }) => setEditing(editor.isEditable),
    },
    [parsed],
  )

  const { status, save, grantPermission, overwrite } = useAutosave({
    editor,
    handle: file.handle,
    meta: parsed.meta,
    initialLastModified: file.lastModified,
  })

  // Reading-mode keys: H highlights, Ctrl+Z/Y undo/redo, Ctrl+S saves.
  useEffect(() => {
    if (!editor) return
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void save()
        return
      }
      if (editor.isEditable) return // the editor's own keymap handles the rest
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return

      if (!mod && !e.altKey && e.key.toLowerCase() === 'h') {
        if (toggleHighlightOnDomSelection(editor)) e.preventDefault()
        return
      }
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) editor.commands.redo()
        else editor.commands.undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        editor.commands.redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editor, save])

  return (
    <div className={`reader${editing ? ' is-editing' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-title">{file.name}</div>
        <Outline editor={editor} />
      </aside>
      <div className="reader-scroll">
        <article className="page">
          <EditorContent editor={editor} />
        </article>
      </div>
      <StatusBar
        fileName={file.name}
        editing={editing}
        status={status}
        onOpenAnother={onOpenAnother}
        onGrantPermission={() => void grantPermission()}
        onOverwrite={() => void overwrite()}
        onReload={onReload}
      />
    </div>
  )
}
