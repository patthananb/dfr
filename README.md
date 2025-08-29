# Data Fault Recorder

A Next.js 15 application that stores JSON sensor data and renders it as interactive line graphs. It uses React 19, Tailwind CSS, and Chart.js for responsive client-side visualizations.

## Architecture
- **App Router**: The project uses Next.js' `app/` directory for server components and routing.
- **API Routes**: Located in `src/app/api/`, they handle data retrieval and firmware uploads.
- **Data Storage**: Files are saved under the top-level `data/` folder.
- **Firmware Storage**: Uploaded binaries are written to the top-level `firmware/` folder.
- **Client Components**: Pages under `src/app/` fetch lists of JSON files and plot selected datasets via `react-chartjs-2`. A reusable `Navbar` component links to Home, Graph, and Firmware pages.

## Core Features
1. **Generate JSON files** (e.g., via `send-dummy-data.sh`) directly into `data/`.
2. **List available files** or **retrieve JSON contents** with `GET /api/data`.
3. **Visualize data** on the Graph page where users choose a file and see its waveform samples on dual voltage/current charts.
4. **Upload firmware** from `/firmware` via drag-and-drop or file picker; files are stored under `firmware/` by `/api/firmware`.
5. **See the latest fault summary** on the landing page with a quick link to its graph.

## Data Flow
1. Data files are placed in `data/`.
2. The client fetches `/api/data` to list files, then `/api/data?file=...` to get contents.
3. Parsed values are rendered in Chart.js line graphs for voltage and current.

## Firmware Upload
1. Visit `/firmware` to drag and drop or select a file.
2. The file is sent to `/api/firmware` and saved to `firmware/`.

## Development
```bash
npm install      # install dependencies
npm run dev      # start development server
npm run lint     # run ESLint checks
```
No test suite is currently defined.

