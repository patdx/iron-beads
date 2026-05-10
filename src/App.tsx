import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import IsometricPreview from "./IsometricPreview";

type Layer = {
  name: string;
  rows: string[];
};

type ParsedFile = {
  palette: Record<string, string>;
  layers: Layer[];
};

const STORAGE_KEY = "iron-beads-source";

function encodeShare(source: string): string {
  return btoa(unescape(encodeURIComponent(source)));
}

function decodeShare(encoded: string): string | null {
  try {
    return decodeURIComponent(escape(atob(encoded)));
  } catch {
    return null;
  }
}

function loadSource(): string {
  const hash = window.location.hash.slice(1);
  if (hash) {
    const decoded = decodeShare(hash);
    if (decoded) return decoded;
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
  } catch {
    // ignore
  }
  return DEFAULT_FILE;
}

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

      if (
        heading &&
        !heading[1]!.toLowerCase().startsWith("colors")
      ) {
        currentLayer = {
          name: heading[1]!,
          rows: [],
        };

        layers.push(currentLayer);
      }

      continue;
    }

    const paletteMatch = trimmed.match(/^(\S)\s+(.+)$/);

    if (
      paletteMatch &&
      !trimmed.includes(".") &&
      trimmed.length < 40
    ) {
      const [, key, value] = paletteMatch;
      palette[key!] = value!;
      continue;
    }

    if (currentLayer) {
      currentLayer.rows.push(trimmed);
    }
  }

  return {
    palette,
    layers,
  };
}

function LayerView({
  layer,
  palette,
  beadSize,
  bwMode,
}: {
  layer: Layer;
  palette: Record<string, string>;
  beadSize: number;
  bwMode: boolean;
}) {
  const width = Math.max(
    ...layer.rows.map((r) => r.length),
    0,
  );

  return (
    <div className="layer-card">
      <div className="layer-title">{layer.name}</div>

      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${width}, ${beadSize}px)`,
        }}
      >
        {layer.rows.flatMap((row, y) =>
          [...row].map((char, x) => {
            const isEmpty = char === ".";
            const color = isEmpty
              ? "transparent"
              : palette[char] || "#999";

            return (
              <div
                key={`${x}-${y}`}
                className={`bead${bwMode && !isEmpty ? " bw-bead" : ""}`}
                title={`${char} (${x}, ${y})`}
                style={
                  {
                    width: beadSize,
                    height: beadSize,
                    background: color,
                    fontSize: beadSize * 0.5,
                    border: isEmpty
                      ? "1px dashed #ddd"
                      : "1px solid rgba(0,0,0,0.18)",
                    "--bead-char": bwMode && !isEmpty ? `"${char}"` : undefined,
                  } as CSSProperties
                }
              />
            );
          }),
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [source, setSource] = useState(loadSource);
  const [beadSize, setBeadSize] = useState(20);
  const [bwMode, setBwMode] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [show3d, setShow3d] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const parsed = useMemo(
    () => parseTemplate(source),
    [source],
  );

  function updateSource(value: string) {
    setSource(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore
    }
  }

  const generateShare = useCallback(async () => {
    const encoded = encodeShare(source);
    const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
    window.location.hash = encoded;

    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 1,
        color: { dark: "#000", light: "#fff" },
      });
      setQrDataUrl(dataUrl);
    } catch {
      setQrDataUrl(null);
    }

    setShareUrl(url);
    setShowQr(true);
    setCopied(false);
  }, [source]);

  useEffect(() => {
    if (!showQr || !qrDataUrl || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, 200, 200);
      ctx.drawImage(img, 0, 0);
    };
    img.src = qrDataUrl;
  }, [showQr, qrDataUrl]);

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: Inter, sans-serif;
          background: #f3f3f3;
          color: #111;
        }

        .app {
          display: flex;
          min-height: 100vh;
        }

        .sidebar {
          width: 420px;
          background: white;
          border-right: 1px solid #ddd;
          padding: 20px;
          overflow: auto;
          position: sticky;
          top: 0;
          height: 100vh;
        }

        .sidebar h1 {
          margin-top: 0;
          margin-bottom: 20px;
          font-size: 24px;
        }

        .menu-toggle {
          display: none;
          position: fixed;
          top: 12px;
          left: 12px;
          z-index: 1001;
          width: 40px;
          height: 40px;
          padding: 0;
          border-radius: 10px;
          font-size: 22px;
          line-height: 1;
          background: white;
          color: #111;
          border: 1px solid #ddd;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        }

        .sidebar-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.35);
          z-index: 999;
        }

        .field {
          margin-bottom: 20px;
        }

        .field label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 600;
        }

        textarea {
          width: 100%;
          min-height: 560px;
          resize: vertical;
          border: 1px solid #ccc;
          border-radius: 12px;
          padding: 14px;
          font-family: monospace;
          font-size: 13px;
          line-height: 1.45;
        }

        input[type="range"] {
          width: 100%;
        }

        .toolbar {
          display: flex;
          gap: 10px;
          margin-top: 12px;
          flex-wrap: wrap;
        }

        button {
          border: none;
          border-radius: 10px;
          background: black;
          color: white;
          padding: 10px 14px;
          cursor: pointer;
          font-size: 14px;
        }

        button:hover {
          opacity: 0.92;
        }

        .qr-panel {
          margin-top: 16px;
          padding: 16px;
          background: #f7f7f7;
          border-radius: 12px;
          text-align: center;
        }

        .qr-panel canvas {
          border-radius: 8px;
        }

        .share-url {
          margin-top: 10px;
          width: 100%;
          border: 1px solid #ccc;
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 12px;
          font-family: monospace;
          background: white;
          color: #333;
          word-break: break-all;
          resize: none;
          outline: none;
        }

        .share-url:focus {
          border-color: #888;
        }

        .viewer {
          flex: 1;
          padding: 24px;
          overflow: auto;
        }

        .layers {
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
          align-items: flex-start;
        }

        .layer-card {
          background: white;
          border-radius: 18px;
          padding: 18px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .layer-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 14px;
        }

        .grid {
          display: grid;
          gap: 1px;
          margin-bottom: 16px;
          overflow-x: auto;
        }

        .bead {
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bw-bead::after {
          content: var(--bead-char);
          font-weight: 700;
          font-family: monospace;
          color: #000;
          text-shadow: 0 0 2px #fff;
        }

        .legend {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 10px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #f7f7f7;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 13px;
        }

        .legend-color {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 1px solid rgba(0,0,0,0.15);
        }

        body.bw-mode .legend-item:not(.bw-item) .legend-color {
          display: none;
        }

        body.bw-mode .legend-item:not(.bw-item) {
          display: none;
        }

        .bw-legend-item {
          display: none;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border: 1px solid #ccc;
          border-radius: 6px;
          font-size: 13px;
          font-family: monospace;
        }

        body.bw-mode .bw-legend-item {
          display: flex;
        }

        @media (max-width: 860px) {
          .menu-toggle {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            width: min(90vw, 380px);
            z-index: 1000;
            transform: translateX(-100%);
            transition: transform 0.25s ease;
          }

          .sidebar.open {
            transform: translateX(0);
          }

          .sidebar-overlay.open {
            display: block;
          }

          .viewer {
            padding: 16px;
            padding-top: 60px;
          }

          textarea {
            min-height: 200px;
          }

          .layers {
            gap: 16px;
          }

          .layer-card {
            padding: 12px;
            border-radius: 14px;
          }

          .toolbar {
            gap: 8px;
          }

          button {
            padding: 8px 12px;
            font-size: 13px;
          }
        }

        .iso-preview {
          background: white;
          border-radius: 18px;
          padding: 18px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          break-inside: avoid;
          page-break-inside: avoid;
          margin-bottom: 16px;
        }

        .iso-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .iso-title {
          font-size: 16px;
          font-weight: 700;
        }

        .iso-hint {
          font-size: 12px;
          color: #888;
        }

        .iso-canvas {
          width: 100%;
          height: 350px;
          border-radius: 12px;
          background: linear-gradient(180deg, #f0f0f0 0%, #e0e0e0 100%);
          cursor: grab;
          touch-action: none;
        }

        .iso-canvas:active {
          cursor: grabbing;
        }

        @media print {
          .sidebar {
            display: none;
          }

          .menu-toggle {
            display: none;
          }

          .sidebar-overlay {
            display: none;
          }

          .viewer {
            padding: 0;
            background: white;
          }

          .layer-card {
            box-shadow: none;
            border: 1px solid #ddd;
          }

          button {
            display: none;
          }
        }
      `}</style>

      <button
        className="menu-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? "\u2715" : "\u2630"}
      </button>

      <div
        className={`sidebar-overlay${sidebarOpen ? " open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="app">
        <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
          <h1>Iron Beads Designer</h1>

          <div className="field">
            <label>Pattern File</label>

            <textarea
              value={source}
              onChange={(e) => updateSource(e.target.value)}
            />
          </div>

          <div className="field">
            <label>
              Bead Size: {beadSize}px
            </label>

            <input
              type="range"
              min={8}
              max={40}
              value={beadSize}
              onChange={(e) =>
                setBeadSize(Number(e.target.value))
              }
            />
          </div>

          <div className="toolbar">
            <button onClick={() => window.print()}>
              Print
            </button>

            <button
              onClick={() =>
                navigator.clipboard.writeText(source)
              }
            >
              Copy File
            </button>

            <button
              onClick={() => {
                setBwMode(!bwMode);
                document.body.classList.toggle("bw-mode", !bwMode);
              }}
              style={{
                background: bwMode ? "#666" : "black",
              }}
            >
              {bwMode ? "Color Mode" : "B&W Mode"}
            </button>

            <button
              onClick={generateShare}
              style={{ background: "#2563eb" }}
            >
              Share
            </button>

            <button
              onClick={() => setShow3d(!show3d)}
              style={{ background: show3d ? "#16a34a" : "#444" }}
            >
              {show3d ? "Hide 3D" : "3D Preview"}
            </button>

            <button
              onClick={() => {
                updateSource(DEFAULT_FILE);
                window.location.hash = "";
              }}
              style={{ background: "#888" }}
            >
              Reset
            </button>
          </div>

          {showQr && qrDataUrl && (
            <div className="qr-panel">
              <canvas
                ref={canvasRef}
                width={200}
                height={200}
              />
              <textarea
                className="share-url"
                rows={2}
                readOnly
                value={shareUrl ?? ""}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
              <button
                style={{
                  marginTop: 8,
                  background: copied ? "#16a34a" : "#2563eb",
                  fontSize: 13,
                  padding: "8px 12px",
                }}
                onClick={() => {
                  if (shareUrl) {
                    navigator.clipboard.writeText(shareUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
              >
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
          )}
        </aside>

        <main className="viewer">
          {show3d && (
            <IsometricPreview
              layers={parsed.layers}
              palette={parsed.palette}
              beadSize={beadSize}
            />
          )}

          <div className="layers">
            {parsed.layers.map((layer) => (
              <LayerView
                key={layer.name}
                layer={layer}
                palette={parsed.palette}
                beadSize={beadSize}
                bwMode={bwMode}
              />
            ))}
          </div>

          <div className="legend">
            {Object.entries(parsed.palette).map(
              ([key, color]) => (
                <div
                  key={key}
                  className="legend-item"
                >
                  <div
                    className="legend-color"
                    style={{
                      background:
                        key === "." ? "transparent" : color,
                    }}
                  />
                  <span>
                    {key} = {color}
                  </span>
                </div>
              ),
            )}

            {Object.entries(parsed.palette)
              .filter(([key]) => key !== ".")
              .map(([key, color]) => (
                <div
                  key={`bw-${key}`}
                  className="bw-legend-item"
                >
                  <strong>{key}</strong> = {color}
                </div>
              ))}
          </div>
        </main>
      </div>
    </>
  );
}
