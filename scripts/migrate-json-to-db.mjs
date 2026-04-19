#!/usr/bin/env node
// Migrate existing JSON file state into the Prisma-managed database.
//
// Reads (all optional — missing files are skipped):
//   data/sites.json
//   data/heartbeat.json
//   data/force-updates.json
//   data/*.json (anything else treated as a fault recording)
//   firmware/{espId}/manifest.json
//
// Flags:
//   --dry-run   Print what would be written, touch nothing
//   --wipe      Truncate target tables before inserting. Required for
//               heartbeat/force-update re-runs (those have no natural unique key).
//
// This script talks to Prisma directly rather than going through the repo
// layer: migrations predate the flag-based backend switch, and we want to
// side-step isDbEnabled() regardless of env.

import { PrismaClient } from "@prisma/client";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const DATA_DIR = join(ROOT, "data");
const FIRMWARE_DIR = join(ROOT, "firmware");

const RESERVED_FILES = new Set([
  "sites.json",
  "heartbeat.json",
  "force-updates.json",
  ".gitkeep",
]);

const argv = new Set(process.argv.slice(2));
const DRY = argv.has("--dry-run");
const WIPE = argv.has("--wipe");

const prisma = new PrismaClient();

function log(stage, msg) {
  console.log(`[${stage}] ${msg}`);
}

async function readJsonOptional(path) {
  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function wipe() {
  if (!WIPE) return;
  if (DRY) {
    log("wipe", "(dry-run) would truncate all tables");
    return;
  }
  // Order matters: children before parents so FK constraints pass.
  await prisma.forceUpdate.deleteMany({});
  await prisma.firmwareVersion.deleteMany({});
  await prisma.fault.deleteMany({});
  await prisma.heartbeat.deleteMany({});
  await prisma.device.deleteMany({});
  await prisma.site.deleteMany({});
  log("wipe", "truncated forceUpdate, firmwareVersion, fault, heartbeat, device, site");
}

async function migrateSites() {
  const sitesFile = join(DATA_DIR, "sites.json");
  const data = await readJsonOptional(sitesFile);
  if (!data || !Array.isArray(data.sites)) {
    log("sites", "no sites.json, skipping");
    return { sites: 0, devices: 0 };
  }

  let siteCount = 0;
  let deviceCount = 0;

  for (const site of data.sites) {
    if (!site.id || !site.name) continue;
    siteCount++;
    const devices = Array.isArray(site.devices) ? site.devices : [];
    deviceCount += devices.length;

    if (DRY) {
      log("sites", `would upsert site ${site.id} (${site.name}) with ${devices.length} devices`);
      continue;
    }

    await prisma.site.upsert({
      where: { id: site.id },
      update: {
        name: site.name,
        ssid: site.wifi?.ssid || null,
        passwordEnc: site.wifi?.password || null,
      },
      create: {
        id: site.id,
        name: site.name,
        ssid: site.wifi?.ssid || null,
        passwordEnc: site.wifi?.password || null,
        createdAt: site.createdAt ? new Date(site.createdAt) : new Date(),
      },
    });

    for (const d of devices) {
      if (!d.id) continue;
      await prisma.device.upsert({
        where: { espId: d.id },
        update: { siteId: site.id, label: d.mac || null },
        create: { espId: d.id, siteId: site.id, label: d.mac || null },
      });
    }
  }

  log("sites", `processed ${siteCount} sites, ${deviceCount} devices`);
  return { sites: siteCount, devices: deviceCount };
}

async function migrateHeartbeats() {
  const hbFile = join(DATA_DIR, "heartbeat.json");
  const data = await readJsonOptional(hbFile);
  if (!data || typeof data !== "object") {
    log("heartbeat", "no heartbeat.json, skipping");
    return { inserted: 0 };
  }

  const entries = Object.entries(data);
  if (entries.length === 0) {
    log("heartbeat", "empty, skipping");
    return { inserted: 0 };
  }

  // heartbeat.json stores the latest beat per device; we materialize one row
  // per device, which is what the UI reads.
  let inserted = 0;
  for (const [espId, record] of entries) {
    if (!record?.lastSeen) continue;
    if (DRY) {
      log("heartbeat", `would insert heartbeat for ${espId} @ ${record.lastSeen}`);
      inserted++;
      continue;
    }

    await prisma.device.upsert({
      where: { espId },
      update: {},
      create: { espId },
    });

    await prisma.heartbeat.create({
      data: {
        espId,
        ts: new Date(record.lastSeen),
        rssi: typeof record.rssi === "number" ? record.rssi : null,
        firmwareVersion: record.firmwareVersion || null,
      },
    });
    inserted++;
  }

  log("heartbeat", `inserted ${inserted} rows`);
  return { inserted };
}

async function migrateForceFlags() {
  const forceFile = join(DATA_DIR, "force-updates.json");
  const data = await readJsonOptional(forceFile);
  if (!data || typeof data !== "object") {
    log("force", "no force-updates.json, skipping");
    return { inserted: 0 };
  }
  const entries = Object.entries(data);
  if (entries.length === 0) return { inserted: 0 };

  let inserted = 0;
  for (const [espId, record] of entries) {
    if (!record) continue;
    if (DRY) {
      log("force", `would flag ${espId}`);
      inserted++;
      continue;
    }

    await prisma.device.upsert({
      where: { espId },
      update: {},
      create: { espId },
    });
    await prisma.forceUpdate.create({
      data: {
        espId,
        createdAt: record.flaggedAt ? new Date(record.flaggedAt) : new Date(),
      },
    });
    inserted++;
  }
  log("force", `inserted ${inserted} rows`);
  return { inserted };
}

async function migrateFaults() {
  if (!(await exists(DATA_DIR))) return { inserted: 0, skipped: 0 };

  const names = await readdir(DATA_DIR);
  const faultFiles = names.filter(
    (n) => n.endsWith(".json") && !RESERVED_FILES.has(n)
  );

  let inserted = 0;
  let skipped = 0;

  for (const file of faultFiles) {
    const full = join(DATA_DIR, file);
    let parsed;
    try {
      parsed = JSON.parse(await readFile(full, "utf-8"));
    } catch (err) {
      log("faults", `skipping ${file} (parse error: ${err.message})`);
      skipped++;
      continue;
    }
    if (!parsed.faultType || !parsed.faultLocation) {
      skipped++;
      continue;
    }

    const date = parsed.date || "1970-01-01";
    const time = parsed.time || "00:00:00";
    const recordedAt = new Date(`${date}T${time}Z`);
    const resolvedAt = Number.isNaN(recordedAt.getTime()) ? new Date() : recordedAt;

    if (DRY) {
      log("faults", `would upsert fault ${file} (${parsed.faultType}/${parsed.faultLocation})`);
      inserted++;
      continue;
    }

    // The Fault table has no unique on sourceFilename by default, so guard
    // with a findFirst+create pattern to stay idempotent.
    const existing = await prisma.fault.findFirst({
      where: { sourceFilename: file },
      select: { id: true },
    });
    if (existing) {
      await prisma.fault.update({
        where: { id: existing.id },
        data: {
          faultType: parsed.faultType,
          faultLocation: parsed.faultLocation,
          recordedAt: resolvedAt,
          sampleRateHz: parsed.sampleRateHz ?? null,
          sampleCount: Array.isArray(parsed.data) ? parsed.data.length : null,
          payload: JSON.stringify(parsed),
        },
      });
    } else {
      await prisma.fault.create({
        data: {
          faultType: parsed.faultType,
          faultLocation: parsed.faultLocation,
          recordedAt: resolvedAt,
          sampleRateHz: parsed.sampleRateHz ?? null,
          sampleCount: Array.isArray(parsed.data) ? parsed.data.length : null,
          sourceFilename: file,
          payload: JSON.stringify(parsed),
        },
      });
    }
    inserted++;
  }

  log("faults", `inserted ${inserted}, skipped ${skipped}`);
  return { inserted, skipped };
}

async function migrateFirmware() {
  if (!(await exists(FIRMWARE_DIR))) return { versions: 0 };

  const entries = await readdir(FIRMWARE_DIR, { withFileTypes: true });
  const deviceDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  let versions = 0;
  for (const espId of deviceDirs) {
    const manifestPath = join(FIRMWARE_DIR, espId, "manifest.json");
    const manifest = await readJsonOptional(manifestPath);
    if (!manifest || !Array.isArray(manifest.versions)) continue;

    if (DRY) {
      log("firmware", `would upsert device ${espId} with ${manifest.versions.length} versions, active=${manifest.active || "null"}`);
      versions += manifest.versions.length;
      continue;
    }

    await prisma.device.upsert({
      where: { espId },
      update: {},
      create: { espId },
    });

    for (const v of manifest.versions) {
      if (!v.filename) continue;
      await prisma.firmwareVersion.upsert({
        where: { espId_filename: { espId, filename: v.filename } },
        update: {
          version: v.version || null,
          sha256: v.sha256 || "",
          hmacSignature: v.signature || "",
          sizeBytes: typeof v.size === "number" ? v.size : 0,
          releaseNotes: v.releaseNotes || null,
          isActive: manifest.active === v.filename,
        },
        create: {
          espId,
          filename: v.filename,
          version: v.version || null,
          sha256: v.sha256 || "",
          hmacSignature: v.signature || "",
          sizeBytes: typeof v.size === "number" ? v.size : 0,
          releaseNotes: v.releaseNotes || null,
          isActive: manifest.active === v.filename,
          uploadedAt: v.uploadedAt ? new Date(v.uploadedAt) : new Date(),
        },
      });
      versions++;
    }
  }

  log("firmware", `processed ${versions} versions`);
  return { versions };
}

async function main() {
  const mode = [DRY && "dry-run", WIPE && "wipe"].filter(Boolean).join(", ") || "write";
  log("start", `mode=${mode}`);

  await wipe();
  const sites = await migrateSites();
  const heartbeats = await migrateHeartbeats();
  const force = await migrateForceFlags();
  const faults = await migrateFaults();
  const firmware = await migrateFirmware();

  log("done", JSON.stringify({
    sites: sites.sites,
    devices: sites.devices,
    heartbeats: heartbeats.inserted,
    forceFlags: force.inserted,
    faults: faults.inserted,
    firmwareVersions: firmware.versions,
  }));
}

main()
  .catch((err) => {
    console.error("[fatal]", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
