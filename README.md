# Data Fault Reporter

A Next.js 15 application that stores uploaded CSV sensor data and renders it as interactive line graphs. It uses React 19, Tailwind CSS, and Chart.js for responsive client-side visualizations.

## Architecture
- **App Router**: The project uses Next.js' `app/` directory for server components and routing.
- **API Routes**: Located in `src/app/api/`, they handle file uploads and data retrieval.
- **Data Storage**: Uploaded files are saved under the top-level `data/` folder using Node's `fs/promises` module.
- **Client Components**: Pages under `src/app/` fetch lists of CSV files and plot selected datasets via `react-chartjs-2`.

## Core Features
1. **Upload CSV files** using `POST /api/upload`.
2. **List available files** or **retrieve CSV contents** with `GET /api/data`.
3. **Visualize data** on the Graph page where users choose a file and see its timestamp/value pairs on a line chart.
4. **Dummy data script** (`send-dummy-data.sh`) generates sine-wave CSVs and posts them to the upload endpoint for testing.

## Data Flow
1. Client uploads a CSV to `/api/upload`.
2. The server saves the file in `data/` with a timestamped name.
3. The client fetches `/api/data` to list files, then `/api/data?file=...` to get contents.
4. Parsed values are rendered in a Chart.js line graph.

## Development
```bash
npm install      # install dependencies
npm run dev      # start development server
npm run lint     # run ESLint checks
```
No test suite is currently defined.

