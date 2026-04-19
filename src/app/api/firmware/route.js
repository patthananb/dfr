import { NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { createHash } from "crypto";
import { signManifest } from "@/lib/crypto";
import { isSafePathSegment } from "@/lib/validate";
import {
  FIRMWARE_DIR,
  readManifest,
  saveVersion,
  setActive,
  deleteVersion,
} from "@/lib/repos/firmware";
import { listSites, getAllDeviceIds } from "@/lib/repos/sites";

// GET /api/firmware?espId=...  — list firmware history for a device
// GET /api/firmware            — list firmware history for ALL devices
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const espId = searchParams.get("espId");

    if (espId) {
      if (!isSafePathSegment(espId)) {
        return NextResponse.json({ error: "Invalid ESP32 ID" }, { status: 400 });
      }
      const manifest = await readManifest(espId);
      return NextResponse.json({ espId, ...manifest });
    }

    const sites = await listSites();
    const deviceIds = getAllDeviceIds(sites);

    const result = {};
    for (const id of deviceIds) {
      result[id] = await readManifest(id);
    }
    return NextResponse.json({ devices: result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to list firmware" }, { status: 500 });
  }
}

// POST /api/firmware  — upload a new firmware version
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const espId = formData.get("espId");
    const version = formData.get("version") || null;
    const releaseNotes = formData.get("releaseNotes") || "";

    if (!file || !espId) {
      return NextResponse.json(
        { success: false, error: "Firmware file and ESP32 ID are required" },
        { status: 400 }
      );
    }

    const espIdStr = espId.toString().trim();
    if (!isSafePathSegment(espIdStr)) {
      return NextResponse.json({ success: false, error: "Invalid ESP32 ID" }, { status: 400 });
    }

    const sanitizedFilename = file.name.replace(/[/\\]/g, "_");
    if (!isSafePathSegment(sanitizedFilename)) {
      return NextResponse.json({ success: false, error: "Invalid filename" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sha256 = createHash("sha256").update(buffer).digest("hex");

    const firmwareDir = join(FIRMWARE_DIR, espIdStr);
    await mkdir(firmwareDir, { recursive: true });
    await writeFile(join(firmwareDir, sanitizedFilename), buffer);

    const signature = signManifest({
      version: version || "",
      sha256,
      filename: sanitizedFilename,
    });
    const entry = {
      filename: sanitizedFilename,
      version: version || null,
      size: buffer.length,
      sha256,
      signature,
      releaseNotes: releaseNotes || "",
      uploadedAt: new Date().toISOString(),
    };

    const manifest = await saveVersion(espIdStr, entry);
    return NextResponse.json({ success: true, entry, active: manifest.active });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
  }
}

// PUT /api/firmware  — set active version
export async function PUT(request) {
  try {
    const body = await request.json();
    const espId = typeof body.espId === "string" ? body.espId.trim() : "";
    const activeFilename = typeof body.active === "string" ? body.active.trim() : "";

    if (!espId || !activeFilename) {
      return NextResponse.json(
        { error: "espId and active filename are required" },
        { status: 400 }
      );
    }

    if (!isSafePathSegment(espId)) {
      return NextResponse.json({ error: "Invalid ESP32 ID" }, { status: 400 });
    }

    const manifest = await setActive(espId, activeFilename);
    if (!manifest) {
      return NextResponse.json({ error: "Firmware version not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, active: manifest.active });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update active firmware" }, { status: 500 });
  }
}

// DELETE /api/firmware?espId=...&filename=...  — remove a firmware version
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const espId = searchParams.get("espId");
    const filename = searchParams.get("filename");

    if (!espId || !filename) {
      return NextResponse.json(
        { error: "espId and filename are required" },
        { status: 400 }
      );
    }

    if (!isSafePathSegment(espId) || !isSafePathSegment(filename)) {
      return NextResponse.json({ error: "Invalid ESP32 ID or filename" }, { status: 400 });
    }

    const manifest = await deleteVersion(espId, filename);
    if (!manifest) {
      return NextResponse.json({ error: "Firmware version not found" }, { status: 404 });
    }

    try {
      await unlink(join(FIRMWARE_DIR, espId, filename));
    } catch {
      // binary may already be gone — manifest is authoritative
    }

    return NextResponse.json({ success: true, ...manifest });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete firmware" }, { status: 500 });
  }
}
