import { readFile, writeFile, mkdir, rename } from "fs/promises";
import { join, dirname } from "path";

const locks = new Map();

/**
 * Atomically read-modify-write a JSON file with in-process locking.
 * Prevents concurrent requests from losing updates.
 * @param {string} filePath - Path to the JSON file
 * @param {(data: object) => object | Promise<object>} updater - Function that receives current data and returns updated data
 * @returns {Promise<object>} The updated data
 */
export async function updateJSON(filePath, updater) {
  // Wait for any pending operation on this file
  while (locks.has(filePath)) {
    await locks.get(filePath);
  }

  let resolve;
  const lockPromise = new Promise((r) => { resolve = r; });
  locks.set(filePath, lockPromise);

  try {
    const data = await readJSON(filePath);
    const updated = await updater(data);
    await writeJSONAtomic(filePath, updated);
    return updated;
  } finally {
    locks.delete(filePath);
    resolve();
  }
}

/**
 * Read a JSON file, returning a default value on missing/corrupt files.
 */
export async function readJSON(filePath, defaultValue = {}) {
  try {
    return JSON.parse(await readFile(filePath, "utf-8"));
  } catch {
    return defaultValue;
  }
}

/**
 * Write JSON atomically using write-to-temp + rename.
 */
async function writeJSONAtomic(filePath, data) {
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });
  const tmpPath = filePath + `.tmp.${Date.now()}`;
  await writeFile(tmpPath, JSON.stringify(data, null, 2));
  await rename(tmpPath, filePath);
}
