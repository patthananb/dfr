import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!file) {
    return NextResponse.json(
      { success: false, error: "No file uploaded" },
      { status: 400 }
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const firmwareDir = join(process.cwd(), "firmware");
  await mkdir(firmwareDir, { recursive: true });
  await writeFile(join(firmwareDir, file.name), buffer);

  return NextResponse.json({ success: true });
}
