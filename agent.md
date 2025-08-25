# Agent Guide

This project ingests JSON fault recordings and visualizes them with Chart.js. Each recording contains top-level metadata—`faultType`, `faultLocation`, `date`, and `time`—and a `data` array of `{n,V1,V2,V3,I1,I2,I3}` samples.

## Project Structure
- `src/app/`
  - `page.js` – index landing page.
  - `graph/page.js` – client page that lists JSON files, shows fault metadata, and draws voltage and current charts.
  - `api/upload/route.js` – accepts `multipart/form-data` uploads and writes files into `data/` with a timestamped filename.
  - `api/data/route.js` – lists filenames or returns JSON file contents based on the `file` query string.
- `data/` – runtime storage for uploaded JSON files.
- `send-dummy-data.sh` – helper script to generate and post synthetic JSON payloads with per-channel random amplitudes and a random 40–60 Hz frequency.

## How It Works
1. JSON fault recordings are uploaded to `/api/upload`.
2. Files are read back via `/api/data`.
3. The Graph page extracts voltage (`V1–V3`) and current (`I1–I3`) series from each sample object, displays file metadata, and renders the data with `react-chartjs-2`.

## Development Notes
- Uses Next.js 15, React 19, Tailwind CSS 4.
- Run `npm run lint` before committing.
- No automated tests are configured.
