# DFR — Digital Fault Recorder

## Project Overview

A full-stack IoT system for monitoring electrical faults and managing ESP32 firmware. Combines a Next.js web application with Arduino-based ESP32 firmware.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS 4, Chart.js 4.5 + react-chartjs-2
- **Backend**: Next.js API Routes, Node.js fs/promises, JSON file persistence
- **ESP32**: Arduino Core for ESP32, WiFi, HTTPClient, Update, ArduinoJson, mbedtls

## Project Structure

```
esp32/              ESP32 Arduino firmware (OTA client + ADC sampler)
  esp32.ino         Main firmware
  config.h          WiFi, server, ADC, timing configuration
src/
  app/
    page.js         Home page (latest fault summary)
    graph/page.js   Graph dashboard (waveform visualization + live ADC)
    firmware/       Firmware management UI
    sites/          Site management pages
    api/
      data/         Data retrieval + ADC upload endpoint (GET/POST)
      status/       Device heartbeat tracking
      firmware/     OTA firmware management endpoints
      sites/        Site CRUD
      faults/       Fault query/filtering
  components/
    Navbar.jsx      Navigation component
  lib/
    crypto.js       HMAC-SHA256 signing for firmware
    sites.js        Site data persistence helpers
data/               Runtime data (fault JSON files, heartbeat, sites)
firmware/           Firmware binaries per device
```

## Key Commands

```bash
npm run dev          # Start Next.js dev server on port 3000
npm run build        # Production build
npm run start        # Start production server
```

## Data Format

Fault/ADC data files in `/data/` follow this JSON schema:
```json
{
  "faultType": "line_to_ground | adc_live",
  "faultLocation": "feeder_1 | esp32-XXXX",
  "date": "YYYY-MM-DD",
  "time": "HH:MM:SS",
  "sampleRateHz": 1000,
  "data": [
    { "n": 0, "v1": 2047, "v2": 2047, "v3": 2047, "i1": 2047, "i2": 2047, "i3": 2047, "A": 2047, "B": 2047 }
  ]
}
```

## API Conventions

- Success: `{ "success": true, "data": {...} }`
- Error: `{ "success": false, "error": "..." }`
- Device IDs auto-generated from MAC: `esp32-{last 4 MAC bytes}`

## ESP32 ADC Configuration

ADC sampling uses a hardware timer interrupt for precise timing. Configuration in `config.h`:
- 8 channels (V1-V3, I1-I3, A, B) on GPIO 32-39 (ADC1) and 25-26 (ADC2)
- 12-bit resolution, 0-3.3V range
- Configurable sample rate via `ADC_SAMPLE_INTERVAL_US` (default 1kHz)
- Configurable batch size via `ADC_SAMPLES` (default 256)
- Data uploaded to `POST /api/data` in the standard fault JSON format

## Environment Variables

```bash
FIRMWARE_HMAC_SECRET=your-secret-key  # Must match HMAC_SECRET in esp32/config.h
```
