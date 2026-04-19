# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install             # install dependencies (also runs prisma generate)
npm run dev             # start development server (port 3000)
npm run build           # production build (runs prisma generate first)
npm run start           # run production build
npm run lint            # run ESLint (next/core-web-vitals)

# Database
npm run db:migrate        # create + apply a new Prisma migration (dev)
npm run db:deploy         # apply pending migrations (prod/CI)
npm run db:studio         # launch Prisma Studio
npm run db:migrate-data   # one-time JSON → DB import (idempotent, supports --dry-run / --wipe)

# Docker
docker compose up --build   # build + run the app in a container (SQLite in a named volume)
```

No automated test suite is configured.

Use `send-dummy-data.sh` to generate synthetic JSON sensor files in `data/` for local testing.

## Architecture

**DFR (Data Fault Recorder)** is a Next.js 15 full-stack IoT application for managing ESP32 sensor devices: collecting fault data, visualizing waveforms, and delivering OTA firmware updates.

### Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS 4, Chart.js 4.5 + react-chartjs-2
- **Backend**: Next.js API Routes, Prisma ORM (SQLite by default, Postgres supported via provider flip), with legacy JSON file persistence still available behind a flag
- **ESP32**: Arduino Core for ESP32, WiFi, HTTPClient, Update, ArduinoJson, mbedtls

### Data persistence

Two backends, selected at runtime by `USE_DB`:

- **Prisma + SQLite (default when `USE_DB=1`)** — schema in `prisma/schema.prisma`, migrations in `prisma/migrations/`, dev SQLite file at `data/dfr.db`. All repo calls go through Prisma.
- **Legacy JSON files (default when `USE_DB` is unset)** — state written to disk under `data/`. Kept alive during the DB transition so both paths can be exercised side by side.

Regardless of backend, these filesystem paths remain authoritative for non-metadata:
- `firmware/{espId}/{file.bin}` — firmware binary blobs (the DB only tracks metadata)
- `firmware/{espId}/manifest.json` — only used in JSON mode; ignored when `USE_DB=1`

One-time cutover: run `npm run db:migrate-data` to import existing JSON state into Prisma. The script is idempotent (upserts on natural keys) and supports `--dry-run` / `--wipe`.

### Data Format

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

### Key subsystems

**Firmware OTA pipeline** (`src/app/api/firmware/`):
- `route.js` — CRUD for firmware versions per device (upload, list, set active, delete)
- `check/route.js` — ESP32 check-in endpoint; returns signed manifest if update is available
- `latest/route.js` — serves the active firmware binary with `X-Firmware-SHA256` / `X-Firmware-Version` headers
- `rollback/route.js` — reverts active version to the previous one
- `force/route.js` — sets force-update flags (per device, per site, or globally)

Every firmware manifest entry is signed with HMAC-SHA256 using `FIRMWARE_HMAC_SECRET` (see `.env.example`). The ESP32 client (`esp32/`) verifies this signature before flashing.

**Site & device management** (`src/app/api/sites/`, `src/app/api/status/`):
- Sites group ESP32 devices by location with stored WiFi credentials
- `sanitizeSites()` strips WiFi passwords from API responses
- Devices are "online" if their last heartbeat (`POST /api/status`) was within 5 minutes

**Fault data** (`src/app/api/data/`, `src/app/api/faults/`):
- Sensor files follow the naming convention `{faultType}_{faultLocation}_{YYYYMMDD}_{HHmmss}.json`
- Each file contains a `data` array rendered as multi-line Chart.js graphs (voltage, current, A/B signals)
- `POST /api/data` accepts ADC data uploads from ESP32 devices
- `GET /api/data?latest=adc_live` returns the most recent file matching a prefix

### Frontend pages

| Route | Component type | Purpose |
|---|---|---|
| `/` | Server | Latest fault summary with link to graph |
| `/graph` | Client | File picker + Chart.js waveform viewer + live ADC mode |
| `/firmware` | Client | Upload, version history, rollback, bulk deploy |
| `/firmware/guide` | Client | OTA usage guide |
| `/sites` | Client | Site list with device status |
| `/sites/setup` | Client | Register site + ESP32 devices |
| `/sites/[id]` | Client | Site detail: heartbeat, firmware, faults, edit |

### Shared libraries (`src/lib/`)

- `validate.js` — `isSafePathSegment()` for path traversal prevention, used by all API routes
- `crypto.js` — HMAC-SHA256 signing/verification with timing-safe comparison
- `db.js` — Prisma client singleton (HMR-safe dev cache)
- `feature-flags.js` — `isDbEnabled()` reads the `USE_DB` env var
- `json-store.js` — legacy atomic read/write + in-process locking for JSON files (used only in JSON mode)
- `sites.js`, `firmware.js` — legacy JSON-mode helpers behind the repo facade
- `repos/` — repo layer called by API routes. Each module (`sites.js`, `status.js`, `firmware.js`, `force-updates.js`, `faults.js`) branches on `isDbEnabled()`; routes never touch storage directly

### Environment

`USE_DB=1` switches the repo layer to Prisma. Without it, reads/writes hit the JSON files under `data/` (legacy behaviour).

### Path aliases

`@/` maps to `src/` (configured in `jsconfig.json`). Use `@/components`, `@/lib`, etc.

### ESP32 client

The Arduino sketch in `esp32/` connects to the server, sends periodic heartbeats to `/api/status`, checks for OTA updates via `/api/firmware/check`, downloads and HMAC-verifies the binary, then flashes using the Arduino `Update` library.

ADC sampling uses a hardware timer interrupt for precise timing. Configuration in `config.h`:
- 8 channels (V1-V3, I1-I3, A, B) on GPIO 32-39 (ADC1) and 25-26 (ADC2)
- 12-bit resolution, 0-3.3V range
- Configurable sample rate via `ADC_SAMPLE_INTERVAL_US` (default 1kHz)
- Configurable batch size via `ADC_SAMPLES` (default 256)
- Data uploaded to `POST /api/data` in the standard fault JSON format

### API Conventions

- Success: `{ "success": true, "data": {...} }`
- Error: `{ "success": false, "error": "..." }`
- Device IDs auto-generated from MAC: `esp32-{last 4 MAC bytes}`

### Environment Variables

```bash
FIRMWARE_HMAC_SECRET=your-secret-key   # must match HMAC_SECRET in esp32/config.h
DATABASE_URL="file:../data/dfr.db"     # Prisma datasource (SQLite path or postgres:// URL)
USE_DB=1                               # route storage through Prisma (otherwise legacy JSON mode)
```

### Docker deployment

`docker-compose.yml` ships the app as a non-root container with two named volumes (`dfr-data` for SQLite + fault JSON, `dfr-firmware` for binaries). A Postgres service is stubbed out (commented) for horizontal scaling — flipping to Postgres is `provider = "postgresql"` in `prisma/schema.prisma` plus a new `DATABASE_URL`. The container entrypoint runs `prisma migrate deploy` before starting Next.js.
