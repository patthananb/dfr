"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export default function SitesPage() {
  const [sites, setSites] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [message, setMessage] = useState("");

  const removeSite = async (siteId, siteName) => {
    const shouldRemove = window.confirm(
      `Remove ${siteName}? This cannot be undone.`
    );
    if (!shouldRemove) return;

    try {
      const res = await fetch(`/api/sites?id=${siteId}`, { method: "DELETE" });
      if (!res.ok) {
        const errorBody = await res.json();
        throw new Error(errorBody.error || "Failed to remove site");
      }
      const data = await res.json();
      setSites(Array.isArray(data.sites) ? data.sites : []);
    } catch (error) {
      console.error(error);
      setMessage(error.message || "Unable to remove site.");
    }
  };

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

  const siteCards = useMemo(
    () =>
      sites.map((site) => {
        const devices = site.devices || [];
        const onlineCount = devices.filter(
          (device) => statuses[device.id]?.online
        ).length;
        return {
          ...site,
          devices,
          onlineCount,
        };
      }),
    [sites, statuses]
  );

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-4 text-gray-100">
      <div className="w-full max-w-5xl space-y-8">
        <div className="bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-slate-800/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
          <div className="p-8 sm:p-10 space-y-6 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Site Information
              </h1>
              <p className="text-gray-400 text-sm">
                View every site, then open a card to see device heartbeat,
                faults, and firmware details.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-gray-300">
              <span>Need to register a site?</span>
              <Link
                href="/sites/setup"
                className="text-cyan-300 hover:text-cyan-200 underline"
              >
                Go to Site Setup
              </Link>
            </div>
          </div>
        </div>

        {message && (
          <div className="rounded-2xl border border-red-500/40 bg-red-900/20 p-4 text-sm text-red-200">
            {message}
          </div>
        )}

        {siteCards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-6 text-center text-sm text-gray-500">
            No sites configured yet. Create your first site in the setup page.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {siteCards.map((site) => (
              <div
                key={site.id}
                className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-6 space-y-4"
              >
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-gray-100">
                    {site.name}
                  </h2>
                  <p className="text-xs text-gray-500">
                    WiFi SSID: {site.wifi?.ssid || "Not set"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Devices: {site.devices.length}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
                  <span>
                    Online: {site.onlineCount}/{site.devices.length}
                  </span>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/sites/${site.id}`}
                      className="text-cyan-300 hover:text-cyan-200"
                    >
                      View details →
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeSite(site.id, site.name)}
                      className="text-red-300 hover:text-red-200"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
