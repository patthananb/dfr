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
