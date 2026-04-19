import { NextResponse } from "next/server";
import { readdir, stat, readFile } from "fs/promises";
import { join } from "path";
import { isSafePathSegment } from "@/lib/validate";
import { FIRMWARE_DIR, readManifest } from "@/lib/repos/firmware";

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

    if (!isSafePathSegment(espId)) {
      return NextResponse.json({ error: "Invalid ESP32 ID" }, { status: 400 });
    }

    const firmwareDir = join(FIRMWARE_DIR, espId);
    const manifest = await readManifest(espId);
    const targetFile = manifest.active;

    if (targetFile) {
      try {
        const fileBuffer = await readFile(join(firmwareDir, targetFile));
        const entry = manifest.versions.find((v) => v.filename === targetFile);
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(targetFile)}`,
            "Content-Length": fileBuffer.length.toString(),
            "Content-Encoding": "identity",
            "Cache-Control": "no-store, no-transform",
            ...(entry?.sha256 ? { "X-Firmware-SHA256": entry.sha256 } : {}),
            ...(entry?.version ? { "X-Firmware-Version": entry.version } : {}),
          },
        });
      } catch {
        // active file missing on disk — fall through to mtime lookup
      }
    }

    // Fallback: most-recently-modified file in the device's firmware dir
    // (keeps pre-manifest uploads working).
    let entries;
    try {
      entries = await readdir(firmwareDir, { withFileTypes: true });
    } catch (err) {
      if (err.code === "ENOENT") {
        return NextResponse.json({ error: "No firmware found" }, { status: 404 });
      }
      throw err;
    }

    const files = entries.filter((e) => e.isFile() && e.name !== "manifest.json");
    if (files.length === 0) {
      return NextResponse.json({ error: "No firmware found" }, { status: 404 });
    }

    let latest = null;
    let latestMtime = 0;
    for (const file of files) {
      const { mtimeMs } = await stat(join(firmwareDir, file.name));
      if (mtimeMs > latestMtime) {
        latestMtime = mtimeMs;
        latest = file.name;
      }
    }

    const fileBuffer = await readFile(join(firmwareDir, latest));
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(latest)}`,
        "Content-Length": fileBuffer.length.toString(),
        "Content-Encoding": "identity",
        "Cache-Control": "no-store, no-transform",
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
