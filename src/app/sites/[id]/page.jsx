"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const emptyDevice = { id: "", mac: "" };

function formatLastSeen(value) {
  if (!value) {
    return "No heartbeat yet";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Invalid timestamp";
  }
  return `Last seen ${date.toLocaleString()}`;
}

export default function SiteDetailPage() {
  const params = useParams();
  const siteId = params?.id;
  const [site, setSite] = useState(null);
  const [statuses, setStatuses] = useState({});
  const [faults, setFaults] = useState([]);
  const [message, setMessage] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    wifiSsid: "",
    wifiPassword: "",
    devices: [{ ...emptyDevice }],
    hasPassword: false,
  });
  const [editMessage, setEditMessage] = useState("");

  const loadSite = async () => {
    try {
      const res = await fetch("/api/sites");
      if (!res.ok) {
        throw new Error("Failed to load sites");
      }
      const data = await res.json();
      const sites = Array.isArray(data.sites) ? data.sites : [];
      const found = sites.find((entry) => entry.id === siteId);
      setSite(found || null);
      if (!found) {
        setMessage("Site not found.");
        return;
      }
      setEditForm({
        name: found.name || "",
        wifiSsid: found.wifi?.ssid || "",
        wifiPassword: "",
        devices: found.devices?.length
          ? found.devices.map((device) => ({ ...device }))
          : [{ ...emptyDevice }],
        hasPassword: found.wifi?.hasPassword || false,
      });
    } catch (error) {
      console.error(error);
      setMessage("Unable to load site.");
    }
  };

  const loadStatus = async () => {
    try {
      const res = await fetch("/api/status");
      if (!res.ok) {
        throw new Error("Failed to load status");
      }
      const data = await res.json();
      setStatuses(data.statuses || {});
    } catch (error) {
      console.error(error);
    }
  };

  const loadFaults = async (siteName) => {
    try {
      const res = await fetch(`/api/faults?site=${encodeURIComponent(siteName)}`);
      if (!res.ok) {
        throw new Error("Failed to load faults");
      }
      const data = await res.json();
      setFaults(Array.isArray(data.faults) ? data.faults : []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!siteId) return;
    loadSite();
    loadStatus();
    const interval = setInterval(loadStatus, 15000);
    return () => clearInterval(interval);
  }, [siteId]);

  useEffect(() => {
    if (site?.name) {
      loadFaults(site.name);
    }
  }, [site?.name]);

  const deviceStatuses = useMemo(() => {
    if (!site) return [];
    return (site.devices || []).map((device) => ({
      ...device,
      status: statuses[device.id] || {},
    }));
  }, [site, statuses]);

  const updateEditDeviceField = (index, field, value) => {
    setEditForm((prev) => ({
      ...prev,
      devices: prev.devices.map((device, idx) =>
        idx === index ? { ...device, [field]: value } : device
      ),
    }));
  };

  const addEditDeviceRow = () => {
    setEditForm((prev) => ({
      ...prev,
      devices: [...prev.devices, { ...emptyDevice }],
    }));
  };

  const removeEditDeviceRow = (index) => {
    setEditForm((prev) => ({
      ...prev,
      devices: prev.devices.filter((_, idx) => idx !== index),
    }));
  };

  const handleEditSave = async () => {
    setEditMessage("");
    const cleanedDevices = editForm.devices
      .map((device) => ({
        id: device.id.trim(),
        mac: device.mac.trim(),
      }))
      .filter((device) => device.id && device.mac);

    if (!editForm.name.trim() || !editForm.wifiSsid.trim()) {
      setEditMessage("Site name and WiFi SSID are required.");
      return;
    }

    if (cleanedDevices.length === 0) {
      setEditMessage("Add at least one ESP32 ID and MAC address.");
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
          devices: cleanedDevices,
        }),
      });

      if (!res.ok) {
        const errorBody = await res.json();
        throw new Error(errorBody.error || "Failed to update site");
      }

      const data = await res.json();
      const sites = Array.isArray(data.sites) ? data.sites : [];
      const updated = sites.find((entry) => entry.id === siteId) || null;
      setSite(updated);
      setEditMode(false);
      setEditMessage("");
      loadStatus();
    } catch (error) {
      console.error(error);
      setEditMessage(error.message || "Unable to update site.");
    }
  };

  if (!site) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-4 text-gray-100">
        <div className="w-full max-w-3xl space-y-4">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-gray-400">
            {message || "Loading site details..."}
          </div>
          <Link href="/sites" className="text-cyan-300 hover:text-cyan-200 underline text-sm">
            Back to Sites
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-4 text-gray-100">
      <div className="w-full max-w-5xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500">Site Details</p>
            <h1 className="text-3xl font-bold text-gray-100">{site.name}</h1>
            <p className="text-xs text-gray-500">
              WiFi SSID: {site.wifi?.ssid || "Not set"}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/sites"
              className="text-xs text-gray-400 hover:text-gray-200 underline"
            >
              Back to Sites
            </Link>
            <button
              type="button"
              onClick={() => setEditMode((prev) => !prev)}
              className="rounded-full border border-slate-700 px-4 py-2 text-xs text-cyan-300 hover:text-cyan-200 hover:border-cyan-400/60"
            >
              {editMode ? "Close Edit" : "Edit Site"}
            </button>
          </div>
        </div>

        {editMode && (
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400">Site Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">WiFi SSID</label>
                <input
                  type="text"
                  value={editForm.wifiSsid}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      wifiSsid: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">WiFi Password</label>
                <input
                  type="password"
                  value={editForm.wifiPassword}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      wifiPassword: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                  placeholder={
                    editForm.hasPassword
                      ? "Leave blank to keep current password"
                      : "Enter new password"
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-200">
                  ESP32 Devices
                </p>
                <button
                  type="button"
                  onClick={addEditDeviceRow}
                  className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                >
                  + Add device
                </button>
              </div>
              <div className="space-y-2">
                {editForm.devices.map((device, index) => (
                  <div
                    key={`${device.id}-${index}`}
                    className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end"
                  >
                    <input
                      type="text"
                      value={device.id}
                      onChange={(event) =>
                        updateEditDeviceField(index, "id", event.target.value)
                      }
                      className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                      placeholder="ESP32 ID"
                    />
                    <input
                      type="text"
                      value={device.mac}
                      onChange={(event) =>
                        updateEditDeviceField(index, "mac", event.target.value)
                      }
                      className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                      placeholder="MAC Address"
                    />
                    <div className="flex justify-end md:justify-start">
                      {editForm.devices.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEditDeviceRow(index)}
                          className="rounded-full border border-slate-700 px-3 py-2 text-xs text-gray-400 hover:text-red-300 hover:border-red-400/60"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleEditSave}
                className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-cyan-400 transition-colors"
              >
                Save Changes
              </button>
              {editMessage && (
                <span className="text-xs text-cyan-300">{editMessage}</span>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-100">ESP32 Status</h2>
            <div className="space-y-3">
              {deviceStatuses.length === 0 ? (
                <p className="text-sm text-gray-500">No devices registered.</p>
              ) : (
                deviceStatuses.map((device) => (
                  <div
                    key={device.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-700/60 bg-slate-800/60 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-100">
                          {device.id}
                        </p>
                        <p className="text-xs text-gray-500">
                          MAC: {device.mac}
                        </p>
                        <p className="text-xs text-gray-400">
                          Firmware: {device.status.firmwareVersion || "Unknown"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          device.status.online
                            ? "bg-green-500/20 text-green-300"
                            : "bg-slate-700 text-gray-300"
                        }`}
                      >
                        {device.status.online ? "Online" : "Offline"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {formatLastSeen(device.status.lastSeen)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-100">Faults</h2>
            <p className="text-xs text-gray-500">
              Showing faults that match this site name.
            </p>
            <div className="space-y-3">
              {faults.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No faults recorded for this site yet.
                </p>
              ) : (
                faults.slice(0, 10).map((fault) => (
                  <div
                    key={fault.file}
                    className="rounded-xl border border-slate-700/60 bg-slate-800/60 p-4"
                  >
                    <p className="text-sm font-semibold text-gray-100">
                      {fault.faultType}
                    </p>
                    <p className="text-xs text-gray-500">
                      Location: {fault.faultLocation}
                    </p>
                    <p className="text-xs text-gray-400">
                      {fault.date || "Unknown date"} {fault.time || ""}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
