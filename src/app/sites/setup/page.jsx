"use client";

import { useState } from "react";
import Link from "next/link";

const emptyDevice = { id: "", mac: "" };

export default function SiteSetupPage() {
  const [siteName, setSiteName] = useState("");
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [devices, setDevices] = useState([{ ...emptyDevice }]);
  const [message, setMessage] = useState("");

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

      setSiteName("");
      setWifiSsid("");
      setWifiPassword("");
      setDevices([{ ...emptyDevice }]);
      setMessage("Site saved successfully.");
    } catch (error) {
      console.error(error);
      setMessage(error.message || "Unable to save site.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-4 text-gray-100">
      <div className="w-full max-w-5xl space-y-8">
        <div className="bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-slate-800/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
          <div className="p-8 sm:p-10 space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Site Setup
              </h1>
              <p className="text-gray-400 text-sm">
                Register new sites with WiFi credentials and ESP32 IDs/MAC
                addresses.
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

        <div className="text-center text-sm text-gray-400">
          Ready to view status?{" "}
          <Link href="/sites" className="text-cyan-300 hover:text-cyan-200 underline">
            Go to Site Information
          </Link>
        </div>
      </div>
    </div>
  );
}
