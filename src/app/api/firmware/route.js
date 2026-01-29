import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const espId = formData.get("espId");

  if (!file || !espId) {
    return NextResponse.json(
      { success: false, error: "Firmware file and ESP32 ID are required" },
      { status: 400 }
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const firmwareDir = join(process.cwd(), "firmware", espId.toString());
  await mkdir(firmwareDir, { recursive: true });
  await writeFile(join(firmwareDir, file.name), buffer);

  return NextResponse.json({ success: true });
}
