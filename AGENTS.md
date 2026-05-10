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
- URL hash uses base64-encoded template data (`encodeShare`/`decodeShare`).

### History (`src/hooks/useHistory.ts`)
- Undo/redo has a **500ms debounce** before pushing state. Max 200 entries. Rapid paint strokes coalesce into one undo step.

### Color resolution
- `getHex()` in `App.tsx` resolves CSS color names to hex by rendering a temporary DOM element and reading `getComputedStyle`. Results are cached.
