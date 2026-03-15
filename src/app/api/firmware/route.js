import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { createHash } from "crypto";
import { signManifest } from "@/lib/crypto";
import { isSafePathSegment } from "@/lib/validate";
import { FIRMWARE_DIR, readManifest, writeManifest } from "@/lib/firmware";
import { readSites, getAllDeviceIds } from "@/lib/sites";

// GET  /api/firmware?espId=...  — list firmware history for a device
// GET  /api/firmware              — list firmware history for ALL devices
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

    // Return firmware info for every device across all sites
    const sites = await readSites();
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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Compute SHA-256 hash
    const sha256 = createHash("sha256").update(buffer).digest("hex");

    const firmwareDir = join(FIRMWARE_DIR, espIdStr);
    await mkdir(firmwareDir, { recursive: true });
    await writeFile(join(firmwareDir, sanitizedFilename), buffer);

    // Update manifest
    const manifest = await readManifest(espIdStr);
    const signature = signManifest({ version: version || "", sha256, filename: sanitizedFilename });
    const entry = {
      filename: sanitizedFilename,
      version: version || null,
      size: buffer.length,
      sha256,
      signature,
      releaseNotes: releaseNotes || "",
      uploadedAt: new Date().toISOString(),
    };

    // Remove previous entry with the same filename (overwrite)
    manifest.versions = manifest.versions.filter((v) => v.filename !== sanitizedFilename);
    manifest.versions.push(entry);

    // Auto-set as active
    manifest.active = sanitizedFilename;

    await writeManifest(espIdStr, manifest);

    return NextResponse.json({ success: true, entry, active: manifest.active });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
  }
}

// PUT /api/firmware  — set active version or delete a version
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

    const manifest = await readManifest(espId);
    const exists = manifest.versions.some((v) => v.filename === activeFilename);
    if (!exists) {
      return NextResponse.json(
        { error: "Firmware version not found" },
        { status: 404 }
      );
    }

    manifest.active = activeFilename;
    await writeManifest(espId, manifest);

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

    const manifest = await readManifest(espId);
    const idx = manifest.versions.findIndex((v) => v.filename === filename);
    if (idx === -1) {
      return NextResponse.json(
        { error: "Firmware version not found" },
        { status: 404 }
      );
    }

    manifest.versions.splice(idx, 1);

    // Remove the actual file (best-effort)
    const { unlink } = await import("fs/promises");
    try {
      await unlink(join(FIRMWARE_DIR, espId, filename));
    } catch (_) {
      // file may already be gone
    }

    // If active was deleted, set to latest remaining
    if (manifest.active === filename) {
      const sorted = [...manifest.versions].sort(
        (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
      );
      manifest.active = sorted.length > 0 ? sorted[0].filename : null;
    }

    await writeManifest(espId, manifest);

    return NextResponse.json({ success: true, ...manifest });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete firmware" }, { status: 500 });
  }
}
