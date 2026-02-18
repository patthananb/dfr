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

// ─── ADC Sampling ───────────────────────────────────────
// GPIO pins for 8 ADC channels (must be ADC1 pins: GPIO 32–39)
#define ADC_PIN_V1        32
#define ADC_PIN_V2        33
#define ADC_PIN_V3        34
#define ADC_PIN_I1        35
#define ADC_PIN_I2        36
#define ADC_PIN_I3        39
#define ADC_PIN_A         25    // ADC2 — avoid during WiFi if issues arise
#define ADC_PIN_B         26    // ADC2 — avoid during WiFi if issues arise

// Number of samples per capture batch
#define ADC_SAMPLES       256

// Timer interrupt sample rate in microseconds (per-sample interval)
// 1000 µs = 1 kHz sample rate, 500 µs = 2 kHz, 250 µs = 4 kHz
#define ADC_SAMPLE_INTERVAL_US  1000  // 1 kHz

// Interval between ADC capture-and-upload cycles (milliseconds)
#define ADC_UPLOAD_INTERVAL_MS  5000  // 5 seconds

// ADC resolution (9–12 bits on ESP32)
#define ADC_RESOLUTION    12

// ADC attenuation (ADC_ATTEN_DB_12 = 0–3.3V full range)
#define ADC_ATTENUATION   ADC_ATTEN_DB_12

#endif // DFR_CONFIG_H
