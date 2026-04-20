"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Icon, Kicker, Panel, formatLabel } from "@/components/ui";
import { useTweaks } from "@/components/Shell";

const LIVE_POLL_MS = 3000;

const CHANNELS = [
  { key: "v1", label: "V1", color: "var(--v1)", group: "voltage" },
  { key: "v2", label: "V2", color: "var(--v2)", group: "voltage" },
  { key: "v3", label: "V3", color: "var(--v3)", group: "voltage" },
  { key: "i1", label: "I1", color: "var(--i1)", group: "current" },
  { key: "i2", label: "I2", color: "var(--i2)", group: "current" },
  { key: "i3", label: "I3", color: "var(--i3)", group: "current" },
  { key: "A",  label: "A",  color: "var(--aS)", group: "ab" },
  { key: "B",  label: "B",  color: "var(--bS)", group: "ab" },
];

function ScopeTrace({ samples, channels, group, cursor1, cursor2, offset, scale, showGrid }) {
  const W = 900, H = 180, PL = 50, PR = 16, PT = 12, PB = 24;
  const chans = CHANNELS.filter((c) => c.group === group && channels[c.key]);
  const data = samples.slice(offset, offset + scale);
  if (!data.length) return null;

  const yMin = 0, yMax = 4095;
  const x = (i) => PL + (i / Math.max(1, data.length - 1)) * (W - PL - PR);
  const y = (v) => PT + (1 - (v - yMin) / (yMax - yMin)) * (H - PT - PB);

  const gridLines = [];
  if (showGrid) {
    for (let i = 0; i <= 10; i++) {
      const vx = PL + (i / 10) * (W - PL - PR);
      gridLines.push(
        <line key={`gx${i}`} x1={vx} x2={vx} y1={PT} y2={H - PB}
              className={`scope-grid-line ${i % 5 === 0 ? "major" : ""}`} />
      );
    }
    for (let i = 0; i <= 8; i++) {
      const vy = PT + (i / 8) * (H - PT - PB);
      gridLines.push(
        <line key={`gy${i}`} x1={PL} x2={W - PR} y1={vy} y2={vy}
              className={`scope-grid-line ${i === 4 ? "major" : ""}`} />
      );
    }
  }

  const yTicks = [0, 1024, 2048, 3072, 4095];
  const xTicksCount = 6;

  const cxA = PL + cursor1 * (W - PL - PR);
  const cxB = PL + cursor2 * (W - PL - PR);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block" }} preserveAspectRatio="none">
      {gridLines}
      {yTicks.map((v) => (
        <text key={v} x={PL - 6} y={y(v) + 3} textAnchor="end" className="scope-axis-label">{v}</text>
      ))}
      {Array.from({ length: xTicksCount + 1 }).map((_, i) => {
        const n = offset + Math.floor((i / xTicksCount) * (data.length - 1));
        return (
          <text key={i} x={PL + (i / xTicksCount) * (W - PL - PR)} y={H - 6}
                textAnchor="middle" className="scope-axis-label">{n}</text>
        );
      })}
      {chans.map((c) => {
        const d = data
          .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p[c.key] ?? 0).toFixed(1)}`)
          .join(" ");
        return <path key={c.key} d={d} className="scope-trace" style={{ stroke: c.color }} />;
      })}
      <line x1={cxA} x2={cxA} y1={PT} y2={H - PB} stroke="var(--accent)" strokeDasharray="4 3" strokeWidth="1" />
      <line x1={cxB} x2={cxB} y1={PT} y2={H - PB} stroke="var(--info)" strokeDasharray="4 3" strokeWidth="1" />
      <text x={cxA} y={PT + 10} textAnchor="middle" fontSize="9" fill="var(--accent)" fontFamily="var(--mono)">A</text>
      <text x={cxB} y={PT + 10} textAnchor="middle" fontSize="9" fill="var(--info)" fontFamily="var(--mono)">B</text>
    </svg>
  );
}

function ScopeHUD({ samples, sampleRateHz, channels, group, cursor1, cursor2, offset, scale }) {
  const visible = Math.min(scale, Math.max(0, samples.length - offset));
  const idxA = Math.floor(cursor1 * Math.max(0, visible - 1));
  const idxB = Math.floor(cursor2 * Math.max(0, visible - 1));
  const dt = sampleRateHz ? Math.abs(idxB - idxA) / sampleRateHz * 1000 : 0;
  const chans = CHANNELS.filter((c) => c.group === group && channels[c.key]);
  const sA = samples[offset + idxA] || {};
  const sB = samples[offset + idxB] || {};
  return (
    <div style={{
      padding: "10px 16px", borderTop: "1px solid var(--border)", background: "var(--panel-2)",
      display: "grid",
      gridTemplateColumns: `120px repeat(${Math.max(1, chans.length)}, 1fr)`,
      fontSize: 10,
    }}>
      <div>
        <div className="t-mute u-caps">Δ Cursor</div>
        <div style={{ fontSize: 14, color: "var(--accent)" }}>{dt.toFixed(2)} ms</div>
        <div className="t-mute">{Math.abs(idxB - idxA)} samples</div>
      </div>
      {chans.map((c) => (
        <div key={c.key}>
          <div className="row" style={{ gap: 6 }}>
            <span style={{ width: 8, height: 8, background: c.color, display: "inline-block" }} />
            <span style={{ fontWeight: 600 }}>{c.label}</span>
          </div>
          <div className="t-mute">
            A = <span style={{ color: "var(--text)" }}>{Math.round(sA[c.key] || 0)}</span>
            {" · "}
            B = <span style={{ color: "var(--text)" }}>{Math.round(sB[c.key] || 0)}</span>
          </div>
          <div className="t-mute">
            Δ = <span style={{ color: "var(--accent)" }}>{Math.round((sB[c.key] || 0) - (sA[c.key] || 0))}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChannelToggle({ channels, setChannels, group }) {
  const list = CHANNELS.filter((c) => c.group === group);
  return (
    <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
      {list.map((c) => {
        const on = channels[c.key];
        return (
          <label
            key={c.key}
            className={`chan-pill ${on ? "" : "off"}`}
            onClick={() => setChannels((s) => ({ ...s, [c.key]: !s[c.key] }))}
          >
            <span className="swatch" style={{ background: c.color }} />
            <span>{c.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function FloatingTimeControls({ scale, setScale, total, offset, setOffset, maxOff, cursor1, setCursor1, cursor2, setCursor2, sampleRateHz }) {
  const [pos, setPos] = useState({ x: null, y: null });
  const [collapsed, setCollapsed] = useState(false);
  const ref = useRef(null);
  const dragRef = useRef(null);

  // Hydrate from localStorage after mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("dfr-tc-pos");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Number.isFinite(parsed?.x) && Number.isFinite(parsed?.y)) {
          setPos(parsed);
        }
      }
    } catch { /* ignore */ }
    setCollapsed(localStorage.getItem("dfr-tc-collapsed") === "1");
  }, []);

  // Default to bottom-right on first render.
  useEffect(() => {
    if (pos.x == null || pos.y == null) {
      const w = 420, h = 240, margin = 24;
      setPos({
        x: Math.max(8, window.innerWidth - w - margin),
        y: Math.max(8, window.innerHeight - h - margin),
      });
    }
  }, [pos.x, pos.y]);

  useEffect(() => {
    if (pos.x != null) {
      try { localStorage.setItem("dfr-tc-pos", JSON.stringify(pos)); } catch {}
    }
  }, [pos]);

  useEffect(() => {
    try { localStorage.setItem("dfr-tc-collapsed", collapsed ? "1" : "0"); } catch {}
  }, [collapsed]);

  const onDragMove = useCallback((e) => {
    if (!dragRef.current || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const nx = Math.max(8, Math.min(window.innerWidth  - rect.width  - 8, e.clientX - dragRef.current.ox));
    const ny = Math.max(8, Math.min(window.innerHeight - rect.height - 8, e.clientY - dragRef.current.oy));
    setPos({ x: nx, y: ny });
  }, []);
  const onDragEnd = useCallback(() => {
    dragRef.current = null;
    document.removeEventListener("mousemove", onDragMove);
    document.removeEventListener("mouseup", onDragEnd);
  }, [onDragMove]);
  const onDragStart = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    dragRef.current = { ox: e.clientX - rect.left, oy: e.clientY - rect.top };
    document.addEventListener("mousemove", onDragMove);
    document.addEventListener("mouseup", onDragEnd);
    e.preventDefault();
  };

  const resetPos = () => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const margin = 24;
    setPos({
      x: Math.max(8, window.innerWidth - rect.width - margin),
      y: Math.max(8, window.innerHeight - rect.height - margin),
    });
  };

  const dtA = offset + Math.floor(cursor1 * scale);
  const dtB = offset + Math.floor(cursor2 * scale);

  return (
    <div ref={ref} className="tc-float" style={{ left: pos.x ?? -9999, top: pos.y ?? -9999 }}>
      <div className="tc-head" onMouseDown={onDragStart}>
        <span className="tc-grip" aria-hidden>
          <span /><span /><span /><span /><span /><span />
        </span>
        <span className="t-kicker" style={{ color: "var(--accent)" }}>Time Controls</span>
        <span className="t-mono-xs t-mute" style={{ marginLeft: 10 }}>
          n={offset}–{offset + scale}
        </span>
        <div style={{ flex: 1 }} />
        <button className="tc-iconbtn" onClick={resetPos} title="Reset position">
          <Icon name="pin" size={11} />
        </button>
        <button className="tc-iconbtn" onClick={() => setCollapsed((v) => !v)} title={collapsed ? "Expand" : "Collapse"}>
          <Icon name={collapsed ? "chevron" : "close"} size={11} />
        </button>
      </div>
      {!collapsed && (
        <div className="tc-body">
          <div className="tc-row">
            <div className="tc-row-head">
              <span className="field-label">Window</span>
              <span className="t-mono-xs t-mute">{scale} samples</span>
            </div>
            <input className="range" type="range" min={Math.min(50, total)} max={Math.max(50, total)} step={10}
                   value={scale} onChange={(e) => setScale(Number(e.target.value))} />
          </div>
          <div className="tc-row">
            <div className="tc-row-head">
              <span className="field-label">Offset</span>
              <span className="t-mono-xs t-mute">n = {offset}</span>
            </div>
            <div className="tc-offset-row">
              <button className="tc-stepbtn" onClick={() => setOffset(Math.max(0, offset - 10))}>−</button>
              <input className="range" type="range" min={0} max={Math.max(0, maxOff)} step={1}
                     value={Math.min(offset, maxOff)}
                     onChange={(e) => setOffset(Number(e.target.value))} />
              <button className="tc-stepbtn" onClick={() => setOffset(Math.min(maxOff, offset + 10))}>+</button>
            </div>
          </div>
          <div className="tc-row">
            <div className="tc-row-head">
              <span className="field-label" style={{ color: "var(--accent)" }}>Cursor A</span>
              <span className="t-mono-xs" style={{ color: "var(--accent)" }}>n = {dtA}</span>
            </div>
            <input className="range tc-rangeA" type="range" min={0} max={1} step={0.001}
                   value={cursor1} onChange={(e) => setCursor1(Number(e.target.value))} />
          </div>
          <div className="tc-row">
            <div className="tc-row-head">
              <span className="field-label" style={{ color: "var(--info)" }}>Cursor B</span>
              <span className="t-mono-xs" style={{ color: "var(--info)" }}>n = {dtB}</span>
            </div>
            <input className="range tc-rangeB" type="range" min={0} max={1} step={0.001}
                   value={cursor2} onChange={(e) => setCursor2(Number(e.target.value))} />
          </div>
          <div className="tc-footer">
            <span className="t-mono-xs t-mute">
              Δn = <span style={{ color: "var(--accent)" }}>{Math.abs(dtB - dtA)}</span>
              <span style={{ margin: "0 6px" }}>·</span>
              Δt = <span style={{ color: "var(--accent)" }}>
                {sampleRateHz ? (Math.abs(dtB - dtA) / sampleRateHz * 1000).toFixed(2) : "—"} ms
              </span>
            </span>
            <div style={{ flex: 1 }} />
            <button
              className="btn ghost sm"
              onClick={() => { setOffset(0); setScale(total); setCursor1(0.38); setCursor2(0.62); }}
            >Reset</button>
          </div>
        </div>
      )}
    </div>
  );
}

function exportCsv(filename, samples) {
  if (!samples?.length) return;
  const headers = ["n", "v1", "v2", "v3", "i1", "i2", "i3", "A", "B"];
  const lines = [headers.join(",")];
  for (const p of samples) {
    lines.push(headers.map((k) => p[k] ?? "").join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = (filename || "waveform") + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function Waveforms() {
  const searchParams = useSearchParams();
  const fileParam = searchParams.get("file");
  const { tweaks } = useTweaks();
  const showGrid = tweaks.showGrid;

  const [filenames, setFilenames] = useState([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [meta, setMeta] = useState({ faultType: "", faultLocation: "", date: "", time: "", sampleRateHz: 1000 });
  const [samples, setSamples] = useState([]);

  const [channels, setChannels] = useState({
    v1: true, v2: true, v3: true, i1: true, i2: true, i3: true, A: true, B: true,
  });
  const [scale, setScale] = useState(0);
  const [offset, setOffset] = useState(0);
  const [cursor1, setCursor1] = useState(0.38);
  const [cursor2, setCursor2] = useState(0.62);

  const [liveMode, setLiveMode] = useState(false);
  const liveRef = useRef(null);
  const lastLiveFile = useRef("");

  const total = samples.length;
  const maxOff = Math.max(0, total - scale);

  const loadFileData = useCallback(async (filename) => {
    if (!filename) return;
    try {
      const res = await fetch(`/api/data?file=${encodeURIComponent(filename)}`);
      const result = await res.json();
      if (!result.success || !result.files?.[0]) return;
      const json = JSON.parse(result.files[0]);
      if (!Array.isArray(json.data)) return;
      setMeta({
        faultType: json.faultType || "",
        faultLocation: json.faultLocation || "",
        date: json.date || "",
        time: json.time || "",
        sampleRateHz: json.sampleRateHz || 1000,
      });
      setSamples(json.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  }, []);

  // Reset window when file changes (manual mode only).
  useEffect(() => {
    if (liveMode) return;
    setOffset(0);
    setScale(total || 0);
    setCursor1(0.38);
    setCursor2(0.62);
  }, [selectedFile, liveMode, total]);

  // Fetch filename list.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/data");
        const data = await res.json();
        if (cancelled || !data.success) return;
        const files = (data.filenames || []).filter((n) => n !== ".gitkeep");
        setFilenames(files);
        if (files.length > 0) {
          if (fileParam && files.includes(fileParam)) setSelectedFile(fileParam);
          else setSelectedFile((prev) => prev || files[0]);
        }
      } catch (err) {
        console.error("Error fetching filenames:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [fileParam]);

  // Manual-mode file load.
  useEffect(() => {
    if (!liveMode && selectedFile) loadFileData(selectedFile);
  }, [selectedFile, liveMode, loadFileData]);

  // Live mode polling.
  useEffect(() => {
    if (!liveMode) {
      if (liveRef.current) {
        clearInterval(liveRef.current);
        liveRef.current = null;
      }
      return;
    }
    const poll = async () => {
      try {
        const res = await fetch("/api/data?latest=adc_live");
        const data = await res.json();
        if (data.success && data.latestFile && data.latestFile !== lastLiveFile.current) {
          lastLiveFile.current = data.latestFile;
          setSelectedFile(data.latestFile);
          await loadFileData(data.latestFile);
        }
      } catch (err) {
        console.error("Live poll error:", err);
      }
    };
    poll();
    liveRef.current = setInterval(poll, LIVE_POLL_MS);
    return () => {
      if (liveRef.current) {
        clearInterval(liveRef.current);
        liveRef.current = null;
      }
    };
  }, [liveMode, loadFileData]);

  // Clamp offset when scale changes.
  useEffect(() => {
    if (offset > maxOff) setOffset(maxOff);
  }, [scale, maxOff, offset]);

  const sections = useMemo(
    () => [
      { group: "voltage", title: "Voltage · V1 / V2 / V3" },
      { group: "current", title: "Current · I1 / I2 / I3" },
      { group: "ab",      title: "A / B Signals" },
    ],
    []
  );

  return (
    <div className="main-inner col" style={{ gap: 20 }}>
      <div className="row between">
        <div>
          <Kicker>Waveforms</Kicker>
          <div className="t-h1" style={{ marginTop: 4 }}>
            Scope · {formatLabel(meta.faultType) || "—"}
          </div>
          <div className="t-mono-xs t-mute" style={{ marginTop: 2 }}>
            {formatLabel(meta.faultLocation) || "—"}
            {meta.date ? ` · ${meta.date}` : ""}
            {meta.time ? ` ${meta.time}` : ""}
            {selectedFile ? <> · <span className="code">{selectedFile}</span></> : null}
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Button
            size="sm"
            variant={liveMode ? "primary" : ""}
            onClick={() => setLiveMode((v) => !v)}
          >
            <Icon name={liveMode ? "pause" : "play"} size={11} /> {liveMode ? "LIVE" : "Live ADC"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => exportCsv(selectedFile, samples)}
            disabled={!samples.length}
          >
            <Icon name="download" size={11} /> Export CSV
          </Button>
        </div>
      </div>

      <div
        className="panel"
        style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 16, alignItems: "center", padding: 12 }}
      >
        <div>
          <div className="field-label" style={{ marginBottom: 4 }}>Capture File</div>
          <select
            className="select"
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
            disabled={liveMode || filenames.length === 0}
          >
            {filenames.length === 0 && <option value="">No captures</option>}
            {filenames.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div style={{ fontSize: 10 }}>
          <div className="field-label" style={{ marginBottom: 4 }}>Sample Rate</div>
          <div><span className="code">{meta.sampleRateHz || "—"} Hz</span></div>
        </div>
        <div style={{ fontSize: 10 }}>
          <div className="field-label" style={{ marginBottom: 4 }}>Samples</div>
          <div><span className="code">{total}</span></div>
        </div>
        <div style={{ fontSize: 10 }}>
          <div className="field-label" style={{ marginBottom: 4 }}>Duration</div>
          <div>
            <span className="code">
              {meta.sampleRateHz ? (total / meta.sampleRateHz).toFixed(3) : "—"} s
            </span>
          </div>
        </div>
      </div>

      {samples.length === 0 ? (
        <Panel title="Scope">
          <div className="t-mute" style={{ padding: 24, textAlign: "center" }}>
            {filenames.length === 0
              ? "No capture files yet — devices will appear here once they upload data."
              : "Loading capture…"}
          </div>
        </Panel>
      ) : (
        sections.map((sec) => (
          <Panel
            key={sec.group}
            title={sec.title}
            right={<ChannelToggle channels={channels} setChannels={setChannels} group={sec.group} />}
            bodyClass="p0"
          >
            <div className="scope">
              <ScopeTrace
                samples={samples}
                channels={channels}
                group={sec.group}
                cursor1={cursor1}
                cursor2={cursor2}
                offset={offset}
                scale={scale || total}
                showGrid={showGrid}
              />
            </div>
            <ScopeHUD
              samples={samples}
              sampleRateHz={meta.sampleRateHz}
              channels={channels}
              group={sec.group}
              cursor1={cursor1}
              cursor2={cursor2}
              offset={offset}
              scale={scale || total}
            />
          </Panel>
        ))
      )}

      {samples.length > 0 && (
        <FloatingTimeControls
          scale={scale || total}
          setScale={setScale}
          total={total}
          offset={offset}
          setOffset={setOffset}
          maxOff={maxOff}
          cursor1={cursor1}
          setCursor1={setCursor1}
          cursor2={cursor2}
          setCursor2={setCursor2}
          sampleRateHz={meta.sampleRateHz}
        />
      )}
    </div>
  );
}

export default function GraphPage() {
  return (
    <Suspense fallback={<div className="main-inner t-mute">Loading…</div>}>
      <Waveforms />
    </Suspense>
  );
}
