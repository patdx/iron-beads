import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import IsometricPreview from "./IsometricPreview";
import { createAppStorage, encodeShare } from "./storage";

type Layer = {
  name: string;
  rows: string[];
};

type ParsedFile = {
  palette: Record<string, string>;
  layers: Layer[];
};

type LayerLineMap = {
  name: string;
  rows: { lineIndex: number; text: string }[];
}[];

const DEFAULT_FILE = `# COLORS
. empty
Y yellow
S peachpuff
P pink
M hotpink
B black
R red
C gold

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

---

# MIDDLE SPACER LAYER

....YYY....
...YYYYY...
..YYSSSYY..
..YSSSSSY..
...SSSSS...
...PPPPP...
..PPPPPPP..
..PPPPPPP..
...PPPPP...

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
`;

const storage = createAppStorage(DEFAULT_FILE);

function parseTemplate(input: string): ParsedFile {
  const lines = input.split("\n");
  const palette: Record<string, string> = {};
  const layers: Layer[] = [];
  let currentLayer: Layer | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed === "---") {
      currentLayer = null;
      continue;
    }
    if (trimmed.startsWith("#")) {
      const heading = trimmed.match(/^#\s+(.+)/);
      if (heading && !heading[1]!.toLowerCase().startsWith("colors")) {
        currentLayer = { name: heading[1]!, rows: [] };
        layers.push(currentLayer);
      }
      continue;
    }
    const paletteMatch = trimmed.match(/^(\S)\s+(.+)$/);
    if (paletteMatch && trimmed.length < 40 && (!currentLayer || /^[^.]*$/.test(trimmed.slice(2)))) {
      const [, key, value] = paletteMatch;
      palette[key!] = value!;
      continue;
    }
    if (currentLayer) {
      currentLayer.rows.push(trimmed);
    }
  }

  return { palette, layers };
}

function findLayerLineMap(source: string): LayerLineMap {
  const lines = source.split("\n");
  const result: LayerLineMap = [];
  let current: (typeof result)[0] | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed === "---") {
      current = null;
      continue;
    }
    if (trimmed.startsWith("#")) {
      const m = trimmed.match(/^#\s+(.+)/);
      if (m && !m[1]!.toLowerCase().startsWith("colors")) {
        current = { name: m[1]!, rows: [] };
        result.push(current);
      }
      continue;
    }
    if (current) {
      current.rows.push({ lineIndex: i, text: line });
    }
  }
  return result;
}

const _hexCache: Record<string, string> = {};
function getHex(color: string): string {
  if (_hexCache[color]) return _hexCache[color];
  if (color.startsWith("#") && (color.length === 4 || color.length === 7)) {
    _hexCache[color] = color.toUpperCase();
    return _hexCache[color];
  }
  const div = document.createElement("div");
  div.style.color = color;
  div.style.position = "absolute";
  div.style.visibility = "hidden";
  document.body.appendChild(div);
  const computed = getComputedStyle(div).color;
  document.body.removeChild(div);
  const match = computed.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match) {
    const hex =
      "#" +
      [1, 2, 3]
        .map((i) => parseInt(match[i]!).toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
    _hexCache[color] = hex;
    return hex;
  }
  _hexCache[color] = color;
  return color;
}

function LayerView({
  layer,
  palette,
  beadSize,
  bwMode,
  layerIndex,
  onBeadMouseDown,
  onBeadMouseEnter,
}: {
  layer: Layer;
  palette: Record<string, string>;
  beadSize: number;
  bwMode: boolean;
  layerIndex: number;
  onBeadMouseDown?: (li: number, ri: number, ci: number, e: React.MouseEvent) => void;
  onBeadMouseEnter?: (li: number, ri: number, ci: number) => void;
}) {
  const width = Math.max(...layer.rows.map((r) => r.length), 0);
  const showLabels = beadSize >= 12;

  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: `26px repeat(${width}, ${beadSize}px)` }}
    >
      <div className="grid-header" />
      {Array.from({ length: width }, (_, i) => (
        <div
          key={`c${i}`}
          className="grid-header"
          style={{ width: beadSize, height: Math.max(18, Math.round(beadSize * 0.6)) }}
        >
          {i + 1}
        </div>
      ))}

      {layer.rows.map((row, y) => (
        <div key={`row-${y}`} className="grid-row-wrapper" style={{ display: "contents" }}>
          <div className="grid-header" style={{ width: 26, height: beadSize }}>
            {y + 1}
          </div>
          {[...row].map((char, x) => {
            const isEmpty = char === ".";
            const color = isEmpty ? "transparent" : palette[char] || "#999";
            return (
              <div
                key={`${x}-${y}`}
                className={`bead${isEmpty ? " empty" : " filled"}`}
                style={
                  {
                    width: beadSize,
                    height: beadSize,
                    background: bwMode
                      ? isEmpty
                        ? "transparent"
                        : "#222"
                      : color,
                    fontSize: Math.max(8, Math.round(beadSize * 0.42)),
                    color: bwMode ? "#fff" : "#222",
                    border: isEmpty
                      ? "1px solid #e0e0e0"
                      : bwMode
                        ? "1px solid #555"
                        : "1px solid rgba(0,0,0,0.08)",
                  } as CSSProperties
                }
                onMouseDown={(e) => {
                  e.preventDefault();
                  onBeadMouseDown?.(layerIndex, y, x, e);
                }}
                onMouseEnter={() => onBeadMouseEnter?.(layerIndex, y, x)}
              >
                {!isEmpty && showLabels && (
                  <span className="bead-label">{char}</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [source, setSource] = useState(() => storage.getItem("source") ?? DEFAULT_FILE);
  const [notes, setNotes] = useState(() => storage.getItem("notes") ?? "");
  const [zoom, setZoom] = useState(100);
  const [bwMode, setBwMode] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
    const [printQrSvg, setPrintQrSvg] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [leftTab, setLeftTab] = useState<"template" | "notes">("template");
  const [selectedLayerIndex, setSelectedLayerIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"2d" | "iso">("2d");
  const [layerVisibility, setLayerVisibility] = useState<Record<number, boolean>>({});
  const [activeColor, setActiveColor] = useState("Y");
  const [historyStamp, setHistoryStamp] = useState(0);

  const historyRef = useRef<string[]>([storage.getItem("source") ?? DEFAULT_FILE]);
  const historyIndexRef = useRef(0);
  const historyTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isPainting = useRef(false);
  const paintTarget = useRef(".");
  const sourceRef = useRef(source);

  const parsed = useMemo(() => parseTemplate(source), [source]);

  const baseBeadSize = 22;
  const beadSize = Math.max(6, Math.round(baseBeadSize * (zoom / 100)));

  const safeLayerIndex = Math.min(
    selectedLayerIndex,
    Math.max(0, parsed.layers.length - 1),
  );

  const selectedLayer = parsed.layers[safeLayerIndex];

  const nonEmptyKeys = useMemo(
    () => Object.keys(parsed.palette).filter((k) => k !== "."),
    [parsed.palette],
  );

  useEffect(() => {
    if (nonEmptyKeys.length > 0 && !nonEmptyKeys.includes(activeColor)) {
      setActiveColor(nonEmptyKeys[0]!);
    }
  }, [nonEmptyKeys, activeColor]);

  useEffect(() => {
    sourceRef.current = source;
  }, [source]);

  useEffect(() => {
    storage.setItem("notes", notes);
  }, [notes]);

  useEffect(() => {
    document.body.classList.toggle("bw-mode", bwMode);
  }, [bwMode]);

  const pushHistory = useCallback((value: string) => {
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = window.setTimeout(() => {
      const idx = historyIndexRef.current;
      const hist = historyRef.current;
      if (hist[idx] === value) return;
      historyRef.current = [...hist.slice(0, idx + 1), value];
      if (historyRef.current.length > 200) {
        historyRef.current = historyRef.current.slice(-200);
      }
      historyIndexRef.current = historyRef.current.length - 1;
      setHistoryStamp((s) => s + 1);
    }, 500);
  }, []);

  const updateSource = useCallback(
    (value: string, silent?: boolean) => {
      setSource(value);
      sourceRef.current = value;
      storage.setItem("source", value);
      if (!silent) pushHistory(value);
    },
    [pushHistory],
  );

  const undo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const val = historyRef.current[historyIndexRef.current];
      if (val != null) {
        setSource(val);
        sourceRef.current = val;
        storage.setItem("source", val);
        setHistoryStamp((s) => s + 1);
      }
    }
  };

  const redo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const val = historyRef.current[historyIndexRef.current];
      if (val != null) {
        setSource(val);
        sourceRef.current = val;
        storage.setItem("source", val);
        setHistoryStamp((s) => s + 1);
      }
    }
  };

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const handleFileOpen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateSource(String(reader.result));
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSave = () => {
    const blob = new Blob([source], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "design.beads";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleNew = () => {
    updateSource("# COLORS\n. empty\n\n# LAYER 1\n....\n....\n");
    setNotes("");
    setSelectedLayerIndex(0);
    setZoom(100);
  };

  const applyPaint = useCallback(
    (layerIdx: number, rowIdx: number, colIdx: number, target: string) => {
      const src = sourceRef.current;
      const locs = findLayerLineMap(src);
      const layer = locs[layerIdx];
      const row = layer?.rows[rowIdx];
      if (!row) return;
      const lines = src.split("\n");
      const line = lines[row.lineIndex]!;
      const padded = line.padEnd(colIdx + 1, ".");
      const chars = [...padded];
      if ((chars[colIdx] || ".") === target) return;
      chars[colIdx] = target;
      lines[row.lineIndex] = chars.join("");
      updateSource(lines.join("\n"), true);
    },
    [updateSource],
  );

  const handleBeadMouseDown = useCallback(
    (layerIdx: number, rowIdx: number, colIdx: number, e: React.MouseEvent) => {
      const target = e.shiftKey ? "." : activeColor;
      paintTarget.current = target;
      isPainting.current = true;
      applyPaint(layerIdx, rowIdx, colIdx, target);
    },
    [activeColor, applyPaint],
  );

  const handleBeadMouseEnter = useCallback(
    (layerIdx: number, rowIdx: number, colIdx: number) => {
      if (!isPainting.current) return;
      applyPaint(layerIdx, rowIdx, colIdx, paintTarget.current);
    },
    [applyPaint],
  );

  useEffect(() => {
    const up = () => {
      if (isPainting.current) {
        isPainting.current = false;
        pushHistory(sourceRef.current);
      }
    };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, [pushHistory]);

  const generateShare = useCallback(async () => {
    const encoded = encodeShare(source);
    const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
    window.location.hash = encoded;
    try {
      const svg = await QRCode.toString(url, {
        type: "svg",
        width: 160,
        margin: 1,
        color: { dark: "#000", light: "#fff" },
      });
      setQrSvg(svg);
    } catch {
      setQrSvg(null);
    }
    setShareUrl(url);
    setShowQr(true);
    setCopied(false);
  }, [source]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const encoded = encodeShare(source);
      const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
      try {
        const svg = await QRCode.toString(url, {
          type: "svg",
          width: 120,
          margin: 1,
          color: { dark: "#000", light: "#fff" },
        });
        setPrintQrSvg(svg);
      } catch {
        setPrintQrSvg(null);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [source]);

  const totalBeads = useMemo(
    () =>
      parsed.layers.reduce(
        (sum, l) =>
          sum + l.rows.reduce((s, row) => s + [...row].filter((c) => c !== ".").length, 0),
        0,
      ),
    [parsed],
  );

  const isLayerVisible = (i: number) => layerVisibility[i] !== false;

  void historyStamp;

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom((z) => Math.max(25, Math.min(300, z + (e.deltaY > 0 ? -5 : 5))));
    }
  }, []);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        html, body, #root {
          height: 100%;
          overflow: hidden;
        }

        body {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f0f0f0;
          color: #222;
          font-size: 13px;
        }

        .app {
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
        }

        /* ---- TOP TOOLBAR ---- */
        .toolbar {
          height: 42px;
          min-height: 42px;
          background: #fafafa;
          border-bottom: 1px solid #d9d9d9;
          display: flex;
          align-items: center;
          padding: 0 10px;
          gap: 2px;
          flex-shrink: 0;
          user-select: none;
        }

        .toolbar-title {
          font-size: 13px;
          font-weight: 700;
          margin-right: 12px;
          white-space: nowrap;
          color: #111;
          letter-spacing: -0.01em;
        }

        .toolbar-sep {
          width: 1px;
          height: 20px;
          background: #ddd;
          margin: 0 4px;
          flex-shrink: 0;
        }

        .tb {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 9px;
          font-size: 12px;
          font-weight: 500;
          font-family: inherit;
          color: #444;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 4px;
          cursor: pointer;
          white-space: nowrap;
          line-height: 1;
        }
        .tb:hover { background: #e8e8e8; color: #222; }
        .tb:active { background: #ddd; }
        .tb.active { background: #e2e2e2; border-color: #c8c8c8; color: #111; }
        .tb:disabled { opacity: 0.35; cursor: not-allowed; }
        .tb:disabled:hover { background: transparent; }

        /* ---- WORKSPACE ---- */
        .workspace {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        /* ---- LEFT PANEL ---- */
        .left-panel {
          width: 280px;
          min-width: 200px;
          background: #fff;
          border-right: 1px solid #d9d9d9;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          flex-shrink: 0;
        }

        .tabs {
          display: flex;
          background: #f7f7f7;
          border-bottom: 1px solid #d9d9d9;
          flex-shrink: 0;
        }

        .tab {
          padding: 8px 16px;
          font-size: 11px;
          font-weight: 600;
          color: #888;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          transition: color 0.12s;
          user-select: none;
          background: none;
          border-top: none;
          border-left: none;
          border-right: none;
        }
        .tab:hover { color: #555; }
        .tab.active { color: #222; border-bottom-color: #555; }

        .editor-area {
          flex: 1;
          overflow: hidden;
          display: flex;
        }

        .source-textarea {
          width: 100%;
          height: 100%;
          resize: none;
          border: none;
          outline: none;
          padding: 12px;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
          font-size: 12.5px;
          line-height: 1.55;
          color: #333;
          background: transparent;
          tab-size: 4;
        }

        /* ---- CENTER PANEL ---- */
        .center-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #fff;
          min-width: 0;
        }

        .center-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 8px;
          background: #fafafa;
          border-bottom: 1px solid #d9d9d9;
          flex-shrink: 0;
          height: 36px;
          min-height: 36px;
          gap: 8px;
        }

        .layer-tabs {
          display: flex;
          gap: 1px;
          overflow-x: auto;
          min-width: 0;
        }

        .ltab {
          padding: 6px 12px;
          font-size: 11px;
          font-weight: 600;
          font-family: inherit;
          color: #888;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          white-space: nowrap;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-radius: 0;
        }
        .ltab:hover { color: #555; }
        .ltab.active { color: #222; border-bottom-color: #555; }

        .zoom-controls {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 11.5px;
          color: #666;
          flex-shrink: 0;
        }

        .zb {
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border-radius: 3px;
          border: 1px solid #d0d0d0;
          background: #fff;
          color: #555;
          cursor: pointer;
          font-size: 13px;
          line-height: 1;
          font-family: inherit;
        }
        .zb:hover { background: #f0f0f0; }
        .zb:active { background: #e0e0e0; }

        .zoom-pct {
          min-width: 36px;
          text-align: center;
          font-variant-numeric: tabular-nums;
        }

        .grid-container {
          flex: 1;
          overflow: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background:
            radial-gradient(circle, #e8e8e8 1px, transparent 1px);
          background-size: 20px 20px;
        }

        .grid {
          display: grid;
          gap: 2px;
          user-select: none;
        }

        .grid-header {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: #aaa;
          font-weight: 500;
          user-select: none;
        }

        .bead {
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: opacity 0.06s;
        }
        .bead:hover { opacity: 0.8; }

        .bead.empty {
          cursor: pointer;
          position: relative;
        }
        .bead.empty::after {
          content: '';
          position: absolute;
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: #c8c8c8;
        }

        .bead.filled {
          box-shadow: inset 0 -1px 2px rgba(0,0,0,0.08);
        }

        .bead-label {
          font-weight: 700;
          font-family: 'SF Mono', Monaco, Consolas, monospace;
          text-shadow: 0 0 3px rgba(255,255,255,0.7);
          pointer-events: none;
          line-height: 1;
        }

        /* ---- RIGHT PANEL ---- */
        .right-panel {
          width: 224px;
          min-width: 180px;
          background: #fff;
          border-left: 1px solid #d9d9d9;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          flex-shrink: 0;
        }

        .panel-scroll {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .section {
          padding: 12px 14px;
          border-bottom: 1px solid #eee;
        }

        .section-title {
          font-size: 10.5px;
          font-weight: 700;
          color: #777;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .section-count {
          font-weight: 500;
          color: #aaa;
        }

        .palette-row {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 3px 4px;
          font-size: 12px;
          border-radius: 3px;
          cursor: pointer;
          transition: background 0.1s;
        }
        .palette-row:hover { background: #f5f5f5; }
        .palette-row.selected { background: #eef2ff; }

        .palette-swatch {
          width: 16px;
          height: 16px;
          border-radius: 3px;
          border: 1px solid rgba(0,0,0,0.1);
          flex-shrink: 0;
        }

        .palette-key {
          width: 12px;
          text-align: center;
          font-family: monospace;
          font-weight: 700;
          color: #666;
          flex-shrink: 0;
          font-size: 11px;
        }

        .palette-name {
          flex: 1;
          color: #444;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 11.5px;
        }

        .palette-hex {
          color: #aaa;
          font-family: monospace;
          font-size: 10px;
          flex-shrink: 0;
        }

        .layer-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 4px;
          font-size: 12px;
          cursor: pointer;
          border-radius: 3px;
          transition: background 0.1s;
        }
        .layer-row:hover { background: #f5f5f5; }
        .layer-row.active { background: #f0f0f0; font-weight: 600; }

        .layer-eye {
          width: 14px;
          text-align: center;
          font-size: 10px;
          color: #888;
          flex-shrink: 0;
          cursor: pointer;
        }
        .layer-eye:hover { color: #444; }

        .layer-idx {
          width: 14px;
          text-align: center;
          color: #bbb;
          font-size: 10px;
          flex-shrink: 0;
        }

        .layer-name-text {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .layer-dims {
          color: #bbb;
          font-size: 10px;
          flex-shrink: 0;
          font-variant-numeric: tabular-nums;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          font-size: 11.5px;
          padding: 2px 0;
          color: #555;
        }
        .info-label { color: #999; }

        .share-row {
          display: flex;
          gap: 4px;
          margin-top: 4px;
        }

        .share-input {
          flex: 1;
          border: 1px solid #ddd;
          border-radius: 3px;
          padding: 4px 6px;
          font-size: 10px;
          font-family: monospace;
          color: #555;
          background: #fafafa;
          outline: none;
          min-width: 0;
        }
        .share-input:focus { border-color: #aaa; }

        .share-btn {
          padding: 4px 8px;
          font-size: 10.5px;
          font-family: inherit;
          font-weight: 500;
          border: 1px solid #ddd;
          border-radius: 3px;
          background: #fff;
          cursor: pointer;
          color: #444;
          white-space: nowrap;
        }
        .share-btn:hover { background: #f5f5f5; }
        .share-btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
        .share-btn.primary:hover { background: #1d4ed8; }
        .share-btn.success { background: #16a34a; color: #fff; border-color: #16a34a; }

        .qr-wrap {
          margin-top: 8px;
          display: flex;
          justify-content: center;
        }
        .qr-wrap svg {
          border-radius: 3px;
          border: 1px solid #eee;
        }

        .autosave {
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10.5px;
          color: #999;
        }
        .autosave-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #4ade80;
          flex-shrink: 0;
        }

        /* ---- BOTTOM BAR ---- */
        .bottom-bar {
          height: 26px;
          min-height: 26px;
          background: #fafafa;
          border-top: 1px solid #d9d9d9;
          display: flex;
          align-items: center;
          padding: 0 14px;
          gap: 18px;
          flex-shrink: 0;
          font-size: 10.5px;
          color: #888;
          user-select: none;
        }
        .bottom-item {
          display: flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
        }

        /* ---- ISO PREVIEW ---- */
        .iso-wrap {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .iso-canvas {
          width: 100%;
          flex: 1;
          min-height: 300px;
          background: linear-gradient(180deg, #f5f5f5 0%, #e8e8e8 100%);
          cursor: grab;
          touch-action: none;
          border-radius: 6px;
        }
        .iso-canvas:active { cursor: grabbing; }

        /* ---- COLOR INDICATOR ---- */
        .active-color-bar {
          height: 3px;
          margin-top: 2px;
          border-radius: 1px;
          transition: background 0.15s;
        }

        /* ---- PRINT ---- */
        .print-view { display: none; }

        @media print {
          .toolbar, .left-panel, .right-panel, .bottom-bar, .center-header, .grid-container { display: none !important; }
          .center-panel { overflow: visible; flex: none; width: 100%; }
          .workspace { overflow: visible; flex-direction: column; }

          .print-view {
            display: block;
            padding: 20px;
          }
          .print-title {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 4px;
          }
          .print-subtitle {
            font-size: 12px;
            color: #666;
            margin-bottom: 16px;
          }
          .print-layer {
            break-inside: avoid;
            margin-bottom: 24px;
          }
          .print-layer-title {
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid #ddd;
          }
          .print-grid .bead { border: 1px solid #ccc !important; }
          .print-grid .bead.empty { border: 1px solid #ddd !important; }
          .print-grid .bead.empty::after { background: #bbb !important; }
          .print-footer {
            margin-top: 20px;
            padding-top: 12px;
            border-top: 1px solid #ddd;
            display: flex;
            gap: 24px;
            align-items: flex-start;
            break-inside: avoid;
          }
          .print-legend {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          .print-legend-item {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 12px;
          }
          .print-legend-swatch {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            border: 1px solid rgba(0,0,0,0.15);
            flex-shrink: 0;
          }
          .print-qr svg {
            border: 1px solid #ddd;
            border-radius: 4px;
          }
        }

        /* ---- RESPONSIVE ---- */
        @media (max-width: 900px) {
          .left-panel { width: 220px; }
          .right-panel { width: 180px; }
        }
        @media (max-width: 700px) {
          .left-panel { display: none; }
          .right-panel { display: none; }
        }

        /* ---- SCROLLBAR ---- */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #aaa; }
      `}</style>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileOpen}
        accept=".txt,.beads,.text"
      />

      <div className="app">
        {/* TOP TOOLBAR */}
        <div className="toolbar">
          <span className="toolbar-title">Iron Beads</span>
          <button className="tb" onClick={handleNew}>+ New</button>
          <button className="tb" onClick={() => fileInputRef.current?.click()}>
            Open
          </button>
          <button className="tb" onClick={handleSave}>Save</button>
          <div className="toolbar-sep" />
          <button className="tb" onClick={undo} disabled={!canUndo}>
            &#x21B6; Undo
          </button>
          <button className="tb" onClick={redo} disabled={!canRedo}>
            &#x21B7; Redo
          </button>
          <div className="toolbar-sep" />
          <button
            className={`tb${viewMode === "2d" ? " active" : ""}`}
            onClick={() => setViewMode("2d")}
          >
            2D Grid
          </button>
          <button
            className={`tb${viewMode === "iso" ? " active" : ""}`}
            onClick={() => setViewMode("iso")}
          >
            3D Preview
          </button>
          <div className="toolbar-sep" />
          <button
            className={`tb${bwMode ? " active" : ""}`}
            onClick={() => setBwMode((b) => !b)}
          >
            B&W (Labels)
          </button>
          <div style={{ flex: 1 }} />
          <button className="tb" onClick={() => window.print()}>Print</button>
          <button className="tb" style={{ color: "#2563eb" }} onClick={generateShare}>
            Share
          </button>
        </div>

        {/* WORKSPACE */}
        <div className="workspace">
          {/* LEFT PANEL */}
          <div className="left-panel">
            <div className="tabs">
              <button
                className={`tab${leftTab === "template" ? " active" : ""}`}
                onClick={() => setLeftTab("template")}
              >
                Template
              </button>
              <button
                className={`tab${leftTab === "notes" ? " active" : ""}`}
                onClick={() => setLeftTab("notes")}
              >
                Notes
              </button>
            </div>
            <div className="editor-area">
              {leftTab === "template" ? (
                <textarea
                  className="source-textarea"
                  value={source}
                  onChange={(e) => updateSource(e.target.value)}
                  spellCheck={false}
                />
              ) : (
                <textarea
                  className="source-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add your notes here..."
                  spellCheck={false}
                />
              )}
            </div>
          </div>

          {/* CENTER PANEL */}
          <div className="center-panel">
            <div className="center-header">
              <div className="layer-tabs">
                {parsed.layers.map((layer, i) => (
                  <button
                    key={layer.name}
                    className={`ltab${safeLayerIndex === i ? " active" : ""}`}
                    onClick={() => setSelectedLayerIndex(i)}
                  >
                    {layer.name}
                  </button>
                ))}
              </div>
              <div className="zoom-controls">
                <button className="zb" onClick={() => setZoom((z) => Math.max(25, z - 10))}>
                  &#x2212;
                </button>
                <span className="zoom-pct">{zoom}%</span>
                <button className="zb" onClick={() => setZoom((z) => Math.min(300, z + 10))}>
                  +
                </button>
                <button
                  className="zb"
                  onClick={() => {
                    if (!document.fullscreenElement) {
                      document.documentElement.requestFullscreen().catch(() => {});
                    } else {
                      document.exitFullscreen().catch(() => {});
                    }
                  }}
                  title="Fullscreen"
                >
                  &#x26F6;
                </button>
              </div>
            </div>

            <div className="grid-container" onWheel={onWheel}>
              {viewMode === "iso" ? (
                <div className="iso-wrap">
                  <IsometricPreview
                    layers={parsed.layers.filter((_, i) => isLayerVisible(i))}
                    palette={parsed.palette}
                    beadSize={beadSize}
                  />
                </div>
              ) : selectedLayer && isLayerVisible(safeLayerIndex) ? (
                <LayerView
                  layer={selectedLayer}
                  palette={parsed.palette}
                  beadSize={beadSize}
                  bwMode={bwMode}
                  layerIndex={safeLayerIndex}
                  onBeadMouseDown={handleBeadMouseDown}
                  onBeadMouseEnter={handleBeadMouseEnter}
                />
              ) : (
                <div style={{ color: "#999", fontSize: 13 }}>
                  {parsed.layers.length === 0
                    ? "No layers defined. Add a layer in the template."
                    : "Layer hidden. Click the eye icon in the Layers panel."}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="right-panel">
            <div className="panel-scroll">
              {/* PALETTE */}
              <div className="section">
                <div className="section-title">
                  Palette
                  <span className="section-count">
                    {Object.keys(parsed.palette).length}
                  </span>
                </div>
                {Object.entries(parsed.palette).map(([key, color]) => (
                  <div
                    key={key}
                    className={`palette-row${activeColor === key ? " selected" : ""}`}
                    onClick={() => setActiveColor(key)}
                  >
                    <div
                      className="palette-swatch"
                      style={{
                        background: key === "." ? "#fff" : color,
                      }}
                    />
                    <span className="palette-key">{key}</span>
                    <span className="palette-name">{color}</span>
                    {key !== "." && (
                      <span className="palette-hex">{getHex(color)}</span>
                    )}
                  </div>
                ))}
                <div className="active-color-bar" style={{ background: parsed.palette[activeColor] || "#eee" }} />
              </div>

              {/* LAYERS */}
              <div className="section">
                <div className="section-title">
                  Layers
                  <span className="section-count">{parsed.layers.length}</span>
                </div>
                {parsed.layers.map((layer, i) => {
                  const w = Math.max(...layer.rows.map((r) => r.length), 0);
                  const h = layer.rows.length;
                  return (
                    <div
                      key={layer.name}
                      className={`layer-row${safeLayerIndex === i ? " active" : ""}`}
                      onClick={() => setSelectedLayerIndex(i)}
                    >
                      <span
                        className="layer-eye"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLayerVisibility((prev) => ({
                            ...prev,
                            [i]: prev[i] === false,
                          }));
                        }}
                      >
                        {isLayerVisible(i) ? "\u25C9" : "\u25CE"}
                      </span>
                      <span className="layer-idx">{i + 1}</span>
                      <span className="layer-name-text">{layer.name}</span>
                      <span className="layer-dims">
                        {w}&times;{h}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* TEMPLATE INFO */}
              <div className="section">
                <div className="section-title">Template Info</div>
                <div className="info-row">
                  <span className="info-label">Dimensions</span>
                  <span>
                    {selectedLayer
                      ? `${Math.max(...selectedLayer.rows.map((r) => r.length), 0)} \u00d7 ${selectedLayer.rows.length}`
                      : "\u2014"}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Layers</span>
                  <span>{parsed.layers.length}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Total beads</span>
                  <span>{totalBeads}</span>
                </div>
              </div>

              {/* SHARE */}
              <div className="section">
                <div className="section-title">Share</div>
                {showQr && shareUrl ? (
                  <>
                    <div className="share-row">
                      <input
                        className="share-input"
                        readOnly
                        value={shareUrl}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <button
                        className={`share-btn${copied ? " success" : ""}`}
                        onClick={() => {
                          navigator.clipboard.writeText(shareUrl);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                      >
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                    {qrSvg && (
                      <div
                        className="qr-wrap"
                        dangerouslySetInnerHTML={{ __html: qrSvg }}
                      />
                    )}
                  </>
                ) : (
                  <button className="share-btn primary" onClick={generateShare} style={{ width: "100%" }}>
                    Generate Share Link
                  </button>
                )}
              </div>

              {/* AUTOSAVE */}
              <div className="autosave">
                <span className="autosave-dot" />
                Auto-saved to this device
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM BAR */}
        <div className="bottom-bar">
          <span className="bottom-item">
            <span style={{ opacity: 0.5 }}>&#x25CB;</span> empty bead
          </span>
          <span className="bottom-item">
            Click bead to paint
          </span>
          <span className="bottom-item">
            Drag to fill
          </span>
          <span className="bottom-item">
            Shift+Click to erase
          </span>
          <span className="bottom-item">
            Scroll to zoom
          </span>
        </div>

        {/* PRINT VIEW */}
        <div className="print-view">
          <div className="print-title">Iron Beads Designer</div>
          <div className="print-subtitle">
            {parsed.layers.length} layer{parsed.layers.length !== 1 ? "s" : ""} &middot; {totalBeads} beads total
          </div>

          {parsed.layers.map((layer) => {
            const w = Math.max(...layer.rows.map((r) => r.length), 0);
            return (
              <div key={layer.name} className="print-layer">
                <div className="print-layer-title">
                  {layer.name} ({w} &times; {layer.rows.length})
                </div>
                <div
                  className="grid print-grid"
                  style={{ gridTemplateColumns: `24px repeat(${w}, 20px)` }}
                >
                  <div className="grid-header" />
                  {Array.from({ length: w }, (_, i) => (
                    <div key={`pc${i}`} className="grid-header" style={{ width: 20, height: 16 }}>
                      {i + 1}
                    </div>
                  ))}
                  {layer.rows.map((row, y) => (
                    <div key={`pr${y}`} style={{ display: "contents" }}>
                      <div className="grid-header" style={{ width: 24, height: 20 }}>
                        {y + 1}
                      </div>
                      {[...row].map((char, x) => {
                        const isEmpty = char === ".";
                        const color = isEmpty ? "transparent" : parsed.palette[char] || "#999";
                        return (
                          <div
                            key={`p${x}-${y}`}
                            className={`bead${isEmpty ? " empty" : " filled"}`}
                            style={
                              {
                                width: 20,
                                height: 20,
                                background: bwMode ? (isEmpty ? "transparent" : "#222") : color,
                                fontSize: 9,
                                color: bwMode ? "#fff" : "#222",
                                border: isEmpty ? "1px solid #ddd" : "1px solid rgba(0,0,0,0.12)",
                              } as CSSProperties
                            }
                          >
                            {!isEmpty && <span className="bead-label">{char}</span>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="print-footer">
            <div className="print-legend">
              {Object.entries(parsed.palette)
                .filter(([k]) => k !== ".")
                .map(([key, color]) => (
                  <div key={key} className="print-legend-item">
                    <div className="print-legend-swatch" style={{ background: color }} />
                    <span>{key} = {color}</span>
                  </div>
                ))}
            </div>
            <div className="print-qr">
              {printQrSvg && (
                <div dangerouslySetInnerHTML={{ __html: printQrSvg }} />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
