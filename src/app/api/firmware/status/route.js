import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(request) {
  try {
    const body = await request.json();
    const { datetime, version, feeder_number } = body;

    // Validate required fields
    if (!datetime || !version || !feeder_number) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing required fields: datetime, version, and feeder_number are required" 
        },
        { status: 400 }
      );
    }

    // Create firmware-status directory if it doesn't exist
    const statusDir = join(process.cwd(), "firmware-status");
    await mkdir(statusDir, { recursive: true });

    // Create a timestamped filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `ota-status_${feeder_number}_${timestamp}.json`;

    // Prepare the log entry
    const logEntry = {
      datetime,
      version,
      feeder_number,
      logged_at: new Date().toISOString(),
    };

    // Write to file
    const filePath = join(statusDir, filename);
    await writeFile(filePath, JSON.stringify(logEntry, null, 2));

    return NextResponse.json({ 
      success: true, 
      message: "OTA status logged successfully",
      filename 
    });
  } catch (error) {
    console.error("Error logging OTA status:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
