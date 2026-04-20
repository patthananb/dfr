"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Icon, Kicker, Panel, Toast } from "@/components/ui";

const emptyDevice = { id: "", mac: "" };

export default function SiteSetupPage() {
  const router = useRouter();
  const [siteName, setSiteName] = useState("");
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [devices, setDevices] = useState([{ ...emptyDevice }]);
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const addDevice = () => setDevices((prev) => [...prev, { ...emptyDevice }]);
  const removeDevice = (idx) => setDevices((prev) => prev.filter((_, i) => i !== idx));
  const updateDevice = (idx, field, value) =>
    setDevices((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setToast(null);

    const cleaned = devices
      .map((d) => ({ id: d.id.trim(), mac: d.mac.trim() }))
      .filter((d) => d.id && d.mac);

    if (!siteName.trim() || !wifiSsid.trim() || cleaned.length === 0) {
      setToast({ message: "Site name, WiFi SSID, and at least one device are required", tone: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: siteName,
          wifi: { ssid: wifiSsid, password: wifiPassword },
          devices: cleaned,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save site");
      }
      setToast({ message: `Site "${siteName}" registered`, tone: "success" });
      setSiteName("");
      setWifiSsid("");
      setWifiPassword("");
      setDevices([{ ...emptyDevice }]);
      setTimeout(() => router.push("/sites"), 800);
    } catch (err) {
      setToast({ message: err.message || "Unable to save site", tone: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="main-inner col" style={{ gap: 20 }}>
      <div>
        <Kicker>Setup</Kicker>
        <div className="t-h1" style={{ marginTop: 4 }}>Register New Site</div>
        <div className="t-mono-xs t-mute" style={{ marginTop: 2 }}>
          Provision WiFi credentials and register ESP32 devices. Passwords are never returned by the API.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid" style={{ gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
        <div className="col" style={{ gap: 16 }}>
          <Panel title="Site">
            <div className="grid g2">
              <Field label="Site Name" hint="Shown everywhere; used to group faults.">
                <input
                  className="input"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="Substation Echo"
                />
              </Field>
              <Field label="Timezone" hint="UTC is recommended for fleet alignment.">
                <select className="select" defaultValue="UTC">
                  <option value="UTC">UTC</option>
                  <option value="America/Los_Angeles">America/Los_Angeles</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Asia/Bangkok">Asia/Bangkok</option>
                </select>
              </Field>
            </div>
          </Panel>

          <Panel title="WiFi Credentials">
            <div className="grid g2">
              <Field label="SSID">
                <input
                  className="input"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  placeholder="ECHO-OPS"
                />
              </Field>
              <Field label="Password">
                <div className="row" style={{ gap: 4 }}>
                  <input
                    className="input"
                    type={showPass ? "text" : "password"}
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <Button size="sm" variant="ghost" onClick={() => setShowPass((v) => !v)}>
                    {showPass ? "Hide" : "Show"}
                  </Button>
                </div>
              </Field>
            </div>
          </Panel>

          <Panel
            title="Devices"
            right={
              <Button size="sm" variant="ghost" onClick={addDevice}>
                <Icon name="plus" size={11} /> Add
              </Button>
            }
          >
            <div className="col" style={{ gap: 8 }}>
              <div className="row" style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.14em" }}>
                <span style={{ flex: 1 }}>Device ID</span>
                <span style={{ flex: 1 }}>MAC Address</span>
                <span style={{ width: 32 }} />
              </div>
              {devices.map((d, i) => (
                <div key={i} className="row" style={{ gap: 8 }}>
                  <input
                    className="input"
                    value={d.id}
                    onChange={(e) => updateDevice(i, "id", e.target.value)}
                    placeholder="esp32-e501"
                  />
                  <input
                    className="input"
                    value={d.mac}
                    onChange={(e) => updateDevice(i, "mac", e.target.value)}
                    placeholder="AC:67:B2:E5:01:11"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={devices.length === 1}
                    onClick={() => removeDevice(i)}
                  >
                    <Icon name="trash" size={11} />
                  </Button>
                </div>
              ))}
            </div>
          </Panel>

          <div className="row" style={{ gap: 8 }}>
            <Button variant="primary" size="sm" type="submit" disabled={submitting}>
              <Icon name="check" size={11} /> {submitting ? "Saving…" : "Register Site"}
            </Button>
            <Button variant="ghost" size="sm" type="button" onClick={() => router.push("/sites")}>
              Cancel
            </Button>
          </div>
        </div>

        <Panel title="How it works">
          <ol style={{ paddingLeft: 16, margin: 0, fontSize: 12, lineHeight: 1.7, color: "var(--text-2)" }}>
            <li>Submit the form — site + device records are written via <span className="code">POST /api/sites</span></li>
            <li>Flash each ESP32 with a matching <span className="code">DEVICE_ID</span> and <span className="code">WIFI_SSID</span></li>
            <li>On boot the device sends a heartbeat to <span className="code">/api/status</span></li>
            <li>Within 5 min it checks <span className="code">/api/firmware/check</span> for OTA</li>
            <li>The device appears online in the fleet grid</li>
          </ol>
          <div className="sep" />
          <div className="t-mono-xs t-mute">
            WiFi passwords are persisted server-side when <span className="code">USE_DB=1</span>. API responses
            strip passwords via <span className="code">sanitizeSites()</span>.
          </div>
        </Panel>
      </form>

      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}
