# Agent Guide

This project ingests JSON sensor data and visualizes it with Chart.js.

## Project Structure
- `src/app/`
  - `page.js` – landing page displaying the latest fault summary.
  - `graph/page.js` – client page that lists JSON files and draws charts.
  - `firmware/page.jsx` – drag-and-drop interface for uploading firmware files per ESP32.
  - `sites/page.jsx` – site information list with links to detailed views.
  - `sites/setup/page.jsx` – site setup form for WiFi + ESP32 registration.
  - `sites/[id]/page.jsx` – site detail page with heartbeat, firmware version, faults, and edit controls.
  - `api/data/route.js` – lists filenames or returns file contents based on the `file` query string.
  - `api/firmware/route.js` – saves uploaded firmware to `firmware/<espId>/`.
  - `api/sites/route.js` – create, update, or delete site definitions.
  - `api/status/route.js` – read or update ESP32 heartbeat + firmware version status.
  - `api/faults/route.js` – list fault summaries (optionally filtered by site).
  - `data/` – runtime storage for JSON files.
- `src/components/Navbar.jsx` – links to Home, Graph, Firmware, Sites, and Site Setup pages.
- `send-dummy-data.sh` – helper script to generate synthetic JSON for testing.
- `firmware/` – storage for uploaded firmware binaries grouped by ESP32 ID.

## How It Works
1. JSON files are generated (e.g., via the dummy-data script) under `data/`.
2. Files are read back via `/api/data`.
3. The Graph page parses sample objects and renders them with `react-chartjs-2`.
4. Sites are registered under `/sites/setup` with WiFi + ESP32 identifiers.
5. Firmware files are uploaded from `/firmware` and persisted by `/api/firmware` per ESP32.

## API Endpoints
- `GET /api/data` – returns all filenames or, with `?file=name`, the contents of that file.
- `POST /api/firmware` – accepts a form upload with `file` and `espId` and writes the file to `firmware/<espId>/`.
- `GET /api/firmware/latest?espId=...` – returns the most recently uploaded firmware binary for an ESP32.
- `GET /api/sites` – returns the list of sites.
- `POST /api/sites` – creates a new site.
- `PUT /api/sites` – updates a site.
- `DELETE /api/sites?id=...` – removes a site.
- `GET /api/status` – returns heartbeat + firmware versions for ESP32 devices.
- `POST /api/status` – updates heartbeat (and firmware version) for an ESP32.
- `GET /api/faults?site=...` – lists fault summaries filtered by site name.

## Development Notes
- Uses Next.js 15, React 19, Tailwind CSS 4.
- Run `npm run lint` before committing.
- No automated tests are configured.
