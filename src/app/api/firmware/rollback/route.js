import { NextResponse } from "next/server";
import { isSafePathSegment } from "@/lib/validate";
import { readManifest, writeManifest } from "@/lib/firmware";

// POST /api/firmware/rollback  { espId }
// Sets active firmware to the previous version (by uploadedAt)
export async function POST(request) {
  try {
    const body = await request.json();
    const espId = typeof body.espId === "string" ? body.espId.trim() : "";

    if (!espId) {
      return NextResponse.json({ error: "espId is required" }, { status: 400 });
    }

    if (!isSafePathSegment(espId)) {
      return NextResponse.json({ error: "Invalid ESP32 ID" }, { status: 400 });
    }

    const manifest = await readManifest(espId);
    if (manifest.versions.length < 2 || !manifest.active) {
      return NextResponse.json(
        { error: "No previous version available for rollback" },
        { status: 400 }
      );
    }

    // Sort by uploadedAt descending
    const sorted = [...manifest.versions].sort(
      (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
    );

    const activeIdx = sorted.findIndex((v) => v.filename === manifest.active);
    if (activeIdx === -1 || activeIdx >= sorted.length - 1) {
      return NextResponse.json(
        { error: "No previous version available for rollback" },
        { status: 400 }
      );
    }

    const previous = sorted[activeIdx + 1];
    manifest.active = previous.filename;
    await writeManifest(espId, manifest);

    return NextResponse.json({
      success: true,
      active: previous.filename,
      version: previous.version,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Rollback failed" }, { status: 500 });
  }
}
