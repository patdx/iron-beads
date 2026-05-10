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

## Architecture

### Entrypoints
- `index.html` → `src/main.tsx` → `src/App.tsx` (the entire app, ~1350 lines).
- `src/IsometricPreview.tsx` — canvas-based 3D isometric view with drag-to-rotate.

### Styling
- **All CSS is inline** inside a `<style>` tag in `App.tsx`. No CSS files, no CSS modules, no CSS-in-JS library. Print styles are `@media print` in the same block.

### Template parsing (`src/template/`)
- ASCII format parsed by `parseTemplate`. Use `serialize` to convert back to ASCII.
- `paintBead()` creates new objects immutably — never mutate layer data.
- The paint handler uses a `templateRef` to avoid stale closures.

### Storage (`src/storage/`)
- `CompositeStorage` chains backends in order: **URL hash → localStorage → defaults**.
- On read, tries each in sequence; on write, writes to all.
- `encodeShare`/`decodeShare` use a custom binary format + deflate + base64url.
- Binary format: 6-byte header (magic `0x4942`, version, color count, layer count) → palette entries (key+name pairs, `.` is implicit index 0) → per-layer (name, h×w, packed pixel indices). See `binary-codec.ts`.
- Backward compatible: `decodeShare` auto-detects old base64(utf8) hashes by checking magic bytes.
- `UrlHashAdapter` uses sync base64 for the session hash; `readHashSource()` does async decode for shared links.
- Uses `deflate-raw` (not brotli) because `CompressionStream` doesn't support brotli in Chrome. Switch to `'br'` if/when browser support lands.

### History (`src/hooks/useHistory.ts`)
- Undo/redo has a **500ms debounce** before pushing state. Max 200 entries. Rapid paint strokes coalesce into one undo step.

### Color resolution
- `getHex()` in `App.tsx` resolves CSS color names to hex by rendering a temporary DOM element and reading `getComputedStyle`. Results are cached.
