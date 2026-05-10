import type { ParsedTemplate } from "./types";

export function paintBead(
  template: ParsedTemplate,
  layerIndex: number,
  rowIndex: number,
  colIndex: number,
  target: string,
): ParsedTemplate {
  const layer = template.layers[layerIndex];
  if (!layer) return template;
  const row = layer.rows[rowIndex];
  if (row == null) return template;

  const padded = row.padEnd(colIndex + 1, ".");
  if (padded[colIndex] === target) return template;

  const chars = [...padded];
  chars[colIndex] = target;
  const newRow = chars.join("");

  const newLayers = template.layers.map((l, li) => {
    if (li !== layerIndex) return l;
    return {
      ...l,
      rows: l.rows.map((r, ri) => (ri === rowIndex ? newRow : r)),
    };
  });

  return { ...template, layers: newLayers };
}

export function nonEmptyKeys(template: ParsedTemplate): string[] {
  return Object.keys(template.palette).filter((k) => k !== ".");
}
