"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, Dot, Icon, Kicker, Metric, Panel, formatLabel } from "@/components/ui";

const TARGET_FW = "1.4.2";

function classifyDevice(status, hasRecentFault) {
  if (!status?.online) return "off";
  if (hasRecentFault) return "alert";
  if (status.firmwareVersion && status.firmwareVersion !== TARGET_FW) return "warn";
  if (typeof status.rssi === "number" && status.rssi < -75) return "warn";
  return "ok";
}

function FleetGrid({ devices, statuses, faults }) {
  const recent = useMemo(() => {
    const cutoff = Date.now() - 60 * 60 * 1000;
    const set = new Set();
    for (const f of faults) {
      const ms = Date.parse(`${f.date || ""}T${f.time || "00:00:00"}`);
      if (Number.isFinite(ms) && ms >= cutoff && f.device) set.add(f.device);
    }
    return set;
  }, [faults]);

  return (
    <div className="fleet-grid">
      {devices.map((d) => {
        const status = statuses[d.id] || {};
        const cls = classifyDevice(status, recent.has(d.id));
        return (
          <Link
            key={d.id}
            href={`/sites/${d.siteId}`}
            className={`fleet-cell ${cls}`}
            title={`${d.id} · ${d.siteName}`}
          >
            {d.id.slice(-4)}
          </Link>
        );
      })}
    </div>
  );
}

function AlertFeed({ faults }) {
  if (faults.length === 0) {
    return <div className="empty">No alerts in the recent window.</div>;
  }
  return (
    <div>
      {faults.slice(0, 8).map((f) => {
        const tone = f.severity === "critical" ? "alert" : f.severity === "major" ? "warn" : "";
        const text =
          f.severity === "critical"
            ? `Critical fault on ${f.site || formatLabel(f.faultLocation)} · ${formatLabel(f.faultType)}`
            : `${formatLabel(f.faultType)} on ${f.site || formatLabel(f.faultLocation)}`;
        return (
          <div
            key={f.file}
            style={{
              display: "grid",
              gridTemplateColumns: "8px 70px 1fr",
              gap: 12,
              alignItems: "center",
              padding: "8px 16px",
              borderBottom: "1px solid var(--border)",
              fontSize: 12,
            }}
          >
            <Dot tone={tone} />
            <span className="t-mono-xs t-mute">{(f.time || "").slice(0, 8)}</span>
            <span>
              {text}
              {f.device && <span className="code" style={{ marginLeft: 8 }}>{f.device}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MiniWaveform({ samples }) {
  const W = 900,
    H = 120;
  if (!samples?.length) {
    return (
      <div className="empty" style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
        No waveform available.
      </div>
    );
  }
  const channels = [
    { k: "v1", color: "var(--v1)" },
    { k: "v2", color: "var(--v2)" },
    { k: "v3", color: "var(--v3)" },
    { k: "i1", color: "var(--i1)" },
  ];
  const len = samples.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 120, display: "block" }} preserveAspectRatio="none">
      {channels.map((c) => {
        const d = samples
          .map((p, i) => {
            const x = (i / (len - 1)) * W;
            const v = typeof p[c.k] === "number" ? p[c.k] : 2047;
            const y = H / 2 - ((v - 2047) / 2048) * (H / 2 - 8);
            return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(" ");
        return <path key={c.k} d={d} fill="none" stroke={c.color} strokeWidth="1" opacity="0.85" />;
      })}
    </svg>
  );
}

function LatestFaultPanel({ fault, samples, onOpen }) {
  if (!fault) {
    return (
      <Panel title="Latest Fault" bodyClass="p0">
        <div className="empty">All systems operational. No faults recorded.</div>
      </Panel>
    );
  }
  return (
    <div style={{ border: "1px solid var(--border)", background: "var(--panel)" }}>
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
        <div
          style={{
            padding: "14px 16px",
            borderRight: "1px solid var(--border)",
            background: "var(--alert-lo)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Dot tone="alert" />
          <span className="t-kicker" style={{ color: "var(--alert)" }}>Latest Fault</span>
        </div>
        <div style={{ flex: 1, padding: "10px 16px", display: "flex", alignItems: "center", gap: 20, fontSize: 11, flexWrap: "wrap" }}>
          <span className="inline-kv"><span className="k">Type</span><span className="v">{formatLabel(fault.faultType)}</span></span>
          <span className="inline-kv"><span className="k">Location</span><span className="v">{formatLabel(fault.faultLocation)}</span></span>
          {fault.site && <span className="inline-kv"><span className="k">Site</span><span className="v">{fault.site}</span></span>}
          {fault.device && <span className="inline-kv"><span className="k">Device</span><span className="v code">{fault.device}</span></span>}
          <span className="inline-kv"><span className="k">When</span><span className="v">{fault.date} {fault.time}</span></span>
          <div style={{ flex: 1 }} />
          <Button variant="primary" size="sm" onClick={onOpen}>
            Open Waveform <Icon name="arrow" size={12} />
          </Button>
        </div>
      </div>
      <div style={{ padding: 16, paddingBottom: 8 }}>
        <MiniWaveform samples={samples} />
      </div>
    </div>
  );
}

function FirmwareDistribution({ devices, statuses }) {
  const dist = {};
  devices.forEach((d) => {
    const v = statuses[d.id]?.firmwareVersion || "unknown";
    dist[v] = (dist[v] || 0) + 1;
  });
  const total = devices.length || 1;
  const entries = Object.entries(dist).sort((a, b) => b[1] - a[1]);
  return (
    <div className="col" style={{ gap: 10 }}>
      {entries.length === 0 && <div className="empty">No devices reporting yet.</div>}
      {entries.map(([v, c]) => {
        const pct = Math.round((c / total) * 100);
        const isTarget = v === TARGET_FW;
        return (
          <div key={v}>
            <div className="row between" style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 11 }}>
                <span className="code" style={{ color: isTarget ? "var(--accent)" : "var(--text)" }}>{v}</span>
                {isTarget && <span className="t-mono-xs t-mute" style={{ marginLeft: 8 }}>TARGET</span>}
              </span>
              <span className="t-mono-xs t-mute">{c}/{total} · {pct}%</span>
            </div>
            <div className="progress">
              <div
                className="progress-fill"
                style={{ width: `${pct}%`, background: isTarget ? "var(--accent)" : "var(--border-2)" }}
              />
            </div>
          </div>
        );
      })}
      <div className="sep" />
      <div className="row between t-mono-xs t-mute">
        <span>Next check-in window</span>
        <span>≤ 5 min</span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [sites, setSites] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [faults, setFaults] = useState([]);
  const [latestSamples, setLatestSamples] = useState(null);
  const [latestFile, setLatestFile] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [sitesRes, statusRes, faultsRes] = await Promise.all([
          fetch("/api/sites", { cache: "no-store" }),
          fetch("/api/status", { cache: "no-store" }),
          fetch("/api/faults", { cache: "no-store" }),
        ]);
        if (cancelled) return;
        const sitesJson = sitesRes.ok ? await sitesRes.json() : { sites: [] };
        const statusJson = statusRes.ok ? await statusRes.json() : { statuses: {} };
        const faultsJson = faultsRes.ok ? await faultsRes.json() : { faults: [] };
        setSites(Array.isArray(sitesJson.sites) ? sitesJson.sites : []);
        setStatuses(statusJson.statuses || {});
        setFaults(Array.isArray(faultsJson.faults) ? faultsJson.faults : []);
      } catch {
        /* ignore */
      }
    };
    load();
    const t = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  // Latest fault waveform preview — fetch the file content
  const latest = faults[0];
  useEffect(() => {
    if (!latest?.file) {
      setLatestSamples(null);
      setLatestFile("");
      return;
    }
    if (latest.file === latestFile) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/data?file=${encodeURIComponent(latest.file)}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        if (json.success && json.files?.[0]) {
          const parsed = JSON.parse(json.files[0]);
          if (Array.isArray(parsed.data)) {
            const stride = Math.max(1, Math.floor(parsed.data.length / 500));
            const downsampled = parsed.data.filter((_, i) => i % stride === 0);
            setLatestSamples(downsampled);
            setLatestFile(latest.file);
          }
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [latest?.file, latestFile]);

  const allDevices = useMemo(() => {
    const list = [];
    for (const s of sites) {
      for (const d of s.devices || []) {
        list.push({ id: d.id, siteId: s.id, siteName: s.name });
      }
    }
    return list;
  }, [sites]);

  const total = allDevices.length;
  const online = allDevices.filter((d) => statuses[d.id]?.online).length;
  const onTargetFW = allDevices.filter((d) => statuses[d.id]?.firmwareVersion === TARGET_FW).length;
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const faults24h = faults.filter((f) => {
    const ms = Date.parse(`${f.date || ""}T${f.time || "00:00:00"}`);
    return Number.isFinite(ms) && ms >= dayAgo;
  }).length;
  const rssiSamples = allDevices
    .map((d) => statuses[d.id]?.rssi)
    .filter((v) => typeof v === "number");
  const avgRssi = rssiSamples.length
    ? Math.round(rssiSamples.reduce((a, b) => a + b, 0) / rssiSamples.length)
    : null;

  return (
    <div className="main-inner col" style={{ gap: 24 }}>
      <div className="row between">
        <div>
          <Kicker>Overview</Kicker>
          <div className="t-h1" style={{ marginTop: 4 }}>Fleet Monitor</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Link href="/graph" className="btn ghost sm">
            <Icon name="download" size={12} /> Export
          </Link>
          <Link href="/graph" className="btn sm">
            <Icon name="play" size={12} /> Live ADC
          </Link>
        </div>
      </div>

      <div className="panel" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
        <Metric
          label="Devices Online"
          value={`${online}`}
          unit={`/ ${total}`}
          flavor={total > 0 && online === total ? "" : "amber"}
          delta={total > 0 ? { dir: "down", text: `${total - online} offline` } : { text: "No devices yet" }}
        />
        <div className="sep-v" />
        <Metric
          label="Faults · 24h"
          value={faults24h}
          flavor={faults24h > 0 ? "alert" : ""}
          delta={{ text: `${faults.length} total recorded` }}
        />
        <div className="sep-v" />
        <Metric
          label="FW on Target"
          value={onTargetFW}
          unit={`/ ${total}`}
          delta={{ text: `Target: ${TARGET_FW}` }}
        />
        <div className="sep-v" />
        <Metric
          label="Avg RSSI"
          value={avgRssi != null ? avgRssi : "—"}
          unit={avgRssi != null ? "dBm" : ""}
          delta={{ text: avgRssi != null ? "Across online devices" : "Awaiting heartbeats" }}
        />
      </div>

      <LatestFaultPanel
        fault={latest ? { ...latest } : null}
        samples={latestSamples}
        onOpen={() => {
          if (typeof window !== "undefined" && latest?.file) {
            window.location.href = `/graph?file=${encodeURIComponent(latest.file)}`;
          } else {
            window.location.href = "/graph";
          }
        }}
      />

      <div className="grid g2">
        <Panel
          title="Fleet Health"
          right={
            <div className="row" style={{ gap: 12, fontSize: 10, color: "var(--muted)" }}>
              <span><span className="dot ok" style={{ marginRight: 4 }} /> Healthy</span>
              <span><span className="dot warn" style={{ marginRight: 4 }} /> Degraded</span>
              <span><span className="dot alert" style={{ marginRight: 4 }} /> Fault</span>
              <span><span className="dot" style={{ marginRight: 4 }} /> Offline</span>
            </div>
          }
          bodyClass="p0"
        >
          {allDevices.length === 0 ? (
            <div className="empty">No devices registered. <Link href="/sites/setup">Register a site →</Link></div>
          ) : (
            <FleetGrid devices={allDevices} statuses={statuses} faults={faults} />
          )}
        </Panel>

        <Panel title="Alert Feed · Today" right={<span className="t-mono-xs t-mute">Live</span>} bodyClass="p0">
          <AlertFeed faults={faults} />
        </Panel>
      </div>

      <div className="grid g2">
        <Panel
          title="Recent Faults"
          bodyClass="p0"
          right={<Link href="/graph">View all →</Link>}
        >
          {faults.length === 0 ? (
            <div className="empty">No faults recorded.</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Site</th>
                  <th>Device</th>
                  <th className="right">When</th>
                </tr>
              </thead>
              <tbody>
                {faults.slice(0, 6).map((f) => (
                  <tr
                    key={f.file}
                    onClick={() => {
                      window.location.href = `/graph?file=${encodeURIComponent(f.file)}`;
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <Badge tone={f.severity === "critical" ? "alert" : f.severity === "major" ? "warn" : ""}>
                        {f.severity || "info"}
                      </Badge>
                    </td>
                    <td>{formatLabel(f.faultType)}</td>
                    <td className="t-mute">{formatLabel(f.faultLocation)}</td>
                    <td className="t-mute">{f.site || "—"}</td>
                    <td><span className="code">{f.device || "—"}</span></td>
                    <td className="right t-mute">{f.date} {f.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title={`Firmware Rollout · ${TARGET_FW}`} right={<Link href="/firmware">Manage →</Link>}>
          <FirmwareDistribution devices={allDevices} statuses={statuses} />
        </Panel>
      </div>
    </div>
  );
}
