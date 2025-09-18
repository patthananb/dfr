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

## API Endpoints
- `GET /api/data` – returns `{ success: true, filenames: [...] }`. Pass `?file=NAME` to receive `{ success: true, files: [content] }` for that file.
- `POST /api/firmware` – accepts a multipart form with a `file` field and saves the upload to `firmware/`.
- `GET /api/firmware/latest` – downloads the most recently uploaded firmware binary.

## Data Flow
1. Data files are placed in `data/`.
2. The client fetches `/api/data` to list files, then `/api/data?file=...` to get contents.
3. Parsed values are rendered in Chart.js line graphs for voltage and current.

## Firmware Upload
1. Visit `/firmware` to drag and drop or select a file.
2. Upload **only** firmware header files with the `.h` extension. Files with other extensions are rejected so that the MCU can consume the header payload directly.
3. The file is sent to `/api/firmware` and saved to `firmware/`.

### Creating the `.h` firmware file with Arduino IDE
1. Open your sketch in Arduino IDE and select **Sketch → Export Compiled Binary**. The IDE will build the sketch and place the compiled output in your sketch directory.
2. Choose **Sketch → Show Sketch Folder** to open the location of the exported files. Inside the `build/<board>/` folder you will see the generated binary (for example, `firmware.ino.bin`).
3. Convert that binary into a C header by running the following command in a terminal from the same folder:
   ```bash
   xxd -i firmware.ino.bin > firmware.h
   ```
   The command uses the standard `xxd` tool (bundled with common shells such as Git Bash and macOS/Linux terminals) to wrap the binary bytes in a `const unsigned char[]` definition that the firmware loader expects.
4. Upload the resulting `firmware.h` file through the `/firmware` page.

## Development
```bash
npm install      # install dependencies
npm run dev      # start development server
npm run lint     # run ESLint checks
```
No test suite is currently defined.
