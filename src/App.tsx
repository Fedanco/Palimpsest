import { useCallback, useEffect, useState } from 'react'
import { openDemoFile } from './file/demoFile.ts'
import { openMarkdownFile, type OpenedFile } from './file/fsAccess.ts'
import { Landing } from './ui/Landing.tsx'
import { Reader } from './ui/Reader.tsx'

export function App() {
  const [file, setFile] = useState<OpenedFile | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Bumped to remount the reader for the same file (reload from disk).
  const [generation, setGeneration] = useState(0)

  const open = useCallback(async () => {
    try {
      const opened = await openMarkdownFile()
      if (opened) {
        setError(null)
        setFile(opened)
        setGeneration((g) => g + 1)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  // Dev only: `?demo=<fixture>` skips the native picker (see file/demoFile.ts).
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const demo = new URLSearchParams(window.location.search).get('demo')
    if (!demo) return
    openDemoFile(demo)
      .then((opened) => {
        setFile(opened)
        setGeneration((g) => g + 1)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  const reload = useCallback(async () => {
    if (!file) return
    const f = await file.handle.getFile()
    setFile({
      handle: file.handle,
      name: f.name,
      text: await f.text(),
      lastModified: f.lastModified,
    })
    setGeneration((g) => g + 1)
  }, [file])

  if (!file) return <Landing onOpen={() => void open()} error={error} />
  return (
    <Reader
      key={`${file.name}-${generation}`}
      file={file}
      onOpenAnother={() => void open()}
      onReload={() => void reload()}
    />
  )
}
