# DFR — Digital Fault Recorder

A full-stack IoT system for monitoring electrical faults and managing ESP32 firmware. Combines a **Next.js web dashboard** with **Arduino-based ESP32 firmware** for real-time ADC sampling, waveform visualization, and secure over-the-air updates.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS 4, Chart.js 4.5 |
| Backend | Next.js API Routes, Node.js `fs/promises`, JSON file persistence |
| ESP32 | Arduino Core, WiFi, HTTPClient, Update, ArduinoJson, mbedtls |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/patthananb/dfr.git
cd dfr
npm install
```

### Environment Variables

Copy the example and set your HMAC secret:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `FIRMWARE_HMAC_SECRET` | Shared secret for firmware signing. Must match `HMAC_SECRET` in `esp32/config.h`. |

### Running

```bash
npm run dev      # Development server on http://localhost:3000
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Test Data

Generate synthetic sine-wave fault data without real hardware:

```bash
./send-dummy-data.sh
```

This creates JSON files in `data/` with 1000 samples across 8 channels (V1–V3, I1–I3, A, B) using randomized frequencies and fault types.

## Project Structure

```
dfr/
├── esp32/                    ESP32 Arduino firmware
│   ├── esp32.ino             Main firmware (OTA client + ADC sampler)
│   └── config.h              WiFi, server, ADC, timing configuration
├── src/
│   ├── app/
│   │   ├── page.js           Home — latest fault summary
│   │   ├── graph/page.js     Waveform viewer + live ADC mode
│   │   ├── firmware/         Firmware management UI
│   │   ├── sites/            Site management pages
│   │   └── api/
│   │       ├── data/         Fault data retrieval + ADC upload
│   │       ├── faults/       Fault query/filtering
│   │       ├── firmware/     OTA firmware endpoints
│   │       ├── sites/        Site CRUD
│   │       └── status/       Device heartbeat tracking
│   ├── components/
│   │   └── Navbar.jsx        Navigation bar
│   └── lib/
│       ├── validate.js       Path traversal prevention
│       ├── json-store.js     Atomic JSON read-modify-write with locking
│       ├── firmware.js       Shared firmware manifest operations
│       ├── crypto.js         HMAC-SHA256 signing/verification
│       └── sites.js          Site data helpers
├── data/                     Runtime — fault JSON files, heartbeat, sites
├── firmware/                 Runtime — firmware binaries per device
├── send-dummy-data.sh        Test data generator
└── CLAUDE.md                 AI assistant guidance
```

Both `data/` and `firmware/` are git-ignored and created at runtime.

## Web Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard showing the latest fault with a link to view its waveform |
| `/graph` | File picker with Chart.js graphs for voltage, current, and A/B signals. Includes a **Live ADC** mode that auto-refreshes every 3 seconds. |
| `/firmware` | Upload firmware, view version history, set active version, rollback, and bulk deploy across devices |
| `/firmware/guide` | Step-by-step OTA setup guide for ESP32 devices |
| `/sites` | List all sites with device online/offline status |
| `/sites/setup` | Register a new site with devices and WiFi credentials |
| `/sites/[id]` | Site detail — heartbeat info, firmware status, fault history, edit |

## API Reference

### Sensor Data — `/api/data`

| Method | Params | Description |
|--------|--------|-------------|
| `GET` | — | List all data filenames |
| `GET` | `?file=<name>` | Retrieve a specific data file |
| `GET` | `?latest=<prefix>` | Get the most recent file matching a prefix (e.g. `adc_live`) |
| `POST` | `{ espId, faultType, faultLocation, date, time, sampleRateHz, data }` | Upload ADC/fault samples from ESP32 |

### Fault Listing — `/api/faults`

| Method | Params | Description |
|--------|--------|-------------|
| `GET` | `?site=<name>` (optional) | List fault records, optionally filtered by site |

### Device Status — `/api/status`

| Method | Params | Description |
|--------|--------|-------------|
| `GET` | — | All devices with online status (online = heartbeat within 5 min) |
| `POST` | `{ espId, timestamp?, firmwareVersion?, rssi?, uptime?, freeHeap? }` | Record a heartbeat |

### Site Management — `/api/sites`

| Method | Params | Description |
|--------|--------|-------------|
| `GET` | — | List all sites (WiFi passwords stripped) |
| `POST` | `{ name, wifi: { ssid, password }, devices }` | Create a site |
| `PUT` | `{ id, name, wifi, devices }` | Update a site |
| `DELETE` | `?id=<siteId>` | Delete a site |

### Firmware OTA — `/api/firmware`

| Method | Params | Description |
|--------|--------|-------------|
| `GET` | `?espId=<id>` (optional) | List firmware versions for one or all devices |
| `POST` | FormData: `file`, `espId`, `version?`, `releaseNotes?` | Upload firmware binary (auto-sets as active) |
| `PUT` | `{ espId, active }` | Set active firmware version |
| `DELETE` | `?espId=<id>&filename=<name>` | Delete a firmware version |

### Firmware Sub-endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/firmware/check?espId=...&currentVersion=...` | `GET` | ESP32 check-in — returns signed manifest if update available |
| `/api/firmware/latest?espId=...` | `GET` | Download active firmware binary (with SHA-256 and version headers) |
| `/api/firmware/rollback` | `POST` | `{ espId }` — Revert to the previous firmware version |
| `/api/firmware/force` | `POST` | `{ espId \| siteId \| all: true }` — Flag devices for forced update |
| `/api/firmware/force` | `GET` | List current force-update flags |

## Data Format

Fault and ADC data files follow this schema:

```json
{
  "faultType": "line_to_ground",
  "faultLocation": "feeder_1",
  "date": "2026-03-15",
  "time": "14:30:00",
  "sampleRateHz": 1000,
  "data": [
    { "n": 0, "v1": 2047, "v2": 2047, "v3": 2047, "i1": 2047, "i2": 2047, "i3": 2047, "A": 2047, "B": 2047 },
    { "n": 1, "v1": 2100, "v2": 1990, "v3": 2050, "i1": 2080, "i2": 2010, "i3": 2045, "A": 2060, "B": 2030 }
  ]
}
```

Filenames follow the pattern `{faultType}_{faultLocation}_{YYYYMMDD}_{HHmmss}.json`.

## ESP32 Firmware

The Arduino sketch in `esp32/` handles three tasks:

1. **Heartbeat** — sends device status (RSSI, uptime, free heap, firmware version) to `POST /api/status` every 60 seconds
2. **OTA updates** — checks `GET /api/firmware/check` every 5 minutes; downloads, verifies (SHA-256 + HMAC-SHA256), and flashes new firmware
3. **ADC sampling** — reads 8 channels via hardware timer interrupt and uploads batches to `POST /api/data`

### ADC Pin Assignments

| Channel | GPIO | ADC |
|---------|------|-----|
| V1, V2, V3 | 32, 33, 34 | ADC1 |
| I1, I2, I3 | 35, 36, 39 | ADC1 |
| A, B | 25, 26 | ADC2 |

### Configuration (`esp32/config.h`)

| Setting | Default | Description |
|---------|---------|-------------|
| `WIFI_SSID` / `WIFI_PASSWORD` | — | WiFi credentials |
| `SERVER_HOST` | `192.168.1.100` | DFR server address |
| `SERVER_PORT` | `3000` | DFR server port |
| `DEVICE_ID` | Auto from MAC | ESP32 device identifier |
| `FW_VERSION` | `1.0.0` | Current firmware version string |
| `HMAC_SECRET` | — | Shared secret (must match `FIRMWARE_HMAC_SECRET`) |
| `HEARTBEAT_INTERVAL_MS` | `60000` | Heartbeat frequency |
| `OTA_CHECK_INTERVAL_MS` | `300000` | OTA check frequency |
| `ADC_SAMPLE_INTERVAL_US` | `1000` | Sample interval (1 kHz) |
| `ADC_SAMPLES` | `256` | Samples per batch |
| `ADC_RESOLUTION` | `12` | ADC bit resolution (9–12) |

## Security

- All API routes validate path segments with `isSafePathSegment()` to prevent path traversal
- Firmware manifests are signed with HMAC-SHA256; the ESP32 verifies signatures before flashing
- HMAC comparison uses timing-safe equality to prevent timing attacks
- JSON file writes use atomic temp-file + rename to prevent corruption
- Concurrent writes are serialized with in-process mutex locking
- WiFi passwords are stripped from all API responses via `sanitizeSites()`
