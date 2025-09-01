import { NextResponse } from "next/server";
import { readdir, stat, readFile } from "fs/promises";
import { join } from "path";

export async function GET() {
  try {
    const firmwareDir = join(process.cwd(), "firmware");

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

    const buffer = await readFile(join(firmwareDir, latest));
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${latest}"`,
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
