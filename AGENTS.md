# AGENTS.md

## Setup & Toolchain
- **pnpm only** (enforced by `packageManager` field). Node 24.
- **No ESLint** — only Prettier: `singleQuote: true`, `semi: false`.
- **Tests**: Vitest 4. Colocated `*.test.ts` files next to source modules.

## Build & Typecheck
- `pnpm dev` — Vite dev server.
- `pnpm build` — runs `tsc && vite build`. Typechecking happens first; a type error fails the build.
- `pnpm check` — runs `tsc && vitest run`. Use before committing or deploying.
- `tsc` is typecheck-only (`noEmit: true`); Vite handles compilation.
- TS strict mode, `noUnusedLocals`, `noUnusedParameters` are on.

## Deploy
- `pnpm deploy` — runs `pnpm build && wrangler deploy`.
- Serves `dist/` as static assets on Cloudflare Workers (not a Worker function).

## Headless-first design

Core behaviors — template editing, paint, undo/redo, geometry, serialization, color resolution — must be testable in plain Node with zero React and zero DOM. Each domain concern has a **pure module** with functions that take and return plain data, plus a thin React adapter hook. Tests target the pure module, not the adapter.

When adding features: put logic in pure functions first, then wire them to React. If you find yourself reaching for `useState`/`useRef`/`useEffect` to coordinate domain state, stop — extract a pure function instead and test that.

## Architecture

### Entrypoints
- `index.html` → `src/main.tsx` → `src/App.tsx` (thin orchestrator, ~320 lines).
- `src/Preview3D.tsx` — Three.js isometric preview with drag-to-rotate. Consumes `buildBeadPositions` from `src/preview/`.

### Document (`src/document/`)
- Pure functions on `Document`: `createDocument`, `editSource`, `toSource`, `pushHistory`, `undo`, `redo`.
- `editSource(doc, source)` parses source into `DocumentData` and returns a new `Document`. `toSource(doc)` serializes back to ASCII. The round-trip contract is tested at this interface.
- `paintBead`, `countBeads`, `clampLayerIndex`, `selectValidColor` operate on `DocumentData`.
- Binary codec (`binary-codec.ts`), ASCII import/export (`import-ascii.ts`, `export-ascii.ts`) are internal modules.
- No React, no DOM, no side effects. Fully tested in `editor.test.ts`, `operations.test.ts`.
- `src/hooks/useTemplateEditor.ts` — thin React adapter: holds Document state, debounces history pushes (500ms, max 200 entries), writes to storage. Calls Document-level functions, never raw `importAscii`/`exportAscii`.

### Bead geometry (`src/preview/`)
- `buildBeadPositions(layers, palette)` — pure function returning `{ x, y, z, color }[]`. No Three.js dependency. Preview3D is a thin rendering adapter over this.

### Color resolution (`src/color/`)
- `ColorResolver` interface with two adapters: `DOMColorResolver` (production, uses `getComputedStyle`) and `StaticColorResolver` (tests, uses a known map).

### Storage (`src/storage/`)
- `CompositeStorage` chains backends in order: **URL hash → localStorage → defaults**.
- On read, tries each in sequence; on write, writes to all.
- `UrlHashAdapter` uses sync base64 for the session hash (uncompressed binary only).
- Binary format: 6-byte header (magic `0x4942`, version, color count, layer count) → palette entries (key+name pairs, `.` is implicit index 0) → per-layer (name, h×w, packed pixel indices). See `binary-codec.ts`.
- Uses `deflate-raw` (not brotli) because `CompressionStream` doesn't support brotli in Chrome. Switch to `'br'` if/when browser support lands.

### Share (`src/share/`)
- `ShareLink` interface with `encode`, `decode`, `readFromHash`.
- `BrowserShareLink` — async compressed share links (binary + deflate + base64url).
- `InMemoryShareLink` — test adapter.
- `src/hooks/useShare.ts` — owns QR generation (debounced 500ms), share URL state, and clipboard behavior. Takes `ShareLink` as parameter.

### File I/O (`src/io/`)
- `FileIO` interface with `readText` and `saveText`.
- `DOMFileIO` — production adapter using FileReader and Blob.
- `InMemoryFileIO` — test adapter.
- `BLANK_SOURCE`, `INITIAL_SESSION` — constants for the new/reset session state.

### Styling
- **All CSS** in `src/styles.css`. No CSS modules, no CSS-in-JS library. Print styles are `@media print` in the same file.

### UI Components (`src/components/`)
- `Toolbar.tsx`, `LeftPanel.tsx`, `RightPanel.tsx`, `PrintView.tsx`, `BeadGrid.tsx` — stateless rendering components, props-driven.
