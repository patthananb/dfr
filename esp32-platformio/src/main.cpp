/*
 * DFR — ESP32 OTA Firmware Client + ADC Sampler (PlatformIO build)
 *
 * Entry point only. Subsystems live in their own translation units:
 *   - util.cpp   helpers (URL build, MAC->id, hex, HMAC-SHA256)
 *   - net.cpp    WiFi connect + heartbeat POST
 *   - ota.cpp    firmware check, HMAC verify, SHA-256 verify, flash
 *   - adc.cpp    timer-driven sampling + JSON upload
 *
 * Behaviour matches esp32/esp32.ino — see esp32/README.md for the
 * coding guidelines and OTA contract.
 */

#include <Arduino.h>
#include <WiFi.h>

#include "config.h"
#include "globals.h"
#include "util.h"
#include "net.h"
#include "ota.h"
#include "adc.h"

// ─── Globals ────────────────────────────────────────────
String deviceId;

static unsigned long lastHeartbeat = 0;
static unsigned long lastOtaCheck  = 0;
static unsigned long lastAdcUpload = 0;

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
  if (!adcIsCapturing() && !adcCaptureReady() &&
      (now - lastAdcUpload >= ADC_UPLOAD_INTERVAL_MS)) {
    startAdcCapture();
  }

  if (adcCaptureReady()) {
    uploadAdcData();
    adcClearCaptureReady();
    lastAdcUpload = now;
  }

  // Yield to background tasks
  delay(100);
}
