import Link from "next/link";
import { Button, Icon, Kicker, Panel } from "@/components/ui";

const STEPS = [
  {
    t: "Install Arduino IDE + ESP32 core",
    d: "Boards Manager → search \"esp32\" → install v2.0.14 or later.",
  },
  {
    t: "Open esp32/esp32.ino",
    d: "Uses WiFi, HTTPClient, Update, ArduinoJson, mbedtls.",
  },
  {
    t: "Edit esp32/config.h",
    d: "Set WIFI_SSID, WIFI_PASSWORD, SERVER_HOST, HMAC_SECRET — must match FIRMWARE_HMAC_SECRET on the server.",
  },
  {
    t: "Select board & port",
    d: "Board: ESP32 Dev Module · Flash: 4MB · Partition: Minimal SPIFFS.",
  },
  {
    t: "Sketch → Export Compiled Binary",
    d: "Produces a .bin file in the sketch folder. (Arduino 1.x: hold Shift while clicking Sketch → Export.)",
  },
  {
    t: "Upload to DFR",
    d: "Drag the .bin into Firmware Manager. The HMAC-SHA256 signature is computed on upload.",
  },
  {
    t: "Device downloads & verifies",
    d: "On the next check-in (≤5 min), the ESP32 downloads, verifies SHA-256 + HMAC, and flashes.",
  },
];

const ARDUINO_VERSION_TIPS = [
  {
    title: "Arduino IDE 2.x",
    body: "Sketch menu → Export Compiled Binary. Wait for the build, then look for the .bin in the sketch folder next to the .ino.",
  },
  {
    title: "Arduino IDE 1.x",
    body: "Hold Shift, then Sketch → Export compiled Binary. Output lands in the sketch folder.",
  },
  {
    title: "Find temporary build files",
    body: "File → Preferences → enable verbose output. After Verify, the console shows a /tmp/arduino_build_… path containing the .bin.",
  },
];

const SECURITY = [
  "Manifests are signed with HMAC-SHA256 using FIRMWARE_HMAC_SECRET.",
  "HMAC comparison is timing-safe to prevent timing attacks.",
  "ESP32 verifies SHA-256 of the binary AND the HMAC signature before calling Update.begin().",
  "All API paths validated with isSafePathSegment() against directory traversal.",
];

export default function FirmwareGuidePage() {
  return (
    <div className="main-inner col" style={{ gap: 20, maxWidth: 900 }}>
      <div className="row between">
        <div>
          <Kicker>Guide</Kicker>
          <div className="t-h1" style={{ marginTop: 4 }}>OTA Firmware Setup</div>
          <div className="t-mono-xs t-mute" style={{ marginTop: 2 }}>
            From sketch to flashed device — start to finish.
          </div>
        </div>
        <Link href="/firmware">
          <Button size="sm" variant="ghost">
            <Icon name="back" size={11} /> Back to Firmware
          </Button>
        </Link>
      </div>

      <Panel title="Workflow">
        <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {STEPS.map((s, i) => (
            <li
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "32px 1fr",
                gap: 16,
                padding: "16px 0",
                borderBottom: i < STEPS.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  border: "1px solid var(--accent)",
                  color: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: "var(--mono)",
                }}
              >
                {i + 1}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{s.t}</div>
                <div className="t-mute" style={{ fontSize: 12 }}>{s.d}</div>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="Where the .bin lives">
        <div className="col" style={{ gap: 12 }}>
          {ARDUINO_VERSION_TIPS.map((tip) => (
            <div key={tip.title}>
              <div className="t-kicker" style={{ marginBottom: 4 }}>{tip.title}</div>
              <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6 }}>{tip.body}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Security">
        <div className="col" style={{ gap: 8, fontSize: 12, color: "var(--text-2)" }}>
          {SECURITY.map((s, i) => (
            <div key={i}>· {s}</div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
