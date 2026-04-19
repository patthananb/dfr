import { join } from "path";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import { prisma } from "@/lib/db";
import { isDbEnabled } from "@/lib/feature-flags";
import { isSafePathSegment } from "@/lib/validate";

const DATA_DIR = join(process.cwd(), "data");

// Reserved top-level JSON files that live in /data but aren't fault recordings.
const RESERVED = new Set(["sites.json", "heartbeat.json", "force-updates.json"]);

function normalize(value) {
  return String(value).toLowerCase().replace(/\s+/g, "_");
}

function sanitizePart(part, fallback) {
  const v = String(part || fallback).replace(/[^a-zA-Z0-9_-]/g, "_");
  return v || fallback;
}

function buildFilename({ faultType, faultLocation, date, time, now }) {
  const safeType = sanitizePart(faultType, "adc_live");
  const safeLoc = sanitizePart(faultLocation, "unknown");
  const d = date ? date.replace(/-/g, "") : now.toISOString().slice(0, 10).replace(/-/g, "");
  const t = time ? time.replace(/:/g, "") : now.toISOString().slice(11, 19).replace(/:/g, "");
  return `${safeType}_${safeLoc}_${d}_${t}.json`;
}

export async function listFaults({ siteFilter } = {}) {
  const normSite = siteFilter ? normalize(siteFilter) : "";

  if (!isDbEnabled()) {
    let entries;
    try {
      entries = await readdir(DATA_DIR, { withFileTypes: true });
    } catch (err) {
      if (err.code === "ENOENT") return [];
      throw err;
    }
    const files = entries
      .filter((e) => e.isFile() && e.name.endsWith(".json") && !RESERVED.has(e.name))
      .map((e) => e.name);

    const out = [];
    for (const file of files) {
      let parsed;
      try {
        parsed = JSON.parse(await readFile(join(DATA_DIR, file), "utf-8"));
      } catch {
        continue;
      }
      if (!parsed.faultType || !parsed.faultLocation) continue;
      if (normSite && !normalize(parsed.faultLocation).includes(normSite)) continue;
      out.push({
        file,
        faultType: parsed.faultType,
        faultLocation: parsed.faultLocation,
        date: parsed.date || null,
        time: parsed.time || null,
      });
    }
    out.sort((a, b) => {
      const aKey = `${a.date || ""} ${a.time || ""}`;
      const bKey = `${b.date || ""} ${b.time || ""}`;
      return bKey.localeCompare(aKey);
    });
    return out;
  }

  const rows = await prisma.fault.findMany({
    orderBy: { recordedAt: "desc" },
    select: {
      sourceFilename: true,
      faultType: true,
      faultLocation: true,
      recordedAt: true,
    },
  });

  return rows
    .filter((r) => !normSite || normalize(r.faultLocation).includes(normSite))
    .map((r) => ({
      file: r.sourceFilename,
      faultType: r.faultType,
      faultLocation: r.faultLocation,
      date: r.recordedAt.toISOString().slice(0, 10),
      time: r.recordedAt.toISOString().slice(11, 19),
    }));
}

// Returns the raw JSON payload as a string (that's what /api/data GET historically returns).
export async function readFaultFile(filename) {
  if (!isSafePathSegment(filename)) {
    const err = new Error("Invalid filename");
    err.code = "EINVAL";
    throw err;
  }

  if (!isDbEnabled()) {
    return readFile(join(DATA_DIR, filename), "utf-8");
  }

  const row = await prisma.fault.findFirst({
    where: { sourceFilename: filename },
  });
  if (!row) {
    const err = new Error("Not found");
    err.code = "ENOENT";
    throw err;
  }

  // Payload is stored as a JSON string of the full fault object.
  return row.payload;
}

export async function listFaultFilenames() {
  if (!isDbEnabled()) {
    let files;
    try {
      files = await readdir(DATA_DIR);
    } catch (err) {
      if (err.code === "ENOENT") return [];
      throw err;
    }
    return files.filter((f) => f.endsWith(".json") && !RESERVED.has(f));
  }

  const rows = await prisma.fault.findMany({
    orderBy: { recordedAt: "desc" },
    select: { sourceFilename: true },
  });
  return rows.map((r) => r.sourceFilename).filter(Boolean);
}

export async function getLatestFilenameByPrefix(prefix) {
  if (!isDbEnabled()) {
    const files = await listFaultFilenames();
    const match = files.filter((f) => f.startsWith(prefix)).sort().reverse();
    return match[0] || null;
  }

  const row = await prisma.fault.findFirst({
    where: { sourceFilename: { startsWith: prefix } },
    orderBy: { recordedAt: "desc" },
    select: { sourceFilename: true },
  });
  return row?.sourceFilename || null;
}

export async function saveFault({
  espId,
  faultType,
  faultLocation,
  date,
  time,
  sampleRateHz,
  data,
}) {
  const now = new Date();
  const resolvedType = faultType || "adc_live";
  const resolvedLocation = faultLocation || espId || "unknown";
  const resolvedDate = date || now.toISOString().slice(0, 10);
  const resolvedTime = time || now.toISOString().slice(11, 19);

  const filename = buildFilename({
    faultType: resolvedType,
    faultLocation: resolvedLocation,
    date: resolvedDate,
    time: resolvedTime,
    now,
  });

  const payload = {
    faultType: resolvedType,
    faultLocation: resolvedLocation,
    date: resolvedDate,
    time: resolvedTime,
    ...(sampleRateHz && { sampleRateHz }),
    data,
  };

  if (!isDbEnabled()) {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(join(DATA_DIR, filename), JSON.stringify(payload, null, 2));
    return { filename };
  }

  // `recordedAt` merges the date/time parts we derived above so ordering is
  // stable and consistent with the filename.
  const recordedAt = new Date(`${resolvedDate}T${resolvedTime}Z`);

  if (espId) {
    await prisma.device.upsert({
      where: { espId },
      update: {},
      create: { espId },
    });
  }

  await prisma.fault.create({
    data: {
      faultType: resolvedType,
      faultLocation: resolvedLocation,
      espId: espId || null,
      recordedAt: Number.isNaN(recordedAt.getTime()) ? now : recordedAt,
      sampleRateHz: sampleRateHz ?? null,
      sampleCount: Array.isArray(data) ? data.length : null,
      sourceFilename: filename,
      payload: JSON.stringify(payload),
    },
  });

  return { filename };
}
