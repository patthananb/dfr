# ESP32 Firmware Guidelines

This directory contains the Arduino core firmware for the DFR (Data Fault Recorder) ESP32 client.

## Project Structure

- `esp32.ino`: Main application logic, including WiFi management, heartbeats, OTA updates, and ADC sampling.
- `config.h`: Configuration parameters, including WiFi credentials, server settings, and ADC pin mapping.

## Coding Standards

### Naming Conventions

- **Variables & Functions**: Use `camelCase`.
- **Macros & Constants**: Use `UPPER_SNAKE_CASE`.
- **Files**: Use `lowercase` with underscores if necessary (e.g., `config.h`).

### Scope & Visibility

- Use `static` for all file-scoped variables and functions to prevent namespace pollution and potential linker conflicts.
- Avoid global variables where possible; prefer passing state via function arguments.

### Libraries

- **JSON**: Use `ArduinoJson` (v7+) for all JSON operations.
- **Networking**: Use `HTTPClient` for RESTful API calls.
- **Crypto**: Use `mbedtls` for HMAC-SHA256 and SHA-256 operations.
- **Updates**: Use the built-in `Update` library for OTA.

## Hardware Best Practices

### ADC Sampling

- **Precision**: Always use a hardware timer interrupt (`hw_timer_t`) for ADC sampling to ensure consistent sample rates.
- **Performance**: Use the `IRAM_ATTR` attribute for Interrupt Service Routines (ISRs) to ensure they run from RAM.
- **Concurrency**: Use `volatile` and `volatile sig_atomic_t` (or simple `volatile bool`) for flags shared between ISRs and the main loop.
- **Pin Selection**: Prefer ADC1 pins (GPIO 32-39). Be aware that ADC2 pins (GPIO 0, 2, 4, 12-15, 25-27) cannot be used when WiFi is active.

### Power & Stability

- Avoid long-running blocking code in `loop()`. Use `delay()` sparingly or use `millis()`-based non-blocking timing.
- Call `yield()` or `delay(1)` in tight loops to prevent Watchdog Timer (WDT) triggers and allow the WiFi stack to process background tasks.

## OTA & Security

- **Verification**: Never flash firmware without verifying both the **SHA-256 hash** of the binary and the **HMAC-SHA256 signature** of the update manifest.
- **Version Control**: Increment `FW_VERSION` in `config.h` for every release.
- **Rollback**: The server supports rollback; ensure the client correctly identifies the `forceUpdate` flag to allow downgrades if necessary.

## Critical Implementation Requirements

To ensure OTA updates and core functionality (heartbeats, ADC sampling) remain operational, the following base code patterns **must** be maintained in any firmware revision:

### 1. WiFi & Network Stability
- **Non-blocking Loop**: The `loop()` function must never block for extended periods. Use `millis()`-based timing for tasks.
- **Connection Maintenance**: `connectWiFi()` or an equivalent must be called in `loop()` to ensure the device reconnects if the signal is lost.
- **Yielding**: Call `delay(1)` or `yield()` in long-running loops to prevent Watchdog Timer (WDT) resets and allow the background WiFi stack to process.

### 2. OTA Update Chain
- **Manifest Verification**: The `verifySignature()` function must be called before any update. It validates the HMAC-SHA256 signature of the `version:sha256:filename` payload.
- **On-the-fly Hash Check**: During `performOta()`, the SHA-256 hash must be computed as the stream is written to flash and verified against the expected hash from the manifest.
- **Force Update Support**: The client must respect the `forceUpdate` flag from the server to allow for critical rollbacks or mandatory updates even if `AUTO_UPDATE` is disabled.

### 3. Heartbeats & Identity
- **Device ID**: Use the MAC-address-based `resolveDeviceId()` to ensure unique identification in the DFR dashboard.
- **Status Reporting**: Periodic heartbeats to `/api/status` are mandatory for the device to appear "Online". They must include `rssi`, `uptime`, `freeHeap`, and the current `FW_VERSION`.

### 4. ADC Timing
- **Hardware Timer**: ADC sampling **must** remain interrupt-driven via `hw_timer_t`. Manual sampling in the `loop()` will lead to jitter and broken waveform visualizations on the dashboard.
- **Buffer Management**: Use the `volatile` flag for the capture buffer and completion flags to ensure thread-safe communication between the ISR and the main loop.

## Example Code Snippets

### Non-blocking Loop & Timing
```cpp
void loop() {
  connectWiFi(); // Ensure connection
  unsigned long now = millis();

  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    sendHeartbeat();
    lastHeartbeat = now;
  }
  
  if (now - lastOtaCheck >= OTA_CHECK_INTERVAL_MS) {
    checkForUpdate();
    lastOtaCheck = now;
  }

  yield(); // Allow background tasks
}
```

### Hardware Timer ADC Sampling (ISR)
```cpp
void IRAM_ATTR onAdcTimer() {
  if (!adcCapturing || adcCaptureComplete) return;

  uint16_t idx = adcSampleIndex;
  if (idx >= ADC_SAMPLES) {
    adcCaptureComplete = true;
    adcCapturing = false;
    return;
  }

  adcBuffer[idx][0] = analogRead(ADC_PIN_V1);
  // ... read other pins
  adcSampleIndex = idx + 1;
}
```

### HMAC Signature Verification
```cpp
bool verifySignature(const String &version, const String &sha256,
                     const String &filename, const String &signature) {
  String payload = version + ":" + sha256 + ":" + filename;
  String computed = hmacSha256(HMAC_SECRET, payload);
  return computed.equalsIgnoreCase(signature);
}
```

## Logging & Debugging

- Use `Serial.printf()` for structured logging.
- Prefix log messages with the subsystem name in brackets (e.g., `[wifi]`, `[ota]`, `[adc]`).
- Ensure `Serial.begin(115200)` is called early in `setup()`.

## Building & Exporting

To generate the firmware binary for OTA updates:

### Arduino IDE 2.x
1. Open `esp32.ino`.
2. Select the correct board (e.g., "ESP32 Dev Module").
3. Go to **Sketch** → **Export Compiled Binary**.
4. The `.bin` file will be in the sketch directory.

### Arduino CLI
```bash
arduino-cli compile --fqbn esp32:esp32:esp32 --output-dir ./output ./esp32.ino
```

Use the generated `.bin` file when uploading via the web dashboard.
