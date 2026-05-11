# Domain Vocabulary

## Template
The ASCII format describing a bead design. Defined by a color palette and one or more layers of bead grids. Parsed into a `ParsedTemplate` data structure by `parseTemplate`.

## Source
The string (text) representation of a template. Editable in the textarea, persisted to storage, serialized for sharing.

## Layer
A single plane of beads in a multi-layer design. Has a name and a grid of cells represented as strings of palette key characters.

## Palette
The color mapping: single-character keys to color names or hex values. `.` is reserved for empty cells.

## Bead
A single cell in a layer grid. Represented by a palette key character. Painted interactively or defined in the source template.

## Stroke
A continuous paint interaction: from pointer down to pointer up. Multiple bead paints within one stroke coalesce into a single undo step.

## Editor State
The combined source string, parsed template, and undo/redo history. The core data structure of the Template Editor module.

## Bead Positions
The 3D coordinates computed from layer data for isometric rendering. Pure geometry with no rendering dependency.

## Color Resolution
Resolving CSS color names (e.g. `peachpuff`) to hex values. Uses DOM computation in production, static mapping in tests.
