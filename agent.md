# Agent Guide

This project ingests JSON sensor data and visualizes it with Chart.js.

## Project Structure
- `src/app/`
  - `page.js` – landing page displaying the latest fault summary.
  - `graph/page.js` – client page that lists JSON files and draws charts.
  - `firmware/page.jsx` – drag-and-drop interface for uploading firmware files.
  - `api/data/route.js` – lists filenames or returns file contents based on the `file` query string.
  - `api/firmware/route.js` – saves uploaded firmware to the top-level `firmware/` directory.
  - `data/` – runtime storage for JSON files.
- `src/components/Navbar.jsx` – links to Home, Graph, and Firmware pages.
- `send-dummy-data.sh` – helper script to generate synthetic JSON for testing.
- `firmware/` – storage for uploaded firmware binaries.

## How It Works
1. JSON files are generated (e.g., via the dummy-data script) under `data/`.
2. Files are read back via `/api/data`.
3. The Graph page parses sample objects and renders them with `react-chartjs-2`.
4. Firmware files are uploaded from `/firmware` and persisted by `/api/firmware`.

## Development Notes
- Uses Next.js 15, React 19, Tailwind CSS 4.
- Run `npm run lint` before committing.
- No automated tests are configured.
