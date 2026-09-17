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

Pre-alpha. Nothing is built yet. This README is the plan.

## Scope — v0.1

The bar for v0.1 is one thing only: **it has to be good enough to study one full exam on.** Not a demo — actual use.

- [ ] **Open a local `.md` file and save back over it** — no accounts, no cloud, no upload. Uses the File System Access API (Chrome / Edge).
- [ ] **Reading view** — properly rendered Markdown, sane measure, readable typography. This is the main screen.
- [ ] **Highlighter** — select text, one keystroke, it turns yellow. Single colour. Persisted in the file itself as `==text==`.
- [ ] **Inline editing** — double-click a paragraph to edit it in place, `Esc` to go back to reading. No mode switch, no split pane. This is the feature the whole project exists for; it has to feel instant.
- [ ] **Auto-generated outline** — clickable table of contents built from the headings, for moving around a 200-page handout.
- [ ] **Undo** — `Ctrl+Z` restores text *and* highlights together.

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

**Highlights live in the file, not beside it.** `==text==` is valid Markdown and travels with the sentence. No sidecar file to keep in sync, no anchors to break, and the document still opens correctly in any other Markdown tool.

**Annotation anchoring is not our problem to solve.** The obvious worry — "if I edit the text, do my highlights drift?" — is already solved by rich-text editor engines and by every document tool with comments (Google Docs, and bold text for that matter). Building on ProseMirror means positions are remapped automatically on every edit: correct a comma at the top of a paragraph and the highlight at the bottom stays put; type inside a highlight and it grows; delete the sentence and the highlight goes with it. All three behave the way a user expects, with no custom rules invented.

**Reading is the default state, editing is the exception.** The failure mode of every Markdown tool is making you feel like you're in an IDE. Palimpsest should feel like a book that happens to be correctable.

## Stack

- React
- [Tiptap](https://tiptap.dev) (ProseMirror) — editing core, with the built-in Highlight extension
- File System Access API for local file read/write

### Known risk — validate before building

Tiptap doesn't work in Markdown natively; it converts in and out. A file can come back subtly reformatted (`*` bullets turning into `-`, spacing normalised). **Test this first:** open a real handout, save it untouched, diff before and after. If the round-trip is acceptable, proceed. If not, reconsider the editing core before writing two weeks of code on top of it.

## Success criteria

Not lines of code. The test is whether it gets opened out of habit instead of the PDF. If after three days of an exam period the PDFs come back out, something in the reading flow is wrong — and that's the signal worth listening to.

## License

MIT — see [LICENSE](LICENSE).
