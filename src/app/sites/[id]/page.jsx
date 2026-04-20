"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Dot,
  Field,
  Icon,
  Kicker,
  Metric,
  Panel,
  Toast,
  formatLabel,
  formatRelTime,
  formatUptime,
} from "@/components/ui";

const TARGET_FW = "1.4.2";
const emptyDevice = { id: "", mac: "" };

export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params?.id;

  const [site, setSite] = useState(null);
  const [statuses, setStatuses] = useState({});
  const [faults, setFaults] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    wifiSsid: "",
    wifiPassword: "",
    devices: [{ ...emptyDevice }],
    hasPassword: false,
  });
  const [toast, setToast] = useState(null);
  const [loadError, setLoadError] = useState("");

  const loadSite = async () => {
    try {
      const res = await fetch("/api/sites");
      if (!res.ok) throw new Error("Failed to load sites");
      const data = await res.json();
      const sites = Array.isArray(data.sites) ? data.sites : [];
      const found = sites.find((s) => s.id === siteId);
      if (!found) {
        setLoadError("Site not found.");
        setSite(null);
        return;
      }
      setLoadError("");
      setSite(found);
      setEditForm({
        name: found.name || "",
        wifiSsid: found.wifi?.ssid || "",
        wifiPassword: "",
        devices: found.devices?.length ? found.devices.map((d) => ({ ...d })) : [{ ...emptyDevice }],
        hasPassword: !!found.wifi?.hasPassword,
      });
    } catch (err) {
      console.error(err);
      setLoadError("Unable to load site.");
    }
  };

  const loadStatuses = async () => {
    try {
      const res = await fetch("/api/status");
      if (!res.ok) return;
      const data = await res.json();
      setStatuses(data.statuses || {});
    } catch { /* ignore */ }
  };

  const loadFaults = async (siteName) => {
    try {
      const res = await fetch(`/api/faults?site=${encodeURIComponent(siteName)}`);
      if (!res.ok) return;
      const data = await res.json();
      setFaults(Array.isArray(data.faults) ? data.faults : []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!siteId) return;
    loadSite();
    loadStatuses();
    const t = setInterval(loadStatuses, 15000);
    return () => clearInterval(t);
  }, [siteId]);

  useEffect(() => {
    if (site?.name) loadFaults(site.name);
  }, [site?.name]);

  const devices = useMemo(() => {
    if (!site) return [];
    return (site.devices || []).map((d) => ({ ...d, status: statuses[d.id] || {} }));
  }, [site, statuses]);

  const online = devices.filter((d) => d.status.online).length;
  const onTarget = devices.filter((d) => d.status.firmwareVersion === TARGET_FW).length;
  const avgRssi = devices.length
    ? Math.round(devices.reduce((a, d) => a + (d.status.rssi || 0), 0) / devices.length)
    : 0;

  const updateDeviceField = (index, field, value) => {
    setEditForm((prev) => ({
      ...prev,
      devices: prev.devices.map((d, i) => (i === index ? { ...d, [field]: value } : d)),
    }));
  };

  const addDeviceRow = () =>
    setEditForm((prev) => ({ ...prev, devices: [...prev.devices, { ...emptyDevice }] }));

  const removeDeviceRow = (index) =>
    setEditForm((prev) => ({ ...prev, devices: prev.devices.filter((_, i) => i !== index) }));

  const handleSave = async () => {
    const cleaned = editForm.devices
      .map((d) => ({ id: d.id.trim(), mac: d.mac.trim() }))
      .filter((d) => d.id && d.mac);

    if (!editForm.name.trim() || !editForm.wifiSsid.trim()) {
      setToast({ message: "Site name and WiFi SSID are required", tone: "error" });
      return;
    }
    if (cleaned.length === 0) {
      setToast({ message: "Add at least one ESP32 device", tone: "error" });
      return;
    }

    try {
      const res = await fetch("/api/sites", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: siteId,
          name: editForm.name,
          wifi: { ssid: editForm.wifiSsid, password: editForm.wifiPassword },
          devices: cleaned,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update site");
      }
      const data = await res.json();
      const sites = Array.isArray(data.sites) ? data.sites : [];
      const updated = sites.find((s) => s.id === siteId) || null;
      setSite(updated);
      setEditing(false);
      setToast({ message: "Site updated", tone: "success" });
      loadStatuses();
    } catch (err) {
      setToast({ message: err.message || "Unable to update site", tone: "error" });
    }
  };

  const handleRemove = async () => {
    if (!site) return;
    if (!window.confirm(`Remove ${site.name}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/sites?id=${siteId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to remove site");
      }
      router.push("/sites");
    } catch (err) {
      setToast({ message: err.message || "Unable to remove site", tone: "error" });
    }
  };

  if (!site) {
    return (
      <div className="main-inner col" style={{ gap: 16 }}>
        <div className="row" style={{ gap: 12, color: "var(--muted)", fontSize: 11 }}>
          <Link href="/sites" style={{ color: "var(--accent)" }}>
            <Icon name="back" size={11} /> Sites
          </Link>
        </div>
        <Panel>
          <div className="empty">{loadError || "Loading site…"}</div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="main-inner col" style={{ gap: 20 }}>
      <div className="row" style={{ gap: 12, color: "var(--muted)", fontSize: 11 }}>
        <Link href="/sites" style={{ color: "var(--accent)" }}>
          <Icon name="back" size={11} /> Sites
        </Link>
        <span>/</span>
        <span>{site.name}</span>
      </div>

      <div className="row between">
        <div>
          <Kicker>Site</Kicker>
          <div className="t-h1" style={{ marginTop: 4 }}>{site.name}</div>
          <div className="t-mono-xs t-mute" style={{ marginTop: 2 }}>
            SSID <span className="code">{site.wifi?.ssid || "—"}</span> · {devices.length} devices · {online} online
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Button size="sm" variant="ghost" onClick={() => setEditing((v) => !v)}>
            <Icon name="edit" size={11} /> {editing ? "Close Edit" : "Edit"}
          </Button>
          <Link href="/firmware">
            <Button size="sm" variant="ghost">
              <Icon name="firmware" size={11} /> Deploy FW
            </Button>
          </Link>
          <Button size="sm" variant="danger" onClick={handleRemove}>
            <Icon name="trash" size={11} /> Remove
          </Button>
        </div>
      </div>

      <div className="panel" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
        <Metric
          label="Online"
          value={online}
          unit={`/ ${devices.length}`}
          flavor={devices.length > 0 && online === devices.length ? "" : "amber"}
        />
        <div className="sep-v" />
        <Metric label="Avg RSSI" value={avgRssi || "—"} unit={avgRssi ? "dBm" : ""} />
        <div className="sep-v" />
        <Metric label="Faults · 30d" value={faults.length} flavor={faults.length > 3 ? "alert" : ""} />
        <div className="sep-v" />
        <Metric label={`FW ${TARGET_FW}`} value={onTarget} unit={`/ ${devices.length}`} />
      </div>

      <div className="grid g2">
        <Panel title="Devices" bodyClass="p0">
          {devices.length === 0 ? (
            <div className="empty">No devices registered.</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th></th>
                  <th>Device</th>
                  <th>MAC</th>
                  <th>Firmware</th>
                  <th className="num">RSSI</th>
                  <th>Uptime</th>
                  <th>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.id}>
                    <td><Dot tone={d.status.online ? "ok" : "alert"} /></td>
                    <td><span className="code">{d.id}</span></td>
                    <td className="t-mute t-mono-xs">{d.mac}</td>
                    <td>
                      {d.status.firmwareVersion === TARGET_FW ? (
                        <Badge tone="ok">{d.status.firmwareVersion}</Badge>
                      ) : (
                        <Badge tone="warn">{d.status.firmwareVersion || "unknown"}</Badge>
                      )}
                    </td>
                    <td className="num">{d.status.rssi ?? "—"}</td>
                    <td className="t-mute">{formatUptime(d.status.uptime)}</td>
                    <td className="t-mute t-mono-xs">
                      {d.status.lastSeen ? formatRelTime(d.status.lastSeen) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="Fault History" bodyClass="p0">
          {faults.length === 0 ? (
            <div className="empty">No faults recorded for this site.</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Device</th>
                  <th className="right">When</th>
                </tr>
              </thead>
              <tbody>
                {faults.slice(0, 25).map((f) => (
                  <tr
                    key={f.file}
                    style={{ cursor: "pointer" }}
                    onClick={() => router.push(`/graph?file=${encodeURIComponent(f.file)}`)}
                  >
                    <td>{formatLabel(f.faultType)}</td>
                    <td className="t-mute">{formatLabel(f.faultLocation)}</td>
                    <td><span className="code">{f.device || "—"}</span></td>
                    <td className="right t-mute t-mono-xs">{f.date} {f.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      {editing && (
        <Panel title="Edit Site">
          <div className="grid g3">
            <Field label="Site Name">
              <input
                className="input"
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
              />
            </Field>
            <Field label="WiFi SSID">
              <input
                className="input"
                value={editForm.wifiSsid}
                onChange={(e) => setEditForm((p) => ({ ...p, wifiSsid: e.target.value }))}
              />
            </Field>
            <Field label="WiFi Password" hint={editForm.hasPassword ? "Leave blank to keep current" : "Set a password"}>
              <input
                className="input"
                type="password"
                value={editForm.wifiPassword}
                onChange={(e) => setEditForm((p) => ({ ...p, wifiPassword: e.target.value }))}
                placeholder={editForm.hasPassword ? "••••••••" : "Enter password"}
              />
            </Field>
          </div>
          <div className="sep" />
          <div className="row between" style={{ marginBottom: 8 }}>
            <span className="field-label">Devices</span>
            <Button size="sm" variant="ghost" onClick={addDeviceRow}>
              <Icon name="plus" size={11} /> Add device
            </Button>
          </div>
          {editForm.devices.map((d, i) => (
            <div key={i} className="row" style={{ gap: 8, marginBottom: 6 }}>
              <input
                className="input"
                value={d.id}
                onChange={(e) => updateDeviceField(i, "id", e.target.value)}
                placeholder="esp32-XXXX"
              />
              <input
                className="input"
                value={d.mac}
                onChange={(e) => updateDeviceField(i, "mac", e.target.value)}
                placeholder="AA:BB:CC:DD:EE:FF"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeDeviceRow(i)}
                disabled={editForm.devices.length === 1}
              >
                <Icon name="trash" size={11} />
              </Button>
            </div>
          ))}
          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <Button variant="primary" size="sm" onClick={handleSave}>
              <Icon name="check" size={11} /> Save
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </Panel>
      )}

      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}
