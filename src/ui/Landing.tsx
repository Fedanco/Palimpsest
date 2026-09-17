import { isFileSystemAccessSupported } from '../file/fsAccess.ts'

interface LandingProps {
  onOpen: () => void
  error: string | null
}

export function Landing({ onOpen, error }: LandingProps) {
  const supported = isFileSystemAccessSupported()
  return (
    <main className="landing">
      <h1>Palimpsest</h1>
      <p className="landing-tagline">The document you can rewrite while you read it.</p>
      {supported ? (
        <button type="button" className="landing-open" onClick={onOpen} autoFocus>
          Open a Markdown file
        </button>
      ) : (
        <p className="landing-unsupported">
          Palimpsest reads and writes files on your disk through the File System Access API, which
          this browser does not provide. Please use Chrome or Edge.
        </p>
      )}
      {error && <p className="landing-error">{error}</p>}
      <p className="landing-hint">
        Your file stays on your computer. Untouched paragraphs are written back byte for byte.
      </p>
    </main>
  )
}
