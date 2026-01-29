"use client";

import { useEffect, useMemo, useState } from "react";

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

export default function StatusPage() {
  const [sites, setSites] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [siteName, setSiteName] = useState("");
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [devices, setDevices] = useState([{ ...emptyDevice }]);
  const [message, setMessage] = useState("");
  const [editSiteId, setEditSiteId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    wifiSsid: "",
    wifiPassword: "",
    devices: [{ ...emptyDevice }],
    hasPassword: false,
  });
  const [editMessage, setEditMessage] = useState("");

  const loadSites = async () => {
    try {
      const res = await fetch("/api/sites");
      if (!res.ok) {
        throw new Error("Failed to load sites");
      }
      const data = await res.json();
      setSites(Array.isArray(data.sites) ? data.sites : []);
    } catch (error) {
      console.error(error);
      setMessage("Unable to load sites.");
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
      setMessage("Unable to load ESP32 status.");
    }
  };

  useEffect(() => {
    loadSites();
    loadStatus();
    const interval = setInterval(loadStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const addDeviceRow = () => {
    setDevices((prev) => [...prev, { ...emptyDevice }]);
  };

  const removeDeviceRow = (index) => {
    setDevices((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateDeviceField = (index, field, value) => {
    setDevices((prev) =>
      prev.map((device, idx) =>
        idx === index ? { ...device, [field]: value } : device
      )
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    const cleanedDevices = devices
      .map((device) => ({
        id: device.id.trim(),
        mac: device.mac.trim(),
      }))
      .filter((device) => device.id && device.mac);

    if (!siteName.trim() || !wifiSsid.trim() || cleanedDevices.length === 0) {
      setMessage("Please fill in the site name, WiFi, and ESP32 details.");
      return;
    }

    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: siteName,
          wifi: { ssid: wifiSsid, password: wifiPassword },
          devices: cleanedDevices,
        }),
      });

      if (!res.ok) {
        const errorBody = await res.json();
        throw new Error(errorBody.error || "Failed to save site");
      }

      const data = await res.json();
      setSites(Array.isArray(data.sites) ? data.sites : []);
      setSiteName("");
      setWifiSsid("");
      setWifiPassword("");
      setDevices([{ ...emptyDevice }]);
      setMessage("Site saved successfully.");
      loadStatus();
    } catch (error) {
      console.error(error);
      setMessage(error.message || "Unable to save site.");
    }
  };

  const handleEditStart = (site) => {
    setEditSiteId(site.id);
    setEditMessage("");
    setEditForm({
      name: site.name || "",
      wifiSsid: site.wifi?.ssid || "",
      wifiPassword: "",
      devices: site.devices?.length
        ? site.devices.map((device) => ({ ...device }))
        : [{ ...emptyDevice }],
      hasPassword: site.wifi?.hasPassword || false,
    });
  };

  const handleEditCancel = () => {
    setEditSiteId(null);
    setEditMessage("");
  };

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

  const handleEditSave = async (siteId) => {
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
      setSites(Array.isArray(data.sites) ? data.sites : []);
      setEditSiteId(null);
      setEditMessage("");
      loadStatus();
    } catch (error) {
      console.error(error);
      setEditMessage(error.message || "Unable to update site.");
    }
  };

  const espIds = useMemo(() => {
    const ids = [];
    sites.forEach((site) => {
      site.devices?.forEach((device) => {
        ids.push(device.id);
      });
    });
    return ids;
  }, [sites]);

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-4 text-gray-100">
      <div className="w-full max-w-5xl space-y-8">
        <div className="bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-slate-800/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
          <div className="p-8 sm:p-10 space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Site Status & Setup
              </h1>
              <p className="text-gray-400 text-sm">
                Register each site with WiFi credentials and ESP32 IDs, then
                monitor heartbeat status.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-200">
                    Site Name
                  </label>
                  <input
                    type="text"
                    value={siteName}
                    onChange={(event) => setSiteName(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                    placeholder="e.g. Farm A"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-200">
                    WiFi SSID
                  </label>
                  <input
                    type="text"
                    value={wifiSsid}
                    onChange={(event) => setWifiSsid(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                    placeholder="Network name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-200">
                    WiFi Password
                  </label>
                  <input
                    type="password"
                    value={wifiPassword}
                    onChange={(event) => setWifiPassword(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                    placeholder="••••••••"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Stored securely on the server for provisioning.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-200">
                    ESP32 Devices
                  </h2>
                  <button
                    type="button"
                    onClick={addDeviceRow}
                    className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                  >
                    + Add another ESP32
                  </button>
                </div>
                <div className="space-y-3">
                  {devices.map((device, index) => (
                    <div
                      key={`${device.id}-${index}`}
                      className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end"
                    >
                      <div>
                        <label className="text-xs text-gray-400">
                          ESP32 ID
                        </label>
                        <input
                          type="text"
                          value={device.id}
                          onChange={(event) =>
                            updateDeviceField(index, "id", event.target.value)
                          }
                          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                          placeholder="esp32-01"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">
                          MAC Address
                        </label>
                        <input
                          type="text"
                          value={device.mac}
                          onChange={(event) =>
                            updateDeviceField(index, "mac", event.target.value)
                          }
                          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                          placeholder="AA:BB:CC:DD:EE:FF"
                        />
                      </div>
                      <div className="flex justify-end md:justify-start">
                        {devices.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDeviceRow(index)}
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

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  className="rounded-xl bg-cyan-500 px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-400 transition-colors"
                >
                  Save Site
                </button>
                {message && (
                  <span className="text-xs text-cyan-300">{message}</span>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-100">
              Sites & ESP32 Status
            </h2>
            <span className="text-xs text-gray-500">
              Total ESP32s: {espIds.length}
            </span>
          </div>

          {sites.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-6 text-center text-sm text-gray-500">
              No sites configured yet. Add your first site above.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {sites.map((site) => (
                <div
                  key={site.id}
                  className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-6 space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-gray-100">
                        {site.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        WiFi SSID: {site.wifi?.ssid || "Not set"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Devices: {site.devices?.length || 0}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {editSiteId === site.id ? (
                        <button
                          type="button"
                          onClick={handleEditCancel}
                          className="text-xs font-semibold text-gray-400 hover:text-gray-200"
                        >
                          Cancel
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleEditStart(site)}
                          className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                  {editSiteId === site.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-400">
                            Site Name
                          </label>
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
                          <label className="text-xs text-gray-400">
                            WiFi SSID
                          </label>
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
                          <label className="text-xs text-gray-400">
                            WiFi Password
                          </label>
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
                                  updateEditDeviceField(
                                    index,
                                    "id",
                                    event.target.value
                                  )
                                }
                                className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                                placeholder="ESP32 ID"
                              />
                              <input
                                type="text"
                                value={device.mac}
                                onChange={(event) =>
                                  updateEditDeviceField(
                                    index,
                                    "mac",
                                    event.target.value
                                  )
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
                          onClick={() => handleEditSave(site.id)}
                          className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-cyan-400 transition-colors"
                        >
                          Save Changes
                        </button>
                        {editMessage && (
                          <span className="text-xs text-cyan-300">
                            {editMessage}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {site.devices?.map((device) => {
                        const status = statuses[device.id];
                        return (
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
                              </div>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  status?.online
                                    ? "bg-green-500/20 text-green-300"
                                    : "bg-slate-700 text-gray-300"
                                }`}
                              >
                                {status?.online ? "Online" : "Offline"}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400">
                              {formatLastSeen(status?.lastSeen)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
