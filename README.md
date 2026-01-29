# Data Fault Recorder

A Next.js 15 application that stores JSON sensor data and renders it as interactive line graphs. It uses React 19, Tailwind CSS, and Chart.js for responsive client-side visualizations.

## Architecture
- **App Router**: The project uses Next.js' `app/` directory for server components and routing.
- **API Routes**: Located in `src/app/api/`, they handle data retrieval, firmware uploads, site management, and heartbeat status.
- **Data Storage**: Files are saved under the top-level `data/` folder.
- **Firmware Storage**: Uploaded binaries are written under `firmware/<espId>/`.
- **Client Components**: Pages under `src/app/` fetch lists of JSON files and plot selected datasets via `react-chartjs-2`. A reusable `Navbar` component links to Home, Graph, Firmware, Sites, and Site Setup pages.

## Core Features
1. **Generate JSON files** (e.g., via `send-dummy-data.sh`) directly into `data/`.
2. **List available files** or **retrieve JSON contents** with `GET /api/data`.
3. **Visualize data** on the Graph page where users choose a file and see its waveform samples on dual voltage/current charts.
4. **Register sites** with WiFi credentials and ESP32 IDs/MAC addresses via `/sites/setup`.
5. **Review site info** on `/sites` and drill into `/sites/[id]` for per-device heartbeat, firmware versions, and site fault summaries.
6. **Upload firmware** from `/firmware` with a target ESP32 ID; files are stored under `firmware/<espId>/` by `/api/firmware`.
7. **See the latest fault summary** on the landing page with a quick link to its graph.

## API Endpoints
- `GET /api/data` – returns `{ success: true, filenames: [...] }`. Pass `?file=NAME` to receive `{ success: true, files: [content] }` for that file.
- `POST /api/firmware` – accepts a multipart form with `file` and `espId` fields and saves the upload to `firmware/<espId>/`.
- `GET /api/firmware/latest?espId=...` – downloads the most recent firmware binary for the given ESP32.
- `GET /api/sites` – returns the list of configured sites with their ESP32 IDs/MACs.
- `POST /api/sites` – creates a new site with WiFi credentials and ESP32 devices.
- `PUT /api/sites` – updates a site with new metadata and device assignments.
- `DELETE /api/sites?id=...` – removes a site by ID.
- `GET /api/status` – returns heartbeat status and firmware versions for registered ESP32 devices.
- `POST /api/status` – records a heartbeat (optionally with firmware version) for an ESP32.
- `GET /api/faults?site=...` – returns fault summaries filtered by site name.

## Data Flow
1. Data files are placed in `data/`.
2. The client fetches `/api/data` to list files, then `/api/data?file=...` to get contents.
3. Parsed values are rendered in Chart.js line graphs for voltage and current.

## Firmware Upload
1. Visit `/firmware` and select the target ESP32 ID.
2. Drag and drop or select a firmware file.
3. The file is sent to `/api/firmware` and saved to `firmware/<espId>/`.

## Development
```bash
npm install      # install dependencies
npm run dev      # start development server
npm run lint     # run ESLint checks
```
No test suite is currently defined.
