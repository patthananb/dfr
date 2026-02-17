"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function FirmwarePage() {
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info"); // "success" | "error" | "info"
  const [espIds, setEspIds] = useState([]);
  const [selectedEspId, setSelectedEspId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [version, setVersion] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [firmware, setFirmware] = useState({ versions: [], active: null });
  const [statuses, setStatuses] = useState({});
  const [sites, setSites] = useState([]);
  const [deployMode, setDeployMode] = useState("single"); // "single" | "site" | "all"
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState(null);

  const sortedEspIds = useMemo(
    () => [...espIds].sort((a, b) => a.localeCompare(b)),
    [espIds]
  );

  const sortedVersions = useMemo(
    () =>
      [...firmware.versions].sort(
        (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
      ),
    [firmware.versions]
  );

  const runningVersion = statuses[selectedEspId]?.firmwareVersion || null;

  // Version distribution across all devices
  const versionDistribution = useMemo(() => {
    const dist = {};
    for (const [id, status] of Object.entries(statuses)) {
      const ver = status.firmwareVersion || "unknown";
      if (!dist[ver]) dist[ver] = [];
      dist[ver].push(id);
    }
    return dist;
  }, [statuses]);

  // Device overview for selected deploy target
  const targetDeviceOverview = useMemo(() => {
    let ids = [];
    if (deployMode === "site") {
      const site = sites.find((s) => s.id === selectedSiteId);
      ids = site?.devices?.map((d) => d.id).filter(Boolean) || [];
    } else if (deployMode === "all") {
      ids = espIds;
    }
    return ids.map((id) => ({
      id,
      online: statuses[id]?.online || false,
      firmwareVersion: statuses[id]?.firmwareVersion || "unknown",
    }));
  }, [deployMode, selectedSiteId, espIds, sites, statuses]);

  const setMsg = useCallback((text, type = "info") => {
    setMessage(text);
    setMessageType(type);
  }, []);

  const loadSites = async () => {
    try {
      const res = await fetch("/api/sites");
      if (!res.ok) throw new Error("Failed to load sites");
      const data = await res.json();
      const siteList = Array.isArray(data.sites) ? data.sites : [];
      setSites(siteList);
      const uniqueIds = new Set();
      siteList.forEach((site) =>
        site.devices?.forEach((d) => d.id && uniqueIds.add(d.id))
      );
      const ids = Array.from(uniqueIds);
      setEspIds(ids);
      if (!ids.includes(selectedEspId)) {
        setSelectedEspId(ids[0] || "");
      }
    } catch (error) {
      console.error(error);
      setMsg("Unable to load ESP32 IDs. Visit Site Setup to register sites.", "error");
    }
  };

  const loadStatuses = async () => {
    try {
      const res = await fetch("/api/status");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStatuses(data.statuses || {});
    } catch {
      // silent
    }
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadFirmware();
  }, [loadFirmware]);

  // Resolve which device IDs to deploy to based on mode
  const getTargetDeviceIds = () => {
    if (deployMode === "single") return [selectedEspId];
    if (deployMode === "site") {
      const site = sites.find((s) => s.id === selectedSiteId);
      return site?.devices?.map((d) => d.id) || [];
    }
    // "all"
    return espIds;
  };

  const uploadFile = async (file) => {
    const targetIds = getTargetDeviceIds().filter(Boolean);
    if (targetIds.length === 0) {
      setMsg("Select a target before uploading.", "error");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setMsg(`Uploading to ${targetIds.length} device(s)...`, "info");

    let successCount = 0;
    for (let i = 0; i < targetIds.length; i++) {
      const id = targetIds[i];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("espId", id);
      if (version.trim()) formData.append("version", version.trim());
      if (releaseNotes.trim()) formData.append("releaseNotes", releaseNotes.trim());

      try {
        const res = await fetch("/api/firmware", {
          method: "POST",
          body: formData,
        });
        if (res.ok) successCount++;
      } catch {
        // continue to next device
      }
      setUploadProgress(Math.round(((i + 1) / targetIds.length) * 100));
    }

    setUploading(false);
    if (successCount === targetIds.length) {
      setMsg(`Uploaded "${file.name}" to ${successCount} device(s) successfully.`, "success");
    } else {
      setMsg(`Uploaded to ${successCount}/${targetIds.length} devices. Some failed.`, "error");
    }
    setReleaseNotes("");
    loadFirmware();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (uploading) return;
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.name.endsWith(".bin")) {
      setMsg("Only .bin files are allowed", "error");
      return;
    }
    uploadFile(file);
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith(".bin")) {
      setMsg("Only .bin files are allowed", "error");
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
      setMsg("Failed to change active firmware.", "error");
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
      setMsg("Failed to delete firmware.", "error");
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
      setMsg(err.message || "Rollback failed.", "error");
    }
  };

  const handleForceUpdate = async (target) => {
    try {
      const body = target.all
        ? { all: true }
        : target.siteId
        ? { siteId: target.siteId }
        : { espId: target.espId };
      const res = await fetch("/api/firmware/force", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMsg(`Force update flagged for ${data.flagged?.length || 0} device(s)`, "success");
    } catch (err) {
      setMsg(err.message || "Force update failed.", "error");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-4 text-gray-100">
      <div className="w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-slate-800/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
          <div className="p-8 sm:p-10 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Firmware Manager
                </h1>
                <p className="text-gray-400 text-sm">
                  Upload, version, and deploy firmware to ESP32 devices
                </p>
              </div>
              <Link
                href="/firmware/guide"
                className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-cyan-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                How to get .bin file
              </Link>
            </div>

            {/* Deploy Mode */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-200">Deploy Target</label>
                <select
                  value={deployMode}
                  onChange={(e) => setDeployMode(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                >
                  <option value="single">Single Device</option>
                  <option value="site">Entire Site</option>
                  <option value="all">All Devices</option>
                </select>
              </div>

              {deployMode === "single" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-200">ESP32 Device</label>
                  <select
                    value={selectedEspId}
                    onChange={(e) => setSelectedEspId(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                  >
                    {sortedEspIds.length === 0 ? (
                      <option value="">Set up a site first</option>
                    ) : (
                      <>
                        <option value="">Choose an ESP32</option>
                        {sortedEspIds.map((id) => (
                          <option key={id} value={id}>{id}</option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              )}

              {deployMode === "site" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-200">Site</label>
                  <select
                    value={selectedSiteId}
                    onChange={(e) => setSelectedSiteId(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                  >
                    <option value="">Choose a site</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.devices?.length || 0} devices)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-200">Version Label (optional)</label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="e.g., 1.2.0"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                />
              </div>
            </div>

            {/* Release Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">Release Notes (optional)</label>
              <textarea
                value={releaseNotes}
                onChange={(e) => setReleaseNotes(e.target.value)}
                placeholder="Describe what changed in this firmware version..."
                rows={2}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 resize-none"
              />
            </div>

            {deployMode !== "single" && (
              <p className="text-xs text-gray-500">
                The firmware will be uploaded to{" "}
                <span className="text-cyan-400 font-medium">
                  {getTargetDeviceIds().length} device(s)
                </span>
              </p>
            )}

            {/* Force Update Button for group deploys */}
            {deployMode !== "single" && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    deployMode === "all"
                      ? handleForceUpdate({ all: true })
                      : handleForceUpdate({ siteId: selectedSiteId })
                  }
                  disabled={deployMode === "site" && !selectedSiteId}
                  className="text-xs px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 border border-orange-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Force Update {deployMode === "all" ? "All" : "Site"}
                </button>
              </div>
            )}

            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => !uploading && document.getElementById("fileInput").click()}
              className={`border-2 border-dashed w-full h-44 flex items-center justify-center rounded-xl transition-all duration-300 group relative overflow-hidden ${
                uploading
                  ? "border-slate-600 cursor-wait opacity-60"
                  : "border-slate-600 hover:border-cyan-500 cursor-pointer bg-slate-800/50 hover:bg-slate-800/70"
              }`}
            >
              {/* Progress bar overlay */}
              {uploading && (
                <div
                  className="absolute inset-y-0 left-0 bg-cyan-500/10 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-cyan-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="flex flex-col items-center gap-3 z-10">
                {uploading ? (
                  <>
                    <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
                    <p className="text-sm text-gray-300">
                      Uploading... {uploadProgress}%
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-base font-medium text-gray-200">Drop a .bin firmware file here</p>
                      <p className="text-xs text-gray-400">or click to browse</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <input
              id="fileInput"
              type="file"
              accept=".bin"
              className="hidden"
              onChange={handleFileChange}
            />

            <p className="text-xs text-gray-500 text-center">
              Need to register devices?{" "}
              <Link href="/sites/setup" className="text-cyan-400 hover:text-cyan-300 underline">
                Site Setup
              </Link>
            </p>

            {/* Status Message */}
            {message && (
              <div
                className={`p-4 rounded-xl border flex items-center gap-3 ${
                  messageType === "success"
                    ? "bg-green-900/30 border-green-500/50 text-green-300"
                    : messageType === "error"
                    ? "bg-red-900/30 border-red-500/50 text-red-300"
                    : "bg-blue-900/30 border-blue-500/50 text-blue-300"
                }`}
              >
                {messageType === "success" ? (
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : messageType === "error" ? (
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span className="text-sm font-medium">{message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Device Overview for group deploys */}
        {deployMode !== "single" && targetDeviceOverview.length > 0 && (
          <div className="bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-slate-800/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
            <div className="p-6 sm:p-8 space-y-4">
              <h2 className="text-lg font-bold text-gray-100">Target Devices</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {targetDeviceOverview.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/40 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          d.online ? "bg-green-400" : "bg-gray-600"
                        }`}
                      />
                      <span className="text-xs text-gray-300 truncate">{d.id}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 ml-2 whitespace-nowrap">
                      {d.firmwareVersion}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Firmware History — shown when a single device is selected */}
        {deployMode === "single" && selectedEspId && (
          <div className="bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-slate-800/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
            <div className="p-6 sm:p-8 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-100">
                    Firmware History
                  </h2>
                  <p className="text-xs text-gray-500">
                    {selectedEspId}
                    {runningVersion && (
                      <> — running <span className="text-cyan-400 font-semibold">{runningVersion}</span></>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {firmware.active && sortedVersions.length >= 2 && (
                    <button
                      type="button"
                      onClick={handleRollback}
                      className="text-xs px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition-colors"
                    >
                      Rollback
                    </button>
                  )}
                  {selectedEspId && (
                    <button
                      type="button"
                      onClick={() => handleForceUpdate({ espId: selectedEspId })}
                      className="text-xs px-3 py-1 rounded-lg bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 border border-orange-500/30 transition-colors"
                    >
                      Force Update
                    </button>
                  )}
                  {firmware.active && (
                    <span className="text-xs bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-full font-semibold">
                      Active: {firmware.active}
                    </span>
                  )}
                </div>
              </div>

              {sortedVersions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No firmware uploaded for this device yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-slate-700">
                        <th className="py-2 pr-4">Filename</th>
                        <th className="py-2 pr-4">Version</th>
                        <th className="py-2 pr-4">Size</th>
                        <th className="py-2 pr-4">Uploaded</th>
                        <th className="py-2 pr-4">SHA-256</th>
                        <th className="py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {sortedVersions.map((v) => {
                        const isActive = v.filename === firmware.active;
                        return (
                          <tr
                            key={v.filename + v.uploadedAt}
                            className={`${isActive ? "bg-cyan-500/5" : "hover:bg-slate-800/50"} group/row`}
                          >
                            <td className="py-3 pr-4 font-medium text-gray-200 whitespace-nowrap">
                              <span className="flex items-center gap-2">
                                {v.filename}
                                {isActive && (
                                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-semibold">
                                    ACTIVE
                                  </span>
                                )}
                              </span>
                              {/* Expandable release notes */}
                              {v.releaseNotes && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedNotes(
                                      expandedNotes === v.filename + v.uploadedAt
                                        ? null
                                        : v.filename + v.uploadedAt
                                    )
                                  }
                                  className="text-[10px] text-blue-400 hover:text-blue-300 mt-0.5 block"
                                >
                                  {expandedNotes === v.filename + v.uploadedAt
                                    ? "Hide notes"
                                    : "View notes"}
                                </button>
                              )}
                              {expandedNotes === v.filename + v.uploadedAt && v.releaseNotes && (
                                <p className="text-[11px] text-gray-400 mt-1 whitespace-pre-wrap max-w-xs">
                                  {v.releaseNotes}
                                </p>
                              )}
                            </td>
                            <td className="py-3 pr-4 text-gray-400">
                              {v.version || "—"}
                            </td>
                            <td className="py-3 pr-4 text-gray-400 whitespace-nowrap">
                              {formatBytes(v.size)}
                            </td>
                            <td className="py-3 pr-4 text-gray-400 whitespace-nowrap">
                              {formatDate(v.uploadedAt)}
                            </td>
                            <td className="py-3 pr-4 text-gray-500 font-mono text-xs">
                              {v.sha256 ? v.sha256.slice(0, 12) + "…" : "—"}
                            </td>
                            <td className="py-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                {!isActive && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetActive(v.filename)}
                                    className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                                  >
                                    Set Active
                                  </button>
                                )}
                                {confirmDelete === v.filename ? (
                                  <span className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(v.filename)}
                                      className="text-xs text-red-400 hover:text-red-300 font-semibold"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDelete(null)}
                                      className="text-xs text-gray-500 hover:text-gray-300"
                                    >
                                      Cancel
                                    </button>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDelete(v.filename)}
                                    className="text-xs text-red-500/60 hover:text-red-400"
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
                </div>
              )}
            </div>
          </div>
        )}

        {/* Firmware Version Distribution */}
        {Object.keys(versionDistribution).length > 0 && (
          <div className="bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-slate-800/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
            <div className="p-6 sm:p-8 space-y-4">
              <h2 className="text-lg font-bold text-gray-100">Version Distribution</h2>
              <div className="space-y-3">
                {Object.entries(versionDistribution)
                  .sort((a, b) => b[1].length - a[1].length)
                  .map(([ver, devices]) => {
                    const pct = Math.round((devices.length / espIds.length) * 100) || 0;
                    return (
                      <div key={ver} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-300 font-medium">
                            {ver === "unknown" ? "Unknown" : ver}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {devices.length} device{devices.length !== 1 ? "s" : ""} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-700/50 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-600 truncate">
                          {devices.join(", ")}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
