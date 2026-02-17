import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const FIRMWARE_DIR = join(process.cwd(), "firmware");

async function readManifest(espId) {
  try {
    const raw = await readFile(join(FIRMWARE_DIR, espId, "manifest.json"), "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.versions) ? parsed : { versions: [], active: null };
  } catch {
    return { versions: [], active: null };
  }
}

async function writeManifest(espId, manifest) {
  const dir = join(FIRMWARE_DIR, espId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
}

// POST /api/firmware/rollback  { espId }
// Sets active firmware to the previous version (by uploadedAt)
export async function POST(request) {
  try {
    const body = await request.json();
    const espId = typeof body.espId === "string" ? body.espId.trim() : "";

    if (!espId) {
      return NextResponse.json({ error: "espId is required" }, { status: 400 });
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
