#ifndef DFR_CONFIG_H
#define DFR_CONFIG_H

// ─── WiFi ───────────────────────────────────────────────
#define WIFI_SSID         "YOUR_WIFI_SSID"
#define WIFI_PASSWORD     "YOUR_WIFI_PASSWORD"

// ─── Server ─────────────────────────────────────────────
#define SERVER_HOST       "192.168.1.100"   // DFR Next.js server IP or hostname
#define SERVER_PORT       3000

// ─── Device Identity ────────────────────────────────────
// Leave empty string to auto-generate from MAC address (e.g. "esp32-AABBCCDD")
#define DEVICE_ID         ""

// ─── Firmware ───────────────────────────────────────────
#define FW_VERSION        "1.0.0"

// HMAC shared secret — must match FIRMWARE_HMAC_SECRET in server .env.local
#define HMAC_SECRET       "default-dev-secret"

// ─── Timing (milliseconds) ──────────────────────────────
#define HEARTBEAT_INTERVAL_MS   60000       // 1 minute
#define OTA_CHECK_INTERVAL_MS   300000      // 5 minutes
#define WIFI_CONNECT_TIMEOUT_MS 15000       // 15 seconds

// ─── Behaviour ──────────────────────────────────────────
// Set to 1 to accept OTA updates automatically, 0 to require force flag
#define AUTO_UPDATE       1

#endif // DFR_CONFIG_H
