# Iron Beads Designer

A browser-based template renderer for iron bead (Perler/Hama) designs. Define multi-layer bead patterns in a simple ASCII format, preview them as a grid or in 3D, and print or share them.

## Goals

- **Simple ASCII format** that is easy to describe to an LLM for generation
- **Multi-layer support** for stacked designs (front, middle, back layers)
- **Print-friendly output** including a black-and-white mode with character labels and a text legend
- **Persistent and shareable** — auto-saves to localStorage, shareable via URL hash with QR code
- **Responsive** — works on desktop and mobile

## Features

- **Live template editor** — edit the ASCII pattern on the left, see the rendered beads on the right
- **B&W mode** — replaces colors with character labels inside each bead, with a text-only legend for black-and-white printing
- **3D isometric preview** — stacks all layers vertically with drag-to-rotate (mouse and touch)
- **Print support** — hides the editor, prints only the bead grids
- **Share via URL** — encodes the template in the URL hash, generates a QR code for easy sharing
- **Auto-save** — template is saved to localStorage on every edit
- **Mobile responsive** — sidebar becomes a slide-out drawer on small screens

## Template Format

A template file has three sections: a color palette, and one or more layers separated by `---`.

### Color Palette

Define colors under a `# COLORS` heading. Each line is a single character key followed by a color name or hex value. `.` is reserved for empty cells.

```
# COLORS
. empty
Y yellow
S peachpuff
P pink
M hotpink
B black
R red
C gold
```

### Layers

Each layer starts with a `# <name>` heading (any name except "colors"). The grid uses the palette keys. `.` means empty.

```
# FRONT LAYER

....C.C....
...YYYYY...
..YYYYSYY..
..YSSSSSY..
..YSB.SBY..
...SSRSS...
...PPPPP...
..PPMPMPP..
..PPPPPPP..
...PPPPP...
```

Separate multiple layers with `---`:

```
---

# BACK LAYER

....C.C....
...YYYYY...
..YYYYYYY..
..YSSSSSY..
..YSSSSSY..
...SSSSS...
...PPPPP...
..PPPPPPP..
..PPPPPPP..
...PPPPP...
```

## Getting Started

```sh
pnpm install
pnpm dev
```

## Build

```sh
pnpm build
```

Output goes to `dist/`.

## Deploy

Deploys to Cloudflare Workers as a static assets site:

```sh
pnpm deploy
```
