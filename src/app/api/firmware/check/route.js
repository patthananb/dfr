import { NextResponse } from "next/server";
import { isSafePathSegment } from "@/lib/validate";
import { readManifest } from "@/lib/repos/firmware";
import { recordHeartbeat } from "@/lib/repos/status";
import { isFlagged, clearFlag } from "@/lib/repos/force-updates";

// GET /api/firmware/check?espId=...&currentVersion=...
// OTA check-in endpoint for ESP32 devices.
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

    await recordHeartbeat(espId, { firmwareVersion: currentVersion });

    const manifest = await readManifest(espId);
    if (!manifest.active || manifest.versions.length === 0) {
      return NextResponse.json({ update: false });
    }

    const activeEntry = manifest.versions.find((v) => v.filename === manifest.active);
    if (!activeEntry) {
      return NextResponse.json({ update: false });
    }

    const forced = await isFlagged(espId);

    if (activeEntry.version === currentVersion && !forced) {
      return NextResponse.json({ update: false });
    }

    if (forced) {
      await clearFlag(espId);
    }

    return NextResponse.json({
      update: true,
      version: activeEntry.version,
      filename: activeEntry.filename,
      sha256: activeEntry.sha256,
      signature: activeEntry.signature || null,
      releaseNotes: activeEntry.releaseNotes || "",
      forceUpdate: forced,
      url: `/api/firmware/latest?espId=${encodeURIComponent(espId)}`,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Check-in failed" }, { status: 500 });
  }
}
