# Data Fault Recorder

A Next.js 15 application that stores JSON sensor data and renders it as interactive line graphs. It uses React 19, Tailwind CSS, and Chart.js for responsive client-side visualizations.

## Architecture
- **App Router**: The project uses Next.js' `app/` directory for server components and routing.
- **API Routes**: Located in `src/app/api/`, they handle data retrieval.
- **Data Storage**: Files are saved under the top-level `data/` folder.
- **Client Components**: Pages under `src/app/` fetch lists of JSON files and plot selected datasets via `react-chartjs-2`.

## Core Features
1. **Generate JSON files** (e.g., via `send-dummy-data.sh`) directly into `data/`.
2. **List available files** or **retrieve JSON contents** with `GET /api/data`.
3. **Visualize data** on the Graph page where users choose a file and see its waveform samples on dual voltage/current charts.

## Data Flow
1. Data files are placed in `data/`.
2. The client fetches `/api/data` to list files, then `/api/data?file=...` to get contents.
3. Parsed values are rendered in Chart.js line graphs for voltage and current.

## Development
```bash
npm install      # install dependencies
npm run dev      # start development server
npm run lint     # run ESLint checks
```
No test suite is currently defined.

