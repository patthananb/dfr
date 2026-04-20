"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, Badge, Dot, Button, TabGroup } from "@/components/ui";

const TWEAK_DEFAULTS = {
  theme: "dark",
  accent: "amber",
  density: "comfortable",
  showGrid: true,
};

const TweaksContext = createContext({ tweaks: TWEAK_DEFAULTS, setTweaks: () => {} });
export const useTweaks = () => useContext(TweaksContext);

const FleetContext = createContext({
  online: 0,
  total: 0,
  alerts: 0,
  sites: 0,
  setFleetSummary: () => {},
});
export const useFleet = () => useContext(FleetContext);

const NAV = [
  { id: "overview", label: "Overview", icon: "overview", href: "/" },
  { id: "waveforms", label: "Waveforms", icon: "wave", href: "/graph" },
  { id: "sites", label: "Sites", icon: "sites", href: "/sites" },
  { id: "firmware", label: "Firmware", icon: "firmware", href: "/firmware" },
];
const NAV_BOTTOM = [
  { id: "setup", label: "Site Setup", icon: "plus", href: "/sites/setup" },
  { id: "guide", label: "OTA Guide", icon: "book", href: "/firmware/guide" },
];

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark" />
      <span className="brand-title">DFR</span>
      <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: "auto", letterSpacing: "0.1em" }}>v1.4.2</span>
    </div>
  );
}

function Sidebar() {
  const pathname = usePathname() || "/";
  const { online, total, sites } = useFleet();

  const isActive = (href) => {
    if (href === "/") return pathname === "/";
    if (href === "/sites") return pathname === "/sites" || /^\/sites\/[^/]+$/.test(pathname);
    if (href === "/firmware") return pathname === "/firmware";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav className="nav">
      <div className="nav-section">Operate</div>
      {NAV.map((n) => (
        <Link key={n.id} href={n.href} className={`nav-item ${isActive(n.href) ? "active" : ""}`}>
          <Icon name={n.icon} size={14} style={{ color: "inherit" }} />
          <span>{n.label}</span>
          {n.id === "overview" && total > 0 && (
            <span className="nav-badge">{online}/{total}</span>
          )}
          {n.id === "sites" && sites > 0 && <span className="nav-badge">{sites}</span>}
        </Link>
      ))}
      <div className="nav-section" style={{ marginTop: 16 }}>Configure</div>
      {NAV_BOTTOM.map((n) => (
        <Link key={n.id} href={n.href} className={`nav-item ${isActive(n.href) ? "active" : ""}`}>
          <Icon name={n.icon} size={14} />
          <span>{n.label}</span>
        </Link>
      ))}
      <div style={{ flex: 1 }} />
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>
        <div>DFR · v1.4.2</div>
        <div style={{ marginTop: 4, color: "var(--dim)" }}>Next.js · App Router</div>
      </div>
    </nav>
  );
}

function Topbar({ onToggleTheme, theme, onOpenTweaks }) {
  const [now, setNow] = useState(null);
  const { online, total, alerts } = useFleet();

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const pad = (n) => String(n).padStart(2, "0");
  const time = now
    ? `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())} UTC`
    : "--:--:-- UTC";

  const fleetPct = total ? Math.round((online / total) * 100) : 0;
  const fleetTone = total === 0 ? "" : fleetPct >= 90 ? "ok" : fleetPct >= 75 ? "warn" : "alert";

  return (
    <div className="topbar">
      <div className="topbar-item topbar-kv">
        <span className="k">ENV</span>
        <span className="v">production</span>
      </div>
      <div className="topbar-item topbar-kv">
        <span className="k">FLEET</span>
        <Dot tone={fleetTone} />
        <span className="v">{online}/{total} online</span>
      </div>
      <div className="topbar-item topbar-kv">
        <span className="k">ALERTS</span>
        {alerts > 0 ? <Badge tone="alert">{alerts} critical</Badge> : <span className="v">none</span>}
      </div>
      <div className="topbar-item topbar-kv">
        <span className="k">SAMPLING</span>
        <span className="v">1.00 kHz</span>
      </div>
      <div className="topbar-spacer" />
      <div className="topbar-item topbar-kv">
        <span className="k">UTC</span>
        <span className="v">{time}</span>
      </div>
      <Button variant="ghost" size="sm" onClick={onToggleTheme} title="Toggle theme">
        <Icon name={theme === "dark" ? "sun" : "moon"} size={12} />
      </Button>
      <Button variant="ghost" size="sm" onClick={onOpenTweaks} title="Tweaks">
        <Icon name="cog" size={12} />
      </Button>
    </div>
  );
}

function TweaksPanel({ open, onClose, state, setState }) {
  if (!open) return null;
  const set = (k, v) => setState((s) => ({ ...s, [k]: v }));
  return (
    <div className="tweaks">
      <div className="tweaks-head">
        <span className="t-kicker">Tweaks</span>
        <Button variant="ghost" size="sm" onClick={onClose}><Icon name="close" size={12} /></Button>
      </div>
      <div className="tweaks-body">
        <div className="tweaks-row">
          <span className="lbl">Theme</span>
          <TabGroup
            value={state.theme}
            onChange={(v) => set("theme", v)}
            options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }]}
          />
        </div>
        <div className="tweaks-row">
          <span className="lbl">Accent</span>
          <TabGroup
            value={state.accent}
            onChange={(v) => set("accent", v)}
            options={[
              { value: "amber", label: "Amber" },
              { value: "cyan", label: "Cyan" },
              { value: "green", label: "Green" },
            ]}
          />
        </div>
        <div className="tweaks-row">
          <span className="lbl">Density</span>
          <TabGroup
            value={state.density}
            onChange={(v) => set("density", v)}
            options={[
              { value: "compact", label: "Compact" },
              { value: "comfortable", label: "Std" },
              { value: "roomy", label: "Roomy" },
            ]}
          />
        </div>
        <div className="tweaks-row">
          <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={state.showGrid}
              onChange={(e) => set("showGrid", e.target.checked)}
            />
            <span>Scope graticule</span>
          </label>
        </div>
      </div>
    </div>
  );
}

function FleetPoller({ setFleetSummary }) {
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [statusRes, sitesRes, faultsRes] = await Promise.all([
          fetch("/api/status", { cache: "no-store" }),
          fetch("/api/sites", { cache: "no-store" }),
          fetch("/api/faults", { cache: "no-store" }),
        ]);
        const statusData = statusRes.ok ? await statusRes.json() : { statuses: {} };
        const sitesData = sitesRes.ok ? await sitesRes.json() : { sites: [] };
        const faultsData = faultsRes.ok ? await faultsRes.json() : { faults: [] };
        if (cancelled) return;
        const statuses = statusData.statuses || {};
        const ids = Object.keys(statuses);
        const online = ids.filter((id) => statuses[id]?.online).length;
        const sites = Array.isArray(sitesData.sites) ? sitesData.sites.length : 0;
        const faults = Array.isArray(faultsData.faults) ? faultsData.faults : [];
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const alerts = faults.filter((f) => {
          const stamp = `${f.date || ""}T${f.time || "00:00:00"}`;
          const ms = Date.parse(stamp);
          return Number.isFinite(ms) && ms >= dayAgo;
        }).length;
        setFleetSummary({ online, total: ids.length, alerts, sites });
      } catch {
        /* ignore — keep last known summary */
      }
    };
    load();
    const t = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [setFleetSummary]);
  return null;
}

export default function Shell({ children }) {
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
  const [tweaksHydrated, setTweaksHydrated] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [fleet, setFleet] = useState({ online: 0, total: 0, alerts: 0, sites: 0 });

  // Load persisted tweaks after mount (avoids SSR mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem("dfr-tweaks");
      if (raw) setTweaks((prev) => ({ ...prev, ...JSON.parse(raw) }));
    } catch {
      /* ignore */
    }
    setTweaksHydrated(true);
  }, []);

  useEffect(() => {
    if (!tweaksHydrated) return;
    try {
      localStorage.setItem("dfr-tweaks", JSON.stringify(tweaks));
    } catch {
      /* ignore */
    }
  }, [tweaks, tweaksHydrated]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tweaks.theme);
    document.documentElement.setAttribute("data-accent", tweaks.accent);
    document.documentElement.setAttribute("data-density", tweaks.density);
  }, [tweaks]);

  const setFleetSummary = useCallback((next) => {
    setFleet((prev) => ({ ...prev, ...next }));
  }, []);

  const fleetCtx = useMemo(
    () => ({ ...fleet, setFleetSummary }),
    [fleet, setFleetSummary]
  );
  const tweaksCtx = useMemo(() => ({ tweaks, setTweaks }), [tweaks]);

  return (
    <TweaksContext.Provider value={tweaksCtx}>
      <FleetContext.Provider value={fleetCtx}>
        <div className="app">
          <Brand />
          <Topbar
            theme={tweaks.theme}
            onToggleTheme={() =>
              setTweaks((s) => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" }))
            }
            onOpenTweaks={() => setTweaksOpen((v) => !v)}
          />
          <Sidebar />
          <main className="main">{children}</main>
          <FleetPoller setFleetSummary={setFleetSummary} />
          <TweaksPanel
            open={tweaksOpen}
            onClose={() => setTweaksOpen(false)}
            state={tweaks}
            setState={setTweaks}
          />
        </div>
      </FleetContext.Provider>
    </TweaksContext.Provider>
  );
}
