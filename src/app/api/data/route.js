import { NextResponse } from "next/server";
import {
  getLatestFilenameByPrefix,
  listFaultFilenames,
  readFaultFile,
  saveFault,
} from "@/lib/repos/faults";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get("file");
  const latest = searchParams.get("latest");

  try {
    if (filename) {
      try {
        const fileContent = await readFaultFile(filename);
        return NextResponse.json({ success: true, files: [fileContent] });
      } catch (err) {
        if (err.code === "EINVAL") {
          return NextResponse.json(
            { success: false, error: "Invalid filename" },
            { status: 400 }
          );
        }
        if (err.code === "ENOENT") {
          return NextResponse.json(
            { success: false, error: "File not found" },
            { status: 404 }
          );
        }
        throw err;
      }
    }

    if (latest) {
      const latestFile = await getLatestFilenameByPrefix(latest);
      return NextResponse.json({ success: true, latestFile });
    }

    const filenames = await listFaultFilenames();
    return NextResponse.json({ success: true, filenames });
  } catch (error) {
    console.error("Error reading data files:", error);
    return NextResponse.json(
      { success: false, error: "Error reading data files" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { espId, faultType, faultLocation, date, time, sampleRateHz, data } = body;
    if (!espId || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { success: false, error: "espId and data[] are required" },
        { status: 400 }
      );
    }

    const { filename } = await saveFault({
      espId,
      faultType,
      faultLocation,
      date,
      time,
      sampleRateHz,
      data,
    });

    console.log(`[data] Saved ${filename} (${data.length} samples from ${espId})`);
    return NextResponse.json({ success: true, filename });
  } catch (error) {
    console.error("Error saving data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save data" },
      { status: 500 }
    );
  }
}
