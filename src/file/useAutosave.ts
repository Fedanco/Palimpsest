import type { Editor } from '@tiptap/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { SourceMeta } from '../markdown/index.ts'
import { serializeMarkdown } from '../markdown/index.ts'
import { currentLastModified, requestWritePermission, writeMarkdownFile } from './fsAccess.ts'

export type SaveStatus =
  | { kind: 'clean' }
  | { kind: 'dirty' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: number }
  | { kind: 'no-permission' }
  | { kind: 'conflict' }
  | { kind: 'error'; message: string }

const AUTOSAVE_DELAY_MS = 1500

interface AutosaveOptions {
  editor: Editor | null
  handle: FileSystemFileHandle
  meta: SourceMeta
  /** Modification time of the file when we last read or wrote it. */
  initialLastModified: number
}

/**
 * Writes the document back to disk shortly after every change. `save()`
 * forces an immediate write (Ctrl+S). The file is never overwritten if it
 * changed on disk behind our back: that becomes a `conflict` the reader
 * resolves explicitly.
 */
export function useAutosave({ editor, handle, meta, initialLastModified }: AutosaveOptions) {
  const [status, setStatus] = useState<SaveStatus>({ kind: 'clean' })
  const version = useRef(0)
  const savedVersion = useRef(0)
  const lastModified = useRef(initialLastModified)
  const timer = useRef<number | null>(null)
  const inFlight = useRef<Promise<void> | null>(null)

  const save = useCallback(
    async (opts: { force?: boolean } = {}): Promise<void> => {
      if (!editor) return
      if (timer.current !== null) {
        window.clearTimeout(timer.current)
        timer.current = null
      }
      if (inFlight.current) await inFlight.current
      if (version.current === savedVersion.current) return

      const run = async () => {
        const target = version.current
        setStatus({ kind: 'saving' })
        try {
          if (!opts.force) {
            const onDisk = await currentLastModified(handle)
            if (onDisk !== lastModified.current) {
              setStatus({ kind: 'conflict' })
              return
            }
          }
          const text = serializeMarkdown(editor.state.doc, meta)
          lastModified.current = await writeMarkdownFile(handle, text)
          savedVersion.current = target
          if (version.current === target) setStatus({ kind: 'saved', at: Date.now() })
          else setStatus({ kind: 'dirty' })
        } catch (err) {
          if (err instanceof DOMException && err.name === 'NotAllowedError') {
            setStatus({ kind: 'no-permission' })
          } else {
            setStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) })
          }
        }
      }
      inFlight.current = run()
      try {
        await inFlight.current
      } finally {
        inFlight.current = null
      }
    },
    [editor, handle, meta],
  )

  // Every document change marks the file dirty and (re)starts the timer.
  useEffect(() => {
    if (!editor) return
    const onUpdate = ({ transaction }: { transaction: { docChanged: boolean } }) => {
      if (!transaction.docChanged) return
      version.current += 1
      setStatus((s) =>
        s.kind === 'conflict' || s.kind === 'no-permission' ? s : { kind: 'dirty' },
      )
      if (timer.current !== null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        timer.current = null
        void save()
      }, AUTOSAVE_DELAY_MS)
    }
    editor.on('update', onUpdate)
    return () => {
      editor.off('update', onUpdate)
      if (timer.current !== null) window.clearTimeout(timer.current)
    }
  }, [editor, save])

  // Don't let the tab close with unsaved changes.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (version.current !== savedVersion.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  const grantPermission = useCallback(async () => {
    if (await requestWritePermission(handle)) {
      setStatus({ kind: 'dirty' })
      await save()
    }
  }, [handle, save])

  const overwrite = useCallback(() => save({ force: true }), [save])

  return { status, save, grantPermission, overwrite }
}
