import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

export const FIRMWARE_DIR = join(process.cwd(), "firmware");

const DEFAULT_MANIFEST = { versions: [], active: null };

export function manifestPath(espId) {
  return join(FIRMWARE_DIR, espId, "manifest.json");
}

export async function readManifest(espId) {
  try {
    const raw = await readFile(manifestPath(espId), "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.versions) ? parsed : { ...DEFAULT_MANIFEST };
  } catch (err) {
    if (err.code === "ENOENT") return { ...DEFAULT_MANIFEST };
    throw err;
  }
}

export async function writeManifest(espId, manifest) {
  const dir = join(FIRMWARE_DIR, espId);
  await mkdir(dir, { recursive: true });
  await writeFile(manifestPath(espId), JSON.stringify(manifest, null, 2));
}
