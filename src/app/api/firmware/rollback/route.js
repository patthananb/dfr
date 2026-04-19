import { NextResponse } from "next/server";
import { isSafePathSegment } from "@/lib/validate";
import { rollbackActive } from "@/lib/repos/firmware";

// POST /api/firmware/rollback  { espId }
// Sets active firmware to the previous version (by uploadedAt).
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

    const result = await rollbackActive(espId);
    if (!result) {
      return NextResponse.json(
        { error: "No previous version available for rollback" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      active: result.previous.filename,
      version: result.previous.version,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Rollback failed" }, { status: 500 });
  }
}
