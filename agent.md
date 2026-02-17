# Agent Guide

This project ingests JSON sensor data and visualizes it with Chart.js.

## Project Structure
- `src/app/`
  - `page.js` – landing page displaying the latest fault summary.
  - `graph/page.js` – client page that lists JSON files and draws charts.
  - `firmware/page.jsx` – firmware manager with drag-and-drop upload, version tracking, history table, rollback, bulk deploy (single device / site / all), and active version management.
  - `sites/page.jsx` – site information list with links to detailed views.
  - `sites/setup/page.jsx` – site setup form for WiFi + ESP32 registration.
  - `sites/[id]/page.jsx` – site detail page with heartbeat, firmware version, faults, and edit controls.
  - `api/data/route.js` – lists filenames or returns file contents based on the `file` query string.
  - `api/firmware/route.js` – upload firmware (with version/hash/HMAC metadata), list firmware history, set active version, or delete a version.
  - `api/firmware/latest/route.js` – returns the active (or most recent) firmware binary for an ESP32, with SHA-256 and version headers.
  - `api/firmware/check/route.js` – OTA check-in endpoint for ESP32 devices; returns signed manifest with update info.
  - `api/firmware/rollback/route.js` – rolls back active firmware to the previous version.
  - `api/firmware/force/route.js` – sets/clears force-update flags for devices.
  - `api/sites/route.js` – create, update, or delete site definitions.
  - `api/status/route.js` – read or update ESP32 heartbeat + firmware version + RSSI/uptime/freeHeap status.
  - `api/faults/route.js` – list fault summaries (optionally filtered by site).
  - `data/` – runtime storage for JSON files.
- `src/lib/crypto.js` – HMAC-SHA256 sign/verify helpers for firmware manifests.
- `src/components/Navbar.jsx` – links to Home, Graph, and Firmware pages.
- `esp32/` – Arduino core sketch for ESP32 OTA firmware client.
- `send-dummy-data.sh` – helper script to generate synthetic JSON for testing.
- `firmware/` – storage for uploaded firmware binaries.

## How It Works
1. JSON files are generated (e.g., via the dummy-data script) under `data/`.
2. Files are read back via `/api/data`.
3. The Graph page parses sample objects and renders them with `react-chartjs-2`.
4. Sites are registered under `/sites/setup` with WiFi + ESP32 identifiers.
5. Firmware files are uploaded from `/firmware` and persisted by `/api/firmware` per ESP32, with version metadata, SHA-256 hashes, HMAC signatures, and active-version tracking stored in a manifest.
6. ESP32 devices check in via `/api/firmware/check` for OTA updates with signature verification.

## API Endpoints
- `GET /api/data` – returns all filenames or, with `?file=name`, the contents of that file.
- `GET /api/firmware?espId=...` – returns firmware history (versions, active) for a device; omit espId to list all devices.
- `POST /api/firmware` – accepts a form upload with `file`, `espId`, optional `version` and `releaseNotes`; writes the file and updates the manifest with HMAC signature.
- `PUT /api/firmware` – sets the active firmware version for a device (body: `{ espId, active }`).
- `DELETE /api/firmware?espId=...&filename=...` – removes a firmware version from the manifest and disk.
- `GET /api/firmware/latest?espId=...` – returns the active firmware binary (falls back to most recent by mtime), with `X-Firmware-SHA256` and `X-Firmware-Version` response headers.
- `GET /api/firmware/check?espId=...&currentVersion=...` – OTA check-in; returns signed manifest if update available, records heartbeat.
- `POST /api/firmware/rollback` – rolls back to previous firmware version (body: `{ espId }`).
- `POST /api/firmware/force` – flags devices for force update (body: `{ espId }` or `{ siteId }` or `{ all: true }`).
- `GET /api/sites` – returns the list of sites.
- `POST /api/sites` – creates a new site.
- `PUT /api/sites` – updates a site.
- `DELETE /api/sites?id=...` – removes a site.
- `GET /api/status` – returns heartbeat + firmware versions + RSSI/uptime/freeHeap for ESP32 devices.
- `POST /api/status` – updates heartbeat (and firmware version, RSSI, uptime, freeHeap) for an ESP32.
- `GET /api/faults?site=...` – lists fault summaries filtered by site name.

## Development Notes
- Uses Next.js 15, React 19, Tailwind CSS 4.
- Run `npm run lint` before committing.
- No automated tests are configured.
