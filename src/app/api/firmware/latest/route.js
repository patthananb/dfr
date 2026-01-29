import { NextResponse } from "next/server";
import { readdir, stat, readFile } from "fs/promises";
import { join } from "path";

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

    const firmwareDir = join(process.cwd(), "firmware", espId);

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

    const files = entries.filter((e) => e.isFile());
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
