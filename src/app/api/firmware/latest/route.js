import { NextResponse } from "next/server";
import { join } from "path";
import { readdir, readFile, stat } from "fs/promises";

export async function GET() {
  try {
    const firmwareDir = join(process.cwd(), "firmware");
    const entries = await readdir(firmwareDir, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile());

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No firmware files found" },
        { status: 404 }
      );
    }

    let latestFile = null;
    let latestTimestamp = -Infinity;

    for (const file of files) {
      const filePath = join(firmwareDir, file.name);
      const fileStats = await stat(filePath);

      if (fileStats.mtimeMs > latestTimestamp) {
        latestTimestamp = fileStats.mtimeMs;
        latestFile = {
          name: file.name,
          path: filePath,
        };
      }
    }

    if (!latestFile) {
      return NextResponse.json(
        { success: false, error: "No firmware files found" },
        { status: 404 }
      );
    }

    const fileBuffer = await readFile(latestFile.path);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${latestFile.name}"`,
      },
    });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return NextResponse.json(
        { success: false, error: "Firmware directory not found" },
        { status: 404 }
      );
    }

    console.error("Failed to retrieve latest firmware:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve latest firmware" },
      { status: 500 }
    );
  }
}
