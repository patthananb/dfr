/*
 * DFR — ESP32 OTA Firmware Client + ADC Sampler
 *
 * Connects to the DFR Next.js server and:
 *   1. Sends periodic heartbeats with RSSI, uptime, free heap
 *   2. Checks for firmware updates (respects force-update flag)
 *   3. Downloads, verifies (SHA-256 + HMAC), and flashes new firmware
 *   4. Samples 8 ADC channels and uploads data for graph visualization
 *
 * Arduino core for ESP32  —  requires WiFi, HTTPClient, Update, mbedtls
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Update.h>
#include <ArduinoJson.h>
#include <mbedtls/md.h>
#include "config.h"

// ─── Globals ────────────────────────────────────────────
static String deviceId;
static unsigned long lastHeartbeat  = 0;
static unsigned long lastOtaCheck   = 0;
static unsigned long lastAdcUpload  = 0;

// ADC pin mapping (order matches JSON keys: v1,v2,v3,i1,i2,i3,A,B)
static const uint8_t adcPins[] = {
  ADC_PIN_V1, ADC_PIN_V2, ADC_PIN_V3,
  ADC_PIN_I1, ADC_PIN_I2, ADC_PIN_I3,
  ADC_PIN_A,  ADC_PIN_B
};

// ─── Helpers ────────────────────────────────────────────

// Build a full URL for a given path (e.g. "/api/status")
static String buildUrl(const String &path) {
  return String("http://") + SERVER_HOST + ":" + String(SERVER_PORT) + path;
}

// Derive a device ID from the ESP32 MAC if DEVICE_ID is empty
static String resolveDeviceId() {
  String cfg = DEVICE_ID;
  if (cfg.length() > 0) return cfg;

  uint8_t mac[6];
  WiFi.macAddress(mac);
  char buf[20];
  snprintf(buf, sizeof(buf), "esp32-%02X%02X%02X%02X",
           mac[2], mac[3], mac[4], mac[5]);
  return String(buf);
}

// Hex-encode a byte array
static String toHex(const uint8_t *data, size_t len) {
  String out;
  out.reserve(len * 2);
  for (size_t i = 0; i < len; i++) {
    char hex[3];
    snprintf(hex, sizeof(hex), "%02x", data[i]);
    out += hex;
  }
  return out;
}

// Compute HMAC-SHA256 and return hex string
static String hmacSha256(const String &key, const String &message) {
  uint8_t result[32];
  mbedtls_md_context_t ctx;
  mbedtls_md_init(&ctx);
  mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(MBEDTLS_MD_SHA256), 1);
  mbedtls_md_hmac_starts(&ctx, (const uint8_t *)key.c_str(), key.length());
  mbedtls_md_hmac_update(&ctx, (const uint8_t *)message.c_str(), message.length());
  mbedtls_md_hmac_finish(&ctx, result);
  mbedtls_md_free(&ctx);
  return toHex(result, 32);
}

// ─── WiFi ───────────────────────────────────────────────

static void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("[wifi] Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - start > WIFI_CONNECT_TIMEOUT_MS) {
      Serial.println("\n[wifi] Connection timeout — will retry next loop");
      return;
    }
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\n[wifi] Connected  IP: %s  RSSI: %d dBm\n",
                WiFi.localIP().toString().c_str(), WiFi.RSSI());
}

// ─── Heartbeat ──────────────────────────────────────────

static void sendHeartbeat() {
  HTTPClient http;
  http.begin(buildUrl("/api/status"));
  http.addHeader("Content-Type", "application/json");

  JsonDocument doc;
  doc["espId"]           = deviceId;
  doc["firmwareVersion"] = FW_VERSION;
  doc["rssi"]            = WiFi.RSSI();
  doc["uptime"]          = (unsigned long)(millis() / 1000);
  doc["freeHeap"]        = (unsigned long)ESP.getFreeHeap();

  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  if (code == 200) {
    Serial.println("[heartbeat] OK");
  } else {
    Serial.printf("[heartbeat] Failed  HTTP %d\n", code);
  }
  http.end();
}

// ─── OTA ────────────────────────────────────────────────

// Verify HMAC signature matches server-provided value.
// Payload format must match src/lib/crypto.js: "version:sha256:filename"
static bool verifySignature(const String &version, const String &sha256,
                            const String &filename, const String &signature) {
  if (signature.length() == 0) {
    Serial.println("[ota] No signature provided — skipping HMAC check");
    return true;
  }
  String payload = version + ":" + sha256 + ":" + filename;
  String computed = hmacSha256(HMAC_SECRET, payload);
  if (computed.equalsIgnoreCase(signature)) {
    Serial.println("[ota] HMAC signature verified");
    return true;
  }
  Serial.println("[ota] HMAC signature MISMATCH — aborting update");
  return false;
}

// Stream firmware from server, compute SHA-256 on the fly, then flash.
static bool performOta(const String &url, const String &expectedSha256,
                       size_t expectedSize) {
  HTTPClient http;
  http.begin(buildUrl(url));
  int code = http.GET();
  if (code != 200) {
    Serial.printf("[ota] Download failed  HTTP %d\n", code);
    http.end();
    return false;
  }

  int contentLength = http.getSize();
  if (contentLength <= 0 && expectedSize > 0) {
    contentLength = (int)expectedSize;
  }

  WiFiClient *stream = http.getStreamPtr();
  if (!stream) {
    Serial.println("[ota] No stream");
    http.end();
    return false;
  }

  // Begin OTA update
  if (!Update.begin(contentLength > 0 ? (size_t)contentLength : UPDATE_SIZE_UNKNOWN)) {
    Serial.printf("[ota] Update.begin failed: %s\n", Update.errorString());
    http.end();
    return false;
  }

  // SHA-256 context for on-the-fly verification
  mbedtls_md_context_t sha;
  mbedtls_md_init(&sha);
  mbedtls_md_setup(&sha, mbedtls_md_info_from_type(MBEDTLS_MD_SHA256), 0);
  mbedtls_md_starts(&sha);

  uint8_t buf[1024];
  size_t totalRead = 0;

  while (http.connected() && (contentLength <= 0 || (int)totalRead < contentLength)) {
    size_t available = stream->available();
    if (available == 0) {
      delay(1);
      continue;
    }
    size_t toRead = (available < sizeof(buf)) ? available : sizeof(buf);
    size_t bytesRead = stream->readBytes(buf, toRead);
    if (bytesRead == 0) break;

    Update.write(buf, bytesRead);
    mbedtls_md_update(&sha, buf, bytesRead);
    totalRead += bytesRead;

    // Progress every ~64 KB
    if ((totalRead % (64 * 1024)) < bytesRead) {
      Serial.printf("[ota] %u bytes\n", (unsigned)totalRead);
    }
  }
  http.end();

  // Finalise SHA-256
  uint8_t hash[32];
  mbedtls_md_finish(&sha, hash);
  mbedtls_md_free(&sha);
  String actualSha = toHex(hash, 32);

  // Verify hash
  if (expectedSha256.length() > 0 && !actualSha.equalsIgnoreCase(expectedSha256)) {
    Serial.println("[ota] SHA-256 MISMATCH — aborting");
    Serial.printf("  expected: %s\n  actual:   %s\n",
                  expectedSha256.c_str(), actualSha.c_str());
    Update.abort();
    return false;
  }
  if (expectedSha256.length() > 0) {
    Serial.println("[ota] SHA-256 verified");
  }

  if (!Update.end(true)) {
    Serial.printf("[ota] Update.end failed: %s\n", Update.errorString());
    return false;
  }

  Serial.printf("[ota] Success — %u bytes written\n", (unsigned)totalRead);
  return true;
}

static void checkForUpdate() {
  String url = "/api/firmware/check?espId=" + deviceId +
               "&currentVersion=" + String(FW_VERSION);
  HTTPClient http;
  http.begin(buildUrl(url));
  int code = http.GET();

  if (code != 200) {
    Serial.printf("[ota] Check failed  HTTP %d\n", code);
    http.end();
    return;
  }

  String payload = http.getString();
  http.end();

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, payload);
  if (err) {
    Serial.printf("[ota] JSON parse error: %s\n", err.c_str());
    return;
  }

  bool updateAvailable = doc["update"] | false;
  if (!updateAvailable) {
    Serial.println("[ota] Up to date");
    return;
  }

  const char *newVersion  = doc["version"] | "";
  const char *filename    = doc["filename"] | "";
  const char *sha256      = doc["sha256"] | "";
  const char *signature   = doc["signature"] | "";
  const char *dlUrl       = doc["url"] | "";
  bool forceUpdate        = doc["forceUpdate"] | false;
  const char *releaseNotes = doc["releaseNotes"] | "";

  Serial.printf("[ota] Update available: %s -> %s\n", FW_VERSION, newVersion);
  if (strlen(releaseNotes) > 0) {
    Serial.printf("[ota] Release notes: %s\n", releaseNotes);
  }

#if !AUTO_UPDATE
  if (!forceUpdate) {
    Serial.println("[ota] AUTO_UPDATE disabled and not forced — skipping");
    return;
  }
  Serial.println("[ota] Force update — proceeding despite AUTO_UPDATE=0");
#endif

  // Verify HMAC signature before downloading
  if (!verifySignature(newVersion, sha256, filename, signature)) {
    return;
  }

  Serial.println("[ota] Downloading firmware...");
  if (performOta(dlUrl, sha256, 0)) {
    Serial.println("[ota] Rebooting into new firmware...");
    delay(1000);
    ESP.restart();
  }
}

// ─── ADC (Timer Interrupt Driven) ───────────────────────

// Sample buffer — filled by ISR, read by main loop
static volatile uint16_t adcBuffer[ADC_SAMPLES][8];
static volatile uint16_t adcSampleIndex = 0;
static volatile bool     adcCaptureComplete = false;
static volatile bool     adcCapturing = false;

// Hardware timer handle
static hw_timer_t *adcTimer = NULL;

// ISR — runs at ADC_SAMPLE_INTERVAL_US cadence
void IRAM_ATTR onAdcTimer() {
  if (!adcCapturing || adcCaptureComplete) return;

  uint16_t idx = adcSampleIndex;
  if (idx >= ADC_SAMPLES) {
    adcCaptureComplete = true;
    adcCapturing = false;
    return;
  }

  // Read all 8 channels in rapid succession inside the ISR.
  // analogRead is safe to call from ISR on ESP32 Arduino core.
  adcBuffer[idx][0] = analogRead(ADC_PIN_V1);
  adcBuffer[idx][1] = analogRead(ADC_PIN_V2);
  adcBuffer[idx][2] = analogRead(ADC_PIN_V3);
  adcBuffer[idx][3] = analogRead(ADC_PIN_I1);
  adcBuffer[idx][4] = analogRead(ADC_PIN_I2);
  adcBuffer[idx][5] = analogRead(ADC_PIN_I3);
  adcBuffer[idx][6] = analogRead(ADC_PIN_A);
  adcBuffer[idx][7] = analogRead(ADC_PIN_B);

  adcSampleIndex = idx + 1;
}

static void setupAdc() {
  analogReadResolution(ADC_RESOLUTION);
  for (uint8_t i = 0; i < 8; i++) {
    analogSetPinAttenuation(adcPins[i], ADC_ATTENUATION);
  }

  // Hardware timer 0, prescaler 80 → 1 µs tick (80 MHz APB / 80)
  adcTimer = timerBegin(0, 80, true);
  timerAttachInterrupt(adcTimer, &onAdcTimer, true);
  timerAlarmWrite(adcTimer, ADC_SAMPLE_INTERVAL_US, true);
  timerAlarmEnable(adcTimer);

  Serial.printf("[adc] Timer interrupt configured — %d µs interval, %d samples\n",
                ADC_SAMPLE_INTERVAL_US, ADC_SAMPLES);
}

// Start a new capture cycle
static void startAdcCapture() {
  adcSampleIndex = 0;
  adcCaptureComplete = false;
  adcCapturing = true;
  Serial.printf("[adc] Capture started (%d samples @ %d µs)\n",
                ADC_SAMPLES, ADC_SAMPLE_INTERVAL_US);
}

// Upload the captured buffer to the server
static void uploadAdcData() {
  Serial.println("[adc] Uploading captured data...");

  HTTPClient http;
  http.begin(buildUrl("/api/data"));
  http.addHeader("Content-Type", "application/json");

  // Build JSON body — matches existing fault-data schema
  String body;
  body.reserve(ADC_SAMPLES * 110 + 256);

  body += "{\"espId\":\"";
  body += deviceId;
  body += "\",\"faultType\":\"adc_live\",\"faultLocation\":\"";
  body += deviceId;
  body += "\",\"date\":\"";

  unsigned long sec = millis() / 1000;
  char ts[32];
  snprintf(ts, sizeof(ts), "2025-01-01");
  body += ts;
  body += "\",\"time\":\"";
  snprintf(ts, sizeof(ts), "%02lu:%02lu:%02lu", (sec / 3600) % 24, (sec / 60) % 60, sec % 60);
  body += ts;
  body += "\",\"sampleRateHz\":";
  body += String(1000000UL / ADC_SAMPLE_INTERVAL_US);
  body += ",\"data\":[";

  for (int n = 0; n < ADC_SAMPLES; n++) {
    if (n > 0) body += ',';
    char sample[128];
    snprintf(sample, sizeof(sample),
      "{\"n\":%d,\"v1\":%u,\"v2\":%u,\"v3\":%u,\"i1\":%u,\"i2\":%u,\"i3\":%u,\"A\":%u,\"B\":%u}",
      n,
      adcBuffer[n][0], adcBuffer[n][1], adcBuffer[n][2],
      adcBuffer[n][3], adcBuffer[n][4], adcBuffer[n][5],
      adcBuffer[n][6], adcBuffer[n][7]);
    body += sample;
  }

  body += "]}";

  int code = http.POST(body);
  if (code == 200) {
    Serial.println("[adc] Upload OK");
  } else {
    Serial.printf("[adc] Upload failed  HTTP %d\n", code);
  }
  http.end();
}

// ─── Setup & Loop ───────────────────────────────────────

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("╔══════════════════════════════════════╗");
  Serial.println("║   DFR — ESP32 Firmware + ADC Client   ║");
  Serial.printf( "║     Version: %-24s║\n", FW_VERSION);
  Serial.println("╚══════════════════════════════════════╝");

  deviceId = resolveDeviceId();
  Serial.printf("[init] Device ID: %s\n", deviceId.c_str());

  setupAdc();
  connectWiFi();

  // Initial heartbeat + OTA check on boot
  if (WiFi.status() == WL_CONNECTED) {
    sendHeartbeat();
    lastHeartbeat = millis();

    checkForUpdate();
    lastOtaCheck = millis();
  }
}

void loop() {
  connectWiFi();
  if (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    return;
  }

  unsigned long now = millis();

  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    sendHeartbeat();
    lastHeartbeat = now;
  }

  if (now - lastOtaCheck >= OTA_CHECK_INTERVAL_MS) {
    checkForUpdate();
    lastOtaCheck = now;
  }

  // ADC capture/upload cycle
  if (!adcCapturing && !adcCaptureComplete &&
      (now - lastAdcUpload >= ADC_UPLOAD_INTERVAL_MS)) {
    startAdcCapture();
  }

  if (adcCaptureComplete) {
    uploadAdcData();
    adcCaptureComplete = false;
    lastAdcUpload = now;
  }

  // Yield to background tasks
  delay(100);
}
