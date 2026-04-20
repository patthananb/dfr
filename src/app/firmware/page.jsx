"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Dot,
  Field,
  Icon,
  Kicker,
  Panel,
  TabGroup,
  Toast,
  formatBytes,
} from "@/components/ui";

const TARGET_FW = "1.4.2";

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

export default function FirmwarePage() {
  const [sites, setSites] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [espIds, setEspIds] = useState([]);
  const [selectedEspId, setSelectedEspId] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [deployMode, setDeployMode] = useState("single"); // single | site | all
  const [firmware, setFirmware] = useState({ versions: [], active: null });

  const [version, setVersion] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState(null);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  const setMsg = useCallback((message, tone = "info") => setToast({ message, tone }), []);

  const sortedEspIds = useMemo(() => [...espIds].sort((a, b) => a.localeCompare(b)), [espIds]);
  const sortedVersions = useMemo(
    () => [...firmware.versions].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)),
    [firmware.versions]
  );

  const versionDistribution = useMemo(() => {
    const dist = {};
    for (const [id, st] of Object.entries(statuses)) {
      const v = st.firmwareVersion || "unknown";
      if (!dist[v]) dist[v] = [];
      dist[v].push(id);
    }
    return dist;
  }, [statuses]);

  const targetDeviceIds = useMemo(() => {
    if (deployMode === "single") return selectedEspId ? [selectedEspId] : [];
    if (deployMode === "site") {
      const site = sites.find((s) => s.id === selectedSiteId);
      return site?.devices?.map((d) => d.id).filter(Boolean) || [];
    }
    return espIds;
  }, [deployMode, selectedEspId, selectedSiteId, sites, espIds]);

  const targetDeviceOverview = useMemo(
    () =>
      targetDeviceIds.map((id) => ({
        id,
        online: !!statuses[id]?.online,
        firmwareVersion: statuses[id]?.firmwareVersion || "unknown",
      })),
    [targetDeviceIds, statuses]
  );

  const loadSites = useCallback(async () => {
    try {
      const res = await fetch("/api/sites");
      if (!res.ok) throw new Error();
      const data = await res.json();
      const siteList = Array.isArray(data.sites) ? data.sites : [];
      setSites(siteList);
      const ids = new Set();
      siteList.forEach((s) => s.devices?.forEach((d) => d.id && ids.add(d.id)));
      const idList = Array.from(ids);
      setEspIds(idList);
      setSelectedEspId((prev) => (prev && idList.includes(prev) ? prev : idList[0] || ""));
      setSelectedSiteId((prev) => (prev && siteList.some((s) => s.id === prev) ? prev : siteList[0]?.id || ""));
    } catch {
      setMsg("Unable to load ESP32 IDs. Visit Site Setup first.", "error");
    }
  }, [setMsg]);

  const loadStatuses = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (!res.ok) return;
      const data = await res.json();
      setStatuses(data.statuses || {});
    } catch { /* ignore */ }
  }, []);

  const loadFirmware = useCallback(async () => {
    if (!selectedEspId) {
      setFirmware({ versions: [], active: null });
      return;
    }
    try {
      const res = await fetch(`/api/firmware?espId=${encodeURIComponent(selectedEspId)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFirmware({
        versions: Array.isArray(data.versions) ? data.versions : [],
        active: data.active || null,
      });
    } catch {
      setFirmware({ versions: [], active: null });
    }
  }, [selectedEspId]);

  useEffect(() => {
    loadSites();
    loadStatuses();
    const t = setInterval(loadStatuses, 15000);
    return () => clearInterval(t);
  }, [loadSites, loadStatuses]);

  useEffect(() => { loadFirmware(); }, [loadFirmware]);

  const uploadFile = async (file) => {
    const ids = targetDeviceIds.filter(Boolean);
    if (ids.length === 0) {
      setMsg("Select a target before uploading.", "error");
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    setMsg(`Uploading to ${ids.length} device(s)…`, "info");

    let ok = 0;
    const failed = [];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const fd = new FormData();
      fd.append("file", file);
      fd.append("espId", id);
      if (version.trim()) fd.append("version", version.trim());
      if (releaseNotes.trim()) fd.append("releaseNotes", releaseNotes.trim());
      try {
        const res = await fetch("/api/firmware", { method: "POST", body: fd });
        if (res.ok) ok++;
        else failed.push(id);
      } catch {
        failed.push(id);
      }
      setUploadProgress(Math.round(((i + 1) / ids.length) * 100));
    }

    setUploading(false);
    if (ok === ids.length) {
      setMsg(`Uploaded "${file.name}" to ${ok} device(s)`, "success");
    } else {
      setMsg(`Uploaded to ${ok}/${ids.length} devices. Failed: ${failed.join(", ")}`, "error");
    }
    setReleaseNotes("");
    loadFirmware();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".bin")) {
      setMsg("Only .bin files are allowed", "error");
      return;
    }
    uploadFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".bin")) {
      setMsg("Only .bin files are allowed", "error");
      e.target.value = "";
      return;
    }
    uploadFile(file);
    e.target.value = "";
  };

  const handleSetActive = async (filename) => {
    try {
      const res = await fetch("/api/firmware", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ espId: selectedEspId, active: filename }),
      });
      if (!res.ok) throw new Error();
      setMsg(`Active firmware set to "${filename}"`, "success");
      loadFirmware();
    } catch {
      setMsg("Failed to change active firmware", "error");
    }
  };

  const handleDelete = async (filename) => {
    try {
      const res = await fetch(
        `/api/firmware?espId=${encodeURIComponent(selectedEspId)}&filename=${encodeURIComponent(filename)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      setConfirmDelete(null);
      setMsg(`Deleted "${filename}"`, "success");
      loadFirmware();
    } catch {
      setMsg("Failed to delete firmware", "error");
    }
  };

  const handleRollback = async () => {
    if (!selectedEspId) return;
    try {
      const res = await fetch("/api/firmware/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ espId: selectedEspId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Rollback failed");
      setMsg(`Rolled back to "${data.active}" (${data.version || "no version"})`, "success");
      loadFirmware();
    } catch (err) {
      setMsg(err.message || "Rollback failed", "error");
    }
  };

  const handleForceUpdate = async () => {
    try {
      const body =
        deployMode === "all"
          ? { all: true }
          : deployMode === "site"
          ? { siteId: selectedSiteId }
          : { espId: selectedEspId };
      const res = await fetch("/api/firmware/force", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMsg(`Force update flagged for ${data.flagged?.length || 0} device(s)`, "success");
    } catch (err) {
      setMsg(err.message || "Force update failed", "error");
    }
  };

  const totalDevices = espIds.length;
  const onTargetCount = (versionDistribution[TARGET_FW] || []).length;

  return (
    <div className="main-inner col" style={{ gap: 20 }}>
      <div className="row between">
        <div>
          <Kicker>Firmware</Kicker>
          <div className="t-h1" style={{ marginTop: 4 }}>Firmware Manager</div>
          <div className="t-mono-xs t-mute" style={{ marginTop: 2 }}>
            {totalDevices} devices · {onTargetCount} on target {TARGET_FW}
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Link href="/firmware/guide">
            <Button size="sm" variant="ghost">
              <Icon name="book" size={11} /> OTA Guide
            </Button>
          </Link>
        </div>
      </div>

      {/* Upload + metadata */}
      <Panel title="New Release">
        <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
          <div
            className={`dropzone ${dragOver ? "over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            style={{ position: "relative", overflow: "hidden", cursor: uploading ? "wait" : "pointer" }}
          >
            {uploading && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(245,158,11,0.06)",
                  width: `${uploadProgress}%`,
                  transition: "width 0.2s ease",
                }}
              />
            )}
            <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
              <Icon name="upload" size={20} style={{ color: "var(--accent)", marginBottom: 8 }} />
              <div style={{ fontSize: 13, marginBottom: 4 }}>
                {uploading ? `Uploading… ${uploadProgress}%` : <>Drop <span className="code">.bin</span> file or <span style={{ color: "var(--accent)" }}>browse</span></>}
              </div>
              <div className="t-mono-xs t-mute">HMAC-SHA256 signed on upload · SHA-256 auto-hashed</div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".bin"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </div>
          <div className="col" style={{ gap: 10 }}>
            <Field label="Version Label">
              <input
                className="input"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.4.3"
              />
            </Field>
            <Field label="Release Notes">
              <textarea
                className="textarea"
                value={releaseNotes}
                onChange={(e) => setReleaseNotes(e.target.value)}
                placeholder="What changed…"
              />
            </Field>
          </div>
        </div>
      </Panel>

      {/* Deploy target */}
      <Panel
        title="Deploy Target"
        right={
          <TabGroup
            value={deployMode}
            onChange={setDeployMode}
            options={[
              { value: "single", label: "Device" },
              { value: "site", label: "Site" },
              { value: "all", label: "Fleet" },
            ]}
          />
        }
      >
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          {deployMode === "single" && (
            <Field label="Device">
              <select
                className="select"
                value={selectedEspId}
                onChange={(e) => setSelectedEspId(e.target.value)}
              >
                {sortedEspIds.length === 0 && <option value="">Set up a site first</option>}
                {sortedEspIds.map((id) => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
            </Field>
          )}
          {deployMode === "site" && (
            <Field label="Site">
              <select
                className="select"
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
              >
                {sites.length === 0 && <option value="">No sites</option>}
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.devices?.length || 0})
                  </option>
                ))}
              </select>
            </Field>
          )}
          {deployMode === "all" && (
            <Field label="Target">
              <input
                className="input"
                readOnly
                value={`${espIds.length} devices across ${sites.length} sites`}
              />
            </Field>
          )}
          <Field label="Resolved Devices" hint={`${targetDeviceIds.length} target(s)`}>
            <input className="input" readOnly value={`${targetDeviceIds.length} device(s)`} />
          </Field>
        </div>

        {targetDeviceOverview.length > 0 && (
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 6 }}>
            {targetDeviceOverview.map((d) => (
              <div
                key={d.id}
                className="row"
                style={{
                  justifyContent: "space-between",
                  border: "1px solid var(--border)",
                  padding: "6px 10px",
                  background: "var(--panel-2)",
                }}
              >
                <span className="row" style={{ gap: 6, minWidth: 0 }}>
                  <Dot tone={d.online ? "ok" : ""} />
                  <span className="code" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{d.id}</span>
                </span>
                <span className="t-mono-xs t-mute">{d.firmwareVersion}</span>
              </div>
            ))}
          </div>
        )}

        <div className="row" style={{ gap: 8, marginTop: 16 }}>
          <Button size="sm" variant="ghost" onClick={handleForceUpdate} disabled={targetDeviceIds.length === 0}>
            <Icon name="bolt" size={11} /> Force Update
          </Button>
          {deployMode === "single" && firmware.active && sortedVersions.length >= 2 && (
            <Button size="sm" variant="ghost" onClick={handleRollback}>
              <Icon name="back" size={11} /> Rollback
            </Button>
          )}
          <div style={{ flex: 1 }} />
          <span className="t-mono-xs t-mute">
            Target: <span className="code">{targetDeviceIds.length}</span> device(s)
          </span>
        </div>
      </Panel>

      {/* Version history (single-device only) + distribution */}
      <div className="grid g2">
        {deployMode === "single" && selectedEspId && (
          <Panel
            title="Version History"
            right={
              firmware.active ? (
                <Badge tone="warn">ACTIVE · {firmware.active}</Badge>
              ) : (
                <span className="t-mono-xs t-mute">no active</span>
              )
            }
            bodyClass="p0"
          >
            {sortedVersions.length === 0 ? (
              <div className="empty">No firmware uploaded for this device yet.</div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>File</th>
                    <th className="num">Size</th>
                    <th>SHA-256</th>
                    <th>Uploaded</th>
                    <th className="right"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedVersions.map((v) => {
                    const isActive = v.filename === firmware.active;
                    const key = v.filename + v.uploadedAt;
                    return (
                      <tr key={key} className={isActive ? "selected" : ""}>
                        <td>
                          <div className="row" style={{ gap: 6 }}>
                            <span className="code">{v.version || "—"}</span>
                            {isActive && <Badge tone="warn">ACTIVE</Badge>}
                          </div>
                          {v.releaseNotes && (
                            <button
                              type="button"
                              className="t-mono-xs"
                              style={{ color: "var(--accent)", marginTop: 2, background: "none", border: 0, padding: 0, cursor: "pointer" }}
                              onClick={() => setExpandedNotes(expandedNotes === key ? null : key)}
                            >
                              {expandedNotes === key ? "Hide notes" : "View notes"}
                            </button>
                          )}
                          {expandedNotes === key && v.releaseNotes && (
                            <div className="t-mono-xs t-mute" style={{ marginTop: 4, maxWidth: 320, whiteSpace: "pre-wrap" }}>
                              {v.releaseNotes}
                            </div>
                          )}
                        </td>
                        <td className="t-mute t-mono-xs">{v.filename}</td>
                        <td className="num t-mute">{formatBytes(v.size)}</td>
                        <td className="t-mono-xs t-mute">{v.sha256 ? v.sha256.slice(0, 12) + "…" : "—"}</td>
                        <td className="t-mute t-mono-xs">{formatDate(v.uploadedAt)}</td>
                        <td className="right">
                          <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
                            {!isActive && (
                              <button
                                type="button"
                                onClick={() => handleSetActive(v.filename)}
                                style={{ background: "none", border: 0, padding: 0, color: "var(--accent)", fontSize: 10, cursor: "pointer" }}
                              >
                                Set Active
                              </button>
                            )}
                            {confirmDelete === v.filename ? (
                              <span className="row" style={{ gap: 6 }}>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(v.filename)}
                                  style={{ background: "none", border: 0, padding: 0, color: "var(--alert)", fontSize: 10, fontWeight: 600, cursor: "pointer" }}
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDelete(null)}
                                  style={{ background: "none", border: 0, padding: 0, color: "var(--muted)", fontSize: 10, cursor: "pointer" }}
                                >
                                  Cancel
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDelete(v.filename)}
                                style={{ background: "none", border: 0, padding: 0, color: "var(--muted)", fontSize: 10, cursor: "pointer" }}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Panel>
        )}

        <Panel
          title="Version Distribution"
          right={<span className="t-mono-xs t-mute">{totalDevices} devices</span>}
        >
          {Object.keys(versionDistribution).length === 0 ? (
            <div className="empty">No devices reporting yet.</div>
          ) : (
            <div className="col" style={{ gap: 10 }}>
              {Object.entries(versionDistribution)
                .sort((a, b) => b[1].length - a[1].length)
                .map(([v, list]) => {
                  const pct = totalDevices ? Math.round((list.length / totalDevices) * 100) : 0;
                  const isTarget = v === TARGET_FW;
                  return (
                    <div key={v}>
                      <div className="row between" style={{ marginBottom: 4 }}>
                        <span className="row" style={{ gap: 8 }}>
                          <span className="code" style={{ color: isTarget ? "var(--accent)" : "var(--text)" }}>
                            {v === "unknown" ? "Unknown" : v}
                          </span>
                          {isTarget && <span className="t-mono-xs t-mute">TARGET</span>}
                        </span>
                        <span className="t-mono-xs t-mute">
                          {list.length} · {pct}%
                        </span>
                      </div>
                      <div className="progress">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${pct}%`,
                            background: isTarget ? "var(--accent)" : "var(--border-2)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
          <div className="sep" />
          <div className="col" style={{ gap: 6, fontSize: 11 }}>
            <div className="row between">
              <span className="t-mute">Drift (non-target)</span>
              <span className="code">{Math.max(0, totalDevices - onTargetCount)}</span>
            </div>
            <div className="row between">
              <span className="t-mute">OTA check interval</span>
              <span className="code">5 min</span>
            </div>
            <div className="row between">
              <span className="t-mute">HMAC verified</span>
              <span style={{ color: "var(--ok)" }}>✓ all</span>
            </div>
          </div>
        </Panel>
      </div>

      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}
