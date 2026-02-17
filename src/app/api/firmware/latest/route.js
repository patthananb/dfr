import { NextResponse } from "next/server";
import { readdir, stat, readFile } from "fs/promises";
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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const espId = searchParams.get("espId");
    if (!espId) {
      return NextResponse.json(
        { error: "espId query parameter is required" },
        { status: 400 }
      );
    }

    const firmwareDir = join(FIRMWARE_DIR, espId);

    // Try manifest-based lookup first
    const manifest = await readManifest(espId);
    let targetFile = manifest.active;

    if (targetFile) {
      try {
        const fileBuffer = await readFile(join(firmwareDir, targetFile));
        const entry = manifest.versions.find((v) => v.filename === targetFile);
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Disposition": `attachment; filename="${targetFile}"`,
            "Content-Length": fileBuffer.length.toString(),
            "Content-Encoding": "identity",
            "Cache-Control": "no-store, no-transform",
            ...(entry?.sha256 ? { "X-Firmware-SHA256": entry.sha256 } : {}),
            ...(entry?.version ? { "X-Firmware-Version": entry.version } : {}),
          },
        });
      } catch {
        // active file missing on disk, fall through to mtime lookup
      }
    }

    // Fallback: find by most recent modification time (backwards compat)
    let entries;
    try {
      entries = await readdir(firmwareDir, { withFileTypes: true });
    } catch (err) {
      if (err.code === "ENOENT") {
        return NextResponse.json(
          { error: "No firmware found" },
          { status: 404 }
        );
      }
      throw err;
    }

    const files = entries.filter(
      (e) => e.isFile() && e.name !== "manifest.json"
    );
    if (files.length === 0) {
      return NextResponse.json(
        { error: "No firmware found" },
        { status: 404 }
      );
    }

    let latest = null;
    let latestMtime = 0;
    for (const file of files) {
      const filePath = join(firmwareDir, file.name);
      const { mtimeMs } = await stat(filePath);
      if (mtimeMs > latestMtime) {
        latestMtime = mtimeMs;
        latest = file.name;
      }
    }

    const fileBuffer = await readFile(join(firmwareDir, latest));
    const fileSize = fileBuffer.length;

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${latest}"`,
        "Content-Length": fileSize.toString(),
        "Content-Encoding": "identity",
        "Cache-Control": "no-store, no-transform",
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
