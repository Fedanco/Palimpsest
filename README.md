# Palimpsest

**The document you can rewrite while you read it.**

A web-based reader for Markdown study material — highlight it, navigate it, and fix it when it's wrong.

---

## Why

Students read on PDFs. PDFs are frozen: when a sentence in your course handout is factually wrong, the best you can do is scribble over it.

More and more study material now lives as Markdown, because that's what we convert PDFs into before feeding them to an LLM. But every Markdown tool out there is built for *writing*, not for *studying* — you get an editor pane and a preview pane, not a book you can read with a highlighter in your hand.

Palimpsest is the missing piece: the reading experience of a PDF viewer, on top of a document that stays editable. See an error, double-click, correct it, keep reading.

A palimpsest is a manuscript that was scraped clean and written over again. That's the idea.

## Status

Alpha. Every v0.1 feature below is implemented and covered by tests; what is missing is real use. Next: three days of studying on it, then KaTeX.

## Run it

```
npm install
npm run dev        # http://localhost:5173 — Chrome or Edge
npm test           # round-trip tests on the fixtures
npm run fixture:big && open http://localhost:5173/?demo=generated/big-handout.md
```

`?demo=<file under fixtures/>` loads a fixture without the native file picker and keeps saves in memory (development builds only). Real study material goes in `fixtures/private/`, which git ignores.

## Scope — v0.1

The bar for v0.1 is one thing only: **it has to be good enough to study one full exam on.** Not a demo — actual use.

- [x] **Open a local `.md` file and save back over it** — no accounts, no cloud, no upload. Uses the File System Access API (Chrome / Edge).
- [x] **Reading view** — properly rendered Markdown, sane measure, readable typography. This is the main screen.
- [x] **Highlighter** — select text, press `H`, it turns yellow. Single colour. Persisted in the file itself as `==text==`.
- [x] **Inline editing** — double-click a paragraph to edit it in place, `Esc` to go back to reading. No mode switch, no split pane. This is the feature the whole project exists for; it has to feel instant.
- [x] **Auto-generated outline** — clickable table of contents built from the headings, for moving around a 200-page handout.
- [x] **Undo** — `Ctrl+Z` restores text *and* highlights together.

### Explicitly out of scope for v0.1

Margin notes, multiple highlight colours, PDF import, PDF export, accounts and sync, mobile, multi-file management. Text search is the browser's `Ctrl+F`.

## Roadmap

### 🔴 Immediately after v0.1 — math rendering (KaTeX)

**Top priority.** Deliberately deferred, not dropped. Study material in economics, finance and the sciences is full of formulas; without rendering, the tool is unusable for exactly the documents it was built for. Ship it as soon as v0.1 is validated.

### v0.2

- Margin notes (post-its) anchored to blocks
- Multiple highlight colours
- Export to PDF (annotated, corrected version)

### Later

- PDF → Markdown import via a **pluggable external converter** (Marker, Docling, …). Deliberately *not* built in-house: PDF extraction is an open research problem and would swallow the project whole.
- Recently-opened files
- Mobile / tablet reading

## Design decisions

**Untouched blocks come back byte for byte.** Every top-level block of the document remembers the exact slice of the file it was parsed from. Saving copies that slice verbatim; only blocks that were edited or highlighted go through the Markdown serializer. Line endings (CRLF or LF), a BOM and the final newline are preserved too. A one-word fix in a 200-page handout produces a one-line diff.

**What the parser does not understand is kept, not fixed.** Display math (`$$…$$`), inline math (`$…$`), raw HTML and tables become opaque nodes: rendered as-is, not editable inline, written back untouched. That is what makes the tool safe for economics and science handouts before KaTeX lands.

**Highlights live in the file, not beside it.** `==text==` is valid Markdown and travels with the sentence. No sidecar file to keep in sync, no anchors to break, and the document still opens correctly in any other Markdown tool.

**Annotation anchoring is not our problem to solve.** The obvious worry — "if I edit the text, do my highlights drift?" — is already solved by rich-text editor engines and by every document tool with comments (Google Docs, and bold text for that matter). Building on ProseMirror means positions are remapped automatically on every edit: correct a comma at the top of a paragraph and the highlight at the bottom stays put; type inside a highlight and it grows; delete the sentence and the highlight goes with it. All three behave the way a user expects, with no custom rules invented.

**Reading is the default state, editing is the exception.** The failure mode of every Markdown tool is making you feel like you're in an IDE. Palimpsest should feel like a book that happens to be correctable.

## Stack

- React 19, TypeScript (strict), Vite, Vitest
- [Tiptap](https://tiptap.dev) 3 (ProseMirror) — editing core, with the built-in Highlight extension
- markdown-it + prosemirror-markdown — our own parse/serialize pipeline in `src/markdown/`, block by block
- File System Access API for local file read/write
- Plain CSS with variables, no framework

### Known risk — validated

Tiptap doesn't work in Markdown natively; it converts in and out, and a file can come back subtly reformatted. The round-trip was tested first (`src/markdown/roundtrip.test.ts`): an untouched file is byte-identical after save, and an edit changes only the lines of the block it touched. Blocks that *are* rewritten keep their bullet style and list numbering; the serializer still escapes a few characters conservatively (`*`, `[`, `~`) and flattens soft line breaks inside the paragraph. Footnote references (`[^1]`) survive as text but get escaped when their paragraph is edited — to fix with a footnote plugin.

## Success criteria

Not lines of code. The test is whether it gets opened out of habit instead of the PDF. If after three days of an exam period the PDFs come back out, something in the reading flow is wrong — and that's the signal worth listening to.

## License

MIT — see [LICENSE](LICENSE).
