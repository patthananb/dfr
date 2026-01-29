import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const ESP32_FILE = join(DATA_DIR, "esp32.json");

async function readEsp32Ids() {
  try {
    const raw = await readFile(ESP32_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.ids)) {
      return [];
    }
    return parsed.ids;
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function GET() {
  try {
    const ids = await readEsp32Ids();
    return NextResponse.json({ ids });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load ESP32 IDs" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const ids = Array.isArray(body.ids)
      ? body.ids
          .map((id) => String(id).trim())
          .filter((id) => id.length > 0)
      : [];

    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(ESP32_FILE, JSON.stringify({ ids }, null, 2));

    return NextResponse.json({ success: true, ids });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to save ESP32 IDs" },
      { status: 500 }
    );
  }
}
