import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const SITES_FILE = join(DATA_DIR, "sites.json");

export async function readSites() {
  try {
    const raw = await readFile(SITES_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.sites)) {
      return [];
    }
    return parsed.sites;
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function writeSites(sites) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(SITES_FILE, JSON.stringify({ sites }, null, 2));
}

export function sanitizeSites(sites) {
  return sites.map((site) => ({
    id: site.id,
    name: site.name,
    createdAt: site.createdAt,
    wifi: {
      ssid: site.wifi?.ssid || "",
      hasPassword: Boolean(site.wifi?.password),
    },
    devices: Array.isArray(site.devices)
      ? site.devices.map((device) => ({
          id: device.id,
          mac: device.mac,
        }))
      : [],
  }));
}
