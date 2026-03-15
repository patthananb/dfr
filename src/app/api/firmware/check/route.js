import { NextResponse } from "next/server";
import { join } from "path";
import { isSafePathSegment } from "@/lib/validate";
import { readJSON, updateJSON } from "@/lib/json-store";
import { readManifest } from "@/lib/firmware";

const DATA_DIR = join(process.cwd(), "data");
const HEARTBEAT_FILE = join(DATA_DIR, "heartbeat.json");
const FORCE_FILE = join(DATA_DIR, "force-updates.json");

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

    if (!isSafePathSegment(espId)) {
      return NextResponse.json({ error: "Invalid ESP32 ID" }, { status: 400 });
    }

    // Record heartbeat atomically
    await updateJSON(HEARTBEAT_FILE, (heartbeat) => {
      heartbeat[espId] = {
        ...heartbeat[espId],
        lastSeen: new Date().toISOString(),
        firmwareVersion: currentVersion || heartbeat[espId]?.firmwareVersion,
      };
      return heartbeat;
    });

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

    // Clear force flag after acknowledging (atomically)
    if (isForced) {
      await updateJSON(FORCE_FILE, (flags) => {
        delete flags[espId];
        return flags;
      });
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
