import { NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");

function normalize(value) {
  return value.toLowerCase().replace(/\s+/g, "_");
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteName = searchParams.get("site") || "";
    const normalizedSite = siteName ? normalize(siteName) : "";

    let entries;
    try {
      entries = await readdir(DATA_DIR, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") {
        return NextResponse.json({ faults: [] });
      }
      throw error;
    }

    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name);

    const faults = [];
    for (const file of files) {
      const content = await readFile(join(DATA_DIR, file), "utf-8");
      const parsed = JSON.parse(content);
      if (!parsed.faultType || !parsed.faultLocation) {
        continue;
      }
      if (normalizedSite) {
        const location = normalize(String(parsed.faultLocation));
        if (!location.includes(normalizedSite)) {
          continue;
        }
      }
      faults.push({
        file,
        faultType: parsed.faultType,
        faultLocation: parsed.faultLocation,
        date: parsed.date || null,
        time: parsed.time || null,
      });
    }

    faults.sort((a, b) => {
      const aKey = `${a.date || ""} ${a.time || ""}`;
      const bKey = `${b.date || ""} ${b.time || ""}`;
      return bKey.localeCompare(aKey);
    });

    return NextResponse.json({ faults });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load faults" },
      { status: 500 }
    );
  }
}
