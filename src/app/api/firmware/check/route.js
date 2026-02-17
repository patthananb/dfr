import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const FIRMWARE_DIR = join(process.cwd(), "firmware");
const DATA_DIR = join(process.cwd(), "data");
const HEARTBEAT_FILE = join(DATA_DIR, "heartbeat.json");
const FORCE_FILE = join(DATA_DIR, "force-updates.json");

async function readManifest(espId) {
  try {
    const raw = await readFile(join(FIRMWARE_DIR, espId, "manifest.json"), "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.versions) ? parsed : { versions: [], active: null };
  } catch {
    return { versions: [], active: null };
  }
}

async function readJSON(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf-8"));
  } catch {
    return {};
  }
}

async function writeJSON(filePath, data) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2));
}

// GET /api/firmware/check?espId=...&currentVersion=...
// OTA check-in endpoint for ESP32 devices
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const espId = searchParams.get("espId");
    const currentVersion = searchParams.get("currentVersion") || "";

    if (!espId) {
      return NextResponse.json({ error: "espId is required" }, { status: 400 });
    }

    // Record heartbeat
    const heartbeat = await readJSON(HEARTBEAT_FILE);
    heartbeat[espId] = {
      ...heartbeat[espId],
      lastSeen: new Date().toISOString(),
      firmwareVersion: currentVersion || heartbeat[espId]?.firmwareVersion,
    };
    await writeJSON(HEARTBEAT_FILE, heartbeat);

    // Read manifest
    const manifest = await readManifest(espId);
    if (!manifest.active || manifest.versions.length === 0) {
      return NextResponse.json({ update: false });
    }

    const activeEntry = manifest.versions.find((v) => v.filename === manifest.active);
    if (!activeEntry) {
      return NextResponse.json({ update: false });
    }

    // If current version matches active firmware version, no update needed
    // (unless force update is flagged)
    const forceFlags = await readJSON(FORCE_FILE);
    const isForced = !!forceFlags[espId];

    if (activeEntry.version === currentVersion && !isForced) {
      return NextResponse.json({ update: false });
    }

    // Clear force flag after acknowledging
    if (isForced) {
      delete forceFlags[espId];
      await writeJSON(FORCE_FILE, forceFlags);
    }

    return NextResponse.json({
      update: true,
      version: activeEntry.version,
      filename: activeEntry.filename,
      sha256: activeEntry.sha256,
      signature: activeEntry.signature || null,
      releaseNotes: activeEntry.releaseNotes || "",
      forceUpdate: isForced,
      url: `/api/firmware/latest?espId=${encodeURIComponent(espId)}`,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Check-in failed" }, { status: 500 });
  }
}
