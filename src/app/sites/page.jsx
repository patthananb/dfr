"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Dot, Icon, Kicker, Panel, Toast, formatRelTime } from "@/components/ui";

const TARGET_FW = "1.4.2";

export default function SitesPage() {
  const router = useRouter();
  const [sites, setSites] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [faults, setFaults] = useState([]);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState(null);

  const loadAll = async () => {
    try {
      const [sitesRes, statusRes, faultsRes] = await Promise.all([
        fetch("/api/sites"),
        fetch("/api/status"),
        fetch("/api/faults"),
      ]);
      if (sitesRes.ok) {
        const data = await sitesRes.json();
        setSites(Array.isArray(data.sites) ? data.sites : []);
      }
      if (statusRes.ok) {
        const data = await statusRes.json();
        setStatuses(data.statuses || {});
      }
      if (faultsRes.ok) {
        const data = await faultsRes.json();
        setFaults(Array.isArray(data.faults) ? data.faults : []);
      }
    } catch (err) {
      console.error(err);
      setToast({ message: "Unable to load sites", tone: "error" });
    }
  };

  useEffect(() => {
    loadAll();
    const t = setInterval(loadAll, 15000);
    return () => clearInterval(t);
  }, []);

  const removeSite = async (siteId, siteName) => {
    if (!window.confirm(`Remove ${siteName}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/sites?id=${siteId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to remove site");
      setSites(Array.isArray(data.sites) ? data.sites : []);
      setToast({ message: `Removed ${siteName}`, tone: "success" });
    } catch (err) {
      setToast({ message: err.message || "Unable to remove site", tone: "error" });
    }
  };

  const lastFaultBySite = useMemo(() => {
    const map = {};
    for (const f of faults) {
      const stamp = `${f.date || ""}T${f.time || "00:00:00"}`;
      const ms = Date.parse(stamp);
      if (!Number.isFinite(ms)) continue;
      if (!map[f.site] || ms > map[f.site].ms) map[f.site] = { ms, raw: f };
    }
    return map;
  }, [faults]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return sites.filter((s) => !q || (s.name || "").toLowerCase().includes(q));
  }, [sites, query]);

  return (
    <div className="main-inner col" style={{ gap: 20 }}>
      <div className="row between">
        <div>
          <Kicker>Sites</Kicker>
          <div className="t-h1" style={{ marginTop: 4 }}>Sites & Devices</div>
          <div className="t-mono-xs t-mute" style={{ marginTop: 2 }}>
            {sites.length} site{sites.length === 1 ? "" : "s"} registered
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <input
            className="input"
            style={{ width: 220 }}
            placeholder="Search sites…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Link href="/sites/setup">
            <Button variant="primary" size="sm">
              <Icon name="plus" size={11} /> New Site
            </Button>
          </Link>
        </div>
      </div>

      <Panel bodyClass="p0">
        {filtered.length === 0 ? (
          <div className="empty">
            {sites.length === 0
              ? "No sites configured yet. Register your first site in setup."
              : "No sites match the current search."}
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 22 }}></th>
                <th>Site</th>
                <th>SSID</th>
                <th className="right">Devices</th>
                <th className="right">Online</th>
                <th>FW Compliance</th>
                <th>Last Fault</th>
                <th className="right"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const devices = s.devices || [];
                const total = devices.length;
                const online = devices.filter((d) => statuses[d.id]?.online).length;
                const onTarget = devices.filter((d) => statuses[d.id]?.firmwareVersion === TARGET_FW).length;
                const pct = total ? Math.round((onTarget / total) * 100) : 0;
                const lf = lastFaultBySite[s.name];
                const tone = total === 0 ? "off" : online === total ? "ok" : online === 0 ? "alert" : "warn";
                return (
                  <tr
                    key={s.id}
                    onClick={() => router.push(`/sites/${s.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td><Dot tone={tone} /></td>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td className="t-mute"><span className="code">{s.wifi?.ssid || "—"}</span></td>
                    <td className="num">{total}</td>
                    <td className="num">
                      <span style={{ color: total > 0 && online === total ? "var(--ok)" : "var(--accent)" }}>
                        {online}
                      </span>
                      /{total}
                    </td>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <div className="progress" style={{ width: 80 }}>
                          <div className="progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="t-mono-xs t-mute">{pct}%</span>
                      </div>
                    </td>
                    <td className="t-mute t-mono-xs">
                      {lf ? `${lf.raw.date} ${lf.raw.time}` : "—"}
                    </td>
                    <td className="right" onClick={(e) => e.stopPropagation()}>
                      <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => removeSite(s.id, s.name)}
                          title="Remove site"
                        >
                          <Icon name="trash" size={11} />
                        </button>
                        <Icon name="chevron" size={12} style={{ color: "var(--muted)" }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>

      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}
