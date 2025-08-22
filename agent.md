# Agent Guide

This project ingests CSV sensor data and visualizes it with Chart.js.

## Project Structure
- `src/app/`
  - `page.jsx` – index landing page.
  - `graph/page.jsx` – client page that lists CSV files and draws charts.
  - `api/upload/route.js` – accepts `multipart/form-data` uploads and writes files into `data/` with a timestamped filename.
  - `api/data/route.js` – lists filenames or returns file contents based on the `file` query string.
- `data/` – runtime storage for uploaded CSV files.
- `send-dummy-data.sh` – helper script to generate and post synthetic CSVs for testing.

## How It Works
1. CSV files are uploaded to `/api/upload`.
2. Files are read back via `/api/data`.
3. The Graph page parses lines as `<timestamp,value>` pairs and renders them with `react-chartjs-2`.

## Development Notes
- Uses Next.js 15, React 19, Tailwind CSS 4.
- Run `npm run lint` before committing.
- No automated tests are configured.
